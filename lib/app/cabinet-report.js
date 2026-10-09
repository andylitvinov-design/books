import { buildPsychPortrait } from '../assessments/psych-portrait.js'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS } from '../assessments/test-explorer.js'
import { monitoringCatalogItem } from '../../data/assessments/catalog.js'

const TEXT = {
  en: {
    title: 'Personal reflection report',
    subtitle: 'Holistic House · your private cabinet',
    portrait: 'Psychological portrait',
    tests: 'Completed assessments',
    noResults: 'No completed assessments yet.',
    measured: 'Measured axes',
    caution: 'This report is for self-observation, not medical diagnosis. Percentages describe the favorable-direction position within each instrument scale; they are not health scores or norms. Unmeasured axes are left blank.',
    source: 'Measurement',
    empty: 'Not measured',
  },
  ru: {
    title: 'Личный отчёт по результатам',
    subtitle: 'Holistic House · личный кабинет',
    portrait: 'Психологический портрет',
    tests: 'Пройденные тесты',
    noResults: 'Пройденных тестов пока нет.',
    measured: 'Измеренные шкалы',
    caution: 'Этот отчёт предназначен для самонаблюдения, а не для постановки диагноза. Проценты обозначают положение внутри шкалы с учётом её направления, а не здоровье или норму личности. Неизмеренные оси остаются пустыми.',
    source: 'Измерение',
    empty: 'Нет данных',
  },
}

function validDate(value) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null
}

export function buildCabinetReport(data = {}, locale = 'en') {
  const lang = locale === 'ru' ? 'ru' : 'en'
  const results = Array.isArray(data.results) ? data.results.filter(Boolean) : []
  const portrait = buildPsychPortrait(results)
  const axes = TEST_EXPLORER_AXES.filter((axis) => axis !== 'personality').map((axis) => ({
    axis,
    title: TEST_EXPLORER_AXIS_LABELS[axis]?.[lang] || TEST_EXPLORER_AXIS_LABELS[axis]?.en || axis,
    value: portrait.axes?.[axis]?.percent ?? null,
    source: portrait.axes?.[axis]?.source || null,
    measuredAt: validDate(portrait.axes?.[axis]?.measuredAt),
  }))
  const tests = [...results].sort((a, b) =>
    Date.parse(validDate(b.measurementAt) || 0) - Date.parse(validDate(a.measurementAt) || 0))
    .map((item) => {
      const entry = monitoringCatalogItem(item.definitionKey)
      const dimensions = Array.isArray(item.dimensions) ? item.dimensions : []
      return {
        title: entry?.title?.[lang] || entry?.title?.en || item.definitionKey || 'Assessment',
        at: validDate(item.measurementAt || item.createdAt),
        scales: dimensions.filter((d) => d && Number.isFinite(Number(d.value)) && d.value !== null && d.value !== undefined)
          .map((d) => ({
            title: String(d.sourceConstruct || d.key || ''),
            value: Number(d.value),
            unit: d.unit || '',
            min: Number.isFinite(Number(d.min)) ? Number(d.min) : null,
            max: Number.isFinite(Number(d.max)) ? Number(d.max) : null,
          })),
      }
    })
  return {
    lang,
    text: TEXT[lang],
    person: String(data.account?.displayName || '').slice(0, 120),
    generatedAt: new Date().toISOString(),
    measuredCount: axes.filter((axis) => axis.value !== null).length,
    axes,
    tests,
  }
}

// Bytes assembled by this function form an ordinary PDF 1.4 document with
// a JPEG image per page. Unicode/Cyrillic is drawn with the browser's fonts,
// so there is no third-party PDF service or external font upload.
export function buildImagePdf(jpegPages, width = 794, height = 1123) {
  if (!Array.isArray(jpegPages) || !jpegPages.length) throw new Error('EMPTY_REPORT')
  const enc = new TextEncoder()
  const chunks = []
  let total = 0
  const offsets = [0]
  const push = (part) => {
    const bytes = typeof part === 'string' ? enc.encode(part) : part
    chunks.push(bytes)
    total += bytes.length
  }
  const obj = (id, body) => {
    offsets[id] = total
    push(id + ' 0 obj\n')
    if (typeof body === 'function') body()
    else push(body)
    push('\nendobj\n')
  }
  push('%PDF-1.4\n%HolisticHouse\n')
  const kids = jpegPages.map((_, i) => 3 + i * 3)
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [' + kids.map((id) => id + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>')
  jpegPages.forEach((img, i) => {
    const pageId = 3 + 3 * i, imageId = pageId + 1, contentId = pageId + 2
    obj(pageId, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im' + i + ' ' + imageId + ' 0 R >> >> /Contents ' + contentId + ' 0 R >>')
    obj(imageId, () => {
      push('<< /Type /XObject /Subtype /Image /Width ' + width + ' /Height ' + height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + img.length + ' >>\nstream\n')
      push(img)
      push('\nendstream')
    })
    const stream = 'q\n595.28 0 0 841.89 0 0 cm\n/Im' + i + ' Do\nQ\n'
    obj(contentId, '<< /Length ' + enc.encode(stream).length + ' >>\nstream\n' + stream + 'endstream')
  })
  const startxref = total
  push('xref\n0 ' + offsets.length + '\n0000000000 65535 f \n')
  for (let i = 1; i < offsets.length; i++) push(String(offsets[i]).padStart(10, '0') + ' 00000 n \n')
  push('trailer\n<< /Size ' + offsets.length + ' /Root 1 0 R >>\nstartxref\n' + startxref + '\n%%EOF')
  return new Blob(chunks, { type: 'application/pdf' })
}

export function drawCabinetReportPdf(report) {
  if (typeof document === 'undefined') throw new Error('CLIENT_ONLY')
  const W = 794, H = 1123, SCALE = 2, M = 54
  const images = []
  const date = (v) => v ? new Intl.DateTimeFormat(report.lang, { dateStyle: 'medium' }).format(new Date(v)) : '—'
  let c, ctx, y, pageNumber = 0
  const ink = '#3c342f', muted = '#796c62', accent = '#84614b'
  function text(s, x, yy, size = 15, color = ink, weight = '400') {
    ctx.fillStyle = color
    ctx.font = weight + ' ' + size + 'px Arial, sans-serif'
    ctx.fillText(String(s), x, yy)
  }
  function paragraph(value, x, top, maxWidth, size = 13, line = 19, color = muted) {
    ctx.font = '400 ' + size + 'px Arial, sans-serif'
    const words = String(value).split(/\s+/)
    let current = '', yy = top
    for (const word of words) {
      const proposal = current ? current + ' ' + word : word
      if (ctx.measureText(proposal).width > maxWidth && current) {
        text(current, x, yy, size, color); yy += line; current = word
      } else current = proposal
    }
    if (current) { text(current, x, yy, size, color); yy += line }
    return yy
  }
  function newPage() {
    c = document.createElement('canvas')
    c.width = W * SCALE
    c.height = H * SCALE
    ctx = c.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('CANVAS_UNAVAILABLE')
    ctx.scale(SCALE, SCALE)
    ctx.fillStyle = '#fffdf9'; ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#eee4d8'; ctx.fillRect(0, 0, W, 12)
    text('HOLISTIC HOUSE', M, 50, 16, accent, '700')
    text(report.text.subtitle, M, 72, 11, muted)
    pageNumber += 1
    y = 106
  }
  function finish() {
    ctx.strokeStyle = '#e6ddd3'; ctx.beginPath(); ctx.moveTo(M, 1059); ctx.lineTo(W-M, 1059); ctx.stroke()
    text(report.text.subtitle, M, 1082, 10, muted)
    text(String(pageNumber), W - M - 12, 1082, 11, muted)
    const base64 = c.toDataURL('image/jpeg', 0.88).split(',')[1]
    const raw = atob(base64), bytes = new Uint8Array(raw.length)
    for (let i=0; i<raw.length; i++) bytes[i] = raw.charCodeAt(i)
    images.push(bytes)
  }
  function drawPortrait() {
    text(report.text.portrait, M, y, 22, ink, '700'); y += 18
    const centerX=240, centerY=y+170, radius=122
    ctx.strokeStyle = '#dfd5c6'; ctx.lineWidth = 2
    for (const r of [55, 94, radius]) {ctx.beginPath();ctx.arc(centerX, centerY, r, 0, 2*Math.PI);ctx.stroke()}
    ctx.fillStyle='#efe2d0'
    ctx.beginPath();ctx.ellipse(centerX,centerY-28,32,40,0,0,2*Math.PI);ctx.fill()
    ctx.beginPath();ctx.ellipse(centerX,centerY+61,72,66,0,Math.PI,2*Math.PI);ctx.fill()
    const axes=[...report.axes.filter(a=>a.value!==null), ...report.axes.filter(a=>a.value===null)].slice(0,10)
    axes.forEach((a,index)=>{
      const angle=-Math.PI/2 + index*2*Math.PI/axes.length
      ctx.strokeStyle='#c4b5a2';ctx.lineWidth=1.3
      ctx.beginPath();ctx.moveTo(centerX,centerY);ctx.lineTo(centerX+Math.cos(angle)*radius,centerY+Math.sin(angle)*radius);ctx.stroke()
      if(a.value!==null){
        const end=18+104*a.value/100
        ctx.strokeStyle=accent;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(centerX,centerY);ctx.lineTo(centerX+Math.cos(angle)*end,centerY+Math.sin(angle)*end);ctx.stroke()
        ctx.fillStyle=accent;ctx.beginPath();ctx.arc(centerX+Math.cos(angle)*end,centerY+Math.sin(angle)*end,4,0,Math.PI*2);ctx.fill()
      }
    })
    text(report.text.measured + ': ' + report.measuredCount, 425, y+26, 14, accent,'700')
    let yy=y+53
    for(const a of report.axes.filter(a=>a.value!==null).slice(0,10)){
      yy=paragraph(a.title + ': ' + a.value + '%',425,yy,312,12,17,ink)+4
    }
    if (report.measuredCount===0) paragraph(report.text.empty,425,y+80,290,14,21,muted)
    y+=335
    y=paragraph(report.text.caution,M,y,W-M*2,11,16,muted)+21
  }
  function drawTest(t,index) {
    if(y+94>1015){finish();newPage();text(report.text.tests, M, y, 19, ink, '700');y+=35}
    ctx.fillStyle='#f4e9db';ctx.fillRect(M,y-18,W-M*2,54)
    text((index+1)+'. '+t.title.slice(0,75),M+14,y+3,15,ink,'700')
    text(date(t.at),M+14,y+24,11,muted)
    y+=66
    for (const measure of t.scales) {
      if(y+34>1015){finish();newPage();text(t.title.slice(0,74),M,y,15,ink,'700');y+=35}
      const value = String(measure.value) + (measure.max !== null ? ' / '+measure.max : '') + (measure.unit ? ' '+measure.unit : '')
      const label = measure.title.length > 79 ? measure.title.slice(0,76)+'…' : measure.title
      const rows = paragraph(label+': '+value, M+18, y, W-M*2-36, 11, 15, ink)
      y=rows+5
    }
    y+=18
  }
  newPage()
  text(report.text.title,M,y,27,ink,'700');y+=29
  if(report.person){text(report.person,M,y,14,ink);y+=23}
  text(date(report.generatedAt),M,y,11,muted);y+=37
  drawPortrait()
  text(report.text.tests + ' · ' + report.tests.length,M,y,20,ink,'700');y+=36
  if(!report.tests.length){text(report.text.noResults,M,y,13,muted);y+=22}
  report.tests.forEach(drawTest)
  finish()
  return buildImagePdf(images, W*SCALE, H*SCALE)
}
