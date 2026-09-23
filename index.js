import { buildMeetingMinutes } from './minutes-core.js'
import { MeetingRuntime } from './meeting-runtime.js'

export const inject = ['tools', 'systemPrompt', 'webServer', 'llm', 'agentDefaultModel', 'clientModules', 'web', 'credentials']

const inputStringArray = (description) => ({ type: 'array', description, items: { type: 'string' } })
const outputStringArray = { type: 'array', items: { type: 'string' } }

const parameters = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'transcript', 'overview', 'decisions', 'actionItems', 'owners', 'timeline', 'risks'],
  properties: {
    title: { type: 'string', description: 'Meeting title.' },
    transcript: {
      type: 'string',
      description: 'Verbatim transcript or existing minutes in plain text/Markdown. Preserve speaker labels and timestamps.',
    },
    overview: { type: 'string', description: 'Short factual overview grounded in the source.' },
    decisions: inputStringArray('Explicit decisions or conclusions. Empty when none are explicit.'),
    actionItems: inputStringArray('Explicit action items. Include owner or due date only when stated.'),
    owners: inputStringArray('Explicitly named owners. Empty when no owner is stated.'),
    timeline: inputStringArray('Explicit dates, deadlines, or milestones. Empty when absent.'),
    risks: inputStringArray('Explicit risks, blockers, disagreements, or unresolved questions. Empty when absent.'),
    speakerNotes: inputStringArray('Optional speaker-attribution caveats supported by the source.'),
    startedAt: { type: 'string', description: 'Optional meeting start time as written in the source.' },
    endedAt: { type: 'string', description: 'Optional meeting end time as written in the source.' },
  },
}

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'markdown', 'summary', 'transcriptLength'],
  properties: {
    title: { type: 'string' },
    markdown: { type: 'string' },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['overview', 'decisions', 'actionItems', 'owners', 'timeline', 'risks', 'speakerNotes'],
      properties: {
        overview: { type: 'string' },
        decisions: outputStringArray,
        actionItems: outputStringArray,
        owners: outputStringArray,
        timeline: outputStringArray,
        risks: outputStringArray,
        speakerNotes: outputStringArray,
      },
    },
    transcriptLength: { type: 'integer' },
  },
}

function assertArguments(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid meeting-minutes arguments')
  const requiredStrings = ['title', 'transcript', 'overview']
  const requiredLists = ['decisions', 'actionItems', 'owners', 'timeline', 'risks']
  for (const key of requiredStrings) {
    if (typeof args[key] !== 'string') throw new Error(`Invalid meeting-minutes argument: ${key} must be a string`)
  }
  for (const key of requiredLists) {
    if (!Array.isArray(args[key]) || args[key].some((item) => typeof item !== 'string')) {
      throw new Error(`Invalid meeting-minutes argument: ${key} must be a string array`)
    }
  }
  if (args.speakerNotes !== undefined
    && (!Array.isArray(args.speakerNotes) || args.speakerNotes.some((item) => typeof item !== 'string'))) {
    throw new Error('Invalid meeting-minutes argument: speakerNotes must be a string array')
  }
  for (const key of ['startedAt', 'endedAt']) {
    if (args[key] !== undefined && typeof args[key] !== 'string') {
      throw new Error(`Invalid meeting-minutes argument: ${key} must be a string`)
    }
  }
}

export function apply(ctx, config = {}) {
  const runtime = new MeetingRuntime(ctx, config)
  // DSH rc.2 does not always revisit a dsh.client package contributed by a
  // later third-party bundle layer. The public graph check keeps newer hosts
  // on the normal path; the guarded rc.2 scan seam is used only when absent.
  queueMicrotask(() => {
    const modules = ctx.clientModules
    if (modules?.graph?.().entries?.some((entry) => entry.id === '@meeting-assistant/dsh-meeting-minutes')) {
      return
    }
    if (typeof modules?.processOne !== 'function' || typeof modules.compose !== 'function') {
      ctx.logger?.warn?.('Meeting assistant client bundle was not discovered by this DSH host')
      return
    }
    if (modules.pkgMeta?.get?.('@meeting-assistant/dsh-meeting-minutes') === null) {
      modules.pkgMeta.delete('@meeting-assistant/dsh-meeting-minutes')
    }
    try {
      const changed = modules.processOne('@meeting-assistant/dsh-meeting-minutes')
      if (changed) {
        modules.composed = modules.compose()
        modules.notifyGraphChanged?.()
      }
    } catch (error) {
      ctx.logger?.warn?.(error)
    }
  })
  ctx.effect(() => {
    const disposeRoute = ctx.webServer.register({
      kind: 'prefix',
      path: '/meeting-assistant/api',
      handler: (req, res) => runtime.route(req, res),
    })
    return () => {
      runtime.dispose()
      disposeRoute()
    }
  }, 'meeting-assistant: web API and runtime')

  ctx.systemPrompt.section({
    name: 'tool:meeting-minutes',
    order: 120,
    text: [
      'Use meeting_minutes only when the user asks to create or structure meeting minutes.',
      'Before calling it, extract only facts supported by the transcript or existing minutes.',
      'Do not invent names, owners, deadlines, decisions, or risks. Use empty arrays when evidence is absent.',
      'Keep generic speaker labels such as “说话人 1” or “Speaker 1”; the plugin will flag them for review.',
      'Return the generated Markdown to the user after the tool succeeds.',
    ].join(' '),
  })

  ctx.tools.register({
    name: 'meeting_minutes',
    description: [
      'Create evidence-preserving meeting minutes from a transcript or existing minutes.',
      'The caller must extract the structured fields from the source without guessing.',
      'Pass empty arrays for decisions, action items, owners, timeline, or risks when the source does not state them.',
    ].join(' '),
    parameters,
    output: {
      schema: outputSchema,
      render: (_args, value) => [{ type: 'text', text: value.markdown }],
    },
    async execute(args, exec) {
      if (exec.signal.aborted) throw exec.signal.reason ?? new Error('Meeting-minutes generation aborted')
      assertArguments(args)
      const result = buildMeetingMinutes(args)
      if (exec.signal.aborted) throw exec.signal.reason ?? new Error('Meeting-minutes generation aborted')
      return result
    },
  })

  ctx.tools.register({
    name: 'meeting_runtime_status',
    description: 'Inspect the meeting assistant model, browser transcription, output directory, and any active meeting.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    execute: async (_args, exec) => {
      if (exec.signal.aborted) throw exec.signal.reason ?? new Error('Status request aborted')
      return runtime.status()
    },
  })
}
