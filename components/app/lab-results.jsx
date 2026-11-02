'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowRight, CheckCircle2, FileText, LockKeyhole, Plus, Trash2, UploadCloud } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import { buildLabReview, labMarkerKey, labRangeStatus, normalizeLabMarker, parseLabText, LAB_REPORT_VERSION, LAB_MAX_MARKERS } from '@/lib/labs/analysis.mjs'
import styles from './lab-results.module.css'

const blank = () => ({ name: '', value: '', unit: '', lower: '', upper: '', critical: false })
function localDay() { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }
const words = {
  en: {
    eyebrow: 'MY HEALTH · PRIVATE', title: 'My laboratory results', intro: 'Review your lab numbers, find values outside the laboratory’s own reference ranges, and build a gentle seven-day follow-up plan.',
    privacy: 'Your original file and pasted text stay on this device. Only confirmed indicator names, values, ranges and dates are encrypted and saved in your private account. Nothing is sent to a practitioner or an external AI service.',
    uploadTitle: 'Add an analysis', upload: 'Choose a report', fileTip: 'CSV, TSV and TXT tables can be read automatically. For scanned PDF or photos, copy the values into the table below: image OCR is not enabled.',
    textLabel: 'Paste laboratory data', textPlaceholder: 'Name;Result;Unit;Low;High\nFerritin;8;ng/mL;15;150\nHemoglobin;125;g/L;120;160', parse: 'Recognize indicators',
    unsupported: 'This file stays on your device. Automatic PDF/photo recognition is not available yet. Copy its table into the text box or enter the numbers manually.',
    tooLarge: 'The file is too large for local text recognition (limit 64 KB). Enter the values manually.',
    parsed: n => `Recognized ${n} rows. Check all numbers and units before saving.`, none: 'No valid indicators were recognized. Use the sample table format or enter values manually.',
    lab: 'Laboratory (optional)', date: 'Sample date', table: 'Review and correct', name: 'Indicator', value: 'Value', unit: 'Unit', low: 'Low', high: 'High', critical: 'Lab critical flag', remove: 'Remove',
    addRow: 'Add indicator', save: 'Save confirmed results', saving: 'Saving…', confirmed: 'I checked all values, units and reference intervals against the laboratory report and agree to save this structured record.',
    partial: 'Some rows are incomplete. Correct or remove them before saving.', noRange: 'No complete reference range: status cannot be confirmed.', review: 'What needs attention', within: 'Within supplied range', below: 'Below supplied range', above: 'Above supplied range',
    unknown: 'Range not supplied', urgent: 'Laboratory critical flag', attention: 'Outside range', indicators: 'Indicators', noFlags: 'No values are outside the complete reference ranges you provided. This does not prove that all results are clinically normal.',
    caution: 'A laboratory range is not a diagnosis. Significance depends on age, circumstances, symptoms and the test method. Always check the original report with a licensed healthcare professional.',
    criticalNote: 'A result was marked critical by the laboratory. Follow the laboratory’s instructions and contact an appropriate healthcare professional promptly. Seek urgent care for severe or rapidly worsening symptoms.',
    plan: 'Seven-day review plan', planIntro: 'Practical steps to understand the results and prepare professional follow-up—not a treatment or supplement prescription.',
    focus: 'Topics to discuss', needsRange: 'Ask the laboratory for the missing reference interval before interpreting these indicators.',
    history: 'Saved analyses', empty: 'Your confirmed analyses will appear here.', new: 'New analysis', saved: 'Saved privately', delete: 'Delete this analysis', confirmDelete: 'Permanently delete this saved laboratory record?', deleted: 'Record deleted.',
    comparison: 'Changes since the previous measurement', changeNote: 'Numerical comparison only; identical indicator names and units are required. A difference is not automatically an improvement or deterioration.',
    failed: 'Could not load or save your private results. Please try again.', limit: 'Storage limit: up to 24 confirmed reports. Delete older ones to add more.', invalid: 'Check the date and all entered rows.', view: 'Open', source: 'Original uploaded document is not stored.', pending: 'Loading your results…',
  },
  ru: {
    eyebrow: 'МОЁ ЗДОРОВЬЕ · ПРИВАТНО', title: 'Мои лабораторные анализы', intro: 'Сверьте показатели с референсными диапазонами вашей лаборатории, увидьте отклонения и получите бережный план на семь дней.',
    privacy: 'Исходный файл и вставленный текст остаются на вашем устройстве. В личном кабинете шифруются и сохраняются только подтверждённые показатели, диапазоны и даты. Врачу, мастеру или стороннему ИИ они автоматически не передаются.',
    uploadTitle: 'Добавить анализ', upload: 'Выбрать файл', fileTip: 'CSV, TSV и TXT разбираются автоматически. Для сканированного PDF и фото скопируйте показатели в таблицу ниже: распознавание изображений пока не включено.',
    textLabel: 'Вставить текст анализов', textPlaceholder: 'Показатель;Результат;Единица;Нижняя;Верхняя\nФерритин;8;нг/мл;15;150\nГемоглобин;125;г/л;120;160', parse: 'Распознать показатели',
    unsupported: 'Этот файл остаётся на устройстве. Автораспознавание PDF/фото пока недоступно. Скопируйте таблицу в текстовое поле или внесите значения вручную.',
    tooLarge: 'Файл слишком большой для локального разбора текста (до 64 КБ). Введите значения вручную.',
    parsed: n => `Найдено строк: ${n}. Перед сохранением сверьте цифры и единицы.`, none: 'Показатели не распознаны. Используйте пример таблицы или внесите значения вручную.',
    lab: 'Лаборатория (необязательно)', date: 'Дата сдачи', table: 'Проверить и исправить', name: 'Показатель', value: 'Значение', unit: 'Ед.', low: 'От', high: 'До', critical: 'Лаб. отметка «критично»', remove: 'Удалить',
    addRow: 'Добавить показатель', save: 'Сохранить подтверждённые результаты', saving: 'Сохраняем…', confirmed: 'Я сверил(а) значения, единицы и диапазоны с оригиналом лабораторного отчёта и согласен(на) сохранить структурированные результаты.',
    partial: 'Некоторые строки заполнены некорректно. Исправьте или удалите их.', noRange: 'Без полного референсного диапазона нельзя подтвердить статус.', review: 'На что обратить внимание', within: 'В диапазоне лаборатории', below: 'Ниже диапазона', above: 'Выше диапазона',
    unknown: 'Диапазон не указан', urgent: 'Критическая отметка лаборатории', attention: 'За пределами диапазона', indicators: 'Показатели', noFlags: 'По указанным полным диапазонам отклонений не найдено. Это не означает, что результаты клинически нормальны.',
    caution: 'Референсный интервал — не диагноз. Значение зависит от возраста, ситуации, симптомов и метода анализа. Обсудите исходный документ с квалифицированным медицинским специалистом.',
    criticalNote: 'Вы отметили показатель как критический в лабораторном отчёте. Следуйте указаниям лаборатории и оперативно свяжитесь с медицинским специалистом. При тяжёлых или быстро усиливающихся симптомах нужна неотложная помощь.',
    plan: 'План на семь дней', planIntro: 'Шаги для осмысления анализов и подготовки к врачу, без самостоятельного назначения препаратов и добавок.',
    focus: 'Что обсудить', needsRange: 'Уточните недостающий интервал в лаборатории, прежде чем интерпретировать эти показатели.',
    history: 'История анализов', empty: 'Подтверждённые анализы появятся здесь.', new: 'Новый анализ', saved: 'Сохранено приватно', delete: 'Удалить этот анализ', confirmDelete: 'Безвозвратно удалить сохранённый результат?', deleted: 'Анализ удалён.',
    comparison: 'Изменения относительно прошлого замера', changeNote: 'Сравниваются только одноимённые показатели в одинаковых единицах. Изменение цифры не означает улучшения или ухудшения здоровья.',
    failed: 'Не удалось загрузить или сохранить результаты. Попробуйте ещё раз.', limit: 'Можно хранить до 24 анализов. Для нового удалите один из старых.', invalid: 'Проверьте дату и заполнение всех строк.', view: 'Открыть', source: 'Исходный загруженный файл не хранится.', pending: 'Загружаем ваши результаты…',
  },
}
const statusClass = status => status === 'low' || status === 'high' ? styles.outOfRange : status === 'within' ? styles.within : styles.unknown
const labelForStatus = (status, t) => status === 'low' ? t.below : status === 'high' ? t.above : status === 'within' ? t.within : t.unknown
const show = value => value === null || value === undefined || value === '' ? '—' : String(value)
function PriorChanges({ report, reports, t }) {
  if (!report) return null
  const older = [...reports].filter(item => item.id !== report.id && item.measuredOn < report.measuredOn)
    .sort((a,b) => b.measuredOn.localeCompare(a.measuredOn))
  const rows = report.markers.flatMap(marker => {
    const previous = older.flatMap(item => item.markers.map(value => ({ ...value, measuredOn: item.measuredOn })))
      .find(value => labMarkerKey(value.name) === labMarkerKey(marker.name) && value.unit === marker.unit)
    return previous ? [{ marker, previous }] : []
  })
  if (!rows.length) return null
  return <section className={styles.changePanel}>
    <h3>{t.comparison}</h3>
    <div className={styles.changeList}>{rows.map(({marker,previous},i)=><p key={i}>
      <strong>{marker.name}</strong><span>{previous.value} → {marker.value} {marker.unit}</span>
      <small>{previous.measuredOn} → {report.measuredOn}</small>
    </p>)}</div><p className={styles.small}>{t.changeNote}</p>
  </section>
}
export default function LabResults({ accountId, locale = 'en' }) {
  const t = words[locale === 'ru' ? 'ru' : 'en']
  const fileRef = useRef(null)
  const [reports,setReports] = useState([])
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState(false)
  const [selected,setSelected] = useState(null)
  const [rows,setRows] = useState([blank()])
  const [raw,setRaw] = useState('')
  const [labName,setLabName] = useState('')
  const [measuredOn,setMeasuredOn] = useState(localDay)
  const [sourceFormat,setSourceFormat] = useState('manual')
  const [confirmed,setConfirmed] = useState(false)
  const [hint,setHint] = useState('')
  const [error,setError] = useState('')
  const [success,setSuccess] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true)
    appFetch('labs',undefined,undefined,{accountId})
      .then(value => { if (active) { setReports(value.reports || []); setError('') } })
      .catch(() => { if (active) setError(t.failed) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [accountId, t.failed])
  const chosen = useMemo(() => reports.find(report => report.id === selected) || null, [selected,reports])
  const validRows = useMemo(() => rows.map(normalizeLabMarker), [rows])
  const valid = validRows.length > 0 && validRows.every(Boolean)
  // Prevent unverified transcription from driving even an educational preview.
  const current = chosen?.markers || (confirmed ? validRows.filter(Boolean) : [])
  const review = useMemo(() => buildLabReview(current, locale), [current,locale])
  const change = (index,key,value) => { setConfirmed(false); setSuccess(''); setRows(current => current.map((item,i) => i === index ? { ...item,[key]: value } : item)) }
  const reset = () => { setSelected(null);setRows([blank()]);setRaw('');setLabName('');setMeasuredOn(localDay());setHint('');setError('');setSuccess('');setConfirmed(false);setSourceFormat('manual'); if(fileRef.current)fileRef.current.value='' }
  function recognize(text, format = 'txt') {
    const result = parseLabText(text)
    setSourceFormat(format);setSelected(null);setConfirmed(false);setError('');setSuccess('')
    if (result.markers.length) setRows(result.markers)
    setHint(result.markers.length ? t.parsed(result.markers.length) : t.none)
  }
  async function selectFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setSelected(null);setConfirmed(false)
    if (!/\.(?:csv|tsv|txt)$/i.test(file.name)) {
      setHint(t.unsupported);setSourceFormat('manual');return
    }
    if (file.size > 64000) {setHint(t.tooLarge);return}
    try {
      const text = await file.text()
      setRaw(text)
      recognize(text, /\.csv$/i.test(file.name) ? 'csv' : /\.tsv$/i.test(file.name) ? 'tsv' : 'txt')
    } catch {setHint(t.none)}
  }
  async function save() {
    if (busy || !confirmed || !valid || !measuredOn) {setError(t.invalid);return}
    setBusy(true);setError('');setSuccess('')
    try {
      const result = await appFetch('labs', {
        version: LAB_REPORT_VERSION, labName, measuredOn, sourceFormat,
        markers: validRows, confirmed: true,
      },undefined,{accountId})
      setReports(all => [result.report,...all].slice(0,24))
      setSelected(result.report.id);setRaw('');setConfirmed(false);setSuccess(t.saved)
    } catch(e) {setError(e.code === 'LAB_REPORT_LIMIT' ? t.limit : e.code === 'INVALID_LAB_REPORT' ? t.invalid : t.failed)}
    finally {setBusy(false)}
  }
  async function remove() {
    if (!chosen || busy || !window.confirm(t.confirmDelete)) return
    setBusy(true);setError('')
    try {
      await appFetch('labs/'+encodeURIComponent(chosen.id)+'/delete',{},undefined,{accountId})
      setReports(all => all.filter(row => row.id !== chosen.id))
      reset();setSuccess(t.deleted)
    } catch {setError(t.failed)} finally {setBusy(false)}
  }
  return <section className={styles.shell} data-private-laboratory-records>
    <header className={styles.hero}>
      <p className={styles.eyebrow}><LockKeyhole size={15}/>{t.eyebrow}</p>
      <h1>{t.title}</h1><p>{t.intro}</p>
      <p className={styles.privacy}>{t.privacy}</p>
    </header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {success && <p className={styles.success} role="status"><CheckCircle2 size={17}/>{success}</p>}
    <div className={styles.layout}>
      <div className={styles.main}>
        {!chosen ? <section className={styles.panel} aria-labelledby="hh-lab-import">
          <h2 id="hh-lab-import"><UploadCloud size={22}/>{t.uploadTitle}</h2>
          <div className={styles.topGrid}>
            <label>{t.lab}<input type="text" maxLength={80} value={labName} onChange={e=>setLabName(e.target.value)} autoComplete="off"/></label>
            <label>{t.date}<input type="date" value={measuredOn} onChange={e=>{setMeasuredOn(e.target.value);setConfirmed(false)}} max={localDay()}/></label>
          </div>
          <label className={styles.upload}>{t.upload}<input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.pdf,.png,.jpg,.jpeg,application/pdf,image/*" onChange={selectFile}/></label>
          <p className={styles.small}>{t.fileTip}</p>
          <label className={styles.textField}>{t.textLabel}<textarea rows={4} value={raw} placeholder={t.textPlaceholder} onChange={e=>setRaw(e.target.value)} autoComplete="off"/></label>
          <button type="button" className={styles.secondary} onClick={()=>recognize(raw,'txt')} disabled={!raw.trim()}>{t.parse}</button>
          {hint && <p className={styles.hint} role="status">{hint}</p>}
          <h3>{t.table}</h3>
          <div className={styles.tableWrap}><table className={styles.editTable}><thead><tr>
            <th>{t.name}</th><th>{t.value}</th><th>{t.unit}</th><th>{t.low}</th><th>{t.high}</th><th>{t.critical}</th><th></th>
          </tr></thead><tbody>{rows.map((row,i)=><tr key={i}>
            {['name','value','unit','lower','upper'].map(field=><td key={field}><input
              aria-label={t[field === 'lower' ? 'low' : field === 'upper' ? 'high' : field] + ' '+(i+1)}
              value={row[field] ?? ''} onChange={e=>change(i,field,e.target.value)} autoComplete="off"
              className={field==='name' ? styles.nameInput : ''}/></td>)}
            <td><input type="checkbox" aria-label={t.critical+' '+(i+1)} checked={Boolean(row.critical)} onChange={e=>change(i,'critical',e.target.checked)}/></td>
            <td><button type="button" className={styles.iconButton} aria-label={t.remove+' '+(i+1)} onClick={()=>{setConfirmed(false);setRows(all=>all.filter((_,j)=>j!==i))}}><Trash2 size={16}/></button></td>
          </tr>)}</tbody></table></div>
          <button type="button" className={styles.secondary} disabled={rows.length>=LAB_MAX_MARKERS} onClick={()=>{setRows(all=>[...all,blank()]);setConfirmed(false)}}><Plus size={16}/>{t.addRow}</button>
          {!valid && rows.some(row=>row.name||row.value) && <p className={styles.error}>{t.partial}</p>}
          <label className={styles.consent}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>{t.confirmed}</span></label>
          <button type="button" className={styles.primary} disabled={!valid||!confirmed||busy||loading} onClick={save}>{busy?t.saving:t.save}<ArrowRight size={17}/></button>
        </section> : <section className={styles.panel}>
          <div className={styles.savedHeading}><h2><FileText size={21}/>{chosen.labName || t.title}</h2><span>{chosen.measuredOn}</span></div>
          <p className={styles.small}>{t.saved} · {t.source}</p>
          <button type="button" className={styles.secondary} onClick={reset}>{t.new}<Plus size={16}/></button>
          <button type="button" className={styles.delete} disabled={busy} onClick={remove}><Trash2 size={16}/>{t.delete}</button>
        </section>}
        {review.entries.length>0 && <section className={styles.panel} aria-live="polite">
          <div className={styles.summaryTitle}><h2><Activity size={22}/>{t.review}</h2><span>{review.entries.length} {t.indicators}</span></div>
          <div className={styles.statGrid}>
            <span className={styles.stat}><strong>{review.entries.filter(e=>e.status==='low').length}</strong>{t.below}</span>
            <span className={styles.stat}><strong>{review.entries.filter(e=>e.status==='high').length}</strong>{t.above}</span>
            <span className={styles.stat}><strong>{review.uncertain.length}</strong>{t.unknown}</span>
          </div>
          {review.critical.length>0 && <p className={styles.urgent} role="alert">{t.criticalNote}</p>}
          {!review.abnormal.length && <p className={styles.small}>{t.noFlags}</p>}
          <div className={styles.results}>{review.entries.map((entry,i)=><div key={i} className={styles.result}>
            <div><strong>{entry.name}</strong><small>{show(entry.lower)} – {show(entry.upper)} {entry.unit}</small></div>
            <div className={styles.numeric}>{entry.value} {entry.unit}<span className={statusClass(entry.status)}>{labelForStatus(entry.status,t)}</span></div>
          </div>)}</div>
          {review.uncertain.length>0 && <p className={styles.small}>{t.needsRange}</p>}
          <p className={styles.caution}>{t.caution}</p>
        </section>}
        {review.entries.length>0 && <section className={styles.panel}>
          <h2>{t.plan}</h2><p className={styles.small}>{t.planIntro}</p>
          {review.focus.length>0 && <div className={styles.focus}><strong>{t.focus}:</strong><div className={styles.focusList}>{review.focus.map(f=><article key={f.id}><strong>{f.label}</strong><p>{f.question}</p></article>)}</div></div>}
          <ol className={styles.plan}>{review.steps.map(step=><li key={step.day}><span className={styles.day}>{step.day}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div></li>)}</ol>
        </section>}
        {chosen && <PriorChanges report={chosen} reports={reports} t={t}/>}
      </div>
      <aside className={styles.history}>
        <h2>{t.history}</h2>
        {loading && <p role="status">{t.pending}</p>}
        {!loading&&!reports.length && <p className={styles.small}>{t.empty}</p>}
        {reports.map(report=><button key={report.id} type="button" className={selected===report.id?styles.historyActive:styles.historyItem}
          aria-pressed={selected===report.id} onClick={()=>{setSelected(report.id);setError('');setSuccess('')}}>
          <strong>{report.labName || t.title}</strong><small>{report.measuredOn} · {report.markers.length} {t.indicators}</small>
          <span>{t.view} <ArrowRight size={15}/></span>
        </button>)}
      </aside>
    </div>
  </section>
}
