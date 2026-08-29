const HUB_ITEMS = [
  { id: "schedule", emoji: "🎟️", label: "예매 일정", enabled: true },
  { id: "seats", emoji: "🎫", label: "직관 도장깨기", enabled: true },
  { id: null, emoji: "✨", label: "새 기능 준비중", enabled: false },
];

window.HubScreen = function HubScreen({ session, onSelect }) {
  const avatarUrl = session && session.user.user_metadata?.avatar_url;
  return (
    <div className="max-w-sm mx-auto px-4 pt-10 pb-16">
      <div className="text-center">
        <div
          className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center text-2xl border-[3px]"
          style={{ borderColor: window.BURGUNDY }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            "🎫"
          )}
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight" style={{ color: window.BURGUNDY }}>
          티켓북
        </h1>
        <p className="mt-1 text-sm text-neutral-500">예매도, 관람 기록도 한 곳에서</p>
      </div>

      <div className="mt-16 space-y-3">
        {HUB_ITEMS.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={!item.enabled}
            onClick={() => item.enabled && onSelect(item.id)}
            className={
              "w-full flex items-center gap-3 rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition-colors " +
              (item.enabled
                ? "bg-white border-neutral-200 text-neutral-800 hover:border-neutral-300 shadow-sm"
                : "bg-neutral-100 border-neutral-100 text-neutral-400 cursor-not-allowed")
            }
          >
            <span className="text-xl">{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
