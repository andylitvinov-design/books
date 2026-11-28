import { AppError, onlyKeys } from '../assessments/contracts.js'
import { likelySensitiveDisclosure } from '../holistic-support/client-memory-core.mjs'

export const DAYBOOK_COACH_TOPICS = Object.freeze(['body_health', 'emotional_wellbeing', 'relationships',
  'career_business', 'finance', 'personal_growth', 'lifestyle', 'meaning_purpose'])
const bad = () => { throw new AppError('DAYBOOK_COACH_EXCERPT_INVALID') }
function selection(input) {
  onlyKeys(input, ['revision', 'topicKey', 'start', 'end'])
  if (!Number.isSafeInteger(input.revision) || input.revision < 1 ||
      !DAYBOOK_COACH_TOPICS.includes(input.topicKey) ||
      !Number.isSafeInteger(input.start) || input.start < 0 ||
      !Number.isSafeInteger(input.end) || input.end <= input.start || input.end > 40000 ||
      input.end - input.start > 240) bad()
  return { revision: input.revision, topicKey: input.topicKey, start: input.start, end: input.end }
}
function splitsSurrogate(text, index) {
  return index > 0 && index < text.length &&
    /[\uD800-\uDBFF]/u.test(text[index - 1]) && /[\uDC00-\uDFFF]/u.test(text[index])
}
export function daybookCoachExcerpt(entry, input, materialVersion) {
  const range = selection(input)
  if (entry?.revision !== range.revision || typeof entry.text !== 'string' ||
      range.end > entry.text.length || splitsSurrogate(entry.text, range.start) ||
      splitsSurrogate(entry.text, range.end)) bad()
  const text = entry.text.slice(range.start, range.end)
  if (!text.trim() || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(text) ||
      likelySensitiveDisclosure(text)) bad()
  const linked=entry.material!==undefined
  if(linked?typeof materialVersion!=='string'||!/^[a-f0-9]{24}$/.test(materialVersion):materialVersion!==undefined)bad()
  return {text,sourceRevision:['journal',linked?'2':'1',range.revision,range.topicKey,range.start,range.end,
    ...(linked?[materialVersion]:[])].join(':')}
}
export function parseDaybookCoachExcerptRevision(value) {
  if (typeof value !== 'string' || value.length > 128) return null
  const match = /^journal:([12]):([1-9]\d*):([a-z_]+):(0|[1-9]\d*):([1-9]\d*)(?::([a-f0-9]{24}))?$/.exec(value)
  if (!match || (match[1]==='2')!==Boolean(match[6])) return null
  try {
    const range=selection({revision:Number(match[2]),topicKey:match[3],start:Number(match[4]),end:Number(match[5])})
    return match[6]?{...range,materialVersion:match[6]}:range
  } catch {
    return null
  }
}
