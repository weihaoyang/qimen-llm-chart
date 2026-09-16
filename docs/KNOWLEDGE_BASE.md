# Local project knowledge base

Use one entry per verified problem or external finding. Keep secrets and unnecessary logs out.

## Entry format

### YYYY-MM-DD — short title

- Problem:
- Environment:
- Root cause / confidence:
- Solution:
- Verification:
- Source:
- Source type:
- Verified at:
- Recheck after:
- Tags:

### 2026-09-16 — 产品登录故障必须在统一身份边界修复

- Problem: 知几移动端统一登录 CAPTCHA 点击后提示验证失败。
- Environment: qmdj 产品站 → singseq.com OAuth/统一登录 → Consumer Platform → self-hosted Cap。
- Root cause / confidence: 已确认故障不在 qmdj。平台曾以 JSON 调用要求 form-urlencoded 的 Cap siteverify；官网控件额外经过 Next 代理扩大了移动端故障面。
- Solution: Consumer Platform 改为 form-urlencoded siteverify；官网登录控件使用平台签发且严格 allowlist 的 canonical Cap endpoint。qmdj 仅保持 OAuth/PKCE 与 callback，不复制 CAPTCHA/OTP。
- Verification: 平台/官网生产运行代码与公网冒烟通过，用户在真实移动端确认原错误消失。
- Source: platform `667f2aa`; website `16c0b67`; release `20260916-214725-16c0b67`。
- Source type: 跨仓库代码、生产运行时、日志/审计与用户验收。
- Verified at: 2026-09-16。
- Recheck after: 平台、官网、Cap、Nginx 或 qmdj OAuth 配置变化。
- Tags: unified-auth, captcha, boundary, mobile, production
