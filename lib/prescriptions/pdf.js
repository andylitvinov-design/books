import { readFileSync } from 'node:fs'
import { getRemedy } from '../../data/remedies.js'
import { distanceHomeopathyAppendixBlocks, remedyDescriptionBlocks } from '../documents/report-appendices.js'
import { extractReportProgress } from '../documents/report-progress.js'
import { resolve } from 'node:path'
import { deflateSync } from 'node:zlib'

import { recommendationCopy, recommendationGuidance, recommendationItemType, remedySchedule, reportFollowUpDetails } from '../documents/recommendation.js'
import { clientReportHeading } from '../documents/report-heading.js'
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
  const followUpSession = payment ? undefined : reportFollowUpDetails(document.followUpDate, locale)
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
  let appendixKind = 'remedies'
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
  // Static vector artwork is redrawn for every client without adding a fixed
  // page, stock portrait, rendered text image, or third assessment metric.
  const drawReportSprig = (x, y, scale = 1) => {
    const stem = ['q', '0.40 0.62 0.59 RG 0.85 w', x, y, 'm',
      x+10*scale, y+29*scale, x+13*scale, y+44*scale, x+8*scale, y+58*scale, 'c S Q']
    page.commands.push(stem.join(' '))
    for (const [dx, dy, direction] of [[3,10,-1],[6,21,1],[9,33,-1],[11,44,1]]) {
      const px=x+dx*scale, py=y+dy*scale, tx=px+direction*12*scale, ty=py+8*scale
      page.commands.push(['q','0.75 0.85 0.78 rg',px,py,'m',
        px+direction*4*scale,py+10*scale,tx-direction*3*scale,ty+4*scale,tx,ty,'c',
        tx-direction*2*scale,ty-6*scale,px+direction*3*scale,py-3*scale,px,py,'c f Q'].join(' '))
    }
  }
  // A strict two-column illustration: no wave or icon crosses the title.
  const drawReportHeroArtwork = (bottom, height) => {
    const x = A4.left, w = A4.contentWidth
    fill(x,bottom,w,height,'0.989 0.977 0.966')
    fill(x+w-164,bottom,164,height,'1 1 1')
    fill(x+w-164,bottom,164,12,'0.854 0.923 0.927')
    const coastX=x+w-160
    page.commands.push(['q','0.79 0.88 0.88 rg',coastX,bottom+12,'m',
      coastX+29,bottom+33,'l',coastX+63,bottom+13,'l',coastX+105,bottom+41,'l',
      coastX+160,bottom+11,'l h f Q'].join(' '))
    for(const [offset,color] of [[16,'0.58 0.76 0.77'],[26,'0.69 0.84 0.84']]) {
      const waveY=bottom+offset
      page.commands.push(['q',color,'RG 0.9 w',coastX+6,waveY,'m',
        coastX+42,waveY+8,coastX+71,waveY-5,coastX+100,waveY+5,'c',
        coastX+117,waveY+10,coastX+136,waveY-3,coastX+155,waveY+4,'c S Q'].join(' '))
    }
    const artSize=Math.min(104,height-14)
    page.commands.push(['q',artSize,0,0,(artSize*0.986).toFixed(2),
      (x+w-artSize-7).toFixed(2),(bottom+(height-artSize)/2).toFixed(2),
      'cm /Lighthouse Do Q'].join(' '))
    fill(x,bottom,4,height,palette.accent)
    page.commands.push([palette.rule,'RG 0.6 w',x,bottom,'m',x+w,bottom,'l S'].join(' '))
  }
  const reportLineIcon = (type, cx, cy) => {
    const ink='0.24 0.49 0.50'
    if(type==='client'){
      page.commands.push(['q',ink,'RG 1.2 w',cx,cy+6,'m',
        cx+3,cy+9,cx+8,cy+9,cx+10,cy+5,'c',
        cx+13,cy-2,cx-1,cy-3,cx,cy+6,'c S',
        cx-3,cy-4,'m',cx+4,cy+1,cx+12,cy+1,cx+15,cy-4,'c S Q'].join(' '))
    } else if(type==='calendar'){
      page.commands.push(['q',ink,'RG 1.1 w',cx-5,cy-5,18,16,'re S',
        cx-5,cy+5,'m',cx+13,cy+5,'l S',
        cx-1,cy+8,'m',cx-1,cy+14,'l S',
        cx+9,cy+8,'m',cx+9,cy+14,'l S Q'].join(' '))
    } else if(type==='notes') drawReportSprig(cx,cy-6,0.27)
    else if(type==='analysis'){
      for(const [dx,h] of [[-5,5],[1,10],[7,15]]) fill(cx+dx,cy,3,h,'0.35 0.59 0.59')
    }
  }
  const title = payment ? (document.paymentStatus === 'received' ? (locale === 'ru' ? 'КВИТАНЦИЯ' : 'RECEIPT') : (locale === 'ru' ? 'СЧЁТ' : 'INVOICE')) : clientReportHeading(locale, document.recommendationType)
  function startPage() {
    page = { commands: [], links: [] }; layouts.push(page)
    floatingRemedyPhoto = null
    fill(0, A4.height - 6, A4.width, 6, palette.accent)
    if (appendixMode && !payment) {
      text('HOLISTIC HOUSE', A4.left, 797, 9.1, 'F4', palette.heading)
      text(locale === 'ru' ? 'ПРИЛОЖЕНИЕ' : 'APPENDIX', A4.left, 769, 20, 'F3', palette.heading)
      const appendixLabel = appendixKind === 'remedies'
        ? (locale === 'ru' ? 'ПОЛНЫЙ ТЕКСТ ИЗ БИБЛИОТЕКИ' : 'COMPLETE LIBRARY TEXT')
        : (locale === 'ru' ? 'ДИСТАНЦИОННАЯ ГОМЕОПАТИЯ' : 'DISTANCE HOMEOPATHY')
      text(appendixLabel, A4.left + 255, 774, 8, 'F1', palette.muted)
      drawReportSprig(A4.left + A4.contentWidth - 22, 758, 0.37)
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
      text('PEOPLE  ·  INSIGHT  ·  HARMONY', 361, 797, 8.2, 'F1', palette.muted)
      rule(716)
      // Responsive hero height and separate safe typography/artwork columns.
      const titleSize = 23
      const titleLines = wrapPdfText(title, A4.contentWidth - 190, titleSize)
      const panelHeight = Math.max(116, 52 + titleLines.length * 25)
      const panelTop = 709, panelBottom = panelTop - panelHeight
      drawReportHeroArtwork(panelBottom, panelHeight)
      text(locale === 'ru' ? 'ПЕРСОНАЛЬНЫЙ ОТЧЁТ' : 'PERSONAL REPORT', A4.left + 14, panelTop - 17, 8.4, 'F1', palette.muted)
      titleLines.forEach((line, index) => text(line, A4.left + 14, panelTop - 44 - index * 24, titleSize, 'F3', palette.heading))
      text(locale === 'ru' ? 'МЯГКИЙ ПУТЬ К ВНУТРЕННЕМУ РАВНОВЕСИЮ' : 'A GENTLER PATH TO INNER BALANCE',
        A4.left + 14, panelTop - 43 - titleLines.length * 24, 7.5, 'F1', palette.muted)
      y = panelBottom - 12
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
    if(y < (payment?245:171)) startPage()
    const baseline=y-(payment?8:12)
    const notes=!payment && label===copy.additionalNotes
    const height=payment?27:30
    fill(A4.left,baseline-9,A4.contentWidth,height,
      notes?'0.985 0.965 0.940':'0.956 0.973 0.967')
    fill(A4.left,baseline-9,4,height,notes?'0.63 0.46 0.33':palette.accent)
    if(!payment) reportLineIcon(notes?'notes':'analysis',A4.left+23,baseline-5)
    text(label,A4.left+(payment?13:46),baseline,size,'F4',palette.heading)
    y=baseline-(payment?29:29)
  }
  function narrativeSection(label,value) {
    if(!String(value??'').trim()) return
    sectionHeader(label)
    // Respect the author's paragraph boundaries; do not print a repeated
    // decorative stripe beside every wrapped line.
    const paragraphs=String(value).replace(/\r\n?/g,'\n').split('\n')
    for(const paragraph of paragraphs) {
      const raw=paragraph.trim()
      if(!raw){y-=5;continue}
      const listItem=/^[-*•]\s+/u.test(raw)
      const minorHeading=!listItem&&raw.length<=38&&raw.endsWith(':')
      // A source hyphen becomes an equivalent visual bullet, not two bullets.
      const visible=listItem?raw.replace(/^[-*•]\s+/u,''):raw
      const lines=wrapPdfText(visible,A4.contentWidth-(listItem?58:43),detailSize)
      for(const [index,line] of lines.entries()) {
        if(y<129) {
          startPage()
          sectionHeader(label+' '+(locale==='ru'?'(продолжение)':'(continued)'))
        }
        if(listItem&&index===0) fill(A4.left+16,y+3,3.4,3.4,'0.38 0.57 0.54')
        if(line) text(line,A4.left+(listItem?30:17),y,detailSize,
          minorHeading?'F4':'F1',minorHeading?palette.heading:palette.ink)
        y-=14.8
      }
      y-=minorHeading?3.5:2.8
    }
    y-=5
  }
  function printRemedyPhoto(slug) {
    const image=remedyImages.get(slug)
    if(!image) return
    // Photograph is confined to the editorial introduction column.
    // When the signed continuation has spare room, fit the image above the
    // footer rather than reserving a new mostly empty page for the appendix.
    const availableHeight=Math.max(58,y-142)
    const scale=Math.min(148/image.width,152/image.height,availableHeight/image.height,1)
    const width=Math.max(1,Math.round(image.width*scale))
    const height=Math.max(1,Math.round(image.height*scale))
    const photoX=A4.left+A4.contentWidth-width-10
    const photoTop=y+3,photoBottom=photoTop-height-12
    fill(photoX-8,photoTop-height-8,width+16,height+16,'0.987 0.974 0.957')
    fill(photoX-3,photoTop-height-3,width+6,height+6,'1 1 1')
    page.commands.push(['q',width,0,0,height,photoX,photoTop-height,
      'cm /'+image.resource+' Do Q'].join(' '))
    floatingRemedyPhoto={page,x:photoX,bottom:photoBottom}
  }
  function printRemedyDescriptionBlock(entry) {
    if(entry.kind==='space'){y-=3;return}
    const subheading=entry.kind==='subheading'
    const introFloat=floatingRemedyPhoto&&floatingRemedyPhoto.page===page&&y>=floatingRemedyPhoto.bottom
    if(subheading&&!introFloat){
      if(y<173) startPage()
      // Editorial section band follows one baseline and one left alignment.
      const headingLines=wrapPdfText(entry.text,A4.contentWidth-58,11.8)
      const headingH=Math.max(25,11+headingLines.length*15)
      if(y-headingH<125) startPage()
      fill(A4.left,y-headingH+4,A4.contentWidth,headingH,'0.961 0.975 0.968')
      fill(A4.left,y-headingH+4,3,headingH,palette.accent)
      drawReportSprig(A4.left+14,y-headingH+12,0.19)
      for(const [index,line] of headingLines.entries()){
        text(line,A4.left+37,y-13-index*15,11.8,'F4',palette.heading)
      }
      y-=headingH+7
      return
    }
    const size=subheading?12.2:11.35
    const leading=subheading?16.6:15.2
    const font=subheading?'F4':'F1'
    const color=subheading?palette.heading:palette.ink
    const x=A4.left+11
    const words=String(entry.text).trim().split(/\s+/).filter(Boolean)
    let index=0
    while(index<words.length){
      if(y<125) startPage()
      const besidePhoto=floatingRemedyPhoto&&floatingRemedyPhoto.page===page&&y>=floatingRemedyPhoto.bottom
      const lineWidth=besidePhoto?Math.max(120,floatingRemedyPhoto.x-x-17):A4.contentWidth-22
      let line=''
      while(index<words.length){
        const candidate=line?line+' '+words[index]:words[index]
        if(measurePdfText(candidate,size)<=lineWidth){line=candidate;index++;continue}
        if(line) break
        const word=words[index]
        let prefix=''
        for(const ch of word){
          if(prefix&&measurePdfText(prefix+ch,size)>lineWidth)break
          prefix+=ch
        }
        line=prefix
        words[index]=word.slice(prefix.length)
        if(!words[index])index++
        break
      }
      if(!line)break
      text(line,x,y,size,font,color)
      y-=leading
    }
    y-=subheading?3:4.5
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
    // A full-width, WHITE handwritten closing is part of the report body,
    // never a tinted footer card. Keep the approved alpha-masked ink and
    // practitioner identity unmodified (invoice signatures use another path).
    const height = 105
    // Keep the artwork, credentials and date comfortably above the page's
    // reserved disclaimer at y=62. A too-short page may continue naturally.
    if (y < 203) startPage()
    const top = y - 9
    const left = A4.left + 10
    const signatureWidth = 207
    const signatureHeight = 81.5
    // Only a subtle separating rule; the underlying white A4 stays visible.
    page.commands.push(`${palette.rule} RG 0.55 w ${left} ${top} m ${A4.left + A4.contentWidth - 10} ${top} l S`)
    page.hasSignature = true
    page.commands.push(`q ${signatureWidth} 0 0 ${signatureHeight} ${left + 5} ${top - 91} cm /Signature Do Q`)
    const infoX = A4.left + 250
    text(LETTERHEAD.signatureName, infoX, top - 30, 11.7, 'F4', palette.heading)
    const credentials = wrapPdfText(LETTERHEAD.role, A4.contentWidth - 263, 8.5)
    for (const [index, line] of credentials.slice(0, 3).entries()) {
      text(line, infoX, top - 46 - index * 11.3, 8.5, 'F1', palette.muted)
    }
    text(date, infoX, top - 86, 9.1, 'F1', palette.muted)
    y = top - height
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
    const clientLines = wrapPdfText(document.patientName, 235, 12.2)
    const referenceLines = document.recommendationNumber ? wrapPdfText(document.recommendationNumber, 128, 8.7) : []
    const metadataHeight = Math.max(65, 38 + clientLines.length * 16, referenceLines.length ? 74 + referenceLines.length * 13 : 0)
    if (y < metadataHeight + 170) startPage()
    const metadataTop = y
    fill(A4.left, metadataTop - metadataHeight, A4.contentWidth, metadataHeight, '0.981 0.963 0.948')
    fill(A4.left, metadataTop - metadataHeight, 4, metadataHeight, palette.accent)
    page.commands.push(['0.85 0.81 0.79 RG 0.6 w',A4.left+286,metadataTop-10,'m',
      A4.left+286,metadataTop-metadataHeight+10,'l S'].join(' '))
    reportLineIcon('client',A4.left+24,metadataTop-36)
    reportLineIcon('calendar',A4.left+315,metadataTop-37)
    text(copy.patient.toUpperCase(),A4.left+45,metadataTop-19,8.1,'F1',palette.muted)
    text(copy.date.toUpperCase(),A4.left+344,metadataTop-19,8.1,'F1',palette.muted)
    for(const [index,line] of clientLines.entries()) text(line,A4.left+45,metadataTop-40-index*16,12.2,'F1',palette.ink)
    text(document.dateIssued,A4.left+344,metadataTop-39,11.5,'F1',palette.ink)
    if (referenceLines.length) {
      text(copy.number, A4.left + 313, metadataTop - 53, 7.7, 'F1', palette.muted)
      for (const [index, line] of referenceLines.entries()) text(line, A4.left + 313, metadataTop - 69 - index * 14, 8.7, 'F1', palette.ink)
    }
    y -= metadataHeight + 12
    // The title and signed analysis already explain the document's purpose.
    // Avoid repeating a generic introduction in content-rich reports.
    if(!String(document.analysis??'').trim()) {
      block(copy.intro, detailSize, 14.3)
      y -= 4
    }
    if (progress) {
      // Two measurements only: factual starting state and recorded end state.
      // A planned target remains verbatim in the authored analysis, not here.
      // Two observed self-ratings only. Never visualize the predicted target.
      const scores = [
        { label:locale==='ru' ? 'НАЧАЛО' : 'START', value:progress.before, color:palette.accent },
        { label:locale==='ru' ? 'КОНЕЦ' : 'END', value:progress.after, color:'0.14 0.43 0.42' },
      ]
      if(y < 215) startPage()
      const upper=y+5, metricHeight=108
      fill(A4.left,upper-metricHeight,A4.contentWidth,metricHeight,'0.965 0.980 0.969')
      fill(A4.left,upper-metricHeight,4,metricHeight,palette.accent)
      text(locale==='ru'?'ДИНАМИКА САМООЦЕНКИ':'SELF-RATED PROGRESS',
        A4.left+14,upper-18,10.7,'F4',palette.heading)
      page.commands.push(['0.82 0.87 0.85 RG 0.6 w',A4.left+14,upper-25,'m',
        A4.left+A4.contentWidth-14,upper-25,'l S'].join(' '))
      const gap=26, cardWidth=(A4.contentWidth-28-gap)/2
      scores.forEach(({label,value,color},index)=>{
        const x=A4.left+14+index*(cardWidth+gap)
        fill(x,upper-101,cardWidth,68,index?'0.928 0.967 0.952':'0.993 0.985 0.976')
        const cx=x+43,cy=upper-67
        ring(cx,cy,27,value/10,color)
        const valueText=String(value)+'/10'
        text(valueText,cx-measurePdfText(valueText,13)/2,cy-4,13,'F4',color)
        text(label,x+84,upper-70,11,'F4',palette.heading)
      })
      const centerX=A4.left+A4.contentWidth/2,centerY=upper-67
      page.commands.push(['q',palette.accent,'RG 1.25 w',centerX-8,centerY,'m',
        centerX+6,centerY,'l',centerX+1,centerY+4,'m',centerX+6,centerY,'l',
        centerX+1,centerY-4,'l S Q'].join(' '))
      y=upper-metricHeight-8
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
        // Single editorial card: title, metadata, photograph, link and short
        // custom fields share the same outer grid and are never separated.
        const thumbnail=item.remedySlug?remedyImages.get(item.remedySlug):null
        const titleX=A4.left+(thumbnail?115:18)
        const titleWidth=A4.contentWidth-(thumbnail?135:36)
        const nameLines=wrapPdfText(String(itemNumber)+'. '+item.displayName,titleWidth,15.1)
        const scheduleLines=schedule?wrapPdfText(schedule,titleWidth,10.7):[]
        // Draw the arrow as a vector: the embedded PDF font lacks U+2192,
        // which Safari previously displayed as an ugly question mark.
        const linkLabel=locale==='ru'?'Подробнее о препарате':'Read remedy description'
        const fieldLayouts=['purpose','dosage','frequency','duration','sequence','instructions']
          .filter(key=>item[key]).map(key=>wrapPdfText(copy[key]+': '+item[key],
            A4.contentWidth-40,10.7))
        const fieldHeight=fieldLayouts.reduce((sum,lines)=>sum+lines.length*14.4+4,0)
        const embedFields=fieldHeight<=105
        const mainHeight=Math.max(thumbnail?107:80,
          52+nameLines.length*18+scheduleLines.length*14.4+(url?24:0))
        const cardHeight=mainHeight+(embedFields&&fieldHeight?fieldHeight+13:0)
        if(y<cardHeight+117) startPage()
        const cardTop=y+11,cardBottom=cardTop-cardHeight
        fill(A4.left,cardBottom,A4.contentWidth,cardHeight,'0.987 0.972 0.956')
        fill(A4.left,cardBottom,4,cardHeight,palette.accent)
        page.commands.push(['0.86 0.81 0.79 RG 0.6 w',A4.left,cardBottom,'m',
          A4.left+A4.contentWidth,cardBottom,'l S'].join(' '))
        if(thumbnail){
          const imageArea=82
          fill(A4.left+11,cardTop-94,90,90,'1 1 1')
          const scale=Math.min(imageArea/thumbnail.width,imageArea/thumbnail.height,1)
          const imageWidth=Math.round(thumbnail.width*scale)
          const imageHeight=Math.round(thumbnail.height*scale)
          const photoX=A4.left+15+(imageArea-imageWidth)/2
          const photoY=cardTop-90+(imageArea-imageHeight)/2
          page.commands.push(['q',imageWidth,0,0,imageHeight,photoX,photoY,
            'cm /'+thumbnail.resource+' Do Q'].join(' '))
        }
        text(thumbnail?(locale==='ru'?'РЕКОМЕНДУЕМЫЙ ПРЕПАРАТ':'SELECTED REMEDY')
          :(locale==='ru'?'РЕКОМЕНДАЦИЯ':'RECOMMENDATION'),
          titleX,cardTop-22,8.1,'F1',palette.muted)
        let titleY=cardTop-44
        for(const line of nameLines){
          text(line,titleX,titleY,15.1,'F4',palette.heading)
          if(url) page.links.push({url,x:titleX,y:titleY,
            width:Math.min(titleWidth,measurePdfText(line,15.1))})
          titleY-=18
        }
        let metaY=titleY-2
        for(const line of scheduleLines){
          text(line,titleX,metaY,10.7,'F1',palette.muted)
          metaY-=14.4
        }
        if(url){
          const linkY=metaY-10,linkSize=10.1
          const linkWidth = measurePdfText(linkLabel, linkSize)
          const actionWidth=Math.min(titleWidth-10,linkWidth+19)
          fill(titleX-4,linkY-7,actionWidth+10,19,'0.932 0.957 0.947')
          text(linkLabel,titleX,linkY,linkSize,'F1',palette.link)
          const arrowX=titleX+Math.min(linkWidth+8,actionWidth-8)
          page.commands.push(['q',palette.link,'RG 1.1 w',arrowX-4,linkY+1,'m',
            arrowX+3,linkY+1,'l',arrowX,linkY+4,'m',arrowX+3,linkY+1,'l',
            arrowX,linkY-2,'l S Q'].join(' '))
          page.links.push({url,x:titleX,y:linkY,width:actionWidth})
        }
        if(embedFields&&fieldLayouts.length){
          const dividerY=cardTop-mainHeight+4
          page.commands.push(['0.84 0.79 0.76 RG 0.6 w',A4.left+15,dividerY,
            'm',A4.left+A4.contentWidth-15,dividerY,'l S'].join(' '))
          let fieldY=dividerY-16
          for(const lines of fieldLayouts){
            for(const line of lines){
              text(line,A4.left+18,fieldY,10.7,'F1',palette.ink)
              fieldY-=14.4
            }
            fieldY-=4
          }
        }
        y=cardBottom-11
        if(!embedFields){
          for(const lines of fieldLayouts){
            for(const line of lines) block(line,10.7,14.4,'F1',palette.ink,A4.left+16,A4.contentWidth-32)
            y-=4
          }
          y-=5
        }
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
      if (guidance.recheck) block(guidance.recheck, 10.9, 14.6, 'F1')
      y -= 3
      if (guidance.contact) block(guidance.contact, 10.5, 14, 'F1', palette.muted)
      y -= 5
    }
    narrativeSection(copy.additionalNotes, document.additionalNotes)
    if (document.generalInstructions) {
      sectionHeader(copy.general)
      block(document.generalInstructions, detailSize, 15.5)
      y -= 8
    }
    if (followUpSession) {
      if (y < 195) startPage()
      sectionHeader(followUpSession.title)
      block(followUpSession.displayDate, 12.4, 16, 'F4', palette.heading)
      y -= 2
      block(followUpSession.description, detailSize, 15.5)
      y -= 8
    }
    if (document.followUp) block(`${copy.followUp}: ${document.followUp}`, detailSize, 15.5)
    // Content-aware signed closing. Short reports finish with their analysis,
    // not with a page occupied only by a signature.
    compactRecommendationSignature(document.dateIssued)
    if (profiles.length) {
      appendixMode = true
      appendixKind = 'remedies'
      // Keep a fresh appendix page for short reports. When a report has
      // already moved its signed closing to a continuation and that page
      // has plenty of space, start the appendix below the signature instead
      // of leaving half an A4 sheet blank. Always keep the opening artwork
      // and source introduction together (remaining space >= 330 pt).
      const appendixOnSignedContinuation = layouts.length > 1 && y >= 344
      if (appendixOnSignedContinuation) {
        const top = y - 10
        page.commands.push([palette.rule, 'RG 0.8 w', A4.left, top, 'm',
          A4.left + A4.contentWidth, top, 'l S'].join(' '))
        text('HOLISTIC HOUSE', A4.left, top - 14, 8, 'F4', palette.heading)
        text(locale === 'ru' ? 'ПРИЛОЖЕНИЕ' : 'APPENDIX',
          A4.left, top - 37, 17.5, 'F3', palette.heading)
        text(locale === 'ru' ? 'ПОЛНЫЙ ТЕКСТ ИЗ БИБЛИОТЕКИ' : 'COMPLETE LIBRARY TEXT',
          A4.left + 255, top - 33, 7.7, 'F1', palette.muted)
        y = top - 48
      } else startPage()
      for (const [profileIndex, { item, remedy }] of profiles.entries()) {
        // A signed continuation can have room for a compact opening image.
        // Keep title, image and text above the footer; other profiles start
        // on a full page with their normal 148pt photograph.
        const compactOpening=appendixOnSignedContinuation && profileIndex===0
        if (y < (compactOpening ? 252 : 330)) startPage()
        sectionHeader(remedy.canonical_latin_name, 13.2)
        printRemedyPhoto(item.remedySlug)
        const entries=remedyDescriptionBlocks(remedy.description)
        let introCount=0, cursor=0
        // Only the opening four source blocks are allowed beside the photograph.
        // Everything afterward uses the full A4 reading column, in original order.
        while(cursor<entries.length&&introCount<4){
          const entry=entries[cursor++]
          printRemedyDescriptionBlock(entry)
          if(entry.kind!=='space')introCount++
        }
        if(floatingRemedyPhoto&&floatingRemedyPhoto.page===page){
          y=Math.min(y,floatingRemedyPhoto.bottom-9)
        }
        floatingRemedyPhoto=null
        for(;cursor<entries.length;cursor++)printRemedyDescriptionBlock(entries[cursor])
        y-=9
      }
    }
    if (document.includeDistanceHomeopathy === true) {
      appendixMode = true
      appendixKind = 'guide'
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
