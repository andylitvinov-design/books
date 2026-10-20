'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronDown, ClipboardCheck, Download, LockKeyhole, PauseCircle, PlayCircle, Target, TrendingUp } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import {
  BUSINESS_TRACKS, BUSINESS_DOMAINS, BUSINESS_QUESTIONS,
  BUSINESS_RESPONSE_LABELS, BUSINESS_WEEKS, BUSINESS_METRICS,
  businessSnapshotScores, businessSuggestions, businessProgress, businessDay, businessSurveyChanges, businessMetricChanges,
} from '@/lib/business-coaching/program'
import styles from './business-coaching.module.css'

const copy = {
  en: {
    eyebrow:'BUSINESS & CAREER · MY DEVELOPMENT PATH', title:'My 90-day business journey',
    description:'Define an achievable goal, explore your working habits, practise small actions and track real changes privately.',
    begin:'Build my free plan', start:'Start my 90-day programme',
    track:'Where are you now?', goal:'My main goal for 90 days', supporting:'A supporting goal (optional)',
    habit:'One habit to develop (optional)', chooseMetric:'A measurable indicator (optional)',
    target:'Desired value (optional)', currency:'Currency', privacy:'Only you can see these notes and figures. They are not shared with practitioners or advertising systems.',
    consent:'I choose this learning programme and agree to save my private answers, actions and progress in my Holistic House account.',
    questionnaire:'My business snapshot', questionnaireHelp:'An original Holistic House self-reflection, not a validated psychological test. Think about the last 14 days; skip questions that do not fit.',
    scoring:'0 = never · 4 = consistently. Missing answers remain unmeasured.',
    notMeasured:'Not assessed', private:'Private', saved:'Saved to your private account.',
    loadError:'Could not load your private course. Try again.', saveError:'Could not save. Please try again.',
    conflict:'Your course changed in another tab. Reload before editing further.',
    today:'Today', plan:'90-day plan', survey:'Self-check', metrics:'Indicators', report:'My report',
    progress:'Practices completed', day:'Day', week:'Week', practice:'My practical action', note:'What I did or noticed (optional)',
    completed:'Action completed', saveAction:'Save my action', selectDay:'Choose a day', suggested:'Possible learning directions',
    suggestedNote:'These are optional topics based on your self-reported answers, not diagnoses or personal shortcomings.',
    planIntro:'Each week offers 7 short, real-world actions. Days 85–90 are for review and integration. Work at your own pace.',
    weeklyReview:'Weekly reflection', reviewPlaceholder:'What did I try? What did I observe? What should change next?',
    saveReview:'Save weekly reflection', measurement:'Repeat my snapshot', retest:'Save new snapshot', retestDue:'Another comparable check-in becomes available at least 21 days after the previous one.',
    original:'Starting snapshot', latest:'Most recent snapshot', personal:'Original HH questionnaire · 14-day recall · self-report',
    records:'Business indicators (entered by me)', metric:'Indicator', value:'Value', from:'Period start', to:'Period end',
    addMetric:'Save observation', metricInfo:'Optional real-world numbers. Pick matching timeframes and currencies. Zero is a valid entry; leaving blank means unknown.',
    noMetrics:'No recorded business indicators yet. This is not zero.',
    source:'Manually reported', time:'Period', change:'Difference', unknown:'Insufficient comparable information',
    reportIntro:'Your factual course history, goals, actions, snapshots and self-entered results. Participation does not prove a business outcome was caused by this course.',
    print:'Print / Save PDF', pause:'Pause', resume:'Resume', finish:'Finish my cycle', paused:'Course paused — your previous work is safe.',
    finished:'Course completed. Your private history remains available.', reload:'Reload', lessons:'Learning days',
    notes:'Notes', actions:'Actions', trackLabel:'Learning path', targetHelp:'A personal target is optional, never a guaranteed outcome.',
    inactive:'Resume the programme to make changes.', noSurvey:'No initial survey was saved; nothing is scored as zero.',
    insight:'Your own answers can guide elective skill-practice topics. They are not professional psychometrics.',
    status:'Programme status', saveGoal:'Update my goals', editGoal:'Edit goals', back:'Back',
    daySaved:'Saved', checkinDue:'Check-ins may only be repeated after 21 days.', export:'Export all my Cabinet data',
    relatedTests:'Explore other tests in My Tests', describeChange:'Comparable changes', noComparison:'At least two compatible measurements are needed before we can compare outcomes.',
    differenceNote:'Changes below are descriptive, not evidence that the course caused the result.', editCancel:'Cancel',
  },
  ru: {
    eyebrow:'БИЗНЕС И КАРЬЕРА · МОЙ МАРШРУТ РАЗВИТИЯ', title:'Мои 90 дней развития',
    description:'Определите реалистичную цель, исследуйте рабочие привычки, выполняйте небольшие задания и сохраняйте реальные результаты.',
    begin:'Создать мой бесплатный план', start:'Начать мою программу',
    track:'Ваша текущая ситуация', goal:'Моя главная цель на 90 дней', supporting:'Дополнительная цель (необязательно)',
    habit:'Одна привычка для развития (необязательно)', chooseMetric:'Измеримый показатель (необязательно)',
    target:'Желаемое значение (необязательно)', currency:'Валюта', privacy:'Заметки и цифры видны только вам. Они не отправляются мастерам и в рекламные системы.',
    consent:'Я сам(а) выбираю эту обучающую программу и согласен(на) сохранять мои ответы, задания и прогресс в личном кабинете Holistic House.',
    questionnaire:'Мой бизнес-профиль', questionnaireHelp:'Авторское самонаблюдение Holistic House, не научно валидированный психотест. Вспомните последние 14 дней. Неподходящие вопросы можно пропустить.',
    scoring:'0 = никогда · 4 = почти всегда. Отсутствие ответа не означает ноль.',
    notMeasured:'Нет замера', private:'Личные данные', saved:'Сохранено в вашем личном кабинете.',
    loadError:'Не удалось загрузить личную программу. Попробуйте снова.', saveError:'Не удалось сохранить. Попробуйте снова.',
    conflict:'Программа изменилась в другой вкладке. Обновите страницу перед сохранением.',
    today:'Сегодня', plan:'План на 90 дней', survey:'Опросник', metrics:'Показатели', report:'Мой отчёт',
    progress:'Выполнено практик', day:'День', week:'Неделя', practice:'Практическое задание', note:'Что я сделал(а) или заметил(а) (по желанию)',
    completed:'Задание выполнено', saveAction:'Сохранить результат', selectDay:'Выберите день', suggested:'Возможные направления развития',
    suggestedNote:'Предложения основаны на ваших ответах и не означают диагноз или недостатки личности.',
    planIntro:'Каждая неделя содержит 7 небольших практических шагов. Дни 85–90 — закрепление и итоги. Двигайтесь в своём темпе.',
    weeklyReview:'Итоги недели', reviewPlaceholder:'Что попробовал(а)? Что заметил(а)? Что стоит изменить?',
    saveReview:'Сохранить обзор недели', measurement:'Повторить самооценку', retest:'Сохранить новый замер', retestDue:'Следующий сопоставимый опрос доступен не ранее 21 дня после предыдущего.',
    original:'Начальная самооценка', latest:'Последняя самооценка', personal:'Авторский опросник HH · последние 14 дней · самоотчёт',
    records:'Мои бизнес-показатели', metric:'Показатель', value:'Значение', from:'Начало периода', to:'Конец периода',
    addMetric:'Сохранить показатель', metricInfo:'Это добровольные реальные цифры. Для сравнения используйте одинаковые периоды и валюту. Ноль — ответ, пусто — неизвестно.',
    noMetrics:'Показателей пока нет. Это не означает ноль.',
    source:'Введено вручную', time:'Период', change:'Изменение', unknown:'Пока недостаточно сопоставимых данных',
    reportIntro:'История целей, действий, самооценок и введённых показателей. Прохождение курса само по себе не доказывает причин изменений в бизнесе.',
    print:'Печать / Сохранить PDF', pause:'Приостановить', resume:'Продолжить', finish:'Завершить цикл', paused:'Курс на паузе — все результаты сохранены.',
    finished:'Курс завершён. Личная история остаётся доступной.', reload:'Обновить', lessons:'Учебные дни',
    notes:'Заметки', actions:'Действия', trackLabel:'Направление', targetHelp:'Целевое значение необязательно и не является обещанием результата.',
    inactive:'Продолжите курс, чтобы вносить изменения.', noSurvey:'Первоначальный опрос не сохранён; пропущенные ответы не считаются нулём.',
    insight:'Ответы могут подсказать добровольные учебные темы, но не заменяют профессиональную психометрию.',
    status:'Статус программы', saveGoal:'Обновить цели', editGoal:'Изменить цели', back:'Назад',
    daySaved:'Сохранено', checkinDue:'Повторный опрос доступен через 21 день.', export:'Экспортировать все данные кабинета',
    relatedTests:'Посмотреть другие тесты в «Моих тестах»', describeChange:'Сопоставимые изменения', noComparison:'Для сравнения необходимы хотя бы два сопоставимых наблюдения.',
    differenceNote:'Изменения носят описательный характер и не доказывают, что их вызвал курс.', editCancel:'Отмена',
  },
}
const initialGoal = {track:'owner',primaryGoal:'',supportingGoal:'',habit:'',metric:'',target:'',currency:'CAD'}
const initialMetric = ()=>({metric:'enquiries',value:'',from:new Date().toISOString().slice(0,7)+'-01',to:new Date().toISOString().slice(0,10),currency:'CAD'})
function scoreLabel(score,t) { return score?.mean===null||score?.mean===undefined?t.notMeasured:score.mean.toFixed(1)+' / 4' }
function dateLabel(value,lang) {if(!value)return '—'; const d=new Date(value);return Number.isFinite(d.valueOf())?d.toLocaleDateString(lang==='ru'?'ru-RU':'en-CA'):'—'}
function Questionnaire({ answers, onChange, lang, t, disabled=false }) {
  return <div className={styles.questionnaire} data-business-snapshot>
    <h3>{t.questionnaire}</h3><p>{t.questionnaireHelp}</p><small>{t.scoring}</small>
    {BUSINESS_DOMAINS.map(domain=><fieldset key={domain.id} className={styles.domain}>
      <legend>{domain[lang]}</legend>
      {BUSINESS_QUESTIONS.filter(question=>question.domain===domain.id).map(q=><label key={q.id} className={styles.question}>
        <span>{q[lang]}</span>
        <select value={answers[q.id]??''} disabled={disabled} onChange={e=>{
          const v=e.target.value
          const next={...answers}
          if(v==='')delete next[q.id];else next[q.id]=Number(v)
          onChange(next)
        }} aria-label={q[lang]}>
          <option value="">— {t.notMeasured} —</option>
          {BUSINESS_RESPONSE_LABELS[lang].map((label,i)=><option value={i} key={i}>{i} · {label}</option>)}
        </select>
      </label>)}
    </fieldset>)}
  </div>
}
function ScoreTable({answers={},lang,t}){
  const scores=businessSnapshotScores(answers)
  return <div className={styles.scoreList} data-business-snapshot-scores>
    {scores.map(s=><div className={styles.scoreRow} key={s.id}>
      <span>{BUSINESS_DOMAINS.find(d=>d.id===s.id)?.[lang]}</span>
      {s.mean!==null?<div className={styles.track} aria-label={scoreLabel(s,t)}><span style={{width:s.mean/4*100+'%'}}/></div>:<span className={styles.missing}>—</span>}
      <strong>{scoreLabel(s,t)}</strong>
    </div>)}
  </div>
}
export default function BusinessCoaching({locale='en',accountId}){
  const lang=locale==='ru'?'ru':'en', t=copy[lang]
  const [state,setState]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
  const [error,setError]=useState(''),[notice,setNotice]=useState('')
  const [goal,setGoal]=useState(initialGoal),[consent,setConsent]=useState(false),[answers,setAnswers]=useState({})
  const [tab,setTab]=useState('today'),[day,setDay]=useState(1),[dayNote,setDayNote]=useState(''),[dayDone,setDayDone]=useState(false)
  const [reviewNote,setReviewNote]=useState(''),[metricForm,setMetricForm]=useState(initialMetric)
  const [retestAnswers,setRetestAnswers]=useState({}),[goalEditing,setGoalEditing]=useState(false)
  const course=state?.course,revision=state?.revision||0
  useEffect(()=>{
    if(!accountId)return
    let active=true
    setLoading(true)
    appFetch('business-coaching',undefined,'GET',{accountId}).then(result=>{
      if(active){
        setState(result);setError('')
        if(result.course){
          const next=Array.from({length:90},(_,i)=>i+1).find(i=>!result.course.days?.[i]?.done)||90
          setDay(next)
          setDayNote(result.course.days?.[next]?.note||'')
          setDayDone(Boolean(result.course.days?.[next]?.done))
          setReviewNote(result.course.reviews?.[Math.ceil(next/7)]?.note||'')
        }
      }
    }).catch(()=>{if(active)setError(t.loadError)}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[accountId,t.loadError])
  const progress=useMemo(()=>businessProgress(course),[course])
  const selected=businessDay(day,lang)
  const week=selected?.week||1
  const baseline=course?.surveys?.[0]
  const latest=course?.surveys?.at(-1)
  const surveyChanges=businessSurveyChanges(baseline,latest)
  const metricChanges=businessMetricChanges(course?.metrics||[])
  const suggestions=businessSuggestions(latest?.answers||{},course?.track||'owner')
  const metricKinds=useMemo(()=>new Map(BUSINESS_METRICS.map(m=>[m.id,m])),[])
  const due=!latest||Date.now()-Date.parse(latest.recordedAt)>=21*86400000
  async function refresh(){
    setBusy(true);setNotice('');setError('')
    try {setState(await appFetch('business-coaching',undefined,'GET',{accountId}))}
    catch{setError(t.loadError)}
    finally{setBusy(false)}
  }
  async function command(action,payload={}){
    if(busy)return false
    setBusy(true);setNotice('');setError('')
    try{
      const value=await appFetch('business-coaching',{action,revision,...payload},'POST',{accountId})
      setState(value);setNotice(t.saved)
      return true
    }catch(e){
      setError(e?.code==='BUSINESS_REVISION_CONFLICT'?t.conflict:
        e?.code==='BUSINESS_SURVEY_NOT_DUE'?t.checkinDue:t.saveError)
      return false
    }finally{setBusy(false)}
  }
  function chooseDay(next){
    setDay(next)
    setDayNote(course?.days?.[next]?.note||'')
    setDayDone(Boolean(course?.days?.[next]?.done))
    setReviewNote(course?.reviews?.[next<=84?Math.ceil(next/7):13]?.note||'')
    setTab('today')
  }
  async function saveStart(e){
    e.preventDefault()
    if(!consent)return
    const yes=await command('start',{...goal,metric:goal.metric||null,target:goal.target===''?null:Number(goal.target),answers,consent:true})
    if(yes){setTab('today');setDay(1);setDayNote('');setDayDone(false)}
  }
  async function saveMetric(e) {
    e.preventDefault()
    const yes=await command('metric',{...metricForm,value:Number(metricForm.value)})
    if(yes)setMetricForm(initialMetric())
  }
  function goalFields(edit=false){
    const value=goal
    return <div className={styles.fields}>
      {!edit&&<label>{t.track}
        <select value={value.track} onChange={e=>setGoal(v=>({...v,track:e.target.value}))}>
          {BUSINESS_TRACKS.map(track=><option key={track.id} value={track.id}>{track[lang]}</option>)}
        </select>
      </label>}
      <label>{t.goal}<textarea rows={2} required minLength={4} maxLength={240} value={value.primaryGoal}
        onChange={e=>setGoal(v=>({...v,primaryGoal:e.target.value}))} placeholder={lang==='ru'?'Например: наладить стабильный поток обращений':'For example: establish a sustainable flow of enquiries'}/></label>
      <label>{t.supporting}<input maxLength={180} value={value.supportingGoal} onChange={e=>setGoal(v=>({...v,supportingGoal:e.target.value}))}/></label>
      <label>{t.habit}<input maxLength={180} value={value.habit} onChange={e=>setGoal(v=>({...v,habit:e.target.value}))}/></label>
      <div className={styles.fieldRow}>
        <label>{t.chooseMetric}<select value={value.metric||''} onChange={e=>setGoal(v=>({...v,metric:e.target.value}))}>
          <option value="">—</option>{BUSINESS_METRICS.map(m=><option key={m.id} value={m.id}>{m[lang]}</option>)}
        </select></label>
        <label>{t.target}<input type="number" min="0" max="1000000000000" step="any" value={value.target??''}
          onChange={e=>setGoal(v=>({...v,target:e.target.value}))}/></label>
        <label>{t.currency}<select value={value.currency} onChange={e=>setGoal(v=>({...v,currency:e.target.value}))}>
          {['CAD','USD','EUR','GBP','UAH'].map(c=><option key={c}>{c}</option>)}
        </select></label>
      </div>
      <small>{t.targetHelp}</small>
    </div>
  }
  if(loading)return <section className={'hh-panel '+styles.root} aria-busy="true"><p>{lang==='ru'?'Открываем вашу программу…':'Opening your programme…'}</p></section>
  if(!state)return <section className={'hh-panel '+styles.root}><h1>{t.title}</h1><p role="alert">{error||t.loadError}</p><button onClick={refresh}>{t.reload}</button></section>
  if(!course)return <section className={'hh-panel '+styles.root} data-business-coaching>
    <div className={styles.eyebrow}><Target size={17}/>{t.eyebrow}</div>
    <header className={styles.hero}><h1>{t.title}</h1><p>{t.description}</p>
      <span className={styles.heroInfo}><LockKeyhole size={15}/>{t.privacy}</span>
    </header>
    <form onSubmit={saveStart} className={styles.startForm}>
      <h2>{t.begin}</h2>{goalFields()}
      <Questionnaire lang={lang} t={t} answers={answers} onChange={setAnswers}/>
      <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
        <span>{t.consent}</span></label>
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      <button className={styles.primary} type="submit" disabled={busy||!consent||goal.primaryGoal.trim().length<4}>
        <PlayCircle size={18}/>{busy?'…':t.start}<ArrowRight size={16}/></button>
    </form>
  </section>
  return <section className={'hh-panel '+styles.root} data-business-coaching>
    <div className={styles.eyebrow}><Target size={17}/>{t.eyebrow}</div>
    <header className={styles.hero}>
      <h1>{t.title}</h1><p>{course.goal.primaryGoal}</p>
      <div className={styles.statRow}>
        <span><CheckCircle2 size={17}/><strong>{progress.completed} / 90</strong> {t.progress}</span>
        <span><CalendarDays size={17}/>{dateLabel(course.startedAt,lang)}</span>
        <span><LockKeyhole size={17}/>{t.private}</span>
      </div>
      <div className={styles.overallTrack}><span style={{width:progress.percent+'%'}}/></div>
    </header>
    {course.status==='active'&&<div className={styles.goalEditor}>
      {!goalEditing?<button type="button" className={styles.editGoalsToggle} onClick={()=>{
        setGoal({...course.goal,target:course.goal.target??''})
        setGoalEditing(true)
      }}><Target size={16}/>{t.editGoal}</button>:<form className={styles.editGoalsForm} onSubmit={async e=>{
        e.preventDefault()
        const ok=await command('goal',{...goal,metric:goal.metric||null,
          target:goal.target===''?null:Number(goal.target)})
        if(ok)setGoalEditing(false)
      }}>
        <h2>{t.editGoal}</h2>{goalFields(true)}
        <div className={styles.goalButtons}>
          <button type="submit" className={styles.primary} disabled={busy||goal.primaryGoal.trim().length<4}>{t.saveGoal}</button>
          <button type="button" onClick={()=>setGoalEditing(false)}>{t.editCancel}</button>
        </div>
      </form>}
    </div>}
    <nav className={styles.tabs} aria-label={t.title}>
      {[['today',t.today,BookOpen],['plan',t.plan,CalendarDays],['survey',t.survey,ClipboardCheck],
        ['metrics',t.metrics,TrendingUp],['report',t.report,Download]].map(([id,label,Icon])=>
        <button key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)} type="button"><Icon size={16}/>{label}</button>)}
    </nav>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {notice&&<p role="status" className={styles.notice}><CheckCircle2 size={16}/>{notice}</p>}
    {course.status!=='active'&&<p className={styles.notice}>{course.status==='paused'?t.paused:t.finished}</p>}
    {tab==='today'&&<div className={styles.panel}>
      <div className={styles.dayHeading}>
        <div><small>{t.week} {week} · {t.day} {day} / 90</small><h2>{selected.title}</h2><p>{selected.intro}</p></div>
        <label>{t.selectDay}<select value={day} onChange={e=>chooseDay(Number(e.target.value))}>
          {Array.from({length:90},(_,i)=>i+1).map(n=><option value={n} key={n}>{t.day} {n}{course.days?.[n]?.done?' ✓':''}</option>)}
        </select></label>
      </div>
      <div className={styles.actionCard}><div className={styles.actionIcon}><Target size={20}/></div>
        <div><strong>{t.practice}</strong><p>{selected.action}</p></div>
      </div>
      <label className={styles.textareaLabel}>{t.note}
        <textarea rows={4} value={dayNote} maxLength={900} onChange={e=>setDayNote(e.target.value)}
          placeholder={t.reviewPlaceholder} disabled={course.status!=='active'}/>
      </label>
      <label className={styles.checkbox}><input type="checkbox" checked={dayDone} disabled={course.status!=='active'}
        onChange={e=>setDayDone(e.target.checked)}/>{t.completed}</label>
      <button type="button" className={styles.primary} disabled={busy||course.status!=='active'}
        onClick={()=>command('day',{day,done:dayDone,note:dayNote})}><CheckCircle2 size={17}/>{t.saveAction}</button>
      <hr className={styles.divider}/>
      <details className={styles.review} key={week}><summary>{t.weeklyReview} · {t.week} {week}<ChevronDown size={17}/></summary>
        <textarea rows={3} maxLength={1500} value={reviewNote} onChange={e=>setReviewNote(e.target.value)}
          placeholder={t.reviewPlaceholder} disabled={course.status!=='active'}/>
        <button type="button" disabled={busy||course.status!=='active'} onClick={()=>command('weekly-review',{week,note:reviewNote})}>{t.saveReview}</button>
      </details>
      <div className={styles.paging}><button disabled={day===1} onClick={()=>chooseDay(day-1)} type="button">← {t.day} {day-1}</button>
        <button disabled={day===90} onClick={()=>chooseDay(day+1)} type="button">{t.day} {day+1} →</button></div>
    </div>}
    {tab==='plan'&&<div className={styles.panel} data-business-plan>
      <p>{t.planIntro}</p><div className={styles.weekList}>
        {BUSINESS_WEEKS.map(w=>{
          const completed=w.tasks.filter(item=>course.days?.[item.day]?.done).length
          return <details key={w.week} className={styles.week} open={w.week===week||undefined}>
            <summary><span className={styles.weekNumber}>{String(w.week).padStart(2,'0')}</span>
              <span className={styles.weekTitle}><strong>{w.title[lang]}</strong><small>{w.introduction[lang]}</small></span>
              <span className={styles.weekCount}>{completed}/7</span><ChevronDown size={17}/></summary>
            <div className={styles.tasks}>{w.tasks.map(d=><button key={d.day} type="button" onClick={()=>chooseDay(d.day)}>
              <span className={course.days?.[d.day]?.done?styles.doneMark:styles.emptyMark}>{course.days?.[d.day]?.done?'✓':d.day}</span>
              {d[lang]}</button>)}</div>
          </details>
        })}
        <div className={styles.finalWeek}><strong>{lang==='ru'?'Дни 85–90 · Закрепление':'Days 85–90 · Integration'}</strong>
          <div className={styles.tasks}>{Array.from({length:6},(_,i)=>businessDay(i+85,lang)).map(d=>
            <button key={d.day} onClick={()=>chooseDay(d.day)} type="button">
              <span className={course.days?.[d.day]?.done?styles.doneMark:styles.emptyMark}>{course.days?.[d.day]?.done?'✓':d.day}</span>{d.action}
            </button>)}</div></div>
      </div>
    </div>}
    {tab==='survey'&&<div className={styles.panel}>
      <h2>{t.original}</h2>
      {baseline?<ScoreTable t={t} lang={lang} answers={baseline.answers}/>:<p>{t.noSurvey}</p>}
      <p className={styles.finePrint}>{t.personal}</p>
      <h3>{t.suggested}</h3><p>{t.suggestedNote}</p>
      <div className={styles.chips}>{suggestions.map(id=><span key={id}>{BUSINESS_DOMAINS.find(d=>d.id===id)?.[lang]}</span>)}</div>
      {latest&&latest!==baseline&&<><h3>{t.latest} · {dateLabel(latest.recordedAt,lang)}</h3><ScoreTable t={t} lang={lang} answers={latest.answers}/></>}
      <details className={styles.surveyDetails}><summary>{t.measurement}<ChevronDown size={17}/></summary>
        <p>{t.retestDue}</p>
        <Questionnaire t={t} lang={lang} answers={retestAnswers} onChange={setRetestAnswers} disabled={!due||course.status==='completed'}/>
        <button type="button" className={styles.primary} disabled={busy||!due||course.status==='completed'||Object.keys(retestAnswers).length<6}
          onClick={async()=>{if(await command('survey',{answers:retestAnswers}))setRetestAnswers({})}}>{t.retest}</button>
      </details>
      {surveyChanges.length>0&&<section className={styles.changes} data-business-survey-comparison>
        <h3>{t.describeChange}</h3><p className={styles.finePrint}>{t.differenceNote}</p>
        {surveyChanges.map(m=><div key={m.id} className={styles.changeRow}>
          <span>{BUSINESS_DOMAINS.find(d=>d.id===m.id)?.[lang]}</span>
          <strong>{m.previous.toFixed(1)} → {m.latest.toFixed(1)} ({m.delta>0?'+':''}{m.delta.toFixed(1)})</strong>
        </div>)}
      </section>}
      <p className={styles.finePrint}>{t.insight}</p>
      <Link href={'/'+lang+'/app/tests'} prefetch={false} className={styles.relatedTests}>{t.relatedTests}<ArrowRight size={16}/></Link>
    </div>}
    {tab==='metrics'&&<div className={styles.panel}>
      <h2>{t.records}</h2><p>{t.metricInfo}</p>
      <form className={styles.metricForm} onSubmit={saveMetric}>
        <label>{t.metric}<select value={metricForm.metric} onChange={e=>setMetricForm(v=>({...v,metric:e.target.value}))}>
          {BUSINESS_METRICS.map(m=><option key={m.id} value={m.id}>{m[lang]}</option>)}
        </select></label>
        <label>{t.value}<input type="number" required min="0" step={metricKinds.get(metricForm.metric)?.unit==='count'?'1':'any'} max="1000000000000"
          value={metricForm.value} onChange={e=>setMetricForm(v=>({...v,value:e.target.value}))}/></label>
        {metricKinds.get(metricForm.metric)?.unit==='money'&&<label>{t.currency}<select value={metricForm.currency} onChange={e=>setMetricForm(v=>({...v,currency:e.target.value}))}>
          {['CAD','USD','EUR','GBP','UAH'].map(currency=><option key={currency}>{currency}</option>)}</select></label>}
        <label>{t.from}<input required type="date" value={metricForm.from} max={metricForm.to}
          onChange={e=>setMetricForm(v=>({...v,from:e.target.value}))}/></label>
        <label>{t.to}<input required type="date" max={new Date().toISOString().slice(0,10)} min={metricForm.from}
          value={metricForm.to} onChange={e=>setMetricForm(v=>({...v,to:e.target.value}))}/></label>
        <button type="submit" className={styles.primary} disabled={busy}>{t.addMetric}</button>
      </form>
      {metricChanges.length>0&&<div className={styles.changes} data-business-metric-comparisons>
        <h3>{t.describeChange}</h3><p className={styles.finePrint}>{t.differenceNote}</p>
        {metricChanges.map(m=><div key={m.metric+'-'+m.unit+'-'+(m.currency||'')} className={styles.changeRow}>
          <span>{metricKinds.get(m.metric)?.[lang]}</span>
          <strong>{m.previous.value} → {m.latest.value} {m.currency||''}
            {' · '}{m.delta>0?'+':''}{m.delta}{m.percentage===null?'':' ('+(m.percentage>0?'+':'')+m.percentage+'%)'}
          </strong>
          <small>{m.previous.from} – {m.previous.to} / {m.latest.from} – {m.latest.to}</small>
        </div>)}
      </div>}
      {course.metrics.length?<div className={styles.metricRecords}>{[...course.metrics].reverse().map(m=><div key={m.id} className={styles.metricRecord}>
        <strong>{metricKinds.get(m.metric)?.[lang]||m.metric}</strong>
        <span className={styles.metricValue}>{m.value.toLocaleString(lang==='ru'?'ru-RU':'en-CA')}{m.currency?' '+m.currency:''}</span>
        <small>{m.from} — {m.to} · {t.source}</small>
      </div>)}</div>:<p className={styles.empty}>{t.noMetrics}</p>}
    </div>}
    {tab==='report'&&<div className={styles.panel} id="hh-business-printable-report">
      <div className={styles.reportHead}><div><h2>{t.report}</h2><p>{t.reportIntro}</p></div>
        <button type="button" onClick={()=>window.print()} className={styles.print}><Download size={17}/>{t.print}</button></div>
      <div className={styles.reportBlock}><h3>{t.goal}</h3><p>{course.goal.primaryGoal}</p>
        {course.goal.supportingGoal&&<p>{course.goal.supportingGoal}</p>}
        {course.goal.habit&&<p>{course.goal.habit}</p>}
        <p>{t.trackLabel}: {BUSINESS_TRACKS.find(x=>x.id===course.track)?.[lang]||course.track}</p>
        <p>{t.progress}: <strong>{progress.completed}/90</strong></p></div>
      <div className={styles.reportBlock}><h3>{t.original}</h3>{baseline?<ScoreTable answers={baseline.answers} lang={lang} t={t}/>:t.noSurvey}</div>
      {latest&&latest!==baseline&&<div className={styles.reportBlock}><h3>{t.latest}</h3><ScoreTable answers={latest.answers} lang={lang} t={t}/></div>}
      {surveyChanges.length>0&&<div className={styles.reportBlock}>
        <h3>{t.describeChange} · {t.survey}</h3>
        {surveyChanges.map(m=><p key={m.id}>{BUSINESS_DOMAINS.find(d=>d.id===m.id)?.[lang]}:
          {' '}{m.previous.toFixed(1)} → {m.latest.toFixed(1)} ({m.delta>0?'+':''}{m.delta.toFixed(1)})</p>)}
      </div>}
      <div className={styles.reportBlock}><h3>{t.actions}</h3>
        {Object.entries(course.days).filter(([,d])=>d.done).sort((a,b)=>Number(a[0])-Number(b[0])).map(([k,d])=>
          <p key={k}><strong>{t.day} {k}.</strong> {businessDay(Number(k),lang)?.action}{d.note?' — '+d.note:''}</p>)}
        {!progress.completed&&<p>—</p>}
      </div>
      <div className={styles.reportBlock}><h3>{t.notes}</h3>
        {Object.entries(course.reviews).sort((a,b)=>Number(a[0])-Number(b[0])).map(([k,d])=>
          <p key={k}><strong>{t.week} {k}.</strong> {d.note}</p>)}
      </div>
      <div className={styles.reportBlock}><h3>{t.records}</h3>
        {course.metrics.length?course.metrics.map(m=><p key={m.id}><strong>{metricKinds.get(m.metric)?.[lang]}:</strong> {m.value} {m.currency||''}
          {' · '}{m.from} – {m.to} ({t.source})</p>):<p>{t.noMetrics}</p>}
      </div>
      {metricChanges.length>0&&<div className={styles.reportBlock}>
        <h3>{t.describeChange} · {t.metrics}</h3>
        {metricChanges.map(m=><p key={m.metric}>{metricKinds.get(m.metric)?.[lang]}:
          {' '}{m.previous.value} → {m.latest.value} {m.currency||''} ({m.delta>0?'+':''}{m.delta})</p>)}
      </div>}
      <small className={styles.finePrint}>{t.personal} · {t.reportIntro} · {t.differenceNote}</small>
      <p className={styles.finePrint}><a href="/api/app/export" rel="nofollow">{t.export}</a></p>
    </div>}
    <footer className={styles.footer}>
      <span><LockKeyhole size={15}/>{t.privacy}</span>
      <div className={styles.footerActions}>
        {course.status==='active'&&<button type="button" disabled={busy} onClick={()=>command('pause')}><PauseCircle size={17}/>{t.pause}</button>}
        {course.status==='paused'&&<button type="button" disabled={busy} onClick={()=>command('resume')}><PlayCircle size={17}/>{t.resume}</button>}
        {course.status!=='completed'&&<button type="button" disabled={busy} onClick={()=>{
          if(window.confirm(lang==='ru'?'Завершить курс? История сохранится.':'Finish the course? Your history will be saved.'))void command('complete')
        }}>{t.finish}</button>}
      </div>
      <Link href={'/'+lang+'/app/portfolio'}>{t.back} · {lang==='ru'?'Отчёты':'Reports'}</Link>
    </footer>
  </section>
}
