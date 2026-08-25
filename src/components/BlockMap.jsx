// 극장 좌석 배치도를 그린다. 무대는 항상 위쪽, 구역 배경 위에 좌석 하나하나를 점으로 찍어 개별 선택할 수 있게 한다.
function formatDate(d) {
  if (!d) return "";
  return d;
}

window.BlockMap = function BlockMap({ venue, onSectionClick }) {
  const { viewBox, sections, stage, blockLabels, rowLabels, floorLabels } = venue.map;
  const [hoverId, setHoverId] = React.useState(null);
  const [tooltip, setTooltip] = React.useState(null); // { section, entries, x, y }
  const containerRef = React.useRef(null);

  function handleEnter(e, section) {
    setHoverId(section.id);
    const entries = window.getEntries(venue.id, section.id);
    const containerRect = containerRef.current.getBoundingClientRect();
    const targetRect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      section,
      entries,
      x: targetRect.left + targetRect.width / 2 - containerRect.left,
      y: targetRect.top - containerRect.top,
    });
  }

  function handleLeave() {
    setHoverId(null);
    setTooltip(null);
  }

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox={viewBox}
        className="w-full h-auto select-none"
        role="img"
        aria-label={venue.name + " 좌석 배치도"}
      >
        {stage && (
          <g>
            <rect
              x={stage.x}
              y={stage.y}
              width={stage.width}
              height={stage.height}
              rx="6"
              fill="#1f2937"
            />
            <text
              x={stage.x + stage.width / 2}
              y={stage.y + stage.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none text-[13px] font-bold tracking-wide"
              fill="#ffffff"
            >
              STAGE
            </text>
          </g>
        )}

        {floorLabels &&
          floorLabels.map((f) => (
            <text
              key={f.label}
              x="18"
              y={f.y}
              textAnchor="start"
              dominantBaseline="middle"
              className="pointer-events-none text-[19px] font-extrabold"
              fill={window.categoryColor(venue.category)}
            >
              {f.label}
            </text>
          ))}

        {blockLabels &&
          blockLabels.map((b, i) => (
            <text
              key={i}
              x={b.x}
              y={b.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none text-[11px] font-bold"
              fill="#b7bac2"
            >
              {b.text}
            </text>
          ))}

        {rowLabels &&
          rowLabels.map((r, i) => (
            <text
              key={i}
              x={r.x}
              y={r.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none text-[7px]"
              fill="#c7cad1"
            >
              {r.text}
            </text>
          ))}

        {sections.map((section) => {
          const count = window.getEntries(venue.id, section.id).length;
          const conquered = count > 0;
          const hovered = hoverId === section.id;
          const accent = window.categoryColor(venue.category);
          let fill = "#c7cad1";
          let fillOpacity = 1;
          if (conquered) {
            fill = window.seatColorForCount(venue.category, count);
          } else if (hovered) {
            fill = accent;
            fillOpacity = 0.45;
          }

          return (
            <circle
              key={section.id}
              cx={section.cx}
              cy={section.cy}
              r={hovered || conquered ? section.r + 0.8 : section.r}
              onClick={() => onSectionClick(section)}
              onMouseEnter={(e) => handleEnter(e, section)}
              onMouseLeave={handleLeave}
              fill={fill}
              fillOpacity={fillOpacity}
              className="cursor-pointer transition-all duration-100"
            />
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-neutral-200 bg-white p-2.5 shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <p className="text-xs font-semibold text-neutral-700">
            {tooltip.section.label}
          </p>
          {tooltip.section.seatDefaults && (
            <p className="text-[10px] text-neutral-400 mb-1.5">
              {tooltip.section.seatDefaults.floor}층
              {tooltip.section.seatDefaults.section ? " " + tooltip.section.seatDefaults.section + "구역" : ""}{" "}
              {tooltip.section.seatDefaults.row}열 {tooltip.section.seatDefaults.number}번
            </p>
          )}
          {tooltip.entries.length === 0 ? (
            <p className="text-[11px] text-neutral-400">아직 기록이 없어요 · 클릭해서 기록하기</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              <p className="text-[10px] text-neutral-400">{tooltip.entries.length}건 기록됨</p>
              {tooltip.entries.map((entry) => (
                <div key={entry.id} className="flex gap-2 items-start">
                  {entry.photo && (
                    <img src={entry.photo} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-neutral-800 truncate">{entry.title}</p>
                    <p className="text-[10px] text-neutral-400">
                      {formatDate(entry.date)}
                      {entry.seatLabel ? " · " + entry.seatLabel : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
