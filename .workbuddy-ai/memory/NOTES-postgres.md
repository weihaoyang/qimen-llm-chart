# 专题：数据库与测试（qmdj）

从 `MEMORY.md` 拆出来，避免主文件超限。主文件的验证口径与硬约束仍然适用。

## 本机有真 Postgres，能测并发

- 迁移在 `database/migrations/`（`001_…` … `032_…`）。
- **「本机没有 Postgres」是错的。** `.env.local` 指的 `127.0.0.1:55432` 确实没服务；但
  `C:\Program Files\PostgreSQL\17` 装着 **17.11**，实例在 **5432**（需密码，拿不到，**不要动**）。
- 并发可测：建**一次性集群**（`initdb -U qmdj --auth=trust`，端口 **55433**，数据目录
  `C:/Users/weihaoyang/.workbuddy-ai/tmp/pg17/data`）。`pg_ctl start` 会被沙箱 SIGTERM → 改用
  `postgres -D …/pg17/data -p 55433` 当前台进程 + 后台任务；崩后恢复 35–45 秒。
- 已实测 32 个迁移在真 PG 17.11 全通过（46 表 / 134 索引 / 273 约束）。

```bash
QMDJ_TEST_REAL_DATABASE_URL="postgresql://qmdj@127.0.0.1:55433/qmdj" \
  CODEBUDDY_SAFE_DELETE_ENABLED=0 npx vitest run \
  src/lib/db/concurrency.test.ts src/lib/db/query-plans.test.ts
```

## `real-postgres-harness.ts` 三条会咬人的约束

1. **两个文件并行会互相 `DROP SCHEMA`** → 报 `could not open file "base/…/1259": Permission denied`，而报错
   来自一条本身正确的语句。harness 用**会话级 advisory lock**（`SCHEMA_GATE_KEY`）独占整个文件生命周期。
   **加第三个真实服务器文件必须走 `installRealTestPool`**，否则问题原样回来。
2. **gate 占一条连接，`pool.end()` 会等它归还** → 必须先 `release()` 再 `end()`（否则永久挂起）。池宽 12。
3. **清理残留后端时不能杀正在等 gate 的连接** —— 会让兄弟文件的 `beforeAll` 抛错、整个文件报 skip。靠
   `NOT EXISTS (pg_locks … locktype='advisory' AND NOT granted)` 放过。

## ⚠️ `concurrency.test.ts` 在本沙箱里跑不完（2026-09-22 起）

它会把 PostgreSQL 打崩：

```
PANIC: could not open file "global/pg_control": Permission denied
LOG:   server process (PID …) was terminated by exception 0xC0000409
```

**已做对照实验，证明与代码无关**：把改动临时还原成修复前**照样崩**（7 失败 / 1 通过）；修复版下 8/8 失败、
再跑是 3 失败 / 5 通过，**失败的是哪些用例每次都不同**；而同一台集群上 `query-plans.test.ts` **3/3 通过**。
→ 沙箱拦住了 postgres 进程读自己的控制文件。

**如实记下，不要读成「并发套件绿了」—— 那些批次的并发验证是缺的。**

## 测试分层与注入点

| 目标 | 文件 | 引擎 |
| --- | --- | --- |
| 语义（cast、`jsonb`、约束） | `src/lib/db/sql-contract.test.ts` | PGlite（WASM 18.3，自动） |
| 并发（锁、CAS、死锁） | `src/lib/db/concurrency.test.ts` | 真 PG 17.11（多连接） |

- harness：`src/lib/db/testing/pglite-harness.ts`（惰性）、`real-postgres-harness.ts`（真 `pg` Pool，无适配器）。
- **注入点**：`src/lib/db/pool.ts` 把 pool 缓存在 `globalThis.qmdjPool`，每次 `query`/`withTransaction` 都读它
  → 往这个槽位放一个 `pg`-Pool 形状的适配器，**所有 repository 一行都不用改**。
- 坑：PGlite 对 `SELECT` 返回 `affectedRows: 0`，而 `pg` 的 `rowCount` 对 `SELECT` 是**结果集行数**。照搬会让
  `if (!owner.rowCount) return null` 在行存在时判成不存在 → 写路径静默 404。
- ⚠️ 并发套件会 **drop 并重建 `public` schema**，只能指向允许被销毁的库；其 hook 需要 **120s** 超时（重建
  schema 要 10–20 秒，默认 10s 会超时且读起来像卡死）。

## 两个容易做假的验证姿势

- **并发测试必须预热连接池**（宽度与爆发一致）。冷池下 8 个并发调用会被「建连接」串行化，**删掉锁也照样绿**；
  实测冷池 8 并发只出 1 行、预热后出 8 行。
- **验证锁的正确姿势：断言「它停在哪条语句上」，不是「它停了」。** `replaceInventory` 结尾的
  `UPDATE battle_cases SET updated_at` 取同一行的锁，所以删掉前置 `FOR UPDATE` 后写者**照样阻塞**（只是阻塞点
  挪到插入/删除之后）—— 「它阻塞了」没有判别力，实测会假绿。用
  `SELECT query FROM pg_stat_activity WHERE state='active' AND wait_event_type='Lock'` 看它停在哪。
  同理 `Promise.all` 两个写函数「制造竞争」也不可靠（回环上亚毫秒往返，经常碰巧串行）。
