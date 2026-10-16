import Link from 'next/link'
import { ChevronDown, ExternalLink, FlaskConical, ClipboardList, Radio } from 'lucide-react'
import { remedySchedule, recommendationCopy } from '@/lib/documents/recommendation'
import styles from './client-session.module.css'

// Only format an approved date; never silently change the practitioner's data.
function followUpDateLabel(value, locale) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value + 'T12:00:00Z')
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return value
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-CA', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(parsed)
}


/**
 * Render only a practitioner-approved prescription projection.
 * Never infer missing dosages, frequencies, potencies or durations.
 */
export function SessionPrescriptionOverview({recommendation,locale='en',part='summary'}) {
  if(!recommendation || !Array.isArray(recommendation.items) || !recommendation.items.length)return null
  const ru=locale==='ru'
  const labels=recommendationCopy(locale,recommendation.recommendationType)
  const items=recommendation.items
  if(part==='summary')return <section id="session-prescription" className={styles.clientSection} aria-labelledby="prescription-title">
    <header className={styles.sectionHeader}>
      <span className={styles.sectionIcon}><ClipboardList size={19}/></span>
      <div><span className={styles.sectionKicker}>{ru?'ШАГ 1 · НАЗНАЧЕНИЕ':'STEP 1 · YOUR RECOMMENDATIONS'}</span>
        <h2 id="prescription-title">{ru?'Что вам назначено':'What was recommended'}</h2>
      </div>
    </header>
    <div className={styles.prescriptionSummary}>
      <p className={styles.prescriptionCount}>{ru?'В отчёте указано':'Your report lists'} <strong>{items.length}</strong> {ru
        ? (items.length===1?'позиция':items.length>=2&&items.length<=4?'позиции':'позиций')
        : (items.length===1?'item':'items')}</p>
      <ol className={styles.prescriptionOverviewList}>
        {items.map((item,index)=><li key={String(index)+'-'+item.displayName}>
          <span className={styles.remedyIndex}>{String(index+1).padStart(2,'0')}</span>
          <div><strong>{item.displayName}</strong>
            {remedySchedule(item,locale,recommendation.recommendationType)&&
              <small>{remedySchedule(item,locale,recommendation.recommendationType)}</small>}
            {(item.dosage||item.frequency||item.instructions)&&
              <small className={styles.prescriptionItemHow}>
                {ru?'Как указано в назначении':'From your recommendation'}: {item.dosage||item.frequency||item.instructions}
              </small>}
          </div>
        </li>)}
      </ol>
      {recommendation.generalInstructions&&<div className={styles.instructionPanel}>
        <strong>{ru?'Общая инструкция от специалиста':'Practitioner instructions'}</strong>
        <p>{recommendation.generalInstructions}</p>
      </div>}
      {recommendation.includeDistanceHomeopathy&&<div className={styles.distanceNote}>
        <Radio size={18} aria-hidden="true"/>
        <div><strong>{ru?'Дистанционная работа отмечена в назначении':'Distance work is included in the recommendation'}</strong>
          <p>{ru?'Дополнительные условия дистанционной работы смотрите в полном отчёте или уточните у специалиста.':
            'Please refer to your full report or ask your practitioner for the details of this service.'}</p>
        </div>
      </div>}
      {recommendation.followUpDate&&<p className={styles.sessionFollowUp}>
        <strong>{ru?'Дата повторной консультации':'Follow-up date'}:</strong> {followUpDateLabel(recommendation.followUpDate,locale)}
      </p>}
      {!recommendation.generalInstructions&&items.every(item=>!item.dosage&&!item.frequency&&!item.instructions&&!item.granules&&!item.timesPerDay)&&
        <p className={styles.instructionNote}>{ru?'Способ применения здесь не указан. Уточните его у специалиста; не подбирайте дозировку самостоятельно.':
        'No administration instructions are recorded here. Please ask your practitioner rather than guessing a dose.'}</p>}
    </div>
  </section>

  if(part==='remedies')return <section id="session-prescription" className={styles.clientSection} aria-labelledby="remedies-title">
    <header className={styles.sectionHeader}>
      <span className={styles.sectionIcon}><FlaskConical size={19}/></span>
      <div><span className={styles.sectionKicker}>{ru?'НАЗНАЧЕНИЯ':'PRESCRIPTIONS'}</span>
        <h2 id="remedies-title">{ru?'Что вам назначено':'Your recommendations'}</h2>
      </div>
    </header>
    <p className={styles.sectionIntro}>{ru
      ?(items.length===1?'1 назначение · Нажмите, чтобы прочитать инструкцию':items.length+' назначений · Раскройте нужную позицию')
      :(items.length===1?'1 item · Open for details':items.length+' items · Open any item for details')}</p>
    <div className={styles.remedyAccordions}>
      {items.map((item,index)=>{
        const schedule=remedySchedule(item,locale,recommendation.recommendationType)
        const fields=[
          ['purpose',labels.purpose],['dosage',labels.dosage],['frequency',labels.frequency],
          ['duration',labels.duration],['sequence',labels.sequence],['instructions',labels.instructions]
        ].filter(([key])=>typeof item[key]==='string'&&item[key].trim())
        return <details key={String(index)+'-'+item.displayName} className={styles.remedyAccordion}>
          <summary>
            <span className={styles.remedyIndex}>{String(index+1).padStart(2,'0')}</span>
            <span className={styles.remedyAccordionText}>
              <strong>{item.displayName}</strong>
              {schedule&&<small>{schedule}</small>}
            </span>
            <ChevronDown size={21} className={styles.remedyChevron} aria-hidden="true"/>
          </summary>
          <div className={styles.remedyAccordionBody}>
            {fields.length?<dl className={styles.remedyFields}>
              {fields.map(([key,label])=><div key={key}><dt>{label}</dt><dd>{item[key]}</dd></div>)}
            </dl>:<p className={styles.instructionNote}>{ru?'Дополнительная инструкция для этой позиции не записана. При необходимости уточните её у специалиста.':
              'No further instructions were recorded for this item. Ask your practitioner if you need clarification.'}</p>}
            {item.remedyPath&&<Link href={item.remedyPath} target="_blank" rel="noopener noreferrer" className={styles.remedyLearnMore}>
              {ru?'Общая справка о препарате':'Read the general remedy profile'} <ExternalLink size={15}/>
            </Link>}
          </div>
        </details>
      })}
    </div>
  </section>

  if(part==='extra'){
    const hasExtra=[recommendation.generalInstructions,recommendation.additionalNotes,
      recommendation.followUp,recommendation.analysis,recommendation.followUpDate]
      .some(x=>typeof x==='string'&&x.trim())||recommendation.includeDistanceHomeopathy
    if(!hasExtra)return null
    const formattedFollowUp=followUpDateLabel(recommendation.followUpDate,locale)
    return <div className={styles.adviceSupplement}>
      {recommendation.generalInstructions&&<div className={styles.adviceCard}>
        <strong>{ru?'Общие инструкции специалиста':'Practitioner instructions'}</strong>
        <p>{recommendation.generalInstructions}</p>
      </div>}
      {recommendation.additionalNotes&&<div className={styles.adviceCard}>
        <strong>{ru?'Дополнительные пояснения':'Additional notes'}</strong>
        <p>{recommendation.additionalNotes}</p>
      </div>}
      {recommendation.analysis&&<div className={styles.adviceCard}>
        <strong>{ru?'Анализ консультации':'Session analysis'}</strong>
        <p>{recommendation.analysis}</p>
      </div>}
      {recommendation.includeDistanceHomeopathy&&<div className={styles.distanceNote}>
        <Radio size={18} aria-hidden="true"/>
        <div><strong>{ru?'Дистанционная работа отмечена в назначении':'Distance work is included in the recommendation'}</strong>
          <p>{ru?'Условия дистанционной работы смотрите в полном отчёте или уточните у специалиста.':
            'Please refer to your full report or ask your practitioner for the details of this service.'}</p>
        </div>
      </div>}
      {formattedFollowUp&&<p className={styles.sessionFollowUp}>
        <strong>{ru?'Повторная консультация':'Follow-up date'}:</strong> {formattedFollowUp}
      </p>}
      {recommendation.followUp&&<p className={styles.sessionFollowUp}>
        <strong>{ru?'Дальнейшая связь':'Follow-up'}:</strong> {recommendation.followUp}
      </p>}
    </div>
  }
  return null
}
