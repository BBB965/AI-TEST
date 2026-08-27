// pg_cron이 매분 호출한다 (supabase/setup.sql STEP 2).
// 1) Authorization의 CRON_SECRET을 검증해 임의 호출을 막는다.
// 2) service_role 키(자동 주입된 SUPABASE_SERVICE_ROLE_KEY)로 RLS를 우회해,
//    아직 안 보낸(sent_at is null) & 시간이 된(fire_at <= now) 알림을 가져온다.
// 3) 각 알림 소유자의 push_subscriptions 전체에 VAPID 서명된 웹 푸시를 보낸다.
// 4) 성공/실패와 무관하게 sent_at을 채워 중복 재발송을 막는다.
//    구독이 이미 사라진 경우(410/404)는 해당 push_subscriptions 행을 지운다.
//
// ⚠️ npm:web-push가 Supabase Edge Runtime(Deno)에서 실제로 동작하는지 미검증 상태다.
// (VAPID 서명이 내부적으로 Node crypto를 쓰는데, Deno의 Node 호환 계층이 완벽하지 않을 수 있음.)
// 배포 후 `supabase functions serve send-reminders`로 먼저 로컬 테스트해볼 것. 에러가 나면:
//   - "npm:web-push@3.6.7" 대신 "https://esm.sh/web-push@3.6.7" (esm.sh가 Deno 호환성이 나을 때가 있음)
//   - 그래도 안 되면 Deno 내장 crypto.subtle로 VAPID JWT 서명 + RFC 8291 페이로드 암호화를 직접 구현
//     (둘 다 ECDSA/ECDH라 crypto.subtle이 네이티브로 지원한다 — 외부 의존성 없이 가능)

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!; // 예: "mailto:bbnt25@gmail.com"

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Edge Function에 자동 주입됨. secrets set 불필요.
);

Deno.serve(async (req) => {
  if (req.headers.get("Authorization") !== `Bearer ${CRON_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const { data: dueReminders, error } = await supabase
    .from("schedule_reminders")
    .select("id, minutes_before, user_id, schedules(title)")
    .is("sent_at", null)
    .lte("fire_at", nowIso);

  if (error) {
    console.error("query error", error);
    return new Response("query error", { status: 500 });
  }

  for (const reminder of dueReminders ?? []) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", reminder.user_id);

    const payload = JSON.stringify({
      title: reminder.schedules?.title ?? "일정 알림",
      body: `${reminder.minutes_before}분 전입니다`,
    });

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("push failed", sub.endpoint, err);
        }
      }
    }

    await supabase.from("schedule_reminders").update({ sent_at: nowIso }).eq("id", reminder.id);
  }

  return new Response(JSON.stringify({ processed: dueReminders?.length ?? 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
