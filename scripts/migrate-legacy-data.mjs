import { cp, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const baseDir = path.resolve(process.argv[2] || process.cwd())
const sourceDir = path.join(baseDir, 'fando-meeting-documents')
const targetDir = path.join(baseDir, 'meeting-assistant-data')

await mkdir(targetDir, { recursive: true })
await cp(sourceDir, targetDir, { recursive: true, force: false, errorOnExist: false })

const historyDir = path.join(targetDir, '.history')
for (const entry of await readdir(historyDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.json')) continue
  const filePath = path.join(historyDir, entry.name)
  const value = JSON.parse(await readFile(filePath, 'utf8'))
  if (value?.document?.path) value.document.path = path.join(targetDir, path.basename(value.document.path))
  if (value?.recording?.path) value.recording.path = path.join(targetDir, path.basename(value.recording.path))
  if (value?.document?.markdown) value.document.markdown = value.document.markdown.replaceAll('FanDo DSH 会议纪要插件', 'AI 会议助手')
  const temporary = `${filePath}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(value, null, 2), 'utf8')
  await rename(temporary, filePath)
}

for (const entry of await readdir(targetDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.md')) continue
  const filePath = path.join(targetDir, entry.name)
  const source = await readFile(filePath, 'utf8')
  const sanitized = source.replaceAll('FanDo DSH 会议纪要插件', 'AI 会议助手')
  if (sanitized === source) continue
  const temporary = `${filePath}.${randomUUID()}.tmp`
  await writeFile(temporary, sanitized, 'utf8')
  await rename(temporary, filePath)
}

console.log(JSON.stringify({ sourceDir, targetDir, migrated: true }))
