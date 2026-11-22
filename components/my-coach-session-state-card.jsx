'use client'

import {useMemo} from 'react'
import {BookOpenCheck,Check,CheckCircle2,Compass,FileText,Flag,HeartHandshake,Milestone,Scale,ShieldCheck,Target} from 'lucide-react'
import {coachSessionStateView} from '@/lib/coaching/coach-session-state-view.mjs'
import styles from './my-coach-session-state-card.module.css'

const copy={
  ru:{
    subtitle:'По вашим словам · предварительно',stages:'Этапы коучинга',information:'Ключевая информация',
    done:'Пройдено',current:'Сейчас',waiting:'Впереди',mentioned:'Упомянуто',missing:'Не уточнено',
    topic:'Рабочая тема',outcome:'Желаемый результат',facts:'Значимые факты',
    tensions:'Возможные противоречия',resources:'Ваши ресурсы',
    method:'Коучинговая методика',stage:'Текущий этап',
    unknown:'Пока не уточнено',methodUnknown:'Не подтверждена алгоритмом',stageProvisional:'Предварительно',
    notice:'Галочки этапов ставит только алгоритм по подтверждённым данным. Галочки сведений означают лишь, что эта информация прозвучала от вас.',
    privacy:'Данные остаются в текущей вкладке. Для долгосрочного сохранения нужно отдельное согласие.'
  },
  en:{
    subtitle:'Your words · provisional',stages:'Coaching stages',information:'Key information',
    done:'Completed',current:'Current',waiting:'Next',mentioned:'Mentioned',missing:'Not clarified',
    topic:'Working topic',outcome:'Desired result',facts:'Significant facts',
    tensions:'Possible tensions',resources:'Your resources',
    method:'Coaching method',stage:'Current stage',
    unknown:'Not yet clarified',methodUnknown:'Not confirmed by Director',stageProvisional:'Provisional',
    notice:'Stage checkmarks require Director-confirmed evidence. Information checkmarks only mean that you mentioned this topic.',
    privacy:'This stays in the current tab. Long-term saving requires separate consent.'
  },
  es:{
    subtitle:'Tus palabras · provisional',stages:'Etapas del coaching',information:'Información esencial',
    done:'Completado',current:'Actual',waiting:'Siguiente',mentioned:'Mencionado',missing:'Sin aclarar',
    topic:'Tema de trabajo',outcome:'Resultado deseado',facts:'Hechos importantes',
    tensions:'Posibles contradicciones',resources:'Tus recursos',
    method:'Método de coaching',stage:'Etapa actual',
    unknown:'Aún sin aclarar',methodUnknown:'No confirmado por Director',stageProvisional:'Provisional',
    notice:'Las etapas solo se marcan con evidencia confirmada por Director. Las casillas de datos indican únicamente que los mencionaste.',
    privacy:'Esta ficha sigue en la pestaña. Guardarla a largo plazo requiere consentimiento aparte.'
  }
}
const openingTitles={
  ru:['Согласие на сессию','Как обращаться','Прошлая или новая тема','Тип работы','Чувства сегодня','Подтверждение начала'],
  en:['Session invitation','Preferred name','Previous or new topic','Working focus','Feelings today','Ready to begin'],
  es:['Invitación','Nombre preferido','Tema anterior o nuevo','Tipo de trabajo','Cómo te sientes','Confirmación'],
}
const openingKeys=['invitation','name','continuity','focus','feelings','confirmation']
const openingLampKey={invitation:'invitation',name:'identity',focus:'focus',confirmation:'confirmation'}
const methodTitles={
  grow:'GROW',tgrow:'T-GROW',woop:'WOOP',oskar:'OSKAR',
  solution_focused:'Solution-Focused',appreciative_inquiry:'Appreciative Inquiry'
}
function QuoteValue({value,unknown}){
  return value?<span className={styles.quote}>{value}</span>:<span className={styles.unknown}>{unknown}</span>
}
function QuoteList({values,unknown}){
  if(!values?.length)return <span className={styles.unknown}>{unknown}</span>
  return <ul className={styles.quotedList}>{values.map((value,index)=><li key={index}>{value}</li>)}</ul>
}
function ReadOnlyCheckbox({checked}){
  return <span className={styles.checkbox} data-checked={checked?'true':'false'} aria-hidden="true">
    {checked&&<Check size={14} strokeWidth={3}/>}
  </span>
}

/** Embedded in the existing Step X of 5 disclosure; never a second card.
 * Checkmarks reflect existing Director evidence or literal client quotations,
 * not a guess, diagnosis, editable form, new AI call or durable record.
 */
export default function MyCoachSessionStateCard({
  locale='en',turns=[],progress=null,stageLabel='',
  stageNames=[],stageIndex=0,stageProgressVerified=false,opening=null
}){
  const language=copy[locale]?locale:'en'
  const t=copy[language]
  const card=useMemo(()=>coachSessionStateView({locale:language,turns,progress}),[language,turns,progress])
  const verified=stageProgressVerified&&card.stageVerifiedByDirector
  const selectedStage=Math.max(0,Math.min(stageNames.length-1,stageIndex))
  const fields=[
    {id:'topic',label:t.topic,Icon:Target,mentioned:!!card.workingTopicQuote,
      value:<QuoteValue value={card.workingTopicQuote} unknown={t.unknown}/>},
    {id:'outcome',label:t.outcome,Icon:Flag,mentioned:!!card.desiredOutcomeQuote,
      value:<QuoteValue value={card.desiredOutcomeQuote} unknown={t.unknown}/>},
    {id:'facts',label:t.facts,Icon:FileText,mentioned:card.keyFactQuotes.length>0,
      value:<QuoteList values={card.keyFactQuotes} unknown={t.unknown}/>},
    {id:'tensions',label:t.tensions,Icon:Scale,mentioned:card.possibleTensionQuotes.length>0,
      value:<QuoteList values={card.possibleTensionQuotes} unknown={t.unknown}/>},
    {id:'resources',label:t.resources,Icon:HeartHandshake,mentioned:card.resourceQuotes.length>0,
      value:<QuoteList values={card.resourceQuotes} unknown={t.unknown}/>},
    {id:'method',label:t.method,Icon:Compass,mentioned:card.stageVerifiedByDirector,
      value:card.selectedMethodId?<span className={styles.method}>{methodTitles[card.selectedMethodId]}</span>:<span className={styles.unknown}>{t.methodUnknown}</span>},
    {id:'stage',label:t.stage,Icon:Milestone,mentioned:card.stageVerifiedByDirector,
      value:card.stageVerifiedByDirector?<span className={styles.stage}>{stageLabel}</span>:<span className={styles.unknown}>{t.stageProvisional}{stageLabel?' · '+stageLabel:''}</span>}
  ]
  return <div className={styles.body} data-coach-session-state-card>
    <p className={styles.intro}><BookOpenCheck size={16} aria-hidden="true"/>{t.subtitle}</p>
    {opening&&<section className={styles.stageSection} data-coach-opening-checklist
      aria-label={language==='ru'?'Начало сессии':language==='es'?'Inicio de sesión':'Session opening'}>
      <h3 className={styles.sectionTitle}><CheckCircle2 size={18} aria-hidden="true"/>
        {language==='ru'?'Начало сессии · 6 шагов':language==='es'?'Inicio de sesión · 6 pasos':'Session opening · 6 steps'}
      </h3>
      <ol className={styles.stageList}>
        {openingKeys.map((key,index)=>{
          const done=opening.checkmarks?.[key]===true
          const active=!opening.completed&&!opening.declined&&opening.current===key
          const state=done?t.done:active?t.current:t.waiting
          const lamp=openingLampKey[key]
          const value=key==='name'?opening.answers?.name?.value:
            key==='continuity'?opening.answers?.continuity?.kind:
            key==='focus'?opening.answers?.focus?.kind:''
          return <li key={key} className={styles.stageRow}
            data-opening-step={key} data-stage-status={done?'done':active?'current':'pending'}>
            <span className={styles.stageNumber} aria-hidden="true">{done?<Check size={15} strokeWidth={3}/>:index+1}</span>
            <span className={styles.stageName}>
              {openingTitles[language][index]}
              {lamp&&<span className={styles.openingLamp} data-lit={opening.lamps?.[lamp]===true?'true':'false'}
                aria-hidden="true"/>}
              {value&&<small className={styles.openingValue}>{String(value).slice(0,55)}</small>}
            </span>
            <span className={styles.stageStatus}>{state}</span>
            <ReadOnlyCheckbox checked={done}/>
          </li>
        })}
      </ol>
    </section>}
    {(!opening||opening.completed)&&<section className={styles.stageSection} aria-label={t.stages}>
      <h3 className={styles.sectionTitle}><CheckCircle2 size={18} aria-hidden="true"/>{t.stages}</h3>
      <ol className={styles.stageList} data-coach-stage-checklist>
        {stageNames.map((label,index)=>{
          const done=verified&&(index<selectedStage||(progress?.completed===true&&index===selectedStage))
          const active=index===selectedStage&&!done
          const state=done?t.done:active?t.current:t.waiting
          return <li key={index} className={styles.stageRow} data-stage-status={done?'done':active?'current':'pending'}>
            <span className={styles.stageNumber} aria-hidden="true">{done?<Check size={15} strokeWidth={3}/>:index+1}</span>
            <span className={styles.stageName}>{label}</span>
            <span className={styles.stageStatus}>{state}</span>
            <ReadOnlyCheckbox checked={done}/>
            <span className={styles.screenReaderOnly}>{label}: {state}</span>
          </li>
        })}
      </ol>
    </section>}
    <section className={styles.informationSection} aria-label={t.information}>
      <h3 className={styles.sectionTitle}><BookOpenCheck size={18} aria-hidden="true"/>{t.information}</h3>
      <dl className={styles.fieldList}>
        {fields.map(({id,label,Icon,mentioned,value})=><div key={id} className={styles.fieldRow}
            data-client-evidence={mentioned?'mentioned':'missing'}>
          <dt>
            <Icon className={styles.fieldIcon} size={19} aria-hidden="true"/>
            <span className={styles.fieldName}>{label}</span>
            <span className={styles.fieldStatus}>{mentioned?t.mentioned:t.missing}</span>
            <ReadOnlyCheckbox checked={mentioned}/>
          </dt>
          <dd>{value}</dd>
        </div>)}
      </dl>
    </section>
    <p className={styles.note}><BookOpenCheck size={15} aria-hidden="true"/>{t.notice}</p>
    <p className={styles.note}><ShieldCheck size={15} aria-hidden="true"/>{t.privacy}</p>
  </div>
}
