# 生产发布

唯一发布入口位于基础设施仓库 `weihaoyang/platform` 的 `k8s/ship.py`。
产品仓只维护产品代码、npm 锁文件和构建合同。

```powershell
# 在基础设施仓库执行，Docker 与 SSH 配置须已就绪
python k8s/ship.py qmdj --ref main
```

发布流程从远程提交创建干净检出，使用 `npm ci` 构建不可变镜像，推送并预拉取镜像，
更新 GitOps manifest，由 Argo CD 发布。核验部署镜像 digest、就绪状态、
`https://qmdj.singseq.com/api/version` 的提交及公共冒烟结果后才算完成。

回退通过基础设施仓库恢复已验证的旧镜像 digest 并提交，由 Argo CD 同步。
数据库迁移与回退须独立检查；不要把应用镜像回退当作数据库回退。

平台账户、OAuth、会员和用量只通过 `@singseq/platform-sdk` 接入，
产品不运行独立收银或资金台账。生产 Secret 和数据库数据不进入发布包。
