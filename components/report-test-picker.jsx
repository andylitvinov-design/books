'use client'

import { useMemo, useState } from 'react'

const MAX_SELECTION = 12

export function ReportTestPicker({ options = [], locale = 'en', selectedKeys = [], onChange }) {
  const ru = locale === 'ru'
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const selected = new Set(selectedKeys)
  const lookup = useMemo(() => new Map(options.map(item => [item.key, item])), [options])
  const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().trim()
  const query = normalize(search)
  const filtered = options.filter(item => !query ||
    normalize([item.title.en, item.title.ru, item.key].join(' ')).includes(query))
  const visible = showAll || query ? filtered.slice(0, 40) : filtered.slice(0, 8)

  function toggle(key) {
    if (selected.has(key)) onChange(selectedKeys.filter(value => value !== key))
    else if (selectedKeys.length < MAX_SELECTION) onChange([...selectedKeys, key])
  }
  const labelFor = option => option?.title?.[locale] || option?.title?.en || option?.key || ''

  return <section className="consultation-report-test-picker" aria-labelledby="consultation-report-test-picker-heading">
    <div className="consultation-report-test-picker-head">
      <div>
        <h3 id="consultation-report-test-picker-heading">{ru ? 'Рекомендуемые тесты' : 'Recommended tests'}</h3>
        <p>{ru
          ? 'Необязательно. Выберите тесты из каталога — клиент увидит их в конце отчёта и сможет открыть одним нажатием.'
          : 'Optional. Choose tests from the catalog. They will appear at the end of the client report with direct start links.'}</p>
      </div>
      <strong>{ru ? 'Выбрано' : 'Selected'}: {selectedKeys.length}</strong>
    </div>
    {selectedKeys.length > 0 && <div className="consultation-report-test-selected" aria-label={ru ? 'Выбранные тесты' : 'Selected tests'}>
      {selectedKeys.map(key => <button key={key} type="button" onClick={() => toggle(key)}
        aria-label={(ru ? 'Убрать тест: ' : 'Remove test: ') + labelFor(lookup.get(key))}>
        <span>{labelFor(lookup.get(key))}</span><span aria-hidden="true">×</span>
      </button>)}
    </div>}
    <label className="consultation-report-test-search">
      <span>{ru ? 'Поиск по названию теста' : 'Search tests by name'}</span>
      <input type="search" value={search} onChange={event => { setSearch(event.target.value); setShowAll(false) }}
        placeholder={ru ? 'Например, стресс или личность…' : 'For example, stress or personality…'} />
    </label>
    <div className="consultation-report-test-options">
      {visible.map(option => {
        const active = selected.has(option.key)
        const availableInLanguage = option.availableLocales.includes(locale)
        return <label key={option.key} className="consultation-report-test-option" data-selected={active}>
          <input type="checkbox" checked={active}
            disabled={!active && selectedKeys.length >= MAX_SELECTION}
            onChange={() => toggle(option.key)} />
          <span><strong>{labelFor(option)}</strong>
            <small>{option.questionCount ? option.questionCount + (ru ? ' вопросов' : ' questions') : ''}
              {option.durationMinutes ? ' · ~' + option.durationMinutes + (ru ? ' мин' : ' min') : ''}
              {!availableInLanguage ? ' · ' + (ru ? 'Вопросы на другом языке' : 'Questions in another language') : ''}</small>
          </span>
        </label>
      })}
      {filtered.length === 0 && <p className="consultation-report-test-empty">{ru ? 'Тестов с таким названием нет.' : 'No tests match this search.'}</p>}
    </div>
    {!query && !showAll && filtered.length > 8 && <button type="button" className="consultation-report-test-show-more"
      onClick={() => setShowAll(true)}>{ru ? 'Показать весь каталог' : 'Show all available tests'} ({filtered.length})</button>}
    {query && filtered.length > 40 && <p className="consultation-report-test-empty">{ru ? 'Уточните название, чтобы увидеть остальные тесты.' : 'Refine your search to see more tests.'}</p>}
    {selectedKeys.length >= MAX_SELECTION && <p className="consultation-report-test-empty">
      {ru ? 'Максимум 12 тестов в одном отчёте.' : 'Up to 12 tests per report.'}</p>}
  </section>
}
