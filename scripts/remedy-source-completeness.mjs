import { readFileSync } from 'node:fs'
import path from 'node:path'

export const requiredSectionMarkers = [
  'ОСНОВА',
  'ЭФФЕКТ',
  'ОБРАЗ',
  'АРХЕТИП',
  'ТЕНЬ',
  'РЕСУРС',
  'ВНУТРЕННИЙ КОНФЛИКТ',
]

const structuredHeadings = new Set([
  ...requiredSectionMarkers,
  'ПОКАЗАНИЯ',
  'ПРИМЕНЕНИЕ',
  'ИДЕЯ',
  'ИДЕЯ АРХЕТИПА',
  'УРОК',
  'ТРАНСФОРМАЦИЯ',
  'АЛХИМИЯ',
  'СЦЕНАРИЙ',
  'ЭТАП РАЗВИТИЯ',
  'ОБРАЗЫ / МЕТАФОРЫ',
  'ОБОСНОВАНИЕ',
  'КОНФЛИКТЫ',
  'ЗАДАЧИ',
  'ИСТОЧНИК',
  'НАБЛЮДЕНИЯ',
  'ПОСЛАНИЕ',
  'ОБРАЗ / МЕДИТАЦИЯ',
  'РИТУАЛ',
  'ТОЧКИ КОНФЛИКТА',
  'РЕСУРС АРХЕТИПА',
  'ТЕНЬ АРХЕТИПА',
])

function csv(line) {
  const cells = []; let value = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1 } else quoted = !quoted
    } else if (character === ',' && !quoted) { cells.push(value); value = '' } else value += character
  }
  cells.push(value)
  return cells
}

export function readCsv(filePath) {
  const lines = readFileSync(filePath, 'utf8').trim().split('\n')
  const header = csv(lines.shift())
  return lines.map((line) => Object.fromEntries(header.map((column, index) => [column, csv(line)[index] ?? ''])))
}

function plainText(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number(codePoint)))
    .replace(/[ \t]+/g, ' ').replace(/\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function endOfDiv(html, start) {
  const divTag = /<\/?div\b[^>]*>/gi; divTag.lastIndex = start; let depth = 0; let token
  while ((token = divTag.exec(html))) {
    depth += token[0][1] === '/' ? -1 : 1
    if (depth === 0) return divTag.lastIndex
  }
  throw new Error(`unclosed div at ${start}`)
}

export function telegramTexts(exportRoot) {
  const html = readFileSync(path.join(exportRoot, 'messages.html'), 'utf8')
  const start = /<div\b(?=[^>]*\bclass="([^"]*\bmessage\b[^"]*)")(?=[^>]*\bid="([^"]+)")[^>]*>/gi
  const messages = new Map(); let match
  while ((match = start.exec(html))) {
    const end = endOfDiv(html, match.index); const fragment = html.slice(match.index, end)
    const textStart = /<div\b[^>]*class="text"[^>]*>/gi; const textParts = []; let textMatch
    while ((textMatch = textStart.exec(fragment))) {
      const textEnd = endOfDiv(fragment, textMatch.index)
      textParts.push(plainText(fragment.slice(textMatch.index, textEnd)))
      textStart.lastIndex = textEnd
    }
    messages.set(match[2], textParts.join('\n\n').trim())
    start.lastIndex = end
  }
  return messages
}

export function cleanTelegramText(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const kept = lines.filter((line) => !/(?:@andytherapist|записаться|свободн(?:ые|ое) время|стоимость|акци[яи]|скидк|консультаци|подписывай)/iu.test(line))
  return kept.join('\n\n').trim()
}

function heading(value) {
  return value.replace(/^[\d.\s]+/, '').replace(/[:.]+$/, '').trim().toUpperCase()
}

export function formatSourceCard(text) {
  return cleanTelegramText(text).split(/\n{2,}/).map((block) => {
    const label = heading(block)
    return structuredHeadings.has(label) ? `## ${label}` : block
  }).join('\n\n').trim()
}

function normalise(value) {
  return String(value).toLocaleUpperCase('ru-RU').replace(/Ё/g, 'Е').replace(/\s+/g, ' ').trim()
}

function includesMarker(text, marker) {
  const pattern = marker === 'ТЕНЬ' || marker === 'РЕСУРС'
    ? new RegExp(`^${marker}(?:\\s|:|$)`, 'u')
    : new RegExp(`^${marker}(?::|$)`, 'u')
  return String(text)
    .split('\n')
    .map((line) => normalise(line.replace(/^#+\s*/, '').replace(/^[*•–—-]\s*/, '')))
    .some((line) => pattern.test(line))
}

export function requiredSectionsIn(text) {
  return requiredSectionMarkers.filter((marker) => includesMarker(text, marker))
}

export function missingRequiredSections(primarySource, canonicalBody) {
  return requiredSectionsIn(primarySource).filter((marker) => !includesMarker(canonicalBody, marker))
}

export function sourceChannelUrl() {
  return 'https://t.me/arche_therapy'
}
