const DEFAULT_EMPTY = '暂未从逐字稿中提取到明确内容。'

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeStringList(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(cleanText).filter(Boolean))]
}

function genericSpeakerLabels(transcript) {
  const labels = new Set()
  const pattern = /(?:说话人|Speaker)\s*[A-Za-z0-9一二三四五六七八九十]+/gi
  for (const match of transcript.matchAll(pattern)) labels.add(match[0].trim())
  return [...labels]
}

export function buildSpeakerReviewNotes(transcript, suppliedNotes = []) {
  const notes = normalizeStringList(suppliedNotes)
  const labels = genericSpeakerLabels(transcript)
  if (labels.length > 0) {
    notes.unshift(`请人工确认说话人真实姓名：${labels.join(' / ')}。`)
  }
  return normalizeStringList(notes)
}

function renderList(items, emptyText = DEFAULT_EMPTY) {
  return items.length > 0 ? items.map((item) => `- ${item}`) : [`- ${emptyText}`]
}

/**
 * Standalone port of FanDo's deterministic meeting-minutes Markdown formatter.
 * Model/ASR access stays outside this function so it can be reused and tested
 * without Electron, OpenClaw Gateway, or FanDo backend globals.
 */
export function buildMeetingMinutesMarkdown(options) {
  const { summary } = options
  return [
    '## 摘要',
    '',
    summary.overview,
    '',
    '## 关键结论',
    '',
    ...renderList(summary.decisions),
    '',
    '## 待办事项',
    '',
    ...renderList(summary.actionItems),
    '',
    '## 负责人',
    '',
    ...renderList(summary.owners, '暂未确认明确负责人。'),
    '',
    '## 时间节点',
    '',
    ...renderList(summary.timeline, '暂未确认明确时间节点。'),
    '',
    '## 风险/争议点',
    '',
    ...renderList(summary.risks, '暂未识别到明确风险或争议点。'),
    '',
    '## 说话人标注',
    '',
    ...renderList(summary.speakerNotes, '未发现需要人工核对的说话人标签。'),
    '',
    '## 会议信息',
    '',
    `- 开始时间：${options.startedAt}`,
    `- 结束时间：${options.endedAt}`,
    '- 来源：AI 会议助手',
    '',
    '## 逐字稿',
    '',
    options.transcript || '未提供逐字稿。',
    '',
  ].join('\n')
}

export function buildMeetingMinutes(input) {
  const title = cleanText(input?.title) || '会议纪要'
  const transcript = cleanText(input?.transcript)
  const overview = cleanText(input?.overview) || '暂未形成可核验的会议摘要。'
  const decisions = normalizeStringList(input?.decisions)
  const actionItems = normalizeStringList(input?.actionItems)
  const owners = normalizeStringList(input?.owners)
  const timeline = normalizeStringList(input?.timeline)
  const risks = normalizeStringList(input?.risks)
  const speakerNotes = buildSpeakerReviewNotes(transcript, input?.speakerNotes)
  const startedAt = cleanText(input?.startedAt) || '未记录'
  const endedAt = cleanText(input?.endedAt) || '未记录'

  const summary = {
    overview,
    decisions,
    actionItems,
    owners,
    timeline,
    risks,
    speakerNotes,
  }
  const markdown = buildMeetingMinutesMarkdown({
    transcript,
    summary,
    startedAt,
    endedAt,
  })

  return {
    title,
    markdown,
    summary,
    transcriptLength: transcript.length,
  }
}
