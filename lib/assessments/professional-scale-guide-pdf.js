// Tiny dependency-free PDF writer for ORIGINAL educational scale summaries.
// Helvetica/WinAnsi output is intentionally English-only; no protected test
// questions, response keys, manuals, protected norms or questionnaire pages.
function ascii(value) {
  return String(value ?? '')
    .replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"').replace(/\u2022/g, '-')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, ' ')
}
function escapePdf(value) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
function wrap(value, limit = 94) {
  const words = ascii(value).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''
  for (const raw of words) {
    // Break long source URLs without exceeding the printable page width.
    const parts = raw.match(new RegExp('.{1,' + limit + '}', 'g')) || [raw]
    for (const word of parts) {
      if (current && current.length + 1 + word.length > limit) {
        lines.push(current)
        current = ''
      }
      current = current ? current + ' ' + word : word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}
function pdfText(x, y, value, font = 'F1', size = 10.5) {
  return 'BT /' + font + ' ' + size + ' Tf 0.24 0.22 0.21 rg 1 0 0 1 ' +
    x + ' ' + y + ' Tm (' + escapePdf(value) + ') Tj ET\n'
}
function contentForPage(items, number, total) {
  let body = '0.69 0.48 0.27 rg 48 756 516 3 re f\n'
  let y = 732
  for (const item of items) {
    if (item.type === 'gap') { y -= 11; continue }
    const bold = item.type === 'title' || item.type === 'label'
    body += pdfText(48, y, item.text, bold ? 'F2' : 'F1', item.type === 'title' ? 17 : item.type === 'label' ? 11.5 : 10)
    y -= item.type === 'title' ? 31 : 16
  }
  body += '0.72 0.7 0.67 RG 48 45 m 564 45 l S\n'
  body += pdfText(48, 31, 'Holistic House - Research reference, NOT a questionnaire or clinical report', 'F1', 8)
  body += pdfText(519, 31, number + ' / ' + total, 'F1', 8)
  return body
}
function linesFor(resource) {
  const l = []
  const add = (text, type = 'body', max = 94) => wrap(text, max).forEach((v) => l.push({ text: v, type }))
  add('PROFESSIONAL SCALE REFERENCE', 'label')
  add(resource.title, 'title', 49)
  add('WHAT THIS INSTRUMENT MEASURES', 'label')
  for (const scale of resource.scales) add('- ' + scale, 'body')
  l.push({ type: 'gap' })
  add('ACCESS AND RIGHTS', 'label')
  add(resource.rightsNotice, 'body')
  l.push({ type: 'gap' })
  add('IMPORTANT', 'label')
  add('This original Holistic House educational sheet describes publicly named constructs only. It does not contain the original questions, response keys, proprietary cutoff tables, or a validated translation. Do not score or diagnose anyone using this summary.')
  add('For a validated assessment, obtain the authorized questionnaire and current manual from its rights holder or official distributor.')
  if (resource.sourceUrl) {
    l.push({ type: 'gap' })
    add('OFFICIAL / RESEARCH SOURCE', 'label')
    add(resource.sourceUrl)
  }
  return l
}
export function makeProfessionalScaleGuidePdf(resource) {
  if (!resource || !Array.isArray(resource.scales) || !resource.scales.length) throw new Error('INVALID_SCALE_REFERENCE')
  const raw = linesFor(resource)
  const pages = []
  let current = [], vertical = 0
  for (const item of raw) {
    const cost = item.type === 'title' ? 31 : item.type === 'gap' ? 11 : 16
    if (vertical + cost > 660 && current.length) { pages.push(current); current = []; vertical = 0 }
    current.push(item)
    vertical += cost
  }
  if (current.length) pages.push(current)
  const fontObjects = [
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ]
  const objects = new Map([
    [1, '<< /Type /Catalog /Pages 2 0 R >>'],
    [3, fontObjects[0]],
    [4, fontObjects[1]],
  ])
  const pageIds = []
  pages.forEach((page, index) => {
    const pageId = 5 + index * 2, contentId = pageId + 1
    pageIds.push(pageId)
    const stream = contentForPage(page, index + 1, pages.length)
    objects.set(pageId, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + contentId + ' 0 R >>')
    objects.set(contentId, '<< /Length ' + Buffer.byteLength(stream, 'ascii') + ' >>\nstream\n' + stream + 'endstream')
  })
  objects.set(2, '<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>')
  const lastId = Math.max(...objects.keys())
  let output = '%PDF-1.4\n'
  const offsets = [0]
  for (let id = 1; id <= lastId; id++) {
    offsets[id] = Buffer.byteLength(output, 'ascii')
    output += id + ' 0 obj\n' + objects.get(id) + '\nendobj\n'
  }
  const xrefStart = Buffer.byteLength(output, 'ascii')
  output += 'xref\n0 ' + (lastId + 1) + '\n0000000000 65535 f \n'
  for (let id = 1; id <= lastId; id++) output += String(offsets[id]).padStart(10, '0') + ' 00000 n \n'
  output += 'trailer\n<< /Size ' + (lastId + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF\n'
  return Buffer.from(output, 'ascii')
}
