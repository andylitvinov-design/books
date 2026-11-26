'use client'

import {useMemo} from 'react'
import Link from 'next/link'
import {BookOpenCheck,Check,CheckCircle2,Compass,FileText,Flag,HeartHandshake,Milestone,Scale,ShieldCheck,Target} from 'lucide-react'
import {coachSessionStateView} from '@/lib/coaching/coach-session-state-view.mjs'
import {COACH_PROFILE_AXES} from '@/lib/coaching/coach-profile-intake.mjs'
import {COACH_PROFILE_REVIEW_VERSION,coachProfileReviewNextReply} from '@/lib/coaching/coach-profile-review.mjs'
import styles from './my-coach-session-state-card.module.css'

const copy={
  ru:{
    subtitle:'По вашим словам · предварительно',stages:'Этапы коучинга',information:'Ключевая информация',
    done:'Пройдено',current:'Сейчас',waiting:'Впереди',mentioned:'Требует уточнения',confirmed:'Подтверждено',missing:'Не исследовано',
    topic:'Рабочая тема',outcome:'Желаемый результат',facts:'Значимые факты',
    tensions:'Возможные противоречия',resources:'Ваши ресурсы',
    method:'Коучинговая методика',stage:'Текущий этап',
    unknown:'Пока не уточнено',methodUnknown:'Не подтверждена алгоритмом',stageProvisional:'Предварительно',
    notice:'Галочки этапов ставит алгоритм. Предварительные сведения без проверки не отмечаются как подтверждённые.',
    privacy:'Данные остаются в текущей вкладке. Для долгосрочного сохранения нужно отдельное согласие.'
  },
  en:{
    subtitle:'Your words · provisional',stages:'Coaching stages',information:'Key information',
    done:'Completed',current:'Current',waiting:'Next',mentioned:'Needs confirmation',confirmed:'Verified',missing:'Not explored',
    topic:'Working topic',outcome:'Desired result',facts:'Significant facts',
    tensions:'Possible tensions',resources:'Your resources',
    method:'Coaching method',stage:'Current stage',
    unknown:'Not yet clarified',methodUnknown:'Not confirmed by Director',stageProvisional:'Provisional',
    notice:'Stage checkmarks require Director evidence. Mentioned information is not marked as a verified fact.',
    privacy:'This stays in the current tab. Long-term saving requires separate consent.'
  },
  es:{
    subtitle:'Tus palabras · provisional',stages:'Etapas del coaching',information:'Información esencial',
    done:'Completado',current:'Actual',waiting:'Siguiente',mentioned:'Requiere confirmación',confirmed:'Verificado',missing:'Sin explorar',
    topic:'Tema de trabajo',outcome:'Resultado deseado',facts:'Hechos importantes',
    tensions:'Posibles contradicciones',resources:'Tus recursos',
    method:'Método de coaching',stage:'Etapa actual',
    unknown:'Aún sin aclarar',methodUnknown:'No confirmado por Director',stageProvisional:'Provisional',
    notice:'Las etapas requieren evidencia del Director. Una mención no se marca como un hecho confirmado.',
    privacy:'Esta ficha sigue en la pestaña. Guardarla a largo plazo requiere consentimiento aparte.'
  }
}
const openingLampKey={invitation:'invitation',name:'identity',focus:'focus',confirmation:'confirmation'}
const radarPoint=(index,value)=>{
  const angle=-Math.PI/2+index*Math.PI/4
  return [Number((160+Math.cos(angle)*94*value/10).toFixed(1)),Number((123+Math.sin(angle)*94*value/10).toFixed(1))]
}
function ProfileWheel({profile,language}){
  const rows=COACH_PROFILE_AXES.map((axis,index)=>({axis,index,rating:profile.ratings.find(item=>item.axis===axis.id)}))
  const allRated=rows.every(({rating})=>rating?.kind==='rated')
  const polygon=key=>rows.map(({index,rating})=>radarPoint(index,rating[key]).join(',')).join(' ')
  const label={ru:'Колесо смыслов: сейчас и хочу',en:'Meaning wheel: now and desired',es:'Rueda de sentidos: ahora y deseado'}[language]
  const hint={ru:'Это личные оценки, не психологический тест. Пропущенные оси не дорисовываются.',en:'Personal ratings, not a psychological test. Skipped axes are not imputed.',es:'Valoraciones personales, no una prueba psicológica. No se estiman ejes omitidos.'}[language]
  return <div data-coach-profile-wheel aria-label={label}>
    <p><strong>{label}</strong></p>
    <svg viewBox="0 0 320 246" role="img" aria-label={label}
      style={{display:'block',width:'100%',maxWidth:340,height:'auto',marginInline:'auto'}}>
      <title>{label}</title>
      {[2.5,5,7.5,10].map(level=><polygon key={level}
        points={Array.from({length:8},(_,index)=>radarPoint(index,level).join(',')).join(' ')}
        fill="none" stroke="currentColor" strokeOpacity=".16" strokeWidth="1"/>)}
      {Array.from({length:8},(_,index)=>{const [x,y]=radarPoint(index,10)
        return <line key={index} x1="160" y1="123" x2={x} y2={y}
          stroke="currentColor" strokeOpacity=".16"/>})}
      {allRated&&<polygon points={polygon('desired')} fill="#3A9F7C" fillOpacity=".13" stroke="#3A9F7C" strokeWidth="2"/>}
      {allRated&&<polygon points={polygon('current')} fill="#478FCC" fillOpacity=".16" stroke="#478FCC" strokeWidth="2"/>}
      {rows.map(({axis,index,rating})=>rating?.kind==='rated'?<g key={axis.id}>
        <circle cx={radarPoint(index,rating.current)[0]} cy={radarPoint(index,rating.current)[1]} r="3.5" fill="#478FCC"/>
        <circle cx={radarPoint(index,rating.desired)[0]} cy={radarPoint(index,rating.desired)[1]} r="3.5" fill="#3A9F7C"/>
      </g>:null)}
    </svg>
    <p style={{fontSize:14}}><span style={{color:'#478FCC'}}>●</span> {language==='ru'?'Сейчас':language==='es'?'Ahora':'Now'}　<span style={{color:'#3A9F7C'}}>●</span> {language==='ru'?'Хочу':language==='es'?'Deseado':'Desired'}</p>
    <p style={{fontSize:13}}>{hint}</p>
  </div>
}
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
  opening=null,profile=null,openingPosition,profilePosition,stagePosition,progressMode
}){
  const language=copy[locale]?locale:'en'
  const t=copy[language]
  const card=useMemo(()=>coachSessionStateView({locale:language,turns,progress}),[language,turns,progress])
  const review=profile?.version===COACH_PROFILE_REVIEW_VERSION
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
        {openingPosition.rows.map(({id:key,label,status,active},index)=>{
          const done=status==='done'
          const state=done?t.done:active?t.current:t.waiting
          const lamp=openingLampKey[key]
          const value=key==='name'?opening.answers?.name?.value:
            key==='continuity'?opening.answers?.continuity?.kind:
            key==='focus'?opening.answers?.focus?.kind:''
          return <li key={key} className={styles.stageRow}
            data-opening-step={key} data-stage-id={key} data-stage-status={done?'done':active?'current':'pending'} aria-current={active?'step':undefined}>
            <span className={styles.stageNumber} aria-hidden="true">{done?<Check size={15} strokeWidth={3}/>:index+1}</span>
            <span className={styles.stageName}>
              {label}
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
    {profile&&progressMode==='profile'&&<section className={styles.stageSection} data-coach-profile-checklist
      aria-label={language==='ru'?'Личный профиль':language==='es'?'Perfil personal':'Personal profile'}>
      <h3 className={styles.sectionTitle}><CheckCircle2 size={18} aria-hidden="true"/>
        {language==='ru'?'Личный профиль':language==='es'?'Perfil personal':'Personal profile'} · {profilePosition.rows.filter(row=>row.status==='done').length}/{COACH_PROFILE_AXES.length}
      </h3>
      <ol className={styles.stageList}>
        {profilePosition.rows.map(({id,label,status,active},index)=>{
          const rating=profile.ratings.find(item=>item.axis===id)
          const done=status==='done'
          const state=done?t.done:status==='skipped'?({ru:'Пропущено',en:'Skipped',es:'Omitido'}[language]):active?t.current:t.waiting
          const value=(rating?.kind==='rated'||rating?.kind==='partial')
            ?(rating.current===null?'—':rating.current)+' → '+(rating.desired===null?'—':rating.desired):
            rating?.kind==='skipped'?(language==='ru'?'Пропущено':language==='es'?'Omitido':'Skipped'):''
          return <li key={id} className={styles.stageRow} data-profile-axis={id} data-stage-id={id}
            data-stage-status={active?'current':status} aria-current={active?'step':undefined}>
            <span className={styles.stageNumber} aria-hidden="true">{done?<Check size={15} strokeWidth={3}/>:index+1}</span>
            <span className={styles.stageName}>{label}
              {value&&<small className={styles.openingValue}>{value}</small>}
            </span>
            <span className={styles.stageStatus}>{state}</span>
            <ReadOnlyCheckbox checked={done}/>
          </li>
        })}
      </ol>
      {(profile.completed||review)&&<ProfileWheel profile={profile} language={language}/>}
      {review&&!profile.finished&&<p data-coach-profile-next-question>
        {coachProfileReviewNextReply(profile)}
      </p>}
      {review&&profile.finished&&<div data-coach-profile-next-steps>
        <p>{language==='ru'?'Следующий шаг выбираете вы:':language==='es'?'Elige el siguiente paso:':'Choose your next step:'}</p>
        <p><Link href={'/'+language+'/app/my-coaching-plan'}>
          {language==='ru'?'Уточнить мои цели':language==='es'?'Revisar mis metas':'Review my goals'}
        </Link></p>
        <p><Link href={'/'+language+'/app/tests'}>
          {language==='ru'?'Посмотреть доступные тесты':language==='es'?'Ver mis pruebas':'View available tests'}
        </Link></p>
      </div>}
    </section>}
    {(progressMode==='method'||progressMode==='profile-v3')&&<section className={styles.stageSection} aria-label={t.stages}>
      <h3 className={styles.sectionTitle}><CheckCircle2 size={18} aria-hidden="true"/>{t.stages}</h3>
      <ol className={styles.stageList} data-coach-stage-checklist>
        {stagePosition.rows.map(({id,label,status,active},index)=>{
          const done=status==='done'
          const state=done?t.done:status==='skipped'?({ru:'Пропущено',en:'Skipped',es:'Omitido'}[language]):active?t.current:status==='needs_confirmation'?t.mentioned:t.waiting
          return <li key={id} className={styles.stageRow} data-stage-id={id} data-stage-status={active?'current':status} aria-current={active?'step':undefined}>
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
        {fields.map(({id,label,Icon,mentioned,value})=>{
          const authoritative=id==='method'||id==='stage'
          const factStatus=authoritative?(mentioned?'confirmed':'not_explored'):card.factStatus[id]
          const checked=factStatus==='confirmed'
          return <div key={id} className={styles.fieldRow}
            data-client-evidence={mentioned?'mentioned':'missing'} data-fact-status={factStatus}>
          <dt>
            <Icon className={styles.fieldIcon} size={19} aria-hidden="true"/>
            <span className={styles.fieldName}>{label}</span>
            <span className={styles.fieldStatus}>{checked?t.confirmed:factStatus==='needs_confirmation'?t.mentioned:t.missing}</span>
            <ReadOnlyCheckbox checked={checked}/>
          </dt>
          <dd>{value}</dd>
        </div>})}
      </dl>
    </section>
    <p className={styles.note}><BookOpenCheck size={15} aria-hidden="true"/>{t.notice}</p>
    <p className={styles.note}><ShieldCheck size={15} aria-hidden="true"/>{t.privacy}</p>
  </div>
}
