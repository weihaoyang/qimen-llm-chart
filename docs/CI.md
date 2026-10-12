# 质量门（本地一条命令）

知几的校验跑在**本地**，一条命令，提交前必须绿：

```bash
npm run ci
```

等价于：

```
tsc --noEmit  →  eslint src  →  vitest run  →  next build --webpack
```

单独跑：

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint（默认全仓）
npm test            # vitest run
npm run build       # next build --webpack
```

## 为什么没有云端 CI

曾有一个 GitHub Actions 工作流（`.github/workflows/ci.yml`），**已于 2026-10-13 移除**。原因：

`package.json` 里这个依赖指向**相邻的私有平台仓**：

```
"@singularity-sequence/web-sdk": "file:../singularity-sequence-consumer-platform/packages/web-sdk"
```

`next.config.ts` 还把它列为 `transpilePackages`（当**一方源码**编译）。也就是说，**离开并排的这两个目录，本仓根本无法 typecheck/build**。

于是云端要跑同一套检查，就必须能克隆平台私有仓 → 需要 `PLATFORM_REPO_TOKEN` 这个仓库密钥。而该密钥一直没配，工作流里 6/7 步都带 `if: platform-token == true`，实际效果是**打一条 warning 后跳过一切**：一个绿灯空转、不提供任何校验，却容易让人误以为"云端兜住了"。

因此改为**只保留本地门**：改完跑 `npm run ci`，绿了才提交/推送。发布（`node ops/deploy/cli.mjs deploy`）自带构建、健康门与自动回滚，不依赖任何云端 CI。

> 如果将来希望"从其它机器直接 push 也能被拦住"，再重建工作流即可：本仓 checkout 到 `qmdj/`、平台仓 checkout 到 `singularity-sequence-consumer-platform/`（并列）、`npm ci`、用本仓的 TypeScript 构建 `packages/web-sdk` 的 `dist`，最后跑 `npm run ci`。

## web-sdk 的 dist 是 gitignore 的

平台仓里 `packages/web-sdk/dist/` 不入版本库，fresh checkout 只有 `src/`；而该包 `package.json` 的 `main`/`types` 指向 `dist/index.*`。所以在干净环境里（例如刚才那段"将来重建工作流"的做法）需要先构建它：

```bash
# 工作目录 singularity-sequence-consumer-platform/packages/web-sdk
node ../../../qmdj/node_modules/typescript/bin/tsc -p tsconfig.json
```

（该包是自包含的单文件 `src/index.ts`，只依赖平台的 `tsconfig.base.json`。）
