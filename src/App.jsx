window.App = function App() {
  const [view, setView] = React.useState("seats"); // "seats" | "schedule"
  const [category, setCategory] = React.useState(window.CATEGORIES[0].id);
  const venues = window.VENUES.filter((v) => v.category === category);

  const [venueId, setVenueId] = React.useState(venues[0] ? venues[0].id : null);
  const [selectedSection, setSelectedSection] = React.useState(null);
  const [version, setVersion] = React.useState(0);
  const [loadingEntries, setLoadingEntries] = React.useState(true);
  const [showFilter, setShowFilter] = React.useState("all"); // "all" 또는 특정 공연/경기 title

  React.useEffect(() => {
    const stillValid = venues.some((v) => v.id === venueId);
    if (!stillValid) {
      setVenueId(venues[0] ? venues[0].id : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // venue를 바꾸면 이전 venue 기준으로 골라뒀던 필터는 의미가 없으므로 초기화한다.
  React.useEffect(() => {
    setShowFilter("all");
  }, [venueId]);

  // 모든 기록을 앱이 뜰 때 한 번만 불러온다. venue를 바꿀 때마다 다시 불러오면
  // 그때마다 네트워크 왕복이 생겨 탭을 옮길 때마다 버퍼링처럼 느껴지기 때문이다.
  React.useEffect(() => {
    let cancelled = false;
    window.loadAllEntries().then(() => {
      if (cancelled) return;
      setLoadingEntries(false);
      setVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const venue = venues.find((v) => v.id === venueId) || null;
  const conqueredCount = venue
    ? venue.map.sections.filter((s) => window.isConquered(venue.id, s.id)).length
    : 0;

  // 이 venue에서 지금까지 기록한 모든 항목(공연/경기 title별로 묶어 필터링·집계하는 데 쓴다).
  const venueEntries = venue ? window.getVenueEntries(venue.id) : [];
  const showTitles = Array.from(new Set(venueEntries.map((e) => e.title).filter(Boolean))).sort();

  // showFilter가 "all"이 아니면 그 title과 일치하는 기록만 남긴다.
  // WedgeMap/BlockMap에도 그대로 넘겨서 지도 색칠·툴팁이 필터에 맞춰 바뀌게 한다.
  function filteredEntriesFor(sectionId) {
    const entries = window.getEntries(venue.id, sectionId);
    if (showFilter === "all") return entries;
    return entries.filter((e) => e.title === showFilter);
  }

  const filteredVenueEntries =
    showFilter === "all" ? venueEntries : venueEntries.filter((e) => e.title === showFilter);
  const filteredVisitCount = filteredVenueEntries.length;
  const filteredSeatCount = new Set(filteredVenueEntries.map((e) => e.sectionId)).size;
  const showInfo = showFilter !== "all" ? window.findShowInfo(showFilter) : null;

  function handleCategorySelect(id) {
    setCategory(id);
  }

  function handleVenueSelect(id) {
    setVenueId(id);
  }

  function handleSectionClick(section) {
    setSelectedSection(section);
  }

  function handleModalClose() {
    setSelectedSection(null);
  }

  function handleSaved() {
    setVersion((v) => v + 1);
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="max-w-3xl mx-auto px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">직관 도장깨기</h1>
        <p className="text-neutral-500 text-sm mt-1">다녀온 좌석을 기록하고 시야를 확인해보세요</p>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        <div className="flex gap-2 mb-4">
          {[
            { id: "seats", label: "좌석 기록" },
            { id: "schedule", label: "일정" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setView(t.id)}
              className={
                "px-4 py-2 rounded-xl text-sm font-semibold border transition-colors " +
                (view === t.id
                  ? "bg-neutral-900 text-white border-transparent"
                  : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {view === "schedule" && <window.ScheduleView />}

        {view === "seats" && (
          <>
            <window.CategorySelector selectedId={category} onSelect={handleCategorySelect} />

            <div className="mt-4">
              {venues.length > 0 ? (
                <window.VenueSelector
                  venues={venues}
                  selectedId={venueId}
                  onSelect={handleVenueSelect}
                />
              ) : (
                <p className="text-sm text-neutral-400 py-2">
                  아직 등록된 경기장/공연장이 없어요. 조금만 기다려주세요!
                </p>
              )}
            </div>

            {venue && (
              <div className="mt-6 bg-white rounded-2xl shadow-sm border border-neutral-200 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <select
                      value={showFilter}
                      onChange={(e) => setShowFilter(e.target.value)}
                      className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-600 outline-none focus:border-neutral-400 bg-white shrink-0"
                    >
                      <option value="all">전체 보기</option>
                      {showTitles.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {!loadingEntries && showFilter !== "all" && (
                      <span className="text-xs text-neutral-500 whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                        관람 {filteredVisitCount}회
                        {showInfo && showInfo.totalRounds ? ` / 총 ${showInfo.totalRounds}회` : ""}
                        {" · "}
                        {venue.map.kind === "wedge" ? "구역" : "좌석"} {filteredSeatCount}
                        {venue.map.kind === "wedge" ? "곳" : "석"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">
                    {loadingEntries
                      ? "불러오는 중..."
                      : `${conqueredCount} / ${venue.map.sections.length} ${
                          venue.map.kind === "wedge" ? "구역" : "좌석"
                        } 완료`}
                  </span>
                </div>

                {venue.map.kind === "wedge" ? (
                  <window.WedgeMap
                    key={venue.id + "-" + version}
                    venue={venue}
                    onSectionClick={handleSectionClick}
                    entriesFor={filteredEntriesFor}
                  />
                ) : (
                  <window.BlockMap
                    key={venue.id + "-" + version}
                    venue={venue}
                    onSectionClick={handleSectionClick}
                    entriesFor={filteredEntriesFor}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {venue && selectedSection && (
        <window.SeatModal
          venue={venue}
          section={selectedSection}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
