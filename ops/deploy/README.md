# 知几 deploy SDK

一条命令、可回滚的发布。所有操作都通过 `ops/deploy/cli.mjs`，它把生产主机上的
构建、切换、健康门和回滚封装成一个稳定接口。

```bash
node ops/deploy/cli.mjs doctor     # 发布前自检（docker/rsync/node/磁盘/env/sdk）
node ops/deploy/cli.mjs build      # 只构建镜像，不动流量（预构建）
node ops/deploy/cli.mjs deploy     # 构建 → 切换 → 健康门 → 失败自动回滚（默认）
node ops/deploy/cli.mjs status     # 当前发布、镜像、健康
node ops/deploy/cli.mjs rollback   # 切回上一版镜像
node ops/deploy/cli.mjs logs -f    # 跟随容器日志
```

## 设计契约

所有产品统一遵循同一套发布契约（知几与 Consumer Platform 同构）：

1. **不可变产物**：每次发布会话按 `release-id`（`YYYYMMDD-<git短哈希>`）打一个镜像。
2. **锁**：同一时间只允许一个发布（`/var/lock/qmdj-release.lock`）。
3. **原子切换**：`docker compose up -d` 用新镜像替换容器。
4. **健康门**：轮询 `/api/version`，必须回显本次 `release-id`，否则失败。
5. **自动回滚**：任一步失败，自动切回 `previous_image`。
6. **清单留痕**：`release-manifest.json` 记录 release id、镜像、镜像 ID、上一版镜像、健康负载。

## 主机前置条件

- Linux 主机，已装 Docker Engine + Compose v2（`ubuntu` 能 `sudo docker`）。
- `rsync`、`node`（默认 `/home/ubuntu/.nvm/versions/node/v24.16.0`）。
- 运行环境文件：默认 `/srv/qmdj/.env.local`（`DATABASE_URL`、`OPENAI_API_KEY` 等）。
- `@singularity-sequence/web-sdk` 包放在 release 目录的兄弟路径
  （默认 `<releases>/singularity-sequence-consumer-platform/packages/web-sdk`）。
- 磁盘预留 ≥ 2GB。

先跑 `doctor`，全绿再发布。

## 一次发布的完整流程

```bash
# 1) 在主机上准备 release 检出（仓库是公开的）
cd /srv/qmdj-releases
git clone --depth 1 https://github.com/weihaoyang/qimen-llm-chart.git 20261009-<hash>
cd 20261009-<hash>

# 2) 自检
node ops/deploy/cli.mjs doctor

# 3) 一键发布（构建 + 切换 + 健康 + 回滚）
node ops/deploy/cli.mjs deploy
```

`deploy` 成功会打印 `RELEASE_OK=<release-id> IMAGE=qmdj:<release-id>`；
失败会自动切回上一版并返回非 0。

想在不停旧服务的情况下先构建，再秒级切换：

```bash
node ops/deploy/cli.mjs build     # 旧容器继续服务
# 构建完成后
node ops/deploy/cli.mjs deploy    # 复用缓存，几秒内切换
```

## 构建形态（为什么快）

- **宿主机构建 standalone**：复用持久构建目录 `<releases>/qmdj-build/node_modules`，
  `package-lock.json` 未变时**跳过 `npm ci`**。
- **薄镜像打包**：只把 `.next/standalone` + `.next/static` 打进 `node:24-slim`，秒级完成。
- 实测：冷构建（含首次 `npm ci`）约 2.5 分钟；热构建约 1.5 分钟；切换/回滚秒级。

对比：早期在容器内从零 `npm ci` 每次约 15 分钟。

## 回滚与恢复

```bash
node ops/deploy/cli.mjs rollback          # 切回 release-manifest.json 里的 previous_image
node ops/deploy/cli.mjs status            # 确认 image / health
```

`deploy` 失败时已自动回滚；`rollback` 用于手动回退。

## 配置（环境变量覆盖）

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `QMDJ_ENV_FILE` | `/srv/qmdj/.env.local` | 运行环境文件 |
| `QMDJ_PROJECT` | `qmdj` | compose 项目名 |
| `QMDJ_CONTAINER` | `qmdj` | 容器名 |
| `QMDJ_IMAGE_NAME` | `qmdj` | 镜像仓库名 |
| `QMDJ_VOLUME_DIR` | `<releases>/qmdj-build` | 持久构建目录（提速缓存） |
| `QMDJ_SDK_SRC` | `<releases>/…/packages/web-sdk` | SDK 包路径 |
| `QMDJ_NODE_BIN` | nvm v24.16.0/bin | 构建用 node |
| `QMDJ_HEALTH_URL` | `http://127.0.0.1:3002/api/version` | 健康端点 |
| `QMDJ_NO_SUDO` | 空 | 置 `1` 时不给 docker 加 sudo |

## 运行时拓扑

- 容器 `qmdj` 用 **host 网络**，监听 `127.0.0.1:3002`，nginx 继续代理到该端口。
- 这样 `.env.local` 里的 `DATABASE_URL=127.0.0.1:5432`（宿主 Postgres）无需改动。
- `restart: always`，Docker 开机自启；systemd 的 `qmdj.service` 已停用，仅作应急回退。

## 排障

| 现象 | 处理 |
| --- | --- |
| `low disk (<2GB free)` | 清理磁盘后重试；提速缓存在 `<releases>/qmdj-build` |
| `release lock is held` | 有发布在跑；用 `pgrep -af ops/deploy/release.sh` 确认 |
| `missing web-sdk at …` | 放置 `@singularity-sequence/web-sdk` 包到 `QMDJ_SDK_SRC` |
| `did not become healthy` | `node ops/deploy/cli.mjs logs`；已自动回滚到上一版 |
| 手动恢复旧的 systemd 版 | `sudo systemctl enable --now qmdj.service`（容器先 `docker compose -p qmdj down`） |

## 其他产品如何接入（SDK 化）

同一套契约，换 `service`/`port`/`build` 即可：

1. 写 `docker-compose.<product>.yml`（`image` + `restart` + 健康检查）。
2. 写 `ops/deploy/Dockerfile.release`（薄打包，或改成多阶段构建）。
3. 写 `ops/deploy/release.sh`（锁 → 构建 → 打 tag → 切换 → 健康门 → 回滚）。
4. 写 `ops/deploy/cli.mjs`（doctor/build/deploy/status/rollback/logs）。

Consumer Platform 已有一版同构脚本（`scripts/deploy-shadow-release.sh`，含迁移与影子容器），
契约一致：不可变镜像 + 锁 + 健康门 + 自动回滚。
