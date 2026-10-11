'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight, CirclePause, ClipboardList, Clock3, HeartHandshake, Leaf, Lightbulb, RotateCcw, ShieldCheck, Sprout } from 'lucide-react'
import { GROWTH_GOALS } from '@/lib/inner-growth/course-model'
import CourseGuidedTimer from './course-guided-timer'
import styles from './course-today.module.css'

const UI={
 en:{
  welcome:'Your daily course',open:'Open',close:'Close',day:'Day',of:'of',mins:'minutes',daily:'My daily check-in',
  dailyText:'During the last 24 hours, how difficult was this specific problem?',high:'10 · Extremely difficult',low:'0 · Not difficult at all',
  impact:'How much did it interfere with your day? (optional)',resources:'How supported or capable did you feel? (optional)',
  addNote:'Optional private note',skip:'Skip this check-in',save:'Save today’s check-in',update:'Correct today’s check-in',
  saved:'Your check-in was saved. You can correct it without changing previous days.',
  thought:'Thought of the day',idea:'Why we practise this',meditation:'Guided practice',ritual:'Your small ritual',
  reflection:'Integration and reflection',afterNow:'How strong is the feeling RIGHT NOW, after the exercise? (optional)',
  beforeNow:'How strong was it RIGHT BEFORE the exercise? (optional)',feedback:'How did the practice feel?',
  helpful:'Helpful',neutral:'Neutral',uncomfortable:'Uncomfortable',noAnswer:'Prefer not to say',
  journal:'Optional private reflection',finish:'Save completed practice',finished:'Today’s practice is saved.',
  step:'Step',next:'Next step',start:'Start practice',restart:'Read again',short:'2-minute practice',
  standard:'Normal practice',comfort:'A gentler option',eyes:'Keep eyes open; breathe naturally. Skip any uncomfortable step.',
  stop:'Pause course',resume:'Resume course',paused:'Your course is paused. Come back whenever you are ready.',
  symptoms:'My problem over 14 days',history:'Daily self-reports, last 24 hours (0–10: higher means more difficulty). Missing days remain empty.',
  noScores:'No daily ratings saved yet.',engagement:'Practice days completed',changes:'Changes since my first observation',
  changeText:'These figures describe your answers, not a clinical diagnosis or proof that a lesson caused a change.',
  noChange:'Two recorded days are needed for a descriptive comparison.',
  weekly:'My weekly reflection',weeklyText:'What did you notice in your ordinary life? Which skills felt usable?',
  firstWeek:'Day 7 review',lastWeek:'Day 14 review',saveReview:'Save reflection',
  keep:'Continue my current direction',softer:'Choose gentler practices',rest:'Give myself more rest',
  completed:'You reached the end of this cycle. Your observations and history remain yours.',
  nextCycle:'Start another 14-day cycle',newGoal:'My next learning direction',
  problem:'The one problem I want to observe',intention:'One everyday skill I would like to practise (optional)',
  activate:'Start my daily 14-day course',activateText:'Your course has been updated. Confirm your personal problem to begin daily check-ins and reviewed lessons.',
  consent:'My daily problem ratings are an optional Holistic House self-monitoring tool, not a validated psychological test.',
  recommendations:'Review tests and recommendations',disclaimer:'Self-guided educational practice, not a psychotherapy session or real-time clinical monitoring.',
  error:'Could not save your information. Nothing has been marked complete; you can try again.',
  retry:'Try again',quickTip:'Any section can be skipped. Finishing does not require a special feeling.',
  lessonDone:'Already completed',count:'practices',outOf:'out of',rating:'rating',zero:'0',none:'Not answered',
  reviewSaved:'Your weekly reflection was saved.',private:'Private to your account',printReport:'Print or save my course report',
  checkinSchedule:'How often to offer a problem check-in',dailyFrequency:'Every day',alternateFrequency:'Every other day',weeklyFrequency:'Once a week',
  softerSuggestion:'The last practice felt uncomfortable. You can choose the short or no-imagery version today.',
  retestDue:'Your optional weekly self-report is due',retestLater:'Next eligible weekly self-report',startRetest:'Open this test',
  urgentHelp:'For immediate danger or thoughts of self-harm, contact local emergency or crisis services. This course is not monitored.',
  learn:'Read this thought',prompt:'Review the practice',dayReview:'Your week in perspective',
  action:'Try in ordinary life',markDone:'Finish today’s lesson',date:'Local course day',
 },
 ru:{
  welcome:'Ваш ежедневный курс',open:'Открыть',close:'Свернуть',day:'День',of:'из',mins:'минут',daily:'Мой ежедневный замер',
  dailyText:'Насколько выражена именно эта проблема за последние 24 часа?',high:'10 · Очень сильно',low:'0 · Совсем не было',
  impact:'Насколько проблема мешала вашим делам? (по желанию)',resources:'Насколько вы ощущали опору и доступные силы? (по желанию)',
  addNote:'Личная заметка (необязательно)',skip:'Пропустить замер',save:'Сохранить сегодняшний замер',update:'Исправить сегодняшний замер',
  saved:'Замер сохранён. Сегодня его можно исправить, не меняя предыдущие дни.',
  thought:'Афоризм дня',idea:'Для чего эта практика',meditation:'Направленная практика',ritual:'Маленький ритуал',
  reflection:'Интеграция и рефлексия',afterNow:'Насколько сильно ощущение ПРЯМО СЕЙЧАС после упражнения? (необязательно)',
  beforeNow:'Насколько сильно оно было НЕПОСРЕДСТВЕННО ПЕРЕД упражнением? (необязательно)',feedback:'Как прошла практика?',
  helpful:'Помогло',neutral:'Нейтрально',uncomfortable:'Было некомфортно',noAnswer:'Не хочу отвечать',
  journal:'Личная рефлексия (необязательно)',finish:'Сохранить выполнение',finished:'Сегодняшняя практика сохранена.',
  step:'Шаг',next:'Следующий шаг',start:'Начать практику',restart:'Прочитать ещё раз',short:'2-минутная практика',
  standard:'Обычная практика',comfort:'Более мягкий вариант',eyes:'Можно держать глаза открытыми и дышать естественно. Неудобный шаг пропускайте.',
  stop:'Поставить курс на паузу',resume:'Продолжить курс',paused:'Курс на паузе. Вернуться можно в удобное время.',
  symptoms:'Моя проблема за 14 дней',history:'Ежедневные самооценки за последние 24 часа (0–10: выше — труднее). Пропущенные дни остаются пустыми.',
  noScores:'Пока нет сохранённых ежедневных оценок.',engagement:'Пройденных дней практики',changes:'Динамика от первого наблюдения',
  changeText:'Цифры описывают ваши ответы, но не являются диагнозом и не доказывают, что изменения вызваны занятиями.',
  noChange:'Для описательного сравнения необходимы два разных дня с замерами.',
  weekly:'Мой недельный обзор',weeklyText:'Что вы заметили в обычной жизни? Какие упражнения были приемлемыми?',
  firstWeek:'Обзор дня 7',lastWeek:'Обзор дня 14',saveReview:'Сохранить обзор',
  keep:'Продолжить выбранное направление',softer:'Выбрать более мягкие практики',rest:'Дать себе больше отдыха',
  completed:'Вы завершили этот цикл. Все наблюдения и история остаются у вас.',
  nextCycle:'Начать ещё 14 дней',newGoal:'Новое направление развития',
  problem:'Проблема, за которой хочу наблюдать',intention:'Какой повседневный навык хочу развивать? (необязательно)',
  activate:'Начать мой ежедневный курс на 14 дней',activateText:'Ваш курс обновлён. Подтвердите личную проблему, чтобы начать ежедневные замеры и полноценные уроки.',
  consent:'Ежедневные оценки — авторское наблюдение Holistic House, не валидированный психологический тест.',
  recommendations:'Результаты тестов и рекомендации',disclaimer:'Самостоятельная образовательная практика, а не сеанс психотерапии или круглосуточное наблюдение специалиста.',
  error:'Не удалось сохранить данные. Ничего не отмечено как выполненное; можно попробовать ещё раз.',
  retry:'Повторить',quickTip:'Любой этап можно пропустить. Не требуется специально менять самочувствие.',
  lessonDone:'Уже выполнено',count:'практик',outOf:'из',rating:'оценка',zero:'0',none:'Нет оценки',
  reviewSaved:'Недельный обзор сохранён.',private:'Приватно в кабинете',printReport:'Распечатать или сохранить отчёт о курсе',
  checkinSchedule:'Как часто предлагать оценивать проблему',dailyFrequency:'Каждый день',alternateFrequency:'Через день',weeklyFrequency:'Раз в неделю',
  softerSuggestion:'Предыдущее упражнение было некомфортным. Сегодня можно выбрать короткую практику или вариант без визуализаций.',
  retestDue:'Подошёл срок дополнительного недельного замера',retestLater:'Следующий допустимый недельный замер',startRetest:'Открыть этот тест',
  urgentHelp:'При непосредственной опасности или мыслях о причинении себе вреда обратитесь в местную экстренную или кризисную службу. За курсом никто не следит в реальном времени.',
  learn:'Прочитать мысль',prompt:'Посмотреть упражнение',dayReview:'Неделя в перспективе',
  action:'Применить в обычной жизни',markDone:'Завершить сегодняшний урок',date:'Местный день курса',
 }
}
async function api(action,locale,body){
  const response=await fetch('/api/app/course/'+action+'?locale='+locale,{
    method:body?'POST':'GET',cache:'no-store',credentials:'same-origin',
    headers:body?{'Content-Type':'application/json'}:undefined,
    body:body?JSON.stringify(body):undefined,
  })
  const value=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(value.error||'SERVICE_UNAVAILABLE')
  return value
}
const choices=[null,0,1,2,3,4,5,6,7,8,9,10]
function Rating({value,onChange,label,optional=false}){
  return <label className={styles.rating}>
    <span>{label}</span>
    <select value={value===null?'':String(value)}
      onChange={e=>onChange(e.target.value===''?null:Number(e.target.value))}
      aria-label={label}>
      <option value="" disabled={!optional}>—</option>
      {choices.filter(x=>x!==null).map(x=><option key={x} value={x}>{x}/10</option>)}
    </select>
  </label>
}
function DailyCard({number,title,subtitle,icon:Icon,expanded,onToggle,completed,children}){
 return <section className={styles.card} data-course-card={number}>
  <button type="button" className={styles.cardHeader} aria-expanded={expanded} onClick={onToggle}>
    <span className={styles.cardIcon}><Icon aria-hidden="true" size={20}/></span>
    <span className={styles.cardTitle}><strong>{title}</strong><small>{subtitle}</small></span>
    {completed?<CheckCircle2 aria-label="Completed" size={19} className={styles.checked}/>:expanded?<ChevronDown size={18}/>:<ChevronRight size={18}/>}
  </button>
  {expanded&&<div className={styles.cardContent}>{children}</div>}
 </section>
}

export default function CourseToday({locale='en'}){
 const t=UI[locale]||UI.en,ru=locale==='ru',root='/'+locale+'/app'
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const [expanded,setExpanded]=useState('checkin'),[stage,setStage]=useState(0)
 const [severity,setSeverity]=useState(null),[interference,setInterference]=useState(null),[resource,setResource]=useState(null)
 const [dailyNote,setDailyNote]=useState(''),[beforeNow,setBeforeNow]=useState(null),[afterNow,setAfterNow]=useState(null)
 const [feedback,setFeedback]=useState('skip'),[reflection,setReflection]=useState('')
 const [reviewNote,setReviewNote]=useState(''),[reviewDecision,setReviewDecision]=useState('continue')
 const [targetLabel,setTargetLabel]=useState(''),[intention,setIntention]=useState(''),[newGoal,setNewGoal]=useState('calm_regulation')
 const hydrate=useCallback((response)=>{
  setData(response)
  if(response?.currentSession){
    setBeforeNow(response.currentSession.beforeNow)
    setAfterNow(response.currentSession.afterNow)
    setFeedback(response.currentSession.feedback||'skip')
  }
  if(response?.currentCheckin){
    setSeverity(response.currentCheckin.severity)
    setInterference(response.currentCheckin.interference)
    setResource(response.currentCheckin.resource)
    setDailyNote(response.currentCheckin.note||'')
  }
 },[])
 const reload=useCallback(async()=>{
  setLoading(true);setError('')
  try{hydrate(await api('today',locale))}catch(e){setError(e.message)}
  finally{setLoading(false)}
 },[hydrate,locale])
 useEffect(()=>{void reload()},[reload])
 async function submit(action,body={},after){
  setBusy(true);setError('')
  try {
    const result=await api(action,locale,body)
    hydrate(result)
    if(after)after()
  }catch(e){setError(e.message)}
  finally{setBusy(false)}
 }
 const timezone=()=>{
  try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return 'UTC'}
 }
 if(loading&&!data)return <section className={'hh-panel '+styles.shell} aria-busy="true">{ru?'Открываем ваш ежедневный курс…':'Opening your daily course…'}</section>
 if(!data)return <section className={'hh-panel '+styles.shell} role="alert"><p>{t.error}</p><button type="button" onClick={reload}>{t.retry}</button></section>
 const cycle=data.cycle,lesson=data.lesson,progress=data.progress||{},target=data.target||{},today=data.currentCheckin
 const session=data.currentSession,completed=Boolean(session),paused=cycle?.status==='paused',isFinished=cycle?.status==='completed'||Boolean(cycle?.afterCycle)
 const reportDay=cycle?.day>=14?14:cycle?.day>=7?7:null
 const reviewed=reportDay&&data.reviews?.some(r=>r.day===reportDay)
 const problem=target.label||''
 const activeName=GROWTH_GOALS[cycle?.primaryGoal]?.title?.[locale]||''
 const beforeValue=v=>v===null||v===undefined?null:v
 if(data.requiresTarget) return <section className={'hh-panel '+styles.shell}>
   <p className="hh-kicker">Holistic House · My Course</p><h2>{t.activateText}</h2>
   <label className={styles.field}>{t.problem}<input maxLength={160} value={targetLabel} onChange={e=>setTargetLabel(e.target.value)} placeholder={ru?'Напряжение при общении':'Tension during conversations'}/></label>
   <label className={styles.field}>{t.intention}<textarea maxLength={300} value={intention} onChange={e=>setIntention(e.target.value)} /></label>
   <p className={styles.hint}>{t.consent}</p>
   <button type="button" className="hh-primary" disabled={busy||targetLabel.trim().length<3}
     onClick={()=>submit('activate',{problemLabel:targetLabel,intention,timeZone:timezone()},()=>setExpanded('checkin'))}>{t.activate}</button>
   {error&&<p role="alert">{error==='URGENT_SUPPORT_NEEDED'?t.urgentHelp:t.error} ({error})</p>}
 </section>
 if(!cycle)return <section className={'hh-panel '+styles.shell}>{t.error}<button onClick={reload}>{t.retry}</button></section>
 return <section className={styles.shell} data-daily-course>
  <header className={styles.hero}>
    <div><p className="hh-kicker">MY COURSE · HOLISTIC HOUSE</p>
      <h2>{t.welcome}</h2><p className={styles.focus}>{activeName} · {problem}</p>
      <p className={styles.hint}>{t.day} {cycle.day} {t.of} {cycle.durationDays} · {t.date}: {cycle.todayLocalDate} · {cycle.timeZone}</p>
    </div>
    <div className={styles.counter}><strong>{progress.practiceCount||0}<span>/{cycle.durationDays}</span></strong><small>{t.count}</small></div>
  </header>
  <progress className={styles.progress} max={cycle.durationDays} value={progress.practiceCount||0} aria-label={t.engagement}/>
  {error&&<p className={styles.error} role="alert">{error==='URGENT_SUPPORT_NEEDED'?t.urgentHelp:t.error} ({error}) <button type="button" onClick={reload}>{t.retry}</button></p>}
  {paused&&<p className={styles.note}>{t.paused}</p>}
  {isFinished&&<p className={styles.notice}><CheckCircle2 size={20}/>{t.completed}</p>}
  {!isFinished&&<>
   <DailyCard number="checkin" title={'01 · '+t.daily} subtitle="~30 sec" icon={ClipboardList}
    expanded={expanded==='checkin'} onToggle={()=>setExpanded(x=>x==='checkin'?'':'checkin')} completed={Boolean(today)}>
    <p className={styles.hint}>{t.consent}</p>
    <label className={styles.field}>{t.checkinSchedule}
      <select disabled={busy||paused} value={cycle.preferences?.checkinFrequency||'daily'}
        onChange={e=>submit('preferences',{expectedRevision:cycle.revision,
          checkinFrequency:e.target.value,length:cycle.preferences?.length||'standard',
          imagery:cycle.preferences?.imagery||'optional'})}>
        <option value="daily">{t.dailyFrequency}</option>
        <option value="every_other_day">{t.alternateFrequency}</option>
        <option value="weekly">{t.weeklyFrequency}</option>
      </select>
    </label>
    <p><strong>{problem}</strong> — {t.dailyText}</p>
    <div className={styles.scale}><span>{t.low}</span><span>{t.high}</span></div>
    <Rating value={severity} onChange={setSeverity} label={t.dailyText}/>
    <Rating value={interference} onChange={setInterference} label={t.impact} optional/>
    <Rating value={resource} onChange={setResource} label={t.resources} optional/>
    <label className={styles.field}>{t.addNote}<textarea maxLength={500} rows={2} value={dailyNote} onChange={e=>setDailyNote(e.target.value)}/></label>
    {today&&<p className={styles.saved}><Check size={15}/>{t.saved}</p>}
    <div className={styles.actions}>
      <button type="button" disabled={busy||paused||!Number.isInteger(severity)} className="hh-primary" onClick={()=>submit('checkin',{
        severity,interference,resource,note:dailyNote,operationId:crypto.randomUUID(),
        ...(today?{expectedRevision:today.revision}:{})
      },()=>setExpanded('thought'))}>{today?t.update:t.save}<ArrowRight size={16}/></button>
      <button type="button" onClick={()=>setExpanded('thought')}>{t.skip}</button>
    </div>
   </DailyCard>
   <DailyCard number="thought" title={'02 · '+t.thought} subtitle={lesson?.title||''} icon={Lightbulb}
    expanded={expanded==='thought'} onToggle={()=>setExpanded(x=>x==='thought'?'':'thought')}>
      <blockquote className={styles.aphorism}>“{lesson?.aphorism}”</blockquote>
      <p>{lesson?.sections?.find(x=>x.kind==='learn')?.text}</p>
      <button type="button" className={styles.nextButton} onClick={()=>setExpanded('meditation')}>{t.next}<ArrowRight size={16}/></button>
   </DailyCard>
   <DailyCard number="meditation" title={'03 · '+t.meditation} subtitle={lesson?Math.ceil(lesson.durationSeconds/60)+' '+t.mins:''} icon={Leaf}
    expanded={expanded==='meditation'} onToggle={()=>setExpanded(x=>x==='meditation'?'':'meditation')}>
     <p className={styles.hint}>{t.eyes}</p>
     {data.gentleSuggested&&<p className={styles.note}>{t.softerSuggestion}</p>}
     <div className={styles.prefs}><button type="button" disabled={busy||paused} aria-pressed={cycle.preferences?.length==='quick'}
       onClick={()=>submit('preferences',{expectedRevision:cycle.revision,length:'quick',
         imagery:cycle.preferences?.imagery||'optional',checkinFrequency:cycle.preferences?.checkinFrequency||'daily'})}>{t.short}</button>
       <button type="button" disabled={busy||paused} aria-pressed={cycle.preferences?.length!=='quick'}
       onClick={()=>submit('preferences',{expectedRevision:cycle.revision,length:'standard',
         imagery:cycle.preferences?.imagery||'optional',checkinFrequency:cycle.preferences?.checkinFrequency||'daily'})}>{t.standard}</button>
       <button type="button" disabled={busy||paused} aria-pressed={cycle.preferences?.imagery==='no_imagery'}
       onClick={()=>submit('preferences',{expectedRevision:cycle.revision,length:cycle.preferences?.length||'standard',
         imagery:cycle.preferences?.imagery==='no_imagery'?'optional':'no_imagery',
         checkinFrequency:cycle.preferences?.checkinFrequency||'daily'})}>{t.comfort}</button>
     </div>
     <div className={styles.lessonStep}>
       <span>{t.step} {stage+1} {t.of} {lesson?.sections?.length||5} · <Clock3 size={13} aria-hidden="true"/> ~{lesson?.sections?.[stage]?.seconds||0}s</span>
       <h3>{lesson?.sections?.[stage]?.title}</h3>
       <p>{lesson?.sections?.[stage]?.text}</p>
       {lesson?.sections?.[stage] && <CourseGuidedTimer
         key={cycle.id+'-'+cycle.day+'-'+stage+'-'+(cycle.preferences?.length||'standard')}
         seconds={lesson.sections[stage].seconds} locale={locale}/>}
     </div>
     <div className={styles.actions}>
       <button type="button" className="hh-primary" onClick={()=>{
         if(stage < (lesson?.sections?.length||5)-1)setStage(x=>x+1)
         else {setStage(0);setExpanded('ritual')}
       }}>{stage<(lesson?.sections?.length||5)-1?t.next:t.action}<ArrowRight size={16}/></button>
       <button type="button" onClick={()=>setStage(0)}><RotateCcw size={15}/>{t.restart}</button>
     </div>
     <details className={styles.transcript}><summary>{t.prompt}</summary>
       {lesson?.sections?.map((s,i)=><p key={i}><strong>{i+1}. {s.title}</strong> — {s.text}</p>)}
     </details>
   </DailyCard>
   <DailyCard number="ritual" title={'04 · '+t.ritual} subtitle={t.action} icon={Sprout}
    expanded={expanded==='ritual'} onToggle={()=>setExpanded(x=>x==='ritual'?'':'ritual')}>
      <p>{lesson?.ritual}</p>
      <p className={styles.hint}>{t.quickTip}</p>
      <button type="button" className={styles.nextButton} onClick={()=>setExpanded('reflection')}>{t.next}<ArrowRight size={16}/></button>
   </DailyCard>
   <DailyCard number="reflection" title={'05 · '+t.reflection} subtitle={t.private} icon={HeartHandshake}
    expanded={expanded==='reflection'} onToggle={()=>setExpanded(x=>x==='reflection'?'':'reflection')} completed={completed}>
    <p>{lesson?.reflection}</p>
    <div className={styles.ratingPair}>
      <Rating optional label={t.beforeNow} value={beforeNow} onChange={setBeforeNow}/>
      <Rating optional label={t.afterNow} value={afterNow} onChange={setAfterNow}/>
    </div>
    <fieldset className={styles.feedback}><legend>{t.feedback}</legend>
      {[['helped',t.helpful],['neutral',t.neutral],['uncomfortable',t.uncomfortable],['skip',t.noAnswer]].map(([value,label])=>
      <label key={value}><input type="radio" name="course-feedback" checked={feedback===value} onChange={()=>setFeedback(value)}/>{label}</label>)}
    </fieldset>
    <label className={styles.field}>{t.journal}<textarea maxLength={500} rows={3} value={reflection} onChange={e=>setReflection(e.target.value)}/></label>
    {completed?<p className={styles.saved}><CheckCircle2 size={18}/>{t.finished}</p>:
      <button type="button" className="hh-primary" disabled={busy||paused} onClick={()=>submit('session',{
        operationId:crypto.randomUUID(),day:cycle.day,lessonId:lesson.id,feedback,
        beforeNow:beforeValue(beforeNow),afterNow:beforeValue(afterNow),reflection,
      },()=>setExpanded(''))}>{t.finish}<Check size={17}/></button>}
   </DailyCard>
  </>}
  <section className={styles.graph} aria-labelledby="course-problem-graph">
   <header><div><h3 id="course-problem-graph">{t.symptoms}</h3><p className={styles.hint}>{t.history}</p></div><span>{progress.observations||0} {t.rating}</span></header>
   <div className={styles.chart} role="img" aria-label={t.symptoms+': '+(progress.days||[]).map(d=>d.date+' '+(d.severity??t.none)).join('; ')}>
    {(progress.days||[]).map(d=><div className={styles.chartDay} key={d.day}>
      <div className={styles.barZone}>{d.severity!==null&&
        <span className={styles.bar} style={{height:Math.max(3,(d.severity/10)*100)+'%'}}
          title={d.date+': '+d.severity+'/10'}/>}</div>
      <span>{d.day}</span>
    </div>)}
   </div>
   {progress.comparison?<p className={styles.compare}>
     {t.changes}: {progress.comparison.from}/10 → {progress.comparison.to}/10
     <small> ({progress.comparison.change>0?'+':''}{progress.comparison.change})</small>
   </p>:<p className={styles.hint}>{t.noChange}</p>}
   <p className={styles.hint}>{t.changeText}</p>
  </section>
  {reportDay&&!reviewed&&<section className={styles.review}>
    <h3>{reportDay===7?t.firstWeek:t.lastWeek}</h3><p>{t.weeklyText}</p>
    <textarea rows={3} maxLength={650} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder={t.weeklyText}/>
    <fieldset className={styles.feedback}><legend>{t.dayReview}</legend>
      {[['continue',t.keep],['softer',t.softer],['rest',t.rest]].map(([value,label])=>
        <label key={value}><input type="radio" checked={reviewDecision===value} onChange={()=>setReviewDecision(value)} name="course-review-choice"/>{label}</label>)}
    </fieldset>
    <button type="button" className="hh-primary" disabled={busy} onClick={()=>submit('review',{
      operationId:crypto.randomUUID(),day:reportDay,decision:reviewDecision,note:reviewNote
    })}>{t.saveReview}<Check size={17}/></button>
   </section>}
  {reviewed&&<p className={styles.saved}><CheckCircle2 size={17}/>{t.reviewSaved}</p>}
  {isFinished&&<div className={styles.reportActions}>
    <button type="button" onClick={()=>window.print()}>{t.printReport}</button>
  </div>}
  {isFinished&&<section className={styles.review}>
    <h3>{t.nextCycle}</h3><label className={styles.field}>{t.problem}
      <input maxLength={160} value={targetLabel} onChange={e=>setTargetLabel(e.target.value)} placeholder={problem}/>
    </label>
    <label className={styles.field}>{t.intention}<textarea maxLength={300} value={intention} onChange={e=>setIntention(e.target.value)}/></label>
    <label className={styles.field}>{t.newGoal}<select value={newGoal} onChange={e=>setNewGoal(e.target.value)}>
      {Object.entries(GROWTH_GOALS).map(([id,item])=><option key={id} value={id}>{item.title[locale]}</option>)}
    </select></label>
    <button type="button" className="hh-primary" disabled={busy||targetLabel.trim().length<3}
      onClick={()=>submit('new-cycle',{problemLabel:targetLabel,intention,timeZone:timezone(),goal:newGoal},
        ()=>{setExpanded('checkin');setStage(0)})}>{t.nextCycle}<ArrowRight size={16}/></button>
   </section>}
  {data.recommendedTest&&<aside className={styles.retest}>
    <div><strong>{data.recommendedTest.due?t.retestDue:t.retestLater}</strong>
      <small>{data.recommendedTest.nextDueAt?.slice(0,10)} · {data.recommendedTest.explanation}</small></div>
    {data.recommendedTest.due&&<Link href={root+'/monitoring/hh-weekly-pulse'} prefetch={false}>
      {t.startRetest}<ChevronRight size={16}/></Link>}
  </aside>}
  <div className={styles.footer}>
    {!isFinished&&<button type="button" disabled={busy} onClick={()=>submit(paused?'resume':'pause',{expectedRevision:cycle.revision})}>
      {paused?<RotateCcw size={16}/>:<CirclePause size={16}/>}
      {paused?t.resume:t.stop}
    </button>}
    <Link href={root+'/portfolio'} prefetch={false}>{t.recommendations}<ChevronRight size={16}/></Link>
  </div>
  <p className={styles.footnote}><ShieldCheck size={16}/>{t.disclaimer}</p>
 </section>
}
