'use client'
import { isPcPtsd5Definition, assertExactPcPtsd5Definition } from '../../lib/assessments/pc-ptsd5-runtime.js'
import styles from './trauma-administration.module.css'
import { traumaContextReady, traumaAdministrationPolicy } from '../../lib/assessments/trauma-administration.js'

export function TraumaFrontMatter({ definition, context, onChange, onContinue, onExit, busy, error }) {
  const administration = traumaAdministrationPolicy(definition)
  const ready = traumaContextReady(definition, context)
  function fieldControl(field) {
    const value = context[field.id] || ''
    if (field.kind === 'multiple') {
      let selected = []
      try { selected = JSON.parse(value || '[]') } catch { /* Invalid saved context remains incomplete. */ }
      return <fieldset key={field.id}>
        <legend>{field.label}</legend>
        {field.options.map(option => <label key={option}>
          <input type="checkbox" checked={selected.includes(option)} disabled={busy}
            onChange={event => onChange({ ...context, [field.id]: JSON.stringify(event.target.checked ? [...selected, option] : selected.filter(item => item !== option)) })} />
          {option}
        </label>)}
      </fieldset>
    }
    return <label key={field.id}>
      {field.label}
      {field.kind === 'select' ? <select value={value} disabled={busy} required={field.required}
        onChange={event => onChange({ ...context, [field.id]: event.target.value })}>
        <option value="">Select a response</option>
        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
      </select> : <textarea value={value} disabled={busy} required={field.required} maxLength={1000}
        onChange={event => onChange({ ...context, [field.id]: event.target.value })} />}
    </label>
  }
  return <section className={`hh-panel hh-runner ${styles.frontMatter}`} lang="en" data-trauma-front-matter>
    <h1>{definition.title}</h1>
    <p>{definition.safetyText}</p>
    <p>Original English form. These questions concern potentially distressing experiences. You can leave without completing them.</p>
    {administration.intro.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    <div className="hh-form">{administration.fields.map(fieldControl)}</div>
    <fieldset className="hh-form"><legend>Before continuing (Holistic House administration safeguards)</legend>
      {administration.policyVersion === 'pc-ptsd5-administration-v1'
        ? <p>No event narrative is requested. These acknowledgements are saved with this attempt; they do not arrange professional care.</p>
        : <p>A personal narrative is optional and is not needed for scoring. Context you choose to enter is saved with this attempt in encrypted storage. To change the experience after answering symptom questions, discard this attempt and start a new one.</p>}
      {administration.acknowledgements.map(fieldControl)}
    </fieldset>
    {error && <p role="alert">The context could not be saved. Please check your responses and try again.</p>}
    <div className="hh-actions">
      <button type="button" disabled={busy} onClick={onExit}>Leave questionnaire</button>
      <button type="button" className="hh-primary" disabled={busy || !ready} onClick={onContinue}>Save context and continue</button>
    </div>
  </section>
}
export function TraumaSectionInstructions({ question }) {
  return question?.sectionInstructions ? <p lang="en" className="hh-runner-instructions" data-trauma-section>{question.sectionInstructions}</p> : null
}

export function TraumaExposureExamples({ definition }) {
  if (!isPcPtsd5Definition(definition)) return null
  assertExactPcPtsd5Definition(definition)
  return <ul lang="en" data-trauma-exposure-examples>
    {definition.exposureExamples.map(example => <li key={example}>{example}</li>)}
  </ul>
}
