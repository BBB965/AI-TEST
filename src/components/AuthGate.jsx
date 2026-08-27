// 로그인 세션을 소유하고, 로그아웃 상태면 LoginScreen을, 로그인 상태면 Home(허브+각 화면)을 보여준다.
// 세션이 바뀔 때(로그인/로그아웃/다른 계정으로 재로그인) session.user.id를 React key로 써서
// <window.Home/>을 강제로 다시 마운트한다 — 그 안의 loadAllEntries/loadAllSchedules가 매번
// 새로 돌아야 계정이 바뀌어도 이전 계정 데이터가 남아있지 않는다.
// 로컬에서 Google 로그인 리다이렉트가 안 통할 때(localhost는 OAuth redirect URL로 등록돼 있지
// 않음) 확인만 하고 싶을 때 쓰는 우회. URL에 ?dev=1을 붙이면 로그인 화면을 건너뛰고 가짜 세션으로
// 바로 들어간다. 배포 주소에선 이 파라미터를 안 붙이니 실제 로그인 흐름에는 영향 없다.
function isDevBypass() {
  return new URLSearchParams(window.location.search).has("dev");
}

window.AuthGate = function AuthGate() {
  const [session, setSession] = React.useState(undefined); // undefined = 아직 확인 전
  const devBypass = isDevBypass();

  React.useEffect(() => {
    if (devBypass) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (devBypass) {
    return <window.Home key="dev-bypass" session={{ user: { id: "dev-local", email: "로컬 미리보기 (로그인 우회)" } }} />;
  }

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

  return <window.Home key={session.user.id} session={session} />;
};
