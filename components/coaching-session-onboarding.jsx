'use client'

import { COACHING_REQUEST_TOPICS, COACHING_CHECKIN_OPTIONS, coachingCheckinReply } from '@/lib/coaching/session-onboarding'
import CoachingChatThread from '@/components/coaching-chat-thread'
import styles from './coaching-session-onboarding.module.css'

const copy={
  en:{
    introStage:'01 · Meet your session',topicStage:'02 · Choose your topic',
    introLead:'A gentle, structured conversation with yourself. You will explore your situation through a series of short questions and leave with one possible next step.',
    duration:'Estimated time',model:'Based on',specialist:'Specialist / curator',
    specialistValue:'Andrey Litvinov · Holistic House',
    thinking:'Way of thinking',quick:'Practical, focused and step-by-step',
    reflective:'Reflective, exploring meaning and possibilities',
    outcome:'What to expect',questions:'guided questions',minutes:'minutes',
    selfGuided:'This is a self-guided session, not a live appointment with Andrey, a diagnosis or a guaranteed result.',
    topicTitle:'What would you like to explore today?',topicLead:'Choose what matters most now. You do not need to explain everything at once.',
    topicNote:'Your choice is only context for this session. You can explore a different topic in another session.',
    adult:'I confirm I am 18+ and choose to explore this adult topic voluntarily.',
  },
  ru:{
    introStage:'01 · Знакомство с сессией',topicStage:'02 · Выбор темы',
    introLead:'Мягкий разговор с собой по понятной методике. Вы последовательно ответите на короткие вопросы, проясните ситуацию и наметите один посильный шаг.',
    duration:'Примерное время',model:'Основа методики',specialist:'Специалист / куратор',
    specialistValue:'Андрей Литвинов · Holistic House',
    thinking:'Тип мышления',quick:'Практический, сфокусированный, шаг за шагом',
    reflective:'Рефлексивный: поиск смысла, возможностей и новых взглядов',
    outcome:'Чего ожидать',questions:'вопросов с подсказками',minutes:'минут',
    selfGuided:'Это самостоятельная коуч-сессия, а не живой приём Андрея, диагностика или обещание результата.',
    topicTitle:'С чем вам хотелось бы разобраться сегодня?',topicLead:'Начнём с того, что сейчас важнее всего. Необязательно сразу объяснять всё идеально.',
    topicNote:'Тема задаёт контекст беседы. Для другого запроса можно начать новую сессию.',
    adult:'Подтверждаю, что мне исполнилось 18 лет и я добровольно выбираю эту тему.',
  },
  es:{
    introStage:'01 · Conoce la sesión',topicStage:'02 · Elige el tema',
    introLead:'Una conversación amable y estructurada contigo. Explorarás la situación mediante preguntas breves y podrás elegir un siguiente paso realista.',
    duration:'Duración aproximada',model:'Modelo de base',specialist:'Especialista / coordinador',
    specialistValue:'Andrey Litvinov · Holistic House',
    thinking:'Forma de pensar',quick:'Práctica, enfocada y paso a paso',
    reflective:'Reflexiva: sentido, posibilidades y nuevas perspectivas',
    outcome:'Qué puedes esperar',questions:'preguntas guiadas',minutes:'minutos',
    selfGuided:'Una sesión autoguiada, no una cita en vivo con Andrey, ni diagnóstico ni resultado garantizado.',
    topicTitle:'¿Qué te gustaría explorar hoy?',topicLead:'Elige lo que más te importa hoy. No necesitas explicarlo todo de golpe.',
    topicNote:'El tema ofrece contexto. Puedes explorar otros temas en otra sesión.',
    adult:'Confirmo que tengo 18 años o más y elijo explorar este tema voluntariamente.',
  },
}
const checkinCopy={
 en:{greeting:'Hello, I am glad you are here. How are you doing today?',details:'About this session'},
 ru:{greeting:'Здравствуйте! Рад вас видеть. Как вы сегодня?',details:'Подробнее о сессии'},
 es:{greeting:'¡Hola! Me alegra verte por aquí. ¿Cómo estás hoy?',details:'Más sobre esta sesión'},
}
const localized=(value,lang)=>value?.[lang]||value?.en||''
export function coachingEntryCopy(locale='en'){return copy[locale]||copy.en}

export function CoachingSessionIntroduction({locale='en',name,minutes=20,modelName,approach,outcome,questionCount,style='reflective',imageSrc,headingRef,checkin='',onCheckinChange}){
  const t=coachingEntryCopy(locale),warm=checkinCopy[locale]||checkinCopy.en
  return <div className={styles.entry} data-coaching-intro-slide>
    <span className={styles.step}>{t.introStage}</span>
    {imageSrc&&<div className={styles.art}><img src={imageSrc} width="760" height="200" alt="" loading="eager"/></div>}
    <h1 ref={headingRef} tabIndex={-1} className={styles.title}>{name}</h1>
    <p className={styles.lead}>{t.introLead}</p>
    {onCheckinChange&&<div className={styles.checkin} data-coaching-warm-checkin>
      <CoachingChatThread locale={locale}>
        <p className={styles.checkinGreeting}>{warm.greeting}</p>
      </CoachingChatThread>
      <div className={styles.checkinOptions} role="group" aria-label={warm.greeting}>
        {COACHING_CHECKIN_OPTIONS.map(option=><button type="button" key={option.id}
          className={styles.checkinChoice} aria-pressed={checkin===option.id}
          data-coaching-checkin-choice={option.id} onClick={()=>onCheckinChange(option.id)}>
          {localized(option.label,locale)}
        </button>)}
      </div>
    </div>}
    <details className={styles.sessionDetails} open={!onCheckinChange}>
      <summary>{warm.details}</summary>
      <dl className={styles.facts}>
      <div><dt>{t.duration}</dt><dd>≈ {minutes} {t.minutes}{questionCount?(' · '+questionCount+' '+t.questions):''}</dd></div>
      <div><dt>{t.model}</dt><dd>{modelName||name}</dd></div>
      <div><dt>{t.specialist}</dt><dd>{t.specialistValue}</dd></div>
      <div><dt>{t.thinking}</dt><dd>{style==='quick'?t.quick:t.reflective}{approach?' · '+approach:''}</dd></div>
    </dl>
      {outcome&&<p className={styles.outcome}><strong>{t.outcome}:</strong> {outcome}</p>}
    </details>
    <p className={styles.finePrint}>{t.selfGuided}</p>
  </div>
}

export function CoachingSessionTopic({locale='en',value,onChange,headingRef,ageConfirmed=false,onAgeConfirm,checkin=''}){
  const t=coachingEntryCopy(locale),thanks=coachingCheckinReply(checkin,locale)
  const selectedLabel=localized(COACHING_CHECKIN_OPTIONS.find(option=>option.id===checkin)?.label,locale)
  return <div className={styles.entry} data-coaching-topic-slide>
    <span className={styles.step}>{t.topicStage}</span>
    {thanks?<div data-coaching-checkin-reply data-coaching-checkin-user-bubble>
      <CoachingChatThread locale={locale} turn={{quote:selectedLabel,coachReply:thanks,bridge:''}}>
        <h1 ref={headingRef} tabIndex={-1} className={styles.title}>{t.topicTitle}</h1>
        <p className={styles.lead}>{t.topicLead}</p>
      </CoachingChatThread>
    </div>:<>
      <h1 ref={headingRef} tabIndex={-1} className={styles.title}>{t.topicTitle}</h1>
      <p className={styles.lead}>{t.topicLead}</p>
    </>}
    <div className={styles.topicGrid} role="group" aria-label={t.topicTitle}>
      {COACHING_REQUEST_TOPICS.map(topic=><button key={topic.id} type="button"
        data-coaching-topic-choice={topic.id} className={styles.topic}
        aria-pressed={value===topic.id} onClick={()=>onChange(topic.id)}>
        <span aria-hidden="true" className={styles.topicIcon}>{topic.icon}</span>
        <span>{localized(topic.label,locale)}</span>
      </button>)}
    </div>
    {value==='sexuality'&&onAgeConfirm&&<label className={styles.adult}>
      <input type="checkbox" checked={ageConfirmed} onChange={event=>onAgeConfirm(event.target.checked)}/>
      <span>{t.adult}</span>
    </label>}
    <p className={styles.finePrint}>{t.topicNote}</p>
  </div>
}
