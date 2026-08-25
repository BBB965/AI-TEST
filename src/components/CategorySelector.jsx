window.CategorySelector = function CategorySelector({ selectedId, onSelect }) {
  return (
    <div className="flex gap-2">
      {window.CATEGORIES.map((c) => {
        const active = c.id === selectedId;
        const color = window.categoryColor(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={
              "flex-1 sm:flex-none sm:px-6 py-2.5 rounded-xl text-sm font-semibold border transition-colors " +
              (active
                ? (c.id === "musical" ? "text-neutral-900" : "text-white") + " border-transparent"
                : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300")
            }
            style={active ? { backgroundColor: color } : undefined}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
};
