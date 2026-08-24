window.VenueSelector = function VenueSelector({ venues, selectedId, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {venues.map((v) => {
        const active = v.id === selectedId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v.id)}
            className={
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors " +
              (active
                ? "text-white border-transparent"
                : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300")
            }
            style={active ? { backgroundColor: window.BURGUNDY } : undefined}
          >
            {v.name}
          </button>
        );
      })}
    </div>
  );
};
