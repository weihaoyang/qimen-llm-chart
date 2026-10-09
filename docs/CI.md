# CI

`知几` 的持续集成跑在 GitHub Actions，工作流在 `.github/workflows/ci.yml`。

## 一条命令

本地与 CI 跑的是**同一条命令**：

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

## 为什么 CI 要拉平台私有仓

`package.json` 里这个依赖指向**相邻的平台仓**：

```
"@singularity-sequence/web-sdk": "file:../singularity-sequence-consumer-platform/packages/web-sdk"
```

`next.config.ts` 也把它列为 `transpilePackages`（当**一方源码**编译，而不是外部包）。
所以 CI 必须同时拿到平台仓，且与本仓**并列**放在同一个工作目录下，`file:` 相对路径才解析得到。

工作流做法：

1. `actions/checkout` 本仓到 `qmdj/`；
2. `actions/checkout` 平台仓（`weihaoyang/singularity-sequence-consumer-platform`）到 `singularity-sequence-consumer-platform/`；
3. `npm ci`（`file:` 依赖被 link 到平台仓的 `packages/web-sdk`）；
4. **构建 web-sdk**（见下）；
5. `npm run ci`。

## 需要的仓库密钥

| Secret | 用途 |
| --- | --- |
| `PLATFORM_REPO_TOKEN` | 只读拉取平台私有仓。细粒度 PAT，`Contents: Read` 勾到平台仓即可。 |

配置位置：`Settings → Secrets and variables → Actions → New repository secret`。

**没配 token 时**：工作流不会变红，而是打一条 `::warning` 并**跳过**所有依赖 SDK 的步骤（见 `Detect platform token`）。配上 token 后自动全量跑通。

## 为什么要单独构建 web-sdk

平台仓里 `packages/web-sdk/dist/` 是 **gitignore 的**，fresh checkout 只有 `src/`。
而该包的 `package.json` 里 `main`/`types` 指向 `dist/index.*`，`tsc` 与 `next build` 都从这里解析。

所以 CI 在 `npm ci` 之后、跑检查之前，用**本仓自己的 TypeScript** 构建它：

```bash
# 工作目录 singularity-sequence-consumer-platform/packages/web-sdk
node ../../../qmdj/node_modules/typescript/bin/tsc -p tsconfig.json
```

（该包是自包含的单文件 `src/index.ts`，只依赖平台的 `tsconfig.base.json`，不需要平台仓的 `node_modules`。）

## 触发条件

- `push` 到 `main`
- 任意 `pull_request`
- 手动 `workflow_dispatch`

同一分支/PR 的并发 run 会被取消（`concurrency.cancel-in-progress`）。
