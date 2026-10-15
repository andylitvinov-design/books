'use client'
import {useMemo,useState} from 'react'
import {ArrowRight,CheckCircle2,ChevronDown,ClipboardCheck,ShieldCheck,SlidersHorizontal} from 'lucide-react'
import {
  ANTISTRESS_MODULE_FINDER_ITEMS,ANTISTRESS_MODULE_GOALS,
  recommendAntistressModule,
} from '@/lib/inner-growth/antistress-module-router'
import styles from './antistress-module-finder.module.css'

// Step 5 is a decision screen, not another assessment screen. The essential
// Weekly Pulse is already finished; skill ratings remain explicitly optional.
const words={
  ru:{
    kicker:'ОПОРА · АНТИСТРЕСС',eyebrow:'ВАШ РЕКОМЕНДОВАННЫЙ МАРШРУТ',
    title:'Рекомендуем начать с курса',route:'ОПОРА',day:'День 1 из 14',
    based:'Мы учли ваши ответы за последние 7 дней. Вы можете выбрать другой модуль.',
    start:'Начать курс · День 1',starting:'Открываем занятие…',
    modules:'Шесть этапов программы',modulesHint:'Рекомендуемый модуль уже выбран. При желании измените выбор одним нажатием.',
    recommended:'Рекомендуем',chosen:'Ваш выбор',reset:'Вернуться к рекомендации',
    results:'Результаты моего тестирования',resultsHint:'Свернуть / развернуть оценки',weekly:'Weekly Pulse · последние 7 дней',
    load:'Перегрузка',tension:'Напряжение',functioning:'Повседневная активность',
    otherTests:'Другие пройденные тесты',moreDetails:'Показаны только доступные совместимые результаты. Полные отчёты остаются в «Моих тестах».',
    why:'Почему этот модуль',weekMissing:'Нужен актуальный Weekly Pulse, чтобы открыть первый урок.',
    skills:'Уточнить рекомендацию · 8 вопросов по желанию',
    skillsHint:'Рекомендуем пройти до выбора этапа: 8 кратких пунктов помогут подобрать цель курса. Пропуски допустимы.',
    question:'За последние 7 дней, когда было нужно, насколько вам удавалось следующее?',
    low:'0 · не удавалось',high:'10 · почти всегда',skip:'Не знаю / не было ситуации',
    footerTitle:'Готовы перейти к практике?',footerText:'Первое занятие начнётся сразу после подтверждения. Далее — 14 дней упражнений в удобном темпе.',
    note:'Этап — учебная задача, а не диагноз или подтверждённая стадия травмы. Уровень стресса влияет на темп занятий, а не определяет этап автоматически.',
    preliminary:'Подбор ориентировочный. У авторских шкал HH нет клинически подтверждённых порогов.',
    measurement:'Шкалы HH не предназначены для постановки диагноза. Можно пропустить вопросы о навыках.',
    safety:'Курс не отслеживается в реальном времени. При непосредственной опасности или серьёзном ухудшении обратитесь к специалисту либо в экстренную службу.',
    reasons:{
      gentle_start:'Сейчас опора и возможность сделать паузу ощущаются менее доступными — предлагаем самый бережный темп.',
      reported_overload:'Одна из ваших оценок перегрузки или напряжения находится в высоком диапазоне.',
      reported_moderate:'Ваши оценки отражают среднюю субъективную нагрузку.',
      reported_mild:'Ваши ответы отражают относительно небольшую нагрузку.',
      maintenance:'Нагрузка невысока; можно укреплять устойчивость.',
      reported_functioning:'Оценка повседневной активности говорит в пользу более мягкого начала.',
      exploratory:'Недостаточно данных о навыках. Предлагаем стабилизацию как безопасный старт; выбор остаётся за вами.',
      goal_preference:'Вы выбрали это направление обучения. Рекомендация учитывает вашу цель, а не объявляет диагноз.',
      emotional_skills:'В ответах отмечена низкая доступность эмоциональной опоры. Можно начать с навыков работы с чувствами.',
      self_support:'В ответах мало доступной самоподдержки. Можно начать с интеграции и мягкого отношения к себе.',
      daily_function:'Больше всего затруднены повседневные дела при переносимой нагрузке. Подойдут небольшие реальные шаги.',
      general_stabilization:'При отсутствии явного приоритета предлагаем общую саморегуляцию как обратимый начальный навык.',
    },
  },
  en:{
    kicker:'OPORA · ANTI-STRESS',eyebrow:'YOUR RECOMMENDED STARTING POINT',
    title:'We recommend starting with',route:'Anti-Stress',day:'Day 1 of 14',
    based:'Based on your last seven days. You can always choose another module.',
    start:'Start course · Day 1',starting:'Opening your lesson…',
    modules:'All six programme courses',modulesHint:'Your recommended route is selected. Choose a different one if you prefer.',
    recommended:'Recommended',chosen:'Your choice',reset:'Use recommended module',
    results:'My assessment results',resultsHint:'Expand to see your scores',weekly:'Weekly Pulse · last 7 days',
    load:'Overload',tension:'Tension',functioning:'Daily functioning',
    otherTests:'Other completed assessments',moreDetails:'Only available compatible results are shown. Full reports remain in My Tests.',
    why:'Why this module',weekMissing:'A current Weekly Pulse is needed to start your first lesson.',
    skills:'Refine this recommendation · 8 optional questions',
    skillsHint:'Recommended before choosing a course: eight skill questions help match your learning goal. Skips are allowed.',
    question:'In the last 7 days, when needed, how often could you do the following?',
    low:'0 · not at all',high:'10 · almost always',skip:'Not sure / no opportunity',
    footerTitle:'Ready for your first practice?',footerText:'Your first lesson opens after you confirm. Continue through 14 days of practices at your own pace.',
    note:'Courses reflect learning goals, not diagnosed trauma stages. Stress ratings guide pace, not treatment selection.',
    preliminary:'This is an educational suggestion. HH scales do not have validated clinical cut-offs.',
    measurement:'HH scores are non-diagnostic self-reports. The skill questions can be skipped.',
    safety:'This course is not monitored in real time. For immediate danger or serious deterioration, seek human or emergency support.',
    reasons:{
      gentle_start:'Grounding and pausing feel less available right now, so the gentlest route is suggested.',
      reported_overload:'At least one of your load or tension ratings is high within our provisional ranges.',
      reported_moderate:'Your ratings suggest a moderate level of reported strain.',
      reported_mild:'Your ratings suggest relatively mild strain.',
      maintenance:'Strain is low; resilience practice may be a good fit.',
      reported_functioning:'Reported difficulty with daily functioning suggests a gentler start.',
      exploratory:'Skill information is incomplete; stabilization is a safe starting suggestion, not a diagnosis.',
      goal_preference:'Your stated learning goal informed this suggestion; it is not a clinical classification.',
      emotional_skills:'Emotion support skills appear less accessible; the emotion-learning course may fit.',
      self_support:'Self-support feels less accessible; the integration course may fit your goal.',
      daily_function:'Everyday functioning is harder despite manageable load; practical small steps may help.',
      general_stabilization:'With no clear priority, stabilization is a flexible educational starting point.',
    },
  },
  es:{
    kicker:'OPORA · ANTIESTRÉS',eyebrow:'TU PUNTO DE PARTIDA RECOMENDADO',
    title:'Te recomendamos comenzar con',route:'Antiestrés',day:'Día 1 de 14',
    based:'Según tus respuestas de los últimos siete días. Puedes elegir otro módulo.',
    start:'Comenzar curso · Día 1',starting:'Abriendo tu clase…',
    modules:'Los seis cursos de la programa',modulesHint:'La ruta recomendada está seleccionada. Puedes cambiarla.',
    recommended:'Recomendado',chosen:'Tu elección',reset:'Volver a la recomendación',
    results:'Resultados de mis evaluaciones',resultsHint:'Desplegar las puntuaciones',weekly:'Weekly Pulse · últimos 7 días',
    load:'Sobrecarga',tension:'Tensión',functioning:'Actividad cotidiana',
    otherTests:'Otras evaluaciones completadas',moreDetails:'Se muestran resultados compatibles disponibles. Los informes completos siguen en Mis tests.',
    why:'Por qué este módulo',weekMissing:'Necesitas un Weekly Pulse reciente antes del día 1.',
    skills:'Afinar la recomendación · 8 preguntas opcionales',
    skillsHint:'Ocho preguntas de habilidades recomendadas antes de elegir; puedes omitir respuestas.',
    question:'Durante los últimos 7 días, cuando lo necesitabas, ¿con qué frecuencia podías hacer lo siguiente?',
    low:'0 · nada',high:'10 · casi siempre',skip:'No sé / no hubo ocasión',
    footerTitle:'¿Listo para tu primera práctica?',footerText:'La primera clase se abre al confirmar. Continúa con 14 días de ejercicios a tu ritmo.',
    note:'Los cursos responden a objetivos educativos, no a un diagnóstico del trauma. El estrés ayuda a elegir el ritmo.',
    preliminary:'Orientación educativa. Las escalas HH no tienen umbrales clínicos validados.',
    measurement:'Las puntuaciones HH no son diagnósticas. Puedes omitir las preguntas de habilidades.',
    safety:'El curso no se supervisa en tiempo real. Ante peligro inmediato o deterioro grave, busca ayuda humana o de urgencias.',
    reasons:{
      gentle_start:'La pausa y la orientación parecen menos accesibles; sugerimos un ritmo muy suave.',
      reported_overload:'La carga o tensión es elevada en los rangos provisionales.',
      reported_moderate:'Las puntuaciones sugieren carga moderada.',
      reported_mild:'La carga descrita es relativamente leve.',
      maintenance:'La carga es baja; puede ayudar practicar resiliencia.',
      reported_functioning:'La dificultad cotidiana sugiere un inicio más suave.',
      exploratory:'Faltan datos de habilidades; la estabilización es una sugerencia inicial.',
      goal_preference:'Tu objetivo elegido orienta la recomendación, no es un diagnóstico.',
      emotional_skills:'Pueden ayudar las habilidades de reconocer emociones y buscar apoyo.',
      self_support:'Puede convenir aprender autocompasión y apoyo interior.',
      daily_function:'Una meta de pasos pequeños puede ayudar en las tareas cotidianas.',
      general_stabilization:'La estabilización es un posible primer paso educativo.',
    },
  },
}
function savedWeekly(profile){
  const ids=['weekly.load','weekly.tension','weekly.functioning']
  const relevant=ids.map(id=>profile?.scales?.find(s=>s.testKey==='hh-weekly-pulse'&&s.id==='hh-weekly-pulse::'+id &&
    Number.isInteger(s.score)&&s.min===0&&s.max===10&&s.recent &&
    Number.isFinite(Date.parse(s.measuredAt||''))&&Date.parse(s.measuredAt)<=Date.now()&&
    Date.now()-Date.parse(s.measuredAt)<=7*86400000))
  if(relevant.some(row=>!row)||new Set(relevant.map(row=>row.resultId)).size!==1)return null
  return Object.fromEntries(ids.map((id,index)=>[id,relevant[index].score]))
}
export default function AntiStressModuleFinder({locale='en',profile,busy=false,onStart}){
  const language=['ru','en','es'].includes(locale)?locale:'en',t=words[language]
  const [answers,setAnswers]=useState({})
  const [chosenRoute,setChosenRoute]=useState(null)
  const weekly=useMemo(()=>savedWeekly(profile),[profile])
  const recommendation=useMemo(()=>recommendAntistressModule({
    weekly:weekly||{},answers,goal:chosenRoute,
  }),[weekly,answers,chosenRoute])
  const chosen=chosenRoute||recommendation.moduleId
  const selected=ANTISTRESS_MODULE_GOALS.find(item=>item.id===chosen)
  const recommended=ANTISTRESS_MODULE_GOALS.find(item=>item.id===recommendation.moduleId)
  const canStart=Boolean(weekly)&&chosen!=='AS4'&&!busy&&typeof onStart==='function'
  const clinicianNotice=language==='ru'?'Курс 4 проводится только при подтверждённом сопровождении квалифицированного специалиста; самостоятельный запуск недоступен.':language==='es'?'El curso 4 requiere acompañamiento profesional verificado; no se puede iniciar sin especialista.':'Course 4 needs verified qualified clinician support and cannot be started independently.'
  const extraResults=(Array.isArray(profile?.scales)?profile.scales:[]).filter(item=>
    item.testKey!=='hh-weekly-pulse'&&item.recent&&Number.isFinite(item.score)&&
    Number.isFinite(item.min)&&Number.isFinite(item.max)).slice(0,8)
  const startDayOne=()=>{
    if(!canStart)return
    onStart({
      moduleId:chosen,
      answers:Object.fromEntries(ANTISTRESS_MODULE_FINDER_ITEMS.map(item=>[item.id,answers[item.id]??null])),
      goal:chosenRoute||'undecided',
    })
  }
  const startButton=<button type="button" className={styles.cta} data-course-consent-module
    disabled={!canStart} onClick={startDayOne}>
    <span>{busy?t.starting:t.start}</span><ArrowRight size={21} aria-hidden="true"/>
  </button>
  return <section className={styles.root} data-course-module-finder data-opora-route-version={recommendation.version}>
    <section className={styles.recommendation} aria-label={t.title} aria-live="polite"
      data-module-recommendation={recommendation.moduleId}>
      <div className={styles.recommendTop}>
        <span className={styles.kicker}><ShieldCheck size={17} aria-hidden="true"/>{t.kicker}</span>
        <span className={styles.dayTag}>{t.day}</span>
      </div>
      <p className={styles.eyebrow}><CheckCircle2 size={16} aria-hidden="true"/>{t.eyebrow}</p>
      <h2>{t.title}</h2>
      <div className={styles.routeName}><span className={styles.routeNumber}>{chosen.slice(2)}</span>
        <strong>{selected?.title[language]||selected?.title.en}</strong>
      </div>
      <p className={styles.heroHint}>{chosenRoute?t.chosen+': '+t.based:t.based}</p>
      {startButton}
      {!weekly&&<p className={styles.unavailable} role="status">{t.weekMissing}</p>}
      {chosen==='AS4'&&<p className={styles.unavailable} role="status">{clinicianNotice}</p>}
    </section>

    <section className={styles.moduleSection} aria-labelledby="opora-module-options" data-opora-route-picker>
      <div className={styles.sectionHeading}>
        <h3 id="opora-module-options">{t.modules}</h3>
        <p>{t.modulesHint}</p>
      </div>
      <div className={styles.moduleGrid}>
        {ANTISTRESS_MODULE_GOALS.map((item,index)=>
          <button type="button" key={item.id} className={styles.moduleChoice}
            data-selected={chosen===item.id} aria-pressed={chosen===item.id}
            disabled={busy} onClick={()=>setChosenRoute(item.id)}>
            <span className={styles.moduleIndex}>{String(index+1).padStart(2,'0')}</span>
            <span className={styles.moduleBody}>
              <strong>{item.title[language]||item.title.en}</strong>
              <small>{item.short[language]||item.short.en}</small>
            </span>
            <span className={styles.moduleSide}>
              {item.id===recommendation.moduleId&&<span className={styles.recommendedBadge}>{t.recommended}</span>}
              <span className={styles.band}>{item.clinicalOnly?(language==='ru'?'Со специалистом':language==='es'?'Con especialista':'Clinician only'):(language==='ru'?'14 дней':language==='es'?'14 días':'14 days')}</span>
              {chosen===item.id&&<CheckCircle2 size={20} aria-hidden="true"/>}
            </span>
          </button>
        )}
      </div>
      {chosenRoute&&chosenRoute!==recommendation.moduleId&&
        <button className={styles.resetButton} type="button" disabled={busy}
          onClick={()=>setChosenRoute(null)}>{t.reset}<ArrowRight size={15} aria-hidden="true"/></button>}
    </section>

    <details className={styles.results} data-opora-results>
      <summary><span className={styles.summaryIcon}><ClipboardCheck size={21} aria-hidden="true"/></span>
        <span className={styles.summaryText}><strong>{t.results}</strong>
          <small>{t.weekly}{extraResults.length?' · +'+extraResults.length:''}</small></span>
        <ChevronDown className={styles.chevron} size={20} aria-hidden="true"/>
      </summary>
      <div className={styles.resultsBody}>
        <div className={styles.weeklyScales}>
          {[['weekly.load',t.load],['weekly.tension',t.tension],['weekly.functioning',t.functioning]].map(([key,label])=>
            <div key={key}><small>{label}</small><strong>{weekly?.[key]??'—'}<span> /10</span></strong></div>)}
        </div>
        {extraResults.length>0&&<div className={styles.extraResults}>
          <h4>{t.otherTests}</h4>
          {extraResults.map(item=><div className={styles.extraRow} key={item.id}>
            <span>{item.testTitle} · {item.label}</span><strong>{item.score} / {item.max}</strong>
          </div>)}
        </div>}
        <h4>{t.why}</h4>
        <p>{t.reasons[recommendation.reason]||t.based}</p>
        <p className={styles.muted}>{t.moreDetails} {t.preliminary}</p>
      </div>
    </details>

    <details className={styles.skills} data-opora-skills open>
      <summary><span className={styles.summaryIcon}><SlidersHorizontal size={19} aria-hidden="true"/></span>
        <span className={styles.summaryText}><strong>{t.skills}</strong>
          <small>{t.skillsHint}</small></span>
        <ChevronDown className={styles.chevron} size={20} aria-hidden="true"/>
      </summary>
      <div className={styles.skillsBody}>
        <p>{t.question}</p>
        <div className={styles.questions}>
          {ANTISTRESS_MODULE_FINDER_ITEMS.map(({id,text})=>
            <fieldset className={styles.question} key={id} data-finder-item={id}>
              <legend><span>{id}</span>{text[language]||text.en}</legend>
              <div className={styles.rangeHeader}><small>{t.low}</small><strong>
                {answers[id]===undefined||answers[id]===null?t.skip:answers[id]+'/10'}
              </strong><small>{t.high}</small></div>
              <input type="range" aria-label={text[language]||text.en} min={0} max={10} step={1}
                value={answers[id]??5} disabled={busy}
                onChange={event=>setAnswers(current=>({...current,[id]:Number(event.target.value)}))}/>
              <button className={styles.skip} type="button" disabled={busy}
                aria-pressed={answers[id]===null}
                onClick={()=>setAnswers(current=>({...current,[id]:null}))}>{t.skip}</button>
            </fieldset>)}
        </div>
        <p className={styles.muted}>{t.measurement}</p>
      </div>
    </details>

    <section className={styles.bottomStart} data-opora-bottom-start>
      <div><span className={styles.bottomEyebrow}>{t.day}</span>
        <h3>{t.footerTitle}</h3><p>{t.footerText}</p></div>
      <button type="button" className={styles.cta} disabled={!canStart} onClick={startDayOne}>
        <span>{busy?t.starting:t.start}</span><ArrowRight size={21} aria-hidden="true"/>
      </button>
      {!weekly&&<small className={styles.unavailable}>{t.weekMissing}</small>}
      {chosen==='AS4'&&<small className={styles.unavailable}>{clinicianNotice}</small>}
      <small className={styles.smallPrint}>{t.note} {t.safety}</small>
    </section>
  </section>
}
