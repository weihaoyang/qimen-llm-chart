# 世界脉搏上线能力矩阵

核对日期：2026-08-30。这里记录的是 qmdj 商业发布的实际能力，不沿用上游 GEV README 的“配置后可用”宣传口径。

## 已接通并验证

| 能力 | 生产契约 | 当前状态 |
| --- | --- | --- |
| Cesium 地球与 OSM fallback | `/gods-eye-view/cesium/*` | 本地 production HTTP 与浏览器渲染通过 |
| 区域民航、军机、轨迹、机型/航线 | adsb.lol + adsbdb 服务端代理 | 真实上游与本地 HTTP 通过；民航明确为 250nm 区域快照 |
| 卫星与发射任务 | CelesTrak、Launch Library 2 | same-origin 代理已接 |
| 地震、道路与路线 | USGS、OSM Overpass、OSRM | 实时/有界查询；不开放任意上游地址 |
| Radio | Radio Browser | HTTPS MP3/AAC 目录，过滤私网地址；浏览器音频直连广播方 |
| 公共单车 | GBFS allowlist | 只允许产品内置 HTTPS provider |
| 地形与天气 | Re:Earth、Open-Meteo | 真实高度/天气；失败时显示 unavailable/fallback |
| 映射军事设施 | 有界 OSM Overpass | ≤10° bbox、最多 700 条、显式 saturation |
| 场景导演、观察快照、CCTV 校准 | qmdj battle API + PostgreSQL | battle-scoped、幂等、可恢复 |
| 官方案例/世界脉冲目录 | qmdj official catalog | 服务端只读、用户 clone 隔离 |

## 明确降级，不伪造

| 能力 | 当前状态 | 上线表现 |
| --- | --- | --- |
| Google Photorealistic 3D / Places | 未配置商业 key | 自动使用 OSM globe；Places 标记 unavailable |
| TomTom 实时路况 | 未配置商业 key | `/api/tomtom/status` 返回 simulation；不宣称实时 |
| NASA FIRMS | 未配置 `FIRMS_MAP_KEY` | 返回 `503/no_key`，图层显示 KEY REQUIRED |
| AIS 船舶 | 未配置 `AISSTREAM_API_KEY` | 返回 503/unconfigured，不生成船舶 |
| CCTV 实时目录 | 当前网络无法稳定连接 Austin/Caltrans/TfL | 目录为 0；面板显示 `No cameras available`，所有操作禁用；不生成 POI 种子摄像头 |
| Realtime 语音 | 尚未接平台 entitlement/用量结算 | UI 显示 `UNAVAILABLE / VOICE NOT CONFIGURED`，按钮禁用 |
| HUD AI 摘要 | 未纳入计费能力 | 使用确定性本地摘要，不再每 15 秒请求失败 |

## 商业许可边界

- 不分发 TeleGeography 海底电缆 CC BY-NC-SA 数据或图层。
- 不调用 OpenSky 非商业接口；民航使用 adsb.lol ODbL 区域源。
- 不调用 Google News RSS；区域简报当前只使用许可兼容的天气/公开源。
- GEV MIT 许可文本随静态发布物保留在 `THIRD_PARTY_NOTICES.txt`。

## 生产阻断

- 线上仍是 `2d2149f / 20260825-1415-ai-sdk-chat-scroll`，没有本矩阵中的静态资源和 API。
- 生产 `shengtian_banzi` 数据库尚无 `schema_migrations`、`battle_cases`；切新包前必须备份并执行 001–029。
- 迁移后必须完成登录、clone、AI reserve/commit/release、支付结果恢复、世界脉搏静态资源和跨账户隔离冒烟。
