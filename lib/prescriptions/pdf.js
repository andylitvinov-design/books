import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deflateSync } from 'node:zlib'

import { recommendationCopy, recommendationGuidance, remedySchedule } from '../documents/recommendation.js'
import { LETTERHEAD } from '../documents/letterhead.js'
import { DOCUMENT_TEMPLATE } from '../documents/template.js'
import { paymentNarrative, formatPaymentAmount } from '../documents/payment.js'

const A4 = { ...DOCUMENT_TEMPLATE.page, left: DOCUMENT_TEMPLATE.page.margin, top: 601, bottom: 58 }
const TYPE = DOCUMENT_TEMPLATE.typography
const notoSansPath = resolve(process.cwd(), 'assets/fonts/NotoSans-Regular.ttf')
const notoSansData = readFileSync(notoSansPath)

function literal(value) {
  return String(value).replace(/([\\()])/g, '\\$1')
}

export function measurePdfText(value, size = 10) {
  return [...String(value)].reduce((width, char) => width + notoSans.advanceWidth(notoSans.glyphForCodePoint(char.codePointAt(0))) * size / notoSans.unitsPerEm, 0)
}

export function wrapPdfText(value, width = 459, size = 10) {
  const lines = []
  for (const paragraph of String(value).replace(/\r\n?/g, '\n').split('\n')) {
    let line = ''
    for (const word of paragraph.split(/[^\S\n]+/).filter(Boolean)) {
      if (line && measurePdfText(`${line} ${word}`, size) <= width) { line += ` ${word}`; continue }
      if (line) { lines.push(line); line = '' }
      for (const character of word) {
        if (line && measurePdfText(line + character, size) > width) { lines.push(line); line = '' }
        line += character
      }
    }
    lines.push(line)
  }
  return lines
}

function uint16(buffer, offset) { return buffer.readUInt16BE(offset) }
function uint32(buffer, offset) { return buffer.readUInt32BE(offset) }

function tableDirectory(data) {
  const tables = new Map()
  for (let index = 0; index < uint16(data, 4); index += 1) {
    const offset = 12 + (index * 16)
    tables.set(data.toString('ascii', offset, offset + 4), { offset: uint32(data, offset + 8), length: uint32(data, offset + 12) })
  }
  return tables
}

function selectBmpCmap(data, cmap) {
  let fallback
  for (let index = 0; index < uint16(data, cmap.offset + 2); index += 1) {
    const record = cmap.offset + 4 + (index * 8)
    const platform = uint16(data, record)
    const encoding = uint16(data, record + 2)
    const offset = cmap.offset + uint32(data, record + 4)
    if (uint16(data, offset) !== 4) continue
    if (platform === 3 && encoding === 1) return { offset }
    fallback ??= { offset }
  }
  if (!fallback) throw new Error('Bundled Noto Sans does not expose a BMP cmap')
  return fallback
}

function glyphForCodePoint(data, cmap, codePoint) {
  const segments = uint16(data, cmap.offset + 6) / 2
  const endCodes = cmap.offset + 14
  const startCodes = endCodes + (segments * 2) + 2
  const deltas = startCodes + (segments * 2)
  const ranges = deltas + (segments * 2)
  for (let index = 0; index < segments; index += 1) {
    const start = uint16(data, startCodes + (index * 2))
    const end = uint16(data, endCodes + (index * 2))
    if (codePoint < start || codePoint > end) continue
    const delta = uint16(data, deltas + (index * 2))
    const rangePosition = ranges + (index * 2)
    const rangeOffset = uint16(data, rangePosition)
    if (!rangeOffset) return (codePoint + delta) & 0xffff
    const glyph = uint16(data, rangePosition + rangeOffset + ((codePoint - start) * 2))
    return glyph ? (glyph + delta) & 0xffff : 0
  }
  return 0
}

function parseNotoSans(data) {
  const tables = tableDirectory(data)
  const head = tables.get('head')
  const hhea = tables.get('hhea')
  const hmtx = tables.get('hmtx')
  const cmap = tables.get('cmap')
  if (!head || !hhea || !hmtx || !cmap) throw new Error('Bundled Noto Sans is missing a required TrueType table')
  const unitsPerEm = uint16(data, head.offset + 18)
  const metricsCount = uint16(data, hhea.offset + 34)
  return {
    advanceWidth(glyph) { return uint16(data, hmtx.offset + (Math.min(glyph, metricsCount - 1) * 4)) },
    ascent: data.readInt16BE(hhea.offset + 4),
    cmap: selectBmpCmap(data, cmap),
    data,
    descent: data.readInt16BE(hhea.offset + 6),
    glyphForCodePoint(codePoint) { return glyphForCodePoint(data, this.cmap, codePoint) },
    unitsPerEm,
    xMax: data.readInt16BE(head.offset + 42), xMin: data.readInt16BE(head.offset + 36),
    yMax: data.readInt16BE(head.offset + 44), yMin: data.readInt16BE(head.offset + 38),
  }
}

const notoSans = parseNotoSans(notoSansData)

function unicodeHex(codePoint) {
  if (codePoint <= 0xffff) return codePoint.toString(16).toUpperCase().padStart(4, '0')
  const value = codePoint - 0x10000
  return `${(0xd800 + (value >> 10)).toString(16).toUpperCase()}${(0xdc00 + (value & 0x3ff)).toString(16).toUpperCase()}`
}

function pdfObject(objects, value) {
  objects.push(Buffer.isBuffer(value) ? value : Buffer.from(value, 'latin1'))
  return objects.length
}

function createUnicodeUsage() {
  const glyphs = new Map()
  return {
    encode(value) {
      const encoded = []
      for (const character of String(value)) {
        const codePoint = character.codePointAt(0)
        const glyph = notoSans.glyphForCodePoint(codePoint)
        if (!glyph && character !== '\u0000') throw new Error(`Bundled Noto Sans is missing U+${unicodeHex(codePoint)}`)
        glyphs.set(glyph, codePoint)
        encoded.push(glyph.toString(16).toUpperCase().padStart(4, '0'))
      }
      return encoded.join('')
    },
    resources(objects) {
      const entries = [...glyphs.entries()].filter(([glyph]) => glyph).sort(([left], [right]) => left - right)
      const widths = entries.map(([glyph]) => `${glyph} [${Math.round((notoSans.advanceWidth(glyph) * 1000) / notoSans.unitsPerEm)}]`).join(' ')
      const unicode = entries.map(([glyph, codePoint]) => `<${glyph.toString(16).toUpperCase().padStart(4, '0')}> <${unicodeHex(codePoint)}>`)
      const cmap = ['/CIDInit /ProcSet findresource begin', '12 dict begin', 'begincmap', '/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> def', '/CMapName /Adobe-Identity-UCS def', '/CMapType 2 def', '1 begincodespacerange', '<0000> <FFFF>', 'endcodespacerange', `${unicode.length} beginbfchar`, ...unicode, 'endbfchar', 'endcmap', 'CMapName currentdict /CMap defineresource pop', 'end', 'end'].join('\n')
      const compressedFont = deflateSync(notoSans.data)
      const fontProgram = pdfObject(objects, Buffer.concat([Buffer.from(`<< /Length ${compressedFont.length} /Length1 ${notoSans.data.length} /Filter /FlateDecode >>\nstream\n`, 'ascii'), compressedFont, Buffer.from('\nendstream', 'ascii')]))
      const scale = (value) => Math.round((value * 1000) / notoSans.unitsPerEm)
      const descriptor = pdfObject(objects, `<< /Type /FontDescriptor /FontName /NotoSans-Regular /Flags 32 /FontBBox [${scale(notoSans.xMin)} ${scale(notoSans.yMin)} ${scale(notoSans.xMax)} ${scale(notoSans.yMax)}] /Ascent ${scale(notoSans.ascent)} /Descent ${scale(notoSans.descent)} /CapHeight ${scale(notoSans.ascent)} /ItalicAngle 0 /StemV 80 /FontFile2 ${fontProgram} 0 R >>`)
      const descendant = pdfObject(objects, `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /NotoSans-Regular /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /DW 500 /W [${widths}] /CIDToGIDMap /Identity >>`)
      const toUnicode = pdfObject(objects, `<< /Length ${Buffer.byteLength(cmap, 'ascii')} >>\nstream\n${cmap}\nendstream`)
      const native = pdfObject(objects, `<< /Type /Font /Subtype /Type0 /BaseFont /NotoSans-Regular /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${toUnicode} 0 R >>`)
      const asciiWidths = Array.from({ length: 95 }, (_, index) => scale(notoSans.advanceWidth(notoSans.glyphForCodePoint(index + 32)))).join(' ')
      const ascii = pdfObject(objects, `<< /Type /Font /Subtype /TrueType /BaseFont /NotoSans-Regular /FirstChar 32 /LastChar 126 /Widths [${asciiWidths}] /FontDescriptor ${descriptor} 0 R /Encoding /WinAnsiEncoding >>`)
      return { native, ascii }
    },
  }
}


function buildDocument(document, locale, origin, payment = false) {
  const copy = recommendationCopy(locale, document.recommendationType)
  const guidance = payment ? undefined : recommendationGuidance(document, locale)
  const unicode = createUnicodeUsage()
  const layouts = []
  let page, y
  const text = (value, x, baseline, size = TYPE.bodySize, font = 'F1', color = TYPE.ink) => {
    const native = (font === 'F3' || font === 'F4' ? /[^\x20-\xff]/ : /[^\x20-\x7e]/).test(String(value))
    page.commands.push(`${color} rg BT /${native ? 'F2' : font} ${size} Tf 1 0 0 1 ${x} ${baseline} Tm ${native ? `<${unicode.encode(value)}>` : `(${literal(value)})`} Tj ET`)
  }
  const rule = (baseline, end = 527.28) => page.commands.push(`0.72 0.77 0.8 RG 0.4 w 68 ${baseline} m ${end} ${baseline} l S`)
  const title = payment ? (document.paymentStatus === 'received' ? (locale === 'ru' ? 'КВИТАНЦИЯ' : 'RECEIPT') : (locale === 'ru' ? 'СЧЁТ' : 'INVOICE')) : copy.title
  function startPage() {
    page = { commands: [], links: [] }; layouts.push(page)
    page.commands.push('q 89 0 0 87.71 68 690 cm /Lighthouse Do Q')
    text(LETTERHEAD.name, 190, 766, 20, 'F3', TYPE.heading)
    text(LETTERHEAD.role, 190, 747, TYPE.detailSize, 'F3', TYPE.muted)
    text(LETTERHEAD.background, 190, 732, TYPE.detailSize, 'F3', TYPE.muted)
    text(`${LETTERHEAD.address} · ${LETTERHEAD.city} · ${LETTERHEAD.phone}`, 190, 712, 7.6, 'F1', TYPE.muted)
    rule(668)
    text(title, A4.left, 638, TYPE.titleSize, 'F4')
    y = 601
  }
  function block(value, size = TYPE.bodySize, gap = 15, font = 'F1', color, x = A4.left, width = A4.contentWidth, link) {
    for (const line of wrapPdfText(value, width, size)) {
      if (y < 162) startPage()
      text(line, x, y, size, font, color)
      if (link) page.links.push({ url: link, x, y, width: Math.min(width, measurePdfText(line, size)) })
      y -= gap
    }
  }
  function signature(baseline, full) {
    const { width, height, offsetX, gap, lineWidth } = DOCUMENT_TEMPLATE.signature
    page.hasSignature = true
    page.commands.push(`q ${width} 0 0 ${height} ${A4.left + offsetX} ${baseline + gap} cm /Signature Do Q`)
    rule(baseline, A4.left + lineWidth)
    text(LETTERHEAD.signatureName, 68, baseline - 16, 9.2, 'F4')
    text(LETTERHEAD.role, 68, baseline - 30, 7.6, 'F1', TYPE.muted)
    text(LETTERHEAD.background, 68, baseline - 44, 7.6, 'F1', TYPE.muted)
    if (full) {
      text(`${LETTERHEAD.address} · ${LETTERHEAD.city}`, 68, baseline - 58, 7.6, 'F1', TYPE.muted)
      text(LETTERHEAD.phone, 68, baseline - 72, 7.6, 'F1', TYPE.muted)
    }
  }
  startPage()
  if (payment) {
    block(paymentNarrative(document, locale), TYPE.bodySize, 17.5)
    y -= 18
    const ru = locale === 'ru'
    block(`${ru ? 'Услуга' : 'Service'}: ${document.service}`, TYPE.detailSize, 17, 'F1', TYPE.muted)
    block(`${ru ? (document.paymentStatus === 'received' ? 'Получено' : 'К оплате') : (document.paymentStatus === 'received' ? 'Amount received' : 'Amount due')}: ${document.currency} ${formatPaymentAmount(document, locale)}`, TYPE.detailSize, 17, 'F1', TYPE.muted)
    if (document.paymentMethod) block(`${ru ? 'Способ оплаты' : 'Payment method'}: ${document.paymentMethod}`, TYPE.detailSize, 17, 'F1', TYPE.muted)
    if (document.documentNumber) block(`${ru ? 'Номер документа' : document.paymentStatus === 'received' ? 'Receipt No.' : 'Invoice No.'}: ${document.documentNumber}`, TYPE.detailSize, 17, 'F1', TYPE.muted)
    if (y < 444) startPage()
    text(`${LETTERHEAD.city}, ${document.dateIssued}.`, 68, 422, 10)
    signature(297.83, true)
  } else {
    const clientLines = wrapPdfText(`${copy.patient}: ${document.patientName}`, 265, 9.5)
    text(`${copy.date}: ${document.dateIssued}`, 337, y, 9.5)
    for (const line of clientLines) block(line, TYPE.detailSize, 16, 'F1', undefined, 68, 265)
    if (document.recommendationNumber) block(`${copy.number}: ${document.recommendationNumber}`, TYPE.detailSize, 16)
    y -= 15
    block(copy.intro, TYPE.detailSize, 15)
    y -= 10
    for (const [index, item] of document.items.entries()) {
      if (y < 215) startPage()
      const url = item.remedyPath ? new URL(item.remedyPath, origin).toString() : undefined
      const schedule = remedySchedule(item, locale, document.recommendationType)
      const heading = `${index + 1}. ${item.displayName}${item.potency ? ` - ${item.potency}` : ''}`
      const headingWidth = schedule ? 335 : 459.28
      if (schedule) {
        const scheduleSize = 8.5
        const scheduleWidth = measurePdfText(schedule, scheduleSize)
        text(schedule, A4.left + A4.contentWidth - scheduleWidth, y, scheduleSize, 'F1', TYPE.muted)
      }
      block(heading, 11.5, 17, 'F4', TYPE.heading, 68, headingWidth, url)
      for (const key of ['purpose', 'dosage', 'frequency', 'duration', 'sequence', 'instructions']) if (item[key]) block(`${copy[key]}: ${item[key]}`, TYPE.detailSize, 14.5)
      y -= 5; rule(y); y -= 14
    }
    if (guidance) {
      if (y < 280) startPage()
      block(guidance.takeTitle, 10.5, 16, 'F4', TYPE.heading)
      for (const line of guidance.bullets) block(`• ${line}`, 8.8, 12.5, 'F1')
      y -= 2
      block(guidance.course, 8.8, 12.5, 'F1')
      block(guidance.recheck, 8.8, 12.5, 'F1')
      y -= 2
      block(guidance.contact, 8.2, 11.5, 'F1', TYPE.muted)
      y -= 7
    }
    if (document.generalInstructions) {
      if (y < 210) startPage()
      block(copy.general, 11, 19, 'F4')
      block(document.generalInstructions, TYPE.detailSize, 15)
      y -= 10
    }
    if (document.followUp) block(`${copy.followUp}: ${document.followUp}`, TYPE.detailSize, 16)
    // Reserve the approved signature's full height plus the date and contacts.
    // Keep the closing block together; an unsigned continuation may use more space.
    if (y < 294) startPage()
    text(`${LETTERHEAD.city}, ${document.dateIssued}.`, 68, 272, 9.5)
    signature(142, true)
    for (const layout of layouts) {
      page = layout
      for (const [index, line] of wrapPdfText(copy.disclaimer, 459.28, 6.5).entries()) text(line, 68, 54 - index * 10, 6.5, 'F1', '0.52 0.52 0.52')
    }
  }
  const objects = []
  const catalog = pdfObject(objects, '')
  const pages = pdfObject(objects, '')
  const bundledFont = unicode.resources(objects)
  const serif = pdfObject(objects, '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>')
  const bold = pdfObject(objects, '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>')
  const imageData = readFileSync(resolve(process.cwd(), 'assets/documents/lighthouse.jpg'))
  const lighthouse = pdfObject(objects, Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 345 /Height 340 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageData.length} >>\nstream\n`), imageData, Buffer.from('\nendstream')]))
  const signatureAlpha = readFileSync(resolve(process.cwd(), 'assets/documents/signature-alpha.deflate'))
  const signatureRgb = readFileSync(resolve(process.cwd(), 'assets/documents/signature-rgb.deflate'))
  const { pixelsWide, pixelsHigh } = DOCUMENT_TEMPLATE.signature
  const signatureMask = pdfObject(objects, Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${pixelsWide} /Height ${pixelsHigh} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${signatureAlpha.length} >>\nstream\n`), signatureAlpha, Buffer.from('\nendstream')]))
  const signatureImage = pdfObject(objects, Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${pixelsWide} /Height ${pixelsHigh} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${signatureMask} 0 R /Filter /FlateDecode /Length ${signatureRgb.length} >>\nstream\n`), signatureRgb, Buffer.from('\nendstream')]))
  const fonts = ` /F3 ${serif} 0 R /F4 ${bold} 0 R /F1 ${bundledFont.ascii} 0 R /F2 ${bundledFont.native} 0 R`
  const pageIds = layouts.map((layout) => {
    const stream = layout.commands.join('\n')
    const content = pdfObject(objects, `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`)
    const annotations = layout.links.map(({ url, y: linkY, x, width }) => pdfObject(objects, `<< /Type /Annot /Subtype /Link /Rect [${x} ${linkY - 3} ${x + width} ${linkY + 12}] /Border [0 0 0] /A << /S /URI /URI (${literal(url)}) >> >>`))
    return pdfObject(objects, `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /XObject << /Lighthouse ${lighthouse} 0 R${layout.hasSignature ? ` /Signature ${signatureImage} 0 R` : ''} >> /Font <<${fonts} >> >> /Contents ${content} 0 R${annotations.length ? ` /Annots [${annotations.map((id) => `${id} 0 R`).join(' ')}]` : ''} >>`)
  })
  objects[catalog - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pages} 0 R >>`, 'ascii')
  objects[pages - 1] = Buffer.from(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`, 'ascii')

  const chunks = [Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n', 'latin1')]
  const offsets = [0]
  let length = chunks[0].length
  for (const [index, object] of objects.entries()) {
    offsets.push(length)
    const serialized = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`, 'ascii'), object, Buffer.from('\nendobj\n', 'ascii')])
    chunks.push(serialized); length += serialized.length
  }
  const xref = length
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`, 'ascii'))
  return Buffer.concat(chunks)
}

export function buildPrescriptionPdf(document, locale = 'en', origin) { return buildDocument(document, locale, origin) }
export function buildPaymentPdf(document, locale = 'en', origin) { return buildDocument(document, locale, origin, true) }
