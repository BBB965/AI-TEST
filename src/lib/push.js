// 웹 푸시 구독 등록. 알림 권한 프롬프트는 사용자 제스처(버튼 클릭) 없이 뜨면 브라우저가
// 막는 경우가 많으므로, 이 함수는 반드시 클릭 핸들러 안에서 직접 호출해야 한다.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 이미 이 기기에서 켠 적 있는 구독이 있는지 확인만 한다 (권한 프롬프트 없이, 조용히).
window.getPushSubscription = async function getPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
};

window.registerPushNotifications = async function registerPushNotifications() {
  if (!window.VAPID_PUBLIC_KEY || window.VAPID_PUBLIC_KEY === "YOUR_VAPID_PUBLIC_KEY") {
    throw new Error("푸시 설정이 안 됐어요. src/data/pushConfig.js를 확인해주세요.");
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("이 브라우저는 웹 푸시를 지원하지 않아요.");
  }

  const client = window.getSupabaseClient();
  if (!client) throw new Error("Supabase 설정이 안 됐어요.");
  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData && sessionData.session && sessionData.session.user;
  if (!user) throw new Error("로그인이 필요해요.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("알림 권한이 거부됐어요.");
  }

  // sw.js는 index.html과 같은 위치(레포 루트)에 상대경로로 둔다 —
  // GitHub Pages 프로젝트 페이지(/AI-TEST/)에서 절대경로(/sw.js)를 쓰면 엉뚱한 곳을 가리킨다.
  const registration = await navigator.serviceWorker.register("sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const { error } = await client.from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
};
