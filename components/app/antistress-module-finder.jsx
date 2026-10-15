'use client'
import {useMemo,useState} from 'react'
import {ArrowRight,CheckCircle2,ClipboardCheck,ShieldCheck,SlidersHorizontal} from 'lucide-react'
import {
 ANTISTRESS_MODULE_FINDER_ITEMS,ANTISTRESS_MODULE_GOALS,
 antistressModuleTitle,recommendAntistressModule,
} from '@/lib/inner-growth/antistress-module-router'
import styles from './antistress-module-finder.module.css'

const words={
ru:{
 kicker:'ОПОРА · АНТИСТРЕСС',title:'Подберём ваш 14-дневный модуль',
 intro:'Недельный тест уже сохранён. Ответьте на 8 коротких вопросов о навыках, а затем выберите наиболее важную цель.',
 weekly:'Ваши ответы за последние 7 дней',load:'Перегрузка',tension:'Напряжение',functioning:'Повседневная активность',
 question:'За последние 7 дней, когда это было необходимо, насколько вам удавалось следующее?',
 low:'0 · совсем не удавалось',high:'10 · почти всегда удавалось',skip:'Не было такой ситуации / не знаю',rated:'Оценка',
 goal:'Что важнее всего для вас сейчас?',undecided:'Пока не знаю — предложите по тестам',
 result:'Рекомендованный учебный модуль',suggested:'ПРЕДЛОЖЕНИЕ ПО ВАШИМ ОТВЕТАМ',
 why:'Почему предлагаем этот модуль',alternative:'Другие модули (можно выбрать самостоятельно)',
 accept:'Согласен(-на), начать этот модуль',note:'Это предварительная образовательная рекомендация, не диагноз и не стадия травмы. Вы можете выбрать другой модуль или остановиться.',
 reasonLoading:'Мы учли показатели недельного теста и выбранный вами приоритет.',
 reasons:{gentle_start:'В ответах отмечена небольшая доступность ориентировки и паузы.',personal_goal:'Этот модуль соответствует вашей цели и ответам.',reported_overload:'В недельном тесте отмечена высокая субъективная нагрузка или напряжение.',reported_functioning:'Вы отметили трудности с повседневными делами.',reported_skill:'По ответам есть навык, который вы хотели бы укрепить.',exploratory:'Сейчас нет выраженного совпадения. Можно выбрать тему по интересу.'},
 preliminary:'Подбор предварительный: некоторые ответы отсутствуют или выбран профилактический вариант.',
 safety:'Если вы в непосредственной опасности, испытываете мысли о самоповреждении или серьёзное ухудшение, нужна помощь человека или местных экстренных служб. Никто не наблюдает за курсом в реальном времени.',
 measurement:'Шкалы HH авторские, без диагностических норм. Низкая оценка навыка не означает клиническую стадию.',
 },
en:{
 kicker:'OPORA · ANTI-STRESS',title:'Find your 14-day learning module',
 intro:'Your weekly assessment is already saved. Answer eight short questions about skills, then choose what matters to you.',
 weekly:'Your last 7-day self-report',load:'Overload',tension:'Tension',functioning:'Daily functioning',
 question:'In the past 7 days, when needed, how often were you able to do the following?',
 low:'0 · not at all',high:'10 · almost always',skip:'No opportunity / not sure',rated:'Rating',
 goal:'What matters most right now?',undecided:'Not sure yet — suggest a learning focus',
 result:'Suggested learning module',suggested:'SUGGESTED FROM YOUR ANSWERS',
 why:'Why this module',alternative:'Other modules (you can choose)',accept:'I agree — start this module',
 note:'This is a provisional educational suggestion, not a diagnosis or trauma stage. You may choose another module or stop.',
 reasonLoading:'Your current weekly ratings and selected learning goal are considered.',
 reasons:{gentle_start:'You reported limited access to grounding and pauses.',personal_goal:'This module aligns with your goal and responses.',reported_overload:'Your weekly responses suggest substantial reported stress or tension.',reported_functioning:'You reported difficulty with everyday functioning.',reported_skill:'A skill you wish to develop appears less available.',exploratory:'No clear priority emerged; you can choose a learning theme.'},
 preliminary:'This suggestion is preliminary: some answers are missing or this is an exploratory choice.',
 safety:'If you are in immediate danger, thinking of harming yourself, or seriously unwell, please contact human or emergency support. This course is not monitored in real time.',
 measurement:'HH scales are original, non-diagnostic self-reports. A low skill score does not establish a clinical stage.',
 },
es:{
 kicker:'OPORA · ANTIESTRÉS',title:'Elige tu módulo de 14 días',
 intro:'Ya tienes tu evaluación semanal. Responde ocho preguntas sobre habilidades y elige tu prioridad.',
 weekly:'Tu autoevaluación de los últimos 7 días',load:'Sobrecarga',tension:'Tensión',functioning:'Actividad cotidiana',
 question:'En los últimos 7 días, cuando lo necesitabas, ¿en qué medida podías hacer lo siguiente?',
 low:'0 · en absoluto',high:'10 · casi siempre',skip:'No hubo ocasión / no sé',rated:'Puntuación',
 goal:'¿Qué es lo más importante ahora?',undecided:'No sé todavía — sugiéreme un módulo',
 result:'Módulo educativo sugerido',suggested:'SEGÚN TUS RESPUESTAS',why:'Por qué este módulo',
 alternative:'Otros módulos (puedes elegir)',accept:'Acepto — comenzar este módulo',
 note:'Sugerencia educativa provisional, no diagnóstico ni etapa clínica del trauma.',
 reasonLoading:'Consideramos tu evaluación semanal y prioridad.',
 reasons:{gentle_start:'Indicaste poca disponibilidad para hacer pausas.',personal_goal:'Coincide con tu prioridad.',reported_overload:'Señalaste una carga o tensión elevada.',reported_functioning:'Señalaste dificultades en la vida diaria.',reported_skill:'Una habilidad merece más práctica.',exploratory:'No hay una prioridad clara; puedes elegir.'},
 preliminary:'Sugerencia provisional: faltan respuestas o eliges explorar.',
 safety:'Ante un peligro inmediato, ideas de hacerte daño o un empeoramiento grave, busca ayuda humana o servicios de emergencia. Este curso no tiene vigilancia clínica.',
 measurement:'Las escalas HH son originales, no diagnósticas. Una puntuación baja no indica una etapa clínica.',
 }
}
function savedWeekly(profile){
 const ids=['weekly.load','weekly.tension','weekly.functioning']
 const relevant=ids.map(id=>profile?.scales?.find(s=>s.testKey==='hh-weekly-pulse'&&s.id==='hh-weekly-pulse::'+id &&
 Number.isInteger(s.score)&&s.min===0&&s.max===10&&s.recent && Number.isFinite(Date.parse(s.measuredAt||'')) && Date.parse(s.measuredAt)<=Date.now() && Date.now()-Date.parse(s.measuredAt)<=7*86400000) )
 if(relevant.some(row=>!row)||new Set(relevant.map(row=>row.resultId)).size!==1)return null
 return Object.fromEntries(ids.map((id,index)=>[id,relevant[index].score]))
}
export default function AntiStressModuleFinder({locale='en',profile,busy=false,onStart}){
 const language=['ru','en','es'].includes(locale)?locale:'en',t=words[language]
 const [answers,setAnswers]=useState({})
 const [goal,setGoal]=useState('undecided')
 const [override,setOverride]=useState(null)
 const weekly=useMemo(()=>savedWeekly(profile),[profile])
 const recommendation=useMemo(()=>recommendAntistressModule({
   weekly:weekly||{},answers,goal:goal==='undecided'?null:goal,
 }),[weekly,answers,goal])
 const chosen=override||recommendation.moduleId
 const selected=ANTISTRESS_MODULE_GOALS.find(m=>m.id===chosen)
 const scoreLabel=id=>answers[id]===undefined||answers[id]===null?t.skip:answers[id]+'/10'
 const setAnswer=(key,value)=>setAnswers(current=>({...current,[key]:value}))
 return <section className={styles.root} data-course-module-finder data-opora-route-version={recommendation.version}>
   <header className={styles.hero}>
     <span className={styles.kicker}><ShieldCheck size={15}/>{t.kicker}</span>
     <h2>{t.title}</h2><p>{t.intro}</p>
   </header>
   <section className={styles.weekly} aria-label={t.weekly}>
     <h3><ClipboardCheck size={18}/>{t.weekly}</h3>
     <div className={styles.weeklyScales}>{[
       ['weekly.load',t.load],['weekly.tension',t.tension],['weekly.functioning',t.functioning],
     ].map(([key,label])=><div key={key}><small>{label}</small><strong>{weekly?.[key]??'—'}<span> /10</span></strong></div>)}</div>
   </section>
   <section className={styles.form} aria-label={t.question}>
     <h3>{t.question}</h3>
     <div className={styles.questions}>{ANTISTRESS_MODULE_FINDER_ITEMS.map(({id,text})=>
       <fieldset className={styles.question} key={id} data-finder-item={id}>
         <legend><span>{id}</span>{text[language]||text.en}</legend>
         <div className={styles.rangeHeader}><small>{t.low}</small><strong>{scoreLabel(id)}</strong><small>{t.high}</small></div>
         <input aria-label={text[language]||text.en} type="range" min={0} max={10} step={1}
           value={answers[id]??5} disabled={busy}
           onChange={event=>setAnswer(id,Number(event.target.value))}/>
         <button type="button" className={styles.skip} disabled={busy}
           aria-pressed={answers[id]===null}
           onClick={()=>setAnswer(id,null)}>{t.skip}</button>
       </fieldset>
     )}</div>
   </section>
   <section className={styles.goal}>
     <label htmlFor="opora-module-goal"><SlidersHorizontal size={17}/>{t.goal}</label>
     <select id="opora-module-goal" value={goal} disabled={busy} onChange={event=>{setGoal(event.target.value);setOverride(null)}}>
       <option value="undecided">{t.undecided}</option>
       {ANTISTRESS_MODULE_GOALS.map(mod=><option value={mod.id} key={mod.id}>
          {mod.id.replace('AS','Антистресс ')} · {mod.short[language]||mod.short.en}
        </option>)}
     </select>
   </section>
   <section className={styles.result} aria-label={t.result} aria-live="polite" data-module-recommendation={recommendation.moduleId}>
     <small className={styles.kicker}><CheckCircle2 size={15}/>{t.suggested}</small>
     <h3>{t.result}</h3>
     <div className={styles.resultTitle}>№ {chosen.slice(2)} · {selected?.title[language]||selected?.title.en}</div>
     <p><strong>{t.why}:</strong> {t.reasons[recommendation.reason]||t.reasonLoading}</p>
     <div className={styles.evidence}>{recommendation.evidence.map(e=>
       <span key={e.id}>{e.id}: {e.value}/10</span>)}</div>
     {recommendation.provisional&&<p className={styles.preliminary}>{t.preliminary}</p>}
   </section>
   <section className={styles.alternatives} aria-label={t.alternative}>
     <h3>{t.alternative}</h3>
     <div className={styles.moduleGrid}>{ANTISTRESS_MODULE_GOALS.map(mod=>
       <button type="button" key={mod.id} className={styles.moduleChoice}
         data-selected={chosen===mod.id} aria-pressed={chosen===mod.id} disabled={busy}
         onClick={()=>setOverride(mod.id===recommendation.moduleId?null:mod.id)}>
         <strong>{mod.id.replace('AS','№ ')}</strong><span>{mod.title[language]||mod.title.en}</span>
       </button>
     )}</div>
   </section>
   <div className={styles.footer}>
     <p>{t.note}</p>
     <button type="button" className={styles.cta} data-course-consent-module
       disabled={busy||!weekly||typeof onStart!=='function'}
       onClick={()=>onStart({moduleId:chosen,answers:Object.fromEntries(ANTISTRESS_MODULE_FINDER_ITEMS.map(x=>[x.id,answers[x.id]??null])),goal})}>
       {t.accept}<ArrowRight size={20}/>
     </button>
     <small>{t.measurement}</small><small>{t.safety}</small>
   </div>
 </section>
}
