// 웹 푸시(VAPID) 공개키. `npx web-push generate-vapid-keys`로 키 쌍을 만든 뒤
// public key만 여기 붙여넣으면 된다.
// (public key는 브라우저에 공개돼도 안전 — private key만 Supabase Edge Function 시크릿으로 따로 보관한다.)
window.VAPID_PUBLIC_KEY = "BN78_-Qt4HUIpZXZ48sgVtZJSHFof9CD17LxDFZ9FpP5L8rZUADV6tJTPSOdAf5JHe50S4bdMwBTRwuMtObDxCI";
