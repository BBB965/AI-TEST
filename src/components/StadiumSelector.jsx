window.StadiumSelector = function StadiumSelector({ stadiums, selectedId, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {stadiums.map((s) => {
        const active = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors " +
              (active
                ? "text-white border-transparent"
                : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300")
            }
            style={active ? { backgroundColor: window.BURGUNDY } : undefined}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
};
