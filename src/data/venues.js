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

// 방문 횟수(count)에 따라 옅은 색 ~ 짙은 색 사이를 보간하기 위한 카테고리별 그라데이션.
// max에 도달하면 가장 짙은 색으로 고정되고, 1회는 옅지만 눈에 띄는 색에서 시작한다.
window.CATEGORY_GRADIENT = {
  musical: { from: "#fde68a", to: "#c2410c", max: 10 }, // 옅은 노란색 -> 짙은 주황색
  baseball: { from: "#e3b3bf", to: window.BURGUNDY, max: 20 }, // 옅은 버건디 -> 짙은 버건디
  basketball: { from: "#86efac", to: "#15803d", max: 20 }, // 옅은 초록 -> 짙은 딥그린
};

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

// 정복한(count > 0) 구역의 채우기 색. count가 max에 가까울수록 진한 색이 된다.
window.seatColorForCount = function seatColorForCount(categoryId, count) {
  if (!count || count <= 0) return null;
  const g = window.CATEGORY_GRADIENT[categoryId] || window.CATEGORY_GRADIENT.baseball;
  const t = g.max <= 1 ? 1 : Math.min(1, (count - 1) / (g.max - 1));
  const from = hexToRgb(g.from);
  const to = hexToRgb(g.to);
  return rgbToHex(from.map((c, i) => c + (to[i] - c) * t));
};

// 배경색 밝기에 맞춰 그 위에 놓일 글자색(검정/흰색)을 고른다.
window.readableTextColor = function readableTextColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1f2937" : "#ffffff";
};

// 17시 이전 시작이면 낮공, 그 이후면 밤공으로 본다.
window.isMatineeTime = function isMatineeTime(startTime) {
  if (!startTime) return null;
  const hour = parseInt(startTime.split(":")[0], 10);
  return hour < 17;
};

// 경기/공연의 부가 정보(meta: 시즌·승패·시작 시간 또는 공연 차수·시작 시간)를
// 한 줄로 요약한다. 기록 리스트·툴팁에서 공통으로 쓴다.
window.formatEntryMeta = function formatEntryMeta(category, meta) {
  if (!meta) return "";
  const parts = [];
  if (category === "musical") {
    if (meta.production) parts.push(meta.production);
    if (meta.startTime) {
      const matinee = window.isMatineeTime(meta.startTime);
      parts.push((matinee ? "낮공 " : "밤공 ") + meta.startTime);
    }
  } else {
    if (meta.season) parts.push(meta.season + " 시즌");
    if (meta.startTime) parts.push(meta.startTime);
    if (meta.result) parts.push(meta.result);
  }
  return parts.join(" · ");
};

function rangeNums(from, to) {
  const arr = [];
  for (let n = from; n <= to; n++) arr.push(n);
  return arr;
}

// numbers 배열을 startAngle~endAngle 사이에 균등하게 나눠 구역으로 만든다 (야구장 wedge용).
// tier(1xx/2xx/3xx/4xx)는 WedgeMap에서 미정복 구역을 층별로 다른 색으로 칠하는 데 쓴다.
function numberedRing(zone, numbers, startAngle, endAngle, innerRadius, outerRadius) {
  const step = (endAngle - startAngle) / numbers.length;
  return numbers.map((num, i) => ({
    id: "sec-" + num,
    zone,
    tier: Math.floor(num / 100),
    label: num + "구역",
    shortLines: [String(num)],
    startAngle: startAngle + step * i,
    endAngle: startAngle + step * (i + 1),
    innerRadius,
    outerRadius,
  }));
}

// WedgeMap에서 미정복 구역을 칠할 층별 파스텔 색. 실제 좌석표처럼 층마다 다른 색을 써서
// 한눈에 층 구분이 되고 밋밋한 회색 일색보다 화사해 보이게 한다.
window.WEDGE_TIER_COLORS = {
  0: "#ddd6fe", // 박스석/테라존 - 연보라
  1: "#fecaca", // 100번대 - 연빨강
  2: "#fed7aa", // 200번대 - 연주황
  3: "#bfdbfe", // 300번대 - 연파랑
  4: "#bbf7d0", // 400번대(외야) - 연초록
};

function gocheokSections() {
  return [
    // 내야: 홈플레이트 바로 아래부터 시작해서 아래로 갈수록 층이 높아진다 (박스석 -> 100 -> 200 -> 300 -> 400).
    // 각 층 모두 101/201/301/401이 바깥쪽(오른쪽 끝)에서 시작해 중앙 쪽으로 갈수록 번호가 커진다.
    {
      id: "box-away",
      zone: "infield",
      tier: 0,
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
      tier: 0,
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

// image/잠실야구장.svg(실제 좌석표) 위에 좌표를 겹쳐 칠하는 방식으로 만든 잠실야구장 구역.
// 이 svg 하나를 배경 이미지로 그대로 쓰고(그라운드·게이트·번호가 이미 그려져 있다), 우리는 그
// 위에 투명한 클릭 영역만 얹어서 방문 기록이 있을 때만 우리 색을 "덧입힌다".
//
// 아래 JAMSIL_SECTION_POINTS는 도형 계산으로 부채꼴을 근사하는 대신, svg를 실제로 렌더링해
// 구역별 채우기 색(레드석/오렌지석/블루석/테이블석/네이비석/그린석)마다 픽셀 단위로 connected-component를
// 뽑아내고 각 덩어리를 convex hull로 단순화해서 얻은 "진짜 좌석 블록" 좌표다(단위: svg의
// viewBox 0 0 2069.29 1675 기준). 그래서 부채꼴 근사와 달리 100~400번대 각 구역의 실제 폭·경계와
// 거의 그대로 일치한다.
const JAMSIL_SECTION_POINTS = {
  center: [[808.9,1143.9],[1006.9,1142.9],[1035.9,1244.4],[986.4,1254.9],[923.4,1260.9],[848.4,1257.9],[780.4,1245.4]],
  101: [[1326.9,755.4],[1347.4,705.4],[1424.4,733.9],[1405.4,790.4]],
  102: [[1325.4,758.4],[1404.4,792.9],[1378.4,846.4],[1301.4,805.9]],
  103: [[1299.9,808.4],[1376.9,848.9],[1346.9,901.9],[1270.4,854.9]],
  104: [[1389.9,832.9],[1410.4,788.9],[1489.3,807.9],[1474.9,863.4]],
  105: [[1268.4,857.4],[1345.4,904.4],[1311.9,952.9],[1235.9,899.4]],
  106: [[1212.4,947.9],[1233.9,901.4],[1309.9,955.9],[1275.4,998.4]],
  107: [[1149.4,1034.9],[1181.4,995.4],[1233.4,1042.4],[1192.9,1079.9]],
  108: [[1149.9,1116.4],[1110.4,1071.4],[1147.4,1037.4],[1190.9,1081.4]],
  109: [[1107.4,1073.9],[1147.9,1118.4],[1104.4,1152.9],[1069.4,1107.9]],
  110: [[1021.9,1151.4],[1067.4,1109.9],[1101.9,1154.9],[1037.9,1201.4]],
  111: [[1039.9,1206.4],[1106.4,1157.9],[1156.4,1221.9],[1111.4,1240.4],[1051.4,1241.9]],
  112: [[631.9,997.9],[664.4,1035.4],[620.4,1079.9],[581.9,1043.9]],
  113: [[654.9,1048.9],[666.4,1037.4],[702.4,1070.4],[663.4,1116.4],[622.9,1081.9]],
  114: [[665.4,1117.9],[704.4,1072.9],[744.4,1107.9],[709.9,1153.4]],
  115: [[791.9,1149.9],[775.9,1201.4],[712.4,1155.4],[746.9,1109.9]],
  116: [[712.9,1161.9],[773.9,1206.4],[762.9,1241.9],[702.9,1240.4],[663.9,1224.9]],
  117: [[470,707.9],[489.5,755.9],[409.5,792.4],[390.5,737.4]],
  118: [[490,758.9],[515.4,806.9],[436.5,848.9],[410.5,794.9]],
  119: [[438,851.4],[516.9,809.4],[545.9,855.4],[468,903.4]],
  120: [[326,812.9],[405.5,792.9],[425,835.4],[339.5,865.4]],
  121: [[548.4,858.4],[578.9,897.4],[501.4,952.4],[470,905.9]],
  122: [[503.4,954.9],[580.4,899.9],[601.4,947.9],[538.9,998.9]],
  201: [[1348.4,702.9],[1367.9,638.4],[1445.9,624.9],[1425.4,730.9]],
  202: [[1505.3,663.9],[1505.3,691.9],[1438.4,688.9],[1449.4,624.4],[1501.3,613.9]],
  203: [[1426.4,739.4],[1437.9,691.9],[1505.3,694.9],[1500.8,750.4]],
  204: [[1500.3,753.4],[1489.8,805.4],[1411.4,786.4],[1425.9,742.9]],
  205: [[1367.4,875.4],[1388.4,835.9],[1473.9,865.9],[1454.9,915.9]],
  206: [[1366.4,878.4],[1453.4,918.4],[1430.9,965.4],[1343.9,914.9]],
  207: [[1341.9,917.4],[1429.9,967.9],[1401.4,1014.4],[1316.4,954.4]],
  208: [[1359.4,1068.4],[1281.4,998.4],[1314.4,956.9],[1399.4,1016.9]],
  209: [[1210.4,951.4],[1273.4,1000.4],[1235.4,1040.4],[1183.4,993.4]],
  210: [[1243.9,1039.4],[1279.9,1000.9],[1357.9,1070.9],[1317.4,1112.9]],
  211: [[1241.9,1041.4],[1315.4,1114.9],[1269.4,1152.9],[1201.9,1078.9]],
  212: [[1156.9,1117.9],[1199.9,1080.9],[1266.9,1154.9],[1217.4,1188.4]],
  213: [[1108.9,1155.9],[1154.9,1119.9],[1214.9,1189.9],[1158.9,1220.4]],
  214: [[603.4,951.4],[631.9,994.4],[579.9,1041.9],[540.9,1000.9]],
  215: [[572.4,1041.4],[498.9,1115.4],[456,1070.9],[533.4,1000.9]],
  216: [[501.4,1116.9],[574.4,1043.9],[614.4,1080.9],[547.4,1154.9]],
  217: [[613.9,1085.4],[617.9,1083.9],[659.4,1120.4],[599.4,1190.4],[549.4,1156.4]],
  218: [[708.9,1158.9],[661.4,1223.4],[601.9,1191.9],[661.9,1121.9]],
  219: [[447.5,876.9],[360,918.4],[340.5,867.9],[426.5,837.9]],
  220: [[361.5,921.9],[449,880.9],[471.5,916.9],[384,967.9]],
  221: [[399,993.9],[385.5,970.4],[472.5,919.9],[498.9,956.4],[415,1016.4]],
  222: [[416,1018.9],[500.4,958.9],[531.9,997.9],[454,1067.9]],
  223: [[449.5,640.4],[468.5,704.9],[389.5,734.9],[368,624.9]],
  224: [[308.5,693.4],[312,614.4],[364.5,624.4],[376,690.4]],
  225: [[371,693.4],[376.5,693.4],[388,741.4],[313.5,752.4],[308.5,696.4]],
  226: [[389,744.9],[404,790.4],[325,809.9],[314,755.4]],
  301: [[1510.3,612.4],[1574.3,600.9],[1590.8,690.4],[1515.3,693.9]],
  302: [[1594.8,748.4],[1594.8,757.9],[1510.3,752.9],[1515.3,696.4],[1590.8,693.4]],
  303: [[1500.3,810.4],[1510.3,755.9],[1594.8,760.4],[1591.8,825.9]],
  304: [[1484.3,869.4],[1499.3,814.9],[1591.8,828.9],[1582.3,895.4]],
  305: [[1464.4,922.9],[1483.3,872.4],[1581.8,897.9],[1565.8,960.4]],
  306: [[1540.3,1028.4],[1437.4,978.4],[1462.9,926.4],[1564.8,963.4]],
  307: [[1436.4,980.9],[1539.3,1030.9],[1511.8,1087.9],[1408.9,1025.4]],
  308: [[1509.8,1089.9],[1470.4,1152.9],[1370.4,1075.9],[1407.9,1027.9]],
  309: [[1334.4,1121.9],[1330.9,1118.4],[1368.9,1078.4],[1468.9,1155.9],[1426.4,1208.4]],
  310: [[1374.4,1261.9],[1285.4,1158.9],[1328.9,1120.4],[1424.9,1210.9]],
  311: [[1238.4,1192.4],[1283.4,1160.9],[1371.9,1263.9],[1318.9,1307.4]],
  312: [[1183.9,1223.9],[1235.9,1194.4],[1316.4,1309.4],[1252.9,1350.4]],
  313: [[1135.4,1245.9],[1180.9,1225.4],[1250.4,1351.9],[1193.4,1380.9]],
  314: [[1070.4,1256.9],[1132.4,1246.9],[1190.9,1381.9],[1116.4,1409.9]],
  315: [[1021.9,1295.9],[1014.4,1257.9],[1034.9,1253.4],[1067.4,1256.9],[1113.9,1410.9],[1048.4,1427.9]],
  316: [[981.9,1437.9],[963.9,1264.4],[1011.9,1258.4],[1045.4,1428.4]],
  317: [[908.4,1442.4],[908.4,1267.4],[960.9,1264.9],[978.9,1438.4]],
  318: [[905.4,1267.4],[905.4,1442.4],[838.9,1438.9],[855.4,1264.9]],
  319: [[802.4,1259.9],[852.4,1264.9],[835.9,1438.4],[769.4,1428.9]],
  320: [[766.9,1427.9],[699.9,1410.4],[746.4,1256.4],[774.9,1252.9],[799.9,1259.9]],
  321: [[680.9,1247.4],[743.9,1255.9],[696.9,1410.4],[621.4,1381.4]],
  322: [[629.9,1224.9],[676.9,1246.9],[618.4,1380.4],[559.9,1350.4]],
  323: [[580.9,1197.4],[626.9,1223.9],[557.4,1348.9],[499.9,1311.9]],
  324: [[531.4,1162.9],[576.9,1195.9],[497.4,1309.9],[441.5,1263.9]],
  325: [[526.9,1159.4],[439,1262.4],[389.5,1212.4],[484.5,1122.4]],
  326: [[444.5,1079.9],[482.5,1120.4],[387.5,1209.9],[345,1156.4]],
  327: [[441.5,1076.4],[343,1154.4],[305.5,1095.9],[407.5,1031.9]],
  328: [[275,1035.4],[377,984.9],[405.5,1029.4],[304,1092.9]],
  329: [[351.5,932.4],[376,982.4],[274,1032.9],[250,970.4]],
  330: [[329.5,875.4],[350,929.9],[249,967.4],[232,900.9]],
  331: [[313.5,818.4],[328,872.9],[231,897.9],[222,832.9]],
  332: [[294.5,758.9],[303,760.4],[312.5,815.4],[221,830.4],[218,763.9]],
  333: [[218,760.9],[221.5,697.4],[297.5,700.4],[302,755.9]],
  334: [[300.5,611.9],[297.5,697.4],[221.5,694.4],[238,601.4]],
  401: [[1505.3,525.4],[1515.3,524.4],[1526.8,571.9],[1395.9,593.9],[1386.9,555.9]],
  402: [[1367.9,500.4],[1488.8,454],[1513.8,520.4],[1385.9,553.4]],
  403: [[1365.4,495.9],[1342.4,449],[1454.4,390],[1487.3,451]],
  404: [[1311.9,401],[1411.4,332],[1452.4,387],[1341.4,446.5]],
  405: [[1360.9,284],[1402.4,328],[1311.4,391],[1281.9,354.5]],
  406: [[1271.9,344],[1238.4,312],[1305.4,235.5],[1350.4,274.5]],
  407: [[1225.9,301.5],[1192.9,276.5],[1248.4,196.5],[1293.9,227.5]],
  408: [[1140.4,244],[1182.9,161.5],[1235.9,189],[1181.4,268.5]],
  409: [[1111.9,127.5],[1177.9,153],[1130.4,245.5],[1077.4,223]],
  410: [[1017.4,203.5],[1039.4,107.5],[1109.4,126],[1074.4,221.5]],
  411: [[1014.4,204.5],[961.4,195.5],[969.9,114.5],[996.4,99.5],[1036.4,106.5]],
  412: [[857.4,191.5],[857.4,195],[807.9,202.5],[786.9,104.5],[822.9,99],[849.4,115]],
  413: [[805.4,203],[746.4,219],[712.4,123],[783.9,105]],
  414: [[743.9,219.5],[688.9,242.5],[641.4,150],[709.4,124]],
  415: [[638.4,151],[685.9,244],[635.9,272.5],[575.9,183.5]],
  416: [[572.4,185.5],[633.4,274],[587.9,307.5],[514.4,224.5]],
  417: [[582.9,312],[545.4,347],[460.5,270],[512.4,226.5],[584.9,309]],
  418: [[539.4,345],[543.4,349.5],[506.9,392.5],[410,324],[458.5,272]],
  419: [[381.5,361],[408.5,326.5],[504.9,395.5],[474,441.5],[367,384]],
  420: [[448.5,492.9],[332,447],[365,386],[473,444]],
  421: [[447,495.4],[427,551.9],[304.5,520.4],[331,449.5]],
  422: [[426.5,554.9],[417,593.4],[293,568.4],[303.5,523.4]],
};

function jamsilRealSections() {
  const sections = Object.keys(JAMSIL_SECTION_POINTS)
    .filter((key) => key !== "center")
    .map((key) => {
      const num = Number(key);
      return {
        id: "sec-" + num,
        tier: Math.floor(num / 100),
        label: num + "구역",
        shortLines: [String(num)],
        points: JAMSIL_SECTION_POINTS[key],
      };
    });
  sections.unshift({
    id: "center-seat",
    tier: 0,
    label: "중앙석 (프리미엄석)",
    shortLines: ["중앙석"],
    points: JAMSIL_SECTION_POINTS.center,
  });
  return sections;
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
    id: "jamsil-old",
    name: "(구)잠실야구장",
    category: "baseball",
    map: {
      kind: "wedge",
      viewBox: "0 0 2069.29 1675",
      backgroundImage: "image/잠실야구장.svg",
      center: { cx: 875, cy: 980 },
      sections: jamsilRealSections(),
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
