function defaultSeatFloor(section) {
  return (section.seatDefaults && section.seatDefaults.floor) || "";
}

function defaultSeatSection(section) {
  if (section.seatDefaults && "section" in section.seatDefaults) return section.seatDefaults.section;
  const match = section.label && section.label.match(/\d+/);
  return match ? match[0] : "";
}

function defaultSeatRow(section) {
  return (section.seatDefaults && section.seatDefaults.row) || "";
}

function defaultSeatNumber(section) {
  return (section.seatDefaults && section.seatDefaults.number) || "";
}

const TITLE_PLACEHOLDER = {
  baseball: "예: 키움 vs LG",
  musical: "예: 뮤지컬 <엘리자벳>",
  basketball: "예: SK vs LG",
};

function buildSeatLabel(seat) {
  const parts = [];
  if (seat.floor) parts.push(seat.floor + "층");
  if (seat.section) parts.push(seat.section + "구역");
  if (seat.row) parts.push(seat.row + "열");
  if (seat.number) parts.push(seat.number + "번");
  return parts.join(" ");
}

const isSportsCategory = (category) => category === "baseball" || category === "basketball";

window.SeatModal = function SeatModal({ venue, section, onClose, onSaved }) {
  const [entries, setEntries] = React.useState(() => window.getEntries(venue.id, section.id));
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [seatFloor, setSeatFloor] = React.useState(() => defaultSeatFloor(section));
  const [seatSection, setSeatSection] = React.useState(() => defaultSeatSection(section));
  const [seatRow, setSeatRow] = React.useState(() => defaultSeatRow(section));
  const [seatNumber, setSeatNumber] = React.useState(() => defaultSeatNumber(section));
  const [review, setReview] = React.useState("");
  const [photo, setPhoto] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  // 야구/농구: 시즌·승패·경기 시작 시간. 뮤지컬: 공연 차수(재연/삼연 등)·시작 시간(낮공/밤공 구분용).
  const [season, setSeason] = React.useState("");
  const [result, setResult] = React.useState("");
  const [production, setProduction] = React.useState("");
  const [startTime, setStartTime] = React.useState("");

  async function handlePhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await window.resizeImageFile(file);
      setPhoto(dataUrl);
    } catch {
      setError("사진을 불러오지 못했어요. 다른 파일로 시도해주세요.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !date) {
      setError("경기/공연 이름과 날짜는 꼭 입력해주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const seat = {
        floor: seatFloor.trim(),
        section: seatSection.trim(),
        row: seatRow.trim(),
        number: seatNumber.trim(),
      };
      const meta = isSportsCategory(venue.category)
        ? { season: season.trim(), result, startTime }
        : { production: production.trim(), startTime };
      const updated = await window.addEntry(venue.id, section.id, {
        title: title.trim(),
        date,
        seat,
        seatLabel: buildSeatLabel(seat),
        review: review.trim(),
        photo,
        meta,
      });
      setEntries(updated);
      setTitle("");
      setDate("");
      setSeatFloor(defaultSeatFloor(section));
      setSeatSection(defaultSeatSection(section));
      setSeatRow(defaultSeatRow(section));
      setSeatNumber(defaultSeatNumber(section));
      setReview("");
      setPhoto(null);
      setSeason("");
      setResult("");
      setProduction("");
      setStartTime("");
      onSaved();
    } catch (err) {
      setError((err && err.message) || "저장에 실패했어요. 사진 용량을 줄여서 다시 시도해보세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      const updated = await window.deleteEntry(venue.id, section.id, id);
      setEntries(updated);
      onSaved();
    } catch (err) {
      setError((err && err.message) || "삭제에 실패했어요.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 sticky top-0 bg-white">
          <div>
            <p className="text-xs text-neutral-400">{venue.name}</p>
            <h2 className="text-lg font-bold">{section.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none px-2"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">경기/공연 이름</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={TITLE_PLACEHOLDER[venue.category] || "예: 키움 vs LG"}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          {isSportsCategory(venue.category) ? (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">시즌</label>
                <input
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="예: 2026"
                  className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm text-center outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">경기 시작</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm text-center outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">승패</label>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm text-center outline-none focus:border-neutral-400 bg-white"
                >
                  <option value="">선택</option>
                  <option value="승">승</option>
                  <option value="패">패</option>
                  <option value="무">무</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">공연 차수</label>
                <input
                  value={production}
                  onChange={(e) => setProduction(e.target.value)}
                  placeholder="예: 재연, 삼연"
                  className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm text-center outline-none focus:border-neutral-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">공연 시작 (낮공/밤공 구분)</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm text-center outline-none focus:border-neutral-400"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">좌석 상세</label>
            <div className="grid grid-cols-4 gap-2">
              <input
                value={seatFloor}
                onChange={(e) => setSeatFloor(e.target.value)}
                placeholder="층"
                className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm text-center outline-none focus:border-neutral-400"
              />
              <input
                value={seatSection}
                onChange={(e) => setSeatSection(e.target.value)}
                placeholder="구역"
                className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm text-center outline-none focus:border-neutral-400"
              />
              <input
                value={seatRow}
                onChange={(e) => setSeatRow(e.target.value)}
                placeholder="열"
                className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm text-center outline-none focus:border-neutral-400"
              />
              <input
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                placeholder="번"
                className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm text-center outline-none focus:border-neutral-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">시야 사진</label>
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="text-sm" />
            {photo && (
              <img src={photo} alt="시야 미리보기" className="mt-2 rounded-lg max-h-40 object-cover" />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">한줄평</label>
            <input
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="예: 시야 좋고 햇빛 안 들어와요"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className={
              "w-full rounded-lg text-sm font-semibold py-2.5 disabled:opacity-50 " +
              (venue.category === "musical" ? "text-neutral-900" : "text-white")
            }
            style={{ backgroundColor: window.categoryColor(venue.category) }}
          >
            {saving ? "저장 중..." : "기록하기"}
          </button>
        </form>

        {entries.length > 0 && (
          <div className="px-5 pb-5 space-y-2">
            <p className="text-xs font-medium text-neutral-400">이 구역 기록 ({entries.length})</p>
            {entries.map((entry) => (
              <div key={entry.id} className="flex gap-3 border border-neutral-100 rounded-lg p-3">
                {entry.photo && (
                  <img src={entry.photo} alt="" className="w-14 h-14 rounded-md object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.title}</p>
                  <p className="text-xs text-neutral-400">
                    {entry.date}
                    {entry.seatLabel ? " · " + entry.seatLabel : ""}
                  </p>
                  {window.formatEntryMeta(venue.category, entry.meta) && (
                    <p className="text-xs text-neutral-400">
                      {window.formatEntryMeta(venue.category, entry.meta)}
                    </p>
                  )}
                  {entry.review && <p className="text-xs text-neutral-600 mt-1">{entry.review}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="text-neutral-300 hover:text-red-500 text-xs shrink-0"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
