import ClaritySemanticResult from './clarity-semantic-result'
import CoachRatingRadar from './coach-rating-radar'
import {clarityMethodOutcome} from '@/lib/coaching/clarity-session-fields.mjs'
// Projection only: a report shows existing reviewed evidence, never invents scores.
const COPY={
 en:{result:'Session result',partial:'Partial result — open or unverified checkpoints remain',verified:'Verified',reviewed:'Reviewed by you',skipped:'Skipped',missing:'Not explored',current:'Current',desired:'Desired',takeaway:'My takeaway',step:'Next step',question:'Question',confirmation:'Your confirmation',empty:'No structured result recorded yet'},
 ru:{result:'Результат сессии',partial:'Промежуточный результат — остались открытые или неподтверждённые пункты',verified:'Подтверждено',reviewed:'Проверено вами',skipped:'Пропущено',missing:'Не исследовано',current:'Сейчас',desired:'Желаемое',takeaway:'Мой итог',step:'Следующий шаг',question:'Вопрос',confirmation:'Ваше подтверждение',empty:'Структурированный результат пока не записан'},
 es:{result:'Resultado de la sesión',partial:'Resultado parcial: quedan puntos abiertos o no verificados',verified:'Verificado',reviewed:'Revisado por ti',skipped:'Omitido',missing:'No explorado',current:'Actual',desired:'Deseado',takeaway:'Mi conclusión',step:'Siguiente paso',question:'Pregunta',confirmation:'Tu confirmación',empty:'Todavía no hay un resultado estructurado'}
}
const label={
 life_direction:{en:'Life direction map',ru:'Карта жизненного направления',es:'Mapa de dirección'},
 inner_compass:{en:'Values and motivation map',ru:'Карта ценностей и мотивации',es:'Mapa de valores y motivación'},
 main_vector:{en:'Personal goal',ru:'Персональная цель',es:'Objetivo personal'},
 strengths_resources:{en:'Resource map',ru:'Карта ресурсов',es:'Mapa de recursos'},
 obstacles_patterns:{en:'Obstacle strategy',ru:'Стратегия преодоления препятствий',es:'Estrategia ante obstáculos'},
 new_possibilities:{en:'Alternative solutions',ru:'Альтернативные решения',es:'Soluciones alternativas'},
 actions_steps:{en:'Personal action plan',ru:'Персональный план действий',es:'Plan de acción personal'},
 integration:{en:'Integration report',ru:'Итоговый отчёт',es:'Informe de integración'}
}
const isScore=field=>field?.status==='confirmed'&&Number.isInteger(field.value)&&field.value>=0&&field.value<=10
function Wheel({profile,locale,t}){
 return <CoachRatingRadar axes={profile.rows} title={profile.title} locale={locale} labels={t}/>
}
function Rating({field,t}){
 return <>{isScore(field)?field.value:field?.status==='skipped_by_client'?t.skipped:t.missing}</>
}
export default function MyCoachResultPreview({locale='en',courseSessionId,title,rows=[],profile,summary='',nextStep=''}){
 const lang=COPY[locale]?locale:'en',t=COPY[lang]
 // Legacy inner profile data is never used as an outer life-balance score.
 const activeProfile=profile&&(courseSessionId==='introductory'&&profile.track==='outer'||courseSessionId==='meaning_axes_inner_growth'&&profile.track==='inner')?profile:null
 const isReviewed=row=>row.status==='confirmed'&&['client_reviewed_quote','server_verified'].includes(row.source)
 const day=/^clarity_day_[123]$/.test(courseSessionId||'')?Number(courseSessionId.slice(-1)):null
 const method=day?clarityMethodOutcome(day,rows):null
 const partial=method?method.outcome==='partial'||method.outcome==='goal_partial_plan':(!activeProfile&&!rows.length||rows.some(r=>!isReviewed(r)&&r.status!=='skipped_by_client')||activeProfile?.rows.some(r=>!isScore(r.current)&&r.current.status!=='skipped_by_client'))
 return <section data-coach-result-preview style={{display:'grid',gap:10,overflowWrap:'anywhere'}}>
  <h3 style={{margin:0}}>{activeProfile?.title||label[courseSessionId]?.[lang]||title||t.result}</h3>
  {partial&&<small role="status">{t.partial}</small>}
  {['clarity_day_1','clarity_day_2','clarity_day_3'].includes(courseSessionId)&&<ClaritySemanticResult day={Number(courseSessionId.slice(-1))} rows={rows} locale={lang}/>}
  {activeProfile&&<><Wheel profile={activeProfile} locale={lang} t={t}/><ol style={{margin:0,paddingInlineStart:20}}>{activeProfile.rows.map(row=><li key={row.id}><strong>{row.label}</strong> — {t.current}: <Rating field={row.current} t={t}/>{(row.priority||activeProfile.track==='inner'||isScore(row.desired))&&<> · {t.desired}: <Rating field={row.desired} t={t}/></>}</li>)}</ol></>}
  {rows.length>0&&<dl style={{margin:0,display:'grid',gap:8}}>{rows.map(row=><div key={row.id}><dt><strong>{row.label}</strong></dt><dd style={{margin:0}}>{isReviewed(row)?<>{row.questionTurnIndex!=null&&<small style={{display:'block'}}>{t.question}: {row.question}</small>}{row.quote}<br/><small>{row.source==='server_verified'?t.verified:t.reviewed}{row.confirmationQuote&&<> · {t.confirmation}: {row.confirmationQuote}</>}</small></>:row.status==='skipped_by_client'?t.skipped:t.missing}</dd></div>)}</dl>}
  {!activeProfile&&!rows.length&&<p>{t.empty}</p>}
  {summary&&<div><strong>{t.takeaway}</strong><p style={{margin:'4px 0',whiteSpace:'pre-wrap'}}>{summary}</p></div>}
  {nextStep&&<div><strong>{t.step}</strong><p style={{margin:'4px 0',whiteSpace:'pre-wrap'}}>{nextStep}</p></div>}
 </section>
}
