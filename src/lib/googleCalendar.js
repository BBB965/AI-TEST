// 로그인 시 받은 구글 access token(session.provider_token)으로 Calendar API를 직접 호출한다.
// 이 토큰은 수명이 짧고(약 1시간) Supabase가 자동으로 갱신해주지 않으므로, 만료돼 있으면
// 그냥 에러를 던지고 재로그인을 안내한다 — 서버 쪽 토큰 갱신 인프라는 이번 스코프 밖.
async function getProviderToken() {
  const client = window.getSupabaseClient();
  if (!client) throw new Error("Supabase 설정이 안 됐어요.");
  const { data } = await client.auth.getSession();
  const token = data && data.session && data.session.provider_token;
  if (!token) {
    throw new Error("구글 캘린더 연동이 만료됐어요. 다시 로그인해주세요.");
  }
  return token;
}

// eventAtISO 시각에 30분짜리 이벤트를 기본 캘린더(primary)에 만들고 이벤트 id를 반환한다.
window.createCalendarEvent = async function createCalendarEvent(title, eventAtISO) {
  const token = await getProviderToken();
  const start = new Date(eventAtISO);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: title,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error("구글 캘린더 등록 실패: " + res.status + " " + body);
  }
  const data = await res.json();
  return data.id;
};

// 404/410(이미 지워짐)은 성공으로 취급한다.
window.deleteCalendarEvent = async function deleteCalendarEvent(googleEventId) {
  if (!googleEventId) return;
  const token = await getProviderToken();
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events/" + googleEventId,
    { method: "DELETE", headers: { Authorization: "Bearer " + token } }
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const body = await res.text();
    throw new Error("구글 캘린더 삭제 실패: " + res.status + " " + body);
  }
};
