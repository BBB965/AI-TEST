const REMINDER_PRESETS = [60, 30, 10, 5];

window.ScheduleModal = function ScheduleModal({ onClose, onSaved }) {
  const [title, setTitle] = React.useState("");
  const [eventAt, setEventAt] = React.useState("");
  const [selectedMinutes, setSelectedMinutes] = React.useState([30, 10]);
  const [customMinutes, setCustomMinutes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  function toggleMinute(m) {
    setSelectedMinutes((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => b - a)
    );
  }

  function addCustomMinute() {
    const m = parseInt(customMinutes, 10);
    if (!m || m <= 0) return;
    if (!selectedMinutes.includes(m)) {
      setSelectedMinutes((prev) => [...prev, m].sort((a, b) => b - a));
    }
    setCustomMinutes("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !eventAt) {
      setError("제목과 일시는 꼭 입력해주세요.");
      return;
    }
    if (selectedMinutes.length === 0) {
      setError("알림을 최소 하나는 선택해주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { calendarError } = await window.addSchedule({
        title: title.trim(),
        eventAt,
        reminderMinutes: selectedMinutes,
      });
      // 일정 저장 자체는 이미 끝났으니 재제출로 중복 생성되지 않도록 모달은 항상 닫는다.
      // 캘린더 연동만 실패했으면 별도 알림으로만 알려준다.
      onSaved();
      onClose();
      if (calendarError) {
        alert("일정은 저장됐지만 구글 캘린더 등록엔 실패했어요: " + calendarError);
      }
    } catch (err) {
      setError((err && err.message) || "저장에 실패했어요.");
      setSaving(false);
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
          <h2 className="text-lg font-bold">새 일정</h2>
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
            <label className="block text-xs font-medium text-neutral-500 mb-1">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: OO 티켓팅 오픈"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">일시</label>
            <input
              type="datetime-local"
              value={eventAt}
              onChange={(e) => setEventAt(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">알림 (몇 분 전)</label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMinute(m)}
                  className={
                    "px-3 py-1.5 rounded-full text-xs font-semibold border " +
                    (selectedMinutes.includes(m)
                      ? "text-white border-transparent"
                      : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300")
                  }
                  style={selectedMinutes.includes(m) ? { backgroundColor: window.BURGUNDY } : undefined}
                >
                  {m}분 전
                </button>
              ))}
              {selectedMinutes
                .filter((m) => !REMINDER_PRESETS.includes(m))
                .map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMinute(m)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-white border border-transparent"
                    style={{ backgroundColor: window.BURGUNDY }}
                  >
                    {m}분 전 ×
                  </button>
                ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                min="1"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="직접 입력(분)"
                className="w-32 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-neutral-400"
              />
              <button
                type="button"
                onClick={addCustomMinute}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-700 px-2"
              >
                추가
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg text-sm font-semibold py-2.5 disabled:opacity-50 text-white"
            style={{ backgroundColor: window.BURGUNDY }}
          >
            {saving ? "저장 중..." : "일정 등록"}
          </button>
        </form>
      </div>
    </div>
  );
};
