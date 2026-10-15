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
 kicker:'ОПОРА · АНТИСТРЕСС',title:'Ваш маршрут по уровню стресса',
 intro:'Пять вариантов программы по 14 занятий. Сначала учитываем ваш Weekly Pulse, затем 8 необязательных оценок доступности опоры. Вы можете согласиться с рекомендацией или выбрать другой маршрут.',
 weekly:'Ваши ответы за последние 7 дней',load:'Перегрузка',tension:'Напряжение',functioning:'Повседневная активность',
 question:'За последние 7 дней, когда это было необходимо, насколько вам удавалось следующее?',
 low:'0 · совсем не удавалось',high:'10 · почти всегда удавалось',skip:'Не было такой ситуации / не знаю',rated:'Оценка',
 goal:'Другой маршрут (по желанию)',undecided:'Подобрать автоматически по тестированию',
 result:'Ваш 14-дневный маршрут',suggested:'РЕКОМЕНДАЦИЯ ПО ТЕКУЩЕЙ НАГРУЗКЕ',
 why:'Основание подбора',alternative:'Все 5 маршрутов (можно выбрать)',
 accept:'Согласен(-на), начать этот модуль',note:'Это авторская ориентировочная шкала субъективной нагрузки, не диагностика тяжести болезни или стадии травмы. Более высокий номер означает меньшую текущую нагрузку, а не более высокий результат обучения.',
 reasonLoading:'Мы учли показатели недельного теста и выбранный вами приоритет.',
 reasons:{gentle_start:'Навыки ориентировки и паузы сейчас мало доступны, поэтому предложен самый мягкий маршрут.',reported_overload:'Одна из шкал нагрузки или напряжения высокая по авторским диапазонам.',reported_moderate:'Нагрузка или напряжение в среднем диапазоне авторской шкалы.',reported_mild:'В Weekly Pulse отмечена небольшая субъективная нагрузка.',maintenance:'Шкалы нагрузки и напряжения невысокие: можно укреплять устойчивость.',reported_functioning:'Низкая самооценка повседневной активности: предложен более бережный темп.',exploratory:'Нет полного сопоставимого теста; предлагается базовая стабилизация.'},
 preliminary:'Подбор ориентировочный: не все дополнительные оценки заполнены. У шкал HH нет клинически проверенных порогов.',
 safety:'Если вы в непосредственной опасности, испытываете мысли о самоповреждении или серьёзное ухудшение, нужна помощь человека или местных экстренных служб. Никто не наблюдает за курсом в реальном времени.',
 measurement:'Шкалы HH авторские, без диагностических норм. Низкая оценка навыка не означает клиническую стадию.',
 },
en:{
 kicker:'OPORA · ANTI-STRESS',title:'Your stress-informed 14-day route',
 intro:'Five 14-day learning routes. We start with Weekly Pulse and eight optional self-ratings of available skills. You can accept the suggestion or choose a different route.',
 weekly:'Your last 7-day self-report',load:'Overload',tension:'Tension',functioning:'Daily functioning',
 question:'In the past 7 days, when needed, how often were you able to do the following?',
 low:'0 · not at all',high:'10 · almost always',skip:'No opportunity / not sure',rated:'Rating',
 goal:'Choose a different route (optional)',undecided:'Recommend from my assessment',
 result:'Your 14-day learning route',suggested:'BASED ON REPORTED STRESS LOAD',
 why:'Why this route',alternative:'All five routes (you may choose)',accept:'I agree — start this module',
 note:'This is an original non-clinical stress-load orientation, not a diagnosis or trauma stage. A higher route number means a lower reported load, not better performance.',
 reasonLoading:'Your current weekly ratings and selected learning goal are considered.',
 reasons:{gentle_start:'Grounding and pausing feel hard to access, so the gentlest route is suggested.',reported_overload:'At least one self-reported load/tension dimension is high within our provisional bands.',reported_moderate:'Reported load or tension falls in the middle of our original scale.',reported_mild:'Weekly Pulse suggests a mild level of reported strain.',maintenance:'Load and tension scores are low; resilience practice may fit.',reported_functioning:'Reported daily difficulty suggests a gentler starting route.',exploratory:'No complete comparable baseline; a stabilization route is provisionally shown.'},
 preliminary:'This is provisional: optional skills may be unanswered. HH scales have no validated clinical cut-offs.',
 safety:'If you are in immediate danger, thinking of harming yourself, or seriously unwell, please contact human or emergency support. This course is not monitored in real time.',
 measurement:'HH scales are original, non-diagnostic self-reports. A low skill score does not establish a clinical stage.',
 },
es:{
 kicker:'OPORA · ANTIESTRÉS',title:'Tu ruta según el estrés percibido',
 intro:'Cinco rutas de 14 clases. Consideramos tu Weekly Pulse y ocho habilidades opcionales; puedes elegir otra ruta.',
 weekly:'Tu autoevaluación de los últimos 7 días',load:'Sobrecarga',tension:'Tensión',functioning:'Actividad cotidiana',
 question:'En los últimos 7 días, cuando lo necesitabas, ¿en qué medida podías hacer lo siguiente?',
 low:'0 · en absoluto',high:'10 · casi siempre',skip:'No hubo ocasión / no sé',rated:'Puntuación',
 goal:'Otra ruta (opcional)',undecided:'Recomienda según mi evaluación',
 result:'Tu ruta educativa de 14 días',suggested:'SEGÚN TU ESTRÉS PERCIBIDO',why:'Motivo de la recomendación',
 alternative:'Las cinco rutas (puedes elegir)',accept:'Acepto — comenzar esta ruta',
 note:'Clasificación educativa provisional de estrés percibido, no diagnóstico ni etapa clínica del trauma.',
 reasonLoading:'Consideramos tu evaluación semanal y prioridad.',
 reasons:{gentle_start:'Las pausas resultan difíciles; sugerimos la ruta más suave.',reported_overload:'La carga o la tensión es elevada según rangos originales.',reported_moderate:'Carga o tensión moderada según rangos originales.',reported_mild:'La carga percibida es leve.',maintenance:'Carga y tensión bajas; práctica preventiva.',reported_functioning:'La actividad cotidiana sugiere un ritmo más suave.',exploratory:'Falta una medición semanal completa; sugerimos estabilización.'},
 preliminary:'Sugerencia provisional. Los umbrales HH no tienen validación clínica.',
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
 const chosen=override||(goal!=='undecided'?goal:null)||recommendation.moduleId
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
     <p>{language==='ru'?'Диапазон нагрузки и напряжения':language==='es'?'Rango de carga y tensión':'Reported load/tension band'}: {selected?.range?.[0]}–{selected?.range?.[1]} / 10</p>
     {chosen!==recommendation.moduleId&&<p data-module-user-override>{language==='ru'?'Выбран вами вместо рекомендации № ':language==='es'?'Elegido en lugar de la recomendación № ':'You chose a different route; suggested № '}{recommendation.moduleId.slice(2)}</p>}
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
         <strong>{mod.id.replace('AS','№ ')} · {mod.range[0]}–{mod.range[1]}/10</strong><span>{mod.title[language]||mod.title.en}</span>
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
