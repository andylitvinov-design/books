import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deflateSync } from 'node:zlib'

const A4 = { width: 595.28, height: 841.89, left: 52, top: 790, bottom: 58 }
const notoSansPath = resolve(process.cwd(), 'assets/fonts/NotoSans-Regular.ttf')
const notoSansData = readFileSync(notoSansPath)

function romanise(value) {
  const map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ь: '', ъ: '' }
  return [...String(value)].map((character) => {
    const lower = character.toLowerCase()
    const replacement = map[lower]
    return replacement ? (character === lower ? replacement : replacement.toUpperCase()) : character
  }).join('')
}

function literal(value) {
  return romanise(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '?').replace(/([\\()])/g, '\\$1')
}

function wrap(value, width = 78, unicode = false) {
  const words = (unicode ? String(value) : literal(value)).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width && line) { lines.push(line); line = word } else line = `${line} ${word}`.trim()
  }
  if (line) lines.push(line)
  return lines
}

function localized(locale) {
  return locale === 'ru'
    ? { title: 'ГОМЕОПАТИЧЕСКОЕ НАЗНАЧЕНИЕ / РЕКОМЕНДАЦИЯ', patient: 'Клиент', date: 'Дата', dob: 'Дата рождения', remedy: 'Препарат', potency: 'Разведение', dosage: 'Приём', frequency: 'Частота', duration: 'Срок', instructions: 'Рекомендации', updated: 'Обновлено', disclaimer: 'Материал носит информационный характер и не заменяет медицинскую диагностику, лечение или неотложную медицинскую помощь.' }
    : { title: 'HOMEOPATHIC RECOMMENDATION', patient: 'Patient', date: 'Date', dob: 'Date of birth', remedy: 'Remedy', potency: 'Potency', dosage: 'Dosage', frequency: 'Frequency', duration: 'Duration', instructions: 'Recommendations', updated: 'Updated', disclaimer: 'This document is provided for informational purposes and is not a substitute for medical diagnosis, treatment, or emergency care.' }
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
      return pdfObject(objects, `<< /Type /Font /Subtype /Type0 /BaseFont /NotoSans-Regular /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${toUnicode} 0 R >>`)
    },
  }
}

function prescriptionItemLines(item, copy) {
  return [item.potency && `${copy.potency}: ${item.potency}`, item.dosage && `${copy.dosage}: ${item.dosage}`, item.frequency && `${copy.frequency}: ${item.frequency}`, item.duration && `${copy.duration}: ${item.duration}`, item.instructions && `${copy.instructions}: ${item.instructions}`, item.notes && `${copy.instructions}: ${item.notes}`].filter(Boolean)
}

function text(commands, value, x, y, size, unicode) {
  const rendered = unicode ? `<${unicode.encode(value)}>` : `(${literal(value)})`
  commands.push(`BT /${unicode ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm ${rendered} Tj ET`)
}

export function buildPrescriptionPdf(document, locale, origin) {
  const copy = localized(locale)
  const unicode = locale === 'ru' ? createUnicodeUsage() : undefined
  const commands = ['0.15 0.17 0.2 rg']
  const links = []
  let y = A4.top

  text(commands, document.practitionerName, A4.left, y, 16, unicode); y -= 22
  for (const line of [document.practitionerRole, document.practitionerBackground, document.practitionerContact].filter(Boolean)) { text(commands, line, A4.left, y, 9, unicode); y -= 13 }
  y -= 16
  text(commands, copy.title, A4.left, y, 15, unicode); y -= 28
  text(commands, `${copy.patient}: ${document.patientName}`, A4.left, y, 10, unicode); y -= 15
  text(commands, `${copy.date}: ${document.dateIssued}`, A4.left, y, 10, unicode); y -= 15
  if (document.patientDob) { text(commands, `${copy.dob}: ${document.patientDob}`, A4.left, y, 10, unicode); y -= 15 }
  y -= 10

  for (const item of document.items) {
    if (y < 180) break
    text(commands, `${copy.remedy}: ${item.displayName}`, A4.left, y, 11, unicode)
    if (item.remedyPath) {
      links.push({ url: new URL(item.remedyPath, origin).toString(), y })
      commands.push(`0.36 0.18 0.1 RG ${A4.left} ${y - 2} m 310 ${y - 2} l S`, '0.15 0.17 0.2 rg')
    }
    y -= 14
    for (const detail of prescriptionItemLines(item, copy)) for (const line of wrap(detail, 74, Boolean(unicode))) { text(commands, line, A4.left + 12, y, 9, unicode); y -= 12 }
    y -= 8
  }

  if (document.generalInstructions && y > 130) {
    text(commands, copy.instructions, A4.left, y, 11, unicode); y -= 14
    for (const line of wrap(document.generalInstructions, 78, Boolean(unicode))) { text(commands, line, A4.left, y, 9, unicode); y -= 12 }
    y -= 28
  }

  const footerY = Math.max(A4.bottom + 22, y - 15)
  text(commands, `${copy.updated}: ${document.updatedAt.slice(0, 10)}`, A4.left, footerY + 24, 8, unicode)
  text(commands, document.practitionerName, A4.left, footerY + 10, 9, unicode)
  commands.push(`0.35 0.35 0.35 RG ${A4.left} ${footerY} m 232 ${footerY} l S`)
  for (const [index, line] of wrap(copy.disclaimer, 98, Boolean(unicode)).entries()) text(commands, line, A4.left, footerY - 16 - (index * 10), 7, unicode)

  const objects = []
  const catalog = pdfObject(objects, '')
  const pages = pdfObject(objects, '')
  const helvetica = pdfObject(objects, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const bundledFont = unicode?.resources(objects)
  const stream = commands.join('\n')
  const content = pdfObject(objects, `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`)
  const annotations = links.map(({ url, y: linkY }) => pdfObject(objects, `<< /Type /Annot /Subtype /Link /Rect [${A4.left} ${linkY - 3} 310 ${linkY + 12}] /Border [0 0 0] /A << /S /URI /URI (${literal(url)}) >> >>`))
  const fonts = ` /F1 ${helvetica} 0 R${bundledFont ? ` /F2 ${bundledFont} 0 R` : ''}`
  const page = pdfObject(objects, `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /Font <<${fonts} >> >> /Contents ${content} 0 R${annotations.length ? ` /Annots [${annotations.map((id) => `${id} 0 R`).join(' ')}]` : ''} >>`)
  objects[catalog - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pages} 0 R >>`, 'ascii')
  objects[pages - 1] = Buffer.from(`<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`, 'ascii')

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
