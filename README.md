# AI Meeting Assistant for DeepSeek Harness

一个可独立安装的 DeepSeek Harness Web 会议助手插件。从麦克风录音、实时转写、会中 AI 问答，到会后纪要、历史记录和 Markdown 导出，全部在一个会议工作台中完成。

> 当前版本：`0.7.1`  
> 运行环境：DeepSeek Harness Web + Node.js 20+ + Chrome/Edge

## 功能亮点

- **实时录音与转写**：使用浏览器麦克风和内置语音识别，实时显示会议逐字稿。
- **完整原始录音**：会议音频保存为 16 kHz 单声道 WAV，可在历史记录中播放和下载。
- **联网 AI 助手**：结合会议上下文、通用知识和 Harness 联网搜索回答问题，并展示来源。
- **文字与语音提问**：支持输入问题、语音提问以及自定义唤醒词。
- **语音回答**：将模型生成的文字答案原样播报，支持随时中止；云端 TTS 不可用时自动使用系统语音。
- **结构化会议纪要**：结束会议后自动整理摘要、关键结论、待办事项、负责人、时间节点和风险争议。
- **会议历史沉淀**：保存会议过程、逐字稿、问答、录音和最终纪要，并支持下载 Markdown。
- **安全启动**：开始会议前检查麦克风；设备缺失或权限被拒绝时不会生成空会议记录。

## 工作流程

```text
麦克风录音
  ├─ 浏览器语音识别 ──> 实时逐字稿
  └─ PCM 音频上传 ────> 本地 WAV 原始录音

逐字稿 + 用户问题
  └─ Harness 模型 + 可选联网搜索 ──> 文字回答 ──> TTS 语音播报

结束会议
  └─ AI 结构化整理 ──> Markdown 纪要 + 历史记录 + 可下载录音
```

更详细的实现说明见 [架构文档](./docs/architecture.md)。

## 环境要求

- DeepSeek Harness Web profile
- Node.js 20 或更高版本
- 最新版 Chrome 或 Edge
- 浏览器已允许麦克风权限
- Harness 中已配置可用的文本模型
- 可选：火山引擎 TTS 的 App ID、Access Token、Resource ID 和 Speaker ID

## 安装

### 从源码安装

```powershell
git clone https://github.com/<your-name>/dsh-meeting-assistant.git
cd dsh-meeting-assistant
npm install
npm test
npm pack
npx.cmd @deepseek-ai/dsh plugin --profile web add .\meeting-assistant-dsh-meeting-minutes-0.7.1.tgz
```

安装或升级插件后，请重启 DeepSeek Harness Web 服务。如果页面仍显示旧版本，可按 `Ctrl + F5` 强制刷新。

### 开始使用

1. 打开 DeepSeek Harness Web。
2. 点击右下角的“记”进入会议助手。
3. 可在“设置”中修改唤醒词和自动语音回答偏好。
4. 输入会议标题，点击“开始会议”，并允许浏览器使用麦克风。
5. 会中可以直接输入问题，或点击“语音提问”。
6. 点击“结束会议”后，插件会生成并保存完整会议纪要。
7. 在“历史纪要”中查看全过程、逐字稿、录音和 Markdown 文档。

## 配置

插件会自动使用 Harness 中可用的文本模型，也可以在插件配置中固定提供商、模型、人格和数据目录：

```yaml
- id: meeting-assistant
  name: '@meeting-assistant/dsh-meeting-minutes'
  config:
    provider: 'your-provider'
    model: 'your-model'
    persona: '你是一位专业、可靠、简洁的会议助手。'
    outputDir: 'D:\meeting-assistant-data'
```

默认数据目录为 Harness 启动目录下的 `meeting-assistant-data`，也可通过环境变量 `MEETING_ASSISTANT_OUTPUT_DIR` 修改。

### 火山引擎语音播报

插件使用标准单人 TTS，确保播报内容与模型文字答案一致：

```yaml
- id: meeting-assistant
  name: '@meeting-assistant/dsh-meeting-minutes'
  config:
    volcengineAppId: '你的 App ID'
    volcengineAccessTokenEnv: 'MEETING_ASSISTANT_VOLCENGINE_ACCESS_TOKEN'
    volcengineTtsResourceId: 'volc.service_type.10029'
    volcengineSpeaker: 'zh_male_shenyeboke_moon_bigtts'
```

请通过 Harness 凭据服务保存 Access Token，不要把真实密钥写入配置文件、源码或 Git 仓库。云端 TTS 暂时不可用时，插件会自动使用浏览器系统语音朗读答案。

## 本地数据

```text
meeting-assistant-data/
  <日期>_<会议标题>_<id>.wav       # 原始录音
  <日期>_<会议标题>_<id>.md        # 最终纪要
  voice/*.mp3                     # AI 语音回答
  .history/<meeting-id>.json      # 会议过程与历史索引
```

历史记录默认保存在本机，不会提交到 Git。删除数据目录前请先备份需要保留的录音和纪要。

## 隐私说明

- 录音、历史 JSON 和 Markdown 默认保存在本地。
- 浏览器转写由浏览器语音识别能力完成，具体数据处理方式取决于浏览器供应商。
- 提问和生成纪要时，相关转写文本会发送给 Harness 中启用的模型。
- 使用联网回答时，必要的检索词会发送给 Harness 搜索服务。
- 使用云端语音时，模型生成的回答文本会发送给火山引擎 TTS。
- 当前版本只采集麦克风输入，不捕获系统扬声器回放。

## 常见问题

### 提示没有录音设备

确认麦克风已连接，并在浏览器地址栏中允许当前站点使用麦克风。插件会停留在开始页面，不会创建空纪要。

### 没有实时转写

请使用最新版 Chrome 或 Edge，并确认浏览器支持语音识别。不同浏览器和地区的识别可用性可能不同。

### AI 有文字回答但没有声音

先检查会议助手设置中的“自动语音回答”。如果火山引擎未配置，插件会尝试使用浏览器系统语音。

### 安装后看不到入口

重启 Harness Web 服务，再按 `Ctrl + F5` 刷新页面。

## 开发与测试

```powershell
npm install
npm test
```

测试覆盖纪要结构化、录音保存、历史记录、会议取消清理和运行时核心流程。

## 许可证

[MIT](./LICENSE)
