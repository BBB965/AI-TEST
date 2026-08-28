// 로그인 후 화면 전환(허브 ↔ 예매 일정 ↔ 직관 도장깨기)을 담당한다.
// 상단바(이메일+로그아웃)는 어느 화면에 있든 항상 보이고, 허브가 아닐 땐 뒤로가기 버튼도 같이 보인다.
window.Home = function Home({ session }) {
  const [screen, setScreen] = React.useState("hub"); // "hub" | "schedule" | "seats"

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 pt-4 flex items-center justify-between gap-3 text-xs text-neutral-400">
        {screen === "hub" ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={() => setScreen("hub")}
            className="text-neutral-500 hover:text-neutral-700 font-medium shrink-0"
          >
            ← 메인으로
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className="truncate max-w-[200px]">
            {session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email}
          </span>
          <button
            type="button"
            onClick={() => window.signOut()}
            className="text-neutral-400 hover:text-neutral-600 underline shrink-0"
          >
            로그아웃
          </button>
        </div>
      </div>

      {screen === "hub" && <window.HubScreen onSelect={setScreen} />}
      {screen === "schedule" && <window.ScheduleView />}
      {screen === "seats" && <window.App />}
    </div>
  );
};
