import { readFileSync } from 'node:fs'
import { getRemedy } from '../../data/remedies.js'
import { distanceHomeopathyAppendixBlocks, remedyDescriptionBlocks } from '../documents/report-appendices.js'
import { resolve } from 'node:path'
import { deflateSync } from 'node:zlib'

import { recommendationCopy, recommendationGuidance, recommendationItemType, remedySchedule } from '../documents/recommendation.js'
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
        const originalCodePoint = character.codePointAt(0)
        // Keep the rest of the PDF intact when notes include emoji absent from the BMP font.
        const codePoint = notoSans.glyphForCodePoint(originalCodePoint) ? originalCodePoint : 0x003f
        const glyph = notoSans.glyphForCodePoint(codePoint)
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



function readApprovedRemedyJpeg(imagePath) {
  // Images may only come from the published remedy catalogue, never client input.
  if (!/^\/media\/remedies\/[a-z0-9-]+\/[a-z0-9._-]+\.jpe?g$/i.test(String(imagePath ?? ''))) return null
  let bytes
  try { bytes = readFileSync(resolve(process.cwd(), 'public', imagePath.slice(1))) } catch { return null }
  if (bytes.length < 16 || bytes.length > 10_000_000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let position = 2
  while (position + 10 < bytes.length) {
    if (bytes[position++] !== 0xff) continue
    while (position < bytes.length && bytes[position] === 0xff) position++
    const marker = bytes[position++]
    if (marker === 0xd9 || marker === 0xda) break
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (position + 2 >= bytes.length) break
    const length = bytes.readUInt16BE(position)
    if (length < 2 || position + length > bytes.length) break
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      const height = bytes.readUInt16BE(position + 3), width = bytes.readUInt16BE(position + 5)
      const components = bytes[position + 7]
      if (!height || !width || height > 12000 || width > 12000 || ![1,3].includes(components)) return null
      return { bytes, width, height, colorSpace: components === 3 ? 'DeviceRGB' : 'DeviceGray' }
    }
    position += length
  }
  return null
}

function buildDocument(document, locale, origin, payment = false) {
  const copy = recommendationCopy(locale, document.recommendationType)
  // Practitioner-entered guidance takes precedence over generic boilerplate.
  const guidance = payment || document.additionalNotes ? undefined : recommendationGuidance(document, locale)
  const seenRemedies = new Set()
  const profiles = payment ? [] : (document.items ?? []).flatMap((item) => {
    if (!item.remedySlug || seenRemedies.has(item.remedySlug)) return []
    const remedy = getRemedy(locale, item.remedySlug)
    if (!remedy) return []
    seenRemedies.add(item.remedySlug)
    return [{ item, remedy }]
  })
  const remedyImages = new Map()
  for (const { item, remedy } of profiles) {
    const image = readApprovedRemedyJpeg(remedy.primary_image)
    if (image) remedyImages.set(item.remedySlug, { ...image, resource: 'RemedyPhoto' + (remedyImages.size + 1) })
  }
  const unicode = createUnicodeUsage()
  // Keep invoices on their approved palette; the personal recommendation uses
  // the same warm burgundy / ivory system as its client web and print view.
  const palette = payment
    ? { accent: '0.10 0.35 0.44', heading: TYPE.heading, ink: TYPE.ink, muted: TYPE.muted, rule: '0.60 0.70 0.74', paper: '0.926 0.970 0.969', note: '0.891 0.949 0.955', link: '0.08 0.34 0.52' }
    : { accent: '0.39 0.21 0.30', heading: '0.30 0.17 0.23', ink: '0.21 0.17 0.17', muted: '0.43 0.35 0.34', rule: '0.85 0.79 0.74', paper: '0.984 0.961 0.941', note: '0.979 0.948 0.942', link: '0.39 0.18 0.31' }
  const layouts = []
  let page, y
  const text = (value, x, baseline, size = TYPE.bodySize, font = 'F1', color = palette.ink) => {
    const native = (font === 'F3' || font === 'F4' ? /[^\x20-\xff]/ : /[^\x20-\x7e]/).test(String(value))
    page.commands.push(`${color} rg BT /${native ? 'F2' : font} ${size} Tf 1 0 0 1 ${x} ${baseline} Tm ${native ? `<${unicode.encode(value)}>` : `(${literal(value)})`} Tj ET`)
  }
  const rule = (baseline, end = 527.28) => page.commands.push(`${palette.rule} RG 0.7 w 68 ${baseline} m ${end} ${baseline} l S`)
  const fill = (x, baseline, width, height, color) => page.commands.push(`${color} rg ${x} ${baseline} ${width} ${height} re f`)
  const title = payment ? (document.paymentStatus === 'received' ? (locale === 'ru' ? 'КВИТАНЦИЯ' : 'RECEIPT') : (locale === 'ru' ? 'СЧЁТ' : 'INVOICE')) : copy.title
  function startPage() {
    page = { commands: [], links: [] }; layouts.push(page)
    fill(0, A4.height - 6, A4.width, 6, palette.accent)
    page.commands.push('q 89 0 0 87.71 68 690 cm /Lighthouse Do Q')
    text(LETTERHEAD.name, 190, 766, 20, 'F3', palette.heading)
    text(LETTERHEAD.role, 190, 747, TYPE.detailSize, 'F3', palette.ink)
    text(LETTERHEAD.background, 190, 732, TYPE.detailSize, 'F3', palette.muted)
    text(`${LETTERHEAD.address} · ${LETTERHEAD.city} · ${LETTERHEAD.phone}`, 190, 712, 8.2, 'F1', palette.muted)
    rule(668)
    fill(A4.left, 610, A4.contentWidth, 51, palette.paper)
    fill(A4.left, 610, 5, 51, palette.accent)
    if (!payment) text(locale === 'ru' ? 'ПЕРСОНАЛЬНЫЙ ОТЧЁТ' : 'PERSONAL REPORT', A4.left + 15, 646, 8.1, 'F1', palette.muted)
    text(title, A4.left + 15, payment ? 633 : 621, TYPE.titleSize, 'F4', palette.heading)
    y = 589
  }
  function block(value, size = TYPE.bodySize, gap = 15, font = 'F1', color, x = A4.left, width = A4.contentWidth, link) {
    for (const line of wrapPdfText(value, width, size)) {
      if (y < 162) startPage()
      text(line, x, y, size, font, color)
      if (link) page.links.push({ url: link, x, y, width: Math.min(width, measurePdfText(line, size)) })
      y -= gap
    }
  }
  function sectionHeader(label) {
    if (y < 245) startPage()
    const baseline = y - 9
    const notes = !payment && label === copy.additionalNotes
    fill(A4.left, baseline - 9, A4.contentWidth, 27, notes ? '0.985 0.964 0.926' : palette.note)
    fill(A4.left, baseline - 9, 4, 27, notes ? '0.63 0.46 0.33' : palette.accent)
    text(label, A4.left + 15, baseline, 11.1, 'F4', palette.heading)
    y = baseline - 33
  }
  function narrativeSection(label, value) {
    if (!String(value ?? '').trim()) return
    sectionHeader(label)
    const lines = wrapPdfText(value, A4.contentWidth - 28, TYPE.detailSize)
    for (const line of lines) {
      if (y < 199) {
        startPage()
        sectionHeader(`${label} ${locale === 'ru' ? '(продолжение)' : '(continued)'}`)
      }
      if (line) {
        fill(A4.left + 4, y - 4, 2, 17, palette.rule)
        text(line, A4.left + 14, y, TYPE.detailSize, 'F1')
      }
      y -= line ? 17 : 11
    }
    y -= 15
  }
  function printRemedyPhoto(slug) {
    const image = remedyImages.get(slug)
    if (!image) return
    const scale = Math.min(222 / image.width, 170 / image.height, 1)
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    if (y < height + 170) startPage()
    fill(A4.left + 8, y - height - 9, width + 18, height + 18, palette.paper)
    page.commands.push(`q ${width} 0 0 ${height} ${A4.left + 17} ${y - height} cm /${image.resource} Do Q`)
    y -= height + 18
  }
  function printAppendixBlock(entry) {
    if (entry.kind === 'heading') {
      if (y < 260) startPage()
      sectionHeader(entry.text)
    } else if (entry.kind === 'subheading') {
      if (y < 196) startPage()
      block(entry.text, 10.4, 17, 'F4', TYPE.heading, A4.left + 10, A4.contentWidth - 20)
      y -= 5
    } else if (entry.kind === 'space') {
      y -= 6
    } else {
      block(entry.text, 9.4, 15, 'F1', TYPE.ink, A4.left + 10, A4.contentWidth - 20)
      y -= 5
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
    const clientLines = wrapPdfText(document.patientName, 270, 11)
    const referenceLines = document.recommendationNumber ? wrapPdfText(document.recommendationNumber, 128, 8.7) : []
    const metadataHeight = Math.max(64, 39 + clientLines.length * 16, referenceLines.length ? 69 + referenceLines.length * 14 : 0)
    if (y < metadataHeight + 170) startPage()
    const metadataTop = y
    fill(A4.left, metadataTop - metadataHeight, A4.contentWidth, metadataHeight, palette.paper)
    fill(A4.left, metadataTop - metadataHeight, 4, metadataHeight, palette.accent)
    text(copy.patient.toUpperCase(), A4.left + 14, metadataTop - 17, 8, 'F1', palette.muted)
    text(copy.date.toUpperCase(), A4.left + 313, metadataTop - 17, 8, 'F1', palette.muted)
    for (const [index, line] of clientLines.entries()) text(line, A4.left + 14, metadataTop - 37 - index * 16, 11, 'F1', palette.ink)
    text(document.dateIssued, A4.left + 313, metadataTop - 36, 9.4, 'F1', palette.ink)
    if (referenceLines.length) {
      text(copy.number, A4.left + 313, metadataTop - 53, 7.7, 'F1', palette.muted)
      for (const [index, line] of referenceLines.entries()) text(line, A4.left + 313, metadataTop - 69 - index * 14, 8.7, 'F1', palette.ink)
    }
    y -= metadataHeight + 26
    block(copy.intro, TYPE.detailSize, 15)
    y -= 12
    narrativeSection(copy.analysis, document.analysis)
    const mixed = document.recommendationType === 'mixed'
    const itemGroups = mixed
      ? [
          { type: 'homeopathy', title: locale === 'ru' ? 'ГОМЕОПАТИЯ' : 'HOMEOPATHY', items: document.items.filter((item) => recommendationItemType(item, document.recommendationType) === 'homeopathy') },
          { type: 'bach', title: locale === 'ru' ? 'ЭССЕНЦИИ БАХА' : 'BACH ESSENCES', items: document.items.filter((item) => recommendationItemType(item, document.recommendationType) === 'bach') },
        ].filter((group) => group.items.length)
      : [{ type: document.recommendationType, items: document.items }]
    let itemNumber = 0
    for (const group of itemGroups) {
      if (group.title) {
        if (y < 215) startPage()
        block(group.title, 9.5, 16, 'F4', TYPE.muted)
        y -= 2
      }
      for (const item of group.items) {
        itemNumber += 1
        const url = item.remedyPath && origin ? new URL(item.remedyPath, origin).toString() : undefined
        const schedule = remedySchedule(item, locale, document.recommendationType)
        const nameLines = wrapPdfText(`${itemNumber}. ${item.displayName}`, A4.contentWidth - 30, 12.2)
        const headerHeight = 13 + nameLines.length * 19
        if (y < headerHeight + 170) startPage()
        const headerTop = y + 13
        fill(A4.left, headerTop - headerHeight, A4.contentWidth, headerHeight, palette.paper)
        fill(A4.left, headerTop - headerHeight, 4, headerHeight, palette.accent)
        for (const line of nameLines) {
          text(line, A4.left + 14, y, 12.2, 'F4', palette.heading)
          if (url) page.links.push({ url, x: A4.left + 14, y, width: Math.min(A4.contentWidth - 30, measurePdfText(line, 12.2)) })
          y -= 19
        }
        y -= 5
        if (schedule) block(schedule, 9.2, 15, 'F1', palette.muted, A4.left + 14, A4.contentWidth - 28)
        if (url) {
          if (y < 190) startPage()
          const linkLabel = locale === 'ru'
            ? 'Подробнее о препарате — нажмите, чтобы открыть →'
            : 'Read remedy description — click to open →'
          const linkX = A4.left + 13
          const linkSize = 9.6
          const linkWidth = measurePdfText(linkLabel, linkSize)
          text(linkLabel, linkX, y, linkSize, 'F1', palette.link)
          page.links.push({ url, x: linkX, y, width: linkWidth })
          page.commands.push(`${palette.link} RG 0.7 w ${linkX} ${y - 2} m ${linkX + linkWidth} ${y - 2} l S`)
          y -= 19
        }
        for (const key of ['purpose', 'dosage', 'frequency', 'duration', 'sequence', 'instructions']) if (item[key]) block(`${copy[key]}: ${item[key]}`, TYPE.detailSize, 16)
        y -= 5; rule(y); y -= 16
      }
    }
    if (guidance) {
      if (y < 300) startPage()
      block(guidance.takeTitle, 10.5, 16, 'F4', TYPE.heading)
      for (const section of guidance.sections) {
        if (section.title) block(section.title, 9.2, 14, 'F4', TYPE.muted)
        for (const line of section.bullets) block(`• ${line}`, 8.8, 12.5, 'F1')
        y -= 1
      }
      block(guidance.course, 8.8, 12.5, 'F1')
      block(guidance.recheck, 8.8, 12.5, 'F1')
      y -= 2
      block(guidance.contact, 8.2, 11.5, 'F1', TYPE.muted)
      y -= 7
    }
    narrativeSection(copy.additionalNotes, document.additionalNotes)
    if (document.generalInstructions) {
      sectionHeader(copy.general)
      block(document.generalInstructions, TYPE.detailSize, 15)
      y -= 12
    }
    if (document.followUp) block(`${copy.followUp}: ${document.followUp}`, TYPE.detailSize, 16)
    // Reserve the approved signature's full height plus the date and contacts.
    // Keep the closing block together; an unsigned continuation may use more space.
    if (y < 294) startPage()
    text(`${LETTERHEAD.city}, ${document.dateIssued}.`, 68, 272, 9.5)
    signature(142, true)
    if (profiles.length) {
      startPage()
      sectionHeader(locale === 'ru' ? 'ОПИСАНИЯ ВЫБРАННЫХ ПРЕПАРАТОВ' : 'SELECTED REMEDY PROFILES')
      block(locale === 'ru'
        ? 'Оригинальные тексты и фотографии из библиотеки Holistic House. Это авторские образовательные материалы, не медицинская инструкция.'
        : 'Original texts and photographs from the Holistic House library. Educational author material, not medical instructions.', 9.4, 15)
      y -= 12
      for (const { item, remedy } of profiles) {
        if (y < 270) startPage()
        sectionHeader(remedy.canonical_latin_name)
        printRemedyPhoto(item.remedySlug)
        for (const entry of remedyDescriptionBlocks(remedy.description)) printAppendixBlock(entry)
        y -= 16
      }
    }
    if (document.includeDistanceHomeopathy === true) {
      startPage()
      const sourceUrl = origin ? new URL('/' + (locale === 'ru' ? 'ru' : 'en') + '/library/distance-homeopathy', origin).toString() : undefined
      if (sourceUrl) {
        block(locale === 'ru'
          ? 'Полная версия статьи с фотографиями — открыть →'
          : 'View the original illustrated guide →',
          9.4, 18, 'F1', '0.08 0.34 0.52', A4.left, A4.contentWidth, sourceUrl)
        y -= 10
      }
      for (const entry of distanceHomeopathyAppendixBlocks(locale)) printAppendixBlock(entry)
    }
    for (const layout of layouts) {
      page = layout
      for (const [index, line] of wrapPdfText(copy.disclaimer, 459.28, 6.5).entries()) text(line, 68, 54 - index * 10, 6.5, 'F1', '0.38 0.44 0.46')
    }
  }
  for (const [index, layout] of layouts.entries()) {
    page = layout
    fill(A4.left, 22, A4.contentWidth, 0.6, palette.rule)
    text('HOLISTIC HOUSE', A4.left, 12, 7.1, 'F1', palette.muted)
    text(`${index + 1} / ${layouts.length}`, A4.left + A4.contentWidth - 38, 12, 7.1, 'F1', palette.muted)
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
  const additionalImages = [...remedyImages.values()].map((image) => ({
    resource: image.resource,
    id: pdfObject(objects, Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /${image.colorSpace} /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`, 'ascii'),
      image.bytes,
      Buffer.from('\nendstream', 'ascii'),
    ])),
  }))
  const additionalXObjects = additionalImages.map(({ resource, id }) => ` /${resource} ${id} 0 R`).join('')

  const fonts = ` /F3 ${serif} 0 R /F4 ${bold} 0 R /F1 ${bundledFont.ascii} 0 R /F2 ${bundledFont.native} 0 R`
  const pageIds = layouts.map((layout) => {
    const stream = layout.commands.join('\n')
    const content = pdfObject(objects, `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`)
    const annotations = layout.links.map(({ url, y: linkY, x, width }) => pdfObject(objects, `<< /Type /Annot /Subtype /Link /Rect [${x} ${linkY - 3} ${x + width} ${linkY + 12}] /Border [0 0 0] /A << /S /URI /URI (${literal(url)}) >> >>`))
    return pdfObject(objects, `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /XObject << /Lighthouse ${lighthouse} 0 R${layout.hasSignature ? ` /Signature ${signatureImage} 0 R` : ''}${additionalXObjects} >> /Font <<${fonts} >> >> /Contents ${content} 0 R${annotations.length ? ` /Annots [${annotations.map((id) => `${id} 0 R`).join(' ')}]` : ''} >>`)
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
