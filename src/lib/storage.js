// 브라우저 localStorage 기반 저장소. 구역(section)별로 여러 개의 기록(entry)을 담는다.
window.STORAGE_KEY = "seat-conquests-v1";

function loadAllEntries() {
  try {
    const raw = localStorage.getItem(window.STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllEntries(data) {
  localStorage.setItem(window.STORAGE_KEY, JSON.stringify(data));
}

function sectionKey(stadiumId, sectionId) {
  return stadiumId + "::" + sectionId;
}

window.getEntries = function getEntries(stadiumId, sectionId) {
  const all = loadAllEntries();
  return all[sectionKey(stadiumId, sectionId)] || [];
};

window.addEntry = function addEntry(stadiumId, sectionId, entry) {
  const all = loadAllEntries();
  const key = sectionKey(stadiumId, sectionId);
  const list = all[key] || [];
  list.push({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  });
  all[key] = list;
  saveAllEntries(all);
  return list;
};

window.deleteEntry = function deleteEntry(stadiumId, sectionId, entryId) {
  const all = loadAllEntries();
  const key = sectionKey(stadiumId, sectionId);
  all[key] = (all[key] || []).filter((e) => e.id !== entryId);
  saveAllEntries(all);
  return all[key];
};

window.isConquered = function isConquered(stadiumId, sectionId) {
  return window.getEntries(stadiumId, sectionId).length > 0;
};

// 업로드한 사진을 축소해 data URL로 변환한다 (localStorage 용량 제한 대응).
window.resizeImageFile = function resizeImageFile(file, maxWidth = 640, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
};
