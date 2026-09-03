# FanDo 源码抽取说明

## 源码参考位置

参考仓库：`D:\codeProject\codeProjectfando.ai.fandow.com`

这不是对 FanDo 整个仓库每一行的逐字阅读。审计范围是会议功能的完整边界：先盘点全部会议生产文件和测试，再逐行阅读端到端关键链路，并对其余会议文件做符号、调用关系和契约扫描。

- 会议生产文件：100 个，约 17,990 行。
- 会议测试文件：53 个，约 19,754 行。
- 完整关键链路：入口与会话状态、麦克风采集、PCM Hub、实时 ASR、实时模型问答、停止/清理顺序、纪要生成、结果保存。

本插件重点读取和抽取了以下会议纪要代码：

| FanDo 源文件 | 读取到的职责 | 独立插件落点 |
| --- | --- | --- |
| `src/components/meeting/MeetingSessionProvider.tsx` | 打开、开始、停止、恢复和会话 UI 生命周期 | `client.js` 的完整会议工作台 |
| `src/lib/meeting-audio-capture.ts` | 单声道采集、16 kHz 重采样、PCM s16le 量化和停止排空 | `BrowserMeetingCapture` |
| `electron/services/meeting/session/meeting-session-coordinator.ts` | ASR、音频 Hub、助手热插拔和幂等停止编排 | `MeetingRuntime` 生命周期 |
| `electron/services/meeting/realtime/backend-realtime-meeting-asr-source.ts` | FanDo start/WS/audio.frame/ack/stop 协议和背压 | `FandoRealtimeAsr` |
| `electron/services/meeting/realtime/realtime-meeting-sidecar.ts` | 同一会议中的转写与模型交互 | `/ask` + `HarnessModelService` |
| `electron/services/meeting/shared/meeting-minutes-service.ts` | 纪要字段、说话人核对、Markdown 结构、无模型时的降级原则 | `minutes-core.js` |
| `shared/meeting/meeting-summary-contract.ts` | 纪要列表与摘要输出的稳定字段 | 工具输入/输出 schema |
| `electron/services/meeting/record/semantic-meeting-record-service.ts` | 只保留有证据支持的事实、避免修订时丢失既有事实 | DSH system prompt 的事实约束 |
| `electron/services/meeting/persistence/meeting-local-memory-contract.ts` | 摘要、来源片段和内容状态的分层 | `summary` 规范和后续持久化设计 |
| `tests/unit/meeting/shared/meeting-minutes-service.test.ts` | 标题不重复、说话人核对、无内容降级等验收规则 | `test.mjs` |

## 已抽出的代码边界

- `buildMeetingMinutesMarkdown`：从 FanDo 的确定性 Markdown 生成逻辑移植而来。
- `buildSpeakerReviewNotes`：保留通用说话人标签必须人工核对的规则。
- `buildMeetingMinutes`：把工具输入归一化为 FanDo 纪要结构。
- DSH 工具 schema：约束模型显式提供摘要、结论、待办、负责人、时间节点和风险；没有证据时必须传空数组。

## 改写而非直接复制的代码

以下模块与 FanDo Electron/OpenClaw 运行时强绑定，不能原样放进独立 DSH 插件：

- Electron IPC、`BrowserWindow` 和 Renderer 麦克风采集。
- FanDo OA 登录态和员工工号读取。
- OpenClaw Gateway RPC 和 `feishu_create_doc` 工具调用。
- FanDo 本地 SQLite 路径和结果中心 React 页面。

FanDo HTTP/WebSocket ASR 协议已经改写为 DSH Host 侧实现；Harness 模型服务替代 OpenClaw Gateway；Markdown 文档改为插件本地原子保存。Electron 窗口、OA 登录态、SQLite 结果中心和飞书发布不进入独立插件。完整对应关系见 [architecture.md](./architecture.md)。
