// 카테고리(뮤지컬/야구/농구)별 구장·극장 지도 데이터.
window.BURGUNDY = "#6d1b2f";

window.CATEGORIES = [
  { id: "musical", label: "뮤지컬" },
  { id: "baseball", label: "야구" },
  { id: "basketball", label: "농구" },
];

// 카테고리별 강조 색(선택된 탭·정복한 좌석·기록 버튼·층 라벨 등에 쓰인다).
// 눈에 잘 띄도록 선명한 톤으로 고른다.
window.CATEGORY_COLORS = {
  musical: "#facc15", // 선명한 노란색
  baseball: window.BURGUNDY,
  basketball: "#15803d", // 선명한 딥그린
};

window.categoryColor = function categoryColor(categoryId) {
  return window.CATEGORY_COLORS[categoryId] || window.BURGUNDY;
};

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

// 모든 층·모든 구역에서 줄 간격(위아래)과 좌석 간격(좌우)을 이 값으로 통일한다.
// 층마다 줄 간격이 제각각이면 위아래로 눌리거나 늘어나 보이므로, 실제 좌석 수만큼 세로 폭도 함께 늘어나게 한다.
const SEAT_RADIUS = 4.3; // 좌석 점 크기(예전 3.2~3.4보다 키움)
const ROW_PITCH = 14; // 좌석이 커진 만큼 줄 간격도 비례해서 넓혀 서로 겹치지 않게 한다
const SEAT_SPACING = 14;
const FLOOR_GAP = 76; // 한 층의 마지막 줄과 다음 층 구역 라벨 사이 간격(층 구분을 강조하기 위해 넉넉히 띄운다)
const ROW_LABEL_GAP = 10; // A/C 구역 끝에서 줄번호 라벨까지 거리

// 무대 한쪽 옆에 딱 붙은 좁은 박스석(1줄당 1석)을 세로로 쌓는다.
// LG아트센터 1층/2층의 BL(발코니 왼쪽)·BR(브릿지 오른쪽) 박스석처럼 메인 구역보다 줄 수가 적은 경우에 쓴다.
function wingColumn(id, floorNum, floorLabel, shortLine, x, topY, counts) {
  const seats = [];
  let rowNum = 0;
  counts.forEach((count, idx) => {
    if (count <= 0) return;
    rowNum += 1;
    const y = topY + idx * ROW_PITCH;
    for (let s = 0; s < count; s++) {
      const seatNum = s + 1;
      seats.push({
        id: id + "-r" + rowNum + "-s" + seatNum,
        kind: "seat",
        cx: x + (s - (count - 1) / 2) * SEAT_SPACING,
        cy: y,
        r: SEAT_RADIUS,
        label: floorLabel + " " + shortLine + "구역 " + rowNum + "열 " + seatNum + "번",
        seatDefaults: { floor: String(floorNum), section: shortLine, row: String(rowNum), number: String(seatNum) },
      });
    }
  });
  return { seats, blockLabels: [{ text: shortLine, x, y: topY - 14 }] };
}

function mergeFloors(floors) {
  const sections = floors.flatMap((f) => f.seats);
  const blockLabels = floors.flatMap((f) => f.blockLabels);
  const rowLabels = floors.flatMap((f) => f.rowLabels || []);
  const seenFloorLabels = new Set();
  const floorLabels = [];
  floors.forEach((f) => {
    if (seenFloorLabels.has(f.floorLabel)) return;
    seenFloorLabels.add(f.floorLabel);
    floorLabels.push({ label: f.floorLabel, y: f.floorY });
  });
  const viewBoxHeight = Math.max(...floors.map((f) => f.bottomY)) + 40;
  return { sections, blockLabels, rowLabels, floorLabels, viewBoxHeight };
}

// 옆 구역(A/C)용 한 줄: 중앙 쪽 변(anchorX)은 고정, 바깥쪽으로 count칸만큼 늘어난다.
function realSideRow(blockId, floorNum, floorLabel, blockLabel, shortLine, anchorX, direction, y, rowNum, count) {
  const seats = [];
  for (let s = 0; s < count; s++) {
    const seatNum = s + 1;
    seats.push({
      id: blockId + "-r" + rowNum + "-s" + seatNum,
      kind: "seat",
      cx: anchorX + direction * SEAT_SPACING * seatNum,
      cy: y,
      r: SEAT_RADIUS,
      label: floorLabel + " " + blockLabel + " " + rowNum + "열 " + seatNum + "번",
      seatDefaults: { floor: String(floorNum), section: shortLine, row: String(rowNum), number: String(seatNum) },
    });
  }
  return seats;
}

// 가운데 구역용 한 줄: centerX를 기준으로 좌우 대칭 배치(홀수면 오른쪽에 한 석 더).
function realCenterRow(blockId, floorNum, floorLabel, blockLabel, shortLine, centerX, y, rowNum, count) {
  const half = Math.floor(count / 2);
  const xs = [];
  for (let k = 0; k < half; k++) {
    const offset = SEAT_SPACING * (k + 0.5);
    xs.push(centerX - offset);
    xs.push(centerX + offset);
  }
  if (count % 2 === 1) {
    xs.push(centerX + SEAT_SPACING * (half + 0.5));
  }
  xs.sort((a, b) => a - b);
  return xs.map((x, i) => {
    const seatNum = i + 1;
    return {
      id: blockId + "-r" + rowNum + "-s" + seatNum,
      kind: "seat",
      cx: x,
      cy: y,
      r: SEAT_RADIUS,
      label: floorLabel + " " + blockLabel + " " + rowNum + "열 " + seatNum + "번",
      seatDefaults: { floor: String(floorNum), section: shortLine, row: String(rowNum), number: String(seatNum) },
    };
  });
}

// seats/블루스퀘어_1_2_3.txt(뮤지컬씨야 실측 좌석 데이터, musicalseeya.com)에서 그대로 뽑아낸
// 줄별 좌석 수 배열로 층을 만든다. 배열의 0은 통로(간격)를 뜻하며 좌석을 만들지 않는다.
// topY는 이 층의 첫 줄 y좌표이며, 반환하는 bottomY로 다음 층의 topY를 이어붙인다.
function realBlockFloor(floorId, floorNum, floorLabel, topY, aCounts, bCounts, cCounts) {
  const gap = 25;
  const viewBoxWidth = 760;
  const aFull = Math.max(...aCounts);
  const bFull = Math.max(...bCounts);
  const cFull = Math.max(...cCounts);
  const totalWidth = aFull * SEAT_SPACING + gap + bFull * SEAT_SPACING + gap + cFull * SEAT_SPACING;
  const margin = (viewBoxWidth - totalWidth) / 2;

  const aInnerX = margin + aFull * SEAT_SPACING;
  const bLeftX = aInnerX + gap;
  const bRightX = bLeftX + bFull * SEAT_SPACING;
  const centerX = (bLeftX + bRightX) / 2;
  const cInnerX = bRightX + gap;
  const cOuterX = cInnerX + cFull * SEAT_SPACING;

  function layout(counts, buildRow, collectLabels) {
    const seats = [];
    const rowLabels = [];
    let rowNum = 0;
    counts.forEach((count, idx) => {
      const y = topY + idx * ROW_PITCH;
      if (count > 0) {
        rowNum += 1;
        seats.push(...buildRow(y, rowNum, count));
        if (collectLabels) rowLabels.push({ rowNum, y });
      }
    });
    return { seats, rowLabels, bottomY: topY + (counts.length - 1) * ROW_PITCH };
  }

  const aResult = layout(
    aCounts,
    (y, rowNum, count) => realSideRow(floorId + "-a", floorNum, floorLabel, "A구역", "A", aInnerX, -1, y, rowNum, count),
    true
  );
  const bResult = layout(bCounts, (y, rowNum, count) =>
    realCenterRow(floorId + "-b", floorNum, floorLabel, "B구역", "B", centerX, y, rowNum, count)
  );
  const cResult = layout(
    cCounts,
    (y, rowNum, count) => realSideRow(floorId + "-c", floorNum, floorLabel, "C구역", "C", cInnerX, 1, y, rowNum, count),
    true
  );

  const blockLabels = [
    { text: "A", x: (margin + aInnerX) / 2, y: topY - 14 },
    { text: "B", x: centerX, y: topY - 14 },
    { text: "C", x: (cInnerX + cOuterX) / 2, y: topY - 14 },
  ];
  const rowLabels = [
    ...aResult.rowLabels.map((rl) => ({ x: aInnerX + ROW_LABEL_GAP, y: rl.y, text: String(rl.rowNum) })),
    ...cResult.rowLabels.map((rl) => ({ x: cInnerX - ROW_LABEL_GAP, y: rl.y, text: String(rl.rowNum) })),
  ];

  const bottomY = Math.max(aResult.bottomY, bResult.bottomY, cResult.bottomY);
  return {
    seats: [...aResult.seats, ...bResult.seats, ...cResult.seats],
    blockLabels,
    rowLabels,
    floorLabel,
    floorY: topY - 30,
    topY,
    bottomY,
  };
}

// image/블루스퀘어.jpg + seats/블루스퀘어_1_2_3.txt(뮤지컬씨야 실측 데이터) 그대로:
// 1층 A/C는 앞 7줄이 8→13석으로 계단식으로 넓어진 뒤 통로, 15석짜리 15줄, 통로, 마지막 8석(휠체어) 줄.
// 1층 B는 타이퍼 없이 16~17석을 오가며 22줄 이어진다. 2·3층은 타이퍼 없이 거의 일정한 폭.
// 층마다 실제 줄 수가 다르므로 세로 폭도 그만큼 다르게 나오고, 다음 층은 그 바로 아래에서 시작한다.
function blueSquareMap() {
  const floor1 = realBlockFloor(
    "1f",
    1,
    "1층",
    90,
    [8, 9, 10, 10, 11, 12, 13, 0, 0, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 0, 8],
    [16, 17, 16, 17, 16, 17, 16, 0, 0, 16, 17, 16, 17, 16, 17, 16, 17, 16, 17, 16, 17, 16, 17, 16],
    [8, 9, 10, 10, 11, 12, 13, 0, 0, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 0, 8]
  );
  const floor2 = realBlockFloor(
    "2f",
    2,
    "2층",
    floor1.bottomY + FLOOR_GAP,
    [15, 15, 15, 15, 15, 13, 13, 13, 13, 15],
    [16, 16, 16, 16, 16, 14, 13, 13, 13, 13],
    [15, 15, 15, 15, 15, 13, 13, 13, 13, 15]
  );
  const floor3 = realBlockFloor(
    "3f",
    3,
    "3층",
    floor2.bottomY + FLOOR_GAP,
    [15, 15, 12, 15, 15, 16],
    [16, 16, 16, 16, 16, 14],
    [15, 15, 12, 15, 15, 16]
  );
  return mergeFloors([floor1, floor2, floor3]);
}

// seats/충무아트센터_1_2_3.txt(뮤지컬씨야 실측 데이터)에서 그대로 뽑아낸 줄별 좌석 수.
// 블루스퀘어와 달리 A/B/C 구역 사이에 통로 칸이 별도 열로 있을 뿐, 각 구역 내부에는 통로(0)가 없다.
function chungmuArtMap() {
  const floor1 = realBlockFloor(
    "1f",
    1,
    "1층",
    90,
    [7, 7, 7, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 6],
    [17, 16, 17, 16, 17, 16, 17, 16, 17, 16, 17, 16, 17, 16, 17, 16, 17, 16, 17, 16],
    [7, 7, 7, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 7]
  );
  const floor2 = realBlockFloor(
    "2f",
    2,
    "2층",
    floor1.bottomY + FLOOR_GAP,
    [9, 9, 9, 9, 9, 9, 8],
    [16, 15, 16, 15, 16, 15, 16, 11, 11, 11, 8],
    [9, 9, 9, 9, 9, 9, 6]
  );
  const floor3 = realBlockFloor(
    "3f",
    3,
    "3층",
    floor2.bottomY + FLOOR_GAP,
    [9, 9, 9, 9, 9, 9, 9, 9],
    [16, 15, 16, 15, 16, 15, 16, 15],
    [9, 9, 9, 9, 9, 9, 9, 9]
  );
  return mergeFloors([floor1, floor2, floor3]);
}

// 두 옆 블록의 바깥쪽 가장자리(margin 안쪽 x좌표)를 realBlockFloor와 동일한 공식으로 미리 계산한다.
// BL/BR 박스석을 메인 구역 바로 바깥에 붙이려면 margin 값이 필요한데 realBlockFloor는 그 값을 반환하지 않기 때문이다.
function blockFloorMargin(aCounts, bCounts, cCounts) {
  const gap = 25;
  const aFull = Math.max(...aCounts);
  const bFull = Math.max(...bCounts);
  const cFull = Math.max(...cCounts);
  const totalWidth = aFull * SEAT_SPACING + gap + bFull * SEAT_SPACING + gap + cFull * SEAT_SPACING;
  return (760 - totalWidth) / 2;
}

const SUBTIER_GAP = 40; // 같은 층 안에서 단(OP석/메인/그랜드박스석 등)이 나뉠 때의 간격(층간 간격보다 좁게)

// seats/LG아트센터_1_2_3.txt 실측: 1층은 무대에 가까운 순으로 OP석(오케스트라피트, 6열) → 메인(14~16열,
// 양옆에 BL/BR 박스석) → 그랜드박스석(6~7열) 세 단이 이어진다. 2층은 메인 구역 양옆에 BL/BR이 붙고,
// 3층은 별도 박스석 없이 A/B/C만 있다.
function lgFloor1() {
  const opTier = realBlockFloor(
    "1f-op", 1, "1층", 90,
    [0, 3, 4, 0, 4, 4], [16, 15, 16, 0, 17, 18], [0, 3, 4, 0, 4, 4]
  );
  opTier.blockLabels = opTier.blockLabels.map((b) => (b.text === "B" ? { ...b, text: "OP" } : b));

  const mainTopY = opTier.bottomY + SUBTIER_GAP;
  const mainACounts = [0, 4, 4, 5, 5, 5, 6, 6, 6, 6, 6, 5, 4, 2];
  const mainBCounts = [19, 18, 19, 18, 17, 17, 17, 17, 19, 18, 19, 18, 19, 18, 17, 8];
  const mainTier = realBlockFloor("1f-main", 1, "1층", mainTopY, mainACounts, mainBCounts, mainACounts);
  const mainMargin = blockFloorMargin(mainACounts, mainBCounts, mainACounts);
  const bl = wingColumn("1f-bl", 1, "1층", "BL", mainMargin - 24, mainTopY, [1, 1, 1, 1, 1, 1]);
  const br = wingColumn("1f-br", 1, "1층", "BR", 760 - mainMargin + 24, mainTopY, [1, 1, 1, 1, 1, 1]);

  const gTopY = mainTier.bottomY + SUBTIER_GAP;
  const gTier = realBlockFloor(
    "1f-g", 1, "1층", gTopY,
    [9, 9, 9, 9, 9, 9, 8], [19, 18, 19, 18, 8, 6], [9, 9, 9, 9, 9, 9, 8]
  );

  return {
    seats: [...opTier.seats, ...mainTier.seats, ...bl.seats, ...br.seats, ...gTier.seats],
    blockLabels: [...opTier.blockLabels, ...mainTier.blockLabels, ...bl.blockLabels, ...br.blockLabels, ...gTier.blockLabels],
    rowLabels: [...opTier.rowLabels, ...mainTier.rowLabels, ...gTier.rowLabels],
    floorLabel: "1층",
    floorY: opTier.floorY,
    topY: opTier.topY,
    bottomY: gTier.bottomY,
  };
}

function lgFloor2(topY) {
  const aCounts = [13, 12, 11, 10, 10, 9, 9, 9];
  const bCounts = [15, 16, 17, 18, 19, 18, 19, 19];
  const main = realBlockFloor("2f", 2, "2층", topY, aCounts, bCounts, aCounts);
  const margin = blockFloorMargin(aCounts, bCounts, aCounts);
  const bl = wingColumn("2f-bl", 2, "2층", "BL", margin - 24, topY, [1, 1, 1, 1]);
  const br = wingColumn("2f-br", 2, "2층", "BR", 760 - margin + 24, topY, [1, 1, 1, 1]);
  return {
    seats: [...main.seats, ...bl.seats, ...br.seats],
    blockLabels: [...main.blockLabels, ...bl.blockLabels, ...br.blockLabels],
    rowLabels: main.rowLabels,
    floorLabel: "2층",
    floorY: main.floorY,
    topY: main.topY,
    bottomY: main.bottomY,
  };
}

function lgArtsCenterMap() {
  const floor1 = lgFloor1();
  const floor2 = lgFloor2(floor1.bottomY + FLOOR_GAP);
  const floor3 = realBlockFloor(
    "3f", 3, "3층", floor2.bottomY + FLOOR_GAP,
    [12, 11, 11, 10, 10, 9, 7], [15, 16, 17, 18, 19, 18, 19, 16], [12, 11, 11, 10, 10, 9, 7]
  );
  return mergeFloors([floor1, floor2, floor3]);
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
    map: (() => {
      const m = blueSquareMap();
      return {
        kind: "block",
        viewBox: "0 0 760 " + m.viewBoxHeight,
        stage: { x: 260, y: 20, width: 240, height: 40 },
        ...m,
      };
    })(),
  },
  {
    id: "chungmu-art-center",
    name: "충무아트센터 대극장",
    category: "musical",
    map: (() => {
      const m = chungmuArtMap();
      return {
        kind: "block",
        viewBox: "0 0 760 " + m.viewBoxHeight,
        stage: { x: 260, y: 20, width: 240, height: 40 },
        ...m,
      };
    })(),
  },
  {
    id: "lg-arts-center",
    name: "LG아트센터 시그니처홀",
    category: "musical",
    map: (() => {
      const m = lgArtsCenterMap();
      return {
        kind: "block",
        viewBox: "0 0 760 " + m.viewBoxHeight,
        stage: { x: 260, y: 20, width: 240, height: 40 },
        ...m,
      };
    })(),
  },
];
