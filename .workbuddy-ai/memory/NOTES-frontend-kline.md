# 专题 — 前端：recharts 移植人生 K 线

配套：`MEMORY.md`（索引/硬规则）、`docs/technical-debt-audit-2026-09-18.md` 附录二十三。

## 移植边界（先看这条）

上游 `miounet11/life-kline`（Apache-2.0）。仓库自己的开源审计
（`docs/research/open-source-agent-audit-2026-08-17.md:22`）已划定：**只吸收可视化层，
不吸收其未审计的命理计算**。所以只搬了 `ChartHUD` / 蜡烛图结构 / 文字表格视图，
分数与年份序列仍来自本仓库的 `life-kline-reading.ts`。

上游是 Tailwind + 硬编码 `emerald/rose/indigo/amber`，全部换成本仓库 token。

**上色分两条路（关键）**：本文件自己画的（蜡烛、峰谷标记、分隔线）**带 class、由 CSS 上色**，
自动跟随 `--paipan-*`；只有 Recharts **内部构造**的元素（grid、axis、brush track、ReferenceArea
填充）需要字面量颜色，走 `KLINE_PALETTE`。**CSS 变量在 recharts 的 SVG 属性里用不上**，
这就是为什么需要那份 JS 常量 —— `kline-palette.test.ts` 把它钉在 `paipan.css` 上。

## 五个实测坑（全部由「量渲染结果」发现，不是读代码读出来的）

1. **`ReferenceArea` 不要 `ifOverflow="extendDomain"`。**
   Recharts 会为每一个要求扩展的参考元素撑开数值轴 domain。加了之后轴弹回全 90 年，
   被 Brush 框出的 11 根蜡烛被画进绘图区左边 11% 宽。改 `ifOverflow="hidden"`。
   守卫：`bodySpan ≈ axisSpan`。变异（改回 `extendDomain`）→ 红 3 条。

2. **数值轴用 `tickCount`，不要 `interval`。**
   `interval` 数的是**生成的**刻度，不是数据点。数值轴只生成约 5 个刻度，
   所以 `interval={8}` 让屏幕上只剩一个年份标签。改 `tickCount={compact ? 3 : 6}`。变异 → 红 1 条。

3. **`activeTooltipIndex` 是相对「刷选窗口」的，不是相对传给 `data` 的序列。**
   实测：窗口 2016–2036 时悬停标签为 2024 的刻度，报回 index 8，而 `rows[8]` 是 2004 ——
   **整整偏掉窗口起点**。修法：拿 index 去查 `view.rows`，再用 `row.index` 换算回序列索引。
   ```ts
   const rowAt = useCallback((state: MouseHandlerDataParam | null) => {
     const index = rowIndexFrom(state);
     return index === null ? null : view.rows[index] ?? null;
   }, [view.rows]);
   ```
   → 状态存 `hoveredRow: LifeKlineRow | null`，**不要存跨窗口的裸 index**；
   `onSelect?.(row.index)` 也传序列索引。变异（`view.rows[index]`→`rows[index]`）→ 红 2 条
   （`expected 2044 to be 2067`）。

4. **`ReferenceLine` 的子元素不会被重新定位。**
   子 `<text x={2026}>` 被当成**像素**坐标 → 落在页面 x 2067，而窗口只有 1406 宽，**「今」静默不可见**。
   必须走 `label` prop（`className` 会透传到 `<text>`）：
   ```tsx
   <ReferenceLine x={view.today.x} label={{ value: "今", position: "top", offset: 8, className: "kline-chart__today" }} />
   ```
   对照：`ReferenceDot` 的 `shape` 反而收到算好的像素 `cx/cy`。
   变异 → 红 1 条（`expected 2065 not to be 2065`）。

5. **Recharts 把指针事件节流到下一帧**（`throttleDelay: 'raf'`），且 `click` 不带索引
   除非之前有 `mousemove`。jsdom 里测悬停要 `await act(async () => new Promise(r => setTimeout(r, 40)))`；
   测 click 前先发一次 mousemove。

## jsdom 里跑真 Recharts

- mock `ResponsiveContainer` 给显式尺寸（否则宽高为 0，什么都不渲染）；
- stub `Element.prototype.getBoundingClientRect`；
- 跨一帧再断言（见坑 5）。

## 纯几何层（`kline-geometry.ts`）

不需要 DOM 就能断言蜡烛像素：**`candleRange` 要取全 high/low 范围，不是实体范围** ——
自定义 shape 从 rect 反推 y 刻度，给实体范围会**丢掉所有影线**。
上游读 Recharts 内部 scale、失败时回退到实体 rect，会静默擦掉 wick。

## 极端点标签布局

「最低」标签曾压进 x 轴刻度行（标签 y 259–271 vs 刻度文字 245–259，绘图区底边 240）。
改成锚在低点**上方偏右**：`x={cx + 8} y={cy - 4} textAnchor="start"`。
量法：先用几何探针打出 plotBottom，再断言标签不越过它。

### 「最高」标签会被 SVG 视口裁掉（已修）

`PeakMark` 把说明放在 `cy - 30`，而**峰点本身就可以位于绘图区顶边**（那正是「峰」的定义），
顶边 = `margin.top`。所以需要 `margin.top ≥ 30 + 实测上升部 9 = 39`，原来是 34 →
字形框落在相对 y **-5…7**，**顶上 5px 被 SVG 视口裁掉**（`getComputedStyle().clipPath` 查不出来）。

**触发阈值：峰分 > 约 90（compact）/ > 97（full）。** 八字序列峰在 80 附近所以一直没显形；
感情「时辰线」峰打到 100 才暴露 —— **也就是说这个缺陷在 full 变体里一直存在，只是没被数据触发。**

修法：`kline-geometry.ts` 里三个常量，`PeakMark` 用 OFFSET、图表 `margin.top` 用 HEADROOM：

```ts
export const PEAK_CAPTION_OFFSET = 30;   // 点到基线
export const PEAK_CAPTION_ASCENT = 12;   // 实测 9，向上取整
export const PEAK_CAPTION_HEADROOM = PEAK_CAPTION_OFFSET + PEAK_CAPTION_ASCENT;  // 42
```

**两处必须一致，而类型系统连接不了它们** —— 所以放一起、写清理由。修后实测 -5 → **+3**。

守卫：造峰分 = 100 的序列，读 Recharts 算出的 `<text y>`，断言 `y - PEAK_CAPTION_ASCENT >= 0`。
**这是行为断言，不是「margin 等于某常量」的同义反复。** 变异（margin 回 34）→ 红 1 条。

### 阴性结果：低点箭头**不会**溢出（别再查一遍）

`TroughMark` 箭头在 `cy + 5`，形状纵向 8…22 × 0.58 → 低点下方 **17.8px**。低点在 0 分时会不会漏出下沿？

**不会。** compact 的真实布局：surface 高 118，绘图区（`xAxisLineY`）在 **82** ——
Recharts 在绘图区下面留了刻度文字 + 余量共 36px，**不是 `margin.bottom: 6` 那么点**。
低点 0 分 → 箭头底部 82 + 17.8 = **99.8 < 118** ✓。**不该为了对称去挤 sparkline 的绘图高度。**

## 变体与探针覆盖面

`variant: "full" | "compact"` 是**两条独立路径**。compact 无 Brush、无 y 刻度、无「今」线、
`tickCount` 3 不是 6、高度 118、`maxBarSize` 10、窗口取全序列；只在**感情 K 线**的四张卡片里出现。

**四个探针全打在 full 上，compact 从头到尾没在浏览器里渲染过** —— 补上 `kline-compact.mjs`
（切「感情」→ 量四张卡片 → 逐个点四个时间尺度 → 切回「人生」确认 full 回来）后**一验就查出上面那个缺陷**。

→ **「探针全绿」的覆盖面 = 探针打到的路径，不是「这个组件」。每条*可达*路径都要探针，
而可达性必须被证明、不能被假设**（曾把一条 `product === "shengtian"` 的分支当成「该验的路径」，
实际全仓不可达 —— 见报告附录二十三）。

### 两个探针自身的假警报（不是产品缺陷）

1. `.recharts-xAxis .recharts-cartesian-axis-tick-value` —— **这个 class 在 Recharts 3.x 里不存在**，
   于是「没有刻度标签」。正确做法：读全部 `svg text` 再按内容过滤。
2. compact 的轴是**日期**（`09-22`/`10-02`/`07-22`，随时辰/日/月/年尺度变）不是年份 ——
   实际 3 个标签都在，`tickCount` 生效。按 `/^\d{2}-\d{2}$/` 或 `/^\d{4}$/` 匹配、断言恰好 3 个。

→ **「探针报红」和「产品有缺陷」是两件事。报红先问：是我的选择器/假设错了，还是它真错了。**

## 验证姿势


- **SVG viewport 裁剪 ≠ CSS `clip-path`** —— `getComputedStyle().clipPath` 查不出字形被
  SVG viewport 裁掉。必须断言**页面坐标落在 surface 的页面矩形内**（坑 4 一开始就是被这个漏掉的）。
- 真浏览器探针（零依赖 CDP，Node 全局 `WebSocket` + `fetch`，`Input.dispatchMouseEvent` 驱动
  悬停/拖拽）比 jsdom 更能抓这类几何与交互问题。**六个探针**：默认档案 / 1990 出生 / 刻度对齐 /
  标签几何 / **compact 变体** / **Brush 拖拽**。跑法：`TARGET_URL=http://127.0.0.1:3000/paipan
  CDP_PORT=95xx node <probe>.mjs`，每个换一个端口；脚本在 `~/.workbuddy-ai/tmp/`，
  一键串跑 `bash run-kline-probes.sh`。全部 `problems: []` 且 EXIT=0 才算过。
- **探针的判据指标本身也要被质疑**：Brush 探针第一版用 `bodySpan` 测「窗口变没变」，
  而它恒等于 `axisSpan`（蜡烛永远铺满轴）→ 永远绿。换成**年份跨度**才有判别力。
  **指标选错 = 探针永远绿，比没有探针更危险。**
- **变异后先确认变异真的落到文件上**：`sed` 缩进不匹配会静默不改，那次「全绿」什么都没证明。
