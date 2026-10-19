'use client'
import {useMemo,useState} from 'react'
import {Download,FileUp,ShieldCheck,AlertCircle,CheckCircle2} from 'lucide-react'
import {parseGrowthCsv,growthCsvTemplate} from '@/lib/growth-studio/csv.mjs'
import {GROWTH_BRANDS,GROWTH_CHANNELS,GROWTH_LANGUAGES} from '@/lib/growth-studio/model.mjs'
import {createGrowthStudioBulkAction} from '@/app/admin/growth-studio/actions'
import styles from './growth-studio.module.css'

const labels={
  en:{
    title:'Bulk CSV import',subtitle:'Preview up to 20 public marketing drafts at a time. Import does not schedule or publish anything.',
    file:'Choose CSV file',template:'Download template',defaults:'Defaults for rows with missing values',
    brand:'Brand',channel:'Channel',locale:'Language',preview:'Review rows',import:'Import checked drafts',
    empty:'Choose a UTF-8 CSV with a caption/text column.',too_many_rows:'File contains more than 20 posts. Split it into smaller batches.',
    invalid_csv:'CSV is malformed or the caption/text header is missing.',invalid_post:'Invalid channel, brand, text or URL',
    timezone_required:'An imported date must contain Z or a UTC offset; no timezone is guessed.',
    invalid_date:'Invalid date or time',cancel:'Clear import',success:'Imported drafts safely.',
    reused:'This batch was already imported; no duplicates created.',failure:'Import failed; your selected file is unchanged.',
    storage_unavailable:'Server storage is unavailable. No posts were saved.',conflict:'Batch identifier conflicts with saved posts.',
    unauthorized:'Your admin session expired. Sign in again.',capacity_reached:'Storage reached its capacity.',
    fileTooLarge:'CSV file must be less than 130 KB.',badRows:'Fix all invalid rows before importing.',
    safety:'Only public campaign information is allowed. Do not import client records, private notes or health data.',
    count:'valid rows',invalid:'problematic rows',row:'CSV row',sample:'Example CSV',
    imported:'Opening imported drafts…',
  },
  ru:{
    title:'Массовый импорт CSV',subtitle:'Предпросмотр до 20 публичных черновиков за раз. Импорт не отправляет публикации в соцсети.',
    file:'Выбрать CSV',template:'Скачать шаблон',defaults:'Значения для строк без указанных параметров',
    brand:'Проект',channel:'Соцсеть',locale:'Язык',preview:'Проверить строки',import:'Импортировать черновики',
    empty:'Выберите CSV UTF-8 с колонкой caption или text.',too_many_rows:'В файле более 20 публикаций. Разделите файл на части.',
    invalid_csv:'Ошибочный формат CSV или отсутствует колонка caption/text.',invalid_post:'Недопустимые данные канала, проекта, текста или ссылки',
    timezone_required:'Дата должна содержать Z или часовой пояс UTC±. Нельзя угадывать часовой пояс.',
    invalid_date:'Неправильная дата',cancel:'Очистить',success:'Черновики сохранены.',
    reused:'Этот пакет уже импортирован. Дубликатов нет.',failure:'Импорт не удался, файл не изменён.',
    storage_unavailable:'Серверное хранилище недоступно, изменений нет.',conflict:'Конфликт идентификатора пакета.',
    unauthorized:'Сессия администратора завершилась.',capacity_reached:'Хранилище переполнено.',
    fileTooLarge:'CSV должен быть меньше 130 КБ.',badRows:'Исправьте ошибки перед импортом.',
    safety:'Только публичный маркетинговый контент. Не загружайте личные данные клиентов, заметки и сведения о здоровье.',
    count:'корректных строк',invalid:'ошибочных строк',row:'Строка CSV',sample:'Пример CSV',
    imported:'Открываем импортированные черновики…',
  },
}
const brandNames={holistic_house:'Holistic House',toronto_tantra:'TorontoTantra',psitrends:'PsiTrends'}
const channels=GROWTH_CHANNELS
export default function GrowthStudioBulkImporter({locale='en',disabled=false,onImported}) {
  const t=labels[locale==='ru'?'ru':'en']
  const [source,setSource]=useState('')
  const [defaults,setDefaults]=useState({brand:'holistic_house',channel:'instagram',locale:'en'})
  const [error,setError]=useState('')
  const [name,setName]=useState('')
  const [batch,setBatch]=useState('')
  const [busy,setBusy]=useState(false)
  const {parsed,error:parseError}=useMemo(()=>{
    if(!source)return {parsed:null,error:''}
    try{return {parsed:parseGrowthCsv(source,defaults),error:''}}
    catch(e){return {parsed:null,error:e.message||'invalid_csv'}}
  },[source,defaults])
  function downloadTemplate() {
    const link=document.createElement('a')
    const url=URL.createObjectURL(new Blob(['\uFEFF'+growthCsvTemplate],{type:'text/csv;charset=utf-8'}))
    link.href=url;link.download='hh-growth-studio-template.csv'
    document.body.appendChild(link);link.click();link.remove()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  function clear(){
    setSource('');setBatch('');setError('');setName('')
  }
  async function readFile(file) {
    clear()
    if(!file)return
    if(file.size>130000){setError('fileTooLarge');return}
    try{
      const raw=await file.text()
      setName(file.name);setSource(raw);setBatch(crypto.randomUUID())
    } catch {setError('invalid_csv')}
  }
  async function submit(){
    if(!parsed||!parsed.items.length||parsed.errors.length||busy||disabled||!batch)return
    setBusy(true);setError('')
    try{
      const result=await createGrowthStudioBulkAction({batchId:batch,entries:parsed.items})
      if(!result.ok){setError(result.error||'failure');return}
      setError(result.reused?'reused':'success')
      if(typeof onImported==='function')onImported(result.records)
    } catch {setError('failure')}
    finally{setBusy(false)}
  }
  return <section className={styles.editor} aria-label={t.title}>
    <div className={styles.sectionHead}><h3><FileUp size={18} aria-hidden="true"/> {t.title}</h3><button type="button" onClick={downloadTemplate}><Download size={15}/>{t.template}</button></div>
    <p className={styles.hint}>{t.subtitle}</p>
    <p className={styles.privacyNote}><ShieldCheck size={15}/>{t.safety}</p>
    <div className={styles.pair}>
      <label>{t.brand}<select value={defaults.brand} onChange={e=>setDefaults(v=>({...v,brand:e.target.value}))} disabled={busy||disabled}>
        {Object.keys(GROWTH_BRANDS).map(key=><option key={key} value={key}>{brandNames[key]}</option>)}</select></label>
      <label>{t.channel}<select value={defaults.channel} onChange={e=>setDefaults(v=>({...v,channel:e.target.value}))} disabled={busy||disabled}>
        {channels.map(key=><option key={key} value={key}>{key}</option>)}</select></label>
      <label>{t.locale}<select value={defaults.locale} onChange={e=>setDefaults(v=>({...v,locale:e.target.value}))} disabled={busy||disabled}>
        {GROWTH_LANGUAGES.map(key=><option key={key} value={key}>{key.toUpperCase()}</option>)}</select></label>
    </div>
    <label>{t.file}<input accept=".csv,text/csv,text/plain" type="file" disabled={busy||disabled}
      onChange={e=>readFile(e.target.files?.[0])}/></label>
    {name&&<p className={styles.hint}>{name}</p>}
    {parsed&&<>
      <div className={styles.importSummary}>
        <strong>{parsed.items.length} {t.count}</strong><span>{parsed.errors.length} {t.invalid}</span>
      </div>
      {parsed.errors.length>0&&<div role="alert" className={styles.importErrors}>
        {parsed.errors.slice(0,20).map((item,i)=><p key={i}><AlertCircle size={15}/>{t.row} {item.row}: {t[item.reason]||t.invalid_post}</p>)}
        <p>{t.badRows}</p>
      </div>}
      <h4 className={styles.importTitle}>{t.preview}</h4>
      <div className={styles.importPreview}>
        {parsed.items.map((item,i)=><div key={i}>
          <strong>{i+1}. {item.title}</strong><small>{item.channel} · {item.locale.toUpperCase()} · {brandNames[item.brand]}</small>
          <p>{item.caption.slice(0,260)}{item.caption.length>260?'…':''}</p>
        </div>)}
      </div>
    </>}
    {(!parsed&&source)&&<p role="alert" className={styles.warning}><AlertCircle size={16}/>{t[parseError]||t.invalid_csv}</p>}
    {!source&&<p className={styles.hint}>{t.empty}</p>}
    {error&&<p role="status" className={styles.notice}>{error==='success'||error==='reused'?<CheckCircle2 size={16}/>:<AlertCircle size={16}/>}{t[error]||t.failure}</p>}
    <div className={styles.editorActions}>
      <button type="button" className={styles.primary} disabled={busy||disabled||!parsed||!parsed.items.length||parsed.errors.length>0}
        onClick={submit}><CheckCircle2 size={15}/>{t.import}</button>
      <button type="button" disabled={busy} onClick={clear}>{t.cancel}</button>
    </div>
  </section>
}
