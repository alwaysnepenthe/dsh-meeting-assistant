window.__ModuleLoader__.load({
  id: '@meeting-assistant/dsh-meeting-minutes',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')
    const h = React.createElement

    const STYLE_ID = 'meeting-assistant-client-style'
    const CSS = `
      .fm-root{position:fixed;right:22px;bottom:22px;z-index:9999;pointer-events:auto;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--dsw-alias-label-primary,#172033)}
      .fm-launch{width:54px;height:54px;border:0;border-radius:18px;background:linear-gradient(135deg,#5b5ce2,#8b5cf6);color:#fff;font-size:21px;cursor:pointer;box-shadow:0 16px 42px rgba(91,92,226,.38)}
      .fm-backdrop{position:fixed;inset:0;background:rgba(14,19,35,.48);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px}
      .fm-panel{width:min(1160px,calc(100vw - 48px));height:min(800px,calc(100vh - 48px));background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e8ef);border-radius:24px;box-shadow:0 34px 110px rgba(10,20,45,.3);overflow:hidden;display:flex;flex-direction:column}
      .fm-head{display:flex;align-items:center;gap:10px;padding:16px 22px;border-bottom:1px solid var(--dsw-alias-border-l1,#e8eaf0);background:var(--dsw-alias-bg-base,#fff)}
      .fm-head h2{margin:0;font-size:18px;flex:1}.fm-head small{color:var(--dsw-alias-label-tertiary,#738096)}
      .fm-close,.fm-ghost,.fm-primary,.fm-danger,.fm-tab{border-radius:11px;padding:9px 14px;font-size:14px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1,#dde2eb);background:transparent;color:inherit}.fm-close{padding:8px 11px}.fm-primary{border:0;background:#5b5ce2;color:#fff;font-weight:650}.fm-danger{border:0;background:#e54d55;color:#fff}.fm-primary:disabled,.fm-danger:disabled,.fm-ghost:disabled{opacity:.45;cursor:not-allowed}
      .fm-body{flex:1;min-height:0;padding:20px;overflow:auto;background:var(--dsw-alias-bg-page,#f6f7fa)}
      .fm-home{max-width:700px;margin:52px auto}.fm-hero{padding:34px;border-radius:24px;background:linear-gradient(145deg,#f1f0ff,#f6f7ff 52%,#eef7ff);border:1px solid #dedfff;box-shadow:0 18px 50px rgba(70,73,150,.08)}.fm-hero h3{font-size:28px;margin:0 0 10px}.fm-hero p{color:var(--dsw-alias-label-secondary,#606b7b);line-height:1.75;margin:0 0 24px}
      .fm-field{display:flex;flex-direction:column;gap:7px;margin:14px 0}.fm-field label{font-size:13px;font-weight:650}.fm-input,.fm-textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l1,#d9e0eb);background:var(--dsw-alias-bg-base,#fff);color:inherit;border-radius:12px;padding:12px 13px;outline:none}.fm-input:focus,.fm-textarea:focus{border-color:#5b5ce2;box-shadow:0 0 0 3px rgba(91,92,226,.12)}
      .fm-status{display:flex;gap:9px;flex-wrap:wrap;margin:18px 0}.fm-pill{font-size:12px;padding:5px 9px;border-radius:99px;background:#eef1f6;color:#667085}.fm-pill.ok{background:#e9f8ef;color:#16834b}.fm-pill.bad{background:#ffeded;color:#b83333}
      .fm-grid{height:100%;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(340px,.92fr);gap:16px}.fm-card{background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,#e2e6ee);border-radius:18px;display:flex;flex-direction:column;min-height:0;overflow:hidden}.fm-card-title{padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#e8eaf0);font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px}.fm-scroll{padding:15px;overflow:auto;flex:1;min-height:0}.fm-segment{padding:10px 0;border-bottom:1px solid var(--dsw-alias-border-l1,#eef0f4);line-height:1.6}.fm-segment b{font-size:12px;color:#5b5ce2;margin-right:8px}.fm-partial{opacity:.55;font-style:italic}.fm-empty{color:var(--dsw-alias-label-tertiary,#8290a4);padding:30px;text-align:center}
      .fm-turn{margin-bottom:15px}.fm-q{font-weight:700;margin-bottom:6px}.fm-a{line-height:1.7;white-space:pre-wrap;background:#f0f2ff;border-radius:12px;padding:11px 12px}.fm-ask{border-top:1px solid var(--dsw-alias-border-l1,#e7e9ef);padding:12px;display:flex;gap:8px}.fm-ask .fm-input{margin:0}.fm-controls{display:flex;align-items:center;gap:10px}.fm-record-dot{width:9px;height:9px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 0 rgba(239,68,68,.5);animation:fmPulse 1.5s infinite}.fm-level{height:6px;width:70px;background:#e7ebf2;border-radius:99px;overflow:hidden}.fm-level i{height:100%;display:block;background:#19a465;transition:width .1s}
      .fm-error{margin:12px 0;padding:10px 12px;border-radius:10px;background:#ffeded;color:#b72e2e;font-size:13px}.fm-warning{margin:10px 0;padding:9px 11px;border-radius:10px;background:#fff4dd;color:#8a5a00;font-size:12px}.fm-doc{line-height:1.75;font-size:14px}.fm-doc h2{font-size:19px;margin:24px 0 10px}.fm-doc h3{font-size:16px;margin:20px 0 8px}.fm-doc p{margin:8px 0}.fm-doc ul{padding-left:22px}.fm-doc li{margin:6px 0}.fm-doc-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fm-path{font-size:12px;color:var(--dsw-alias-label-tertiary,#7d8999);word-break:break-all}.fm-source{font-size:12px;margin-top:7px}.fm-source a{color:#5b5ce2}.fm-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .fm-history{height:100%;display:grid;grid-template-columns:310px minmax(0,1fr);gap:16px}.fm-library{background:#f9fafc}.fm-library-head{padding:14px 16px 10px;display:flex;align-items:center;justify-content:space-between;gap:12px}.fm-library-copy{min-width:0}.fm-library-head h3{margin:0 0 4px;font-size:17px}.fm-library-head p{margin:0;color:#8992a3;font-size:12px}.fm-library-head .fm-ghost{padding:7px 11px;flex:0 0 auto}.fm-history-item{width:100%;text-align:left;border:1px solid transparent;background:transparent;color:inherit;border-radius:14px;padding:13px;margin-bottom:6px;cursor:pointer;display:grid;grid-template-columns:38px 1fr;gap:11px}.fm-history-item:hover{background:#f0f2f7}.fm-history-item.active{background:#fff;border-color:#dfe3ec;box-shadow:0 8px 24px rgba(27,39,70,.07)}.fm-history-icon{width:38px;height:38px;border-radius:12px;background:linear-gradient(145deg,#6466e8,#a06cf0);color:#fff;display:flex;align-items:center;justify-content:center;font-size:17px}.fm-history-item b{display:block;margin-bottom:4px}.fm-history-meta{font-size:12px;color:#8891a1;line-height:1.55}.fm-detail{overflow:hidden}.fm-detail-hero{padding:20px 22px;background:linear-gradient(135deg,#fafaff,#f3f5ff);border-bottom:1px solid #e7e9f0}.fm-detail-hero h3{margin:0 0 6px;font-size:22px}.fm-detail-meta{font-size:13px;color:#7d8798;margin-bottom:15px}.fm-audio{width:100%;height:38px;margin-top:12px}.fm-tabs{display:flex;gap:6px;padding:10px 18px;border-bottom:1px solid #e9ebf1}.fm-tab{padding:7px 12px;border-color:transparent}.fm-tab.active{background:#eeefff;color:#4f51cf;font-weight:650}.fm-detail-content{padding:4px 22px 30px;overflow:auto;flex:1}.fm-event{position:relative;padding:13px 0 13px 24px;border-left:2px solid #e7e9f0;margin-left:7px}.fm-event:before{content:'';position:absolute;left:-6px;top:18px;width:10px;height:10px;border-radius:50%;background:#8b8ce8}.fm-event b{display:block;margin-bottom:4px}.fm-event .fm-history-meta{margin-left:8px;font-weight:400}.fm-settings{max-width:620px;margin:18px auto}.fm-setting-row{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:16px 0;border-bottom:1px solid #eceef3}.fm-setting-copy b{display:block;margin-bottom:5px}.fm-setting-copy span{font-size:13px;color:#7a8495}.fm-switch{width:42px;height:24px;accent-color:#5b5ce2}.fm-voice-stop{border-color:#ef8d91;color:#c3363e;background:#fff5f5}
      @keyframes fmPulse{70%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}
      @media(max-width:760px){.fm-grid{grid-template-columns:1fr;grid-template-rows:1fr 1fr}.fm-history{grid-template-columns:1fr;grid-template-rows:230px 1fr}.fm-panel{width:calc(100vw - 20px);height:calc(100vh - 20px)}.fm-backdrop{padding:10px}.fm-root{right:12px;bottom:12px}.fm-detail-hero{padding:16px}.fm-ask{flex-wrap:wrap}}
    `

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.dataset.plugin = '@meeting-assistant/dsh-meeting-minutes'
      style.textContent = CSS
      document.head.appendChild(style)
    }

    async function api(action, options = {}) {
      const query = options.query ? `?${new URLSearchParams(options.query)}` : ''
      const response = await fetch(`/meeting-assistant/api/${action}${query}`, {
        method: options.body === undefined ? 'GET' : 'POST',
        headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP_${response.status}`)
      return payload.value
    }

    function formatElapsed(ms) {
      const total = Math.max(0, Math.floor(ms / 1000))
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      const seconds = total % 60
      return hours > 0
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    function resample(input, sourceRate, targetRate) {
      if (sourceRate === targetRate) return input
      const ratio = sourceRate / targetRate
      const output = new Float32Array(Math.max(1, Math.floor(input.length / ratio)))
      for (let index = 0; index < output.length; index += 1) {
        const position = index * ratio
        const left = Math.floor(position)
        const right = Math.min(left + 1, input.length - 1)
        const fraction = position - left
        output[index] = input[left] * (1 - fraction) + input[right] * fraction
      }
      return output
    }

    function quantize(input) {
      const pcm = new Int16Array(input.length)
      for (let index = 0; index < input.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, input[index] || 0))
        pcm[index] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff)
      }
      return pcm
    }

    function pcmBase64(pcm) {
      const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
      let binary = ''
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
      }
      return btoa(binary)
    }

    class BrowserMeetingCapture {
      constructor(meetingId, onLevel, onError) {
        this.meetingId = meetingId
        this.onLevel = onLevel
        this.onError = onError
        this.stream = null
        this.context = null
        this.source = null
        this.processor = null
        this.sequence = 0
        this.buffer = new Int16Array(0)
        this.queue = []
        this.uploading = false
        this.transcriptQueue = []
        this.transcriptUploading = false
        this.recognition = null
        this.transcriptionPaused = false
        this.restartTimer = null
        this.startedAt = Date.now()
        this.stopped = false
      }

      async start() {
        await this.prepare()
        if (!this.meetingId) throw new Error('MEETING_ID_REQUIRED')
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext
        if (!AudioContextCtor) throw new Error('AUDIO_CONTEXT_UNAVAILABLE')
        this.context = new AudioContextCtor()
        if (this.context.state === 'suspended') await this.context.resume()
        this.source = this.context.createMediaStreamSource(this.stream)
        this.processor = this.context.createScriptProcessor(4096, 1, 1)
        this.processor.onaudioprocess = (event) => this.push(event.inputBuffer.getChannelData(0))
        this.source.connect(this.processor)
        this.processor.connect(this.context.destination)
        await this.startTranscription()
      }

      async prepare() {
        if (this.stream) return
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器无法访问麦克风，请使用最新版 Chrome 或 Edge。')
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: false },
          })
          const tracks = this.stream.getAudioTracks()
          if (tracks.length === 0 || tracks.every((track) => track.readyState === 'ended')) {
            this.stream.getTracks().forEach((track) => track.stop())
            this.stream = null
            throw new Error('未检测到可用的麦克风设备，请连接或启用麦克风后重试。')
          }
        } catch (error) {
          const name = String(error?.name || '')
          if (['NotFoundError', 'DevicesNotFoundError'].includes(name)) throw new Error('未检测到麦克风设备，请连接或启用麦克风后重试。')
          if (['NotAllowedError', 'PermissionDeniedError'].includes(name)) throw new Error('麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重试。')
          if (['NotReadableError', 'TrackStartError', 'AbortError'].includes(name)) throw new Error('麦克风暂时不可用，可能正被其他程序占用，请关闭占用程序后重试。')
          if (error instanceof Error) throw error
          throw new Error('无法启动麦克风，请检查录音设备和浏览器权限。')
        }
      }

      async startTranscription() {
        if (this.stopped || this.transcriptionPaused || this.recognition) return
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!Recognition) throw new Error('当前浏览器不支持内置语音识别，请使用最新版 Chrome 或 Edge。')
        const recognition = new Recognition()
        this.recognition = recognition
        recognition.lang = 'zh-CN'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.onresult = (event) => {
          let interim = ''
          for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
            const result = event.results[index]
            const text = String(result?.[0]?.transcript || '').trim()
            if (!text) continue
            if (result.isFinal) this.enqueueTranscript({ text, isFinal: true, startMs: Date.now() - this.startedAt })
            else interim += `${interim ? ' ' : ''}${text}`
          }
          if (interim) this.enqueueTranscript({ text: interim, isFinal: false, startMs: Date.now() - this.startedAt })
        }
        recognition.onerror = (event) => {
          if (!this.stopped && !this.transcriptionPaused && !['aborted', 'no-speech'].includes(event.error)) {
            this.onError(`浏览器转写失败：${event.error || 'unknown'}`)
          }
        }
        recognition.onend = () => {
          if (this.recognition === recognition) this.recognition = null
          if (!this.stopped && !this.transcriptionPaused) {
            this.restartTimer = window.setTimeout(() => {
              this.restartTimer = null
              void this.startTranscription().catch((error) => this.onError(error instanceof Error ? error.message : String(error)))
            }, 250)
          }
        }
        recognition.start()
      }

      enqueueTranscript(item) {
        if (!item.isFinal && this.transcriptQueue.length > 0 && !this.transcriptQueue[this.transcriptQueue.length - 1].isFinal) {
          this.transcriptQueue[this.transcriptQueue.length - 1] = item
        } else this.transcriptQueue.push(item)
        void this.drainTranscripts()
      }

      async drainTranscripts() {
        if (this.transcriptUploading) return
        this.transcriptUploading = true
        try {
          while (this.transcriptQueue.length > 0) {
            const item = this.transcriptQueue[0]
            await api('transcript', { body: { meetingId: this.meetingId, ...item } })
            this.transcriptQueue.shift()
          }
        } catch (error) {
          this.onError(error instanceof Error ? error.message : String(error))
        } finally {
          this.transcriptUploading = false
        }
      }

      pauseTranscription() {
        this.transcriptionPaused = true
        if (this.restartTimer) window.clearTimeout(this.restartTimer)
        this.restartTimer = null
        this.recognition?.abort()
      }

      resumeTranscription() {
        if (this.stopped) return
        this.transcriptionPaused = false
        void this.startTranscription().catch((error) => this.onError(error instanceof Error ? error.message : String(error)))
      }

      push(floatPcm) {
        if (this.stopped) return
        let sum = 0
        for (const sample of floatPcm) sum += sample * sample
        this.onLevel(Math.min(1, Math.sqrt(sum / Math.max(1, floatPcm.length)) * 7))
        const pcm = quantize(resample(floatPcm, this.context.sampleRate, 16000))
        const merged = new Int16Array(this.buffer.length + pcm.length)
        merged.set(this.buffer)
        merged.set(pcm, this.buffer.length)
        this.buffer = merged
        while (this.buffer.length >= 8000) {
          this.enqueue(this.buffer.slice(0, 8000))
          this.buffer = this.buffer.slice(8000)
        }
      }

      enqueue(pcm) {
        if (this.queue.length >= 20) {
          this.onError('音频上传出现积压，请检查本机网络。')
          return
        }
        this.queue.push({ sequence: this.sequence++, pcmBase64: pcmBase64(pcm) })
        void this.drain()
      }

      async drain() {
        if (this.uploading) return
        this.uploading = true
        try {
          while (this.queue.length > 0) {
            const frame = this.queue[0]
            await api('audio', { body: { meetingId: this.meetingId, ...frame } })
            this.queue.shift()
          }
        } catch (error) {
          this.onError(error instanceof Error ? error.message : String(error))
        } finally {
          this.uploading = false
        }
      }

      async stop() {
        this.stopped = true
        if (this.restartTimer) window.clearTimeout(this.restartTimer)
        this.restartTimer = null
        this.recognition?.stop()
        this.recognition = null
        if (this.buffer.length > 0) {
          this.enqueue(this.buffer)
          this.buffer = new Int16Array(0)
        }
        this.processor?.disconnect()
        this.source?.disconnect()
        this.processor = null
        this.source = null
        this.stream?.getTracks().forEach((track) => track.stop())
        this.stream = null
        await this.context?.close()
        this.context = null
        const deadline = Date.now() + 5000
        while ((this.uploading || this.queue.length > 0 || this.transcriptUploading || this.transcriptQueue.length > 0) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }

    function StatusPill({ ok, children }) {
      return h('span', { className: `fm-pill ${ok ? 'ok' : 'bad'}` }, children)
    }

    function Home({ config, title, setTitle, browserAsrSupported, onStart, onHistory, onSettings, pending, error }) {
      const hasModel = Boolean(config?.model)
      const canStart = hasModel && browserAsrSupported
      return h('div', { className: 'fm-home' }, h('div', { className: 'fm-hero' },
        h('h3', null, '会议纪要'),
        h('p', null, '实时记录会议、随时向联网 AI 助手提问，结束后自动整理为结构化纪要，并完整保存录音、逐字稿和 Markdown 文档。'),
        h('div', { className: 'fm-status' },
          h(StatusPill, { ok: hasModel }, hasModel ? 'AI 助手已就绪' : 'AI 模型未配置'),
          h(StatusPill, { ok: Boolean(config?.agent?.webSearchAvailable) }, config?.agent?.webSearchAvailable ? '联网能力已就绪' : '联网搜索不可用'),
          h(StatusPill, { ok: Boolean(config?.voice?.configured) }, config?.voice?.configured ? '语音回答已就绪' : '语音回答未配置'),
        ),
        !hasModel && h('div', { className: 'fm-warning' }, '请先在 DeepSeek Harness 中启用一个模型。'),
        !browserAsrSupported && h('div', { className: 'fm-warning' }, '当前浏览器不支持连续语音识别，请使用最新版 Chrome 或 Edge。'),
        h('div', { className: 'fm-field' }, h('label', null, '会议标题'), h('input', {
          className: 'fm-input', value: title, placeholder: '例如：产品周会', onChange: (event) => setTitle(event.target.value), disabled: pending,
        })),
        error && h('div', { className: 'fm-error' }, error),
        h('div', { className: 'fm-actions' },
          h('button', { className: 'fm-primary', disabled: pending || !canStart, onClick: onStart }, pending ? '正在启动…' : '开始会议'),
          h('button', { className: 'fm-ghost', disabled: pending, onClick: onHistory }, '历史纪要'),
          h('button', { className: 'fm-ghost', disabled: pending, onClick: onSettings }, '设置'),
        ),
      ))
    }

    function LiveMeeting({ meeting, level, question, setQuestion, onAsk, asking, stopping, error, settings, onVoiceAsk, listening, voiceState, onStopVoice }) {
      const segments = meeting?.segments || []
      const turns = meeting?.turns || []
      return h('div', { className: 'fm-grid' },
        h('section', { className: 'fm-card' },
          h('div', { className: 'fm-card-title' }, h('span', { className: 'fm-record-dot' }), '实时转写', h('span', { style: { marginLeft: 'auto', fontWeight: 500 } }, formatElapsed(meeting?.durationMs || 0)), h('span', { className: 'fm-level' }, h('i', { style: { width: `${Math.round(level * 100)}%` } }))),
          h('div', { className: 'fm-scroll' },
            segments.length === 0 && !meeting?.partialTranscript && h('div', { className: 'fm-empty' }, '正在聆听，转写内容会显示在这里。'),
            segments.map((segment) => h('div', { className: 'fm-segment', key: segment.id }, h('b', null, segment.speakerName || segment.speakerLabel || '说话人'), segment.text)),
            meeting?.partialTranscript && h('div', { className: 'fm-segment fm-partial' }, meeting.partialTranscript),
          ),
        ),
        h('section', { className: 'fm-card' },
          h('div', { className: 'fm-card-title' }, '联网会议助手',
            h('span', { className: 'fm-history-meta', style: { marginLeft: 'auto' } }, settings.wakeEnabled ? `唤醒词：${settings.wakeWord}` : '语音唤醒已关闭')),
          h('div', { className: 'fm-scroll' },
            turns.length === 0 && h('div', { className: 'fm-empty' }, '我会结合会议内容、通用知识与联网搜索回答，不再局限于本轮转写。'),
            turns.map((turn) => h('div', { className: 'fm-turn', key: turn.id },
              h('div', { className: 'fm-q' }, `问：${turn.question}`),
              h('div', { className: 'fm-a' }, turn.answer),
              Array.isArray(turn.sources) && turn.sources.length > 0 && h('div', { className: 'fm-source' }, '联网来源：', turn.sources.slice(0, 4).map((source, index) => h(React.Fragment, { key: source.url || index }, index > 0 ? ' · ' : '', h('a', { href: source.url || source.href, target: '_blank', rel: 'noreferrer' }, source.title || source.name || `来源 ${index + 1}`)))),
            )),
            asking && h('div', { className: 'fm-a' }, '模型正在回答…'),
            error && h('div', { className: 'fm-error' }, error),
            (meeting?.warnings || []).slice(-3).map((warning) => h('div', { className: 'fm-warning', key: warning }, warning)),
          ),
          h('div', { className: 'fm-ask' },
            h('input', { className: 'fm-input', value: question, placeholder: '问会议内容，也可以问天气、新闻或其他问题…', disabled: asking || stopping, onChange: (event) => setQuestion(event.target.value), onKeyDown: (event) => { if (event.key === 'Enter') onAsk() } }),
            voiceState !== 'idle' && h('button', { className: 'fm-ghost fm-voice-stop', onClick: onStopVoice }, voiceState === 'generating' ? '停止生成' : '停止播报'),
            h('button', { className: 'fm-ghost', disabled: asking || stopping || listening, onClick: onVoiceAsk }, listening ? '聆听中…' : '语音提问'),
            h('button', { className: 'fm-primary', disabled: asking || stopping || !question.trim(), onClick: () => onAsk() }, '提问'),
          ),
        ),
      )
    }

    function CompletedMeeting({ meeting, onNew, onHistory }) {
      const meetingDocument = meeting?.document
      const download = () => {
        const blob = new Blob([meetingDocument.markdown], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = meetingDocument.filename
        link.click()
        URL.revokeObjectURL(url)
      }
      return h('section', { className: 'fm-card', style: { height: '100%' } },
        h('div', { className: 'fm-card-title' }, meeting.phase === 'completed' ? '会议文档已生成' : '会议结束时出现错误'),
        h('div', { className: 'fm-scroll' },
          meeting.error && h('div', { className: 'fm-error' }, meeting.error),
          meetingDocument ? h(React.Fragment, null,
            h('div', { className: 'fm-doc-actions' },
              h('button', { className: 'fm-primary', onClick: () => navigator.clipboard.writeText(meetingDocument.markdown) }, '复制 Markdown'),
              h('button', { className: 'fm-ghost', onClick: download }, '保存副本'),
              h('button', { className: 'fm-ghost', onClick: onNew }, '新会议'),
              h('button', { className: 'fm-ghost', onClick: onHistory }, '历史记录'),
              h('span', { className: 'fm-path' }, `已保存：${meetingDocument.path}`),
            ),
            h(MarkdownContent, { markdown: meetingDocument.markdown }),
          ) : h('div', { className: 'fm-empty' }, '未生成会议文档。'),
        ),
      )
    }

    function downloadMarkdown(documentValue) {
      if (!documentValue?.markdown) return
      const blob = new Blob([documentValue.markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = documentValue.filename || 'meeting.md'
      link.click()
      URL.revokeObjectURL(url)
    }

    function eventLabel(type) {
      return ({
        meeting_started: '会议创建', recording_started: '开始录音转写', transcript_final: '转写沉淀',
        question: '向助手提问', answer: '助手回答', voice_generated: '语音回答',
        meeting_stopping: '结束会议', meeting_completed: '纪要生成完成', meeting_failed: '会议失败', warning: '运行提醒',
      })[type] || type
    }

    function MarkdownContent({ markdown }) {
      const nodes = []
      let list = []
      const flushList = () => {
        if (list.length === 0) return
        nodes.push(h('ul', { key: `list-${nodes.length}` }, list.map((text, index) => h('li', { key: index }, text))))
        list = []
      }
      for (const raw of String(markdown || '').split(/\r?\n/)) {
        const line = raw.trim()
        if (!line) { flushList(); continue }
        const heading = line.match(/^(#{1,3})\s+(.+)$/)
        if (heading) {
          flushList()
          const tag = heading[1].length === 1 ? 'h2' : 'h3'
          nodes.push(h(tag, { key: `heading-${nodes.length}` }, heading[2]))
          continue
        }
        const item = line.match(/^[-*]\s+(.+)$/)
        if (item) { list.push(item[1]); continue }
        flushList()
        nodes.push(h('p', { key: `paragraph-${nodes.length}` }, line))
      }
      flushList()
      return h('article', { className: 'fm-doc' }, nodes)
    }

    function SettingsPanel({ settings, setSettings, config, onBack }) {
      const update = (patch) => setSettings((current) => ({ ...current, ...patch }))
      return h('section', { className: 'fm-card fm-settings' },
        h('div', { className: 'fm-card-title' }, '会议助手设置', h('button', { className: 'fm-ghost', style: { marginLeft: 'auto' }, onClick: onBack }, '完成')),
        h('div', { className: 'fm-scroll' },
          h('div', { className: 'fm-setting-row' },
            h('div', { className: 'fm-setting-copy' }, h('b', null, '语音唤醒'), h('span', null, '会议中说出唤醒词和问题，助手会自动回答。')),
            h('input', { className: 'fm-switch', type: 'checkbox', checked: settings.wakeEnabled, onChange: (event) => update({ wakeEnabled: event.target.checked }) })),
          h('div', { className: 'fm-field' }, h('label', null, '自定义唤醒词'), h('input', {
            className: 'fm-input', value: settings.wakeWord, maxLength: 12, disabled: !settings.wakeEnabled,
            placeholder: '例如：小助手', onChange: (event) => update({ wakeWord: event.target.value.replace(/[，,：:\s]/g, '').slice(0, 12) }),
          })),
          h('div', { className: 'fm-setting-row' },
            h('div', { className: 'fm-setting-copy' }, h('b', null, '自动语音回答'), h('span', null, config?.voice?.configured ? '把模型生成的文字答案原样朗读出来。' : '云端语音未配置时将自动使用系统朗读。')),
            h('input', { className: 'fm-switch', type: 'checkbox', checked: settings.autoSpeak, onChange: (event) => update({ autoSpeak: event.target.checked }) })),
          h('div', { className: 'fm-warning' }, '唤醒词和播报偏好仅保存在当前浏览器中，可随时修改。'),
        ),
      )
    }

    function HistoryPanel({ items, selected, loading, onSelect, onBack }) {
      const [tab, setTab] = React.useState('summary')
      React.useEffect(() => setTab('summary'), [selected?.meetingId])
      const recordingUrl = selected?.recording ? `/meeting-assistant/api/recording-file?meetingId=${encodeURIComponent(selected.meetingId)}` : null
      return h('div', { className: 'fm-history' },
        h('section', { className: 'fm-card fm-library' },
          h('div', { className: 'fm-library-head' },
            h('div', { className: 'fm-library-copy' }, h('h3', null, '历史纪要'), h('p', null, `${items.length} 场已沉淀会议`)),
            h('button', { className: 'fm-ghost', onClick: onBack }, '返回')),
          h('div', { className: 'fm-scroll' },
            loading && h('div', { className: 'fm-empty' }, '正在读取历史记录…'),
            !loading && items.length === 0 && h('div', { className: 'fm-empty' }, '还没有会议历史。完成一次会议后会自动沉淀在这里。'),
            items.map((item) => h('button', { className: `fm-history-item ${selected?.meetingId === item.meetingId ? 'active' : ''}`, key: item.meetingId, onClick: () => onSelect(item.meetingId) },
              h('span', { className: 'fm-history-icon' }, '记'),
              h('span', null, h('b', null, item.title),
                h('span', { className: 'fm-history-meta' }, new Date(item.startedAt).toLocaleString(), h('br'), `${formatElapsed(item.durationMs)} · ${item.transcriptCount} 段转写 · ${item.turnCount} 次问答`)),
            )),
          ),
        ),
        h('section', { className: 'fm-card fm-detail' },
          !selected && h('div', { className: 'fm-empty' }, '选择一场会议，查看纪要、录音和全过程。'),
          selected && h(React.Fragment, null,
            h('div', { className: 'fm-detail-hero' },
              h('h3', null, selected.title),
              h('div', { className: 'fm-detail-meta' }, `${new Date(selected.startedAt).toLocaleString()} · ${formatElapsed(selected.durationMs)} · ${selected.segments?.length || 0} 段转写`),
              h('div', { className: 'fm-doc-actions' },
                selected.document?.markdown && h('button', { className: 'fm-primary', onClick: () => downloadMarkdown(selected.document) }, '下载 Markdown'),
                selected.document?.markdown && h('button', { className: 'fm-ghost', onClick: () => navigator.clipboard.writeText(selected.document.markdown) }, '复制 Markdown'),
                recordingUrl && h('a', { className: 'fm-ghost', href: `${recordingUrl}&download=1` }, '下载原始录音'),
              ),
              recordingUrl && h('audio', { className: 'fm-audio', controls: true, preload: 'metadata', src: recordingUrl }),
            ),
            h('div', { className: 'fm-tabs' },
              [['summary', '智能纪要'], ['process', '全过程'], ['transcript', '逐字稿']].map(([id, label]) => h('button', { key: id, className: `fm-tab ${tab === id ? 'active' : ''}`, onClick: () => setTab(id) }, label))),
            h('div', { className: 'fm-detail-content' },
              tab === 'summary' && (selected.document?.markdown ? h(MarkdownContent, { markdown: selected.document.markdown }) : h('div', { className: 'fm-empty' }, '本次会议尚未生成最终文档。')),
              tab === 'process' && (selected.events || []).map((event) => h('div', { className: 'fm-event', key: event.id },
                h('b', null, eventLabel(event.type), h('span', { className: 'fm-history-meta' }, new Date(event.at).toLocaleTimeString())),
                event.type === 'transcript_final' && h('div', null, event.detail?.text),
                event.type === 'question' && h('div', null, event.detail?.question),
                event.type === 'answer' && h('div', null, event.detail?.answer),
              )),
              tab === 'transcript' && ((selected.segments || []).length > 0
                ? (selected.segments || []).map((segment) => h('div', { className: 'fm-segment', key: segment.id }, h('b', null, `${formatElapsed(segment.startMs || 0)} ${segment.speakerName || segment.speakerLabel || '说话人'}`), segment.text))
                : h('div', { className: 'fm-empty' }, '本次会议没有可用逐字稿。')),
            ),
          ),
        ),
      )
    }

    function MeetingApp() {
      const [open, setOpen] = React.useState(false)
      const [config, setConfig] = React.useState(null)
      const [title, setTitle] = React.useState('临时会议')
      const [meeting, setMeeting] = React.useState(null)
      const [pending, setPending] = React.useState(false)
      const [asking, setAsking] = React.useState(false)
      const [stopping, setStopping] = React.useState(false)
      const [question, setQuestion] = React.useState('')
      const [level, setLevel] = React.useState(0)
      const [error, setError] = React.useState('')
      const [settings, setSettings] = React.useState(() => {
        try { return { wakeWord: '小助手', wakeEnabled: true, autoSpeak: true, ...JSON.parse(localStorage.getItem('meeting-assistant-settings') || '{}') } }
        catch { return { wakeWord: '小助手', wakeEnabled: true, autoSpeak: true } }
      })
      const [voiceState, setVoiceState] = React.useState('idle')
      const [listening, setListening] = React.useState(false)
      const [view, setView] = React.useState('meeting')
      const [historyItems, setHistoryItems] = React.useState([])
      const [historySelected, setHistorySelected] = React.useState(null)
      const [historyLoading, setHistoryLoading] = React.useState(false)
      const captureRef = React.useRef(null)
      const voiceAudioRef = React.useRef(null)
      const voiceAbortRef = React.useRef(null)
      const wakeHandledRef = React.useRef(new Set())
      const browserAsrSupported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

      React.useEffect(() => {
        if (!open) return undefined
        let alive = true
        api('config').then((value) => {
          if (!alive) return
          setConfig(value)
        }, (reason) => { if (alive) setError(reason.message) })
        return () => { alive = false }
      }, [open])

      React.useEffect(() => {
        localStorage.setItem('meeting-assistant-settings', JSON.stringify(settings))
      }, [settings])

      React.useEffect(() => {
        if (!meeting?.meetingId || !['recording', 'stopping'].includes(meeting.phase)) return undefined
        const poll = async () => {
          try {
            const value = await api('state', { query: { meetingId: meeting.meetingId } })
            setMeeting(value)
          } catch (reason) { setError(reason.message) }
        }
        const timer = window.setInterval(poll, 900)
        return () => window.clearInterval(timer)
      }, [meeting?.meetingId, meeting?.phase])

      React.useEffect(() => () => {
        void captureRef.current?.stop()
        voiceAbortRef.current?.abort()
        voiceAudioRef.current?.pause()
        window.speechSynthesis?.cancel()
      }, [])

      const start = async () => {
        setPending(true)
        setError('')
        wakeHandledRef.current.clear()
        let created = null
        const capture = new BrowserMeetingCapture(null, setLevel, setError)
        try {
          if (!browserAsrSupported) throw new Error('当前浏览器不支持连续语音识别，请使用最新版 Chrome 或 Edge。')
          await capture.prepare()
          created = await api('start', { body: { title } })
          capture.meetingId = created.meetingId
          setMeeting(created)
          captureRef.current = capture
          await capture.start()
        } catch (reason) {
          await capture.stop().catch(() => undefined)
          captureRef.current = null
          setError(reason instanceof Error ? reason.message : String(reason))
          if (created?.meetingId) {
            try { await api('cancel', { body: { meetingId: created.meetingId } }) } catch { /* primary error wins */ }
          }
          setMeeting(null)
        } finally { setPending(false) }
      }

      const stopVoice = () => {
        voiceAbortRef.current?.abort()
        voiceAbortRef.current = null
        if (voiceAudioRef.current) {
          voiceAudioRef.current.pause()
          voiceAudioRef.current.currentTime = 0
          voiceAudioRef.current = null
        }
        window.speechSynthesis?.cancel()
        setVoiceState('idle')
      }

      const speakLocally = (text) => {
        if (!('speechSynthesis' in window)) throw new Error('BROWSER_SPEECH_SYNTHESIS_UNAVAILABLE')
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'zh-CN'
        utterance.onend = () => setVoiceState('idle')
        utterance.onerror = () => setVoiceState('idle')
        setVoiceState('playing')
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
      }

      const playAnswer = async (answer) => {
        stopVoice()
        const controller = new AbortController()
        voiceAbortRef.current = controller
        setVoiceState('generating')
        try {
          const voice = await api('voice', { body: { meetingId: meeting.meetingId, text: answer }, signal: controller.signal })
          if (controller.signal.aborted) return
          const audio = new Audio(voice.url)
          voiceAudioRef.current = audio
          audio.onended = () => { voiceAudioRef.current = null; setVoiceState('idle') }
          audio.onerror = () => { voiceAudioRef.current = null; setVoiceState('idle') }
          setVoiceState('playing')
          await audio.play()
        } catch (voiceError) {
          if (controller.signal.aborted || voiceError?.name === 'AbortError') return
          try {
            speakLocally(answer)
            setError(`云端语音暂不可用，已使用系统声音原样朗读。${voiceError instanceof Error ? `（${voiceError.message}）` : ''}`)
          } catch (fallbackError) {
            setVoiceState('idle')
            setError(`语音播报失败：${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`)
          }
        } finally {
          if (voiceAbortRef.current === controller) voiceAbortRef.current = null
        }
      }

      const ask = async (questionOverride) => {
        const value = String(questionOverride ?? question).trim()
        if (!value || !meeting) return
        setAsking(true)
        setError('')
        setQuestion('')
        try {
          const turn = await api('ask', { body: { meetingId: meeting.meetingId, question: value } })
          setMeeting((current) => ({ ...current, turns: [...(current?.turns || []), turn] }))
          if (settings.autoSpeak) void playAnswer(turn.answer)
        } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
        finally { setAsking(false) }
      }

      React.useEffect(() => {
        if (!settings.wakeEnabled || !settings.wakeWord.trim() || asking || stopping || meeting?.phase !== 'recording') return
        const escapedWakeWord = settings.wakeWord.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const wakePattern = new RegExp(`^${escapedWakeWord}[，,：:\\s]*(.+)$`)
        const candidates = (meeting.segments || []).slice(-8)
        for (const segment of candidates) {
          if (!segment?.id || wakeHandledRef.current.has(segment.id)) continue
          const matched = String(segment.text || '').trim().match(wakePattern)
          if (!matched?.[1]?.trim()) continue
          wakeHandledRef.current.add(segment.id)
          void ask(matched[1].trim())
          break
        }
      }, [meeting?.segments, meeting?.phase, settings.wakeEnabled, settings.wakeWord, asking, stopping])

      const voiceAsk = () => {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!Recognition) {
          setError('当前浏览器不支持语音提问，请使用文字提问。')
          return
        }
        const recognition = new Recognition()
        captureRef.current?.pauseTranscription()
        recognition.lang = 'zh-CN'
        recognition.continuous = false
        recognition.interimResults = false
        setListening(true)
        recognition.onresult = (event) => {
          const text = String(event.results?.[0]?.[0]?.transcript || '').trim()
          setListening(false)
          if (text) void ask(text)
        }
        recognition.onerror = (event) => {
          setListening(false)
          setError(`语音提问失败：${event.error || 'unknown'}`)
        }
        recognition.onend = () => {
          setListening(false)
          captureRef.current?.resumeTranscription()
        }
        recognition.start()
      }

      const stop = async () => {
        if (!meeting) return
        setStopping(true)
        setError('')
        try {
          await captureRef.current?.stop()
          captureRef.current = null
          stopVoice()
          const completed = await api('stop', { body: { meetingId: meeting.meetingId } })
          setMeeting(completed)
        } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
        finally { setStopping(false); setLevel(0) }
      }

      const reset = () => { stopVoice(); setMeeting(null); setView('meeting'); setError(''); setQuestion(''); setStopping(false); setAsking(false) }
      const selectHistory = async (meetingId) => {
        setHistoryLoading(true)
        setError('')
        try { setHistorySelected(await api('history-entry', { query: { meetingId } })) }
        catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
        finally { setHistoryLoading(false) }
      }
      const openHistory = async () => {
        setView('history')
        setHistoryLoading(true)
        setError('')
        try {
          const items = await api('history')
          setHistoryItems(items)
          if (items.length > 0) await selectHistory(items[0].meetingId)
          else setHistorySelected(null)
        } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
        finally { setHistoryLoading(false) }
      }
      const close = () => { if (!meeting || ['completed', 'failed'].includes(meeting.phase)) setOpen(false) }

      return h('div', { className: 'fm-root' },
        h('button', { className: 'fm-launch', title: meeting?.phase === 'recording' ? '会议正在进行' : '打开会议纪要', onClick: () => setOpen(true) }, meeting?.phase === 'recording' ? '●' : '记'),
        open && h('div', { className: 'fm-backdrop', onMouseDown: (event) => { if (event.target === event.currentTarget) close() } },
          h('div', { className: 'fm-panel', role: 'dialog', 'aria-modal': true, 'aria-label': 'AI 会议助手' },
            h('header', { className: 'fm-head' },
              h('h2', null, view === 'history' ? '历史纪要' : view === 'settings' ? '设置' : meeting?.title || 'AI 会议助手'),
              meeting?.phase === 'recording' && h('div', { className: 'fm-controls' }, h('span', { className: 'fm-record-dot' }), h('small', null, '录音转写中'), h('button', { className: 'fm-danger', disabled: stopping, onClick: stop }, stopping ? '正在生成文档…' : '结束会议')),
              !meeting && view === 'meeting' && h('button', { className: 'fm-ghost', onClick: () => setView('settings') }, '设置'),
              h('button', { className: 'fm-close', disabled: meeting && !['completed', 'failed'].includes(meeting.phase), onClick: close, title: meeting && !['completed', 'failed'].includes(meeting.phase) ? '请先结束会议' : '关闭' }, '×'),
            ),
            h('main', { className: 'fm-body' },
              view === 'history' && h(HistoryPanel, { items: historyItems, selected: historySelected, loading: historyLoading, onSelect: selectHistory, onBack: () => setView('meeting') }),
              view === 'settings' && h(SettingsPanel, { settings, setSettings, config, onBack: () => setView('meeting') }),
              view === 'meeting' && !meeting && h(Home, { config, title, setTitle, browserAsrSupported, onStart: start, onHistory: openHistory, onSettings: () => setView('settings'), pending, error }),
              view === 'meeting' && meeting && ['starting', 'recording', 'stopping'].includes(meeting.phase) && h(LiveMeeting, { meeting, level, question, setQuestion, onAsk: ask, asking, stopping, error, settings, onVoiceAsk: voiceAsk, listening, voiceState, onStopVoice: stopVoice }),
              view === 'meeting' && meeting && ['completed', 'failed'].includes(meeting.phase) && h(CompletedMeeting, { meeting, onNew: reset, onHistory: openHistory }),
            ),
          ),
        ),
      )
    }

    const inject = ['slots']
    function apply(ctx) {
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'meeting-assistant',
        order: 40,
      }, MeetingApp))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
