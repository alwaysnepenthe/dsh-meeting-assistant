import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { apply } from './index.js'
import { LocalAudioRecorder, MeetingRuntime } from './meeting-runtime.js'
import { MeetingModelConfiguration } from './model-config.js'
import { collectAudioFromSse } from './volcengine-voice.js'
import {
  buildMeetingMinutes,
  buildMeetingMinutesMarkdown,
  buildSpeakerReviewNotes,
  normalizeStringList,
} from './minutes-core.js'

assert.deepEqual(normalizeStringList([' 决定 A ', '', '决定 A', '决定 B']), ['决定 A', '决定 B'])

const notes = buildSpeakerReviewNotes('Speaker 1: 同意方案。\nSpeaker 2: 明天提交。')
assert.equal(notes.length, 1)
assert.match(notes[0], /Speaker 1/)
assert.match(notes[0], /Speaker 2/)

const result = buildMeetingMinutes({
  title: '项目评审会',
  transcript: '- （00:01）**说话人 1**：采用方案 B。\n- （00:08）**说话人 2**：我明天提交文档。',
  overview: '团队确认采用方案 B，并安排文档提交。',
  decisions: ['采用方案 B。'],
  actionItems: ['说话人 2：明天提交文档。'],
  owners: ['说话人 2'],
  timeline: ['明天'],
  risks: [],
})

assert.equal(result.title, '项目评审会')
assert.equal(result.transcriptLength > 0, true)
assert.match(result.markdown, /^## 摘要/m)
assert.match(result.markdown, /## 关键结论/)
assert.match(result.markdown, /采用方案 B。/)
assert.match(result.markdown, /明天提交文档/)
assert.match(result.markdown, /请人工确认说话人真实姓名/)
assert.doesNotMatch(result.markdown, /^# 项目评审会/m)

const formatted = buildMeetingMinutesMarkdown({
  transcript: 'Speaker 1: Confirmed.',
  summary: result.summary,
  startedAt: '10:00',
  endedAt: '10:30',
})
assert.match(formatted, /开始时间：10:00/)
assert.match(formatted, /Speaker 1: Confirmed/)

const empty = buildMeetingMinutes({ title: '空会议', transcript: '', overview: '', decisions: [] })
assert.match(empty.markdown, /暂未形成可核验的会议摘要/)
assert.match(empty.markdown, /未提供逐字稿/)

const registeredTools = []
let registeredPrompt
let registeredRoute
apply({
  effect(setup) { return setup() },
  webServer: { register(value) { registeredRoute = value; return () => undefined } },
  llm: {
    listProviders() { return [{ id: 'test-provider' }] },
    async listModels() { return [{ id: 'test-model' }] },
  },
  logger: { warn() {} },
  systemPrompt: { section(value) { registeredPrompt = value } },
  tools: { register(value) { registeredTools.push(value) } },
})

assert.equal(registeredPrompt.name, 'tool:meeting-minutes')
assert.equal(registeredRoute.path, '/meeting-assistant/api')
const registeredTool = registeredTools.find((tool) => tool.name === 'meeting_minutes')
const statusTool = registeredTools.find((tool) => tool.name === 'meeting_runtime_status')
assert.equal(registeredTool.name, 'meeting_minutes')
assert.equal(statusTool.name, 'meeting_runtime_status')
assert.equal(registeredTool.parameters.type, 'object')
assert.deepEqual(registeredTool.parameters.required, [
  'title', 'transcript', 'overview', 'decisions', 'actionItems', 'owners', 'timeline', 'risks',
])

const controller = new AbortController()
const toolResult = await registeredTool.execute({
  title: '工具调用验证',
  transcript: 'Speaker 1: 采用方案 B。',
  overview: '确认采用方案 B。',
  decisions: ['采用方案 B。'],
  actionItems: [],
  owners: [],
  timeline: [],
  risks: [],
}, { signal: controller.signal })
assert.match(toolResult.markdown, /确认采用方案 B/)
assert.deepEqual(registeredTool.output.render({}, toolResult), [{ type: 'text', text: toolResult.markdown }])

const status = await statusTool.execute({}, { signal: controller.signal })
assert.equal(status.model.provider, 'test-provider')
assert.equal(status.model.model, 'test-model')
assert.equal(status.ready, true)
assert.equal(status.asrConfigured, true)
assert.equal(status.recommendedAsrMode, 'browser')

const defaultModelRuntime = new MeetingRuntime({
  agentDefaultModel: { currentSelection: () => ({ provider: 'default-provider', model: 'default-model' }) },
  llm: {
    listProviders() { return [{ id: 'first-provider' }, { id: 'default-provider' }] },
    async listModels(provider) {
      return provider === 'default-provider' ? [{ id: 'first-model' }, { id: 'default-model' }] : [{ id: 'first-model' }]
    },
  },
})
assert.deepEqual(await defaultModelRuntime.model.resolveSelection(), { provider: 'default-provider', model: 'default-model' })

await assert.rejects(
  () => registeredTool.execute({ title: '缺少字段' }, { signal: controller.signal }),
  /transcript must be a string/,
)

const runtimeOutputDir = await mkdtemp(path.join(tmpdir(), 'fando-meeting-runtime-'))
const credentialValues = new Map()
const modelConfiguration = new MeetingModelConfiguration({
  credentials: {
    async describe(ref) { return { configured: credentialValues.has(String(ref)), writable: true } },
    async set(ref, value) { credentialValues.set(String(ref), value) },
    async resolve(ref) { return credentialValues.has(String(ref)) ? { value: credentialValues.get(String(ref)), source: 'file' } : undefined },
  },
  logger: { warn() {} },
}, runtimeOutputDir)
const configuredModels = await modelConfiguration.save({
  text: { mode: 'custom', baseUrl: 'https://models.example.test/v1/', model: 'chat-model', apiKey: 'text-secret' },
  tts: { baseUrl: 'https://voice.example.test/v1', model: 'speech-model', voice: 'alloy', apiKey: 'tts-secret' },
  stt: { baseUrl: 'https://voice.example.test/v1', model: 'whisper-model', apiKey: 'stt-secret' },
})
assert.equal(configuredModels.text.configured, true)
assert.equal(configuredModels.tts.configured, true)
assert.equal(configuredModels.stt.configured, true)
assert.equal(JSON.stringify(configuredModels).includes('secret'), false)
assert.equal((await readFile(path.join(runtimeOutputDir, '.model-settings.json'), 'utf8')).includes('secret'), false)
await modelConfiguration.save({ text: { mode: 'dsh' } })
const wavRecorder = new LocalAudioRecorder({ outputDir: runtimeOutputDir, title: '录音验证', meetingId: 'wav-test-12345678' })
await wavRecorder.start()
wavRecorder.appendPcm(new Int16Array([100, -100]))
const wavResult = await wavRecorder.stop()
const wavBytes = await readFile(wavResult.path)
assert.equal(wavBytes.subarray(0, 4).toString('ascii'), 'RIFF')
assert.equal(wavBytes.subarray(8, 12).toString('ascii'), 'WAVE')
assert.equal(wavBytes.readUInt32LE(24), 16000)
assert.equal(wavBytes.readUInt32LE(40), 4)
assert.equal(wavBytes.length, 48)
assert.deepEqual(collectAudioFromSse('data: {"code":20000000,"data":"AQID"}\n\ndata: {"code":20000000,"data":"BAU="}\n'), Buffer.from([1, 2, 3, 4, 5]))
const llmPrompts = []
const fakeAsrInstances = []
const fakeLocalRecorders = []
const runtime = new MeetingRuntime({
  llm: {
    listProviders() { return [{ id: 'test-provider' }] },
    async listModels() { return [{ id: 'test-model' }] },
    async *stream(options) {
      llmPrompts.push(options)
      const promptText = options.messages[0].content[0].text
      if (promptText.includes('只输出严格 JSON')) {
        yield { type: 'text-delta', text: JSON.stringify(promptText.includes('当前问题：北京今天的天气')
          ? { answer: '', searchQuery: '北京今日天气' }
          : { answer: '当前结论是采用方案 B。', searchQuery: null }) }
      } else if (promptText.includes('联网结果')) {
        yield { type: 'text-delta', text: '北京今天晴，最高 30℃。[1]' }
      } else {
        yield {
          type: 'text-delta',
          text: JSON.stringify({
            overview: '团队确认采用方案 B，并由张三明天提交文档。',
            decisions: ['采用方案 B。'],
            actionItems: ['张三明天提交文档。'],
            owners: ['张三'],
            timeline: ['明天'],
            risks: [],
            speakerNotes: [],
          }),
        }
      }
      yield { type: 'finish', reason: 'stop' }
    },
  },
  web: {
    async search({ query }) {
      assert.equal(query, '北京今日天气')
      return { content: '北京今天晴，最高 30℃。', sources: [{ title: '天气服务', url: 'https://weather.example.test' }] }
    },
  },
  logger: { warn() {} },
}, {
  backendBaseUrl: 'https://mock.fando.test',
  workNo: '10001',
  outputDir: runtimeOutputDir,
  createAsr(options) {
    const instance = {
      started: false,
      stopped: false,
      cancelled: false,
      frames: [],
      async start() {
        this.started = true
        options.onTranscript({ id: 'seg-1', text: '采用方案 B，由张三明天提交文档。', speaker: '张三', startMs: 0, isFinal: true })
      },
      appendPcm(pcm) { this.frames.push([...pcm]) },
      async stop() { this.stopped = true },
      close() {},
    }
    fakeAsrInstances.push(instance)
    return instance
  },
  createLocalRecorder() {
    const instance = {
      started: false,
      stopped: false,
      frames: [],
      async start() { this.started = true },
      appendPcm(pcm) { this.frames.push([...pcm]) },
      async stop() {
        this.stopped = true
        return { filename: 'browser-recording.wav', path: 'D:\\meeting-documents\\browser-recording.wav', format: 'wav', sampleRate: 16000, channels: 1, durationMs: 500 }
      },
      async cancel() { this.cancelled = true },
      close() {},
    }
    fakeLocalRecorders.push(instance)
    return instance
  },
})

const pcmFrame = Buffer.alloc(4)
pcmFrame.writeInt16LE(100, 0)
pcmFrame.writeInt16LE(-100, 2)
const browserMeeting = await runtime.start({ title: '浏览器会议' })
assert.equal(browserMeeting.phase, 'recording')
assert.equal(browserMeeting.asrMode, 'browser')
assert.equal(fakeLocalRecorders[0].started, true)
runtime.appendAudio({ meetingId: browserMeeting.meetingId, sequence: 0, pcmBase64: pcmFrame.toString('base64') })
await assert.rejects(
  () => runtime.appendTranscript({ meetingId: browserMeeting.meetingId, text: '????????????', isFinal: true }),
  /TRANSCRIPT_ENCODING_CORRUPTED_USE_UTF8/,
)
await assert.rejects(
  () => runtime.ask({ meetingId: browserMeeting.meetingId, question: '????????????' }),
  /QUESTION_ENCODING_CORRUPTED_USE_UTF8/,
)
runtime.appendTranscript({ meetingId: browserMeeting.meetingId, text: '这是临时内容', isFinal: false, startMs: 100 })
const browserTranscriptState = await runtime.appendTranscript({ meetingId: browserMeeting.meetingId, text: '确认采用方案 B。', isFinal: true, startMs: 200 })
assert.equal(browserTranscriptState.partialTranscript, '')
assert.equal(browserTranscriptState.segments[0].text, '确认采用方案 B。')
const browserAnswer = await runtime.ask({ meetingId: browserMeeting.meetingId, question: '浏览器转写中的结论是什么？' })
assert.match(browserAnswer.answer, /方案 B/)
const weatherAnswer = await runtime.ask({ meetingId: browserMeeting.meetingId, question: '北京今天的天气怎么样？' })
assert.match(weatherAnswer.answer, /30℃/)
assert.equal(weatherAnswer.searchQuery, '北京今日天气')
assert.equal(weatherAnswer.sources.length, 1)
const completedBrowserMeeting = await runtime.stop({ meetingId: browserMeeting.meetingId })
assert.equal(completedBrowserMeeting.phase, 'completed')
assert.equal(fakeLocalRecorders[0].stopped, true)
assert.equal(completedBrowserMeeting.recording.filename, 'browser-recording.wav')
const browserMarkdown = await readFile(completedBrowserMeeting.document.path, 'utf8')
assert.match(browserMarkdown, /## 录音文件/)
assert.match(browserMarkdown, /browser-recording\.wav/)
assert.match(browserMarkdown, /确认采用方案 B/)
const history = await runtime.listHistory()
assert.equal(history.length, 1)
assert.equal(history[0].eventCount > 0, true)
const historyEntry = await runtime.readHistory(browserMeeting.meetingId)
assert.equal(historyEntry.turns.length, 2)
assert.equal(historyEntry.events.some((event) => event.type === 'meeting_completed'), true)
assert.match(historyEntry.document.markdown, /北京今天的天气怎么样/)
const cancelledMeeting = await runtime.start({ title: '启动失败清理验证' })
const cancelResult = await runtime.cancel({ meetingId: cancelledMeeting.meetingId })
assert.equal(cancelResult.cancelled, true)
assert.equal(fakeLocalRecorders[1].cancelled, true)
assert.equal((await runtime.listHistory()).length, 1)
await assert.rejects(() => runtime.readHistory(cancelledMeeting.meetingId), /ENOENT/)
await rm(runtimeOutputDir, { recursive: true, force: true })

console.log('meeting assistant core and runtime tests passed')
