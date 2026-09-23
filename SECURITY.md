# 安全与隐私

## API Key

- 请只在插件“设置”页面中填写文本模型、TTS 或 STT 的 API Key。
- Key 通过 DSH 凭据服务分别保存为 `MEETING_ASSISTANT_TEXT_API_KEY`、`MEETING_ASSISTANT_TTS_API_KEY` 和 `MEETING_ASSISTANT_STT_API_KEY`。
- `.model-settings.json` 只保存模型地址、模型名称、模式和音色，不保存 Key。
- 浏览器查询配置时只会收到 `keyConfigured: true/false`，不会收到 Key 本身。
- 不要把真实 Key 写入 README、截图、Issue、日志、Shell 历史、源码或 Git 配置。

如果怀疑 Key 已泄露，请立即在服务商控制台撤销并重新生成，然后在插件设置页更新。

## 本地数据

录音、逐字稿、问答和纪要默认保存在 DSH 启动目录下的 `meeting-assistant-data`。该目录已加入 `.gitignore`，但仍应根据所在组织的隐私和数据保留规则妥善管理。

## 报告安全问题

请不要通过公开 Issue 提交包含真实凭据、会议录音或敏感逐字稿的报告。可以先创建不含敏感数据的最小复现，并在描述中说明需要私下提供细节。
