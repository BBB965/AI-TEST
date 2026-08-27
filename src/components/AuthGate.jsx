// 로그인 세션을 소유하고, 로그아웃 상태면 LoginScreen을, 로그인 상태면 상단바 + App을 보여준다.
// 세션이 바뀔 때(로그인/로그아웃/다른 계정으로 재로그인) session.user.id를 React key로 써서
// <window.App/>을 강제로 다시 마운트한다 — App의 loadAllEntries/loadAllSchedules가 매번
// 새로 돌아야 계정이 바뀌어도 이전 계정 데이터가 남아있지 않는다.
window.AuthGate = function AuthGate() {
  const [session, setSession] = React.useState(undefined); // undefined = 아직 확인 전

  React.useEffect(() => {
    const client = window.getSupabaseClient();
    if (!client) {
      setSession(null);
      return;
    }
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = client.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-400">
        불러오는 중...
      </div>
    );
  }

  if (!session) {
    return <window.LoginScreen />;
  }

  return (
    <div>
      <div className="max-w-3xl mx-auto px-4 pt-4 flex items-center justify-end gap-3 text-xs text-neutral-400">
        <span className="truncate max-w-[200px]">{session.user.email}</span>
        <button
          type="button"
          onClick={() => window.signOut()}
          className="text-neutral-400 hover:text-neutral-600 underline shrink-0"
        >
          로그아웃
        </button>
      </div>
      <window.App key={session.user.id} />
    </div>
  );
};
