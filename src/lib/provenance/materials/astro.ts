/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——astro。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "astro-celestine": [
    {
      title: "宫制列表（celestine `dist/index.js` 原码行）",
      lines: [
        ":7251-7252  function getSupportedHouseSystems() {",
        ":7252    return [\"equal\", \"whole-sign\", \"porphyry\", \"placidus\", \"koch\", \"regiomontanus\", \"campanus\"];",
        ":7158-7167  function getAvailableHouseSystems(latitude) { const systems = [\"placidus\", \"koch\", \"equal\", \"whole-sign\", \"porphyry\", \"regiomontanus\", \"campanus\"]; return systems.filter((system) => isHouseSystemAvailable(system, latitude)); }",
        ":7254-7265  getHouseSystemName：equal=\"Equal\" / whole-sign=\"Whole Sign\" / porphyry=\"Porphyry\" / placidus=\"Placidus\" / koch=\"Koch\" / regiomontanus=\"Regiomontanus\" / campanus=\"Campanus\"",
        ":7141-7156  function isHouseSystemAvailable(system, latitude)：placidus、koch 需 |latitude| < MAX_LATITUDE_PLACIDUS；equal、whole-sign、porphyry、regiomontanus、campanus 需 |latitude| < MAX_ABSOLUTE_LATITUDE",
        ":7174  function getFallbackHouseSystem：回退序 [\"porphyry\", \"equal\", \"whole-sign\"]，最终兜底 \"equal\"",
        ":7280-7284  var MAX_LATITUDE_PLACIDUS2 = 66; var MAX_LATITUDE_ANY = 89.9; var DEFAULT_HOUSE_SYSTEM = \"placidus\"; var FALLBACK_HOUSE_SYSTEM = \"porphyry\"; var POLAR_FALLBACK_HOUSE_SYSTEM = \"whole-sign\";",
        ":7357  var LATITUDE_SENSITIVE_SYSTEMS = [\"placidus\", \"koch\"];",
        ":7184  function calculateHouses(location, lst, julianCenturies, system = \"placidus\")（各宫制分别调用 equalHouses / wholeSignHouses / porphyryHouses / placidusHouses / kochHouses / regiomontanusHouses / campanusHouses）",
      ],
      note: "行号为本仓安装的 `celestine@0.2.1` dist/index.js 实际行号（对应源文件 src/houses/*.ts、src/chart/constants.ts）。本仓默认取 Placidus；高纬绕回退见上表 66° 阈值与 fallback 序。",
    },
    {
      title: "相位容许度（orb）表（celestine `dist/index.js:82-100`，`DEFAULT_ORBS` 原值）",
      lines: [
        "// Major aspects - wider orbs",
        "conjunction（合）: 8",
        "opposition（冲）: 8",
        "trine（三分）: 8",
        "square（刑）: 7",
        "sextile（六分）: 6",
        "// Minor aspects - tighter orbs",
        "semi-sextile（半六分）: 2",
        "semi-square（半刑）: 2",
        "quintile（五分）: 2",
        "sesquiquadrate（倍半刑）: 2",
        "biquintile（倍五分）: 2",
        "quincunx（十二分之五／补十二）: 3",
        "// Kepler aspects - very tight orbs (1-2°)",
        "septile（七分）: 1",
        "novile（九分）: 1",
        "decile（十分）: 1",
        ":101-107  MAJOR_ASPECTS = [\"conjunction\", \"sextile\", \"square\", \"trine\", \"opposition\"]",
      ],
      note: "行号为本仓安装的 `celestine@0.2.1`。`:359-364` getOrb：若 `config.orbs[aspectType]` 有值则覆盖，否则回退 `DEFAULT_ORBS[aspectType]`；`:366-376` calculateStrength 以 `100*(1 − deviation/orb)` 折 0-100%。",
    },
  ],
  "astro-lots": [
    {
      title: "celestine dist/index.js · 福点与精神点原码",
      lines: [
        ":7529  function calculatePartOfFortune(sunLon, moonLon, ascendant, isDayChart) {",
        ":7530-7535  let pof; if (isDayChart) { pof = ascendant + moonLon - sunLon; } else { pof = ascendant + sunLon - moonLon; }",
        ":7540  function getPartOfFortune(jd, ascendant, options = {}) {",
        ":7571-7572  function calculatePartOfSpirit(sunLon, moonLon, ascendant, isDayChart) { return calculatePartOfFortune(sunLon, moonLon, ascendant, !isDayChart); }",
        ":8682  const formula = isDaytime ? \"ASC + Moon - Sun\" : \"ASC + Sun - Moon\";",
        ":8693  const formula = isDaytime ? \"ASC + Sun - Moon\" : \"ASC + Moon - Sun\";",
      ],
      note: "行号为本仓安装的 `celestine@0.2.1` dist/index.js 实际行号（对应源文件 src/ephemeris/lots.ts）。",
    },
  ],
};
