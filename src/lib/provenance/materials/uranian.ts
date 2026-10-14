/**
 * 「出处与原文」材料本体（逐字原文 / 整张数值表 / 源码行）——uranian。
 *
 * 由 `src/lib/provenance/registry.ts` 拆出：首屏不再打包这些长材料，
 * 只有读者真正需要时（面板内展开「出处与原文」、或打开「资料库」抽屉）才通过
 * `materials/manifest.ts` 的 `import()` 按体系载入。
 *
 * 键为条目 id，与 registry 中同名条目一一对应；逐字抄录与核对纪律见 registry 文件头。
 */
import type { ProvenanceMaterialSet } from "../types";

export const MATERIALS: ProvenanceMaterialSet = {
  "uranian-astrolog-elements": [
    {
      title: "轨道要素字段序（`astrolog.h:2240-2246`，原码逐字）",
      lines: [
        ":2240  real ma0, ma1, ma2;  // Mean anomaly.",
        ":2241  real ec0, ec1, ec2;  // Eccentricity.",
        ":2242  real sma;            // Semi-major axis.",
        ":2243  real ap0, ap1, ap2;  // Argument of perihelion.",
        ":2244  real an0, an1, an2;  // Ascending node.",
        ":2245  real in0, in1, in2;  // Inclination.",
        ":2246  } OE;",
        "matrix.cpp:507  real ReadThree(real r0, real r1, real r2)  // = r0 + r1*T + r2*T*T（RFromD 后）",
      ],
      note: "故每组三数依次为「常数项 / 世纪一次项 / 世纪二次项」，T 为儒略世纪数。历元：`calc.cpp:1270  is.T = (is.T - 2415020.5) / 36525.0;`（自 1900-01-00.5 起算，即 J1900.0）。",
    },
    {
      title: "`OE rgoe[oVes+cUran-2]` 全表（`matrix.cpp:98-138`，逐值照录）",
      lines: [
        "Earth/Sun（:99-100）：ma {358.4758, 35999.0498, −.0002}；ec {.01675, −.4E-4, 0}；sma 1；ap {101.2208, 1.7192, .00045}；an {0, 0, 0}；in {0, 0, 0}",
        "Cupido（:130）：ma {104.5959, 138.5369, 0}；ec {0, 0, 0}；sma 40.99837；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
        "Hades（:131）：ma {337.4517, 101.2176, 0}；ec {0, 0, 0}；sma 50.667443；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
        "Zeus（:132）：ma {104.0904, 80.4057, 0}；ec {0, 0, 0}；sma 59.214362；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
        "Kronos（:133）：ma {17.7346, 70.3863, 0}；ec {0, 0, 0}；sma 64.816896；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
        "Apollon（:134）：ma {138.0354, 62.5, 0}；ec {0, 0, 0}；sma 70.361652；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
        "Admetos（:135）：ma {−8.678, 58.3468, 0}；ec {0, 0, 0}；sma 73.736476；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
        "Vulkanus（:136）：ma {55.9826, 54.2986, 0}；ec {0, 0, 0}；sma 77.445895；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
        "Poseidon（:137）：ma {165.3595, 48.6486, 0}；ec {0, 0, 0}；sma 83.493733；ap {0, 0, 0}；an {0, 0, 0}；in {0, 0, 0}",
        "（同表并含 Mercury/ Venus/ Mars/ Jupiter/ Saturn/ Uranus/ Neptune/ Pluto/ Chiron/ Ceres/ Pallas/ Juno/ Vesta，本仓只取上列 1 真实体 + 8 虚星；表体位于 matrix.cpp:98-138。）",
      ],
      note: "八虚星均为 sma 等差式递增（40.99837→50.667443→59.214362→64.816896→70.361652→73.736476→77.445895→83.493733 AU），离心率、近日点、升交点、倾角全为 0——即 Astrolog 把它们当作规则命名轨道上的假想体。为逐字取用，行号对应 `CruiserOne/Astrolog` 仓库 master 分支 matrix.cpp。",
    },
    {
      title: "高斯常数与解算流程（`matrix.cpp:563-…` `ComputePlanets()`，原码逐字）",
      lines: [
        ":575  poe = &rgoe[IoeFromObj(ind)];",
        ":577  EA = M = ModRad(ReadThree(poe->ma0, poe->ma1, poe->ma2));",
        ":578  E = DFromR(ReadThree(poe->ec0, poe->ec1, poe->ec2));",
        ":579-580  for (i = 1; i <= 5; i++) EA = M+E*RSin(EA);  // Solve Kepler's equation",
        ":581  AU = poe->sma;                                    // Semi-major axis",
        ":582-583  E1 = 0.01720209/(pow(AU, 1.5)*(1.0-E*RCos(EA)));  // 高斯引力常数 GAUSS_K = 0.01720209",
        ":584-585  XW = -AU*E1*RSin(EA);  YW = AU*E1*pow(1.0-E*E,0.5)*RCos(EA);  // 近日点坐标系",
        ":586  AP = ReadThree(poe->ap0, poe->ap1, poe->ap2);",
        ":587  AN = ReadThree(poe->an0, poe->an1, poe->an2);",
        ":588  _IN = ReadThree(poe->in0, poe->in1, poe->in2);  // Calculate inclination",
        ":590  RecToSph2(AP, AN, _IN, &X, &Y, &G);  // 轨道面旋转（matrix.cpp:516 定义）",
        ":595  RecToSph2(AP, AN, _IN, &X, &Y, &G);  // 位置坐标再旋转 → 地心黄经另由 matrix.cpp:637-638 求日变化、:640 施光行差",
        ":640  aber = 0.0057756 * RLength3(XS, YS, ZS) * ret[i];  // Aberration",
      ],
      note: "0.01720209 即高斯引力常数 GAUSS_K（弧度/日，AU^1.5）；循环 5 次解 Kepler 方程 EA = M + E·sin(EA)，与注释「Looping 10 times is arbitrary…」无关（那是宫制 CuspPlacidus 的迭代）。行号为 `CruiserOne/Astrolog` master 分支 matrix.cpp。",
    },
  ],
  "uranian-aberration": [
    {
      title: "Astrolog matrix.cpp:640 与 calc.cpp:937（原码行）",
      lines: [
        "matrix.cpp:640  aber = 0.0057756 * RLength3(XS, YS, ZS) * ret[i];  // Aberration",
        "calc.cpp:937  planet[ind] = Mod(DFromR(ang) - aber + is.rSid);",
        "matrix.cpp:637-638  ret[i] = DFromR((XS*(helioy[i]-helioy[ind])-YS*(heliox[i]-heliox[ind])) /",
        "               (XS*XS + YS*YS));",
      ],
      note: "取自 CruiserOne/Astrolog 仓库（GPL-2.0-or-later）；0.0057756＝1 AU 的光行时（天/AU），ret[i] 为该天体地心黄经的日变化。",
    },
  ],
};
