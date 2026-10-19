import { daoResourceStage } from '@/lib/consultations/dao-resource-stage'
import { daoStageAuthorContent } from '@/lib/consultations/dao-stage-author-content'
import styles from './dao-resource-stage.module.css'

function stageFor(value, locale) {
  try { return daoResourceStage(value, locale) }
  catch { return null }
}

// Score and visibility are separate fields. Unchecking publication must never erase
// a practitioner-assessed score or change the computed stage.
export function DaoResourceStageField({
  value = '', onChange, locale = 'ru', published = true, onPublishedChange,
}) {
  const ru = locale === 'ru'
  const stage = stageFor(value, locale)
  const invalid = Boolean(String(value).trim()) && !stage
  return <section className={styles.editor} aria-labelledby="dao-score-editor-title">
    <div className={styles.editorHeader}>
      <span className={styles.motif} aria-hidden="true">☯</span>
      <div>
        <h2 id="dao-score-editor-title">{ru ? 'У-син · ресурсная ступень' : 'Wu Xing · resource stage'}</h2>
        <p>{ru
          ? 'Укажите оценку ресурса «Я» — ступень определится автоматически.'
          : 'Enter your practitioner-assessed Self resource score; the stage is calculated automatically.'}</p>
      </div>
    </div>
    <div className={styles.editorGrid}>
      <label className={styles.scoreLabel} htmlFor="daoResourceScore">
        <span>{ru ? 'Ресурс «Я» · 0–10' : 'Self resource · 0–10'}</span>
        <input id="daoResourceScore" name="daoResourceScore" type="text"
          inputMode="decimal" autoComplete="off" maxLength={4} placeholder="3.8"
          aria-invalid={invalid} aria-describedby="dao-score-help"
          value={value} onChange={event => onChange(event.target.value)} />
        <small id="dao-score-help">{ru ? 'Необязательно. Один знак после запятой.' : 'Optional. One decimal place.'}</small>
      </label>
      <div className={styles.scorePreview} aria-live="polite">
        {stage ? <>
          <span className={styles.scoreEyebrow}>{ru ? 'Ступень определена' : 'Stage identified'}</span>
          <strong>{stage.level}. {stage.name}</strong>
          <span>{ru ? 'Диапазон' : 'Range'}: {stage.range}</span>
        </> : <span className={styles.previewPlaceholder}>{invalid
          ? (ru ? 'Введите балл от 0 до 10 (например, 3,8).' : 'Enter 0–10 (e.g. 3.8).')
          : (ru ? 'Оставьте поле пустым, если оценка пока не определена.' : 'Leave blank if there is no score yet.')}</span>}
      </div>
    </div>
    <label className={styles.publicationToggle}>
      <input type="checkbox" name="daoResourcePublished" checked={published}
        onChange={event => onPublishedChange?.(event.target.checked)} />
      <span className={styles.toggleText}>
        <strong>{ru ? 'Публиковать ступень У-син в отчёте' : 'Publish Wu Xing stage in report'}</strong>
        <small>{published
          ? (ru ? 'Клиент увидит карточки с описанием и притчу, если они есть.' : 'The client will see the description cards and available parable.')
          : (ru ? 'Раздел будет скрыт в отчёте и PDF. Балл останется в редакторе.' : 'Hidden from the client report and PDF; score remains saved privately.')}</small>
      </span>
    </label>
    <p className={styles.methodNote}>{ru
      ? 'Авторская шкала ресурсных ступеней Дао (18 уровней), связанная с практикой У-син. Не является медицинским диагнозом.'
      : 'Author’s 18-level Dao Resource Ladder used alongside Wu Xing; not a medical diagnosis.'}</p>
  </section>
}

// Both the practitioner preview and client HTML report share this disclosure.
// Native details remain closed initially, including the nested parable.
// The original author text is Russian, even in reports with English navigation.
export function DaoStageDisclosure({ score, locale = 'ru', published = true }) {
  const stage = stageFor(score, locale)
  if (!published || !stage) return null
  const author = daoStageAuthorContent(stage.level)
  const ru = locale === 'ru'
  const body = <>
    <p>{stage.description}</p>
    <p><strong>{ru ? 'Задача ступени' : 'Stage focus'}:</strong> {stage.focus}</p>
    {stage.nextName && <p><strong>{ru ? 'Следующая ступень' : 'Next stage'}:</strong> {stage.nextLevel}. {stage.nextName}</p>}
  </>
  return <section className={styles.reportSection} aria-label={ru ? 'Ступень У-син' : 'Wu Xing stage'}>
    <details className={styles.disclosure}>
      <summary>
        <span className={styles.stageSymbol} aria-hidden="true">☯</span>
        <span className={styles.stageSummary}>
          <strong>{ru ? 'Ступень У-син' : 'Wu Xing stage'}</strong>
          <span>{stage.score.toFixed(1)} / 10 · {ru ? 'ступень' : 'level'} {stage.level} · {stage.name}</span>
        </span>
        <span className={styles.chevron} aria-hidden="true">⌄</span>
      </summary>
      <div className={styles.stageContent}>
        <span className={styles.stageRange}>{ru ? 'Ресурсный диапазон' : 'Resource range'}: {stage.range}</span>
        {author?.photo && <figure className={styles.stageHero}>
          {/* These are approved first-party site assets, never external client-media URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={author.photo} alt={ru ? author.photoAlt : 'Illustration of the current Dao stage'}
            loading="lazy" decoding="async" />
          <figcaption>{stage.level}. {stage.name}</figcaption>
        </figure>}
        <div className={styles.stageCards}>
          <article className={styles.stageCard}>
            <h3>{ru ? 'Авторское описание ступени' : 'Original stage description · Russian'}</h3>
            {author?.paragraphs?.length
              ? <div lang="ru" className={styles.stageParagraphs}>{author.paragraphs.map((paragraph, index) =>
                <p key={index}>{paragraph}</p>)}</div>
              : body}
          </article>
          {author?.cards?.map((card, index) =>
            <article className={styles.stageCard} key={card.title + index}>
              <h3 lang="ru">{card.title}</h3>
              <div lang="ru" className={styles.stageParagraphs}>{card.paragraphs.map((paragraph, i) =>
                <p key={i}>{paragraph}</p>)}</div>
            </article>)}
        </div>
        {author?.parable && <details className={styles.parableDisclosure}>
          <summary>
            <span className={styles.parableIcon} aria-hidden="true">📖</span>
            <span><strong>{ru ? 'Даосская притча этой ступени' : 'Daoist parable · original Russian'}</strong>
              <small lang="ru">{author.parable.title}</small></span>
            <span aria-hidden="true" className={styles.parableChevron}>⌄</span>
          </summary>
          <div className={styles.parableContent} lang="ru">
            {author.parable.body.split(/\n+/).filter(Boolean).map((paragraph, index) =>
              <p key={index}>{paragraph}</p>)}
          </div>
        </details>}
        <small>{ru
          ? 'Авторская образная модель ресурсных ступеней Дао. Не медицинская диагностика и не лечебная рекомендация.'
          : 'An author-defined metaphorical Dao model, not a medical diagnosis or treatment recommendation.'}</small>
      </div>
    </details>
    <div className={styles.printVersion} aria-hidden="true">
      <h2>{ru ? 'Ступень У-син' : 'Wu Xing stage'} · {stage.level}. {stage.name} ({stage.score.toFixed(1)}/10)</h2>
      <p>{ru ? 'Диапазон' : 'Range'}: {stage.range}</p>
      <p>{stage.description}</p><p><strong>{ru ? 'Задача' : 'Focus'}:</strong> {stage.focus}</p>
      {author?.paragraphs?.length && <p lang="ru">{author.paragraphs.join(' ')}</p>}
    </div>
  </section>
}
