window.LoginScreen = function LoginScreen() {
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      await window.signInWithGoogle();
      // 여기서부턴 구글 로그인 페이지로 리다이렉트되므로 별도 후처리가 없다.
    } catch (err) {
      setError((err && err.message) || "로그인에 실패했어요.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight">직관 도장깨기</h1>
        <p className="text-neutral-500 text-sm mt-2">
          다녀온 좌석을 기록하고, 티켓팅 일정도 놓치지 마세요
        </p>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:border-neutral-300 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
            />
          </svg>
          {loading ? "이동 중..." : "Google로 로그인"}
        </button>

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>
    </div>
  );
};
