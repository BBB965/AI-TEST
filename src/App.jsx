window.App = function App() {
  const [category, setCategory] = React.useState(window.CATEGORIES[0].id);
  const venues = window.VENUES.filter((v) => v.category === category);

  const [venueId, setVenueId] = React.useState(venues[0] ? venues[0].id : null);
  const [selectedSection, setSelectedSection] = React.useState(null);
  const [version, setVersion] = React.useState(0);
  const [loadingEntries, setLoadingEntries] = React.useState(true);

  React.useEffect(() => {
    const stillValid = venues.some((v) => v.id === venueId);
    if (!stillValid) {
      setVenueId(venues[0] ? venues[0].id : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{venue.name}</h2>
              <span className="text-xs text-neutral-400">
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
              />
            ) : (
              <window.BlockMap
                key={venue.id + "-" + version}
                venue={venue}
                onSectionClick={handleSectionClick}
              />
            )}
          </div>
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
