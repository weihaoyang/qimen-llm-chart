# 项目长期记忆 — qmdj（singseq-qmdj-paipan）

Next.js 16.3.1（webpack）+ TS + PostgreSQL。技术债报告 `docs/technical-debt-audit-2026-09-18.md` 按 `## 附录N`
递增追加。**正文 0–5 节是过期快照（刻意保留），附录才是状态真相** —— 汇总表/概述段的「已修」两个方向都错过，
判状态一律读附录。读法陷阱：**「从未复核过」≠「已修」**；**「扫描 0 命中」常是式样问题**（嵌套结构要**括号
配对**）；**「批量改动后测试零返工」不是证据**；**多重集比对抓不到「从来没被改过的地方」**；**「守卫报了红」
≠「守卫报得对」**；**「我推理出来的限制」≠「实测的限制」** —— 限制条目同样要量（K 线批次里我把一条
不存在的限制写进了报告，下一轮量测才推翻）；**「探针全绿」的覆盖面 = 探针打到的路径，不是「这个组件」**
（有 `variant` 就有独立路径；而且**每条*可达*路径都要探针 —— 可达性必须证明，不能假设**）。

平台契约直接读源码、不等确认：`/f/singularity-sequence-consumer-platform`，API 是 **Python/FastAPI**
（`apps/api/`）。曾因只搜 `.ts` 就断言「不在此仓库」——**「搜不到」≠「不存在」**。

**本目录还有三个专题文件**（细节放那儿，避免这份被截断）：
- `NOTES-postgres.md` —— 真 PG 一次性集群、harness 三条咬人约束、并发套件的沙箱限制、锁验证姿势。
- `NOTES-frontend-kline.md` —— recharts 移植人生 K 线的五个坑 + 极端点标签布局 + 真浏览器探针串跑。
- `NOTES-dead-code-pruning.md` —— 死代码/死 CSS 的判定、差分 oracle、规则级删 CSS、脚本会怎么骗你。

## 验证口径（每批收尾跑全）

```bash
cd /f/qmdj
npx tsc --noEmit && npx eslint .        # 都期望 0（eslint 偶发 SIGTERM，重跑一次）
CODEBUDDY_SAFE_DELETE_ENABLED=0 npx vitest run
```

`CODEBUDDY_SAFE_DELETE_ENABLED=0` 必须带，否则测试里的删除路径被拦。长命令后台跑。**build 与 vitest 不要并
行**（两个删除密集的 node 进程争护栏状态文件 → EPERM），build 约 2.5 分钟。基线（2026-09-22 K 线批次后）：
**104 文件通过 / 3 跳过；559 通过 / 13 跳过**。`testTimeout`/`hookTimeout` 是 **30 秒**不是默认 5 秒（PGlite
首个查询要付「建库 + 重放 32 个迁移」成本，实测 4.83s/4.90s 对着 5.00s 上限临界）—— **别改回去**。

前端改动还要跑真浏览器探针（CI 里没有真浏览器，**探针是唯一判据**）：六个各占独立端口、**串行**跑，
`TARGET_URL=http://127.0.0.1:3000/paipan bash ~/.workbuddy-ai/tmp/run-kline-probes.sh`，
全部 `problems: []` 且 `EXIT=0` 才算过。**「我验过 6 个」和「6 个现在都是绿的」是两句话。**

## 两条 load-bearing 的事实

- **有索引 ≠ 被用上**：`listBattles` 的 `WHERE (owner) OR EXISTS (collaborator)` **析取式**完全不走索引
  （`Seq Scan`、49.7ms）；拆两分支 `UNION ALL`（第二分支带 `NOT (<owner 谓词>)` 防重复）后 **0.7ms**。该重写
  的差分 oracle 在 `sql-contract.test.ts`（冻结重写前语句、逐主体比对 `(id, access_role)`），**不要删**。
- **锁顺序**：战局域写路径**先取 `battle_cases` 行锁，再取 advisory lock**。把**一个**函数
  （`saveModuleState`）的 advisory lock 挪到行锁前 → **10 个 `40P01`、波及 6 个函数**。

## 构建：不要 kill 预览服务器

本机常年有 `next dev` 占 **3000 端口**（用户在看预览），它持有 `.next`，所以 `npm run build` 会以
`EPERM: … open '.next/server/.../*.nft.json'` 失败 —— **不是代码问题**，改用：

```bash
NEXT_DIST_DIR=.next-verify CODEBUDDY_SAFE_DELETE_ENABLED=0 npm run build
```

**绝不要为跑一次构建去 kill 用户的 dev server。** **输出目录名必须匹配 eslint 忽略式样 `.next-*`**（实测
`.verify-kline` 会让 `eslint .` 去扫构建产物并报一堆错）。清理：`CODEBUDDY_SAFE_DELETE_ENABLED=0 rm -rf .next-verify*`。

## 工作纪律

1. **写批量 INSERT 前逐列核对迁移里的真实类型**，别照邻列抄（抓到过 `timestamptz` 误写 `date`、`numeric` 误
   写 `int`）。
2. **写完「能通过」的测试后，把修复改回去确认它会红**，再恢复；变异逐个跑、各自只红对应断言。**先确认变异
   真的改到了文件** —— `sed` 缩进不匹配会静默不改，那次「全绿」什么都没证明。
3. **断言存进去的值 + 行的条数**，不要断言语句文本。调用方**需要 cast 才能编译**，通常说明类型没描述运行时契
   约 —— 改类型，别缝 cast。
4. **「纯重复、不改变行为」是要验证的断言，不是可信的前提**（内联版往往比共享版**宽**）。**共享函数被语义不
   同的多个调用方使用时，标记要落在边界上**，不是落在共享函数里。
5. **大重构先建差分 oracle**（N 个可达状态的 DOM 落盘 → 改 → 再落盘 → diff）。**先验 oracle 自身稳定，
   且自检要覆盖「比较所用的全部维度」** —— 实测「同一次运行内两次抓取相等」却**跨运行不等**（框架每次
   挂载随机 `data-uuid`）。这是「改完测试全绿」唯一能替代的证据。
6. **验证脚本自己会骗你，且比产品缺陷更难发现**（连中三次）：**（a）判红依据必须是进程退出码**，不是
   `Tests N failed` 汇总行；**（b）「没输出」要当异常抛**（spawn 失败 → 空输出 → 正则把「空」读成「没失败」）；
   **（c）「变异红了」还不够，要确认它红在*预期的那条*断言上**；**（d）输出重定向到文件，别走管道**。
7. **删死代码 / 删死 CSS 的完整打法见 `NOTES-dead-code-pruning.md`**。四条一句话版：
   - 判死看「谁在**运行**它」，不是「谁在**测**它」；**删组件必须连它的测试一起删**；删完 `tsc` 立刻 0 是证据。
   - **删 CSS 按规则删不按文本删**；`X:not(.死类)` **恒真，必须简化不是删除**；**BEM 子类不能用 lookahead 判**
     （`_` 是 word 字符，会整批漏掉）。
   - **证明删 CSS 惰性要两步**：前提在真浏览器里量（0 个元素带这些类）+ computed style 差分（视口要**同时含
     满足与不满足**相关媒体查询的尺寸）。
   - **跨语言核对 offset 先确认单位**（Python 码点 vs JS UTF-16 单元），并**先给解析器加自检**。
8. **产品意图判断要交给执欢，不要自己拍**：删一个**含测试的**模块、或判断某功能是「退役」还是「计划中」，
   不是机械清理。

## 硬约束 —— 改前先看守卫文件

`src/lib/battle/authorization.test.ts`（写授权用「写形式」谓词 owner/`role='contributor'`，读路径才用读形式；
豁免写在被豁免语句**上一行** `authz-exempt: <理由>`；谓词被复制粘贴了 **12 份** → 「选错形式」是**粘错**）、
`src/app/api/error-mapping.test.ts`（错误映射走 `errorResponse()`；不许把被捕获错误文本放进响应体；返回显式 5xx
的 catch 必须记录原因，零豁免）、`src/app/api/cache-policy.test.ts`（自建响应必须声明缓存策略 —— 这个 Next 版
本下**不设头 ≠ 不可缓存**）。迁移默认在事务里跑，`CONCURRENTLY` 要在文件头写 `-- migrate:no-transaction`；
**已应用的迁移不能改内容**（撞 checksum 账本）。**服务端保留键不能藏在客户端可写的 JSON 里**（全仓三处，含
**跨路径**的 inventory `evidence_json->>'jobId'`）：新增「从 JSON 列读出的保留键」要问 —— 这个键决定身份吗？
这个列客户端能写吗？写它的和读它的是哪两条路径？**第三条最易漏。**

## 代码风格

路由与 repository 大量用**单行压缩**写法，跟随既有风格；注释英文、写**为什么**。改文件优先用 `.mjs` 脚本，
不要 shell 内联 `node -e`（CJK 引号会被转义搞坏），也不要写含 `${...}` 的 heredoc（bash 会展开它）。
**删改脚本先构造完整结果、最后才落盘** —— 锚点找不到时抛异常，一个字节都不该写（实测：CRLF 文件配 `\n` 锚点
必失败，靠这个习惯才做到零副作用）。**探针脚本
里反斜杠要数清**：模板字符串内的正则写 `\\d`、模板外的正则字面量写 `\d`，混了会让断言恒真/恒假；模板字符串里
**不能出现反引号**。文件 CRLF/LF 混存，锚点要 EOL 容忍（`\r?\n`）。
