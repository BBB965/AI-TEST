// 나중에 실제 공연(뮤지컬) 정보를 채워 넣는 곳.
// 여기 등록한 title이 좌석 기록(entry)의 title과 정확히 같으면
// 공연 필터 화면에서 자동으로 매칭되어 총 공연 횟수 등 추가 정보로 표시된다.
// (지금은 비어 있어도 앱은 정상 동작한다 — entry.title만으로 필터링/집계하기 때문.)
//
// 예시:
// window.SHOWS = [
//   {
//     title: "물랑루즈",       // entry.title과 정확히 일치해야 매칭된다
//     venueId: "blue-square",
//     runStart: "2022-12-16",
//     runEnd: "2023-03-05",
//     totalRounds: 104,         // 전체 공연 회차 수 (정산표의 "/104" 부분)
//     poster: "",
//     roles: [
//       { role: "Christian", actors: ["홍광호", "이지훈"] },
//     ],
//   },
// ];
window.SHOWS = [];

// entry.title과 정확히 일치하는 공연 정보를 찾는다. 아직 데이터가 없으면 null.
window.findShowInfo = function findShowInfo(title) {
  return window.SHOWS.find((s) => s.title === title) || null;
};
