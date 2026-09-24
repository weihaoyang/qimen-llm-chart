# 知几排盘（QMDJ）

一个基于 `Next.js` 的命理三盘排盘工作台，产品名为 **知几排盘**，服务标识为 **QMDJ**。

它同时提供两种输出：

- 给人看的九宫盘界面
- 给 LLM 使用的严格结构化文本

## 特性

- 输入日期时间和时区直接排盘
- 左侧展示九宫盘
- 右侧输出结构化文本
- 可通过服务端代理调用标准 OpenAI 兼容模型接口
- 支持复制结构化文本和原始 JSON
- 两种输出都来自同一个排盘对象，避免信息偏差
- 标题栏可切换星盘、人类图与塔罗牌研究性 MVP 模式

## 技术栈

- Next.js
- React
- TypeScript
- 3meta
- Tailwind CSS
- shadcn/ui

## 本地运行

```bash
npm install
npm run dev
```

默认访问：

```text
http://127.0.0.1:3001
```

如需启用右侧 `AI 分析`，先配置服务端环境变量：

```bash
cp .env.example .env.local
```

```text
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4.1-mini
```

也可以直接使用 Gemini 兼容变量；使用 YYRouter 时将 `GEMINI_BASE_URL` 改为你的供应商地址：

```text
GEMINI_API_KEY=your_gemini_api_key
GEMINI_BASE_URL=https://yyrouter.cc/v1beta
GEMINI_MODEL=gemini-2.5-flash
```

如需接入公司统一用户与支付平台，还需要配置：

```text
NEXT_PUBLIC_PLATFORM_BASE_URL=https://api.singseq.com
NEXT_PUBLIC_PLATFORM_PRODUCT_CODE=shengtian-banzi
NEXT_PUBLIC_PLATFORM_ACCESS_SCOPE=shengtian-banzi-core
PLATFORM_BASE_URL=https://api.singseq.com
PLATFORM_PRODUCT_CODE=shengtian-banzi
PLATFORM_ACCESS_SCOPE=shengtian-banzi-core
```

本产品已经在平台正式注册，线上平台地址为 `https://api.singseq.com`。

统一登录由 `https://singseq.com` 与 Consumer Platform 承担。本仓库只发起
OAuth/PKCE、恢复平台 session，并在受限 AI 调用前查询 gate；不得在知几内部
实现 CAPTCHA、OTP、用户或会员真相。

## 构建与测试

```bash
npm run lint
npm test
npm run build
```

`npm test` 在 **PGlite**（编译到 WASM 的 Postgres）上跑真实的迁移与真实的
repository 代码，无需本机数据库。它验的是**语义**：cast 是否写对了列类型、
`jsonb` / `timestamptz` 存进去的值是否正确、约束是否真的拒绝非法写入。

PGlite 只有一条连接，因此**测不了并发**：`FOR UPDATE` 永不争用。并发不变量
（claim 的 compare-and-set 只有一个赢家、战局行锁让写者排队）单独放在
`src/lib/db/concurrency.test.ts`，需要一个真实的多连接服务器：

```bash
QMDJ_TEST_REAL_DATABASE_URL="postgresql://user@127.0.0.1:5432/db" npm run test:concurrency
```

⚠️ 该套件会 **drop 并重建 `public` schema**（从迁移文件重放），只能指向一个
允许被销毁的数据库。未设置该变量时整套跳过，`npm test` 不受影响。

机器上若已装 PostgreSQL，可以用它自己的二进制起一个**一次性集群**，不要指向
任何已有实例（那个可能有真实数据、也可能需要密码）：

```bash
export PATH="/c/Program Files/PostgreSQL/17/bin:$PATH"
PGROOT="$HOME/.workbuddy-ai/tmp/pg17"
initdb -D "$PGROOT/data" -U qmdj --auth=trust --encoding=UTF8 --locale=C
printf "listen_addresses = '127.0.0.1'\nport = 55433\n" >> "$PGROOT/data/postgresql.conf"
postgres -D "$PGROOT/data" -p 55433 -c listen_addresses=127.0.0.1   # 前台跑，别用 pg_ctl（会 detach）
createdb -h 127.0.0.1 -p 55433 -U qmdj qmdj
```

然后用 `QMDJ_TEST_REAL_DATABASE_URL="postgresql://qmdj@127.0.0.1:55433/qmdj" npm run test:concurrency`。

生产构建若与本地 `next dev` 预览同时进行，`next build` 会因为抢占 `.next`
而报 `EPERM`。用独立输出目录避开：

```bash
NEXT_DIST_DIR=.next-verify npm run build
```

统一账户、邀请码兑换、游客凭证与 AI 权益链路的运行不变量和发布验收，见 [`docs/AI_ACCESS_RUNBOOK.md`](./docs/AI_ACCESS_RUNBOOK.md)。

## 许可证

本项目使用 `GNU GPL v3.0` 许可证，详见 [LICENSE](./LICENSE)。

## 生产入口

知几是 SingSeq 的术数排盘产品，生产入口为 `https://qmdj.singseq.com/paipan`。

本仓库只负责排盘工作台、八字/奇门/紫微/三式盘面及其分析入口。账户、订单、支付和会员权益统一通过 Consumer Platform API/SDK 处理。

胜天半子代码已复制到独立仓库 `F:\shengtian`。本仓库保留根路径兼容入口；
知几正式入口为 `https://qmdj.singseq.com/paipan`。

2026-09-16 统一登录 CAPTCHA 故障已在平台与官网边界修复：平台使用
form-urlencoded 调用 Cap siteverify，官网移动控件使用平台签发的 canonical
Cap endpoint。知几无需、也禁止复制该逻辑。
