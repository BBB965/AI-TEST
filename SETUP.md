# Google 로그인 + 일정 알림 기능 설정 체크리스트

이 문서는 `main` 브랜치에 이미 반영된 "Google 로그인 / 일정(티켓팅 리마인더) / 캘린더 연동 / 웹 푸시" 기능을 실제로 동작시키기 위해 **콘솔에서 직접 해야 하는 작업**을 정리한 것입니다. 코드는 이미 다 작성돼 있고, 아래 설정을 마쳐야 실제로 로그인·캘린더 등록·푸시 알림이 동작합니다.

관련 코드: `src/lib/auth.js`, `src/lib/schedules.js`, `src/lib/googleCalendar.js`, `src/lib/push.js`, `supabase/setup.sql`, `supabase/functions/send-reminders/index.ts`

---

## A. Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → 프로젝트 생성 또는 선택
2. **APIs & Services → Library** → **Google Calendar API** 활성화
3. **APIs & Services → OAuth 동의화면**
   - User type: **External**
   - 앱 이름: `직관 도장깨기`
   - 지원 이메일 / 개발자 이메일: `bbnt25@gmail.com`
   - Scopes에 `https://www.googleapis.com/auth/calendar.events` 추가
   - 테스트 사용자에 `bbnt25@gmail.com` 추가
   - ⚠️ **Testing 상태를 유지할 것** — `calendar.events`는 민감(sensitive) 스코프라 Production으로 전환하면 구글 앱 심사가 필요합니다. Testing 상태 + 테스트 사용자 등록만으로 본인 계정은 문제없이 로그인/캘린더 연동이 됩니다.

## B. Supabase ↔ Google 연결

4. Supabase 대시보드 → **Authentication → Providers → Google** 페이지에서 콜백 URL을 확인합니다 (`https://<PROJECT_REF>.supabase.co/auth/v1/callback` 형태).
5. Google Cloud → **APIs & Services → Credentials** → **OAuth 클라이언트 ID 만들기** → 애플리케이션 유형: **Web application**
   - 승인된 리디렉션 URI: 4번에서 확인한 콜백 URL
   - 승인된 자바스크립트 원본: `https://bbb965.github.io` (+ 로컬 테스트도 하려면 `http://localhost:8899`도 추가)
   - 생성 후 **Client ID / Client Secret**을 복사해둡니다.
6. Supabase **Authentication → Providers → Google**: 토글을 켜고 5번의 Client ID/Secret을 입력 후 저장
7. Supabase **Authentication → URL Configuration**
   - Site URL: `https://bbb965.github.io/AI-TEST/`
   - Redirect URLs: 위와 동일한 URL 추가 (로컬 테스트용으로 `http://localhost:8899`도 추가 가능)

## C. 데이터베이스 + 백엔드 (Edge Function / pg_cron)

8. Supabase **SQL Editor**에서 `supabase/setup.sql` 파일 내용을 붙여넣고 **STEP 1 + STEP 2**만 실행합니다.
   - 파일 안의 `<PROJECT_REF>`, `<CRON_SECRET>`을 실제 값으로 바꿔주세요.
   - `CRON_SECRET`은 아무 긴 랜덤 문자열이면 됩니다 (예: 터미널에서 `openssl rand -hex 32`).
   - **STEP 3(기존 좌석 기록을 본인 계정으로 옮기는 SQL)는 지금 실행하지 마세요** — D단계에서 첫 로그인 후에 실행합니다.
9. 터미널에서 `npx web-push generate-vapid-keys` 실행 → VAPID 키 쌍 생성
   - **public key**: `src/data/pushConfig.js`의 `window.VAPID_PUBLIC_KEY` 값에 붙여넣기 (이 파일을 수정한 뒤 저에게 알려주시면 커밋해드릴게요)
   - **private key**: 10번에서 시크릿으로 등록 (코드에는 절대 넣지 않습니다)
10. Edge Function 배포
    ```
    supabase login
    supabase link --project-ref <ref>
    supabase functions deploy send-reminders
    ```
    배포 후 Edge Function 시크릿(대시보드 또는 `supabase secrets set`)으로 아래 값을 등록합니다:
    - `VAPID_PUBLIC_KEY`
    - `VAPID_PRIVATE_KEY`
    - `VAPID_SUBJECT` = `mailto:bbnt25@gmail.com`
    - `CRON_SECRET` (8번 SQL에 넣은 값과 동일해야 합니다)

## D. 배포 이후에 할 일

11. 사이트가 배포된 뒤, 실제 사이트에서 **Google 로그인**(캘린더 권한 동의 포함)을 한 번 합니다.
12. Supabase **Authentication → Users**에서 본인 계정의 UUID를 복사합니다.
13. SQL Editor로 돌아가서 `supabase/setup.sql`의 **STEP 3**를 그 UUID로 채워서 실행합니다. (이 전까지는 예전 좌석 기록이 안 보일 수 있는데 정상입니다.)
14. 테스트: 1~2분 뒤로 리마인더가 걸린 일정을 하나 만들고 "🔔 알림 켜기"를 누른 뒤, 실제로 푸시 알림이 오는지 확인합니다. 안 오면 Supabase 대시보드의 Edge Function 로그와 `schedule_reminders.sent_at` 값을 확인해보세요.

---

## 참고사항

- **iOS(아이폰) 제약**: 사파리 탭 상태로는 웹 푸시가 아예 동작하지 않습니다. 반드시 "홈 화면에 추가"로 설치해야(iOS 16.4 이상) 알림이 옵니다. 이건 애플 정책이라 코드로 해결할 수 없습니다.
- **구글 캘린더 연동 토큰 유효기간**: 로그인 시 받는 구글 access token은 약 1시간 뒤 만료되고 자동 갱신되지 않습니다. 로그인해서 쓰는 동안 일정을 등록하는 흐름에서는 문제없지만, 오래 로그인해둔 채로 방치하다 일정을 등록하면 "다시 로그인해주세요" 에러가 뜰 수 있습니다 — 그럴 땐 재로그인하면 됩니다.
- **`npm:web-push`가 Supabase Edge Runtime(Deno)에서 동작하는지는 검증되지 않았습니다.** 10번에서 배포 후 문제가 생기면 `supabase/functions/send-reminders/index.ts` 파일 상단 주석에 적어둔 대안(esm.sh 버전, 또는 Deno `crypto.subtle`로 직접 구현)을 참고해주세요.
