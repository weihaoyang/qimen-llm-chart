# Agent 聊天栏交接说明

更新时间：2026-08-30

## 当前目标

`/paipan` 右侧 Agent 采用聊天优先结构：预设问题作为首屏入口，消息区独立滚动，输入区固定在右栏底部，并提供完整报告入口。左侧盘面和右侧 Agent 共享视口高度，但不能互相撑开。

## 已完成

- `src/components/inspector-panel.tsx`
  - 游客未开通时仍渲染预设问题卡片。
  - 预设问题可以直接触发分析，不依赖 `agentStreamConfig` 是否已挂载。
  - 结果空状态不再占据聊天区。
  - “生成完整报告”移动到 Agent 底部操作区。
  - 已开通时继续使用 `AgentChatThread` 的 SDK 消息历史和流式状态。

- `src/components/agent-chat-thread.tsx`
  - 保持 `@ai-sdk/react` + `TextStreamChatTransport`。
  - 消息按历史顺序渲染，支持连续追问、流式状态、错误状态和自动滚到底部。

- `src/app/paipan/paipan.css`
  - 桌面端左 2/3、右 1/3 布局。
  - Agent 外层、Tabs、Pane、Panel 均继承固定高度并允许 `min-height: 0`。
  - 右栏消息结果区独立滚动，输入区和操作区留在底部。
  - Radix ScrollArea 的真实节点 `[data-radix-scroll-area-viewport]` 已纳入高度规则。
  - 游客恢复提示不再挤出消息区。

## 已验证证据

- `npm run build`：通过（Next Webpack、TypeScript、静态页面生成均通过）。
- 旧电脑最后一次验证时 3102 只启动了一个 Next production 实例；换电脑后端口状态不继承，接手时需重新启动。
- 页面：`http://127.0.0.1:3102/paipan` 可正常返回。
- DOM：预设问题 `6` 个；“生成完整报告”按钮可见。
- 视口：右栏 Agent 在固定高度内，输入区位于结果区下方；左侧盘面没有被 Agent 内容撑开。
- 截图：已确认最新版不是旧构建，预设卡、输入框、权益操作和完整报告入口均出现在右栏。

## 启动方式

在 `F:\qmdj`（新电脑首次接手）：

```powershell
npm run build
node node_modules\next\dist\bin\next start -p 3102
```

启动前先确认没有旧实例占用 3102；只保留一个 `next start`。不要混用 `next dev`、standalone `server.js` 或手工拼接 `.next/static`。

如果新电脑没有 `F:\qmdj`，先从版本库恢复到该路径，再执行上面的构建和启动命令；不要从旧 `.next` 目录或临时压缩包拼装运行版本。

## 接手 Agent 的首要检查

1. `git status --short`，确认只处理与本任务相关的文件。
2. 访问 `/paipan`，确认右栏预设卡、底部输入框、完整报告入口均可见。
3. 在已授权权益环境点击一个预设，确认消息流接管结果区并可连续追问。
4. 用长回答验证 `[data-radix-scroll-area-viewport]` 的 `scrollHeight > clientHeight`，滚动不能影响左侧盘面。
5. 如需上线，按生产拓扑先备份、构建、重启实际容器，再做 health/readiness 和无扣款冒烟；本次未执行生产部署。

## 有意未处理

当前工作树还有此前任务遗留的 Cesium 构建产物、临时日志和其他产品改动。本次交接不清理、不提交这些文件，避免误删用户成果。后续清理必须单独确认范围并保留可恢复备份。
