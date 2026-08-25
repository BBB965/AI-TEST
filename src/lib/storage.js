// Supabase(Postgres) 기반 저장소. 구역(section)별로 여러 개의 기록(entry)을 담는다.
// getEntries()는 매번 네트워크를 타지 않도록, 앱 시작 시 한 번에 불러온 캐시에서 동기적으로 읽는다.
// (뮤지컬/야구/농구·구장을 옮길 때마다 다시 불러오면 매번 버퍼링이 생기므로, App.jsx는 window.loadAllEntries()를
// 최초 1회만 호출한다. addEntry/deleteEntry는 캐시를 그 자리에서 갱신하므로 이후 재조회가 필요 없다.)
window.SUPABASE_TABLE = "seat_entries";

let supabaseClient = null;
function getClient() {
  if (supabaseClient) return supabaseClient;
  if (
    typeof window.supabase === "undefined" ||
    !window.SUPABASE_URL ||
    !window.SUPABASE_ANON_KEY ||
    window.SUPABASE_URL.startsWith("YOUR_")
  ) {
    return null;
  }
  supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  return supabaseClient;
}

const cache = {}; // { [venueId]: { [sectionId]: entry[] } }

function rowToEntry(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    date: row.date,
    seat: row.seat || {},
    seatLabel: row.seat_label || "",
    review: row.review || "",
    photo: row.photo || null,
  };
}

// 모든 venue의 기록을 한 번에 불러와 캐시에 채운다. 앱이 처음 뜰 때 딱 한 번만 호출하면 된다.
window.loadAllEntries = async function loadAllEntries() {
  const client = getClient();
  if (!client) return;
  const { data, error } = await client
    .from(window.SUPABASE_TABLE)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[supabase] loadAllEntries 실패:", error);
    return;
  }
  const byVenue = {};
  (data || []).forEach((row) => {
    if (!byVenue[row.venue_id]) byVenue[row.venue_id] = {};
    if (!byVenue[row.venue_id][row.section_id]) byVenue[row.venue_id][row.section_id] = [];
    byVenue[row.venue_id][row.section_id].push(rowToEntry(row));
  });
  Object.keys(cache).forEach((k) => delete cache[k]);
  Object.assign(cache, byVenue);
};

window.getEntries = function getEntries(venueId, sectionId) {
  return (cache[venueId] && cache[venueId][sectionId]) || [];
};

window.addEntry = async function addEntry(venueId, sectionId, entry) {
  const client = getClient();
  if (!client) throw new Error("Supabase 설정이 안 됐어요. src/data/supabaseConfig.js를 확인해주세요.");
  const { data, error } = await client
    .from(window.SUPABASE_TABLE)
    .insert({
      venue_id: venueId,
      section_id: sectionId,
      title: entry.title,
      date: entry.date,
      seat: entry.seat,
      seat_label: entry.seatLabel,
      review: entry.review,
      photo: entry.photo,
    })
    .select()
    .single();
  if (error) throw error;
  if (!cache[venueId]) cache[venueId] = {};
  if (!cache[venueId][sectionId]) cache[venueId][sectionId] = [];
  cache[venueId][sectionId].push(rowToEntry(data));
  return cache[venueId][sectionId];
};

window.deleteEntry = async function deleteEntry(venueId, sectionId, entryId) {
  const client = getClient();
  if (!client) throw new Error("Supabase 설정이 안 됐어요. src/data/supabaseConfig.js를 확인해주세요.");
  const { error } = await client.from(window.SUPABASE_TABLE).delete().eq("id", entryId);
  if (error) throw error;
  if (cache[venueId] && cache[venueId][sectionId]) {
    cache[venueId][sectionId] = cache[venueId][sectionId].filter((e) => e.id !== entryId);
  }
  return (cache[venueId] && cache[venueId][sectionId]) || [];
};

window.isConquered = function isConquered(venueId, sectionId) {
  return window.getEntries(venueId, sectionId).length > 0;
};

// 업로드한 사진을 축소해 data URL로 변환한다 (DB 저장 용량 대응).
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
