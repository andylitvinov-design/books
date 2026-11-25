// Client-side PDF for an already-authorized practitioner report.
// Cyrillic and other Unicode text are drawn onto a local canvas, then wrapped
// into PDF pages. No personal report content is sent to third-party services.
import { rasterPagesToPdf } from './client-report-pdf.js'

const W = 1240
const H = 1754
const LEFT = 92
const RIGHT = W - LEFT
const WIDTH = RIGHT - LEFT
const TOP = 155
const BOTTOM = H - 134
const COLORS = { paper: '#fffdf8', brown: '#49392e', terracotta: '#955b40', muted: '#73645b', border: '#e2d3c3', cream: '#f7eee2' }

function paragraphLines(ctx, value, width, font) {
  ctx.font = font
  const lines = []
  for (const original of String(value ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    if (!original.trim()) { lines.push(''); continue }
    let current = ''
    for (let word of original.trim().split(/\s+/)) {
      if (ctx.measureText(word).width > width) {
        if (current) { lines.push(current); current = '' }
        let part = ''
        for (const char of word) {
          if (part && ctx.measureText(part + char).width > width) { lines.push(part); part = char }
          else part += char
        }
        word = part
      }
      if (!current) current = word
      else if (ctx.measureText(current + ' ' + word).width <= width) current += ' ' + word
      else { lines.push(current); current = word }
    }
    if (current) lines.push(current)
  }
  return lines
}

export async function generatePractitionerReportPdf(record, locale = 'en') {
  if (!record || typeof record !== 'object' || !record.title || !record.occurredOn) throw new Error('INVALID_REPORT')
  const ru = locale === 'ru'
  const sections = [
    [ru ? 'Описание' : 'Description', record.description],
    [ru ? 'Результат / содержание отчёта' : 'Report / original result', record.originalResult],
    [ru ? 'Комментарии и рекомендации специалиста' : 'Practitioner comments and recommendations', record.practitionerComment],
  ].filter(([, value]) => typeof value === 'string' && value.trim())
  const pages = []
  let canvas, ctx, y, index = 0
  function save() {
    if (!canvas) return
    const data = canvas.toDataURL('image/jpeg', .83)
    if (!data.startsWith('data:image/jpeg;base64,')) throw new Error('PDF_IMAGE_UNAVAILABLE')
    const binary = atob(data.slice(data.indexOf(',') + 1))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    pages.push(bytes)
    canvas.width = 0
    canvas.height = 0
  }
  function newPage() {
    save()
    if (index >= 80) throw new Error('PDF_TOO_LONG')
    canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('PDF_CANVAS_UNAVAILABLE')
    index++
    ctx.fillStyle = COLORS.paper
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = COLORS.terracotta
    ctx.fillRect(0, 0, W, 16)
    ctx.fillStyle = COLORS.terracotta
    ctx.font = '700 24px system-ui, Arial, sans-serif'
    ctx.fillText('HOLISTIC HOUSE', LEFT, 71)
    ctx.font = '500 21px system-ui, Arial, sans-serif'
    ctx.fillStyle = COLORS.muted
    const classification = ru ? 'ЛИЧНЫЙ ОТЧЁТ · ПРИВАТНО' : 'PERSONAL REPORT · PRIVATE'
    ctx.fillText(classification, RIGHT - ctx.measureText(classification).width, 71)
    ctx.fillStyle = COLORS.border
    ctx.fillRect(LEFT, 110, WIDTH, 2)
    ctx.fillRect(LEFT, H - 93, WIDTH, 1)
    ctx.fillStyle = COLORS.muted
    ctx.font = '400 17px system-ui, Arial, sans-serif'
    ctx.fillText(ru ? 'Личный документ для клиента · Не медицинский диагноз' : 'Private client report · Not a medical diagnosis', LEFT, H - 57)
    ctx.fillText(String(index), RIGHT - 24, H - 57)
    y = TOP
  }
  function printLines(value, { size = 26, weight = 400, color = COLORS.brown, step = 39, space = 12, serif = false } = {}) {
    const font = `${weight} ${size}px ${serif ? 'Georgia, serif' : 'system-ui, Arial, sans-serif'}`
    const lines = paragraphLines(ctx, value, WIDTH, font)
    ctx.font = font
    ctx.fillStyle = color
    for (const text of lines) {
      if (y + step > BOTTOM) newPage()
      ctx.font = font
      ctx.fillStyle = color
      if (text) ctx.fillText(text, LEFT, y)
      y += step
    }
    y += space
  }
  newPage()
  printLines(String(record.title), { size: 53, weight: 400, serif: true, step: 68, space: 22 })
  printLines(String(record.occurredOn), { size: 23, color: COLORS.muted, step: 30, space: 10 })
  if (record.sourceName) printLines(record.sourceName, { size: 22, color: COLORS.muted, step: 31, space: 6 })
  if (record.sourceVersion) printLines(record.sourceVersion, { size: 20, color: COLORS.muted, step: 30, space: 15 })
  ctx.fillStyle = COLORS.border; ctx.fillRect(LEFT, y, WIDTH, 2); y += 34
  if (!sections.length) printLines(ru ? 'Содержание отчёта не предоставлено.' : 'No additional report content was shared.')
  for (const [title, body] of sections) {
    if (y + 140 > BOTTOM) newPage()
    printLines(title, { size: 33, weight: 650, color: COLORS.terracotta, step: 47, space: 10, serif: true })
    printLines(body, { size: 26, step: 40, space: 28 })
  }
  save()
  return rasterPagesToPdf(pages, { width: W, height: H })
}
