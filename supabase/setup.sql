-- ============================================================================
-- 직관 도장깨기: 로그인 / 일정(캘린더) / 웹 푸시 기능을 위한 스키마.
-- Supabase 대시보드 > SQL Editor 에서 STEP 1, STEP 2를 한 번에 실행하세요.
-- STEP 3는 "첫 Google 로그인 이후" 딱 한 번, 별도로 실행하는 것입니다.
-- ============================================================================

-- -----------------------------------------------------------------------
-- STEP 1. 스키마 변경
-- -----------------------------------------------------------------------

-- 1-1. 기존 seat_entries에 user_id 추가.
-- default auth.uid() 덕분에, 클라이언트 코드(storage.js)는 user_id를 직접 넣지 않아도 됨.
-- (RLS가 select/insert/delete를 모두 auth.uid() 기준으로 막아준다.)
alter table public.seat_entries
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

alter table public.seat_entries enable row level security;

drop policy if exists "seat_entries_select_own" on public.seat_entries;
create policy "seat_entries_select_own" on public.seat_entries
  for select using (auth.uid() = user_id);

drop policy if exists "seat_entries_insert_own" on public.seat_entries;
create policy "seat_entries_insert_own" on public.seat_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "seat_entries_delete_own" on public.seat_entries;
create policy "seat_entries_delete_own" on public.seat_entries
  for delete using (auth.uid() = user_id);
-- (update 정책은 앱이 update를 쓰지 않으므로 생략. 필요해지면 동일 패턴으로 추가.)

-- 1-2. schedules: venue와 무관한 독립 일정. 처음 등록할 땐 "티켓팅 오픈 알림" 정보(제목/시각/
-- 예매처/관람 예정 일시 후보 최대 3개)만 있는 상태로 만들고, 티켓팅에 성공하면 viewing_at 이하
-- 컬럼을 채워서 실제(확정된) 관람 정보를 덧붙인다(이때 비로소 google_event_id가 채워지며 구글
-- 캘린더 이벤트가 생긴다 — src/lib/schedules.js의 addViewingInfo 참고).
-- ticketing_at은 리마인더(N분 전 푸시) 기준 시각으로만 쓰인다. vendor는 등록 시점에 이미 알고
-- 있는 값(어디서 예매할지)을 넣어두고, 나중에 관람 정보 입력 때 그대로 프리필되거나 수정된다.
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  ticketing_at timestamptz not null,
  vendor text,
  candidate_viewing_ats timestamptz[] not null default '{}',
  viewing_at timestamptz,
  venue_name text,
  seat_info text,
  google_event_id text,
  created_at timestamptz not null default now(),
  constraint schedules_candidate_viewing_ats_max3 check (array_length(candidate_viewing_ats, 1) is null or array_length(candidate_viewing_ats, 1) <= 3)
);

alter table public.schedules enable row level security;

drop policy if exists "schedules_select_own" on public.schedules;
create policy "schedules_select_own" on public.schedules for select using (auth.uid() = user_id);
drop policy if exists "schedules_insert_own" on public.schedules;
create policy "schedules_insert_own" on public.schedules for insert with check (auth.uid() = user_id);
drop policy if exists "schedules_update_own" on public.schedules;
create policy "schedules_update_own" on public.schedules for update using (auth.uid() = user_id);
drop policy if exists "schedules_delete_own" on public.schedules;
create policy "schedules_delete_own" on public.schedules for delete using (auth.uid() = user_id);

-- 1-3. schedule_reminders: 일정 하나에 여러 개의 "n분 전 알림"(티켓팅 오픈 기준).
-- user_id는 schedules.user_id를 복제 저장(RLS 단순화용), fire_at은 ticketing_at - minutes_before.
-- 둘 다 클라이언트가 아니라 트리거가 계산한다 (아래 참고) — GENERATED 컬럼으로는
-- 다른 테이블(schedules.ticketing_at)을 참조할 수 없어서 트리거 방식을 쓴다.
create table if not exists public.schedule_reminders (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  user_id uuid references auth.users(id),
  minutes_before int not null check (minutes_before > 0),
  fire_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.schedule_reminders enable row level security;

-- BEFORE INSERT 트리거: schedule_id가 가리키는 schedules 행에서 user_id/ticketing_at을 읽어
-- user_id와 fire_at을 강제로 채운다. security definer라 RLS와 무관하게 schedules를 조회할 수 있다.
-- 클라이언트가 남의 schedule_id를 넣어도, 트리거가 그 진짜 소유자로 user_id를 채우기 때문에
-- 아래 INSERT 정책(auth.uid() = user_id)에서 결국 막힌다.
create or replace function public.set_reminder_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select s.user_id, s.ticketing_at - (new.minutes_before || ' minutes')::interval
    into new.user_id, new.fire_at
  from public.schedules s
  where s.id = new.schedule_id;

  if new.user_id is null then
    raise exception 'schedule % not found', new.schedule_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_reminder_fields on public.schedule_reminders;
create trigger trg_set_reminder_fields
  before insert on public.schedule_reminders
  for each row execute function public.set_reminder_fields();

drop policy if exists "schedule_reminders_select_own" on public.schedule_reminders;
create policy "schedule_reminders_select_own" on public.schedule_reminders
  for select using (auth.uid() = user_id);
drop policy if exists "schedule_reminders_insert_own" on public.schedule_reminders;
create policy "schedule_reminders_insert_own" on public.schedule_reminders
  for insert with check (auth.uid() = user_id);
drop policy if exists "schedule_reminders_delete_own" on public.schedule_reminders;
create policy "schedule_reminders_delete_own" on public.schedule_reminders
  for delete using (auth.uid() = user_id);
-- sent_at은 클라이언트가 아니라 send-reminders Edge Function이 service_role 키로(RLS 우회)
-- 갱신하므로, 여기엔 일부러 client용 update 정책을 만들지 않는다.

-- 1-4. push_subscriptions: 브라우저(기기)별 웹 푸시 구독.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id);
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------
-- STEP 2. pg_cron으로 send-reminders Edge Function을 매분(1440회/일) 호출.
--
-- 보안 설계: 이 cron 작업의 SQL 정의는 `select * from cron.job`으로 누구나(=이 프로젝트에
-- SQL Editor 접근권이 있는 사람) 볼 수 있다. 그래서 여기엔 강력한 service_role 키를 절대
-- 넣지 않는다 — 대신 이 용도로만 쓰는 임의의 CRON_SECRET을 만들어 Authorization 헤더에 넣고,
-- Edge Function이 이 값을 검증한다. service_role 키는 Edge Function 안에서만(자동 주입된
-- SUPABASE_SERVICE_ROLE_KEY 환경변수로) 쓰인다.
--
-- <PROJECT_REF>, <CRON_SECRET>을 실제 값으로 바꿔서 실행하세요.
-- CRON_SECRET은 아무 긴 임의 문자열이면 됩니다 (터미널에서 `openssl rand -hex 32` 등으로 생성).
-- 이 값은 Edge Function의 secret(CRON_SECRET)으로도 동일하게 등록해야 합니다.
-- -----------------------------------------------------------------------

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    body := jsonb_build_object('trigger', 'cron', 'time', now())
  ) as request_id;
  $$
);

-- 확인/취소용:
-- select * from cron.job;
-- select cron.unschedule('send-reminders-every-minute');
-- select * from net._http_response order by created desc limit 20; -- 호출 결과 로그 (pg_net은 비동기라 여기서 확인)

-- -----------------------------------------------------------------------
-- STEP 3. (첫 Google 로그인 후, 딱 한 번만 수동 실행)
-- 로그인 기능이 생기기 전에 쌓인 seat_entries 기록을 본인 계정으로 귀속시킨다.
-- 1) 앱에서 Google로 한 번 로그인한다.
-- 2) Supabase 대시보드 > Authentication > Users 에서 본인 계정의 UUID를 복사한다.
-- 3) 아래 <YOUR_UID>를 그 값으로 바꿔서 실행한다.
--    (이걸 하기 전까지는 기존 기록이 "0/00 완료"처럼 안 보일 수 있음 — 정상입니다.)
-- -----------------------------------------------------------------------
-- update public.seat_entries set user_id = '<YOUR_UID>' where user_id is null;
