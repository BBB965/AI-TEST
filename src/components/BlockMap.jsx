// 극장 좌석 배치도를 그린다. 무대는 항상 위쪽, 구역 배경 위에 좌석 하나하나를 점으로 찍어 개별 선택할 수 있게 한다.
function formatDate(d) {
  if (!d) return "";
  return d;
}

// 좌석이 작아서 탭하기 어려우니, 브라우저의 "페이지 전체" 핀치줌 대신 이 지도 svg만 확대/이동할
// 수 있게 한다. viewBox를 직접 조작하는 방식이라 확대돼도 선(stroke)이나 글자가 뭉개지지 않는다.
const ZOOM_MIN = 1; // 1 = 원본 그대로. 이보다 더 축소는 못 하게(=원본 밖을 보여주지 않게) 막는다.
const ZOOM_MAX = 5;

function parseViewBox(vb) {
  const [x, y, w, h] = vb.split(" ").map(Number);
  return { x, y, w, h };
}

window.BlockMap = function BlockMap({ venue, onSectionClick, entriesFor }) {
  const { viewBox, sections, stage, blockLabels, rowLabels, floorLabels } = venue.map;
  const original = React.useMemo(() => parseViewBox(viewBox), [viewBox]);
  const [view, setView] = React.useState(original);
  const [hoverId, setHoverId] = React.useState(null);
  const [tooltip, setTooltip] = React.useState(null); // { section, entries, x, y }
  const containerRef = React.useRef(null);
  const svgRef = React.useRef(null);
  const pointers = React.useRef(new Map()); // pointerId -> {x, y} (클라이언트 좌표)
  const lastPinchDist = React.useRef(null);
  const getSectionEntries = entriesFor || ((sectionId) => window.getEntries(venue.id, sectionId));

  const isZoomed = view.w < original.w - 0.001;

  // (clientX, clientY) 지점을 고정한 채 factor만큼 확대(>1)/축소(<1)한다. 지도 밖으로 나가지
  // 않도록 x/y/폭을 항상 원본 영역 안으로 clamp한다.
  function applyZoom(clientX, clientY, factor) {
    const rect = svgRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setView((v) => {
      const fx = (clientX - rect.left) / rect.width;
      const fy = (clientY - rect.top) / rect.height;
      const anchorX = v.x + fx * v.w;
      const anchorY = v.y + fy * v.h;
      const aspect = original.h / original.w;
      let newW = v.w / factor;
      newW = Math.min(original.w / ZOOM_MIN, Math.max(original.w / ZOOM_MAX, newW));
      const newH = newW * aspect;
      let newX = anchorX - fx * newW;
      let newY = anchorY - fy * newH;
      newX = Math.min(original.x + original.w - newW, Math.max(original.x, newX));
      newY = Math.min(original.y + original.h - newH, Math.max(original.y, newY));
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }

  function applyPan(dxPx, dyPx) {
    const rect = svgRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setView((v) => {
      const dxSvg = (dxPx / rect.width) * v.w;
      const dySvg = (dyPx / rect.height) * v.h;
      const newX = Math.min(original.x + original.w - v.w, Math.max(original.x, v.x - dxSvg));
      const newY = Math.min(original.y + original.h - v.h, Math.max(original.y, v.y - dySvg));
      return { ...v, x: newX, y: newY };
    });
  }

  function handlePointerDown(e) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      lastPinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function handlePointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      if (lastPinchDist.current) {
        const factor = dist / lastPinchDist.current;
        if (Math.abs(factor - 1) > 0.001) applyZoom(midX, midY, factor);
      }
      lastPinchDist.current = dist;
    } else if (pointers.current.size === 1 && isZoomed) {
      applyPan(e.clientX - prev.x, e.clientY - prev.y);
    }
  }

  function handlePointerUp(e) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastPinchDist.current = null;
  }

  function handleDoubleClick(e) {
    if (isZoomed) {
      setView(original);
    } else {
      applyZoom(e.clientX, e.clientY, 2.5);
    }
  }

  // 트랙패드 핀치는 브라우저가 ctrlKey를 켠 wheel 이벤트로 보내주므로 그걸로 같이 처리한다.
  // 일반 마우스 휠 스크롤(ctrlKey 없음)은 그대로 페이지 스크롤로 남겨둔다.
  // React의 onWheel은 기본이 passive라 preventDefault가 안 먹으므로 네이티브 리스너로 붙인다.
  React.useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    function onWheelNative(e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      applyZoom(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
    }
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original]);

  function handleEnter(e, section) {
    setHoverId(section.id);
    const entries = getSectionEntries(section.id);
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
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="w-full h-auto select-none"
        style={{ touchAction: isZoomed ? "none" : "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
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
              fill="#111827"
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
          const count = getSectionEntries(section.id).length;
          const conquered = count > 0;
          const hovered = hoverId === section.id;
          const accent = window.categoryColor(venue.category);
          let fill = "none";
          let fillOpacity = 1;
          if (conquered) {
            fill = window.seatColorForCount(venue.category, count);
          } else if (hovered) {
            fill = accent;
            fillOpacity = 0.45;
          }
          const size = (hovered || conquered ? section.r + 0.8 : section.r) * 2;

          return (
            <rect
              key={section.id}
              x={section.cx - size / 2}
              y={section.cy - size / 2}
              width={size}
              height={size}
              rx={1.4}
              ry={1.4}
              onClick={() => onSectionClick(section)}
              onMouseEnter={(e) => handleEnter(e, section)}
              onMouseLeave={handleLeave}
              fill={fill}
              fillOpacity={fillOpacity}
              stroke="#9ca3af"
              strokeWidth="1"
              style={{ pointerEvents: "all" }}
              className="cursor-pointer transition-all duration-100"
            />
          );
        })}
      </svg>

      {isZoomed && (
        <button
          type="button"
          onClick={() => setView(original)}
          className="absolute top-2 right-2 z-10 text-xs font-semibold bg-white/90 border border-neutral-200 rounded-lg px-2.5 py-1.5 shadow-sm text-neutral-600 hover:border-neutral-300"
        >
          축소
        </button>
      )}

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
                    {window.formatEntryMeta(venue.category, entry.meta) && (
                      <p className="text-[10px] text-neutral-400">
                        {window.formatEntryMeta(venue.category, entry.meta)}
                      </p>
                    )}
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
