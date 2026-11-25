'use client'
import {useRef,useState} from 'react'
import {Download,Files,UploadCloud,Layers,AlertCircle} from 'lucide-react'
import {createGrowthStudioBulkAction} from '@/app/admin/growth-studio/actions'
import {parseGrowthCsv} from '@/lib/growth-studio/csv.mjs'
import {GROWTH_BRANDS,GROWTH_CHANNELS,GROWTH_LANGUAGES} from '@/lib/growth-studio/model.mjs'
import styles from './growth-studio.module.css'

const NAMES={
 instagram:'Instagram',facebook:'Facebook',telegram:'Telegram',youtube:'YouTube',
 linkedin:'LinkedIn',threads:'Threads',bluesky:'Bluesky',pinterest:'Pinterest',
 tiktok:'TikTok',eventbrite:'Eventbrite',meetup:'Meetup',manual:'Other / Manual',
 twitter:'X / Twitter',google_business:'Google Business',mastodon:'Mastodon',wordpress:'WordPress',
}
const COPY={
 en:{
  title:'Bulk creator & import',description:'Make a separate editable draft per language and social network. No posts are sent.',
  brand:'Brand',channels:'Where to prepare',languages:'Content in each language',
  headline:'Campaign / post title',landing:'Public landing URL',campaign:'Campaign ID',
  media:'Public image/video URL',mediaAlt:'Photo description',when:'Suggested date (optional)',
  missing:'Please add text for at least one language and choose at least one channel.',
  limit:'Maximum 20 variants in one batch. Choose fewer languages/networks.',
  create:'Create drafts',import:'Import CSV (up to 500 drafts)',exportTemplate:'CSV template',
  notice:'Each variant will remain a draft until you review it. This tool does not translate or publish.',
  text:'Text for',copy:'No automatic translation. Add correct text for each selected language.',
  created:'drafts created.',replayed:'Batch already saved, no duplicates created.',
  failed:'Import stopped safely. Already completed batches remain saved.',retry:'Retry same batch',
  rows:'rows',preview:'Import preview',nothing:'No file loaded yet.',file:'Choose CSV file',
  bad:'CSV data could not be imported. Check brand, channel, public URLs, field lengths and dates.',
  unsafe:'Import only your own public promotional copy, never private client notes or test results.',
  types:'Recognized columns: brand, channel, locale, title, caption, sourceUrl, campaign, scheduledAt, mediaUrl, mediaAlt.',
  progress:'Saved',date:'CSV dates require ISO timestamps with Z or an explicit UTC offset; invalid dates block the import instead of being silently changed.',
  read:'Could not read the file.',size:'CSV must be 512 KB or smaller and contain no more than 500 rows.',
 },
 ru:{
  title:'Массовая подготовка и импорт',description:'Создавайте отдельные редактируемые черновики для каждого языка и канала — без публикации.',
  brand:'Проект',channels:'Каналы',languages:'Тексты на нужных языках',
  headline:'Название поста / кампании',landing:'Публичная ссылка',campaign:'Код кампании',
  media:'Публичная ссылка на медиа',mediaAlt:'Описание изображения',when:'Планируемая дата (необязательно)',
  missing:'Выберите канал и укажите текст хотя бы на одном языке.',
  limit:'До 20 вариантов за раз. Уменьшите количество каналов или языков.',
  create:'Создать черновики',import:'Импорт CSV (до 500 черновиков)',exportTemplate:'Шаблон CSV',
  notice:'Каждый вариант останется черновиком до проверки. Перевод и публикация не выполняются автоматически.',
  text:'Текст на языке',copy:'Автоматического перевода нет. Введите корректный текст каждого выбранного языка.',
  created:'черновиков создано.',replayed:'Пакет уже сохранён, повторов нет.',
  failed:'Импорт безопасно остановлен. Сохранённые ранее пакеты остаются в базе.',retry:'Повторить тот же пакет',
  rows:'строк',preview:'Предпросмотр импорта',nothing:'Файл ещё не выбран.',file:'Выбрать CSV',
  bad:'Не удалось импортировать CSV. Проверьте проект, площадку, ссылки, размер текста и даты.',
  unsafe:'Импортируйте только публичные материалы, не добавляйте записи клиентов или результаты тестов.',
  types:'Колонки: brand, channel, locale, title, caption, sourceUrl, campaign, scheduledAt, mediaUrl, mediaAlt.',
  progress:'Сохранено',date:'В CSV даты — ISO с Z или часовым поясом UTC±. Если дата некорректна, импорт остановится без изменений.',
  read:'Не удалось прочитать файл.',size:'CSV не более 512 КБ, до 500 строк.',
 }
}
const CSV_COLUMNS=['brand','channel','locale','title','caption','sourceUrl','campaign','scheduledAt','mediaUrl','mediaAlt']
function downloadTemplate(){
  const data=CSV_COLUMNS.join(',')+'\r\n'+
   ['holistic_house','telegram','en','Sample invitation','Read our free course','/en/academy','academy_intro','','',''].map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')+'\r\n'
  const url=URL.createObjectURL(new Blob(['\ufeff',data],{type:'text/csv;charset=utf-8'}))
  const link=document.createElement('a');link.href=url;link.download='hh-growth-studio-import-template.csv'
  document.body.appendChild(link);link.click();link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}
const uuid=()=>crypto.randomUUID()

export default function GrowthStudioBulk({locale='en',base={},ready=false,onCreated=()=>{}}){
 const t=COPY[locale]||COPY.en
 const [selected,setSelected]=useState(['instagram','facebook','telegram'])
 const [brand,setBrand]=useState(GROWTH_BRANDS[base.brand]?base.brand:'holistic_house')
 const [title,setTitle]=useState(base.title||'')
 const [copies,setCopies]=useState(()=>({...Object.fromEntries(GROWTH_LANGUAGES.map(l=>[l,''])),[base.locale||'en']:base.caption||''}))
 const [sourceUrl,setSourceUrl]=useState(base.sourceUrl||'')
 const [campaign,setCampaign]=useState(base.campaign||'')
 const [mediaUrl,setMediaUrl]=useState(base.mediaUrl||'')
 const [mediaAlt,setMediaAlt]=useState(base.mediaAlt||'')
 const [scheduledAt,setScheduledAt]=useState('')
 const [csvRows,setCsvRows]=useState([])
 const [busy,setBusy]=useState(false)
 const [progress,setProgress]=useState(0)
 const [notice,setNotice]=useState('')
 const pending=useRef(null)
 const activeLangs=GROWTH_LANGUAGES.filter(l=>copies[l]?.trim())
 const variants=activeLangs.length*selected.length
 function update(){
   if(pending.current){setNotice(locale==='ru'?'Сначала завершите или отмените прошлый импорт.':'Finish or discard the pending import first.');return false}
   return true
 }
 async function runBatches(){
   const job=pending.current
   if(!job||busy||!ready)return
   setBusy(true);setNotice('')
   try{
    while(job.index<job.batches.length){
      const result=await createGrowthStudioBulkAction(job.batches[job.index])
      if(!result.ok)throw new Error(result.error||'invalid_post')
      onCreated(result.records)
      setProgress(count=>count+result.records.length)
      job.index+=1
    }
    pending.current=null
    setCsvRows([])
    setNotice((locale==='ru'?'Сохранено: ':'Saved: ')+job.batches.reduce((sum,x)=>sum+x.entries.length,0)+' '+t.created)
   }catch(e){setNotice(t.failed+' '+(e.message||t.bad))}
   finally{setBusy(false)}
 }
 function discard(){
   if(busy)return
   pending.current=null;setCsvRows([]);setProgress(0);setNotice('')
 }
 async function create(){
   if(!ready||busy)return
   if(pending.current){if(pending.current.kind==='variants')await runBatches();return}
   if(!variants){setNotice(t.missing);return}
   if(variants>20){setNotice(t.limit);return}
   const entries=selected.flatMap(channel=>activeLangs.map(language=>({
    brand,channel,locale:language,title:title.trim()||copies[language].slice(0,80),
    caption:copies[language],sourceUrl,campaign,mediaUrl,mediaAlt,
    scheduledAt:scheduledAt?new Date(scheduledAt).toISOString():'',
   })))
   pending.current={kind:'variants',index:0,batches:[{batchId:uuid(),entries}]}
   setProgress(0);await runBatches()
 }
 async function importCsv(file){
   if(!file||busy)return
   if(pending.current){setNotice(locale==='ru'?'Отмените предыдущий импорт.':'Discard the previous import first.');return}
   if(file.size>524288){setNotice(t.size);return}
   try{
    const parsed=parseGrowthCsv(await file.text(),{brand,channel:'manual',locale:'en'})
    if(parsed.errors.length)throw new Error('invalid_csv_rows')
    const entries=parsed.items
    pending.current={kind:'csv',index:0,
      batches:Array.from({length:Math.ceil(entries.length/20)},(_,i)=>({batchId:uuid(),entries:entries.slice(i*20,(i+1)*20)}))}
    setCsvRows(entries);setProgress(0);setNotice('')
   }catch(e){setNotice(e.message==='size'?t.size:t.bad);setCsvRows([]);pending.current=null}
 }
 return <section className={styles.bulkSection}>
   <div className={styles.bulkIntro}><Layers size={23}/><div><h3>{t.title}</h3><p>{t.description}</p></div></div>
   <p className={styles.privacyNote}><AlertCircle size={16}/>{t.unsafe}</p>
   <div className={styles.columns}>
    <div className={styles.editor}>
     <div className={styles.pair}>
      <label>{t.brand}<select disabled={!ready||busy} value={brand} onChange={e=>{if(update())setBrand(e.target.value)}}>
        {Object.entries(GROWTH_BRANDS).map(([key])=><option key={key} value={key}>{key.replaceAll('_',' ')}</option>)}</select></label>
      <label>{t.headline}<input disabled={!ready||busy} maxLength={120} value={title} onChange={e=>{if(update())setTitle(e.target.value)}}/></label>
     </div>
     <div className={styles.bulkChecks}><strong>{t.channels}</strong><div>
       {GROWTH_CHANNELS.map(channel=><label key={channel}><input disabled={!ready||busy}
         type="checkbox" checked={selected.includes(channel)}
         onChange={e=>{if(!update())return;setSelected(old=>e.target.checked?[...old,channel]:old.filter(x=>x!==channel))}}/>
        {NAMES[channel]}</label>)}
     </div></div>
     <strong>{t.languages}</strong>
     <p className={styles.hint}>{t.copy}</p>
     {GROWTH_LANGUAGES.map(language=><label key={language}>{t.text} {language.toUpperCase()}
       <textarea rows={3} maxLength={3500} disabled={!ready||busy}
         value={copies[language]||''} onChange={e=>{if(update())setCopies(old=>({...old,[language]:e.target.value}))}}/></label>)}
     <div className={styles.pair}>
       <label>{t.landing}<input disabled={!ready||busy} maxLength={500} value={sourceUrl} onChange={e=>{if(update())setSourceUrl(e.target.value)}} placeholder="/en/academy"/></label>
       <label>{t.campaign}<input disabled={!ready||busy} maxLength={64} value={campaign} onChange={e=>{if(update())setCampaign(e.target.value)}} placeholder="intro_202610"/></label>
       <label>{t.media}<input disabled={!ready||busy} maxLength={500} value={mediaUrl} onChange={e=>{if(update())setMediaUrl(e.target.value)}} placeholder="/images/public-photo.webp"/></label>
       <label>{t.mediaAlt}<input disabled={!ready||busy} maxLength={240} value={mediaAlt} onChange={e=>{if(update())setMediaAlt(e.target.value)}}/></label>
     </div>
     <label>{t.when}<input disabled={!ready||busy} type="datetime-local" value={scheduledAt}
       onChange={e=>{if(update())setScheduledAt(e.target.value)}}/></label>
     <p className={styles.hint}>{t.date}</p>
     <p className={styles.variantCount}>{variants} {t.rows} · {t.notice}</p>
     <button type="button" className={styles.primary}
       disabled={!ready||busy||variants<1||variants>20||pending.current?.kind==='csv'}
       onClick={create}><Files size={16}/>{pending.current?.kind==='variants'?t.retry:t.create}</button>
     {pending.current&&<button type="button" disabled={busy} onClick={discard}>{locale==='ru'?'Отменить несохранённое':'Discard pending'}</button>}
    </div>
    <div className={styles.help}>
     <h3>{t.import}</h3><p>{t.types}</p>
     <button type="button" onClick={downloadTemplate}><Download size={16}/>{t.exportTemplate}</button>
     <label className={styles.filePicker}>{t.file}<input type="file" accept=".csv,text/csv" disabled={!ready||busy} onChange={e=>importCsv(e.target.files?.[0])}/></label>
     <p className={styles.hint}>{csvRows.length?csvRows.length+' '+t.rows:t.nothing}</p>
     {csvRows.length>0&&<div className={styles.importPreview}>
       <strong>{t.preview}</strong>
       {csvRows.slice(0,5).map((row,i)=><p key={i}>{row.channel} · {row.locale} · {row.title.slice(0,80)}</p>)}
       {csvRows.length>5&&<p>+{csvRows.length-5}</p>}
       <button disabled={!ready||busy||pending.current?.kind!=='csv'} onClick={runBatches} type="button">
         <UploadCloud size={16}/>{pending.current?.batches?.length>1?t.import:t.create}
       </button>
     </div>}
     {!!progress&&<p>{t.progress}: {progress}</p>}
     {notice&&<p role="status" className={styles.notice}>{notice}</p>}
    </div>
   </div>
 </section>
}
