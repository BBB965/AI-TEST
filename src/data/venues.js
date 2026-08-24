// 카테고리(뮤지컬/야구/농구)별 구장·극장 지도 데이터.
window.BURGUNDY = "#6d1b2f";

window.CATEGORIES = [
  { id: "musical", label: "뮤지컬" },
  { id: "baseball", label: "야구" },
  { id: "basketball", label: "농구" },
];

function rangeNums(from, to) {
  const arr = [];
  for (let n = from; n <= to; n++) arr.push(n);
  return arr;
}

// numbers 배열을 startAngle~endAngle 사이에 균등하게 나눠 구역으로 만든다 (야구장 wedge용).
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

// 실제 좌석표(물랑루즈_블루스퀘어 등)를 보면 극장 구역은 매끈한 부채꼴이 아니라
// "뒤쪽 대부분은 폭이 일정한 직사각형이고, 무대에 가까운 앞쪽 몇 줄만 계단식으로 좁아지는" 모양이다.
// 옆 구역(A/C)은 중앙 쪽 변은 그대로 두고 바깥쪽(벽 쪽) 변만 계단식으로 깎이고,
// 가운데 구역(B)은 양쪽이 대칭으로 계단식으로 깎여 앞쪽이 좁은 깔때기 모양이 된다.

// 한쪽 끝(anchorX)은 모든 줄에서 고정, 반대쪽 끝만 앞쪽 taperRows줄 동안 좌석 수가 1개씩 계단식으로 줄어드는 구역.
function sideBlockSeats(opts) {
  const {
    blockId,
    floorNum,
    floorLabel,
    blockLabel,
    shortLine,
    anchorX, // 중앙 쪽(고정) 변의 x
    direction, // +1: 오른쪽으로 퍼짐(A구역), -1: 왼쪽으로 퍼짐(C구역)
    fullSeats,
    taperRows,
    rows,
    seatSpacing,
    topY,
    bottomY,
  } = opts;
  const rowPad = 9;
  const usableTop = topY + rowPad;
  const usableBottom = bottomY - rowPad;
  const minSeats = Math.max(3, fullSeats - taperRows + 1);
  const seats = [];

  for (let r = 0; r < rows; r++) {
    const t = rows === 1 ? 0.5 : r / (rows - 1);
    const y = usableTop + (usableBottom - usableTop) * t;
    const count = r < taperRows ? minSeats + r : fullSeats;
    const rowNum = r + 1;

    for (let s = 0; s < count; s++) {
      const x = anchorX + direction * seatSpacing * (s + 1);
      const seatNum = s + 1;
      seats.push({
        id: blockId + "-r" + rowNum + "-s" + seatNum,
        kind: "seat",
        cx: x,
        cy: y,
        r: 3.4,
        label: floorLabel + " " + blockLabel + " " + rowNum + "열 " + seatNum + "번",
        seatDefaults: {
          floor: String(floorNum),
          section: shortLine,
          row: String(rowNum),
          number: String(seatNum),
        },
      });
    }
  }
  return seats;
}

// 가운데 구역: 중심(centerX)을 기준으로 좌우 대칭, 앞쪽 taperRows줄 동안 양쪽이 계단식으로 좁아진다.
function centerBlockSeats(opts) {
  const {
    blockId,
    floorNum,
    floorLabel,
    blockLabel,
    shortLine,
    centerX,
    halfFullSeats,
    minHalfSeats,
    taperRows,
    rows,
    seatSpacing,
    topY,
    bottomY,
  } = opts;
  const rowPad = 9;
  const usableTop = topY + rowPad;
  const usableBottom = bottomY - rowPad;
  const seats = [];

  for (let r = 0; r < rows; r++) {
    const t = rows === 1 ? 0.5 : r / (rows - 1);
    const y = usableTop + (usableBottom - usableTop) * t;
    let halfCount;
    if (r < taperRows) {
      const step = (halfFullSeats - minHalfSeats) / (taperRows - 1 || 1);
      halfCount = Math.round(minHalfSeats + step * r);
    } else {
      halfCount = halfFullSeats;
    }
    const rowNum = r + 1;
    const rowSeats = [];
    for (let k = 0; k < halfCount; k++) {
      const offset = seatSpacing * (k + 0.5);
      rowSeats.push(centerX - offset);
      rowSeats.push(centerX + offset);
    }
    rowSeats.sort((a, b) => a - b);
    rowSeats.forEach((x, i) => {
      const seatNum = i + 1;
      seats.push({
        id: blockId + "-r" + rowNum + "-s" + seatNum,
        kind: "seat",
        cx: x,
        cy: y,
        r: 3.4,
        label: floorLabel + " " + blockLabel + " " + rowNum + "열 " + seatNum + "번",
        seatDefaults: {
          floor: String(floorNum),
          section: shortLine,
          row: String(rowNum),
          number: String(seatNum),
        },
      });
    });
  }
  return seats;
}

// 계단식 테이퍼 없이 고정 크기로 채우는 작은 좌석 블록(사이드 박스석용).
function fixedGridSeats(opts) {
  const { blockId, floorNum, floorLabel, blockLabel, shortLine, leftX, rightX, topY, bottomY, rows, seatsPerRow } =
    opts;
  const rowPad = 8;
  const usableTop = topY + rowPad;
  const usableBottom = bottomY - rowPad;
  const colGap = (rightX - leftX) / (seatsPerRow + 1);
  const seats = [];
  for (let r = 0; r < rows; r++) {
    const t = rows === 1 ? 0.5 : r / (rows - 1);
    const y = usableTop + (usableBottom - usableTop) * t;
    const rowNum = r + 1;
    for (let s = 0; s < seatsPerRow; s++) {
      const x = leftX + colGap * (s + 1);
      const seatNum = s + 1;
      seats.push({
        id: blockId + "-r" + rowNum + "-s" + seatNum,
        kind: "seat",
        cx: x,
        cy: y,
        r: 3.2,
        label: floorLabel + " " + blockLabel + " " + rowNum + "열 " + seatNum + "번",
        seatDefaults: {
          floor: String(floorNum),
          section: shortLine,
          row: String(rowNum),
          number: String(seatNum),
        },
      });
    }
  }
  return seats;
}

// A(좌)/B(중앙)/C(우) 3개 구역이 간격을 두고 나뉘어 있는 층을 만든다.
// 구역별로 줄 수(rows)와 계단식으로 깎이는 정도(taperRows)를 따로 지정할 수 있다.
function threeBlockFloor(floorId, floorNum, floorLabel, topY, bottomY, a, b, c) {
  const seatSpacing = 11;
  const gap = 16;
  const viewBoxWidth = 760;
  const totalWidth = a.fullSeats * seatSpacing * 2 + b.halfFullSeats * 2 * seatSpacing + gap * 2;
  const margin = (viewBoxWidth - totalWidth) / 2;

  const aInnerX = margin + a.fullSeats * seatSpacing; // A 오른쪽(중앙 쪽) 끝
  const bLeftFullX = aInnerX + gap;
  const bRightFullX = bLeftFullX + b.halfFullSeats * 2 * seatSpacing;
  const cInnerX = bRightFullX + gap;
  const cOuterX = cInnerX + c.fullSeats * seatSpacing;
  const centerX = (bLeftFullX + bRightFullX) / 2;

  const seats = [
    ...sideBlockSeats({
      blockId: floorId + "-a",
      floorNum,
      floorLabel,
      blockLabel: "A구역",
      shortLine: "A",
      anchorX: aInnerX,
      direction: -1,
      fullSeats: a.fullSeats,
      taperRows: a.taperRows,
      rows: a.rows,
      seatSpacing,
      topY,
      bottomY,
    }),
    ...centerBlockSeats({
      blockId: floorId + "-b",
      floorNum,
      floorLabel,
      blockLabel: "B구역",
      shortLine: "B",
      centerX,
      halfFullSeats: b.halfFullSeats,
      minHalfSeats: b.minHalfSeats,
      taperRows: b.taperRows,
      rows: b.rows,
      seatSpacing,
      topY,
      bottomY,
    }),
    ...sideBlockSeats({
      blockId: floorId + "-c",
      floorNum,
      floorLabel,
      blockLabel: "C구역",
      shortLine: "C",
      anchorX: cInnerX,
      direction: 1,
      fullSeats: c.fullSeats,
      taperRows: c.taperRows,
      rows: c.rows,
      seatSpacing,
      topY,
      bottomY,
    }),
  ];

  const blockLabels = [
    { text: "A", x: (margin + aInnerX) / 2, y: topY - 10 },
    { text: "B", x: centerX, y: topY - 10 },
    { text: "C", x: (cInnerX + cOuterX) / 2, y: topY - 10 },
  ];

  return { seats, blockLabels, floorLabel, floorY: (topY + bottomY) / 2 };
}

// 무대 옆에 붙은 좁은 사이드 박스석(충무아트센터 1층 양옆 스카이박스 등).
function theaterSideWing(id, floorNum, floorLabel, side, topY, bottomY) {
  const isLeft = side === "left";
  const leftX = isLeft ? 6 : 732;
  const rightX = isLeft ? 28 : 754;
  const seats = fixedGridSeats({
    blockId: id,
    floorNum,
    floorLabel,
    blockLabel: "사이드석",
    shortLine: "S",
    leftX,
    rightX,
    topY,
    bottomY,
    rows: 6,
    seatsPerRow: 3,
  });
  const blockLabels = [{ text: "S", x: (leftX + rightX) / 2, y: topY - 10 }];
  return { seats, blockLabels, floorLabel, floorY: (topY + bottomY) / 2 };
}

function mergeFloors(floors) {
  const sections = floors.flatMap((f) => f.seats);
  const blockLabels = floors.flatMap((f) => f.blockLabels);
  const seenFloorLabels = new Set();
  const floorLabels = [];
  floors.forEach((f) => {
    if (seenFloorLabels.has(f.floorLabel)) return;
    seenFloorLabels.add(f.floorLabel);
    floorLabels.push({ label: f.floorLabel, y: f.floorY });
  });
  return { sections, blockLabels, floorLabels };
}

// image/블루스퀘어.jpg 실측(사용자 확인): A(좌)/B(중앙)/C(우) 3개 구역이 실제로 나뉘어 있고,
// 가장 넓은 줄 기준 폭은 A≈9석, B≈16석, C≈9석으로 큰 타이퍼 없이 거의 일정하다.
// 1층은 맨 앞 2줄만 아주 살짝(8→9석) 좁아지고 나머지는 그대로다. 2·3층은 같은 구조를 층 크기에 맞게 축소.
function blueSquareMap() {
  return mergeFloors([
    threeBlockFloor(
      "1f",
      1,
      "1층",
      90,
      330,
      { rows: 23, taperRows: 2, fullSeats: 9 },
      { rows: 23, taperRows: 0, halfFullSeats: 8 },
      { rows: 23, taperRows: 2, fullSeats: 9 }
    ),
    threeBlockFloor(
      "2f",
      2,
      "2층",
      360,
      540,
      { rows: 10, taperRows: 0, fullSeats: 6 },
      { rows: 10, taperRows: 0, halfFullSeats: 6 },
      { rows: 10, taperRows: 0, fullSeats: 6 }
    ),
    threeBlockFloor(
      "3f",
      3,
      "3층",
      570,
      720,
      { rows: 6, taperRows: 0, fullSeats: 5 },
      { rows: 6, taperRows: 0, halfFullSeats: 5 },
      { rows: 6, taperRows: 0, fullSeats: 5 }
    ),
  ]);
}

// image/충무아트센터.jpg 실측: A/B/C가 실제로 벌어져 있고 구역별로 줄 수·테이퍼가 다르다.
// 1층 - A: 16열(앞 3열 테이퍼, 7석 완성), B: 15열(앞 8열 긴 테이퍼, 8+8석 완성), C: 9열(앞 3열 테이퍼, 7석 완성, A보다 짧음)
// 2층 - A/C: 6열(짧고 테이퍼 거의 없음), B: 11열(A/C보다 길게 이어짐)
// 3층 - A/B/C 모두 8열, 완만한 테이퍼
function chungmuArtMap() {
  return mergeFloors([
    threeBlockFloor(
      "1f",
      1,
      "1층",
      90,
      330,
      { rows: 16, taperRows: 3, fullSeats: 7 },
      { rows: 15, taperRows: 8, halfFullSeats: 8, minHalfSeats: 2 },
      { rows: 9, taperRows: 3, fullSeats: 7 }
    ),
    theaterSideWing("1f-side-l", 1, "1층", "left", 90, 210),
    theaterSideWing("1f-side-r", 1, "1층", "right", 90, 210),
    threeBlockFloor(
      "2f",
      2,
      "2층",
      360,
      540,
      { rows: 6, taperRows: 1, fullSeats: 7 },
      { rows: 11, taperRows: 7, halfFullSeats: 8, minHalfSeats: 1 },
      { rows: 6, taperRows: 1, fullSeats: 7 }
    ),
    threeBlockFloor(
      "3f",
      3,
      "3층",
      570,
      720,
      { rows: 8, taperRows: 2, fullSeats: 7 },
      { rows: 8, taperRows: 3, halfFullSeats: 8, minHalfSeats: 2 },
      { rows: 8, taperRows: 2, fullSeats: 7 }
    ),
  ]);
}

window.VENUES = [
  {
    id: "gocheok-skydome",
    name: "고척스카이돔",
    category: "baseball",
    map: {
      kind: "wedge",
      viewBox: "0 0 1100 980",
      center: { cx: 550, cy: 500 },
      screen: { zone: "outfield", startAngle: -8, endAngle: 8, innerRadius: 460, outerRadius: 495 },
      sections: gocheokSections(),
    },
  },
  {
    id: "blue-square",
    name: "블루스퀘어 신한카드홀",
    category: "musical",
    map: {
      kind: "block",
      viewBox: "0 0 760 760",
      stage: { x: 260, y: 20, width: 240, height: 40 },
      ...blueSquareMap(),
    },
  },
  {
    id: "chungmu-art-center",
    name: "충무아트센터 대극장",
    category: "musical",
    map: {
      kind: "block",
      viewBox: "0 0 760 760",
      stage: { x: 260, y: 20, width: 240, height: 40 },
      ...chungmuArtMap(),
    },
  },
];
