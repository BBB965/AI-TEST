function formatEventAt(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

window.ScheduleView = function ScheduleView() {
  const [schedules, setSchedules] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [pushState, setPushState] = React.useState("idle"); // idle | working | on | error
  const [pushError, setPushError] = React.useState("");

  const refresh = React.useCallback(async () => {
    await window.loadAllSchedules();
    setSchedules(window.getSchedules());
  }, []);

  React.useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  async function handleDelete(id) {
    try {
      await window.deleteSchedule(id);
      setSchedules(window.getSchedules());
    } catch (err) {
      alert((err && err.message) || "삭제에 실패했어요.");
    }
  }

  async function handleEnablePush() {
    setPushState("working");
    setPushError("");
    try {
      await window.registerPushNotifications();
      setPushState("on");
    } catch (err) {
      setPushState("error");
      setPushError((err && err.message) || "알림을 켜지 못했어요.");
    }
  }

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-neutral-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-sm font-semibold text-neutral-700">등록된 일정</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-xs font-semibold text-white rounded-lg px-3 py-1.5"
          style={{ backgroundColor: window.BURGUNDY }}
        >
          + 새 일정
        </button>
      </div>

      <div className="mb-4 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-neutral-500">
            {pushState === "on" ? "🔔 이 기기에서 알림이 켜져 있어요" : "일정 시간이 되기 전에 이 기기로 푸시 알림을 받으려면 켜주세요"}
          </p>
          {pushState !== "on" && (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushState === "working"}
              className="text-xs font-semibold text-neutral-600 border border-neutral-200 rounded-lg px-3 py-1.5 hover:border-neutral-300 disabled:opacity-50 shrink-0"
            >
              {pushState === "working" ? "설정 중..." : "🔔 알림 켜기"}
            </button>
          )}
        </div>
        {pushError && <p className="text-xs text-red-500 mt-2">{pushError}</p>}
        <p className="text-[11px] text-neutral-400 mt-2">
          iOS(아이폰)는 사파리에서 "홈 화면에 추가"로 설치해야 알림이 와요 (iOS 16.4 이상).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400 py-2">불러오는 중...</p>
      ) : schedules.length === 0 ? (
        <p className="text-sm text-neutral-400 py-2">아직 등록된 일정이 없어요.</p>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-start gap-3 border border-neutral-100 rounded-lg p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <p className="text-xs text-neutral-400">{formatEventAt(s.eventAt)}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {s.reminders.map((r) => (
                    <span
                      key={r.id}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500"
                    >
                      {r.minutesBefore}분 전{r.sentAt ? " · 발송됨" : ""}
                    </span>
                  ))}
                  {s.googleEventId && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                      캘린더 등록됨
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                className="text-neutral-300 hover:text-red-500 text-xs shrink-0"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <window.ScheduleModal onClose={() => setModalOpen(false)} onSaved={refresh} />
      )}
    </div>
  );
};
