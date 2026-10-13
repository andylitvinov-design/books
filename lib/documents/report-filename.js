// Do not put a client's name or other private information in download headers.
export function reportPdfFilename(document, { preview = false } = {}) {
  const issued = String(document?.dateIssued ?? '').trim()
  const date = /^\d{4}-\d{2}-\d{2}$/.test(issued) ? issued : 'undated'
  return `HolisticHouse_Report_${date}${preview ? '_Preview' : ''}.pdf`
}
