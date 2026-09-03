# Architecture

```text
DeepSeek Harness Web
  └─ Meeting Assistant client
      ├─ microphone PCM -> Host -> local WAV
      ├─ browser SpeechRecognition -> transcript endpoint
      ├─ text / voice / wake-word question -> Harness model
      │   └─ optional Harness web search
      ├─ answer text -> Volcengine standard TTS -> MP3 playback
      └─ stop meeting
          ├─ finalize WAV
          ├─ generate structured summary
          ├─ atomically save Markdown
          └─ persist history JSON
```

## Browser client

- Owns microphone permission, browser transcription, audio frame upload and live UI.
- Stores wake word and automatic playback preferences in browser local storage.
- Supports cancellation of both the TTS request and active audio playback.

## Host runtime

- Writes PCM frames into a full WAV source recording.
- Keeps meeting state, transcript, questions, answers, events and generated documents.
- Serves history, voice files and recordings. Recording delivery supports HTTP byte ranges for seeking.
- Resolves model and voice credentials without exposing secrets to the browser.

## Persistence

```text
meeting-assistant-data/
  <date>_<title>_<id>.wav
  <date>_<title>_<id>.md
  voice/*.mp3
  .history/<meeting-id>.json
```

Meeting JSON points to the original WAV and final Markdown. The history interface uses this record to present summary, process, transcript and source recording in one workspace.
