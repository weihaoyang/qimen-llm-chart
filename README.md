# 奇门遁甲双输出盘

一个基于 `Next.js` 和 `3meta` 的奇门遁甲排盘工具。

它同时提供两种输出：

- 给人看的九宫盘界面
- 给 LLM 使用的严格结构化文本

## 特性

- 输入日期时间和时区直接排盘
- 左侧展示九宫盘
- 右侧输出结构化文本
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

## 构建与测试

```bash
npm run lint
npm test
npm run build
```

## 许可证

本项目使用 `GNU GPL v3.0` 许可证，详见 [LICENSE](./LICENSE)。
