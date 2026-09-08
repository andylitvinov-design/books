const A4 = { width: 595.28, height: 841.89, left: 52, right: 543, top: 790, bottom: 58 }

function romanise(value) {
  const map = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ь: '', ъ: '' }
  return [...String(value)].map((character) => {
    const lower = character.toLowerCase()
    const replacement = map[lower]
    return replacement ? (character === lower ? replacement : replacement.toUpperCase()) : character
  }).join('')
}

function literal(value) {
  return romanise(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/([\\()])/g, '\\$1')
}

function wrap(value, width = 78) {
  const words = literal(value).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width && line) {
      lines.push(line)
      line = word
    } else line = `${line} ${word}`.trim()
  }
  if (line) lines.push(line)
  return lines
}

function localized(locale) {
  return locale === 'ru'
    ? { title: 'GOMEOPATICHESKOE NAZNACHENIE', patient: 'Klient', date: 'Data', dob: 'Data rozhdeniya', remedy: 'Preparat', instructions: 'Informatsiya', updated: 'Obnovleno', disclaimer: 'Material nosit informatsionnyy kharakter i ne zamenyaet meditsinskuyu diagnostiku, lechenie ili neotlozhnuyu meditsinskuyu pomoshch.' }
    : { title: 'HOMEOPATHIC RECOMMENDATION', patient: 'Patient', date: 'Date', dob: 'Date of birth', remedy: 'Remedy', instructions: 'Instructions', updated: 'Updated', disclaimer: 'This document is provided for informational purposes and is not a substitute for medical diagnosis, treatment, or emergency care.' }
}

function pdfObject(objects, value) {
  objects.push(value)
  return objects.length
}

function text(command, value, x, y, size = 10) {
  command.push(`BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${literal(value)}) Tj ET`)
}

export function buildPrescriptionPdf(document, locale, origin) {
  const copy = localized(locale)
  const commands = ['0.15 0.17 0.2 rg']
  const links = []
  let y = A4.top

  text(commands, document.practitionerName, A4.left, y, 16); y -= 22
  for (const line of [document.practitionerRole, document.practitionerBackground, document.practitionerContact].filter(Boolean)) {
    text(commands, line, A4.left, y, 9); y -= 13
  }
  y -= 16
  text(commands, copy.title, A4.left, y, 15); y -= 28
  text(commands, `${copy.patient}: ${document.patientName}`, A4.left, y, 10); y -= 15
  text(commands, `${copy.date}: ${document.dateIssued}`, A4.left, y, 10); y -= 15
  if (document.patientDob) { text(commands, `${copy.dob}: ${document.patientDob}`, A4.left, y, 10); y -= 15 }
  y -= 10

  for (const item of document.items) {
    if (y < 180) break
    const detail = [item.potency, item.dosage, item.frequency, item.duration, item.instructions, item.notes].filter(Boolean).join(' | ')
    text(commands, `${copy.remedy}: ${item.displayName}`, A4.left, y, 11)
    if (item.remedyPath) {
      links.push({ url: new URL(item.remedyPath, origin).toString(), y })
      commands.push(`0.36 0.18 0.1 RG ${A4.left} ${y - 2} m 310 ${y - 2} l S`)
      commands.push('0.15 0.17 0.2 rg')
    }
    y -= 14
    for (const line of wrap(detail)) { text(commands, line, A4.left + 12, y, 9); y -= 12 }
    y -= 8
  }

  if (document.generalInstructions && y > 130) {
    text(commands, copy.instructions, A4.left, y, 11); y -= 14
    for (const line of wrap(document.generalInstructions)) { text(commands, line, A4.left, y, 9); y -= 12 }
    y -= 28
  }

  const footerY = Math.max(A4.bottom + 22, y - 15)
  text(commands, `${copy.updated}: ${document.updatedAt.slice(0, 10)}`, A4.left, footerY + 24, 8)
  text(commands, document.practitionerName, A4.left, footerY + 10, 9)
  commands.push(`0.35 0.35 0.35 RG ${A4.left} ${footerY} m 232 ${footerY} l S`)
  for (const [index, line] of wrap(copy.disclaimer, 98).entries()) text(commands, line, A4.left, footerY - 16 - (index * 10), 7)

  const objects = []
  const catalog = pdfObject(objects, '')
  const pages = pdfObject(objects, '')
  const font = pdfObject(objects, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const stream = commands.join('\n')
  const content = pdfObject(objects, `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`)
  const annotations = links.map(({ url, y: linkY }) => pdfObject(objects, `<< /Type /Annot /Subtype /Link /Rect [${A4.left} ${linkY - 3} 310 ${linkY + 12}] /Border [0 0 0] /A << /S /URI /URI (${literal(url)}) >> >>`))
  const page = pdfObject(objects, `<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R${annotations.length ? ` /Annots [${annotations.map((id) => `${id} 0 R`).join(' ')}]` : ''} >>`)
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pages} 0 R >>`
  objects[pages - 1] = `<< /Type /Pages /Kids [${page} 0 R] /Count 1 >>`

  let output = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(output, 'latin1'))
    output += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = Buffer.byteLength(output, 'latin1')
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(output, 'latin1')
}
