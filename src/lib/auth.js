// Google 로그인/로그아웃. 세션 상태 자체(구독)는 AuthGate.jsx가 onAuthStateChange로 직접 듣는다.
window.signInWithGoogle = async function signInWithGoogle() {
  const client = window.getSupabaseClient();
  if (!client) throw new Error("Supabase 설정이 안 됐어요. src/data/supabaseConfig.js를 확인해주세요.");
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      // 캘린더에 일정을 만들 수 있는 권한도 로그인 시점에 함께 요청한다.
      scopes: "https://www.googleapis.com/auth/calendar.events",
      queryParams: {
        // refresh_token을 받고, 스코프 동의 화면을 매번 다시 보여주기 위한 옵션.
        access_type: "offline",
        prompt: "consent",
      },
      // GitHub Pages 프로젝트 페이지(/AI-TEST/) 대응: origin만 쓰면 서브패스가 날아가므로
      // 항상 현재 pathname까지 포함해서 돌아올 위치를 지정한다.
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
};

window.signOut = async function signOut() {
  const client = window.getSupabaseClient();
  if (!client) return;

  // 이 브라우저의 푸시 구독을 먼저 정리한다. 그대로 두면, 같은 기기를 다른 계정으로
  // 로그인했을 때 이전 계정의 구독 행(endpoint unique)과 충돌할 수 있다.
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration && (await registration.pushManager.getSubscription());
      if (subscription) {
        await client.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
    }
  } catch (err) {
    console.error("[auth] 푸시 구독 정리 실패:", err);
  }

  await client.auth.signOut();
};
