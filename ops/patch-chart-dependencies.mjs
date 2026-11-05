import { readFileSync, writeFileSync } from "node:fs";

const taibu = new URL("../node_modules/taibu-core/dist/domains/daliuren/calculate.js", import.meta.url);
const taibuText = new URL("../node_modules/taibu-core/dist/domains/daliuren/text.js", import.meta.url);
const textSource = readFileSync(taibuText, "utf8");
const originalHeader = "地盘 (五行·状态) | 天盘 (月将)";
const correctedHeader = "地盘 | 天盘 (五行·旺衰)";
if (!textSource.includes(correctedHeader)) {
  const originalCells = "formatDaliurenDiPanLabel(item),\n                item.tianZhi || '-',";
  const originalLabel = "item.diZhi}(${suffix})` : item.diZhi";
  if (!textSource.includes(originalHeader) || !textSource.includes(originalCells) || !textSource.includes(originalLabel)) {
    throw new Error("Review taibu-core Daliuren display patch");
  }
  writeFileSync(taibuText, textSource.replaceAll(originalHeader, correctedHeader)
    .replace(originalCells, "item.diZhi || '-',\n                formatDaliurenTianPanLabel(item),")
    .replace("function formatDaliurenDiPanLabel", "function formatDaliurenTianPanLabel")
    .replace(originalLabel, "item.tianZhi}(${suffix})` : item.tianZhi"));
}
const original = "liurenLib.getLiuRenByDate(dateObj)";
const patched = "liurenLib.getLiuRenByDate(dateObj, input.monthGeneral)";
const engine = readFileSync(taibu, "utf8");
if (!engine.includes(patched)) {
  if (!engine.includes(original)) throw new Error("Review taibu-core month general patch");
  writeFileSync(taibu, engine.replace(original, patched));
}
for (const format of ["esm", "cjs"]) {
  const file = new URL("../node_modules/liuren-ts-lib/dist/" + format + "/index.js", import.meta.url);
  const source = readFileSync(file, "utf8");
  if (source.includes("getLiuRenByDate = (time, monthGeneral)") && source.includes("if (monthGeneral !== undefined)")) continue;
  const patched = source.replace("getLiuRenByDate = (time) => {", "getLiuRenByDate = (time, monthGeneral) => {")
    .replace("const date = getDateByObj(time);", "const date = getDateByObj(time);\n  if (monthGeneral !== undefined) date.yuejiang = monthGeneral;");
  if (!patched.includes("getLiuRenByDate = (time, monthGeneral)") || !patched.includes("if (monthGeneral !== undefined)")) throw new Error("Review liuren-ts-lib month general injection");
  writeFileSync(file, patched);
}

const qimenYearPatches = [
  ["lib/qimen/QimenChart.js", "(getYearByLiChun ? getYearByLiChun() : lunar.getYearInGanZhiExact())", "lunar.getYearInGanZhiExact()"],
  ["dist/3meta.esm.js", '="exact"===F?C?C():u.getYearInGanZhiExact()', '="exact"===F?u.getYearInGanZhiExact()'],
];
for (const [path, before, after] of qimenYearPatches) {
  const file = new URL("../node_modules/3meta/" + path, import.meta.url);
  const source = readFileSync(file, "utf8");
  if (!source.includes(before)) {
    if (!source.includes(after) && !source.includes("exactYearGZ")) throw new Error("Review 3meta exact year patch");
    continue;
  }
  writeFileSync(file, source.replace(before, after));
}

const qimenCalendarPatches = [
  ["lib/qimen/QimenChart.js", "lunar.getYearInGanZhiExact()", "(opts?.exactYearGZ ?? lunar.getYearInGanZhiExact())", "lunar.getMonthInGanZhiExact()", "(opts?.exactMonthGZ ?? lunar.getMonthInGanZhiExact())"],
  ["dist/3meta.esm.js", '?u.getYearInGanZhiExact():u.getYearInGanZhi()', '?(n?.exactYearGZ??u.getYearInGanZhiExact()):u.getYearInGanZhi()', 'd=u.getMonthInGanZhiExact()', 'd=(n?.exactMonthGZ??u.getMonthInGanZhiExact())'],
];

const qimenJuPatches = [
  ["lib/qimen/QimenChart.js", "(0, calculator_1.getJuShu)(solarTerm, yuan, isYangdun);", "((0, calculator_1.getJuShu)(solarTerm, yuan, isYangdun) || (0, calculator_1.getJuShu)(solarTerm, yuan, !isYangdun));"],
  ["dist/3meta.esm.js", "||me(B,x,m),p=", "||me(B,x,m)||me(B,x,!m),p="],
];
for (const [path, before, after] of qimenJuPatches) {
  const file = new URL("../node_modules/3meta/" + path, import.meta.url);
  const source = readFileSync(file, "utf8");
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2) throw new Error("Review 3meta forced dun patch");
  writeFileSync(file, source.replace(before, after));
}
for (const [path, yearBefore, yearAfter, monthBefore, monthAfter] of qimenCalendarPatches) {
  const file = new URL("../node_modules/3meta/" + path, import.meta.url);
  const source = readFileSync(file, "utf8");
  if (source.includes(yearAfter) && source.includes(monthAfter)) continue;
  if (!source.includes(yearBefore) || !source.includes(monthBefore)) throw new Error("Review 3meta calendar patch");
  writeFileSync(file, source.replace(yearBefore, yearAfter).replace(monthBefore, monthAfter));
}

for (const format of ["js", "cjs"]) {
  const file = new URL("../node_modules/celestine/dist/index." + format, import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = "const pluto = plutoHeliocentric(jd);";
  const after = `// Meeus chapter 21: rotate Pluto's J2000 ecliptic into Earth's ecliptic of date.
  const pluto = plutoHeliocentric(jd);
  const t = (jd - J2000_EPOCH) / DAYS_PER_JULIAN_CENTURY;
  const eta = (47.0029 * t - 0.03302 * t ** 2 + 0.00006 * t ** 3) / 3600 * DEG_TO_RAD;
  const pi = (174.876384 + (-869.8089 * t + 0.03536 * t ** 2) / 3600) * DEG_TO_RAD;
  const p = (5029.0966 * t + 1.11113 * t ** 2 - 0.000006 * t ** 3) / 3600 * DEG_TO_RAD;
  const a = Math.cos(eta) * Math.cos(pluto.B) * Math.sin(pi - pluto.L) - Math.sin(eta) * Math.sin(pluto.B);
  const b = Math.cos(pluto.B) * Math.cos(pi - pluto.L);
  const c = Math.cos(eta) * Math.sin(pluto.B) + Math.sin(eta) * Math.cos(pluto.B) * Math.sin(pi - pluto.L);
  pluto.L = p + pi - Math.atan2(a, b);
  pluto.B = Math.asin(c);`;
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2) throw new Error("Review celestine Pluto frame patch");
  writeFileSync(file, source.replace(before, after));
}

for (const format of ["js", "cjs"]) {
  const file = new URL("../node_modules/celestine/dist/index." + format, import.meta.url);
  const source = readFileSync(file, "utf8");
  const references = ["timeData", "calculatedData"];
  const calendarBefore = "  const julianDate2 = toJulianDate(utcDateTime);";
  const calendarAfter = `  // The product's datetime-local input uses a proleptic Gregorian calendar.
  const utc = new Date(0);
  utc.setUTCFullYear(utcDateTime.year, utcDateTime.month - 1, utcDateTime.day);
  utc.setUTCHours(utcDateTime.hour, utcDateTime.minute, utcDateTime.second, 0);
  const julianDate2 = utc.getTime() / 86400000 + 2440587.5;`;
  if (!source.includes(calendarAfter) && source.split(calendarBefore).length !== 2) {
    throw new Error("Review celestine civil calendar patch");
  }
  let patched = source.includes(calendarAfter) ? source : source.replace(calendarBefore, calendarAfter);
  for (const reference of references) {
    const before = `calculatePlanetPositions(${reference}.julianDate, mergedOptions)`;
    const after = `calculatePlanetPositions(utToTT(${reference}.julianDate, ${reference}.utcDateTime.year, ${reference}.utcDateTime.month), mergedOptions)`;
    if (patched.includes(after)) continue;
    if (patched.split(before).length !== 2) throw new Error("Review celestine planetary time scale patch");
    patched = patched.replace(before, after);
  }
  if (patched !== source) writeFileSync(file, patched);
}

for (const format of ["js", "cjs"]) {
  const file = new URL("../node_modules/celestine/dist/index." + format, import.meta.url);
  const source = readFileSync(file, "utf8");
  const start = source.indexOf("function getTrueNodeLongitude(jd) {");
  const end = source.indexOf("function getTrueNode(jd) {", start);
  const replacement = `function getTrueNodeLongitude(jd) {
  // Ascending intersection of the instantaneous lunar orbital plane and ecliptic.
  const position = (epoch) => {
    const moon = getMoonPosition(epoch, { includeSpeed: false });
    const lon = moon.longitude * DEG_TO_RAD;
    const lat = moon.latitude * DEG_TO_RAD;
    const projected = moon.distance * Math.cos(lat);
    return [projected * Math.cos(lon), projected * Math.sin(lon), moon.distance * Math.sin(lat)];
  };
  const [x, y, z] = position(jd);
  const before = position(jd - 0.001);
  const after = position(jd + 0.001);
  const [dx, dy, dz] = after.map((value, i) => value - before[i]);
  const nodeX = x * dz - z * dx;
  const nodeY = y * dz - z * dy;
  return (Math.atan2(nodeY, nodeX) * RAD_TO_DEG + 360) % 360;
}
`;
  if (source.includes(replacement)) continue;
  if (start < 0 || end <= start || !source.slice(start, end).includes("const perturbations =")) {
    throw new Error("Review celestine true node patch");
  }
  writeFileSync(file, source.slice(0, start) + replacement + source.slice(end));
}

for (const format of ["mjs", "cjs"]) {
  const file = new URL("../node_modules/lunar-typescript/dist/index." + format, import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = "  getMonthGanIndexExact() {";
  const after = `  setSolarTermReference(reference) {
    this._solarTermReference = reference;
    this._yearGanIndexExact = reference.getYearGanIndexExact();
    this._yearZhiIndexExact = reference.getYearZhiIndexExact();
    this._monthGanIndexExact = reference.getMonthGanIndexExact();
    this._monthZhiIndexExact = reference.getMonthZhiIndexExact();
  }
${before}`;
  const yunBefore = "    const prev = lunar.getPrevJie();\n    const next = lunar.getNextJie();\n    const current = lunar.getSolar();";
  const yunAfter = "    const termReference = lunar._solarTermReference ?? lunar;\n    const prev = termReference.getPrevJie();\n    const next = termReference.getNextJie();\n    const current = termReference.getSolar();";
  if (source.includes(after) && source.includes(yunAfter)) continue;
  if (source.split(before).length !== 2 || !source.includes(yunBefore)) throw new Error("Review lunar-typescript solar term reference patch");
  writeFileSync(file, source.replace(before, after).replace(yunBefore, yunAfter));
}

for (const format of ["mjs", "cjs"]) {
  const file = new URL("../node_modules/lunar-typescript/dist/index." + format, import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = "const yang = 0 === lunar.getYearGanIndexExact() % 2;";
  const after = "const yang = 0 === (lunar._yunYearGanIndex ?? lunar.getYearGanIndexExact()) % 2;";
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2) throw new Error("Review lunar-typescript Yun year stem patch");
  writeFileSync(file, source.replace(before, after));
}

// 天禽寄宫 can leave two heavenly stems on one palace.
for (const [path, before, after] of [
  ["lib/qimen/calculator.js", "tianGan === cond.tianGan && position === cond.gong", "(Array.isArray(tianGan) ? tianGan.includes(cond.tianGan) : tianGan === cond.tianGan) && position === cond.gong"],
  ["dist/3meta.esm.js", "n===t.tianGan&&e===t.gong", "(Array.isArray(n)?n.includes(t.tianGan):n===t.tianGan)&&e===t.gong"],
]) {
  const file = new URL("../node_modules/3meta/" + path, import.meta.url);
  const source = readFileSync(file, "utf8");
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2) throw new Error("Review 3meta hosted-stem punishment patch");
  writeFileSync(file, source.replace(before, after));
}

// Match the raw engine's day/night branches for the visible metadata.
{
  const source = readFileSync(taibu, "utf8");
  const before = "const diurnal = hour >= 5 && hour < 19;";
  const after = 'const diurnal = ["卯", "辰", "巳", "午", "未", "申"].includes(baziParts[3]?.[1]);';
  if (!source.includes(after)) {
    if (source.split(before).length !== 2) throw new Error("Review taibu-core day/night label patch");
    writeFileSync(taibu, source.replace(before, after));
  }
}
// Keep Porphyry quadrants in zodiac order where the horizon axis reverses.
for (const format of ["js", "cjs"]) {
  const file = new URL("../node_modules/celestine/dist/index." + format, import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = `    case "porphyry":
      cusps = porphyryHouses(angles.ascendant, angles.midheaven);`;
  const after = `    case "porphyry":
      if (normalizeAngle8(angles.ascendant - angles.midheaven) > 180) {
        [angles.ascendant, angles.descendant] = [angles.descendant, angles.ascendant];
      }
      cusps = porphyryHouses(angles.ascendant, angles.midheaven);`;
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2) throw new Error("Review celestine polar Porphyry patch");
  writeFileSync(file, source.replace(before, after));
}
// Keep sect tied to the horizon intersection before the Porphyry axis adjustment.
for (const format of ["js", "cjs"]) {
  const file = new URL("../node_modules/celestine/dist/index." + format, import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = "  const isDaytime = sunPos ? calculateIsDaytime(sunPos.longitude, houseResult.angles.ascendant.longitude) : timeData.isDaytime;";
  const after = `  const horizonAscendant = calculateAscendant(timeData.localSiderealTime, meanObliquity(timeData.julianCenturies), birth.latitude);
  const isDaytime = sunPos ? calculateIsDaytime(sunPos.longitude, horizonAscendant) : timeData.isDaytime;`;
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2) throw new Error("Review celestine polar sect patch");
  writeFileSync(file, source.replace(before, after));
}
// Use the same polar axis convention for the Whole Sign fallback.
for (const format of ["js", "cjs"]) {
  const file = new URL("../node_modules/celestine/dist/index." + format, import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = `    case "whole-sign":
      cusps = wholeSignHouses(angles.ascendant);`;
  const after = `    case "whole-sign":
      if (normalizeAngle8(angles.ascendant - angles.midheaven) > 180) {
        [angles.ascendant, angles.descendant] = [angles.descendant, angles.ascendant];
      }
      cusps = wholeSignHouses(angles.ascendant);`;
  if (source.includes(after)) continue;
  if (source.split(before).length !== 2) throw new Error("Review celestine polar Whole Sign patch");
  writeFileSync(file, source.replace(before, after));
}

// The late Zi hour starts at the next day's shichen slot. Keep midnight
// subtraction consistent with the library's twelve-slot coarse luck method.
for (const format of ["mjs", "cjs"]) {
  const file = new URL("../node_modules/lunar-typescript/dist/index." + format, import.meta.url);
  let source = readFileSync(file, "utf8");
  for (const variable of ["end", "start"]) {
    const before = variable + ".getHour() == 23 ? 11 :";
    const after = variable + ".getHour() == 23 ? 12 :";
    if (source.includes(after)) continue;
    if (source.split(before).length !== 2) throw new Error("Review lunar-typescript late Zi luck offset patch");
    source = source.replace(before, after);
  }
  writeFileSync(file, source);
}


// Reuse the canonical Bazi context for life-trend dayun. Preserve upstream's
// relation/shensha calculations, but do not recalculate natal pillars with its defaults.
{
  const file = new URL("../node_modules/taibu-core/dist/domains/bazi-dayun/calculate.js", import.meta.url);
  let source = readFileSync(file, "utf8");
  const marker = "export function calculateDayunData(input, context = {})";
  if (!source.includes(marker)) {
    const patches = [
      ["export function calculateDayunData(input) {", marker + " {"],
      ["if (calendarType === 'lunar') {", "if (context.lunar) { lunar = context.lunar; }\n    else if (calendarType === 'lunar') {"],
      ["const eightChar = lunar.getEightChar();", "const eightChar = context.eightChar ?? lunar.getEightChar();"],
      ["const yearStem = eightChar.getYearGan();", "const yearStem = context.yearStem ?? eightChar.getYearGan();"],
      ["const yearBranch = eightChar.getYearZhi();", "const yearBranch = context.yearBranch ?? eightChar.getYearZhi();"],
      ["const yun = eightChar.getYun(genderNum);", "const yun = context.yun ?? eightChar.getYun(genderNum);"],
      ["const startAgeDetail = formatStartAgeDetail(", "const startAgeDetail = context.startAgeDetail ?? formatStartAgeDetail("],
    ];
    for (const [before, after] of patches) {
      if (source.split(before).length !== 2) throw new Error("Review taibu-core canonical dayun context patch: " + before);
      source = source.replace(before, after);
    }
    writeFileSync(file, source);
  }
}


// A repeated branch only forms self-punishment in 辰午酉亥, not merely
// because both references belong to the same multi-branch punishment group.
{
  const file = new URL("../node_modules/taibu-core/dist/domains/bazi-dayun/calculate.js", import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = "if (xing.combination.includes(liunianBranch) && xing.combination.includes(yearBranch)) {";
  const after = "if (xing.combination.includes(liunianBranch) && xing.combination.includes(yearBranch) && (xing.combination.length === 1 || liunianBranch !== yearBranch)) {";
  if (!source.includes(after)) {
    if (source.split(before).length !== 2) throw new Error("Review taibu-core Tai Sui self-punishment patch");
    writeFileSync(file, source.replace(before, after));
  }
}

// Luck periods match the target branch against the natal context. They must
// not inherit global natal-day patterns from the position-free (e.g. Liuyao) API.
{
  const file = new URL("../node_modules/taibu-core/dist/domains/shared/shensha.js", import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = "if (!positionHint) {";
  const after = "if (!positionHint && options?.includeNatalDayPatterns !== false) {";
  if (!source.includes(after)) {
    if (source.split(before).length !== 2) throw new Error("Review taibu-core natal-day shensha scope patch");
    writeFileSync(file, source.replace(before, after));
  }
  const dayun = new URL("../node_modules/taibu-core/dist/domains/bazi-dayun/calculate.js", import.meta.url);
  let dayunSource = readFileSync(dayun, "utf8");
  for (const branch of ["lnBranch", "branch"]) {
    const beforeCall = `calculateBranchShenSha(shenShaContext, ${branch})`;
    const previousCall = `calculateBranchShenSha(shenShaContext, ${branch}, { includeNatalDayPatterns: false })`;
    const previousYangCall = `calculateBranchShenSha(shenShaContext, ${branch}, { includeNatalDayPatterns: false, yangRenYangOnly: true })`;
    const previousLearningCall = `calculateBranchShenSha(shenShaContext, ${branch}, { includeNatalDayPatterns: false, yangRenYangOnly: true, learningStarsByNaYin: true })`;
    const afterCall = `calculateBranchShenSha(shenShaContext, ${branch}, { includeNatalDayPatterns: false, yangRenYangOnly: true, learningStarsByNaYin: true, fuXingByYear: true })`;
    if (dayunSource.includes(afterCall)) continue;
    if (dayunSource.split(previousLearningCall).length === 2) {
      dayunSource = dayunSource.replace(previousLearningCall, afterCall);
      continue;
    }
    if (dayunSource.split(previousYangCall).length === 2) {
      dayunSource = dayunSource.replace(previousYangCall, afterCall);
      continue;
    }
    if (dayunSource.split(previousCall).length === 2) {
      dayunSource = dayunSource.replace(previousCall, afterCall);
      continue;
    }
    if (dayunSource.split(beforeCall).length !== 2) throw new Error("Review taibu-core luck shensha call patch: " + branch);
    dayunSource = dayunSource.replace(beforeCall, afterCall);
  }
  writeFileSync(dayun, dayunSource);
}

// The selected Bazi luck convention uses natal-year Na Yin for 学堂/词馆.
// A day-stem Lu branch is not the Na Yin element's 临官 branch.
{
  const shared = new URL("../node_modules/taibu-core/dist/domains/shared/shensha.js", import.meta.url);
  const source = readFileSync(shared, "utf8");
  const before = "    matchMapValue(CI_GUAN, dayStem, targetBranch, '词馆', names);";
  const after = `    if (options?.learningStarsByNaYin) {
        const naYinCiGuan = { '金': '申', '木': '寅', '水': '亥', '土': '亥', '火': '巳' };
        matchMapValue(naYinCiGuan, context.yearNaYinElement, targetBranch, '词馆', names);
    } else {
    matchMapValue(CI_GUAN, dayStem, targetBranch, '词馆', names);
    }`;
  if (!source.includes(after)) {
    if (source.split(before).length !== 2) throw new Error("Review taibu-core Na Yin Ci Guan patch");
    writeFileSync(shared, source.replace(before, after));
  }
  const dayun = new URL("../node_modules/taibu-core/dist/domains/bazi-dayun/calculate.js", import.meta.url);
  const dayunSource = readFileSync(dayun, "utf8");
  const beforeContext = "const shenShaContext = {";
  const afterContext = "const shenShaContext = {\n        yearNaYinElement: getNaYin(yearStem, yearBranch).slice(-1),";
  if (!dayunSource.includes(afterContext)) {
    if (dayunSource.split(beforeContext).length !== 2) throw new Error("Review taibu-core natal-year Na Yin context patch");
    writeFileSync(dayun, dayunSource.replace(beforeContext, afterContext));
  }
}

// Bazi luck periods use the same five-Yang-stem convention as the natal chart.
// Leave the upstream ten-stem table available to other domain callers.
{
  const file = new URL("../node_modules/taibu-core/dist/domains/shared/shensha.js", import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = "    matchMapValue(YANG_REN, dayStem, targetBranch, '羊刃', names);";
  const after = `    if (!options?.yangRenYangOnly || ['甲', '丙', '戊', '庚', '壬'].includes(dayStem)) {
    matchMapValue(YANG_REN, dayStem, targetBranch, '羊刃', names);
    }`;
  if (!source.includes(after)) {
    if (source.split(before).length !== 2) throw new Error("Review taibu-core luck Yang blade convention patch");
    writeFileSync(file, source.replace(before, after));
  }
}

// 福星 uses the explicitly selected annual-stem reading of the 神峰 verse.
// Preserve the other domains' day-stem table instead of conflating the variants.
{
  const file = new URL("../node_modules/taibu-core/dist/domains/shared/shensha.js", import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = "    matchMapValue(FU_XING, dayStem, targetBranch, '福星贵人', names);";
  const after = `    if (options?.fuXingByYear) {
        const yearFuXing = {
            '甲': ['寅', '子'], '乙': ['丑'], '丙': ['寅', '子'], '丁': ['亥'],
            '戊': ['申'], '己': ['未'], '庚': ['午'], '辛': ['巳'], '壬': ['辰'], '癸': ['丑'],
        };
        matchValue(yearFuXing[yearStem], targetBranch, '福星贵人（年）', names);
    } else {
    matchMapValue(FU_XING, dayStem, targetBranch, '福星贵人', names);
    }`;
  if (!source.includes(after)) {
    if (source.split(before).length !== 2) throw new Error("Review taibu-core annual Fu Xing convention patch");
    writeFileSync(file, source.replace(before, after));
  }
}

// 三命通会: 阳男阴女前勾后绞，阴男阳女前绞后勾，均距生年支三辰。
{
  const file = new URL("../node_modules/taibu-core/dist/domains/shared/shensha.js", import.meta.url);
  const source = readFileSync(file, "utf8");
  const before = `    matchMapValue(GOU_SHA, yearBranch, targetBranch, '勾煞', names);
    matchMapValue(JIAO_SHA, yearBranch, targetBranch, '绞煞', names);`;
  const after = `    if (context.gender === 'male' || context.gender === 'female') {
        const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
        const birthIndex = branches.indexOf(yearBranch);
        const yangYear = ['甲', '丙', '戊', '庚', '壬'].includes(yearStem);
        const gouForward = (context.gender === 'male') === yangYear;
        if (birthIndex >= 0) {
            if (targetBranch === branches[(birthIndex + (gouForward ? 3 : 9)) % 12]) addUnique(names, '勾煞');
            if (targetBranch === branches[(birthIndex + (gouForward ? 9 : 3)) % 12]) addUnique(names, '绞煞');
        }
    } else {
    matchMapValue(GOU_SHA, yearBranch, targetBranch, '勾煞', names);
    matchMapValue(JIAO_SHA, yearBranch, targetBranch, '绞煞', names);
    }`;
  if (!source.includes(after)) {
    if (source.split(before).length !== 2) throw new Error("Review taibu-core gendered Gou Jiao patch");
    writeFileSync(file, source.replace(before, after));
  }
  const dayun = new URL("../node_modules/taibu-core/dist/domains/bazi-dayun/calculate.js", import.meta.url);
  const dayunSource = readFileSync(dayun, "utf8");
  const beforeContext = "yearNaYinElement: getNaYin(yearStem, yearBranch).slice(-1),";
  const afterContext = beforeContext + "\n        gender,";
  if (!dayunSource.includes(afterContext)) {
    if (dayunSource.split(beforeContext).length !== 2) throw new Error("Review taibu-core luck gender context patch");
    writeFileSync(dayun, dayunSource.replace(beforeContext, afterContext));
  }
}
