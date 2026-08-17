// 각도(0°=정면, +는 홈/1루 쪽, -는 원정/3루 쪽)와 반지름, 방향(zone)으로 부채꼴 SVG path를 만든다.
// zone === "outfield"면 홈플레이트에서 위쪽으로, 그 외(내야)는 아래쪽으로 뻗어나간다.
function polarPoint(cx, cy, r, angleDeg, zone) {
  const rad = (Math.PI / 180) * angleDeg;
  const x = cx + r * Math.sin(rad);
  const y = zone === "outfield" ? cy - r * Math.cos(rad) : cy + r * Math.cos(rad);
  return { x, y };
}

function wedgePath(cx, cy, innerRadius, outerRadius, startAngle, endAngle, zone) {
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const sweep = zone === "outfield" ? 1 : 0;
  const outerStart = polarPoint(cx, cy, outerRadius, startAngle, zone);
  const outerEnd = polarPoint(cx, cy, outerRadius, endAngle, zone);

  if (innerRadius <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${large} ${sweep} ${outerEnd.x} ${outerEnd.y}`,
      "Z",
    ].join(" ");
  }

  const innerEnd = polarPoint(cx, cy, innerRadius, endAngle, zone);
  const innerStart = polarPoint(cx, cy, innerRadius, startAngle, zone);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${large} ${sweep} ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${large} ${1 - sweep} ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

// 홈플레이트를 중심으로 한 미니 그라운드(내야 다이아몬드 + 더그아웃). 항상 외야(위쪽) 방향을 바라본다.
function Field({ cx, cy }) {
  const baseDist = 28;
  const home = { x: cx, y: cy };
  const first = polarPoint(cx, cy, baseDist, 45, "outfield");
  const second = polarPoint(cx, cy, baseDist * Math.SQRT2, 0, "outfield");
  const third = polarPoint(cx, cy, baseDist, -45, "outfield");
  const mound = polarPoint(cx, cy, baseDist * 0.62, 0, "outfield");
  const awayDugout = polarPoint(cx, cy, 46, -58, "outfield");
  const homeDugout = polarPoint(cx, cy, 46, 58, "outfield");
  const diamond = [home, first, second, third].map((p) => `${p.x},${p.y}`).join(" ");
  const grass = `M ${cx - 60} ${cy} A 60 60 0 0 1 ${cx + 60} ${cy} Z`;

  return (
    <g>
      <path d={grass} fill="#bfe3c4" />
      <polygon points={diamond} fill="#d9b88a" stroke="#ffffff" strokeWidth="1.5" />
      <line x1={home.x} y1={home.y} x2={first.x} y2={first.y} stroke="#ffffff" strokeWidth="1.5" />
      <line x1={home.x} y1={home.y} x2={third.x} y2={third.y} stroke="#ffffff" strokeWidth="1.5" />
      <circle cx={mound.x} cy={mound.y} r="5" fill="#c9a06a" stroke="#ffffff" strokeWidth="1.2" />
      {[first, second, third].map((p, i) => (
        <rect
          key={i}
          x={p.x - 2.5}
          y={p.y - 2.5}
          width="5"
          height="5"
          fill="#ffffff"
          transform={`rotate(45 ${p.x} ${p.y})`}
        />
      ))}
      <rect x={home.x - 3.5} y={home.y - 3.5} width="7" height="7" fill="#ffffff" />
      <rect
        x={awayDugout.x - 12}
        y={awayDugout.y - 6}
        width="24"
        height="12"
        rx="3"
        fill="#2b2b33"
        transform={`rotate(-58 ${awayDugout.x} ${awayDugout.y})`}
      />
      <rect
        x={homeDugout.x - 12}
        y={homeDugout.y - 6}
        width="24"
        height="12"
        rx="3"
        fill="#2b2b33"
        transform={`rotate(58 ${homeDugout.x} ${homeDugout.y})`}
      />
      <circle cx={home.x} cy={home.y} r="3" fill="#374151" />
    </g>
  );
}

function formatDate(d) {
  if (!d) return "";
  return d;
}

window.StadiumMap = function StadiumMap({ stadium, onSectionClick }) {
  const { viewBox, center, sections, screen } = stadium.map;
  const [hoverId, setHoverId] = React.useState(null);
  const [tooltip, setTooltip] = React.useState(null); // { section, entries, x, y }
  const containerRef = React.useRef(null);

  function handleEnter(e, section) {
    setHoverId(section.id);
    const entries = window.getEntries(stadium.id, section.id);
    if (entries.length === 0) {
      setTooltip(null);
      return;
    }
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
        aria-label={stadium.name + " 구역도"}
      >
        <Field cx={center.cx} cy={center.cy} />

        {sections.map((section) => {
          const d = wedgePath(
            center.cx,
            center.cy,
            section.innerRadius,
            section.outerRadius,
            section.startAngle,
            section.endAngle,
            section.zone
          );
          const conquered = window.isConquered(stadium.id, section.id);
          const mid = polarPoint(
            center.cx,
            center.cy,
            (section.innerRadius + section.outerRadius) / 2,
            (section.startAngle + section.endAngle) / 2,
            section.zone
          );

          let fill = section.zone === "outfield" ? "#dcecdf" : "#e5e7eb";
          if (conquered) fill = window.BURGUNDY;
          else if (hoverId === section.id) fill = "#e7cdd3";

          return (
            <g key={section.id}>
              <path
                d={d}
                onClick={() => onSectionClick(section)}
                onMouseEnter={(e) => handleEnter(e, section)}
                onMouseLeave={handleLeave}
                fill={fill}
                stroke="#ffffff"
                strokeWidth="1"
                className="cursor-pointer transition-colors duration-150"
              />
              <text
                x={mid.x}
                y={mid.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none text-[13px] sm:text-[15px] font-bold"
                fill={conquered ? "#ffffff" : "#374151"}
              >
                {(() => {
                  const lines = section.shortLines || [section.label];
                  return lines.map((line, i) => (
                    <tspan
                      key={i}
                      x={mid.x}
                      dy={i === 0 ? (lines.length > 1 ? "-0.35em" : "0") : "1.1em"}
                    >
                      {line}
                    </tspan>
                  ));
                })()}
              </text>
            </g>
          );
        })}

        {screen &&
          (() => {
            const d = wedgePath(
              center.cx,
              center.cy,
              screen.innerRadius,
              screen.outerRadius,
              screen.startAngle,
              screen.endAngle,
              screen.zone
            );
            const mid = polarPoint(
              center.cx,
              center.cy,
              (screen.innerRadius + screen.outerRadius) / 2,
              (screen.startAngle + screen.endAngle) / 2,
              screen.zone
            );
            return (
              <g>
                <path d={d} fill="#1f2937" />
                <text
                  x={mid.x}
                  y={mid.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none text-[13px] font-bold"
                  fill="#ffffff"
                >
                  전광판
                </text>
              </g>
            );
          })()}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-neutral-200 bg-white p-2.5 shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <p className="text-xs font-semibold text-neutral-700 mb-1.5">
            {tooltip.section.label} · {tooltip.entries.length}건
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
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
        </div>
      )}
    </div>
  );
};
