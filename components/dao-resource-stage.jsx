import { daoResourceStage } from '@/lib/consultations/dao-resource-stage'
import styles from './dao-resource-stage.module.css'

function stageFor(value,locale) {
  try { return daoResourceStage(value,locale) }
  catch { return null }
}

// Optional owner-only field at the end of the shared create/edit report builder.
export function DaoResourceStageField({value='',onChange,locale='ru'}) {
  const ru=locale==='ru'
  const stage=stageFor(value,locale)
  const invalid=Boolean(String(value).trim())&&!stage
  return <section className={styles.editor} aria-labelledby="dao-score-editor-title">
    <div className={styles.editorHeader}>
      <span className={styles.motif} aria-hidden="true">☯</span>
      <div>
        <h2 id="dao-score-editor-title">{ru?'У-син · ресурсная ступень':'Wu Xing · resource stage'}</h2>
        <p>{ru
          ? 'Укажите вашу оценку ресурса «Я» — ступень определится автоматически.'
          : 'Enter your practitioner-assessed Self resource score; the stage is calculated automatically.'}</p>
      </div>
    </div>
    <div className={styles.editorGrid}>
      <label className={styles.scoreLabel} htmlFor="daoResourceScore">
        <span>{ru?'Ресурс «Я» · 0–10':'Self resource · 0–10'}</span>
        <input id="daoResourceScore" name="daoResourceScore" type="text"
          inputMode="decimal" autoComplete="off" maxLength={4} placeholder="3.8"
          aria-invalid={invalid} aria-describedby="dao-score-help"
          value={value} onChange={event=>onChange(event.target.value)} />
        <small id="dao-score-help">{ru?'Необязательно. Один знак после запятой.':'Optional. One decimal place.'}</small>
      </label>
      <div className={styles.scorePreview} aria-live="polite">
        {stage ? <>
          <span className={styles.scoreEyebrow}>{ru?'Ступень определена':'Stage identified'}</span>
          <strong>{stage.level}. {stage.name}</strong>
          <span>{ru?'Диапазон':'Range'}: {stage.range}</span>
        </> : <span className={styles.previewPlaceholder}>{invalid
          ? (ru?'Введите балл от 0 до 10 (например, 3,8).':'Enter 0–10 (e.g. 3.8).')
          : (ru?'Оставьте пустым, чтобы не включать раздел в отчёт.':'Leave blank to omit this section from the report.')}</span>}
      </div>
    </div>
    <p className={styles.methodNote}>{ru
      ? 'Авторская шкала ресурсных ступеней Дао (18 уровней), связанная с практикой У-син. Не является медицинским диагнозом.'
      : 'Author’s 18-level Dao Resource Ladder used alongside Wu Xing; not a medical diagnosis.'}</p>
  </section>
}

// Native details stays closed until the reader opens it.
// One source of truth is used by both the private client report and editor.
export function DaoStageDisclosure({score,locale='ru'}) {
  const stage=stageFor(score,locale)
  if(!stage)return null
  const ru=locale==='ru'
  const body=<>
    <p>{stage.description}</p>
    <p><strong>{ru?'Задача ступени':'Stage focus'}:</strong> {stage.focus}</p>
    {stage.nextName && <p><strong>{ru?'Следующая ступень':'Next stage'}:</strong> {stage.nextLevel}. {stage.nextName}</p>}
    <small>{ru
      ? 'Интерпретация по авторской модели ресурсных ступеней, не медицинская оценка.'
      : 'An interpretation within the author’s resource-stage model, not a medical assessment.'}</small>
  </>
  return <section className={styles.reportSection} aria-label={ru?'Ступень У-син':'Wu Xing stage'}>
    <details className={styles.disclosure}>
      <summary>
        <span className={styles.stageSymbol} aria-hidden="true">☯</span>
        <span className={styles.stageSummary}>
          <strong>{ru?'Ступень У-син':'Wu Xing stage'}</strong>
          <span>{stage.score.toFixed(1)} / 10 · {ru?'ступень':'level'} {stage.level} · {stage.name}</span>
        </span>
        <span className={styles.chevron} aria-hidden="true">⌄</span>
      </summary>
      <div className={styles.stageContent}>
        <span className={styles.stageRange}>{ru?'Ресурсный диапазон':'Resource range'}: {stage.range}</span>
        {body}
      </div>
    </details>
    <div className={styles.printVersion} aria-hidden="true">
      <h2>{ru?'Ступень У-син':'Wu Xing stage'} · {stage.level}. {stage.name} ({stage.score.toFixed(1)}/10)</h2>
      <p>{stage.description}</p><p><strong>{ru?'Задача':'Focus'}:</strong> {stage.focus}</p>
    </div>
  </section>
}
