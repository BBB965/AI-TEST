window.CategorySelector = function CategorySelector({ selectedId, onSelect }) {
  return (
    <div className="flex gap-2">
      {window.CATEGORIES.map((c) => {
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={
              "flex-1 sm:flex-none sm:px-6 py-2.5 rounded-xl text-sm font-semibold border transition-colors " +
              (active
                ? "text-white border-transparent"
                : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300")
            }
            style={active ? { backgroundColor: window.BURGUNDY } : undefined}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
};
