import { randomUUID } from 'node:crypto'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { credentialRef } from '@deepseek-ai/dsh-credentials'

const ENDPOINT = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional/sse'
const DEFAULT_RESOURCE_ID = 'volc.service_type.10029'
const DEFAULT_SPEAKER = 'zh_male_shenyeboke_moon_bigtts'

function safeVoiceFilename(meetingId) {
  return `assistant_${String(meetingId || randomUUID()).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)}_${Date.now()}.mp3`
}

function collectAudioFromSse(text) {
  const chunks = []
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith(':')) continue
    const candidate = line.startsWith('data:') ? line.slice(5).trim() : line
    if (!candidate || candidate === '[DONE]') continue
    let value
    try { value = JSON.parse(candidate) } catch { continue }
    const code = Number(value?.code ?? 0)
    if (![0, 20000000].includes(code)) throw new Error(`VOLCENGINE_TTS_ERROR:${value?.message || code}`)
    if (typeof value?.data === 'string' && value.data) chunks.push(Buffer.from(value.data, 'base64'))
  }
  if (chunks.length === 0) throw new Error('VOLCENGINE_TTS_EMPTY_AUDIO')
  return Buffer.concat(chunks)
}

export class VolcengineTtsVoice {
  constructor(ctx, config = {}, outputDir) {
    this.ctx = ctx
    this.config = config
    this.outputDir = path.join(outputDir, 'voice')
    this.accessTokenRef = String(config.volcengineAccessTokenEnv || 'FANDO_VOLCENGINE_ACCESS_TOKEN')
  }

  async credentialStatus() {
    const appId = String(this.config.volcengineAppId || '').trim()
    if (!appId || !this.ctx.credentials) return { configured: false, appIdConfigured: Boolean(appId), credentialConfigured: false }
    const description = await this.ctx.credentials.describe(credentialRef(this.accessTokenRef))
    return {
      configured: description.configured === true,
      appIdConfigured: true,
      credentialConfigured: description.configured === true,
      credentialWritable: description.writable === true,
      speaker: String(this.config.volcengineSpeaker || DEFAULT_SPEAKER),
      mode: 'verbatim-tts',
    }
  }

  async configureAccessToken(value) {
    const token = String(value || '').trim()
    if (!token) throw new Error('VOLCENGINE_ACCESS_TOKEN_REQUIRED')
    if (!this.ctx.credentials) throw new Error('DSH_CREDENTIAL_SERVICE_UNAVAILABLE')
    await this.ctx.credentials.set(credentialRef(this.accessTokenRef), token)
    return this.credentialStatus()
  }

  async synthesize({ text, meetingId, signal }) {
    const inputText = String(text || '').trim()
    if (!inputText) throw new Error('VOICE_TEXT_REQUIRED')
    const appId = String(this.config.volcengineAppId || '').trim()
    if (!appId) throw new Error('VOLCENGINE_APP_ID_NOT_CONFIGURED')
    const hit = await this.ctx.credentials?.resolve(credentialRef(this.accessTokenRef))
    if (!hit?.value) throw new Error('VOLCENGINE_ACCESS_TOKEN_NOT_CONFIGURED')

    const audio = await this.requestAudio({ appId, accessToken: hit.value, text: inputText.slice(0, 5000), signal })
    await mkdir(this.outputDir, { recursive: true })
    const filename = safeVoiceFilename(meetingId)
    const filePath = path.join(this.outputDir, filename)
    const temporary = `${filePath}.${randomUUID()}.tmp`
    await writeFile(temporary, audio)
    await rename(temporary, filePath)
    return {
      filename,
      path: filePath,
      format: 'mp3',
      mode: 'verbatim-tts',
      text: inputText,
      url: `/meeting-assistant/api/voice-file?filename=${encodeURIComponent(filename)}`,
    }
  }

  async requestAudio({ appId, accessToken, text, signal }) {
    const resourceId = String(this.config.volcengineTtsResourceId || this.config.volcengineResourceId || DEFAULT_RESOURCE_ID)
    const speaker = String(this.config.volcengineSpeaker || DEFAULT_SPEAKER)
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Api-App-Id': appId,
        'X-Api-Access-Key': accessToken,
        'X-Api-Resource-Id': resourceId,
        'X-Api-Request-Id': randomUUID(),
      },
      body: JSON.stringify({
        user: { uid: 'meeting-assistant' },
        req_params: {
          text,
          speaker,
          sample_rate: 24000,
          audio_params: { format: 'mp3', speech_rate: 0, loudness_rate: 0, bit_rate: 64000 },
          additions: JSON.stringify({ disable_markdown_filter: false, enable_latex_tn: false }),
        },
      }),
      signal,
    })
    const payload = await response.text()
    if (!response.ok) throw new Error(`VOLCENGINE_TTS_HTTP_${response.status}:${payload.slice(0, 300)}`)
    return collectAudioFromSse(payload)
  }
}

export { collectAudioFromSse }
