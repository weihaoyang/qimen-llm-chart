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

## 许可证

本项目使用 `GNU GPL v3.0` 许可证，详见 [LICENSE](./LICENSE)。
