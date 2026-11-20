'use client'

import {useMemo} from 'react'
import {BookOpenCheck,ChevronDown,ShieldCheck} from 'lucide-react'
import {coachSessionStateView} from '@/lib/coaching/coach-session-state-view.mjs'
import styles from './my-coach-session-state-card.module.css'

const copy={
  ru:{title:'Карточка состояния сессии',subtitle:'По вашим словам · предварительно',topic:'Рабочая тема',outcome:'Желаемый результат',facts:'Значимые факты',tensions:'Возможные противоречия',resources:'Обнаруженные ресурсы',method:'Коучинговая методика',stage:'Текущий этап',unknown:'Пока не уточнено',methodUnknown:'Не определена сервером',stageProvisional:'Предварительно',notice:'Каждый пункт основан только на ваших словах. Возможные противоречия — не вывод коуча.',privacy:'Карточка остаётся в текущей вкладке. Долговременное сохранение возможно только с отдельного согласия.'},
  en:{title:'Session state card',subtitle:'Your words · provisional',topic:'Working topic',outcome:'Desired result',facts:'Significant facts',tensions:'Possible tensions',resources:'Available resources',method:'Coaching method',stage:'Current stage',unknown:'Not yet clarified',methodUnknown:'Not confirmed by Director',stageProvisional:'Provisional',notice:'Every item is based only on your words. Possible tensions are not coach conclusions.',privacy:'This card stays in the current tab. Long-term saving requires separate consent.'},
  es:{title:'Ficha del estado de la sesión',subtitle:'Tus palabras · provisional',topic:'Tema de trabajo',outcome:'Resultado deseado',facts:'Hechos importantes',tensions:'Posibles contradicciones',resources:'Recursos identificados',method:'Método de coaching',stage:'Etapa actual',unknown:'Aún sin aclarar',methodUnknown:'Sin confirmar por Director',stageProvisional:'Provisional',notice:'Cada punto se basa solo en tus palabras. Las contradicciones posibles no son conclusiones del coach.',privacy:'Esta ficha permanece en la pestaña actual. Guardarla a largo plazo requiere consentimiento aparte.'}
}
const methodTitles={grow:'GROW',tgrow:'TGROW',woop:'WOOP',oskar:'OSKAR',solution_focused:'Solution-Focused',appreciative_inquiry:'Appreciative Inquiry'}

function QuoteValue({value,unknown}){
  if(!value)return <span className={styles.unknown}>{unknown}</span>
  return <span className={styles.quote}>{value}</span>
}
function QuoteList({values,unknown}){
  if(!values?.length)return <span className={styles.unknown}>{unknown}</span>
  return <ul className={styles.quotedList}>{values.map((item,i)=><li key={i}>{item}</li>)}</ul>
}

/** Existing My Coach view only; this is not a session editor or durable record. */
export default function MyCoachSessionStateCard({locale='en',turns=[],progress=null,stageLabel=''}){
  const language=copy[locale]?locale:'en'
  const t=copy[language]
  const card=useMemo(()=>coachSessionStateView({locale:language,turns,progress}),[language,turns,progress])
  if(card.clientTurnCount===0)return null
  return <details className={styles.card} data-coach-session-state-card>
    <summary className={styles.summary}>
      <BookOpenCheck size={19} aria-hidden="true"/>
      <span className={styles.heading}><strong>{t.title}</strong><small>{t.subtitle}</small></span>
      <ChevronDown className={styles.chevron} size={18} aria-hidden="true"/>
    </summary>
    <div className={styles.body}>
      <dl className={styles.fields}>
        <div><dt>{t.topic}</dt><dd><QuoteValue value={card.workingTopicQuote} unknown={t.unknown}/></dd></div>
        <div><dt>{t.outcome}</dt><dd><QuoteValue value={card.desiredOutcomeQuote} unknown={t.unknown}/></dd></div>
        <div><dt>{t.facts}</dt><dd><QuoteList values={card.keyFactQuotes} unknown={t.unknown}/></dd></div>
        <div><dt>{t.tensions}</dt><dd><QuoteList values={card.possibleTensionQuotes} unknown={t.unknown}/></dd></div>
        <div><dt>{t.resources}</dt><dd><QuoteList values={card.resourceQuotes} unknown={t.unknown}/></dd></div>
        <div><dt>{t.method}</dt><dd><span className={styles.method}>{card.selectedMethodId?methodTitles[card.selectedMethodId]:t.methodUnknown}</span></dd></div>
        <div><dt>{t.stage}</dt><dd>{card.stageVerifiedByDirector?<span className={styles.stage}>{stageLabel}</span>:<span className={styles.unknown}>{t.stageProvisional}{stageLabel?' · '+stageLabel:''}</span>}</dd></div>
      </dl>
      <p className={styles.note}><BookOpenCheck size={15} aria-hidden="true"/>{t.notice}</p>
      <p className={styles.note}><ShieldCheck size={15} aria-hidden="true"/>{t.privacy}</p>
    </div>
  </details>
}
