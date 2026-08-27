// venue와 무관한 독립 리마인더("일정": 예 - 티켓팅 오픈 일시) 저장소.
// storage.js와 같은 clear-then-reassign 캐시 패턴을 쓴다. AuthGate가 로그인 세션이 바뀔 때마다
// App을 통째로 리마운트하므로, 이 캐시는 그때(= loadAllSchedules 재호출) 자연히 새로 채워진다.
window.SCHEDULES_TABLE = "schedules";
window.SCHEDULE_REMINDERS_TABLE = "schedule_reminders";

let cache = []; // schedule[] (각 항목에 reminders: reminder[] 포함), event_at 오름차순

function rowToSchedule(row) {
  return {
    id: row.id,
    title: row.title,
    eventAt: row.event_at,
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
    .order("event_at", { ascending: true });
  if (error) {
    console.error("[schedules] loadAllSchedules 실패:", error);
    return;
  }
  cache = (data || []).map(rowToSchedule);
};

window.getSchedules = function getSchedules() {
  return cache;
};

// title/eventAt(로컬 datetime-local 문자열)/reminderMinutes(예: [30, 10])로 일정을 만든다.
// 구글 캘린더 등록은 best-effort — 실패해도 일정 자체는 저장된 채로 남긴다(에러는 반환값에 표시).
window.addSchedule = async function addSchedule({ title, eventAt, reminderMinutes }) {
  const client = window.getSupabaseClient();
  if (!client) throw new Error("Supabase 설정이 안 됐어요.");
  const eventAtISO = new Date(eventAt).toISOString();

  const { data: scheduleRow, error: scheduleError } = await client
    .from(window.SCHEDULES_TABLE)
    .insert({ title, event_at: eventAtISO })
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

  let calendarError = null;
  let googleEventId = null;
  try {
    googleEventId = await window.createCalendarEvent(title, eventAtISO);
    await client
      .from(window.SCHEDULES_TABLE)
      .update({ google_event_id: googleEventId })
      .eq("id", scheduleRow.id);
  } catch (err) {
    console.error("[schedules] 캘린더 등록 실패:", err);
    calendarError = err.message || String(err);
  }

  const schedule = rowToSchedule({
    ...scheduleRow,
    google_event_id: googleEventId,
    schedule_reminders: reminders,
  });
  cache = [...cache, schedule].sort((a, b) => new Date(a.eventAt) - new Date(b.eventAt));
  return { schedule, calendarError };
};

window.deleteSchedule = async function deleteSchedule(id) {
  const client = window.getSupabaseClient();
  if (!client) throw new Error("Supabase 설정이 안 됐어요.");
  const schedule = cache.find((s) => s.id === id);

  if (schedule && schedule.googleEventId) {
    try {
      await window.deleteCalendarEvent(schedule.googleEventId);
    } catch (err) {
      console.error("[schedules] 캘린더 삭제 실패:", err);
    }
  }

  const { error } = await client.from(window.SCHEDULES_TABLE).delete().eq("id", id);
  if (error) throw error;
  cache = cache.filter((s) => s.id !== id);
};
