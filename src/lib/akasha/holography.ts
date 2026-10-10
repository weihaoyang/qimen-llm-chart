/**
 * 全息宇宙模型中的**可计算**部分：面积律信息量、贝肯斯坦界、以及全息图的
 * 碎片重建演示（傅里叶光学）。
 *
 * 物理式为教科书标准式（非本仓创制）：
 * - 史瓦西半径 r_s = 2GM/c²；视界面积 A = 4πr_s²；
 * - 贝肯斯坦–霍金熵 S = k_B A /(4 l_P²)，即每 4 个普朗克面积 1 比特（自然单位）；
 * - 贝肯斯坦界 S ≤ 2π k_B R E /(ħ c)；
 * - 全息图：物光与参考光的干涉强度 H(u)=|Σ a_i e^{i2πx_i u}|²，其傅里叶变换在 ±x_i
 *   出现峰；只取 H 的一段（碎片）仍能重建全部峰，但分辨率按碎片比例下降——这是
 *   「部分含整体」最直接的物理实例。
 */

export const CONSTANTS = {
  c: 2.99792458e8,
  G: 6.6743e-11,
  hbar: 1.054571817e-34,
  kB: 1.380649e-23,
  lP: 1.616255e-35,
  mP: 2.176434e-8,
};

export const schwarzschildRadius = (massKg: number) => (2 * CONSTANTS.G * massKg) / (CONSTANTS.c * CONSTANTS.c);
export const horizonArea = (radiusM: number) => 4 * Math.PI * radiusM * radiusM;
/** 面积律信息量（比特）：A /(4 l_P²)。 */
export const entropyBits = (areaM2: number) => areaM2 / (4 * CONSTANTS.lP * CONSTANTS.lP);
export const entropyJoulesPerKelvin = (bits: number) => bits * CONSTANTS.kB;
/** 体积律对照：1 比特 / 普朗克体积。 */
export const volumeLawBits = (radiusM: number) => ((4 / 3) * Math.PI * radiusM ** 3) / CONSTANTS.lP ** 3;
/** 贝肯斯坦界：S ≤ 2π k_B R E /(ħ c)。返回 **S/k_B**（无量纲，单位 nat）。 */
export const bekensteinNats = (radiusM: number, energyJ: number) => (2 * Math.PI * radiusM * energyJ) / (CONSTANTS.hbar * CONSTANTS.c);
/** 同一条界的**比特数** = (S/k_B)/ln2。 */
export const bekensteinBits = (radiusM: number, energyJ: number) => bekensteinNats(radiusM, energyJ) / Math.LN2;

export type HolographicReport = {
  massKg: number;
  schwarzschildRadiusM: number;
  horizonAreaM2: number;
  bits: number;
  entropyJK: number;
  volumeBits: number;
  areaVsVolume: number;
  bekensteinBits?: number;
};

export const holographicReport = (massKg: number, radiusM?: number): HolographicReport => {
  const rs = schwarzschildRadius(massKg);
  const area = horizonArea(rs);
  const bits = entropyBits(area);
  const volumeBits = volumeLawBits(rs);
  return {
    massKg,
    schwarzschildRadiusM: rs,
    horizonAreaM2: area,
    bits,
    entropyJK: entropyJoulesPerKelvin(bits),
    volumeBits,
    areaVsVolume: volumeBits / bits,
    ...(radiusM === undefined ? {} : { bekensteinBits: bekensteinBits(radiusM, massKg * CONSTANTS.c * CONSTANTS.c) }),
  };
};

/** 就地基数-2 FFT（Cooley–Tukey，N 为 2 的幂）。 */
export const fft = (re: Float64Array, im: Float64Array) => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
};

const downsample = (values: Float64Array, bins: number) => {
  const out: number[] = [];
  const step = values.length / bins;
  for (let i = 0; i < bins; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = Math.floor(i * step); j < Math.floor((i + 1) * step); j += 1) {
      sum += values[j];
      count += 1;
    }
    out.push(Number((sum / (count || 1)).toFixed(6)));
  }
  return out;
};

/** 峰值检测：窗口内取局部极大（避免峰落在两个采样点之间而漏检）。 */
const peaksOf = (magnitude: Float64Array, count: number, window = 2) => {
  const n = magnitude.length;
  const threshold = Math.max(...magnitude) * 0.05;
  const found: Array<{ x: number; value: number }> = [];
  for (let k = 0; k < n / 2; k += 1) {
    let isMax = true;
    for (let d = -window; d <= window && isMax; d += 1) {
      if (d === 0) continue;
      const index = ((k + d) % n + n) % n;
      if (magnitude[index] > magnitude[k]) isMax = false;
    }
    if (isMax && magnitude[k] > threshold) found.push({ x: Number((k / n).toFixed(4)), value: Number(magnitude[k].toFixed(3)) });
  }
  return found.sort((a, b) => b.value - a.value).slice(0, count);
};

const correlation = (a: Float64Array, b: Float64Array) => {
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < a.length; i += 1) {
    sa += a[i];
    sb += b[i];
  }
  const ma = sa / a.length;
  const mb = sb / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i += 1) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : Number((num / den).toFixed(4));
};

export type HologramDemo = {
  samples: number;
  sources: number[];
  fragmentFraction: number;
  usableFraction: number;
  resolution: number;
  correlation: number;
  peaksFull: Array<{ x: number; value: number }>;
  peaksFragment: Array<{ x: number; value: number }>;
  hologram: number[];
  full: number[];
  fragment: number[];
};

/**
 * 全息碎片重建演示：由点源与一束轴上参考光生成全息干涉条纹，再用整幅或其一段碎片重建。
 * 坐标已归一化（x ∈ [-0.5, 0.5) 对应重建轴）；参考光越强，源间互调产生的鬼峰越弱。
 * 重建前统一扣除全息图的均值（等价于物理上的「零级（DC）阻挡」）。
 */
export const hologramDemo = (sources: number[], fragmentFraction = 0.25, samples = 256, reference = 3): HologramDemo => {
  const n = samples;
  const raw = new Float64Array(n);
  for (let j = 0; j < n; j += 1) {
    let hr = reference;
    let hi = 0;
    for (const x of sources) {
      // 物点坐标 x 对应条纹频率 x·N，故重建时 bin k ↔ x = k/N
      const phase = 2 * Math.PI * x * j;
      hr += Math.cos(phase);
      hi += Math.sin(phase);
    }
    raw[j] = hr * hr + hi * hi; // 干涉强度
  }
  const mean = raw.reduce((sum, value) => sum + value, 0) / n;
  const hologram = Float64Array.from(raw, (value) => value - mean);

  const full = new Float64Array(n);
  {
    const fr = Float64Array.from(hologram);
    const fi = new Float64Array(n);
    fft(fr, fi);
    for (let i = 0; i < n; i += 1) full[i] = Math.hypot(fr[i], fi[i]);
  }

  const usable = Math.max(1, Math.round(fragmentFraction * n));
  const frag = new Float64Array(n);
  for (let i = 0; i < usable; i += 1) frag[i] = hologram[i];
  const fragMag = new Float64Array(n);
  {
    const fr = Float64Array.from(frag);
    const fi = new Float64Array(n);
    fft(fr, fi);
    for (let i = 0; i < n; i += 1) fragMag[i] = Math.hypot(fr[i], fi[i]);
  }

  return {
    samples: n,
    sources,
    fragmentFraction,
    usableFraction: Number((usable / n).toFixed(4)),
    resolution: Number((1 / fragmentFraction).toFixed(2)),
    correlation: correlation(full, fragMag),
    peaksFull: peaksOf(full, 6),
    peaksFragment: peaksOf(fragMag, 6),
    hologram: downsample(hologram, 64),
    full: downsample(full, 64),
    fragment: downsample(fragMag, 64),
  };
};
