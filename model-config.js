import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { credentialRef } from '@deepseek-ai/dsh-credentials'

const KEY_REFS = {
  text: credentialRef('MEETING_ASSISTANT_TEXT_API_KEY'),
  tts: credentialRef('MEETING_ASSISTANT_TTS_API_KEY'),
  stt: credentialRef('MEETING_ASSISTANT_STT_API_KEY'),
}

const DEFAULTS = {
  text: { mode: 'dsh', dshProvider: '', dshModel: '', baseUrl: '', model: '' },
  tts: { baseUrl: '', model: '', voice: 'alloy' },
  stt: { baseUrl: '', model: '' },
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max)
}

function normalizeBaseUrl(value) {
  const text = clean(value, 1000).replace(/\/+$/, '')
  if (!text) return ''
  const parsed = new URL(text)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('MODEL_BASE_URL_MUST_USE_HTTP_OR_HTTPS')
  return parsed.toString().replace(/\/+$/, '')
}

function endpoint(baseUrl, suffix) {
  const normalized = baseUrl.replace(/\/+$/, '')
  return normalized.endsWith(suffix) ? normalized : `${normalized}${suffix}`
}

function responseMessage(payload) {
  return clean(payload?.error?.message || payload?.message || payload?.error || '', 500)
}

export class MeetingModelConfiguration {
  constructor(ctx, outputDir) {
    this.ctx = ctx
    this.outputDir = outputDir
    this.filePath = path.join(outputDir, '.model-settings.json')
    this.settings = structuredClone(DEFAULTS)
    this.loaded = false
  }

  async load() {
    if (this.loaded) return this.settings
    this.loaded = true
    try {
      const saved = JSON.parse(await readFile(this.filePath, 'utf8'))
      this.settings = {
        text: { ...DEFAULTS.text, ...(saved?.text || {}) },
        tts: { ...DEFAULTS.tts, ...(saved?.tts || {}) },
        stt: { ...DEFAULTS.stt, ...(saved?.stt || {}) },
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') this.ctx.logger?.warn?.(`[meeting-assistant] ignored invalid model settings: ${error instanceof Error ? error.message : String(error)}`)
    }
    return this.settings
  }

  async keyConfigured(kind) {
    if (!this.ctx.credentials) return false
    return (await this.ctx.credentials.describe(KEY_REFS[kind])).configured === true
  }

  async publicStatus() {
    const settings = await this.load()
    const [textKeyConfigured, ttsKeyConfigured, sttKeyConfigured] = await Promise.all([
      this.keyConfigured('text'), this.keyConfigured('tts'), this.keyConfigured('stt'),
    ])
    return {
      text: {
        ...settings.text,
        keyConfigured: textKeyConfigured,
        configured: settings.text.mode === 'dsh' || Boolean(settings.text.baseUrl && settings.text.model && textKeyConfigured),
      },
      tts: {
        ...settings.tts,
        keyConfigured: ttsKeyConfigured,
        configured: Boolean(settings.tts.baseUrl && settings.tts.model && ttsKeyConfigured),
      },
      stt: {
        ...settings.stt,
        keyConfigured: sttKeyConfigured,
        configured: Boolean(settings.stt.baseUrl && settings.stt.model && sttKeyConfigured),
      },
    }
  }

  async save(input = {}) {
    const current = await this.load()
    const textMode = input?.text?.mode === 'custom' ? 'custom' : 'dsh'
    this.settings = {
      text: {
        mode: textMode,
        dshProvider: clean(input?.text?.dshProvider ?? current.text.dshProvider, 200),
        dshModel: clean(input?.text?.dshModel ?? current.text.dshModel, 200),
        baseUrl: normalizeBaseUrl(input?.text?.baseUrl ?? current.text.baseUrl),
        model: clean(input?.text?.model ?? current.text.model, 200),
      },
      tts: {
        baseUrl: normalizeBaseUrl(input?.tts?.baseUrl ?? current.tts.baseUrl),
        model: clean(input?.tts?.model ?? current.tts.model, 200),
        voice: clean(input?.tts?.voice ?? current.tts.voice, 100) || 'alloy',
      },
      stt: {
        baseUrl: normalizeBaseUrl(input?.stt?.baseUrl ?? current.stt.baseUrl),
        model: clean(input?.stt?.model ?? current.stt.model, 200),
      },
    }
    for (const kind of ['text', 'tts', 'stt']) {
      const apiKey = clean(input?.[kind]?.apiKey, 4000)
      if (apiKey) {
        if (!this.ctx.credentials) throw new Error('DSH_CREDENTIAL_SERVICE_UNAVAILABLE')
        await this.ctx.credentials.set(KEY_REFS[kind], apiKey)
      }
    }
    await mkdir(this.outputDir, { recursive: true })
    const temporary = `${this.filePath}.${randomUUID()}.tmp`
    await writeFile(temporary, JSON.stringify(this.settings, null, 2), 'utf8')
    await rename(temporary, this.filePath)
    return this.publicStatus()
  }

  async customTextSelection() {
    const status = (await this.publicStatus()).text
    if (status.mode !== 'custom') return null
    if (!status.configured) throw new Error('CUSTOM_TEXT_MODEL_NOT_CONFIGURED')
    return status
  }

  async dshTextSelection() {
    const settings = await this.load()
    if (settings.text.mode !== 'dsh' || !settings.text.dshProvider || !settings.text.dshModel) return null
    return { provider: settings.text.dshProvider, model: settings.text.dshModel }
  }

  async resolveKey(kind) {
    const hit = await this.ctx.credentials?.resolve(KEY_REFS[kind])
    if (!hit?.value) throw new Error(`${kind.toUpperCase()}_API_KEY_NOT_CONFIGURED`)
    return hit.value
  }

  async completeText({ system, prompt, signal, maxTokens }) {
    const config = await this.customTextSelection()
    if (!config) throw new Error('CUSTOM_TEXT_MODEL_NOT_CONFIGURED')
    const response = await fetch(endpoint(config.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${await this.resolveKey('text')}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`TEXT_MODEL_HTTP_${response.status}:${responseMessage(payload)}`)
    const text = clean(payload?.choices?.[0]?.message?.content, 200_000)
    if (!text) throw new Error('TEXT_MODEL_EMPTY_RESPONSE')
    return { text, selection: { provider: 'meeting-assistant-custom', model: config.model } }
  }

  async transcribe({ audioBase64, mimeType, signal }) {
    const config = (await this.publicStatus()).stt
    if (!config.configured) throw new Error('STT_MODEL_NOT_CONFIGURED')
    const bytes = Buffer.from(clean(audioBase64, 12_000_000), 'base64')
    if (bytes.length === 0) throw new Error('STT_AUDIO_REQUIRED')
    if (bytes.length > 8 * 1024 * 1024) throw new Error('STT_AUDIO_TOO_LARGE')
    const type = clean(mimeType, 100) || 'audio/webm'
    const extension = type.includes('wav') ? 'wav' : type.includes('mp4') ? 'm4a' : 'webm'
    const form = new FormData()
    form.set('model', config.model)
    form.set('file', new Blob([bytes], { type }), `question.${extension}`)
    const response = await fetch(endpoint(config.baseUrl, '/audio/transcriptions'), {
      method: 'POST',
      headers: { authorization: `Bearer ${await this.resolveKey('stt')}` },
      body: form,
      signal,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`STT_MODEL_HTTP_${response.status}:${responseMessage(payload)}`)
    const text = clean(payload?.text, 20_000)
    if (!text) throw new Error('STT_MODEL_EMPTY_RESPONSE')
    return { text, model: config.model }
  }

  async synthesize({ text, meetingId, signal }) {
    const config = (await this.publicStatus()).tts
    if (!config.configured) throw new Error('TTS_MODEL_NOT_CONFIGURED')
    const input = clean(text, 5000)
    if (!input) throw new Error('VOICE_TEXT_REQUIRED')
    const response = await fetch(endpoint(config.baseUrl, '/audio/speech'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${await this.resolveKey('tts')}`,
      },
      body: JSON.stringify({ model: config.model, voice: config.voice || 'alloy', input, response_format: 'mp3' }),
      signal,
    })
    if (!response.ok) throw new Error(`TTS_MODEL_HTTP_${response.status}:${clean(await response.text(), 500)}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length === 0) throw new Error('TTS_MODEL_EMPTY_AUDIO')
    const outputDir = path.join(this.outputDir, 'voice')
    await mkdir(outputDir, { recursive: true })
    const filename = `assistant_${clean(meetingId || randomUUID(), 40).replace(/[^a-zA-Z0-9-]/g, '')}_${Date.now()}.mp3`
    const filePath = path.join(outputDir, filename)
    const temporary = `${filePath}.${randomUUID()}.tmp`
    await writeFile(temporary, bytes)
    await rename(temporary, filePath)
    return {
      filename,
      path: filePath,
      format: 'mp3',
      mode: 'custom-tts',
      text: input,
      url: `/meeting-assistant/api/voice-file?filename=${encodeURIComponent(filename)}`,
    }
  }
}
