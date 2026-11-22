'use client'

import {useEffect,useRef,useState} from 'react'
import styles from './my-coach-live-dialogue.module.css'

const topics=[
 ['body_health','Body & Health','Тело и здоровье','Cuerpo y salud'],
 ['emotional_wellbeing','Emotional wellbeing','Эмоциональное благополучие','Bienestar emocional'],
 ['relationships','Relationships','Отношения','Relaciones'],
 ['career_business','Career & business','Карьера и бизнес','Carrera y negocios'],
 ['finance','Finances','Финансы','Finanzas'],
 ['personal_growth','Personal growth','Личностный рост','Crecimiento personal'],
 ['lifestyle','Lifestyle','Образ жизни','Estilo de vida'],
 ['meaning_purpose','Meaning & purpose','Смыслы и цели','Sentido y propósito'],
]
const copy={
 ru:{title:'Память коуча · по вашему разрешению',prior:'Проверить прошлые сессии и вспомнить моё имя и краткие итоги',
   extra:'Google Gemini Free может использовать переданные данные для улучшения моделей. Согласие касается только выбранных сведений, не всего кабинета.',
   other:'Сохранённые сведения передаются выбранному провайдеру только с этим разрешением.',
   loading:'Проверяю сохранённые данные…',found:'Сохранённая сессия найдена',none:'Ранее сохранённых коучинг-сессий нет',
   name:'Имя',recap:'Вывод',step:'Следующий шаг',unavailable:'Память недоступна; сессия продолжается без неё.',
   goals:'Подключить мои подтверждённые цели и действия',profile:'Проверить сохранённые смысловые оси (приватно)',
   tests:'Подключить отдельно разрешённые результаты тестов',topic:'Тема сохранённого контекста',
   choose:'Выберите тему',details:'Цели и профиль · после знакомства',approved:'Разрешённые записи',
   empty:'Разрешённых записей по выбранной теме пока нет',share:'Передать только отдельно разрешённые записи, не весь профиль'},
 en:{title:'Coach memory · only with your permission',prior:'Check for previous coaching sessions and recall my preferred name and brief conclusions',
   extra:'Google Gemini Free may use submitted content to improve its models. This permission covers only the chosen details, not your entire account.',
   other:'Only the selected information may be sent to the chosen model provider with this permission.',
   loading:'Checking saved information…',found:'Saved previous session found',none:'No earlier saved coaching session',
   name:'Preferred name',recap:'Conclusion',step:'Next step',unavailable:'Saved memory unavailable; the session can continue without it.',
   goals:'Use my confirmed goals and agreed actions',profile:'Review my saved meaning axes privately',
   tests:'Use separately approved test results',topic:'Saved context topic',
   choose:'Choose a topic',details:'Goals and profile · after introductions',approved:'Approved items',
   empty:'No approved items for this topic yet',share:'Share individually approved items, not the full profile'},
 es:{title:'Memoria del coach · solo con tu permiso',prior:'Buscar sesiones anteriores y recordar mi nombre y sus conclusiones breves',
   extra:'Gemini Free puede usar los datos enviados para mejorar modelos. Este permiso solo cubre la información elegida, no toda tu cuenta.',
   other:'Solo la información seleccionada puede enviarse al proveedor con tu permiso.',
   loading:'Revisando datos guardados…',found:'Hay una sesión anterior guardada',none:'No hay sesiones de coaching anteriores guardadas',
   name:'Nombre',recap:'Conclusión',step:'Siguiente paso',unavailable:'Memoria no disponible; la sesión puede continuar sin ella.',
   goals:'Usar mis metas confirmadas y acciones acordadas',profile:'Revisar mis ejes guardados en privado',
   tests:'Usar resultados de pruebas aprobados por separado',topic:'Tema del contexto guardado',
   choose:'Selecciona un tema',details:'Metas y perfil · después de conocernos',approved:'Datos aprobados',
   empty:'Todavía no hay datos aprobados para este tema',share:'Compartir solo elementos aprobados, no todo el perfil'},
}

export default function MyCoachStagedMemoryControls({locale='en',provider='gemini_free',
 invitationAccepted=false,identityConfirmed=false,focusConfirmed=false,priorAllowed=false,onPriorAllowed,
 topicKey='',onTopicKey,assessmentsAllowed=false,onAssessmentsAllowed,onMemoryChange,
 contextSessionToken,contextRevision=0,children}){
 const lang=copy[locale]?locale:'en',t=copy[lang]
 const [allowGoals,setAllowGoals]=useState(false)
 const [allowProfile,setAllowProfile]=useState(false)
 const [sharePersonal,setSharePersonal]=useState(false)
 const [identity,setIdentity]=useState(null)
 const [stageToken,setStageToken]=useState('')
 const [personal,setPersonal]=useState(null)
 const [loadingIdentity,setLoadingIdentity]=useState(false)
 const [loadingPersonal,setLoadingPersonal]=useState(false)
 const [failed,setFailed]=useState(false)
 const [focusRevision,setFocusRevision]=useState(0)
 const lastCallback=useRef(onMemoryChange)
 lastCallback.current=onMemoryChange
 const wantsMemory=priorAllowed||allowGoals||allowProfile||assessmentsAllowed
 const effectiveTopicKey=topicKey||(allowProfile?'meaning_purpose':'')

 useEffect(()=>{
   setIdentity(null);setStageToken('');setPersonal(null)
   if(!invitationAccepted||!wantsMemory){setLoadingIdentity(false);return}
   const controller=new AbortController()
   setLoadingIdentity(true);setFailed(false)
   void fetch('/api/app/my-coach/staged-memory',{
     method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
     headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:'identity',provider,
       consent:{sessionAccepted:true,priorSessions:priorAllowed,providerSharing:true}}),
   }).then(async response=>{
     if(!response.ok)throw Error('UNAVAILABLE')
     const value=await response.json()
     if(value?.schema!=='hh-my-coach-staged-memory-v1'||value.stage!=='identity'||
        typeof value.stageToken!=='string'||value.stageToken.length>140)throw Error('INVALID')
     if(controller.signal.aborted)return
     setIdentity(value.prior||null);setStageToken(value.stageToken)
   }).catch(()=>{if(!controller.signal.aborted)setFailed(true)})
     .finally(()=>{if(!controller.signal.aborted)setLoadingIdentity(false)})
   return()=>controller.abort()
 },[provider,invitationAccepted,wantsMemory,priorAllowed,focusRevision])

 useEffect(()=>{
   setPersonal(null);setSharePersonal(false)
   if(!identityConfirmed||!focusConfirmed||!stageToken||!effectiveTopicKey||!(allowGoals||allowProfile||assessmentsAllowed)){
     setLoadingPersonal(false);return
   }
   const controller=new AbortController()
   setLoadingPersonal(true)
   void fetch('/api/app/my-coach/staged-memory',{
     method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
     headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:'personal',provider,
       topicKey:effectiveTopicKey,stageToken,...(contextSessionToken?{contextSessionToken}:{}),consent:{sessionAccepted:true,providerSharing:true,
         goals:allowGoals,profile:allowProfile,assessments:assessmentsAllowed}}),
   }).then(async response=>{
     if(!response.ok)throw Error('UNAVAILABLE')
     const value=await response.json()
     if(value?.schema!=='hh-my-coach-staged-memory-v1'||value.stage!=='personal')throw Error('INVALID')
     if(!controller.signal.aborted)setPersonal(value)
   }).catch(()=>{if(!controller.signal.aborted)setFailed(true)})
     .finally(()=>{if(!controller.signal.aborted)setLoadingPersonal(false)})
   return()=>controller.abort()
 },[identityConfirmed,focusConfirmed,stageToken,provider,effectiveTopicKey,allowGoals,allowProfile,assessmentsAllowed,contextSessionToken,contextRevision])

 useEffect(()=>{
   const invalidate=()=>setFocusRevision(value=>value+1)
   window.addEventListener('focus',invalidate)
   return()=>window.removeEventListener('focus',invalidate)
 },[])

 useEffect(()=>{
   lastCallback.current?.({provider,prior:priorAllowed?identity:null,stageToken,personal,
     allowGoals,allowProfile,assessmentsAllowed,sharePersonal,topicKey,invitationAccepted,
     loading:loadingIdentity||loadingPersonal})
 },[provider,identity,stageToken,personal,priorAllowed,allowGoals,allowProfile,
   assessmentsAllowed,sharePersonal,topicKey,invitationAccepted,loadingIdentity,loadingPersonal])

 return <section className={styles.goalPrivacy} data-coach-staged-memory aria-label={t.title}>
   <label data-coach-prior-session-opt-in>
     <input type="checkbox" checked={priorAllowed} onChange={event=>onPriorAllowed?.(event.target.checked)}/>
     {' '}{t.prior}
   </label>
   <small>{provider==='gemini_free'?t.extra:t.other}</small>
   {invitationAccepted&&wantsMemory&&loadingIdentity?<p role="status">{t.loading}</p>:null}
   {invitationAccepted&&priorAllowed&&identity&&!loadingIdentity?<div data-coach-prior-summary>
     <p>{identity.hasPreviousSession?t.found:t.none}
       {identity.preferredName?' · '+t.name+': '+identity.preferredName:''}</p>
     {identity.hasPreviousSession&&<p>{identity.previous?.[0]?.date||''} · {identity.previous?.[0]?.topic||''}</p>}
     {identityConfirmed&&identity.hasPreviousSession&&<div>
       {identity.previous?.[0]?.clientConclusions&&<p>{t.recap}: {identity.previous[0].clientConclusions}</p>}
       {identity.previous?.[0]?.clientNextStep&&<p>{t.step}: {identity.previous[0].clientNextStep}</p>}
     </div>}
   </div>:null}
   {identityConfirmed&&focusConfirmed&&<details className={styles.voicePrivacyDetails} data-coach-memory-personal>
     <summary>{t.details}</summary>
     {children}
     <label><input type="checkbox" checked={allowGoals} onChange={event=>{setSharePersonal(false);setAllowGoals(event.target.checked)}}/>{' '}{t.goals}</label>
     <label><input type="checkbox" checked={allowProfile} onChange={event=>{setSharePersonal(false);setAllowProfile(event.target.checked)}}/>{' '}{t.profile}</label>
     <label><input type="checkbox" checked={assessmentsAllowed} onChange={event=>{setSharePersonal(false);onAssessmentsAllowed?.(event.target.checked)}}/>{' '}{t.tests}</label>
     <label>{t.topic}
       <select value={topicKey} onChange={event=>{setSharePersonal(false);onTopicKey?.(event.target.value)}}>
         <option value="">{t.choose}</option>
         {topics.map(([key,en,ru,es])=><option value={key} key={key}>{lang==='ru'?ru:lang==='es'?es:en}</option>)}
       </select>
     </label>
     {loadingPersonal?<p role="status">{t.loading}</p>:null}
     {allowProfile&&personal?.profileAudit?.status==='available'&&
      <div data-coach-profile-audit role="status" aria-label={lang==='ru'?'Проверка профиля':lang==='es'?'Revisión del perfil':'Profile review'}>
        <strong>{lang==='ru'?'Смысловые оси':lang==='es'?'Ejes de sentido':'Meaning axes'} · {personal.profileAudit.summary.present}/8</strong>
        <ul>{personal.profileAudit.axes.map((axis,index)=><li key={axis.id}>
          <span>{({
            ru:['Опора','Связь','Свобода','Сила','Любовь','Достоинство','Самореализация','Признание'],
            en:['Support','Connection','Freedom','Agency','Love','Dignity','Self-realization','Recognition'],
            es:['Apoyo','Vínculo','Libertad','Acción','Amor','Dignidad','Autorrealización','Reconocimiento']
          })[lang][index]}: </span>
          <span>{axis.current===null?'—':axis.current} → {axis.desired===null?'—':axis.desired}</span>
        </li>)}</ul>
        {personal.profileAudit.goals?.status==='available'&&<p>
          {lang==='ru'?'Целей':lang==='es'?'Metas':'Goals'}: {personal.profileAudit.goals.count};
          {' '}{lang==='ru'?'без результата':lang==='es'?'sin resultado':'missing outcome'}: {personal.profileAudit.goals.missingOutcome}
        </p>}
        {personal.profileAudit.measurements?.status==='available'&&<p>
          {lang==='ru'?'Записанных измерений':lang==='es'?'Mediciones registradas':'Recorded measurements'}:
          {' '}{personal.profileAudit.measurements.count===null?'50+':personal.profileAudit.measurements.count}
          {' · '}{lang==='ru'?'не оценки смысловых осей':lang==='es'?'no son ejes':'not axis ratings'}
        </p>}
        <small>{lang==='ru'?'Данные не передаются модели автоматически. Пусто не равно нулю.':
          lang==='es'?'No se envía a IA automáticamente. Vacío no es cero.':
          'Not sent to AI automatically. Blank is not zero.'}</small>
      </div>}
    {allowProfile&&personal?.profileAudit?.status==='unavailable'&&
      <p role="status">{lang==='ru'?'Профиль недоступен — это не значит, что он пустой.':
       lang==='es'?'Perfil no disponible; no significa que esté vacío.':
       'Profile unavailable; that does not mean it is empty.'}</p>}
    {personal?<div data-coach-personal-memory-preview><strong>{t.approved}</strong>
       {personal.context?.items?.length?
         <ul>{personal.context.items.map((item,index)=><li key={index}>{item.text}</li>)}</ul>:
         <p>{t.empty}</p>}
     </div>:null}
     {personal&&(personal.context?.items?.length||personal.profile?.preferredLanguage)&&
       <label data-coach-memory-final-sharing>
         <input type="checkbox" checked={sharePersonal} onChange={event=>setSharePersonal(event.target.checked)}/>
         {' '}{t.share}
       </label>}
   </details>}
   {failed?<p role="status">{t.unavailable}</p>:null}
 </section>
}
