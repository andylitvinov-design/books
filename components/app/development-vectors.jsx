'use client'
import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {Sparkles} from 'lucide-react'
import {SiteNavigation} from '@/components/site-navigation'
import {appFetch,getCabinetBootstrap} from '@/lib/app/client-fetch'
import {INNER_VECTOR_ITEMS,OUTER_VECTOR_ITEMS,emptyDevelopmentVectors,
 normalizeDevelopmentVectors,toVectorDraft,fromVectorDraft,ratingsFromCoachProtocol,coachVectorSummary
} from '@/lib/profile/development-vectors.mjs'
import styles from './development-vectors.module.css'
import DevelopmentVectorWheel from './development-vector-wheel'
import {vectorGuidedProgress,firstIncompleteVector,nextIncompleteVector} from '@/lib/profile/development-guided-path.mjs'
import {promptForDevelopmentVector} from '@/lib/profile/development-vector-prompts.mjs'
const C={
 en:{title:'Two vectors of development',inner:'Inner · meaning axes',outer:'Outer · life goals',
 lead:'Inner qualities and outer results are different dimensions of your growth.',
 self:'Fill in myself',guided:'Guided questions',guide:'One question at a time. You choose each value.',
 now:'Now',want:'Desired',gap:'Gap',focus:'My focus',choose:'Choose focus',
 save:'Save in my private profile',saving:'Saving…',saved:'Saved privately.',
 loading:'Loading your private profile…',login:'Sign in to save your personal profile.',
 account:'My account',error:'Could not open the profile.',retry:'Retry',
 incomplete:'Each started area needs two ratings (0–10); you can skip any other area.',
 conflict:'The profile changed elsewhere. Reload before saving to avoid losing information.',
 saveFailed:'Could not save. Changes remain only on this screen.',step:'Step',back:'Back',next:'Next',
 empty:'Not yet rated',sourceCoach:'From coaching session',sourceSelf:'Self-rated',
 import:'Import ratings from a saved coaching session',importNone:'No saved coaching protocol with meaning-axis ratings.',
 imported:'Coaching scores are ready for your review. Press Save to keep them in your profile.',
 importFailed:'Unable to read your private coaching archive.',
 share:'Prepare ratings for my coach',shareHint:'Review, copy and send these words to the coach yourself. No automatic AI transfer.',
 copy:'Copy',copied:'Copied',coaching:'Talk with an AI coach',plan:'My Life Plan',
 privacy:'These voluntary 0–10 ratings are not psychometric test scores or proof of goal achievement.',
 linked:'Saved goal',help:'Choose 0–10 as it feels to you; leave empty if you prefer.',
 protocol:'You can save a voice-session protocol separately, with consent, then import its inner scores here.',rated:'rated',guidedComplete:'All eight areas have been rated.',guidedReview:'Review or update a score in self-fill mode.',guidedFinished:'The remaining unanswered areas can be revisited later.',nextMissing:'Next missing area',skipHint:'You can leave this area blank and return later. Missing values are never saved as zero.'},
 ru:{title:'Два вектора развития',inner:'Внутренний · смысловые оси',outer:'Внешний · жизненные цели',
 lead:'Внутренние качества и внешние результаты — разные направления развития.',
 self:'Заполнить самостоятельно',guided:'С вопросами коуча',guide:'По одному вопросу. Цифры выбираете только вы.',
 now:'Сейчас',want:'Хочу',gap:'Разница',focus:'В фокусе',choose:'Выбрать фокус',
 save:'Сохранить в личном профиле',saving:'Сохраняем…',saved:'Оценки сохранены приватно.',
 loading:'Открываем личный профиль…',login:'Войдите, чтобы сохранить личный профиль.',
 account:'Мой кабинет',error:'Не удалось открыть профиль.',retry:'Повторить',
 incomplete:'Для заполненной темы нужны две оценки от 0 до 10. Остальные можно пропустить.',
 conflict:'Профиль изменился в другом окне. Перезагрузите страницу, чтобы не потерять новые данные.',
 saveFailed:'Не удалось сохранить. Изменения пока только на экране.',step:'Шаг',back:'Назад',next:'Дальше',
 empty:'Пока не оценено',sourceCoach:'Из коуч-сессии',sourceSelf:'Самооценка',
 import:'Импортировать цифры из сохранённой коуч-сессии',importNone:'В архиве нет сохранённой сессии с оценками смысловых осей.',
 imported:'Оценки коуч-сессии загружены для проверки. Нажмите «Сохранить».',
 importFailed:'Не удалось прочитать личный архив коуч-сессий.',
 share:'Подготовить данные для коуча',shareHint:'Проверьте и скопируйте текст, затем сами отправьте его коучу. Автоматической передачи ИИ нет.',
 copy:'Копировать',copied:'Скопировано',coaching:'Обсудить с AI-коучем',plan:'Мой план целей',
 privacy:'Оценки 0–10 — личные наблюдения, не результаты тестов и не процент достижения цели.',
 linked:'Сохранённая цель',help:'Оцените от 0 до 10 по своим ощущениям. Можно оставить пустым.',
 protocol:'После голосовой сессии можно отдельно сохранить протокол по согласию и импортировать отсюда оценки осей.',rated:'заполнено',guidedComplete:'Все восемь направлений оценены.',guidedReview:'При необходимости измените оценки в самостоятельном режиме.',guidedFinished:'Незаполненные пункты можно дополнить позже.',nextMissing:'Следующий незаполненный',skipHint:'Пункт можно пропустить и вернуться позже. Пустые значения не считаются нулём.'},
 es:{title:'Dos vectores de desarrollo',inner:'Interior · ejes de sentido',outer:'Exterior · metas de vida',
 lead:'Las cualidades internas y los resultados externos son dimensiones distintas.',
 self:'Completar por mi cuenta',guided:'Preguntas guiadas',guide:'Una pregunta a la vez. Solo tú eliges las puntuaciones.',
 now:'Ahora',want:'Deseado',gap:'Diferencia',focus:'Mi enfoque',choose:'Elegir enfoque',
 save:'Guardar en mi perfil privado',saving:'Guardando…',saved:'Guardado en privado.',
 loading:'Cargando perfil privado…',login:'Inicia sesión para guardar tu perfil.',
 account:'Mi cuenta',error:'No se pudo abrir el perfil.',retry:'Reintentar',
 incomplete:'Cada tema iniciado necesita dos valores de 0 a 10; puedes omitir otros.',
 conflict:'El perfil cambió en otra ventana. Recarga antes de guardar.',
 saveFailed:'No se pudo guardar. Los cambios están solo aquí.',step:'Paso',back:'Anterior',next:'Siguiente',
 empty:'Sin evaluar',sourceCoach:'Sesión guardada',sourceSelf:'Autoevaluación',
 import:'Importar valores de una sesión guardada',importNone:'No hay un protocolo guardado con valores de los ejes.',
 imported:'Valores importados para revisión. Pulsa Guardar.',
 importFailed:'No se pudo leer el archivo privado.',share:'Preparar valores para mi coach',
 shareHint:'Revisa, copia y envía el texto al coach. No hay envío automático a IA.',
 copy:'Copiar',copied:'Copiado',coaching:'Hablar con un coach IA',plan:'Mis metas',
 privacy:'Valoraciones personales 0–10, no resultados de tests ni progreso demostrado.',
 linked:'Meta guardada',help:'Elige de 0 a 10 como lo sientes. Puedes dejarlo vacío.',
 protocol:'Puedes guardar un protocolo de voz con consentimiento e importar aquí los valores.',rated:'evaluados',guidedComplete:'Has evaluado los ocho ámbitos.',guidedReview:'Puedes revisar o actualizar tus valores en el modo individual.',guidedFinished:'Puedes completar las áreas pendientes más tarde.',nextMissing:'Siguiente área pendiente',skipHint:'Puedes omitir este ámbito y regresar más tarde. Un valor vacío no es cero.'}
}
const options=Array.from({length:11},(_,n)=>String(n))
export default function DevelopmentVectors({locale='en'}){
 const lang=C[locale]?locale:'en',t=C[lang]
 const [state,setState]=useState('loading'),[accountId,setAccountId]=useState('')
 const [goals,setGoals]=useState(null),[revision,setRevision]=useState(0)
 const [vectors,setVectors]=useState(emptyDevelopmentVectors)
 const [draft,setDraft]=useState(()=>toVectorDraft(emptyDevelopmentVectors()))
 const [touched,setTouched]=useState({})
 const [track,setTrack]=useState('inner'),[guided,setGuided]=useState(false),[index,setIndex]=useState(0)
 const [lifeAreas,setLifeAreas]=useState([]),[dirty,setDirty]=useState(false)
 const [busy,setBusy]=useState(false),[importing,setImporting]=useState(false)
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[share,setShare]=useState('')
 const load=useCallback(async()=>{
  setState('loading');setError('')
  try{
   const auth=await getCabinetBootstrap('portrait',{refresh:true})
   const account=auth?.account?.id
   if(!account){setState('guest');return}
   const [saved,life]=await Promise.all([
    appFetch('development-goals',undefined,'GET',{accountId:account}),
    appFetch('coaching-life-plan?locale='+lang,undefined,'GET',{accountId:account}).catch(()=>null)])
   if(!saved?.goals||!Number.isInteger(saved.revision))throw Error('INVALID_RESPONSE')
   const x=normalizeDevelopmentVectors(saved.goals.vectors)||emptyDevelopmentVectors()
   setAccountId(account);setGoals(saved.goals);setRevision(saved.revision)
   setVectors(x);setDraft(toVectorDraft(x));setTouched({});setDirty(false)
   setLifeAreas(Array.isArray(life?.domains)?life.domains:[])
   setShare('');setNotice('');setState('ready')
  }catch(e){setState(e?.status===401?'guest':'error')}
 },[lang])
 useEffect(()=>{void load()},[load])
 const items=track==='inner'?INNER_VECTOR_ITEMS:OUTER_VECTOR_ITEMS
 const guidedProgress=vectorGuidedProgress(items,draft[track].ratings)
 const guidedComplete=guidedProgress.total===8&&guidedProgress.complete===8
 const resumeGuided=()=>{
  const first=firstIncompleteVector(items,draft[track].ratings)
  setIndex(first??0);setGuided(true);setNotice('');setError('')
 }
 const nextGuided=()=>{
  const next=nextIncompleteVector(items,draft[track].ratings,index)
  if(next===null){setGuided(false);setNotice(t.guidedFinished)}
  else setIndex(next)
 }
 const update=(id,field,val)=>{
  setDraft(old=>({...old,[track]:{...old[track],ratings:{...old[track].ratings,
    [id]:{...(old[track].ratings[id]||{current:'',desired:''}),[field]:val,source:'self'}}}}))
  setTouched(old=>({...old,[track+':'+id]:true}))
  setDirty(true);setShare('');setNotice('')
 }
 const focus=id=>{
  setDraft(old=>({...old,[track]:{...old[track],focusId:old[track].focusId===id?null:id}}))
  setDirty(true);setShare('');setNotice('')
 }
 const save=async()=>{
  if(!dirty||busy||!goals)return
  const next=fromVectorDraft(draft,{touched})
  if(!next){setError(t.incomplete);return}
  setError('');setBusy(true)
  try{
   const response=await appFetch('development-goals',{...goals,vectors:next,revision},'POST',{accountId})
   const x=normalizeDevelopmentVectors(response?.goals?.vectors)
   if(!x)throw Error('BAD_RESPONSE')
   setGoals(response.goals);setRevision(response.revision);setVectors(x)
   setDraft(toVectorDraft(x));setDirty(false);setTouched({});setNotice(t.saved)
   window.dispatchEvent(new Event('hh:development-vectors-saved'))
  }catch(e){setError(e?.code==='DEVELOPMENT_GOALS_CONFLICT'?t.conflict:t.saveFailed)}
  finally{setBusy(false)}
 }
 const importScores=async()=>{
  if(importing)return
  setImporting(true);setError('');setNotice('')
  try{
   const res=await fetch('/api/app/my-coach/protocol',{credentials:'same-origin',cache:'no-store',
     headers:{'x-hh-account-id':accountId}})
   if(!res.ok)throw Error('ARCHIVE')
   const body=await res.json()
   const rows=(body?.protocols||[]).map(ratingsFromCoachProtocol).find(Boolean)
   if(!rows){setError(t.importNone);return}
   setDraft(old=>({...old,inner:{...old.inner,ratings:{...old.inner.ratings,...rows}}}))
   setTouched(old=>{
    const next={...old};Object.keys(rows).forEach(id=>{delete next['inner:'+id]});return next
   })
   setTrack('inner');setGuided(false);setDirty(true);setShare('');setNotice(t.imported)
  }catch{setError(t.importFailed)}
  finally{setImporting(false)}
 }
 const prepare=()=>{
  if(dirty){setError(lang==='ru'?'Сначала сохраните текущие оценки.':'Save your ratings first.');return}
  setShare(coachVectorSummary(vectors,lang,track));setError('')
 }
 const copy=async()=>{try{await navigator.clipboard.writeText(share);setNotice(t.copied)}
  catch{setError(lang==='ru'?'Скопируйте текст вручную.':'Copy the text manually.')}}
 const row=item=>{
  const value=draft[track].ratings[item.id]||{current:'',desired:''}
  const a=value.current===''?null:Number(value.current)
  const b=value.desired===''?null:Number(value.desired)
  const delta=a===null||b===null?null:b-a
  const previous=vectors[track].ratings[item.id]
  const goal=track==='outer'?lifeAreas.find(x=>x.areaKey===item.id):null
  return <article key={item.id} className={styles.card} data-vector-item={item.id}>
   <header className={styles.cardHead}><div><h3>{item.name[lang]}</h3>
     {item.detail&&<p>{item.detail[lang]}</p>}</div>
     <button type="button" className={styles.focus} aria-pressed={draft[track].focusId===item.id}
      onClick={()=>focus(item.id)}>{draft[track].focusId===item.id?'★ '+t.focus:'☆ '+t.choose}</button>
   </header>
   {guided&&<p className={styles.prompt}>{promptForDevelopmentVector(track,item.id,lang)}</p>}
   <div className={styles.numbers}>
    {['current','desired'].map((key,n)=><label key={key}>
      <span>{n?t.want:t.now}</span>
      <select aria-label={item.name[lang]+' · '+(n?t.want:t.now)} value={value[key]||''}
       onChange={e=>update(item.id,key,e.target.value)}>
       <option value="">—</option>{options.map(number=><option key={number} value={number}>{number}/10</option>)}
      </select>
    </label>)}
    <div className={styles.delta}><span>{t.gap}</span><strong>{delta===null?'—':(delta>0?'+':'')+delta}</strong></div>
   </div>
   {previous&&<small className={styles.source}>{previous.source==='coach'?t.sourceCoach:t.sourceSelf}</small>}
   {goal?.desiredState&&<p className={styles.linked}>{t.linked}: {goal.desiredState}</p>}
  </article>
 }
 return <main className={styles.root} data-daybook-vectors data-cabinet-theme="daybook">
  <header className={styles.masthead}><Link className={styles.brand} href={lang==='es'?'/es':'/'}><Sparkles size={23} aria-hidden="true"/><span>Holistic House</span></Link><SiteNavigation locale={lang} compact/></header>
  <header className={styles.hero}><small>DAYBOOK · 8 + 8</small><h1>{t.title}</h1><p>{t.lead}</p></header>
  <Link className={styles.stageLink} href={'/'+lang+'/app/daybook?start=vector'} prefetch={false}>
   {({en:'Stage 0 · Choose a direction and create a goal (4 + 8)',ru:'Этап 0 · Выбрать направление и создать цель (4 + 8)',es:'Etapa 0 · Elegir una dirección y crear una meta (4 + 8)'})[lang]}
  </Link>
  {state==='ready'?<>
   <div className={styles.tabs} role="tablist" aria-label={t.title}>
    {['inner','outer'].map(key=><button type="button" key={key}
     role="tab" aria-selected={track===key} onClick={()=>{setTrack(key);setIndex(firstIncompleteVector(key==='inner'?INNER_VECTOR_ITEMS:OUTER_VECTOR_ITEMS,draft[key].ratings)??0);setShare('')}}>
      {key==='inner'?t.inner:t.outer}</button>)}
   </div>
   <nav className={styles.modes} aria-label={t.title}>
    <button type="button" aria-pressed={!guided} onClick={()=>setGuided(false)}>{t.self}</button>
    <button type="button" aria-pressed={guided} onClick={resumeGuided}>{t.guided}</button>
   </nav>
   <p className={styles.help}>{guided?t.guide:t.help}</p>
   <DevelopmentVectorWheel items={items} ratings={draft[track].ratings}
    focusId={draft[track].focusId} locale={lang} track={track} pending={dirty}/>
   {guided?<section data-guided-vector-progress>
     <p className={styles.guidedProgress}>{t.step} {index+1}/8 · {guidedProgress.complete}/8 {t.rated}</p>
     {guidedComplete?<div className={styles.guidedDone} role="status">
      <strong>{t.guidedComplete}</strong>
      <p>{t.guidedReview}</p>
      <button type="button" onClick={()=>setGuided(false)}>{t.self}</button>
     </div>:<>
      {row(items[index])}
      <div className={styles.navigation}>
       <button type="button" disabled={index===0} onClick={()=>setIndex(n=>n-1)}>{t.back}</button>
       <button type="button" onClick={nextGuided}>{t.nextMissing}</button>
      </div>
      <p className={styles.help}>{t.skipHint}</p>
     </>}
    </section>:<div className={styles.grid}>{items.map(row)}</div>}
   {error&&<p className={styles.error} role="alert">{error}</p>}
   {notice&&<p className={styles.notice} role="status">{notice}</p>}
   <button type="button" className={styles.save} disabled={!dirty||busy}
     onClick={()=>void save()}>{busy?t.saving:t.save}</button>
   <p className={styles.help}>{t.privacy}</p>
   <section className={styles.exchange}><h2>{t.coaching}</h2><p>{t.protocol}</p>
    <div className={styles.actions}>
     {track==='inner'&&<button type="button" disabled={importing}
       onClick={()=>void importScores()}>{t.import}</button>}
     <button type="button" disabled={dirty||!coachVectorSummary(vectors,lang,track)}
       onClick={prepare}>{t.share}</button>
     <Link href={'/'+lang+'/my-coach'}>{t.coaching}</Link>
     {track==='outer'&&<Link href={'/'+lang+'/app/my-coaching-plan'}>{t.plan}</Link>}
    </div>
    {share&&<div className={styles.share}><p>{t.shareHint}</p>
      <textarea readOnly rows={Math.min(11,share.split('\n').length)} value={share}
       aria-label={t.share}/>
      <button type="button" onClick={()=>void copy()}>{t.copy}</button>
    </div>}
   </section>
  </>:<section className={styles.empty}>
   <p role="status">{state==='loading'?t.loading:state==='guest'?t.login:t.error}</p>
   {state==='guest'?<Link href={'/'+lang+'/app/portrait'}>{t.account}</Link>:
      state==='error'?<button type="button" onClick={()=>void load()}>{t.retry}</button>:null}
  </section>}
 </main>
}
