import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'

import { buildMeetingMinutes } from './minutes-core.js'
import { HarnessModelService, normalizeSummary } from './model-service.js'
import { VolcengineTtsVoice } from './volcengine-voice.js'

const SAMPLE_RATE = 16_000
const FRAME_SAMPLES = 800
const MAX_PENDING_FRAMES = 400
const MAX_BODY_BYTES = 2 * 1024 * 1024
const MAX_LOCAL_AUDIO_QUEUE_BYTES = 32 * 1024 * 1024
const FANDO_MEETING_BACKEND_DEFAULT = 'https://cloud.fandow.com/gpt/fando-meeting-assistant'

function nowIso() {
  return new Date().toISOString()
}

function safeFilename(value) {
  return String(value || '会议纪要')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || '会议纪要'
}

function readableText(value, field) {
  const text = String(value || '').trim()
  const replacementCount = (text.match(/[?�]/g) || []).length
  if (text.length >= 4 && replacementCount >= 4 && replacementCount / text.length >= 0.3) {
    throw new Error(`${field}_ENCODING_CORRUPTED_USE_UTF8`)
  }
  return text
}

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('REQUEST_BODY_TOO_LARGE')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function transcriptText(segments) {
  return segments
    .filter((segment) => segment.isFinal && segment.text)
    .map((segment) => {
      const seconds = Math.max(0, Math.floor((segment.startMs || 0) / 1000))
      const stamp = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
      return `[${stamp}] ${segment.speakerName || segment.speakerLabel || '说话人'}：${segment.text}`
    })
    .join('\n')
}

function publicMeeting(meeting) {
  return {
    meetingId: meeting.meetingId,
    title: meeting.title,
    phase: meeting.phase,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
    durationMs: Math.max(0, (meeting.endedAt ? Date.parse(meeting.endedAt) : Date.now()) - Date.parse(meeting.startedAt)),
    partialTranscript: meeting.partialTranscript,
    segments: meeting.segments.slice(-200),
    turns: meeting.turns,
    warnings: meeting.warnings,
    error: meeting.error,
    document: meeting.document,
    model: meeting.model,
    asrMode: meeting.asrMode,
    recording: meeting.recording,
    events: (meeting.events || []).slice(-200),
    audio: { receivedFrames: meeting.receivedFrames, highestSequence: meeting.highestSequence },
  }
}

function persistedMeeting(meeting) {
  return {
    ...publicMeeting(meeting),
    partialTranscript: '',
    segments: meeting.segments,
    turns: meeting.turns,
    events: meeting.events || [],
    updatedAt: nowIso(),
  }
}

function historySummary(meeting) {
  return {
    meetingId: meeting.meetingId,
    title: meeting.title,
    phase: meeting.phase,
    startedAt: meeting.startedAt,
    endedAt: meeting.endedAt,
    durationMs: meeting.durationMs,
    asrMode: meeting.asrMode,
    eventCount: Array.isArray(meeting.events) ? meeting.events.length : 0,
    transcriptCount: Array.isArray(meeting.segments) ? meeting.segments.length : 0,
    turnCount: Array.isArray(meeting.turns) ? meeting.turns.length : 0,
    document: meeting.document ? {
      id: meeting.document.id,
      title: meeting.document.title,
      filename: meeting.document.filename,
      path: meeting.document.path,
    } : null,
    warnings: meeting.warnings || [],
  }
}

function wavHeader(dataBytes) {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataBytes, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataBytes, 40)
  return header
}

export class LocalAudioRecorder {
  constructor({ outputDir, title, meetingId }) {
    this.outputDir = outputDir
    this.title = title
    this.meetingId = meetingId
    this.handle = null
    this.rawPath = null
    this.writeChain = Promise.resolve()
    this.writeError = null
    this.sampleCount = 0
    this.queuedBytes = 0
    this.completed = null
  }

  async start() {
    await mkdir(this.outputDir, { recursive: true })
    this.rawPath = path.join(this.outputDir, `.${this.meetingId}.pcm.part`)
    this.handle = await open(this.rawPath, 'w')
  }

  appendPcm(pcm) {
    if (!this.handle) throw new Error('LOCAL_AUDIO_RECORDER_NOT_STARTED')
    if (this.writeError) throw this.writeError
    const chunk = Buffer.from(new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength))
    this.queuedBytes += chunk.byteLength
    if (this.queuedBytes > MAX_LOCAL_AUDIO_QUEUE_BYTES) throw new Error('LOCAL_AUDIO_BACKPRESSURE')
    this.writeChain = this.writeChain.then(async () => {
      await this.handle.write(chunk)
      this.sampleCount += pcm.length
      this.queuedBytes -= chunk.byteLength
    }).catch((error) => {
      this.writeError = error instanceof Error ? error : new Error(String(error))
      this.queuedBytes -= chunk.byteLength
    })
  }

  async stop() {
    if (this.completed) return this.completed
    await this.writeChain
    if (this.writeError) throw this.writeError
    if (!this.handle || !this.rawPath) throw new Error('LOCAL_AUDIO_RECORDER_NOT_STARTED')
    await this.handle.close()
    this.handle = null
    const filename = `${safeFilename(this.title)}_${this.meetingId.slice(0, 8)}.wav`
    const filePath = path.join(this.outputDir, filename)
    const dataBytes = this.sampleCount * 2
    const output = await open(filePath, 'w')
    await output.write(wavHeader(dataBytes))
    await output.close()
    await pipeline(createReadStream(this.rawPath), createWriteStream(filePath, { flags: 'a' }))
    await unlink(this.rawPath)
    this.rawPath = null
    this.completed = {
      filename,
      path: filePath,
      format: 'wav',
      sampleRate: SAMPLE_RATE,
      channels: 1,
      durationMs: Math.round((this.sampleCount / SAMPLE_RATE) * 1000),
    }
    return this.completed
  }

  async cancel() {
    await this.writeChain
    if (this.handle) {
      await this.handle.close()
      this.handle = null
    }
    if (this.rawPath) {
      await unlink(this.rawPath).catch((error) => {
        if (error?.code !== 'ENOENT') throw error
      })
      this.rawPath = null
    }
  }

  close() {
    if (this.handle) void this.stop().catch(() => undefined)
  }
}

class FandoRealtimeAsr {
  constructor({ backendBaseUrl, workNo, title, participantWorkNos, onTranscript, onWarning }) {
    this.backendBaseUrl = backendBaseUrl.replace(/\/+$/, '')
    this.workNo = workNo
    this.title = title
    this.participantWorkNos = participantWorkNos
    this.onTranscript = onTranscript
    this.onWarning = onWarning
    this.socket = null
    this.remoteSessionId = null
    this.buffer = new Int16Array(0)
    this.seq = 0
    this.pending = new Set()
    this.stopWaiter = null
    this.closedForStop = false
  }

  async start() {
    const response = await fetch(`${this.backendBaseUrl}/api/v1/meeting/realtime/start`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        work_no: this.workNo,
        participant_work_nos: this.participantWorkNos,
        title: this.title,
        audio_format: 'pcm_s16le',
        sample_rate: SAMPLE_RATE,
        channels: 1,
        frame_duration_ms: 50,
      }),
    })
    if (!response.ok) throw new Error(`REALTIME_ASR_SESSION_START_HTTP_${response.status}`)
    const body = await response.json()
    const remoteSessionId = String(body?.data?.session?.id || '').trim()
    if (body?.code !== 0 || !remoteSessionId) throw new Error(String(body?.message || 'REALTIME_ASR_SESSION_START_FAILED'))
    this.remoteSessionId = remoteSessionId
    await this.connect()
  }

  async connect() {
    if (typeof WebSocket !== 'function') throw new Error('NODE_WEBSOCKET_UNAVAILABLE')
    const url = `${this.backendBaseUrl.replace(/^http/, 'ws')}/api/v1/meeting/realtime/${this.remoteSessionId}/ws?work_no=${encodeURIComponent(this.workNo)}`
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(url)
      this.socket = socket
      let opened = false
      socket.addEventListener('open', () => {
        opened = true
        resolve()
      }, { once: true })
      socket.addEventListener('error', () => {
        if (!opened) reject(new Error('REALTIME_ASR_WS_CONNECT_FAILED'))
        else this.onWarning('REALTIME_ASR_WS_NETWORK_ERROR')
      })
      socket.addEventListener('message', (event) => this.handleMessage(event.data))
      socket.addEventListener('close', (event) => {
        this.socket = null
        if (!this.closedForStop && !this.stopWaiter) this.onWarning(`REALTIME_ASR_WS_CLOSED_${event.code}`)
        if (this.stopWaiter) this.finishStop(new Error('REALTIME_ASR_WS_CLOSED'))
      })
    })
  }

  handleMessage(raw) {
    try {
      const message = JSON.parse(typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8'))
      if (message.type === 'audio.ack' && Number.isFinite(message.data?.seq)) {
        this.pending.delete(Number(message.data.seq))
        return
      }
      if (message.type === 'transcript.partial' || message.type === 'transcript.final') {
        const data = message.data || {}
        this.onTranscript({
          id: String(data.id || `${Date.now()}`),
          text: String(data.text || '').trim(),
          speakerLabel: typeof data.speaker_label === 'string' ? data.speaker_label : null,
          speakerName: typeof data.speaker_name === 'string' ? data.speaker_name : null,
          startMs: Number.isFinite(data.start_ms) ? data.start_ms : 0,
          endMs: Number.isFinite(data.end_ms) ? data.end_ms : 0,
          isFinal: Boolean(data.is_final || message.type === 'transcript.final'),
        })
        return
      }
      if (message.type === 'error') {
        this.onWarning(String(message.message || message.code || 'REALTIME_ASR_ERROR'))
        return
      }
      if (message.type === 'session.stopped') {
        const minutes = message.data?.minutes
        if (!minutes?.meeting_id || minutes.status !== 'success') this.finishStop(new Error('REALTIME_ASR_STOP_RESULT_INVALID'))
        else this.finishStop(null, minutes)
      }
    } catch {
      this.onWarning('REALTIME_ASR_MALFORMED_MESSAGE')
    }
  }

  appendPcm(pcm) {
    const merged = new Int16Array(this.buffer.length + pcm.length)
    merged.set(this.buffer)
    merged.set(pcm, this.buffer.length)
    this.buffer = merged
    while (this.buffer.length >= FRAME_SAMPLES) {
      const frame = this.buffer.slice(0, FRAME_SAMPLES)
      this.buffer = this.buffer.slice(FRAME_SAMPLES)
      this.sendFrame(frame)
    }
  }

  sendFrame(frame) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) throw new Error('REALTIME_ASR_WS_CLOSED')
    if (this.pending.size >= MAX_PENDING_FRAMES) throw new Error('REALTIME_ASR_BACKPRESSURE')
    this.seq += 1
    this.pending.add(this.seq)
    const bytes = new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength)
    this.socket.send(JSON.stringify({
      type: 'audio.frame',
      seq: this.seq,
      audio_format: 'pcm_s16le',
      sample_rate: SAMPLE_RATE,
      channels: 1,
      duration_ms: 50,
      audio_base64: Buffer.from(bytes).toString('base64'),
    }))
  }

  stop(summaryMarkdown = '') {
    if (this.buffer.length > 0) {
      const tail = new Int16Array(FRAME_SAMPLES)
      tail.set(this.buffer.subarray(0, FRAME_SAMPLES))
      this.buffer = new Int16Array(0)
      this.sendFrame(tail)
    }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error('REALTIME_ASR_WS_CLOSED'))
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.finishStop(new Error('REALTIME_ASR_STOP_TIMEOUT')), 35_000)
      this.stopWaiter = { resolve, reject, timer }
      const payload = { type: 'stop', work_no: this.workNo }
      if (summaryMarkdown.trim()) payload.fando_summary_markdown = summaryMarkdown
      this.socket.send(JSON.stringify(payload))
    })
  }

  finishStop(error, value) {
    const waiter = this.stopWaiter
    if (!waiter) return
    clearTimeout(waiter.timer)
    this.stopWaiter = null
    this.closedForStop = true
    if (error) waiter.reject(error)
    else waiter.resolve(value)
  }

  close() {
    this.closedForStop = true
    this.socket?.close()
    this.socket = null
  }
}

export class MeetingRuntime {
  constructor(ctx, config = {}) {
    this.ctx = ctx
    this.config = config
    this.model = new HarnessModelService(ctx, config)
    this.asrFactory = typeof config.createAsr === 'function'
      ? config.createAsr
      : (options) => new FandoRealtimeAsr(options)
    this.localRecorderFactory = typeof config.createLocalRecorder === 'function'
      ? config.createLocalRecorder
      : (options) => new LocalAudioRecorder(options)
    this.active = null
    this.completed = new Map()
    this.outputDir = path.resolve(String(config.outputDir || process.env.MEETING_ASSISTANT_OUTPUT_DIR || path.join(process.cwd(), 'meeting-assistant-data')))
    this.historyDir = path.join(this.outputDir, '.history')
    this.persistChains = new Map()
    this.voice = new VolcengineTtsVoice(ctx, config, this.outputDir)
  }

  backendConfig() {
    return {
      backendBaseUrl: String(this.config.backendBaseUrl || process.env.FANDO_MEETING_BACKEND_URL || FANDO_MEETING_BACKEND_DEFAULT).trim(),
      workNo: String(this.config.workNo || process.env.FANDO_MEETING_WORK_NO || '').trim(),
    }
  }

  async status() {
    let model = null
    let modelError = null
    try { model = await this.model.resolveSelection() } catch (error) { modelError = error instanceof Error ? error.message : String(error) }
    let voice = { configured: false }
    try { voice = await this.voice.credentialStatus() } catch (error) { voice = { configured: false, error: error instanceof Error ? error.message : String(error) } }
    return {
      ready: Boolean(model),
      asrConfigured: true,
      recommendedAsrMode: 'browser',
      model,
      modelError,
      outputDir: this.outputDir,
      activeMeetingId: this.active?.meetingId ?? null,
      agent: { persona: '会议助手', webSearchAvailable: Boolean(this.ctx.web?.search) },
      voice,
    }
  }

  appendEvent(meeting, type, detail = {}) {
    meeting.events ||= []
    meeting.events.push({ id: randomUUID(), at: nowIso(), type, detail })
  }

  schedulePersist(meeting) {
    const previous = this.persistChains.get(meeting.meetingId) || Promise.resolve()
    const next = previous.then(() => this.persistMeeting(meeting)).catch((error) => {
      this.ctx.logger?.warn?.(`[fando-meeting] history persist failed: ${error instanceof Error ? error.message : String(error)}`)
    })
    this.persistChains.set(meeting.meetingId, next)
    return next
  }

  async persistMeeting(meeting) {
    await mkdir(this.historyDir, { recursive: true })
    const filePath = path.join(this.historyDir, `${meeting.meetingId}.json`)
    const temporary = `${filePath}.${randomUUID()}.tmp`
    await writeFile(temporary, JSON.stringify(persistedMeeting(meeting), null, 2), 'utf8')
    await rename(temporary, filePath)
  }

  async start(input) {
    if (this.active && !['completed', 'failed'].includes(this.active.phase)) throw new Error('ACTIVE_MEETING_EXISTS')
    const title = readableText(input.title, 'TITLE') || '临时会议'
    const asrMode = 'browser'
    const modelSelection = await this.model.resolveSelection()
    const meeting = {
      meetingId: randomUUID(), title, phase: 'starting', startedAt: nowIso(), endedAt: null,
      partialTranscript: '', segments: [], turns: [], warnings: [], error: null, document: null, model: null,
      asrMode, recording: null, browserTranscriptSequence: 0,
      receivedFrames: 0, highestSequence: -1, stopPromise: null, asr: null,
      events: [],
    }
    this.appendEvent(meeting, 'meeting_started', { title, asrMode })
    const asr = this.localRecorderFactory({ outputDir: this.outputDir, title, meetingId: meeting.meetingId })
    meeting.asr = asr
    this.active = meeting
    try {
      await asr.start()
      meeting.model = modelSelection
      meeting.phase = 'recording'
      this.appendEvent(meeting, 'recording_started', { model: modelSelection, asrMode })
      await this.schedulePersist(meeting)
      return publicMeeting(meeting)
    } catch (error) {
      meeting.phase = 'failed'
      meeting.endedAt = nowIso()
      meeting.error = error instanceof Error ? error.message : String(error)
      this.appendEvent(meeting, 'meeting_failed', { error: meeting.error })
      asr.close()
      this.completed.set(meeting.meetingId, meeting)
      await this.schedulePersist(meeting)
      throw error
    }
  }

  appendAudio(input) {
    const meeting = this.requireActive(input.meetingId)
    if (meeting.phase !== 'recording') throw new Error('MEETING_NOT_RECORDING')
    const sequence = Number(input.sequence)
    if (!Number.isInteger(sequence) || sequence < 0) throw new Error('INVALID_AUDIO_SEQUENCE')
    if (sequence <= meeting.highestSequence) return publicMeeting(meeting)
    const bytes = Buffer.from(String(input.pcmBase64 || ''), 'base64')
    if (bytes.byteLength === 0 || bytes.byteLength % 2 !== 0) throw new Error('INVALID_PCM_FRAME')
    meeting.highestSequence = sequence
    meeting.receivedFrames += 1
    const pcm = new Int16Array(bytes.byteLength / 2)
    for (let index = 0; index < pcm.length; index += 1) pcm[index] = bytes.readInt16LE(index * 2)
    meeting.asr.appendPcm(pcm)
    return { accepted: true, highestSequence: meeting.highestSequence }
  }

  applyTranscript(meeting, segment) {
    if (segment.isFinal) {
      const existing = meeting.segments.findIndex((item) => item.id === segment.id)
      if (existing >= 0) meeting.segments[existing] = segment
      else meeting.segments.push(segment)
      meeting.partialTranscript = ''
      this.appendEvent(meeting, 'transcript_final', {
        segmentId: segment.id,
        text: segment.text,
        speakerName: segment.speakerName || segment.speakerLabel || null,
        startMs: segment.startMs || 0,
      })
      void this.schedulePersist(meeting)
    } else meeting.partialTranscript = segment.text
  }

  async appendTranscript(input) {
    const meeting = this.requireActive(input.meetingId)
    if (meeting.phase !== 'recording') throw new Error('MEETING_NOT_RECORDING')
    if (meeting.asrMode !== 'browser') throw new Error('BROWSER_TRANSCRIPT_NOT_ENABLED')
    const text = readableText(input.text, 'TRANSCRIPT')
    if (!text) return publicMeeting(meeting)
    const isFinal = Boolean(input.isFinal)
    const sequence = isFinal ? ++meeting.browserTranscriptSequence : meeting.browserTranscriptSequence + 1
    this.applyTranscript(meeting, {
      id: isFinal ? `browser-${sequence}` : 'browser-partial',
      text,
      speakerLabel: '说话人',
      speakerName: null,
      startMs: Number.isFinite(input.startMs) ? Math.max(0, Number(input.startMs)) : Math.max(0, Date.now() - Date.parse(meeting.startedAt)),
      endMs: Number.isFinite(input.endMs) ? Math.max(0, Number(input.endMs)) : undefined,
      isFinal,
    })
    if (isFinal) await this.schedulePersist(meeting)
    return publicMeeting(meeting)
  }

  async ask(input, signal) {
    const meeting = this.requireMeeting(input.meetingId)
    if (!['recording', 'stopping'].includes(meeting.phase)) throw new Error('MEETING_NOT_INTERACTIVE')
    const question = readableText(input.question, 'QUESTION')
    if (!question) throw new Error('QUESTION_REQUIRED')
    this.appendEvent(meeting, 'question', { question })
    await this.schedulePersist(meeting)
    const result = await this.model.answerQuestion({
      title: meeting.title,
      transcript: transcriptText(meeting.segments),
      priorTurns: meeting.turns,
      question,
      signal,
    })
    meeting.model = result.selection
    const turn = {
      id: randomUUID(),
      askedAt: nowIso(),
      question,
      answer: result.text,
      searchQuery: result.searchQuery || null,
      sources: Array.isArray(result.sources) ? result.sources : [],
    }
    meeting.turns.push(turn)
    this.appendEvent(meeting, 'answer', {
      turnId: turn.id,
      answer: turn.answer,
      searchQuery: turn.searchQuery,
      sourceCount: turn.sources.length,
    })
    await this.schedulePersist(meeting)
    return turn
  }

  async stop(input, signal) {
    const meeting = this.requireActive(input.meetingId)
    if (meeting.stopPromise) return meeting.stopPromise
    meeting.phase = 'stopping'
    this.appendEvent(meeting, 'meeting_stopping')
    await this.schedulePersist(meeting)
    meeting.stopPromise = this.finishMeeting(meeting, signal)
    return meeting.stopPromise
  }

  async cancel(input) {
    const meeting = this.requireActive(input.meetingId)
    if (meeting.stopPromise) throw new Error('MEETING_ALREADY_STOPPING')
    meeting.phase = 'cancelled'
    try {
      if (typeof meeting.asr.cancel === 'function') await meeting.asr.cancel()
      else meeting.asr.close()
    } finally {
      if (this.active?.meetingId === meeting.meetingId) this.active = null
    }
    const pendingPersist = this.persistChains.get(meeting.meetingId)
    if (pendingPersist) await pendingPersist
    this.persistChains.delete(meeting.meetingId)
    await unlink(path.join(this.historyDir, `${meeting.meetingId}.json`)).catch((error) => {
      if (error?.code !== 'ENOENT') throw error
    })
    return { cancelled: true, meetingId: meeting.meetingId }
  }

  async finishMeeting(meeting, signal) {
    let stopError = null
    try {
      const stopResult = await meeting.asr.stop()
      if (meeting.asrMode === 'browser' && stopResult) meeting.recording = stopResult
    } catch (error) {
      stopError = error instanceof Error ? error.message : String(error)
      meeting.warnings.push(stopError)
    } finally {
      meeting.asr.close()
    }
    const transcript = transcriptText(meeting.segments)
    let summary
    try {
      const generated = await this.model.summarize({ title: meeting.title, transcript, turns: meeting.turns, signal })
      summary = generated.summary
      meeting.model = generated.selection
    } catch (error) {
      meeting.warnings.push(`MODEL_SUMMARY_FALLBACK:${error instanceof Error ? error.message : String(error)}`)
      summary = normalizeSummary({ overview: transcript ? transcript.slice(0, 240) : '会议未产生可用转写。' })
    }
    const built = buildMeetingMinutes({
      title: meeting.title,
      transcript,
      ...summary,
      startedAt: meeting.startedAt,
      endedAt: nowIso(),
    })
    const recordingSection = meeting.recording
      ? `\n\n## 录音文件\n\n- 文件：${meeting.recording.filename}\n- 格式：WAV / ${meeting.recording.sampleRate} Hz / 单声道\n- 时长：${Math.round(meeting.recording.durationMs / 1000)} 秒`
      : ''
    const interaction = meeting.turns.length > 0
      ? `\n\n## 会中交互\n\n${meeting.turns.map((turn) => `### ${turn.question}\n\n${turn.answer}`).join('\n\n')}`
      : ''
    const markdown = `# ${meeting.title}\n\n${built.markdown}${recordingSection}${interaction}\n`
    const document = await this.saveDocument(meeting, markdown)
    meeting.endedAt = nowIso()
    meeting.document = document
    meeting.phase = stopError && !transcript ? 'failed' : 'completed'
    meeting.error = meeting.phase === 'failed' ? stopError : null
    this.appendEvent(meeting, meeting.phase === 'completed' ? 'meeting_completed' : 'meeting_failed', {
      document: document.filename,
      recording: meeting.recording?.filename || null,
      warnings: meeting.warnings,
    })
    this.completed.set(meeting.meetingId, meeting)
    if (this.active?.meetingId === meeting.meetingId) this.active = null
    await this.schedulePersist(meeting)
    return publicMeeting(meeting)
  }

  async saveDocument(meeting, markdown) {
    await mkdir(this.outputDir, { recursive: true })
    const stamp = meeting.startedAt.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
    const filename = `${stamp}_${safeFilename(meeting.title)}_${meeting.meetingId.slice(0, 8)}.md`
    const filePath = path.join(this.outputDir, filename)
    const temporary = `${filePath}.${randomUUID()}.tmp`
    await writeFile(temporary, markdown, 'utf8')
    await rename(temporary, filePath)
    return { id: meeting.meetingId, title: meeting.title, filename, path: filePath, markdown }
  }

  getState(meetingId) {
    const meeting = meetingId ? this.requireMeeting(meetingId) : this.active
    return meeting ? publicMeeting(meeting) : null
  }

  async listDocuments() {
    await mkdir(this.outputDir, { recursive: true })
    const files = (await readdir(this.outputDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => ({ filename: entry.name, path: path.join(this.outputDir, entry.name) }))
      .sort((a, b) => b.filename.localeCompare(a.filename))
    return files
  }

  async readDocument(filename) {
    const safe = path.basename(String(filename || ''))
    if (!safe || safe !== filename || !safe.endsWith('.md')) throw new Error('INVALID_DOCUMENT_NAME')
    const filePath = path.join(this.outputDir, safe)
    return { filename: safe, path: filePath, markdown: await readFile(filePath, 'utf8') }
  }

  async listHistory() {
    await mkdir(this.historyDir, { recursive: true })
    const entries = []
    for (const entry of await readdir(this.historyDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      try {
        const value = JSON.parse(await readFile(path.join(this.historyDir, entry.name), 'utf8'))
        entries.push(historySummary(value))
      } catch (error) {
        this.ctx.logger?.warn?.(`[fando-meeting] ignored invalid history file ${entry.name}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    return entries.sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))
  }

  async readHistory(meetingId) {
    const id = String(meetingId || '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('INVALID_MEETING_ID')
    if (this.active?.meetingId === id) return persistedMeeting(this.active)
    if (this.completed.has(id)) return persistedMeeting(this.completed.get(id))
    const filePath = path.join(this.historyDir, `${id}.json`)
    return JSON.parse(await readFile(filePath, 'utf8'))
  }

  async generateVoice(input, signal) {
    const meeting = this.requireMeeting(input.meetingId)
    const text = String(input.text || '').trim()
    const result = await this.voice.synthesize({ text, meetingId: meeting.meetingId, signal })
    this.appendEvent(meeting, 'voice_generated', { filename: result.filename, mode: result.mode })
    await this.schedulePersist(meeting)
    return result
  }

  async sendVoiceFile(res, filename) {
    const safe = path.basename(String(filename || ''))
    if (!safe || safe !== filename || !safe.endsWith('.mp3')) throw new Error('INVALID_VOICE_FILE_NAME')
    const bytes = await readFile(path.join(this.outputDir, 'voice', safe))
    res.statusCode = 200
    res.setHeader('content-type', 'audio/mpeg')
    res.setHeader('content-length', String(bytes.length))
    res.setHeader('cache-control', 'private, max-age=3600')
    res.end(bytes)
  }

  async sendRecordingFile(req, res, meetingId, download = false) {
    const meeting = await this.readHistory(meetingId)
    const filePath = path.resolve(String(meeting?.recording?.path || ''))
    if (!filePath || !filePath.toLowerCase().endsWith('.wav')) throw new Error('RECORDING_NOT_FOUND')
    const info = await stat(filePath)
    const range = String(req.headers.range || '')
    const filename = path.basename(filePath)
    res.setHeader('content-type', 'audio/wav')
    res.setHeader('accept-ranges', 'bytes')
    res.setHeader('cache-control', 'private, max-age=3600')
    if (download) res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    if (range) {
      const matched = range.match(/^bytes=(\d*)-(\d*)$/)
      if (!matched) throw new Error('INVALID_AUDIO_RANGE')
      const start = matched[1] ? Number(matched[1]) : 0
      const end = matched[2] ? Math.min(Number(matched[2]), info.size - 1) : info.size - 1
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= info.size) throw new Error('INVALID_AUDIO_RANGE')
      res.statusCode = 206
      res.setHeader('content-range', `bytes ${start}-${end}/${info.size}`)
      res.setHeader('content-length', String(end - start + 1))
      return pipeline(createReadStream(filePath, { start, end }), res)
    }
    res.statusCode = 200
    res.setHeader('content-length', String(info.size))
    return pipeline(createReadStream(filePath), res)
  }

  requireMeeting(meetingId) {
    if (this.active?.meetingId === meetingId) return this.active
    const meeting = this.completed.get(meetingId)
    if (!meeting) throw new Error('MEETING_NOT_FOUND')
    return meeting
  }

  requireActive(meetingId) {
    if (!this.active || this.active.meetingId !== meetingId) throw new Error('ACTIVE_MEETING_NOT_FOUND')
    return this.active
  }

  async route(req, res) {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    const action = url.pathname.slice('/meeting-assistant/api/'.length)
    try {
      if (req.method === 'GET' && action === 'config') return json(res, 200, { ok: true, value: await this.status() })
      if (req.method === 'GET' && action === 'state') return json(res, 200, { ok: true, value: this.getState(url.searchParams.get('meetingId')) })
      if (req.method === 'GET' && action === 'documents') return json(res, 200, { ok: true, value: await this.listDocuments() })
      if (req.method === 'GET' && action === 'document') return json(res, 200, { ok: true, value: await this.readDocument(url.searchParams.get('filename') || '') })
      if (req.method === 'GET' && action === 'history') return json(res, 200, { ok: true, value: await this.listHistory() })
      if (req.method === 'GET' && action === 'history-entry') return json(res, 200, { ok: true, value: await this.readHistory(url.searchParams.get('meetingId') || '') })
      if (req.method === 'GET' && action === 'voice-file') return this.sendVoiceFile(res, url.searchParams.get('filename') || '')
      if (req.method === 'GET' && action === 'recording-file') return this.sendRecordingFile(req, res, url.searchParams.get('meetingId') || '', url.searchParams.get('download') === '1')
      if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' })
      const body = await readJson(req)
      if (action === 'start') return json(res, 200, { ok: true, value: await this.start(body) })
      if (action === 'audio') return json(res, 200, { ok: true, value: this.appendAudio(body) })
      if (action === 'transcript') return json(res, 200, { ok: true, value: await this.appendTranscript(body) })
      if (action === 'ask') return json(res, 200, { ok: true, value: await this.ask(body) })
      if (action === 'voice') {
        const controller = new AbortController()
        req.once('aborted', () => controller.abort(new Error('VOICE_REQUEST_ABORTED')))
        return json(res, 200, { ok: true, value: await this.generateVoice(body, controller.signal) })
      }
      if (action === 'configure-voice') return json(res, 200, { ok: true, value: await this.voice.configureAccessToken(body.accessToken) })
      if (action === 'cancel') return json(res, 200, { ok: true, value: await this.cancel(body) })
      if (action === 'stop') return json(res, 200, { ok: true, value: await this.stop(body) })
      return json(res, 404, { ok: false, error: 'NOT_FOUND' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.ctx.logger?.warn?.(`[fando-meeting] ${action} failed: ${message}`)
      return json(res, 400, { ok: false, error: message })
    }
  }

  dispose() {
    this.active?.asr?.close()
  }
}

export { publicMeeting, transcriptText }
