# 胜天半子

一个基于 `Next.js` 的命理三盘工作台，当前产品名为 **胜天半子**。

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

本产品已经在平台正式注册，线上平台地址为 `https://api.singseq.com`。
```

## 构建与测试

```bash
npm run lint
npm test
npm run build
```

统一账户、邀请码兑换、游客凭证与 AI 权益链路的运行不变量和发布验收，见 [`docs/AI_ACCESS_RUNBOOK.md`](./docs/AI_ACCESS_RUNBOOK.md)。

## 许可证

本项目使用 `GNU GPL v3.0` 许可证，详见 [LICENSE](./LICENSE)。
# 知几排盘

知几是 SingSeq 的术数排盘产品，生产入口为 `https://qmdj.singseq.com/paipan`。

本仓库只负责排盘工作台、八字/奇门/紫微/三式盘面及其分析入口。账户、订单、支付和会员权益统一通过 Consumer Platform API/SDK 处理。

胜天半子代码已复制到独立仓库 `F:\shengtian`。在生产切流完成前，本仓库保留根路径兼容入口；`qmdj.singseq.com` 通过 host 代理进入 `/paipan`。
