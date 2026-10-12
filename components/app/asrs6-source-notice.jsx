import styles from './asrs6-source-notice.module.css'

export function asrs6ChoiceClass(definition, question, value) {
  return definition.key === 'asrs-6' && value >= question.shadedFrom ? styles.shaded : undefined
}

export function Asrs6ChoiceMarker({ definition, question, value }) {
  if (definition.key !== 'asrs-6' || value < question.shadedFrom) return null
  return <small className={styles.marker}>{definition.instrumentLocale === 'ru' ? '▧ Заштриховано' : '▧ Shaded'}</small>
}

// Source content is kept apart from HH's accessibility/implementation explanation.
export function Asrs6SourceNotice({ definition, startedAt, locale = 'en' }) {
  if (definition?.key !== 'asrs-6') return null
  const ru = locale === 'ru'
  const date = startedAt && Number.isFinite(Date.parse(startedAt))
    ? new Date(startedAt).toLocaleDateString(definition.instrumentLocale === 'ru' ? 'ru-RU' : 'en-CA') : ''
  return <aside className={styles.notice} data-asrs6-source-notice>
    <div lang={definition.instrumentLocale}>
      <p>{definition.eligibilityText}</p>
      <label className={styles.date}>{definition.instrumentLocale === 'ru' ? 'Дата' : 'Date'}
        <input type="text" readOnly value={date} aria-readonly="true" />
      </label>
      <p>{definition.safetyText}</p>
      <p>{definition.printedScoringText}</p>
    </div>
    <p lang="en">{definition.requiredSiteAttribution}</p>
    {definition.formCopyright && <p lang="en">{definition.formCopyright}</p>}
    <div className={styles.productNote} lang={locale}>
      <strong>{ru ? 'Пояснение Holistic House' : 'Holistic House explanation'}</strong>
      <p>{ru
        ? 'Заштрихованные варианты также обозначены символом ▧ и подписью. Подсчитываются только эти ответы: 0–6, порог — 4. Для расчёта здесь нужны все шесть ответов; пропуски не заменяются нулём. Это правило полноты Holistic House. Дата соответствует началу сохранённого прохождения.'
        : 'Shaded options also carry the ▧ symbol and a text label. Only these responses are counted: 0–6, threshold 4. This site requires all six answers; missing answers are never replaced with zero. This completeness requirement is a Holistic House safeguard. The date is the start date of this saved run.'}</p>
      {definition.instrumentLocale === 'ru' && <p>{ru
        ? 'Русская форма распространяется NYU официально. Валидация именно этого русского текста не подтверждена. Доступность перевода не означает доказанную точность скрининга на русском языке.'
        : 'The Russian form is officially distributed by NYU. Validation of this exact Russian wording is unverified. Translation availability does not establish Russian-language screening accuracy.'}</p>}
    </div>
  </aside>
}
