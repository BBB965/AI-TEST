// venue와 무관한 독립 리마인더("일정": 티켓팅 오픈 알림 → 성공하면 관람 정보까지) 저장소.
// storage.js와 같은 clear-then-reassign 캐시 패턴을 쓴다. 로그인 세션이 바뀌면 Home/App이
// 통째로 리마운트되므로, 이 캐시는 그때(= loadAllSchedules 재호출) 자연히 새로 채워진다.
window.SCHEDULES_TABLE = "schedules";
window.SCHEDULE_REMINDERS_TABLE = "schedule_reminders";

let scheduleCache = []; // schedule[] (각 항목에 reminders: reminder[] 포함), ticketing_at 오름차순

function rowToSchedule(row) {
  return {
    id: row.id,
    title: row.title,
    ticketingAt: row.ticketing_at,
    vendor: row.vendor || "",
    candidateViewingAts: row.candidate_viewing_ats || [],
    viewingAt: row.viewing_at || null,
    venueName: row.venue_name || "",
    seatInfo: row.seat_info || "",
    googleEventId: row.google_event_id || null,
    reminders: (row.schedule_reminders || [])
      .map((r) => ({ id: r.id, minutesBefore: r.minutes_before, sentAt: r.sent_at }))
      .sort((a, b) => b.minutesBefore - a.minutesBefore),
  };
}

window.loadAllSchedules = async function loadAllSchedules() {
  const client = window.getSupabaseClient();
  if (!client) return;
  const { data, error } = await client
    .from(window.SCHEDULES_TABLE)
    .select("*, schedule_reminders(*)")
    .order("ticketing_at", { ascending: true });
  if (error) {
    console.error("[schedules] loadAllSchedules 실패:", error);
    return;
  }
  scheduleCache = (data || []).map(rowToSchedule);
};

window.getSchedules = function getSchedules() {
  return scheduleCache;
};

// title/ticketingAt(로컬 datetime-local 문자열)/reminderMinutes(예: [30, 10])로 일정을 만든다.
// vendor(예매처)는 선택, candidateViewingAts(관람 예정 일시 후보, 로컬 datetime-local 문자열
// 배열, 최대 3개)도 선택 — 아직 어느 회차 표를 구할지 모를 때 후보를 미리 적어두는 용도다.
// 이 단계에선 구글 캘린더를 건드리지 않는다 — 아직 관람 일정이 확정되지 않았기 때문에,
// "티켓팅 성공 후" window.addViewingInfo()에서 비로소 캘린더 이벤트를 만든다.
window.addSchedule = async function addSchedule({
  title,
  ticketingAt,
  reminderMinutes,
  vendor,
  candidateViewingAts,
}) {
  const client = window.getSupabaseClient();
  if (!client) throw new Error("Supabase 설정이 안 됐어요.");
  const ticketingAtISO = new Date(ticketingAt).toISOString();
  const candidateIso = (candidateViewingAts || [])
    .filter(Boolean)
    .slice(0, 3)
    .map((d) => new Date(d).toISOString());

  const { data: scheduleRow, error: scheduleError } = await client
    .from(window.SCHEDULES_TABLE)
    .insert({
      title,
      ticketing_at: ticketingAtISO,
      vendor: vendor || null,
      candidate_viewing_ats: candidateIso,
    })
    .select()
    .single();
  if (scheduleError) throw scheduleError;

  const reminderRows = reminderMinutes.map((m) => ({
    schedule_id: scheduleRow.id,
    minutes_before: m,
  }));
  const { data: reminders, error: reminderError } = await client
    .from(window.SCHEDULE_REMINDERS_TABLE)
    .insert(reminderRows)
    .select();
  if (reminderError) {
    // 반쪽짜리 일정이 남지 않도록 되돌린다.
    await client.from(window.SCHEDULES_TABLE).delete().eq("id", scheduleRow.id);
    throw reminderError;
  }

  const schedule = rowToSchedule({ ...scheduleRow, schedule_reminders: reminders });
  scheduleCache = [...scheduleCache, schedule].sort((a, b) => new Date(a.ticketingAt) - new Date(b.ticketingAt));
  return schedule;
};

// "티켓팅 성공" 후 실제 관람 정보를 채워 넣고, 그 정보로 구글 캘린더 이벤트를 만든다(또는
// 이미 있으면 지우고 다시 만든다 — 캘린더 API에 부분 PATCH 대신 delete+recreate가 더 단순하다).
window.addViewingInfo = async function addViewingInfo(
  scheduleId,
  { viewingAt, venueName, seatInfo, vendor }
) {
  const client = window.getSupabaseClient();
  if (!client) throw new Error("Supabase 설정이 안 됐어요.");
  const schedule = scheduleCache.find((s) => s.id === scheduleId);
  if (!schedule) throw new Error("일정을 찾을 수 없어요.");

  const viewingAtISO = new Date(viewingAt).toISOString();
  const description = [
    venueName ? "장소: " + venueName : null,
    seatInfo ? "좌석: " + seatInfo : null,
    vendor ? "예매처: " + vendor : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (schedule.googleEventId) {
    try {
      await window.deleteCalendarEvent(schedule.googleEventId);
    } catch (err) {
      console.error("[schedules] 기존 캘린더 이벤트 삭제 실패:", err);
    }
  }

  let calendarError = null;
  let googleEventId = null;
  try {
    googleEventId = await window.createCalendarEvent(schedule.title, viewingAtISO, { description });
  } catch (err) {
    console.error("[schedules] 캘린더 등록 실패:", err);
    calendarError = err.message || String(err);
  }

  const { data: updatedRow, error } = await client
    .from(window.SCHEDULES_TABLE)
    .update({
      viewing_at: viewingAtISO,
      venue_name: venueName || null,
      seat_info: seatInfo || null,
      vendor: vendor || null,
      google_event_id: googleEventId,
    })
    .eq("id", scheduleId)
    .select("*, schedule_reminders(*)")
    .single();
  if (error) throw error;

  const updated = rowToSchedule(updatedRow);
  scheduleCache = scheduleCache.map((s) => (s.id === scheduleId ? updated : s));
  return { schedule: updated, calendarError };
};

window.deleteSchedule = async function deleteSchedule(id) {
  const client = window.getSupabaseClient();
  if (!client) throw new Error("Supabase 설정이 안 됐어요.");
  const schedule = scheduleCache.find((s) => s.id === id);

  if (schedule && schedule.googleEventId) {
    try {
      await window.deleteCalendarEvent(schedule.googleEventId);
    } catch (err) {
      console.error("[schedules] 캘린더 삭제 실패:", err);
    }
  }

  const { error } = await client.from(window.SCHEDULES_TABLE).delete().eq("id", id);
  if (error) throw error;
  scheduleCache = scheduleCache.filter((s) => s.id !== id);
};
