'use client'
import {useRef,useState} from 'react'
import {CalendarDays,CopyPlus,ShieldCheck,X} from 'lucide-react'
import {createGrowthEvergreenDraftsAction} from '@/app/admin/growth-studio/actions'
import styles from './growth-studio.module.css'

const COPY={
  en:{
    title:'Prepare repeat drafts',explain:'Reuse the reviewed public post as up to 10 separate drafts. You must review and approve each new post. Nothing will be published automatically.',
    interval:'How often',weekly:'Weekly',biweekly:'Every two weeks',monthly:'Monthly',
    count:'Number of new drafts',start:'First planned time',note:'The first time uses your device timezone. Repeats retain the Toronto wall-clock hour through daylight saving transitions.',
    generate:'Create review drafts',close:'Close',confirm:'Create these separate draft copies? No social post will be queued or published.',
    success:'Review drafts created. Each requires new approval.',reused:'Batch already exists; no duplicate drafts created.',
    invalid_recurrence:'Use a future time at least one hour from now. Avoid repeated/omitted DST times and dates beyond one year.',
    invalid_source:'Original post was changed or is no longer approved. Refresh the page.',
    conflict:'A newer revision or an existing batch conflicts. Refresh before retrying.',
    storage_unavailable:'Persistent storage unavailable — no drafts saved.',
    capacity_reached:'Draft storage limit reached.',not_found:'Original post is unavailable.',
    unauthorized:'Owner session expired. Sign in again.',error:'Could not create drafts; nothing was published.',
  },
  ru:{
    title:'Подготовить повторы',explain:'Создать до 10 отдельных черновиков из проверенного публичного поста. Каждый повтор нужно заново просмотреть и одобрить. Автопубликации нет.',
    interval:'Периодичность',weekly:'Раз в неделю',biweekly:'Раз в две недели',monthly:'Раз в месяц',
    count:'Количество черновиков',start:'Дата и время первого повтора',note:'Первое время — в часовом поясе устройства. При повторении сохраняется местный час Торонто с учётом перехода на зимнее время.',
    generate:'Создать черновики',close:'Закрыть',confirm:'Создать отдельные черновики повторов? В соцсети ничего не будет отправлено или поставлено в очередь.',
    success:'Черновики созданы. Каждый требует отдельного согласования.',reused:'Пакет уже есть, новые дубликаты не созданы.',
    invalid_recurrence:'Выберите время более чем через час. Не используйте неоднозначные часы перехода на зимнее время и даты далее одного года.',
    invalid_source:'Исходный пост изменён или больше не одобрен. Обновите список.',
    conflict:'Обнаружена новая версия или повтор пакета. Обновите список.',
    storage_unavailable:'Хранилище недоступно. Ничего не сохранено.',
    capacity_reached:'Достигнут лимит хранилища.',not_found:'Исходный пост недоступен.',
    unauthorized:'Сессия владельца завершилась. Войдите снова.',error:'Не удалось создать черновики. Публикаций не было.',
  },
}
function inputLocal(iso) {
  if(!iso)return ''
  const date=new Date(iso)
  if(!Number.isFinite(date.getTime()))return ''
  const local=new Date(date.getTime()-date.getTimezoneOffset()*60000)
  return local.toISOString().slice(0,16)
}
export default function GrowthStudioEvergreen({source,locale='en',disabled=false,onCreated=()=>{},onClose=()=>{}}){
  const t=COPY[locale==='ru'?'ru':'en']
  const [cadence,setCadence]=useState('weekly')
  const [count,setCount]=useState(3)
  const [start,setStart]=useState(()=>inputLocal(source.scheduledAt))
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const pendingBatch=useRef(null)
  const change=(callback,value)=>{pendingBatch.current=null;setNotice('');callback(value)}
  async function makeDrafts(){
    if(disabled||busy||!start)return
    let startAt
    try{startAt=new Date(start).toISOString()}catch{setNotice(t.invalid_recurrence);return}
    if(!window.confirm([
      t.confirm,
      source.title,
      source.brand+' · '+source.channel,
      count+' · '+t[cadence],
      startAt,
    ].join('\n\n')))return
    setBusy(true);setNotice('')
    try{
      pendingBatch.current ??= crypto.randomUUID()
      const result=await createGrowthEvergreenDraftsAction({
        sourceId:source.id,expectedRevision:source.revision,
        batchId:pendingBatch.current,cadence,count,startAt,
      })
      if(!result.ok){setNotice(t[result.error]||t.error);return}
      pendingBatch.current=null
      onCreated(result.records,result.reused===true)
    }catch{setNotice(t.error)}
    finally{setBusy(false)}
  }
  return <section className={styles.evergreenPanel} aria-label={t.title}>
    <div className={styles.evergreenHead}>
      <h3><CopyPlus size={18} aria-hidden="true"/>{t.title}</h3>
      <button type="button" onClick={onClose} disabled={busy}><X size={16}/>{t.close}</button>
    </div>
    <strong className={styles.evergreenSource}>{source.title}</strong>
    <p className={styles.hint}><ShieldCheck size={14} aria-hidden="true"/>{t.explain}</p>
    <div className={styles.pair}>
      <label>{t.interval}<select value={cadence} onChange={e=>change(setCadence,e.target.value)} disabled={disabled||busy}>
        {['weekly','biweekly','monthly'].map(x=><option key={x} value={x}>{t[x]}</option>)}</select></label>
      <label>{t.count}<select value={count} onChange={e=>change(setCount,Number(e.target.value))} disabled={disabled||busy}>
        {Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
      <label>{t.start}<input type="datetime-local" value={start}
        onChange={e=>change(setStart,e.target.value)} disabled={disabled||busy}/></label>
    </div>
    <p className={styles.hint}>{t.note}</p>
    {notice&&<p role="status" className={styles.warning}>{notice}</p>}
    <button className={styles.evergreenSubmit} type="button" onClick={makeDrafts}
      disabled={disabled||busy||!start}><CalendarDays size={16}/>{t.generate}</button>
  </section>
}
