window.App = function App() {
  const [stadiumId, setStadiumId] = React.useState(window.STADIUMS[0].id);
  const [selectedSection, setSelectedSection] = React.useState(null);
  const [version, setVersion] = React.useState(0);

  const stadium = window.STADIUMS.find((s) => s.id === stadiumId);
  const conqueredCount = stadium.map.sections.filter((s) => window.isConquered(stadium.id, s.id)).length;

  function handleStadiumSelect(id) {
    setStadiumId(id);
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
        <p className="text-neutral-500 text-sm mt-1">다녀온 구역을 색칠하며 채워나가 보세요</p>
      </header>

      <main className="max-w-3xl mx-auto px-4 pb-16">
        <window.StadiumSelector
          stadiums={window.STADIUMS}
          selectedId={stadiumId}
          onSelect={handleStadiumSelect}
        />

        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-neutral-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{stadium.name}</h2>
            <span className="text-xs text-neutral-400">
              {conqueredCount} / {stadium.map.sections.length} 구역 완료
            </span>
          </div>
          <window.StadiumMap
            key={stadiumId + "-" + version}
            stadium={stadium}
            onSectionClick={handleSectionClick}
          />
        </div>
      </main>

      {selectedSection && (
        <window.SeatModal
          stadium={stadium}
          section={selectedSection}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
