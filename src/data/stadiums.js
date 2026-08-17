// 구장/공연장별 구역 지도 데이터.
// 각도 0° = 정면, 양수 = 홈/1루측(오른쪽), 음수 = 원정/3루측(왼쪽).
// zone: "outfield"는 홈플레이트에서 위쪽으로, "infield"는 아래쪽으로 층이 높아진다.
window.BURGUNDY = "#6d1b2f";

function rangeNums(from, to) {
  const arr = [];
  for (let n = from; n <= to; n++) arr.push(n);
  return arr;
}

// numbers 배열을 startAngle~endAngle 사이에 균등하게 나눠 구역으로 만든다.
function numberedRing(zone, numbers, startAngle, endAngle, innerRadius, outerRadius) {
  const step = (endAngle - startAngle) / numbers.length;
  return numbers.map((num, i) => ({
    id: "sec-" + num,
    zone,
    label: num + "구역",
    shortLines: [String(num)],
    startAngle: startAngle + step * i,
    endAngle: startAngle + step * (i + 1),
    innerRadius,
    outerRadius,
  }));
}

function gocheokSections() {
  return [
    // 내야: 홈플레이트 바로 아래부터 시작해서 아래로 갈수록 층이 높아진다 (박스석 -> 100 -> 200 -> 300 -> 400).
    // 각 층 모두 101/201/301/401이 바깥쪽(오른쪽 끝)에서 시작해 중앙 쪽으로 갈수록 번호가 커진다.
    {
      id: "box-away",
      zone: "infield",
      label: "원정 다이아몬드 박스석",
      shortLines: ["원정", "박스석"],
      startAngle: -40,
      endAngle: 0,
      innerRadius: 40,
      outerRadius: 85,
    },
    {
      id: "box-home",
      zone: "infield",
      label: "홈 다이아몬드 박스석",
      shortLines: ["홈", "박스석"],
      startAngle: 0,
      endAngle: 40,
      innerRadius: 40,
      outerRadius: 85,
    },

    // 100번대 (다크버건디/버건디석) - 1층
    ...numberedRing("infield", rangeNums(111, 114).reverse(), -55, 0, 85, 175),
    ...numberedRing("infield", rangeNums(101, 105).reverse(), 0, 55, 85, 175),

    // 200번대 (커플석/테이블석 라인) - 2층
    ...numberedRing("infield", rangeNums(206, 210).reverse(), -55, 0, 175, 265),
    ...numberedRing("infield", rangeNums(201, 205).reverse(), 0, 55, 175, 265),

    // 300번대 - 3층
    ...numberedRing("infield", rangeNums(313, 324).reverse(), -100, 0, 265, 360),
    ...numberedRing("infield", rangeNums(301, 312).reverse(), 0, 100, 265, 360),

    // 400번대 - 4층(가장 바깥)
    ...numberedRing("infield", rangeNums(413, 424).reverse(), -100, 0, 360, 455),
    ...numberedRing("infield", rangeNums(401, 412).reverse(), 0, 100, 360, 455),

    // 외야: 홈플레이트 위쪽(그라운드 너머)부터 시작해서 위로 갈수록 층이 높아진다.
    // 내야와 같은 폭(90 안팎)으로 층을 나눈다.
    // 1층(115~132, 카메라석 자리 122는 결번이지만 링 자체는 끊김 없이 이어붙인다)
    ...numberedRing("outfield", rangeNums(115, 132).filter((n) => n !== 122), -65, 65, 90, 180),

    // 2층(211~222)
    ...numberedRing("outfield", rangeNums(211, 216), -60, 0, 180, 270),
    ...numberedRing("outfield", rangeNums(217, 222), 0, 60, 180, 270),

    // 3층(325~336)
    ...numberedRing("outfield", rangeNums(325, 330), -62, 0, 270, 365),
    ...numberedRing("outfield", rangeNums(331, 336), 0, 62, 270, 365),

    // 4층(425~435, 전광판 자리 제외)
    ...numberedRing("outfield", rangeNums(425, 435), -64, 64, 365, 460),
  ];
}

window.STADIUMS = [
  {
    id: "gocheok-skydome",
    name: "고척스카이돔",
    type: "baseball",
    map: {
      viewBox: "0 0 1100 980",
      center: { cx: 550, cy: 500 },
      screen: { zone: "outfield", startAngle: -8, endAngle: 8, innerRadius: 460, outerRadius: 495 },
      sections: gocheokSections(),
    },
  },
];
