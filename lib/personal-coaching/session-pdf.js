// Holistic House · private, browser-only coaching PDF export.
// Canvas paints Unicode text using fonts available on the reader's device.
// PDF pages contain high-resolution JPEG artwork; no transcript or image is
// uploaded, cached by a server, or sent to a third-party PDF provider.
const PAGE_WIDTH = 1240
const PAGE_HEIGHT = 1754
const CONTENT_LEFT = 94
const CONTENT_RIGHT = 1146
const CONTENT_BOTTOM = 1608
const FONT = 'system-ui, -apple-system, "Segoe UI", "Noto Sans", Arial, sans-serif'

const words = {
  en: {
    report: 'COACHING SESSION REPORT', date: 'Session date', questions: 'Questions and my answers',
    reflection: 'Additional reflection', topic: 'My topic', clientQuestion: 'My question',
    action: 'My action plan', skipped: 'Not answered', undated: 'Date not available',
    footer: 'Private copy · Holistic House', notice: 'A record of your own words, not a diagnosis or a coaching appointment.',
  },
  ru: {
    report: 'ОТЧЁТ ПО КОУЧИНГ-СЕССИИ', date: 'Дата сессии', questions: 'Вопросы и мои ответы',
    reflection: 'Дополнительное размышление', topic: 'Моя тема', clientQuestion: 'Мой запрос',
    action: 'Мой план действий', skipped: 'Без ответа', undated: 'Дата не указана',
    footer: 'Личная копия · Holistic House', notice: 'Ваши собственные ответы, не диагноз и не запись на консультацию.',
  },
  es: {
    report: 'INFORME DE LA SESIÓN DE COACHING', date: 'Fecha de la sesión', questions: 'Preguntas y mis respuestas',
    reflection: 'Reflexión adicional', topic: 'Mi tema', clientQuestion: 'Mi pregunta',
    action: 'Mi plan de acción', skipped: 'Sin respuesta', undated: 'Fecha no disponible',
    footer: 'Copia privada · Holistic House', notice: 'Tus propias respuestas; no es un diagnóstico ni una cita.',
  },
}

export function coachingReportDate(value, locale = 'en') {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : null
  if (!date || !Number.isFinite(date.getTime())) return words[locale]?.undated || words.en.undated
  return new Intl.DateTimeFormat(
    locale === 'ru' ? 'ru-RU' : locale === 'es' ? 'es-ES' : 'en-CA',
    { day: 'numeric', month: 'long', year: 'numeric' },
  ).format(date)
}

function pdfFilename(dateValue, slug) {
  const date = new Date(dateValue)
  const datePart = Number.isFinite(date.getTime())
    ? [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
    : 'undated'
  const safeSlug = String(slug || 'session').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40) || 'session'
  return 'holistic-house-' + safeSlug + '-' + datePart + '.pdf'
}

function wrapLines(context, raw, maxWidth) {
  const paragraphs = String(raw ?? '').replace(/\r/g, '').split('\n')
  const output = []
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) { output.push(''); continue }
    const words = paragraph.trim().split(/\s+/)
    let current = ''
    for (const word of words) {
      const trial = current ? current + ' ' + word : word
      if (context.measureText(trial).width <= maxWidth) { current = trial; continue }
      if (current) { output.push(current); current = '' }
      // Long URLs and unspaced Unicode text must not run off the A4 page.
      for (const char of Array.from(word)) {
        if (current && context.measureText(current + char).width > maxWidth) {
          output.push(current)
          current = ''
        }
        current += char
      }
    }
    if (current) output.push(current)
  }
  return output
}

function bytes(value) { return new TextEncoder().encode(value) }

export function encodeJpegPagesAsPdf(jpegPages) {
  if (!Array.isArray(jpegPages) || !jpegPages.length ||
      jpegPages.some(page => !(page instanceof Uint8Array) || !page.length)) {
    throw new Error('COACHING_PDF_NO_PAGES')
  }
  const chunks = []
  const positions = [0]
  let position = 0
  const add = chunk => { chunks.push(chunk); position += chunk.length }
  const text = value => add(bytes(value))
  const beginObject = id => { positions[id] = position; text(id + ' 0 obj\n') }
  const endObject = () => text('\nendobj\n')
  const kids = jpegPages.map((_, index) => (3 + index * 3) + ' 0 R').join(' ')
  text('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  beginObject(1)
  text('<< /Type /Catalog /Pages 2 0 R >>')
  endObject()
  beginObject(2)
  text('<< /Type /Pages /Kids [' + kids + '] /Count ' + jpegPages.length + ' >>')
  endObject()
  jpegPages.forEach((jpeg, index) => {
    const pageId = 3 + index * 3
    const imageId = pageId + 1
    const contentsId = pageId + 2
    beginObject(pageId)
    text('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ' + imageId + ' 0 R >> >> /Contents ' + contentsId + ' 0 R >>')
    endObject()
    beginObject(imageId)
    text('<< /Type /XObject /Subtype /Image /Width ' + PAGE_WIDTH +
      ' /Height ' + PAGE_HEIGHT + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n')
    add(jpeg)
    text('\nendstream')
    endObject()
    const content = 'q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n'
    beginObject(contentsId)
    text('<< /Length ' + bytes(content).length + ' >>\nstream\n' + content + 'endstream')
    endObject()
  })
  const xrefPosition = position
  const objects = 2 + jpegPages.length * 3
  text('xref\n0 ' + (objects + 1) + '\n0000000000 65535 f \n')
  for (let id = 1; id <= objects; id++) {
    text(String(positions[id]).padStart(10, '0') + ' 00000 n \n')
  }
  text('trailer\n<< /Size ' + (objects + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefPosition + '\n%%EOF\n')
  return new Blob(chunks, { type: 'application/pdf' })
}

function jpegBytes(dataUrl) {
  if (!dataUrl.startsWith('data:image/jpeg;base64,')) throw new Error('COACHING_PDF_UNSUPPORTED_CANVAS')
  const binary = atob(dataUrl.slice('data:image/jpeg;base64,'.length))
  const result = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) result[index] = binary.charCodeAt(index)
  return result
}

/**
 * Generates a real multi-page A4 PDF completely on-device. The calling UI must
 * use persisted account answers for signed-in sessions, not an unsaved draft.
 * No app API, storage, analytics or external font network requests are used.
 */
export function createCoachingSessionPdf({ locale = 'en', title, slug, sessionDate, entries = [],
  topic = '', clientQuestion = '', actionPlan = '' } = {}) {
  const lang = Object.prototype.hasOwnProperty.call(words, locale) ? locale : 'en'
  const t = words[lang]
  if (!Array.isArray(entries) || !entries.length) throw new Error('COACHING_PDF_EMPTY')
  if (typeof document === 'undefined') throw new Error('COACHING_PDF_BROWSER_ONLY')
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH
  canvas.height = PAGE_HEIGHT
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('COACHING_PDF_CANVAS_UNAVAILABLE')
  const images = []
  let page = 0
  let y = 0
  const font = (weight, size) => { ctx.font = weight + ' ' + size + 'px ' + FONT }
  const finishPage = () => {
    ctx.fillStyle = '#dce7e2'
    ctx.fillRect(CONTENT_LEFT, 1664, CONTENT_RIGHT - CONTENT_LEFT, 2)
    ctx.fillStyle = '#54716c'
    font(500, 20)
    ctx.textBaseline = 'top'
    ctx.fillText(t.footer, CONTENT_LEFT, 1680)
    const marker = String(page)
    ctx.fillText(marker, CONTENT_RIGHT - ctx.measureText(marker).width, 1680)
    images.push(jpegBytes(canvas.toDataURL('image/jpeg', 0.86)))
  }
  const beginPage = () => {
    page++
    ctx.fillStyle = '#fffdf8'
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    ctx.fillStyle = '#203d45'
    ctx.fillRect(0, 0, PAGE_WIDTH, 130)
    ctx.fillStyle = '#fffaf3'
    font(750, 25)
    ctx.textBaseline = 'top'
    ctx.fillText('HOLISTIC HOUSE  ·  ACADEMY', CONTENT_LEFT, 48)
    y = 182
  }
  const ensure = height => {
    if (y + height > CONTENT_BOTTOM) {
      finishPage()
      beginPage()
    }
  }
  const paragraph = (value, size = 27, weight = 400, color = '#2e4247', lineHeight = 38) => {
    font(weight, size)
    const lines = wrapLines(ctx, value, CONTENT_RIGHT - CONTENT_LEFT)
    for (const line of lines) {
      ensure(lineHeight)
      font(weight, size)
      ctx.fillStyle = color
      if (line) ctx.fillText(line, CONTENT_LEFT, y)
      y += lineHeight
    }
  }
  const caption = label => {
    ensure(96)
    font(750, 20)
    ctx.fillStyle = '#247a79'
    paragraph(label, 20, 750, '#247a79', 30)
    y += 7
  }
  const section = (heading, value) => {
    if (!value) return
    ensure(114)
    caption(heading)
    paragraph(value, 27, 450, '#293f45', 39)
    y += 17
  }

  beginPage()
  paragraph(t.report, 24, 800, '#277779', 35)
  y += 8
  paragraph(String(title || 'Coaching session'), 53, 750, '#203d45', 67)
  y += 17
  paragraph(t.date + ': ' + coachingReportDate(sessionDate, lang), 27, 600, '#536b6a', 38)
  y += 18
  section(t.topic, topic)
  section(t.clientQuestion, clientQuestion)
  ensure(80)
  paragraph(t.questions, 36, 750, '#21454d', 48)
  y += 17

  entries.forEach((entry, index) => {
    const question = String(entry?.question || '').trim()
    if (!question) return
    ensure(118)
    ctx.fillStyle = '#dcebe5'
    ctx.fillRect(CONTENT_LEFT, y, CONTENT_RIGHT - CONTENT_LEFT, 2)
    y += 25
    paragraph(String(index + 1) + '. ' + question, 30, 700, '#1e5157', 44)
    y += 9
    const answer = typeof entry?.answer === 'string' && entry.answer.trim() ? entry.answer : t.skipped
    paragraph(answer, 28, 400, '#283d43', 41)
    if (typeof entry?.reflection === 'string' && entry.reflection.trim()) {
      y += 6
      caption(t.reflection)
      paragraph(entry.reflection, 26, 400, '#385958', 39)
    }
    y += 26
  })
  section(t.action, actionPlan)
  y += 7
  paragraph(t.notice, 21, 400, '#6b7978', 32)
  finishPage()
  return { blob: encodeJpegPagesAsPdf(images), filename: pdfFilename(sessionDate, slug), pages: images.length }
}

export function downloadCoachingSessionPdf(options) {
  const { blob, filename } = createCoachingSessionPdf(options)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Safari may need time to transfer the Blob to its Files/preview UI.
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  return filename
}
