import { readFileSync } from 'node:fs'
import { getRemedy } from '../../data/remedies.js'
import { distanceHomeopathyAppendixBlocks, remedyDescriptionBlocks } from '../documents/report-appendices.js'
import { extractReportProgress } from '../documents/report-progress.js'
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
  const progress = payment ? null : extractReportProgress(document.analysis)
  // Keep approved invoice typography unchanged. Recommendations are made
  // comfortably readable on an A4 page and when zoomed in a phone PDF viewer.
  const bodySize = payment ? TYPE.bodySize : 12.2
  const detailSize = payment ? TYPE.detailSize : 11.7
  // Keep invoices on their approved palette; the personal recommendation uses
  // the same warm burgundy / ivory system as its client web and print view.
  const palette = payment
    ? { accent: '0.10 0.35 0.44', heading: TYPE.heading, ink: TYPE.ink, muted: TYPE.muted, rule: '0.60 0.70 0.74', paper: '0.926 0.970 0.969', note: '0.891 0.949 0.955', link: '0.08 0.34 0.52' }
    : { accent: '0.39 0.21 0.30', heading: '0.30 0.17 0.23', ink: '0.21 0.17 0.17', muted: '0.43 0.35 0.34', rule: '0.85 0.79 0.74', paper: '0.984 0.961 0.941', note: '0.979 0.948 0.942', link: '0.39 0.18 0.31' }
  const layouts = []
  let page, y
  let appendixMode = false
  let floatingRemedyPhoto = null
  const text = (value, x, baseline, size = TYPE.bodySize, font = 'F1', color = palette.ink) => {
    const native = (font === 'F3' || font === 'F4' ? /[^\x20-\xff]/ : /[^\x20-\x7e]/).test(String(value))
    page.commands.push(`${color} rg BT /${native ? 'F2' : font} ${size} Tf 1 0 0 1 ${x} ${baseline} Tm ${native ? `<${unicode.encode(value)}>` : `(${literal(value)})`} Tj ET`)
  }
  const rule = (baseline, end = 527.28) => page.commands.push(`${palette.rule} RG 0.7 w 68 ${baseline} m ${end} ${baseline} l S`)
  const fill = (x, baseline, width, height, color) => page.commands.push(`${color} rg ${x} ${baseline} ${width} ${height} re f`)
  // Draw page-local vector rings; progress values come exclusively from saved
  // numeric observations, never from inferred or invented health outcomes.
  const ring = (cx, cy, radius, fraction, color) => {
    const strokeArc = (start, end, ink, width) => {
      const segments = Math.max(2, Math.round((end - start) * 25))
      let path = ''
      for (let i = 0; i <= segments; i += 1) {
        const angle = -Math.PI / 2 + start * Math.PI * 2 + (end - start) * Math.PI * 2 * i / segments
        const x = (cx + radius * Math.cos(angle)).toFixed(2)
        const y = (cy + radius * Math.sin(angle)).toFixed(2)
        path += `${x} ${y} ${i ? 'l' : 'm'} `
      }
      page.commands.push(`${ink} RG ${width} w 1 J ${path}S`)
    }
    strokeArc(0, 1, '0.87 0.83 0.81', 3.5)
    if (fraction > 0) strokeArc(0, Math.min(1, fraction), color, 3.5)
  }
  const title = payment ? (document.paymentStatus === 'received' ? (locale === 'ru' ? 'КВИТАНЦИЯ' : 'RECEIPT') : (locale === 'ru' ? 'СЧЁТ' : 'INVOICE')) : copy.title
  function startPage() {
    page = { commands: [], links: [] }; layouts.push(page)
    floatingRemedyPhoto = null
    fill(0, A4.height - 6, A4.width, 6, palette.accent)
    if (appendixMode && !payment) {
      text('HOLISTIC HOUSE', A4.left, 797, 9.1, 'F4', palette.heading)
      text(locale === 'ru' ? 'ПРИЛОЖЕНИЕ' : 'APPENDIX', A4.left, 769, 20, 'F3', palette.heading)
      text(locale === 'ru' ? 'АВТОРСКИЙ МАТЕРИАЛ • БИБЛИОТЕКА' : 'AUTHOR MATERIAL • LIBRARY', A4.left + 255, 774, 8, 'F1', palette.muted)
      rule(752)
      y = 730
      return
    }
    // Full letterhead on page one; smaller running header on continuations.
    // This frees around 150 pt of reading space on each subsequent A4 page.
    if (!payment && layouts.length > 1) {
      text(LETTERHEAD.name, A4.left, 797, 14, 'F3', palette.heading)
      text(title, A4.left, 775, 11.2, 'F4', palette.heading)
      rule(758)
      y = 736
      return
    }
    if (payment) {
      // Invoices retain the separately approved letterhead and geometry.
      page.commands.push('q 89 0 0 87.71 68 690 cm /Lighthouse Do Q')
      text(LETTERHEAD.name, 190, 766, 20, 'F3', palette.heading)
      text(LETTERHEAD.role, 190, 747, TYPE.detailSize, 'F3', palette.ink)
      text(LETTERHEAD.background, 190, 732, TYPE.detailSize, 'F3', palette.muted)
      text(`${LETTERHEAD.address} · ${LETTERHEAD.city} · ${LETTERHEAD.phone}`, 190, 712, 8.2, 'F1', palette.muted)
      rule(668)
      // Preserve the original, approved invoice / receipt geometry.
      fill(A4.left, 613, A4.contentWidth, 44, palette.paper)
      fill(A4.left, 613, 5, 44, palette.accent)
      text(title, A4.left + 15, 633, TYPE.titleSize, 'F4', palette.heading)
      y = 595
    } else {
      // One condensed but legible running identity — not an entire letter page.
      page.commands.push('q 62 0 0 61.08 68 735 cm /Lighthouse Do Q')
      text(LETTERHEAD.name, 143, 779, 18, 'F3', palette.heading)
      text(LETTERHEAD.role, 143, 761, 9.4, 'F3', palette.ink)
      text(LETTERHEAD.background, 143, 747, 9.1, 'F3', palette.muted)
      text('HOLISTIC HOUSE', 143, 730, 8.4, 'F4', palette.heading)
      rule(716)
      const titleSize = 20.8
      const titleLines = wrapPdfText(title, A4.contentWidth - 35, titleSize)
      const panelHeight = 24 + titleLines.length * 24
      const panelBottom = 709 - panelHeight
      fill(A4.left, panelBottom, A4.contentWidth, panelHeight, palette.paper)
      fill(A4.left, panelBottom, 4, panelHeight, palette.accent)
      text(locale === 'ru' ? 'ПЕРСОНАЛЬНЫЙ ОТЧЁТ' : 'PERSONAL REPORT', A4.left + 14, 695, 8, 'F1', palette.muted)
      titleLines.forEach((line, index) => text(line, A4.left + 14, 671 - index * 24, titleSize, 'F3', palette.heading))
      y = panelBottom - 10
    }
  }
  function block(value, size = bodySize, gap = payment ? 15 : 14.4, font = 'F1', color, x = A4.left, width = A4.contentWidth, link) {
    for (const line of wrapPdfText(value, width, size)) {
      if (!line && !payment) { y -= 4; continue }
      if (y < (payment ? 162 : 104)) startPage()
      text(line, x, y, size, font, color)
      if (link) page.links.push({ url: link, x, y, width: Math.min(width, measurePdfText(line, size)) })
      y -= gap
    }
  }
  function sectionHeader(label, size = 11.6) {
    if (y < (payment ? 245 : 160)) startPage()
    const baseline = y - 8
    const notes = !payment && label === copy.additionalNotes
    const height = payment ? 27 : 24
    fill(A4.left, baseline - 8, A4.contentWidth, height, notes ? '0.985 0.964 0.926' : palette.note)
    fill(A4.left, baseline - 8, 4, height, notes ? '0.63 0.46 0.33' : palette.accent)
    text(label, A4.left + 13, baseline, size, 'F4', palette.heading)
    y = baseline - (payment ? 29 : 25)
  }
  function narrativeSection(label, value) {
    if (!String(value ?? '').trim()) return
    sectionHeader(label)
    const lines = wrapPdfText(value, A4.contentWidth - 28, detailSize)
    for (const line of lines) {
      if (y < 127) {
        startPage()
        sectionHeader(`${label} ${locale === 'ru' ? '(продолжение)' : '(continued)'}`)
      }
      if (line) {
        fill(A4.left + 4, y - 3, 2, 13, palette.rule)
        text(line, A4.left + 14, y, detailSize, 'F1')
      }
      y -= line ? 14.6 : 4
    }
    y -= 5
  }
  function printRemedyPhoto(slug) {
    const image = remedyImages.get(slug)
    if (!image) return
    // Float the approved photograph at the upper-right of its remedy text.
    const scale = Math.min(158 / image.width, 164 / image.height, 1)
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const photoX = A4.left + A4.contentWidth - width - 8
    const photoTop = y + 4
    const photoBottom = photoTop - height - 10
    fill(photoX - 7, photoTop - height - 8, width + 14, height + 16, palette.paper)
    page.commands.push('q ' + width + ' 0 0 ' + height + ' ' + photoX + ' ' + (photoTop - height) + ' cm /' + image.resource + ' Do Q')
    floatingRemedyPhoto = { page, x: photoX, bottom: photoBottom }
  }
  function printRemedyDescriptionBlock(entry) {
    if (entry.kind === 'space') { y -= 2; return }
    const subheading = entry.kind === 'subheading'
    const size = subheading ? 12.2 : 11.8
    const leading = subheading ? 15 : 14.15
    const font = subheading ? 'F4' : 'F1'
    const color = subheading ? palette.heading : palette.ink
    const x = A4.left + 10
    if (subheading && y < 161) startPage() // No isolated section heading at the foot of a page.
    const words = String(entry.text).trim().split(/\s+/).filter(Boolean)
    let index = 0
    while (index < words.length) {
      if (y < 118) startPage()
      // Each line is independently measured: full-width lines resume below
      // the photograph; page continuations never inherit a stale float.
      const besidePhoto = floatingRemedyPhoto && floatingRemedyPhoto.page === page && y >= floatingRemedyPhoto.bottom
      const lineWidth = besidePhoto ? Math.max(110, floatingRemedyPhoto.x - x - 13) : A4.contentWidth - 20
      let line = ''
      while (index < words.length) {
        const candidate = line ? line + ' ' + words[index] : words[index]
        if (measurePdfText(candidate, size) <= lineWidth) { line = candidate; index += 1; continue }
        if (line) break
        // Keep unusually long source words within the available text column.
        const word = words[index]
        let prefix = ''
        for (const character of word) {
          if (prefix && measurePdfText(prefix + character, size) > lineWidth) break
          prefix += character
        }
        line = prefix
        words[index] = word.slice(prefix.length)
        if (!words[index]) index += 1
        break
      }
      if (!line) break
      text(line, x, y, size, font, color)
      y -= leading
    }
    y -= subheading ? 2 : 2.5
  }
  function printAppendixBlock(entry) {
    if (entry.kind === 'heading') {
      if (y < 159) startPage()
      sectionHeader(entry.text)
    } else if (entry.kind === 'subheading') {
      if (y < 127) startPage()
      block(entry.text, 12, 16, 'F4', TYPE.heading, A4.left + 10, A4.contentWidth - 20)
      y -= 3
    } else if (entry.kind === 'space') {
      y -= 2
    } else {
      block(entry.text, 11.7, 14.3, 'F1', palette.ink, A4.left + 10, A4.contentWidth - 20)
      y -= 2
    }
  }
  function compactRecommendationSignature(date) {
    // A 74 pt signed closing instead of a dedicated near-empty second A4 page.
    // Keep the original approved alpha-masked signature image untouched.
    if (y < 138) startPage()
    const top = y - 5
    fill(A4.left, top - 63, A4.contentWidth, 63, palette.paper)
    fill(A4.left, top - 63, 3, 63, palette.accent)
    page.hasSignature = true
    page.commands.push(`q 120 0 0 47 ${A4.left + 15} ${top - 55} cm /Signature Do Q`)
    text(LETTERHEAD.signatureName, A4.left + 156, top - 20, 10.5, 'F4', palette.heading)
    text(LETTERHEAD.role, A4.left + 156, top - 35, 8, 'F1', palette.muted)
    text(date, A4.left + 156, top - 49, 8.2, 'F1', palette.muted)
    y = top - 66
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
    const clientLines = wrapPdfText(document.patientName, 270, 12.2)
    const referenceLines = document.recommendationNumber ? wrapPdfText(document.recommendationNumber, 128, 8.7) : []
    const metadataHeight = Math.max(56, 34 + clientLines.length * 16, referenceLines.length ? 67 + referenceLines.length * 13 : 0)
    if (y < metadataHeight + 170) startPage()
    const metadataTop = y
    fill(A4.left, metadataTop - metadataHeight, A4.contentWidth, metadataHeight, palette.paper)
    fill(A4.left, metadataTop - metadataHeight, 4, metadataHeight, palette.accent)
    text(copy.patient.toUpperCase(), A4.left + 14, metadataTop - 17, 8, 'F1', palette.muted)
    text(copy.date.toUpperCase(), A4.left + 313, metadataTop - 17, 8, 'F1', palette.muted)
    for (const [index, line] of clientLines.entries()) text(line, A4.left + 14, metadataTop - 37 - index * 16, 12.2, 'F1', palette.ink)
    text(document.dateIssued, A4.left + 313, metadataTop - 36, 11, 'F1', palette.ink)
    if (referenceLines.length) {
      text(copy.number, A4.left + 313, metadataTop - 53, 7.7, 'F1', palette.muted)
      for (const [index, line] of referenceLines.entries()) text(line, A4.left + 313, metadataTop - 69 - index * 14, 8.7, 'F1', palette.ink)
    }
    y -= metadataHeight + 12
    block(copy.intro, detailSize, 14.3)
    y -= 4
    if (progress) {
      const scores = [
        { label: locale === 'ru' ? 'ДО СЕССИИ' : 'BEFORE', value: progress.before, color: palette.muted },
        { label: locale === 'ru' ? 'ПОСЛЕ СЕССИИ' : 'AFTER', value: progress.after, color: '0.21 0.46 0.43' },
        ...(progress.target !== undefined ? [{ label: locale === 'ru' ? 'ЦЕЛЬ (ПЛАН)' : 'TARGET (PLAN)', value: progress.target, color: palette.accent }] : []),
      ]
      if (y < 176) startPage()
      const upper = y + 5
      fill(A4.left, upper - 74, A4.contentWidth, 74, palette.paper)
      text(locale === 'ru' ? 'ДИНАМИКА САМООЦЕНКИ' : 'SELF-RATED PROGRESS', A4.left + 13, upper - 13, 9.1, 'F4', palette.heading)
      const cardWidth = (A4.contentWidth - 24) / scores.length
      scores.forEach(({ label, value, color }, index) => {
        const x = A4.left + 13 + index * cardWidth
        ring(x + 19, upper - 46, 14.5, value / 10, color)
        text(label, x + 43, upper - 35, 8.1, 'F1', palette.muted)
        text(`${value}/10`, x + 43, upper - 54, 14.5, 'F4', color)
      })
      y = upper - 82
    }
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
        if (y < 145) startPage()
        block(group.title, 9.5, 16, 'F4', TYPE.muted)
        y -= 2
      }
      for (const item of group.items) {
        itemNumber += 1
        const url = item.remedyPath && origin ? new URL(item.remedyPath, origin).toString() : undefined
        const schedule = remedySchedule(item, locale, document.recommendationType)
        const thumbnail = document.items.length === 1 && item.remedySlug
          ? remedyImages.get(item.remedySlug) : null
        const titleX = A4.left + (thumbnail ? 80 : 14)
        const titleWidth = A4.contentWidth - (thumbnail ? 95 : 30)
        const nameLines = wrapPdfText(`${itemNumber}. ${item.displayName}`, titleWidth, 13.2)
        const headerHeight = thumbnail
          ? Math.max(65, 28 + nameLines.length * 17)
          : 10 + nameLines.length * 18
        if (y < headerHeight + 78) startPage()
        const headerTop = y + 11
        fill(A4.left, headerTop - headerHeight, A4.contentWidth, headerHeight, palette.paper)
        fill(A4.left, headerTop - headerHeight, 4, headerHeight, palette.accent)
        if (thumbnail) {
          const scale = Math.min(52 / thumbnail.width, 52 / thumbnail.height, 1)
          const imageWidth = Math.round(thumbnail.width * scale)
          const imageHeight = Math.round(thumbnail.height * scale)
          const photoX = A4.left + 12 + (52 - imageWidth) / 2
          const photoY = headerTop - 58 + (52 - imageHeight) / 2
          fill(A4.left + 10, headerTop - 60, 56, 56, '1 1 1')
          page.commands.push(`q ${imageWidth} 0 0 ${imageHeight} ${photoX} ${photoY} cm /${thumbnail.resource} Do Q`)
          text(locale === 'ru' ? 'РЕКОМЕНДУЕМЫЙ ПРЕПАРАТ' : 'SELECTED REMEDY',
            titleX, headerTop - 16, 7.7, 'F1', palette.muted)
        }
        let titleY = thumbnail ? headerTop - 38 : y
        for (const line of nameLines) {
          text(line, titleX, titleY, 13.2, 'F4', palette.heading)
          if (url) page.links.push({ url, x: titleX, y: titleY, width: Math.min(titleWidth, measurePdfText(line, 13.2)) })
          titleY -= 17.5
        }
        y = Math.min(titleY - 2, headerTop - headerHeight - 5)
        if (schedule) block(schedule, 11.2, 14.3, 'F1', palette.muted, A4.left + 14, A4.contentWidth - 28)
        if (url) {
          if (y < 114) startPage()
          const linkLabel = locale === 'ru'
            ? 'Подробнее о препарате — нажмите, чтобы открыть →'
            : 'Read remedy description — click to open →'
          const linkX = A4.left + 13
          const linkSize = 11
          const linkWidth = measurePdfText(linkLabel, linkSize)
          text(linkLabel, linkX, y, linkSize, 'F1', palette.link)
          page.links.push({ url, x: linkX, y, width: linkWidth })
          page.commands.push(`${palette.link} RG 0.7 w ${linkX} ${y - 2} m ${linkX + linkWidth} ${y - 2} l S`)
          y -= 15
        }
        for (const key of ['purpose', 'dosage', 'frequency', 'duration', 'sequence', 'instructions']) if (item[key]) block(`${copy[key]}: ${item[key]}`, detailSize, 14.3)
        y -= 3; rule(y); y -= 9
      }
    }
    if (guidance) {
      if (y < 180) startPage()
      block(guidance.takeTitle, 12, 15.5, 'F4', palette.heading)
      for (const section of guidance.sections) {
        if (section.title) block(section.title, 11.2, 15, 'F4', palette.heading)
        for (const line of section.bullets) block(`• ${line}`, 10.9, 14.6, 'F1')
        y -= 2
      }
      block(guidance.course, 10.9, 14.6, 'F1')
      block(guidance.recheck, 10.9, 14.6, 'F1')
      y -= 3
      block(guidance.contact, 10.5, 14, 'F1', palette.muted)
      y -= 5
    }
    narrativeSection(copy.additionalNotes, document.additionalNotes)
    if (document.generalInstructions) {
      sectionHeader(copy.general)
      block(document.generalInstructions, detailSize, 15.5)
      y -= 8
    }
    if (document.followUp) block(`${copy.followUp}: ${document.followUp}`, detailSize, 15.5)
    // Content-aware signed closing. Short reports finish with their analysis,
    // not with a page occupied only by a signature.
    compactRecommendationSignature(document.dateIssued)
    if (profiles.length) {
      appendixMode = true
      startPage()
      for (const { item, remedy } of profiles) {
        // Keep the remedy title and top-right photo together on an A4 page.
        if (y < 330) startPage()
        sectionHeader(remedy.canonical_latin_name, 13.2)
        printRemedyPhoto(item.remedySlug)
        for (const entry of remedyDescriptionBlocks(remedy.description)) printRemedyDescriptionBlock(entry)
        if (floatingRemedyPhoto && floatingRemedyPhoto.page === page) {
          y = Math.min(y, floatingRemedyPhoto.bottom - 6)
        }
        floatingRemedyPhoto = null
        y -= 11
      }
    }
    if (document.includeDistanceHomeopathy === true) {
      appendixMode = true
      startPage()
      for (const entry of distanceHomeopathyAppendixBlocks(locale)) printAppendixBlock(entry)
    }
    for (const layout of layouts) {
      page = layout
      for (const [index, line] of wrapPdfText(copy.disclaimer, A4.contentWidth, 7.2).entries()) text(line, A4.left, 62 - index * 9, 7.2, 'F1', palette.muted)
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
