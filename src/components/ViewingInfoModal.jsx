// "티켓팅 성공" 후 실제 관람 정보를 입력받아 구글 캘린더로 넘기는 모달.
// schedule이 이미 관람 정보를 갖고 있으면(수정) 그 값으로 폼을 미리 채운다.
window.ViewingInfoModal = function ViewingInfoModal({ schedule, onClose, onSaved }) {
  const isEdit = !!schedule.viewingAt;
  const [viewingAt, setViewingAt] = React.useState(schedule.viewingAt ? schedule.viewingAt.slice(0, 16) : "");
  const [venueName, setVenueName] = React.useState(schedule.venueName || "");
  const [seatInfo, setSeatInfo] = React.useState(schedule.seatInfo || "");
  const [vendor, setVendor] = React.useState(schedule.vendor || "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!viewingAt) {
      setError("관람 일자/시간은 꼭 입력해주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { calendarError } = await window.addViewingInfo(schedule.id, {
        viewingAt,
        venueName: venueName.trim(),
        seatInfo: seatInfo.trim(),
        vendor: vendor.trim(),
      });
      onSaved();
      onClose();
      if (calendarError) {
        alert("정보는 저장됐지만 구글 캘린더 등록엔 실패했어요: " + calendarError);
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
          <div>
            <p className="text-xs text-neutral-400">{schedule.title}</p>
            <h2 className="text-lg font-bold">{isEdit ? "관람 정보 수정" : "🎉 티켓팅 성공! 관람 정보 입력"}</h2>
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
            <label className="block text-xs font-medium text-neutral-500 mb-1">관람 일자/시간</label>
            <input
              type="datetime-local"
              value={viewingAt}
              onChange={(e) => setViewingAt(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">관람 장소</label>
            <input
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="예: 잠실 실내체육관"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">좌석 정보</label>
            <input
              value={seatInfo}
              onChange={(e) => setSeatInfo(e.target.value)}
              placeholder="예: 2층 R석 15열 20번"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">예매처</label>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="예: 인터파크, 예스24"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg text-sm font-semibold py-2.5 disabled:opacity-50 text-white"
            style={{ backgroundColor: window.BURGUNDY }}
          >
            {saving ? "저장 중..." : isEdit ? "수정하기" : "캘린더에 등록"}
          </button>
        </form>
      </div>
    </div>
  );
};
