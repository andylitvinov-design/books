import { readFileSync } from 'node:fs'
import { getRemedy } from '../../data/remedies.js'
import { distanceHomeopathyAppendixBlocks, remedyDescriptionBlocks } from '../documents/report-appendices.js'
import { resolveReportProgress } from '../documents/report-progress.js'
import { resolve } from 'node:path'
import { deflateSync } from 'node:zlib'

import { recommendationCopy, recommendationGuidance, recommendationItemType, remedySchedule, reportFollowUpDetails } from '../documents/recommendation.js'
import { clientReportHeading } from '../documents/report-heading.js'
import { resolveRecommendedTests, recommendedTestAbsoluteUrl } from '../consultations/recommended-tests.js'
import { daoResourceStage } from '../consultations/dao-resource-stage.js'
import { daoStageAuthorContent } from '../consultations/dao-stage-author-content.js'
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



// JPEGs from the approved catalogue may carry phone EXIF orientation.
// Honour that orientation in the PDF transform without recompressing photos.
export function readPdfJpegOrientation(bytes) {
  if (!bytes || bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1
  let cursor = 2
  while (cursor + 4 <= bytes.length && bytes[cursor] === 0xff) {
    while (cursor < bytes.length && bytes[cursor] === 0xff) cursor++
    const marker = bytes[cursor++]
    if (marker === 0xda || marker === 0xd9) break
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (cursor + 2 > bytes.length) break
    const length = bytes.readUInt16BE(cursor)
    const end = cursor + length
    if (length < 2 || end > bytes.length) break
    if (marker === 0xe1 && end - cursor >= 16 &&
        bytes.toString('latin1', cursor + 2, cursor + 8) === 'Exif\0\0') {
      const tiff = cursor + 8
      const byteOrder = bytes.toString('ascii', tiff, tiff + 2)
      if ((byteOrder === 'II' || byteOrder === 'MM') && tiff + 8 <= end) {
        const little = byteOrder === 'II'
        const read16 = (at) => little ? bytes.readUInt16LE(at) : bytes.readUInt16BE(at)
        const read32 = (at) => little ? bytes.readUInt32LE(at) : bytes.readUInt32BE(at)
        if (read16(tiff + 2) === 42) {
          const directory = tiff + read32(tiff + 4)
          if (directory >= tiff && directory + 2 <= end) {
            const entries = Math.min(read16(directory), Math.floor((end - directory - 2) / 12))
            for (let index = 0; index < entries; index++) {
              const entry = directory + 2 + index * 12
              if (read16(entry) === 0x0112 && read16(entry + 2) === 3 &&
                  read32(entry + 4) === 1) {
                const value = read16(entry + 8)
                if (value >= 1 && value <= 8) return value
              }
            }
          }
        }
      }
    }
    cursor = end
  }
  return 1
}

// True 'contain' placement for the original JPEG: centred, no crop, no
// stretched aspect ratio, and proper mirroring/rotation for EXIF 1..8.
// The returned PDF matrix is in A4/phone points; JPEG pixels stay untouched.
export function fitPdfImageContain(image, box) {
  const orientation = Number(image?.orientation) || 1
  const swapped = orientation >= 5 && orientation <= 8
  const sourceW = swapped ? Number(image?.height) : Number(image?.width)
  const sourceH = swapped ? Number(image?.width) : Number(image?.height)
  if (![sourceW, sourceH, box?.x, box?.y, box?.width, box?.height].every(Number.isFinite) ||
      sourceW <= 0 || sourceH <= 0 || box.width <= 0 || box.height <= 0) return null
  const scale = Math.min(box.width / sourceW, box.height / sourceH)
  const width = Number((sourceW * scale).toFixed(2))
  const height = Number((sourceH * scale).toFixed(2))
  const x = Number((box.x + (box.width - width) / 2).toFixed(2))
  const y = Number((box.y + (box.height - height) / 2).toFixed(2))
  const matrix = ({
    2: [-width, 0, 0, height, x + width, y],
    3: [-width, 0, 0, -height, x + width, y + height],
    4: [width, 0, 0, -height, x, y + height],
    5: [0, height, width, 0, x, y],
    6: [0, -height, width, 0, x, y + height],
    7: [0, -height, -width, 0, x + width, y + height],
    8: [0, height, -width, 0, x + width, y],
  })[orientation] ?? [width, 0, 0, height, x, y]
  return { x, y, width, height, matrix: matrix.map(value => Number(value.toFixed(2))) }
}

function drawContainedPdfImage(image, box) {
  const placement = fitPdfImageContain(image, box)
  if (!placement) return ''
  return ['q', ...placement.matrix, 'cm', '/' + image.resource, 'Do Q'].join(' ')
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
      return { bytes, width, height, orientation: readPdfJpegOrientation(bytes), colorSpace: components === 3 ? 'DeviceRGB' : 'DeviceGray' }
    }
    position += length
  }
  return null
}

function buildDocument(document, locale, origin, payment = false) {
  const copy = recommendationCopy(locale, document.recommendationType)
  const followUpSession = payment ? undefined : reportFollowUpDetails(document.followUpDate, locale)
  // Practitioner-entered guidance takes precedence over generic boilerplate.
  const guidance = payment || document.additionalNotes || document.recommendationsText ? undefined : recommendationGuidance(document, locale)
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
  const progress = payment ? null : resolveReportProgress(document)
  const recommendedTests = payment ? [] : resolveRecommendedTests(
    document.recommendedTestKeys ?? document.recommendedTests?.map(test => test.key), locale)
  // Keep approved invoice typography unchanged. Recommendations are made
  // comfortably readable on an A4 page and when zoomed in a phone PDF viewer.
  const bodySize = payment ? TYPE.bodySize : 12.2
  const detailSize = payment ? TYPE.detailSize : 11.7
  // Keep invoices on their approved palette; the personal recommendation uses
  // the same warm burgundy / ivory system as its client web and print view.
  const palette = payment
    ? { accent: '0.10 0.35 0.44', heading: TYPE.heading, ink: TYPE.ink, muted: TYPE.muted, rule: '0.60 0.70 0.74', paper: '0.926 0.970 0.969', note: '0.891 0.949 0.955', link: '0.08 0.34 0.52' }
    : { accent: '0.12 0.39 0.44', heading: '0.09 0.29 0.39', ink: '0.19 0.25 0.28', muted: '0.39 0.44 0.46', rule: '0.82 0.87 0.87', paper: '0.978 0.986 0.981', note: '0.958 0.979 0.976', link: '0.09 0.37 0.43' }
  // A pre-rendered, approved public landscape is available in production.
  // Local editor/unit runs fall back to vector art when prebuild has not run.
  // Nothing is fetched from Drive, a third party, or any client's attachments.
  let coastalJpeg = null
  if (!payment) {
    try { coastalJpeg = readFileSync(resolve(process.cwd(), 'assets/documents/report-coast-cover.jpg')) }
    catch { /* vector-only fallback for local tests */ }
  }
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
  // A reusable rounded vector panel rather than a cropped rectangular image.
  // Operates only on report layouts; invoices retain their exact geometry.
  const roundedFill = (x, bottom, width, height, radius, color) => {
    const r = Math.min(radius, width / 2, height / 2)
    const k = +(r * 0.55228475).toFixed(3)
    const x2 = x + width, y2 = bottom + height
    page.commands.push([color,'rg',x+r,bottom,'m',
      x2-r,bottom,'l',x2-r+k,bottom,x2,bottom+r-k,x2,bottom+r,'c',
      x2,y2-r,'l',x2,y2-r+k,x2-r+k,y2,x2-r,y2,'c',
      x+r,y2,'l',x+r-k,y2,x,y2-r+k,x,y2-r,'c',
      x,bottom+r,'l',x,bottom+r-k,x+r-k,bottom,x+r,bottom,'c h f'].join(' '))
  }
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
  // Premium A4 editorial landscape: airy vector shoreline and small approved
  // lighthouse image. Everything stays in the right-side art column; no
  // rectangular crop, photo fill, or text baked into a background bitmap.
  const drawBird = (x, y, size = 1) => page.commands.push([
    'q 0.54 0.65 0.66 RG 0.75 w', x-8*size,y,'m',
    x-3*size,y+5*size,x-1*size,y+4*size,x,y+1*size,'c',
    x+3*size,y+4*size,x+5*size,y+5*size,x+9*size,y,'c S Q',
  ].join(' '))
  const drawMarginBotanical = (height = 440) => {
    // A restrained page-side botanical motif on all report pages, drawn
    // outside the reading column so it never obstructs original client copy.
    const x=A4.left+A4.contentWidth+19
    drawReportSprig(x,height,0.66)
    drawReportSprig(x+8,height-89,0.46)
    page.commands.push(['q','0.80 0.85 0.80 RG 0.45 w',
      x-11,height-95,'m',x-11,height+67,'l S Q'].join(' '))
  }
  const drawReportHeroArtwork = (bottom, height) => {
    if (coastalJpeg) {
      // The right-aligned image is softly blended to white at all visible edges
      // during the deterministic build. Its 1100px source exceeds 300dpi here.
      // The title is still live PDF text in a separate reading column.
      page.commands.push('q 238 0 0 160 289 580 cm /CoastalPhoto Do Q')
      page.commands.push([palette.rule,'RG 0.6 w',A4.left,bottom-2,'m',
        A4.left+A4.contentWidth,bottom-2,'l S'].join(' '))
      return
    }
    const x = A4.left, w = A4.contentWidth, coastX = x + w - 178
    // Soft, continuous coastal contours on untouched WHITE paper.
    // Unlike the earlier implementation, there are no hard rectangular
    // sea strips, diagonal triangles or color panels behind the JPEG.
    page.commands.push(['q','0.85 0.91 0.90 rg',
      coastX,bottom+17,'m',
      coastX+25,bottom+27,coastX+46,bottom+38,coastX+68,bottom+30,'c',
      coastX+91,bottom+21,coastX+109,bottom+43,coastX+129,bottom+37,'c',
      coastX+152,bottom+28,coastX+166,bottom+25,coastX+178,bottom+22,'c',
      coastX+178,bottom+9,'l',coastX,bottom+9,'l h f Q'].join(' '))
    page.commands.push(['q','0.76 0.86 0.85 rg',
      coastX,bottom+9,'m',
      coastX+33,bottom+18,coastX+62,bottom+18,coastX+89,bottom+12,'c',
      coastX+115,bottom+6,coastX+152,bottom+18,coastX+178,bottom+13,'c',
      coastX+178,bottom+5,'l',coastX,bottom+5,'l h f Q'].join(' '))
    for (const [dy, ink] of [[13,'0.51 0.72 0.72'],[22,'0.67 0.81 0.80'],[29,'0.78 0.88 0.87']]) {
      const waveY=bottom+dy
      page.commands.push(['q',ink,'RG 0.72 w',
        coastX+2,waveY,'m',
        coastX+31,waveY+5,coastX+52,waveY-4,coastX+81,waveY+1,'c',
        coastX+111,waveY+6,coastX+137,waveY-3,coastX+175,waveY+2,'c S Q'].join(' '))
    }
    // One crisp approved lighthouse belongs to the identity masthead above.
    // An extra white-backed JPEG here covered vector waves and produced
    // conspicuous rectangular photo edges on iOS PDF viewers. Use an
    // entirely vector sun instead, preserving the calm scenic right column.
    const sunX=coastX+125, sunY=bottom+height-47, sr=13, sk=7.18
    page.commands.push(['q','0.94 0.91 0.83 rg',
      sunX+sr,sunY,'m',
      sunX+sr,sunY+sk,sunX+sk,sunY+sr,sunX,sunY+sr,'c',
      sunX-sk,sunY+sr,sunX-sr,sunY+sk,sunX-sr,sunY,'c',
      sunX-sr,sunY-sk,sunX-sk,sunY-sr,sunX,sunY-sr,'c',
      sunX+sk,sunY-sr,sunX+sr,sunY-sk,sunX+sr,sunY,'c f Q'].join(' '))
    drawBird(coastX+12,bottom+height-33,0.65)
    drawBird(coastX+42,bottom+height-21,0.48)
    drawReportSprig(x+w-15,bottom+8,0.67)
    page.commands.push([palette.rule,'RG 0.6 w',x,bottom-2,'m',x+w,bottom-2,'l S'].join(' '))
  }
  const drawReportBottomMotif = () => {
    if (payment) return
    // Approved three-part editorial footer, not invented patient outcomes.
    // This is drawn only when a short first page has safe unused vertical room.
    roundedFill(A4.left,100,A4.contentWidth,43,6,'0.948 0.971 0.971')
    for(const x of [A4.left+151,A4.left+303]){
      page.commands.push(['q','0.80 0.87 0.87 RG 0.6 w',
        x,108,'m',x,135,'l S Q'].join(' '))
    }
    // Tiny art marks instead of an empty decorative margin.
    reportLineIcon('client',A4.left+18,120)
    drawReportSprig(A4.left+172,109,0.25)
    page.commands.push(['q','0.24 0.51 0.55 RG 1 w',
      A4.left+330,120,'m',A4.left+340,120,'l',
      A4.left+336,124,'m',A4.left+340,120,'l',
      A4.left+336,116,'l S Q'].join(' '))
    const values=locale==='ru'
      ? [['Индивидуальный','подбор'],['Целостный','подход'],['Поддержка','изменений']]
      : [['Personal','guidance'],['Holistic','approach'],['Support through','change']]
    for(const [i,lines] of values.entries()){
      const x=A4.left+36+i*152
      text(lines[0],x,125,8.7,'F4',palette.heading)
      text(lines[1],x,113,8.7,'F1',palette.ink)
    }
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
    // Record free vertical room before switching so decorative art cannot
    // collide with content on text-heavy first sheets.
    if(page) page.endY = y
    page = { commands: [], links: [] }; layouts.push(page)
    floatingRemedyPhoto = null
    fill(0, A4.height - 6, A4.width, 6, palette.accent)
    if (appendixMode && !payment) {
      text('HOLISTIC HOUSE', A4.left, 802, 9.1, 'F4', palette.heading)
      text('PEOPLE  ·  INSIGHT  ·  HARMONY', A4.left+280, 803, 8, 'F1', palette.muted)
      text(locale === 'ru' ? 'ПРИЛОЖЕНИЕ' : 'APPENDIX', A4.left, 766, 21, 'F3', palette.heading)
      const appendixLabel = appendixKind === 'remedies'
        ? (locale === 'ru' ? 'ПОЛНЫЙ ТЕКСТ ИЗ БИБЛИОТЕКИ' : 'COMPLETE LIBRARY TEXT')
        : (locale === 'ru' ? 'ДИСТАНЦИОННАЯ ГОМЕОПАТИЯ' : 'DISTANCE HOMEOPATHY')
      text(appendixLabel, A4.left + 255, 774, 8, 'F1', palette.muted)
      drawReportSprig(A4.left + A4.contentWidth - 12, 745, 0.42)
      // The full library appendix has generous reading margins. Repeated
      // leafy drawings beside every paragraph distract from the source text.
      rule(747)
      y = 723
      return
    }
    // Full letterhead on page one; smaller running header on continuations.
    // This frees around 150 pt of reading space on each subsequent A4 page.
    if (!payment && layouts.length > 1) {
      text('HOLISTIC HOUSE', A4.left, 801, 12, 'F3', palette.heading)
      text('PEOPLE  ·  INSIGHT  ·  HARMONY', A4.left+282, 802, 8, 'F1', palette.muted)
      text(LETTERHEAD.name, A4.left, 778, 10.5, 'F3', palette.heading)
      text(title, A4.left+183, 778, 11.5, 'F4', palette.heading)
      rule(761)
      y = 740
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
      // The original premium report letterhead: one coherent, print-safe
      // header with the real approved lighthouse on the LEFT, practitioner
      // name/credentials in the centre, brand + motto to the right.
      // Keep the lettering away from iOS Safari's page-count overlay.
      page.commands.push('q 82 0 0 80.81 68 724 cm /Lighthouse Do Q')
      // Match the approved brand-first letterhead: house identity leads,
      // with the verified practitioner name and credentials directly below.
      text('HOLISTIC HOUSE', 164, 788, 18.5, 'F3', palette.heading)
      text(LETTERHEAD.name, 164, 767, 11.8, 'F4', palette.heading)
      text(LETTERHEAD.role, 164, 750, 9.3, 'F1', palette.ink)
      text(LETTERHEAD.background, 164, 736, 8.8, 'F1', palette.muted)
      // Thin editorial divider, not an opaque image fill.
      page.commands.push([palette.rule,'RG 0.7 w',465,796,'m',465,743,'l S'].join(' '))
      for(const [index,word] of ['PEOPLE','INSIGHT','HARMONY'].entries()){
        text(word,479,787-index*16,7.8,'F1',palette.muted)
      }
      rule(715)
      // The watercolour-style lighthouse on the RIGHT never crosses the
      // headline; the title uses normal word boundaries in both languages.
      drawReportHeroArtwork(597, 112)
      text(locale === 'ru' ? 'ПЕРСОНАЛЬНЫЙ ОТЧЁТ' : 'PERSONAL REPORT',
        A4.left, 694, 9.1, 'F1', palette.muted)
      const titleSize = 26.2
      const titleLines = wrapPdfText(title, A4.contentWidth - 185, titleSize)
      for (const [index,line] of titleLines.entries()){
        text(line,A4.left,665-index*28.5,titleSize,'F3',palette.heading)
      }
      text(locale === 'ru' ? 'МЯГКИЙ ПУТЬ К ВНУТРЕННЕМУ РАВНОВЕСИЮ' : 'A GENTLER PATH TO INNER BALANCE',
        A4.left,607,8.6,'F1',palette.muted)
      // Keep the outer margin clean: the approved coast is the only hero art,
      // never scattered duplicate micro-mottos or botanical stickers.
      y=581
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
    if(y < (payment?245:162)) startPage()
    const baseline=y-(payment?8:10)
    const notes=!payment && label===copy.additionalNotes
    const analysis=!payment && label===copy.analysis
    const height=payment?27:26
    // Light editorial header, not a heavy full-width coloured banner.
    // All subsequent headers share the exact same baseline and spacing.
    fill(A4.left,baseline-9,A4.contentWidth,height,
      notes?'0.988 0.978 0.961':analysis?'0.977 0.985 0.982':'0.971 0.985 0.982')
    fill(A4.left,baseline-9,4,height,notes?'0.63 0.46 0.33':palette.accent)
    if(!payment) reportLineIcon(notes?'notes':'analysis',A4.left+23,baseline-5)
    text(label,A4.left+(payment?13:46),baseline,size,'F4',palette.heading)
    y=baseline-(payment?29:25)
  }
  function narrativeSection(label,value) {
    if(!String(value??'').trim()) return
    // A heading must travel with at least two real source lines. Do not put a
    // heading alone at the bottom or orphan one sentence on a continuation.
    const paragraphs=String(value).replace(/\r\n?/g,'\n').split('\n')
    const opening=paragraphs.find(paragraph=>paragraph.trim())
    const openingLines=opening ? wrapPdfText(opening,A4.contentWidth-43,detailSize).length : 0
    if(!payment && y < 39+Math.min(2,openingLines)*14.8+132) startPage()
    sectionHeader(label)
    // Respect the author's paragraph boundaries; do not print a repeated
    // decorative stripe beside every wrapped line.
    for(const paragraph of paragraphs) {
      const raw=paragraph.trim()
      if(!raw){y-=5;continue}
      const listItem=/^[-*•]\s+/u.test(raw)
      const minorHeading=!listItem&&raw.length<=38&&raw.endsWith(':')
      // A source hyphen becomes an equivalent visual bullet, not two bullets.
      const visible=listItem?raw.replace(/^[-*•]\s+/u,''):raw
      const lines=wrapPdfText(visible,A4.contentWidth-(listItem?58:43),detailSize)
      for(const [index,line] of lines.entries()) {
        if(y<118) {
          startPage()
          sectionHeader(label+' '+(locale==='ru'?'(продолжение)':'(continued)'))
        }
        if(listItem&&index===0) fill(A4.left+16,y+3,3.4,3.4,'0.38 0.57 0.54')
        if(line) text(line,A4.left+(listItem?30:17),y,detailSize,
          minorHeading?'F4':'F1',minorHeading?palette.heading:palette.ink)
        y-=14.8
      }
      y-=minorHeading?3:2
    }
    y-=3
  }
  function printRemedyPhoto(slug) {
    const image=remedyImages.get(slug)
    if(!image) return
    // Reserve one stable editorial photo frame instead of scaling a short
    // image to a tiny floating thumbnail and wrapping text around its width.
    // The original approved JPEG remains intact and uncropped.
    if(y < 340) startPage()
    const frameWidth=164, frameHeight=152
    const frameX=A4.left+A4.contentWidth-frameWidth-10
    const frameTop=y+3, frameBottom=frameTop-frameHeight
    roundedFill(frameX-5,frameBottom-5,frameWidth+10,frameHeight+10,7,'0.987 0.974 0.957')
    fill(frameX,frameBottom,frameWidth,frameHeight,'1 1 1')
    const command=drawContainedPdfImage(image,{
      x:frameX+7,y:frameBottom+7,width:frameWidth-14,height:frameHeight-14,
    })
    if(command) page.commands.push(command)
    floatingRemedyPhoto={page,x:frameX-5,bottom:frameBottom-16}
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
    // 190pt leaves >=90pt for the unscaled approved 81.5pt signature;
    // the legal footer's highest text is below 70pt. The old 203pt gate
    // created a needless almost-empty signed third page on normal reports.
    if (y < 190) startPage()
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
    // The approved mockup uses TWO editorial client/date cards, not the old
    // continuous tinted strip. Keep the original client and date values.
    roundedFill(A4.left,metadataTop-metadataHeight,280,metadataHeight,8,'0.974 0.982 0.976')
    roundedFill(A4.left+290,metadataTop-metadataHeight,A4.contentWidth-290,metadataHeight,8,'0.974 0.982 0.976')
    fill(A4.left,metadataTop-metadataHeight,3,metadataHeight,palette.accent)
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
    y -= metadataHeight + 5
    // The title and signed analysis already explain the document's purpose.
    // Avoid repeating a generic introduction in content-rich reports.
    if(!String(document.analysis??'').trim()) {
      block(copy.intro, detailSize, 14.3)
      y -= 4
    }
    if (progress) {
      // Exactly TWO recorded observations. Any practitioner target remains
      // written in the original analysis; it is never a third measured ring.
      if(y < 215) startPage()
      const upper=y+5, metricHeight=93
      fill(A4.left,upper-metricHeight,A4.contentWidth,metricHeight,'0.965 0.980 0.969')
      fill(A4.left,upper-metricHeight,4,metricHeight,palette.accent)
      text(locale==='ru'?'ДИНАМИКА САМООЦЕНКИ':'SELF-RATED PROGRESS',
        A4.left+14,upper-18,10.7,'F4',palette.heading)
      page.commands.push(['0.82 0.87 0.85 RG 0.6 w',
        A4.left+14,upper-25,'m',A4.left+A4.contentWidth-14,upper-25,'l S'].join(' '))
      const scores=[
        {label:locale==='ru'?'НАЧАЛО':'START',value:progress.before,color:palette.accent,cx:A4.left+66},
        {label:locale==='ru'?'КОНЕЦ':'END',value:progress.after,color:'0.14 0.43 0.42',cx:A4.left+213},
      ]
      for(const {label,value,color,cx} of scores){
        ring(cx,upper-60,27,value/10,color)
        const valueText=String(value)+'/10'
        text(valueText,cx-measurePdfText(valueText,13.6)/2,upper-64,13.6,'F4',color)
        text(label,cx-measurePdfText(label,9.8)/2,upper-94,9.8,'F4',palette.heading)
      }
      const arrowX=A4.left+139,arrowY=upper-60
      page.commands.push(['q',palette.accent,'RG 1.3 w',
        arrowX-7,arrowY,'m',arrowX+7,arrowY,'l',
        arrowX+2,arrowY+5,'m',arrowX+7,arrowY,'l',
        arrowX+2,arrowY-5,'l S Q'].join(' '))
      // Right-hand inspirational note: editorial microcopy, not a clinical
      // claim or invented measured effect. It accompanies the real 2 scores.
      const noteX=A4.left+308
      roundedFill(noteX,upper-94,A4.contentWidth-321,62,7,'0.982 0.988 0.983')
      drawReportSprig(noteX+11,upper-90,0.22)
      const noteLines=locale==='ru'
        ? ['Ваши оценки','до и после сессии.']
        : ['Your ratings','before and after.']
      for(const [i,line] of noteLines.entries()){
        text(line,noteX+27,upper-58-i*13,9.15,'F3',palette.heading)
      }
      y=upper-metricHeight-6
    }
    narrativeSection(copy.analysis, document.analysis)
    narrativeSection(copy.recommendations, document.recommendationsText)
    const mixed = document.recommendationType === 'mixed'
    if(document.items?.length){
      // A real editorial chapter title must introduce the source photo cards,
      // especially after a cover-to-page-two transition. Avoid rows touching
      // the tiny running masthead without any hierarchy.
      // Move a whole photo card onto an otherwise sparse cover when it fits.
      // Do not reserve space for a chapter title and then leave the cover blank.
      if(y < 223) startPage()
      const label=mixed
        ? (locale==='ru'?'ПОДОБРАННЫЕ СРЕДСТВА':'SELECTED REMEDIES & ESSENCES')
        : document.recommendationType==='bach'
          ? (locale==='ru'?'ЭССЕНЦИИ БАХА':'BACH ESSENCES')
          : (locale==='ru'?'ПОДОБРАННЫЕ ПРЕПАРАТЫ':'SELECTED REMEDIES')
      sectionHeader(label,12.2)
    }
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
        const potency = recommendationItemType(item, document.recommendationType) === 'homeopathy'
          ? String(item.potency ?? '').trim() : ''
        const administration = potency ? schedule.split(' · ').slice(1).join(' · ') : schedule
        // Single editorial card: title, metadata, photograph, link and short
        // custom fields share the same outer grid and are never separated.
        const thumbnail=item.remedySlug?remedyImages.get(item.remedySlug):null
        const titleX=A4.left+(thumbnail?115:18)
        const titleWidth=A4.contentWidth-(thumbnail?135:36)
        const nameLines=wrapPdfText(String(itemNumber)+'. '+item.displayName+(potency?' '+potency:''),titleWidth,15.1)
        const scheduleLines=administration?wrapPdfText(administration,titleWidth,10.7):[]
        // Draw the arrow as a vector: the embedded PDF font lacks U+2192,
        // which Safari previously displayed as an ugly question mark.
        const linkLabel=locale==='ru'?'Подробнее о препарате':'Read remedy description'
        const fieldLayouts=['purpose','dosage','frequency','duration','sequence','instructions']
          .filter(key=>item[key]).map(key=>wrapPdfText(copy[key]+': '+item[key],
            A4.contentWidth-40,10.7))
        const fieldHeight=fieldLayouts.reduce((sum,lines)=>sum+lines.length*14.4+4,0)
        const embedFields=fieldHeight<=105
        const mainHeight=Math.max(thumbnail?96:77,
          48+nameLines.length*18+scheduleLines.length*14.4+(url?18:0))
        const cardHeight=mainHeight+(embedFields&&fieldHeight?fieldHeight+13:0)
        // Cover has no repeated running header, and the legal footer begins
        // below 85pt. Recover the extra safe space instead of inserting a
        // nearly blank sheet. On other pages keep the usual 117pt guard.
        if(y<cardHeight+(layouts.length===1?97:117)) startPage()
        const cardTop=y+11,cardBottom=cardTop-cardHeight
        roundedFill(A4.left,cardBottom,A4.contentWidth,cardHeight,7,'0.982 0.988 0.984')
        fill(A4.left,cardBottom,2,cardHeight,palette.accent)
        page.commands.push(['0.83 0.88 0.87 RG 0.45 w',A4.left,cardBottom,'m',
          A4.left+A4.contentWidth,cardBottom,'l S'].join(' '))
        if(thumbnail){
          const imageArea=82
          roundedFill(A4.left+11,cardTop-94,90,90,6,'1 1 1')
          const command=drawContainedPdfImage(thumbnail,{
            x:A4.left+15,y:cardTop-90,width:imageArea,height:imageArea,
          })
          if(command)page.commands.push(command)
        }
        text(thumbnail?(locale==='ru'?'РЕКОМЕНДУЕМЫЙ ПРЕПАРАТ':'SELECTED REMEDY')
          :(locale==='ru'?'РЕКОМЕНДАЦИЯ':'RECOMMENDATION'),
          titleX,cardTop-19,7.9,'F1',palette.muted)
        let titleY=cardTop-39
        for(const line of nameLines){
          text(line,titleX,titleY,15.1,'F4',palette.heading)
          if(url) page.links.push({url,x:titleX,y:titleY,
            width:Math.min(titleWidth,measurePdfText(line,15.1))})
          titleY-=18
        }
        let metaY=titleY-1
        for(const line of scheduleLines){
          text(line,titleX,metaY,10.7,'F1',palette.muted)
          metaY-=14.4
        }
        if(url){
          const linkY=metaY-8,linkSize=10.1
          const linkWidth = measurePdfText(linkLabel, linkSize)
          const actionWidth=Math.min(titleWidth-10,linkWidth+19)
          text(linkLabel,titleX,linkY,linkSize,'F1',palette.link)
          page.commands.push([palette.link,'RG 0.35 w',titleX,linkY-2,'m',
            titleX+Math.min(linkWidth,actionWidth-10),linkY-2,'l S'].join(' '))
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
        y=cardBottom-8
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
    const daoStage = document.daoResourcePublished === false ? null : daoResourceStage(document.daoResourceScore,locale)
    if(daoStage){
      sectionHeader(locale==='ru'?'СТУПЕНЬ У-СИН':'WU XING STAGE')
      block(`${daoStage.score.toFixed(1)}/10 · ${daoStage.level}. ${daoStage.name} (${daoStage.range})`,11.4,17,'F4',palette.heading)
      block(daoStage.description,10.5,16)
      const author = daoStageAuthorContent(daoStage.level)
      if(author?.paragraphs?.length){
        for(const paragraph of author.paragraphs) block(paragraph,10.1,15)
      }
      block((locale==='ru'?'Задача: ':'Focus: ')+daoStage.focus,10.5,16)
      if(daoStage.nextName)block((locale==='ru'?'Следующая ступень: ':'Next stage: ')+daoStage.nextLevel+'. '+daoStage.nextName,10.2,16)
      y-=11
    }

    // Content-aware signed closing. Short reports finish with their analysis,
    // not with a page occupied only by a signature.
    compactRecommendationSignature(document.dateIssued)
    if (profiles.length) {
      appendixMode = true
      appendixKind = 'remedies'
      // STRICT page boundary: appendix must NEVER appear below the signed
      // report. In the normal two-page recommendation it starts on page 3.
      // A longer core report may need more pages, but its appendix still
      // starts on a new A4 sheet with the full branded appendix header.
      startPage()
      for (const { item, remedy } of profiles) {
        // Keep the selected remedy title and original approved photograph
        // together; never squeeze the appendix under a signed closing.
        if (y < 330) startPage()
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
    // These links are the final action in the entire report, even after
    // remedy profiles and the optional full distance-homeopathy appendix.
    if (recommendedTests.length) {
      if (profiles.length || document.includeDistanceHomeopathy === true) {
        appendixMode = false
        startPage()
      }
      sectionHeader(locale === 'ru' ? 'Рекомендуемые тесты' : 'Recommended tests')
      block(locale === 'ru' ? 'Нажмите на название теста в PDF, чтобы начать.' :
        'Select a test title to open the questionnaire.', 10.7, 15, 'F1', palette.muted)
      for (const [index, test] of recommendedTests.entries()) {
        const url = recommendedTestAbsoluteUrl(test, origin)
        block(`${index + 1}. ${test.title}`, 12.1, 16.5, 'F4', palette.link,
          A4.left, A4.contentWidth, url)
        block(url, 8.8, 14, 'F1', palette.muted, A4.left + 7, A4.contentWidth - 7, url)
        y -= 6
      }
    }
    for (const layout of layouts) {
      page = layout
      for (const [index, line] of wrapPdfText(copy.disclaimer, A4.contentWidth, 7.2).entries()) text(line, A4.left, 62 - index * 9, 7.2, 'F1', palette.muted)
    }
  }
  // The last page does not pass through startPage(); record its lower edge.
  if(page) page.endY = y
  for (const [index, layout] of layouts.entries()) {
    page = layout
    if (!payment && index === 0 && layout.endY > 151) drawReportBottomMotif()
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
  const coastalPhoto = coastalJpeg ? pdfObject(objects, Buffer.concat([
    Buffer.from(`<< /Type /XObject /Subtype /Image /Width 1100 /Height 740 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${coastalJpeg.length} >>\nstream\n`),
    coastalJpeg, Buffer.from('\nendstream'),
  ])) : null
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
    return pdfObject(objects, `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /XObject << /Lighthouse ${lighthouse} 0 R${coastalPhoto ? ` /CoastalPhoto ${coastalPhoto} 0 R` : ''}${layout.hasSignature ? ` /Signature ${signatureImage} 0 R` : ''}${additionalXObjects} >> /Font <<${fonts} >> >> /Contents ${content} 0 R${annotations.length ? ` /Annots [${annotations.map((id) => `${id} 0 R`).join(' ')}]` : ''} >>`)
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


/**
 * Readable phone PDF, intentionally NOT a shrunken A4 or a rasterized screenshot.
 * A 390pt-wide, single-column PDF with 16.5pt body copy displays at roughly
 * 1 CSS pixel per PDF point on a modern phone. Full author text is flowed onto
 * as many pages as necessary. Printed/downloaded A4 keeps buildPrescriptionPdf.
 */
export function buildPrescriptionMobilePdf(document, locale = 'en', origin) {
  const W=390, H=780, L=22, R=368, CONTENT=R-L, FLOOR=111
  const ru=locale==='ru'
  const palette={
    navy:'0.08 0.28 0.36', teal:'0.06 0.48 0.56',
    ink:'0.12 0.20 0.24', soft:'0.94 0.98 0.98',
    muted:'0.38 0.46 0.49', line:'0.81 0.89 0.89',
  }
  const copy=recommendationCopy(locale,document.recommendationType)
  const followUp=reportFollowUpDetails(document.followUpDate,locale)
  const guidance=document.additionalNotes ? undefined : recommendationGuidance(document,locale)
  const recommendedTests=resolveRecommendedTests(
    document.recommendedTestKeys ?? document.recommendedTests?.map(test=>test.key),locale)
  const unicode=createUnicodeUsage()
  const images=new Map()
  const profiles=[]
  for(const item of document.items??[]){
    if(!item.remedySlug || profiles.some(p=>p.item.remedySlug===item.remedySlug))continue
    const remedy=getRemedy(locale,item.remedySlug)
    if(!remedy)continue
    profiles.push({item,remedy})
    const image=readApprovedRemedyJpeg(remedy.primary_image)
    if(image)images.set(item.remedySlug,{...image,resource:'MobileRemedy'+images.size})
  }
  const layouts=[]
  let page,y,appendixMode=false
  const rect=(x,b,w,h,fill)=>page.commands.push(fill+' rg '+[x,b,w,h].join(' ')+' re f')
  const txt=(value,x,baseline,size=15.8,ink=palette.ink,font='F1')=>{
    const native=/[^\x20-\x7e]/.test(String(value))
    page.commands.push(ink+' rg BT /'+(native?'F2':font)+' '+size+
      ' Tf 1 0 0 1 '+x+' '+baseline+' Tm '+
      (native?'<'+unicode.encode(value)+'>':'('+literal(value)+')')+' Tj ET')
  }
  const hairline=(yy)=>page.commands.push(palette.line+' RG 0.8 w '+L+' '+yy+' m '+R+' '+yy+' l S')
  // Keep phone PDFs as real vector circles, rather than text-only ratings.
  function mobileProgressRing(cx,cy,fraction,ink) {
    const drawArc=(ratio,color,width)=>{
      const segments=Math.max(2,Math.round(ratio*60))
      let points=''
      for(let i=0;i<=segments;i++){
        const angle=-Math.PI/2+ratio*2*Math.PI*i/segments
        points+=(cx+29*Math.cos(angle)).toFixed(2)+' '+(cy+29*Math.sin(angle)).toFixed(2)+(i?' l ':' m ')
      }
      page.commands.push(color+' RG '+width+' w 1 J '+points+'S')
    }
    drawArc(1,palette.line,3.8)
    if(fraction>0)drawArc(Math.min(1,fraction),ink,4.2)
  }
  function newPage(){
    page={commands:[],links:[]}
    layouts.push(page)
    // Quiet premium masthead, never reduced to tiny print.
    rect(0,H-6,W,6,palette.teal)
    if(layouts.length===1){
      page.commands.push('q 54 0 0 53.22 25 691 cm /Lighthouse Do Q')
      txt('HOLISTIC HOUSE',89,739,17.5,palette.navy,'F4')
      txt('PEOPLE  ·  INSIGHT  ·  HARMONY',89,715,10,palette.muted)
      hairline(681)
      y=651
    }else{
      txt('HOLISTIC HOUSE',L,736,15,palette.navy,'F4')
      txt(appendixMode?(ru?'ПРИЛОЖЕНИЕ':'APPENDIX'):
        (ru?'ПЕРСОНАЛЬНЫЙ ОТЧЁТ':'PERSONAL REPORT'),L,712,11,palette.teal)
      hairline(692)
      y=663
    }
  }
  function room(points=30){
    if(y-points<FLOOR)newPage()
  }
  function prose(value,{size=15.8,leading=23,ink=palette.ink,x=L,width=CONTENT,after=6}={}){
    const paragraphs=String(value??'').replace(/\r\n?/g,'\n').split('\n')
    for(const paragraph of paragraphs){
      const raw=paragraph.trim()
      if(!raw){y-=5;continue}
      const lines=wrapPdfText(raw,width,size)
      // Keep short authored thoughts together, not a half sentence at the
      // bottom followed by the remaining one or two lines on the next page.
      // Long notes still flow freely across as many pages as necessary.
      const paragraphHeight=lines.length*leading+after
      if(lines.length<=7 && paragraphHeight<430 && y-paragraphHeight<FLOOR)newPage()
      for(let index=0;index<lines.length;index++){
        // Avoid leaving one line of an ordinary paragraph orphaned at a
        // page bottom when its next line will be on the next page.
        if(y-leading-(index<lines.length-1?leading:0)<FLOOR)newPage()
        if(lines[index])txt(lines[index],x,y,size,ink)
        y-=leading
      }
      y-=after
    }
  }
  function heading(value){
    const lines=wrapPdfText(value,CONTENT-18,19.5)
    // Require headline, rule and at least two reading lines on this page.
    room(14+lines.length*26+51)
    y-=5
    rect(L,y-10,3,23,palette.teal)
    for(const line of lines){
      txt(line,L+14,y,19.5,palette.navy,'F4')
      y-=26
    }
    y-=9
  }
  function minorHeading(value){
    const lines=wrapPdfText(value,CONTENT,17.5)
    room(lines.length*24+43)
    for(const line of lines){txt(line,L,y,17.5,palette.navy,'F4');y-=24}
    y-=5
  }
  function imageFor(slug){
    const im=images.get(slug)
    if(!im)return
    const frame=172
    room(frame+30)
    const x=L+(CONTENT-frame)/2
    rect(x-7,y-frame-7,frame+14,frame+14,'0.97 0.98 0.98')
    rect(x,y-frame,frame,frame,'1 1 1')
    const command=drawContainedPdfImage(im,{
      x:x+9,y:y-frame+9,width:frame-18,height:frame-18,
    })
    if(command)page.commands.push(command)
    y-=frame+23
  }
  function signedClosing(){
    room(160)
    hairline(y-4)
    page.hasSignature=true
    page.commands.push('q 185 0 0 72.9 '+(L+2)+' '+(y-87)+' cm /Signature Do Q')
    y-=100
    txt(LETTERHEAD.signatureName,L,y,16,palette.navy,'F4')
    y-=23
    txt(document.dateIssued,L,y,13,palette.muted)
    y-=27
  }

  newPage()
  txt(ru?'ПЕРСОНАЛЬНЫЙ ОТЧЁТ':'PERSONAL REPORT',L,y,11.5,palette.teal)
  y-=24
  const title=clientReportHeading(locale,document.recommendationType)
  for(const line of wrapPdfText(title,CONTENT,25)){
    room(34)
    txt(line,L,y,25,palette.navy,'F4')
    y-=34
  }
  prose(ru?'Мягкий путь к внутреннему равновесию':'A gentler path to inner balance',
    {size:15.2,leading:22,ink:palette.muted,after:7})
  heading(ru?'Клиент и дата':'Client and date')
  prose((document.patientName??'')+'\n'+(document.dateIssued??''),{size:16.5,leading:25,after:3})
  const progress=resolveReportProgress(document)
  if(progress){
    heading(ru?'Динамика самооценки':'Self-rated progress')
    room(135)
    rect(L,y-117,CONTENT,125,palette.soft)
    const scores=[
      { value:progress.before,label:ru?'Было':'Before',color:palette.navy,cx:L+85 },
      { value:progress.after,label:ru?'Стало':'After',color:palette.teal,cx:L+263 },
    ]
    for(const score of scores){
      mobileProgressRing(score.cx,y-48,score.value/10,score.color)
      const value=String(score.value)+'/10'
      txt(value,score.cx-measurePdfText(value,18)/2,y-53,18,score.color,'F4')
      txt(score.label,score.cx-measurePdfText(score.label,12)/2,y-100,12,palette.muted)
    }
    // Vector arrow between the two observed ratings.
    const ax=L+174,ay=y-48
    page.commands.push(['q',palette.teal,'RG 1.7 w',
      ax-9,ay,'m',ax+9,ay,'l',
      ax+3,ay+6,'m',ax+9,ay,'l',
      ax+3,ay-6,'l S Q'].join(' '))
    y-=137
  }
  if(document.analysis){
    // This short consultation summary is a single semantic section.
    // Start it on the next page instead of splitting the header and an
    // unfinished first sentence across the cover/page 2 boundary.
    const raw=String(document.analysis)
    const lines=raw.split(/\r?\n/).filter(v=>v.trim()).flatMap(v=>wrapPdfText(v.trim(),CONTENT,15.8))
    const total=57+lines.length*23+raw.split(/\r?\n/).length*6
    if(total<450 && y-total<FLOOR)newPage()
    heading(copy.analysis)
    prose(document.analysis)
  }
  let number=0
  for(const item of document.items??[]){
    number++
    const im=images.get(item.remedySlug)
    const schedule=remedySchedule(item,locale,document.recommendationType)
    const potency=recommendationItemType(item,document.recommendationType)==='homeopathy'
      ? String(item.potency ?? '').trim() : ''
    const administration=potency ? schedule.split(' · ').slice(1).join(' · ') : schedule
    // A fixed source-photo frame avoids ragged cards for portrait/landscape JPEGs.
    const nameX=im?L+142:L+15
    const nameWidth=R-nameX-12
    const nameLines=wrapPdfText(String(item.displayName||'')+(potency?' '+potency:''),nameWidth,18)
    const scheduleLines=administration?wrapPdfText(administration,nameWidth,14.2):[]
    const cardHeight=Math.max(im?143:82,25+nameLines.length*23+scheduleLines.length*20)
    // A new remedy never begins at the bottom with only its heading and
    // photograph. Heading, photo, name and schedule stay on the SAME page.
    room(cardHeight+105)
    heading((ru?'Рекомендация ':'Recommendation ')+number)
    const top=y+2
    rect(L,top-cardHeight,CONTENT,cardHeight,'0.96 0.98 0.98')
    rect(L,top-cardHeight,3,cardHeight,palette.teal)
    if(im){
      rect(L+9,top-135,128,128,'1 1 1')
      const command=drawContainedPdfImage(im,{
        x:L+15,y:top-129,width:116,height:116,
      })
      if(command)page.commands.push(command)
    }
    let headingY=top-28
    for(const line of nameLines){
      txt(line,nameX,headingY,18,palette.navy,'F4')
      headingY-=23
    }
    if(scheduleLines.length)headingY-=2
    for(const line of scheduleLines){
      txt(line,nameX,headingY,14.2,palette.teal)
      headingY-=20
    }
    y=top-cardHeight-18
    for(const key of ['purpose','dosage','frequency','duration','sequence','instructions']){
      if(item[key])prose(copy[key]+': '+item[key])
    }
    if(item.remedyPath && origin){
      const url=new URL(item.remedyPath,origin).toString()
      room(34)
      const label=ru?'Полная карточка препарата':'Full remedy profile'
      txt(label,L,y,14,palette.teal)
      page.links.push({url,x:L,y,width:CONTENT})
      y-=29
    }
  }
  if(guidance){
    heading(guidance.takeTitle)
    for(const section of guidance.sections){
      if(section.title)minorHeading(section.title)
      for(const bullet of section.bullets)prose('• '+bullet)
    }
    prose(guidance.course)
    if(guidance.recheck)prose(guidance.recheck)
    if(guidance.contact)prose(guidance.contact)
  }
  if(document.additionalNotes){heading(copy.additionalNotes);prose(document.additionalNotes)}
  if(document.generalInstructions){heading(copy.general);prose(document.generalInstructions)}
  if(followUp){
    heading(followUp.title)
    prose(followUp.displayDate,{size:18,leading:26,ink:palette.navy})
    prose(followUp.description)
  }
  if(document.followUp)prose(copy.followUp+': '+document.followUp)
  const daoStage = document.daoResourcePublished === false ? null : daoResourceStage(document.daoResourceScore,locale)
  if(daoStage){
    heading((ru?'Ступень У-син':'Wu Xing stage')+' · '+daoStage.level)
    prose(daoStage.score.toFixed(1)+'/10 · '+daoStage.name+' ('+daoStage.range+')',{size:17.5,leading:25})
    prose(daoStage.description)
    const author = daoStageAuthorContent(daoStage.level)
    if(author?.paragraphs?.length)for(const paragraph of author.paragraphs)prose(paragraph,{size:13.8,leading:19})
    prose((ru?'Задача: ':'Focus: ')+daoStage.focus)
    if(daoStage.nextName)prose((ru?'Следующая ступень: ':'Next stage: ')+daoStage.nextLevel+'. '+daoStage.nextName)
  }

  signedClosing()

  if(profiles.length){
    appendixMode=true
    newPage()
    heading(ru?'Приложение · полный текст':'Appendix · complete text')
    for(const {item,remedy} of profiles){
      minorHeading(remedy.canonical_latin_name)
      imageFor(item.remedySlug)
      for(const entry of remedyDescriptionBlocks(remedy.description)){
        if(entry.kind==='space'){y-=3;continue}
        if(entry.kind==='subheading'||entry.kind==='heading')minorHeading(entry.text)
        else prose(entry.text,{after:6})
      }
    }
  }
  if(document.includeDistanceHomeopathy===true){
    appendixMode=true
    newPage()
    heading(ru?'Дистанционная гомеопатия':'Distance homeopathy')
    for(const entry of distanceHomeopathyAppendixBlocks(locale)){
      if(entry.kind==='heading')heading(entry.text)
      else if(entry.kind==='subheading')minorHeading(entry.text)
      else prose(entry.text)
    }
  }

  // Last page action, after all source appendices; the signed report stays intact.
  if(recommendedTests.length && (profiles.length || document.includeDistanceHomeopathy===true)){
    appendixMode=false
    newPage()
  }
  if(recommendedTests.length){
    heading(ru?'Рекомендуемые тесты':'Recommended tests')
    prose(ru?'Нажмите «Открыть тест», чтобы начать.':'Tap Open test to begin.',
      {size:13.8,leading:20,ink:palette.muted})
    for(const [index,test] of recommendedTests.entries()){
      room(95)
      prose((index+1)+'. '+test.title,{size:15.5,leading:23,after:4})
      room(30)
      const url=recommendedTestAbsoluteUrl(test,origin)
      txt(ru?'Открыть тест ↗':'Open test ↗',L+10,y,13.7,palette.teal)
      page.links.push({url,x:L+8,y,width:CONTENT-16})
      y-=27
    }
  }

  // Legal footer is kept OUTSIDE the balanced 15.8pt reading flow on every page.
  for(const [index,layout]of layouts.entries()){
    page=layout
    for(const [i,line]of wrapPdfText(copy.disclaimer,CONTENT,9.1).slice(0,4).entries()){
      txt(line,L,82-i*12,9.1,palette.muted)
    }
    hairline(23)
    txt('HOLISTIC HOUSE',L,11,9.5,palette.teal)
    txt((index+1)+' / '+layouts.length,R-38,11,9.5,palette.muted)
  }

  const objects=[]
  const catalog=pdfObject(objects,'')
  const pages=pdfObject(objects,'')
  const fonts=unicode.resources(objects)
  const serif=pdfObject(objects,'<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>')
  const bold=pdfObject(objects,'<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>')
  const logoBytes=readFileSync(resolve(process.cwd(),'assets/documents/lighthouse.jpg'))
  const lighthouse=pdfObject(objects,Buffer.concat([
    Buffer.from('<< /Type /XObject /Subtype /Image /Width 345 /Height 340 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+logoBytes.length+' >>\nstream\n','ascii'),
    logoBytes,Buffer.from('\nendstream','ascii'),
  ]))
  const alpha=readFileSync(resolve(process.cwd(),'assets/documents/signature-alpha.deflate'))
  const rgb=readFileSync(resolve(process.cwd(),'assets/documents/signature-rgb.deflate'))
  const mask=pdfObject(objects,Buffer.concat([
    Buffer.from('<< /Type /XObject /Subtype /Image /Width '+DOCUMENT_TEMPLATE.signature.pixelsWide+
      ' /Height '+DOCUMENT_TEMPLATE.signature.pixelsHigh+
      ' /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length '+alpha.length+' >>\nstream\n'),
    alpha,Buffer.from('\nendstream'),
  ]))
  const signature=pdfObject(objects,Buffer.concat([
    Buffer.from('<< /Type /XObject /Subtype /Image /Width '+DOCUMENT_TEMPLATE.signature.pixelsWide+
      ' /Height '+DOCUMENT_TEMPLATE.signature.pixelsHigh+
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask '+mask+' 0 R /Filter /FlateDecode /Length '+rgb.length+' >>\nstream\n'),
    rgb,Buffer.from('\nendstream'),
  ]))
  const pictureIds=new Map()
  for(const im of images.values()){
    pictureIds.set(im.resource,pdfObject(objects,Buffer.concat([
      Buffer.from('<< /Type /XObject /Subtype /Image /Width '+im.width+
        ' /Height '+im.height+' /ColorSpace /'+im.colorSpace+
        ' /BitsPerComponent 8 /Filter /DCTDecode /Length '+im.bytes.length+' >>\nstream\n','ascii'),
      im.bytes,Buffer.from('\nendstream','ascii'),
    ])))
  }
  const xobjects=[...pictureIds].map(([name,id])=>' /'+name+' '+id+' 0 R').join('')
  const fontResources=' /F1 '+fonts.ascii+' 0 R /F2 '+fonts.native+
    ' 0 R /F3 '+serif+' 0 R /F4 '+bold+' 0 R'
  const ids=layouts.map(layout=>{
    const stream=layout.commands.join('\n')
    const content=pdfObject(objects,'<< /Length '+Buffer.byteLength(stream,'ascii')+' >>\nstream\n'+stream+'\nendstream')
    const annotations=layout.links.map(({url,x,y:linkY,width})=>
      pdfObject(objects,'<< /Type /Annot /Subtype /Link /Rect ['+x+' '+(linkY-5)+' '+(x+width)+' '+(linkY+17)+
        '] /Border [0 0 0] /A << /S /URI /URI ('+literal(url)+') >> >>'))
    return pdfObject(objects,'<< /Type /Page /Parent '+pages+' 0 R /MediaBox [0 0 '+W+' '+H+
      '] /Resources << /XObject << /Lighthouse '+lighthouse+' 0 R /Signature '+signature+' 0 R'+xobjects+
      ' >> /Font <<'+fontResources+' >> >> /Contents '+content+' 0 R'+
      (annotations.length?' /Annots ['+annotations.map(id=>id+' 0 R').join(' ')+']':'')+' >>')
  })
  objects[catalog-1]=Buffer.from('<< /Type /Catalog /Pages '+pages+' 0 R >>','ascii')
  objects[pages-1]=Buffer.from('<< /Type /Pages /Kids ['+ids.map(id=>id+' 0 R').join(' ')+
    '] /Count '+ids.length+' >>','ascii')
  const chunks=[Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n','latin1')],offsets=[0]
  let length=chunks[0].length
  for(const [index,obj]of objects.entries()){
    offsets.push(length)
    const serialized=Buffer.concat([Buffer.from((index+1)+' 0 obj\n','ascii'),obj,Buffer.from('\nendobj\n','ascii')])
    chunks.push(serialized);length+=serialized.length
  }
  const xref=length
  chunks.push(Buffer.from('xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+
    offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+
    'trailer\n<< /Size '+(objects.length+1)+' /Root '+catalog+
    ' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n','ascii'))
  return Buffer.concat(chunks)
}
