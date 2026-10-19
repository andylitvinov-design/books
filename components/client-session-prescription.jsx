import Link from 'next/link'
import { ChevronDown, ExternalLink, ClipboardList, Radio } from 'lucide-react'
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
      <div><span className={styles.sectionKicker}>{ru?'ШАГ 1 · НАЗНАЧЕНИЕ':'STEP 1 · PRESCRIPTIONS'}</span>
        <h2 id="prescription-title">{ru?'Что вам назначено':'Your prescriptions'}</h2>
      </div>
    </header>
    <div className={styles.prescriptionSummary}>
      <div className={styles.prescriptionSummaryLead}>
        <p className={styles.prescriptionCount}>{ru?'В отчёте':'In this report'} <strong>{items.length}</strong> {ru
          ? (items.length===1?'назначение':items.length>=2&&items.length<=4?'назначения':'назначений')
          : (items.length===1?'prescription':'prescriptions')}</p>
        <p className={styles.prescriptionHint}>{ru?'Откройте карточку ниже, чтобы прочитать личные инструкции.':
          'Open a card below to read your individual instructions.'}</p>
      </div>
      {recommendation.generalInstructions&&<div className={styles.instructionPanel}>
        <strong>{ru?'Общая инструкция от специалиста':'Practitioner instructions'}</strong>
        <p>{recommendation.generalInstructions}</p>
      </div>}
      {recommendation.includeDistanceHomeopathy&&<div className={styles.distanceNote}>
        <Radio size={18} aria-hidden="true"/>
        <div><strong>{ru?'Дистанционная работа отмечена в назначении':'Distance work is included in your prescription'}</strong>
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

  if(part==='remedies')return <section id="session-remedies" className={styles.clientSection+' '+styles.remedyDetailSection}
    aria-label={ru?'Личные инструкции по назначениям':'Personal prescription instructions'}>
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
    const extra=[recommendation.additionalNotes,recommendation.followUp,recommendation.analysis]
      .filter(x=>typeof x==='string'&&x.trim())
    if(!extra.length)return null
    return <details className={styles.detailSection}>
      <summary>{ru?'Дополнительные пояснения из отчёта':'Additional notes from your report'} <ChevronDown size={18} aria-hidden="true"/></summary>
      <div className={styles.detailBody}>
        {recommendation.additionalNotes&&<p>{recommendation.additionalNotes}</p>}
        {recommendation.followUp&&<p><strong>{ru?'Дальнейшая связь':'Follow-up'}:</strong> {recommendation.followUp}</p>}
        {recommendation.analysis&&<details className={styles.nestedDetail}>
          <summary>{ru?'Развернуть анализ консультации':'Read the session analysis'}</summary>
          <p>{recommendation.analysis}</p>
        </details>}
      </div>
    </details>
  }
  return null
}
