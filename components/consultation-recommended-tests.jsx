'use client'

import { useMemo, useState } from 'react'

export function ConsultationRecommendedTests({ locale = 'en', options = [], selectedKeys = [], onChange }) {
  const ru = locale === 'ru'
  const [search, setSearch] = useState('')
  const selected = useMemo(() => new Set(selectedKeys), [selectedKeys])
  const chosen = selectedKeys.map(key => options.find(test => test.key === key)).filter(Boolean)
  const matches = options.filter(test =>
    !selected.has(test.key) &&
    (test.title + ' ' + test.key).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  )
  const available = matches.slice(0, search.trim() ? 60 : 30)
  const max = 8

  function add(key) {
    if (!key || selected.has(key) || selectedKeys.length >= max ||
      !options.some(test => test.key === key)) return
    onChange([...selectedKeys, key])
    setSearch('')
  }

  return <div className="consultation-recommended-tests" aria-labelledby="consultation-recommended-tests-title">
    <div className="consultation-recommended-tests-heading">
      <h3 id="consultation-recommended-tests-title">{ru ? 'Рекомендуемые тесты' : 'Recommended tests'}</h3>
      <span>{chosen.length}/{max}</span>
    </div>
    <p>{ru
      ? 'Выберите по названию тесты, которые клиенту стоит пройти после консультации. Ссылки появятся в его отчёте и PDF.'
      : 'Choose the tests you recommend by name. Their links will appear in the client report and PDF.'}</p>
    <label htmlFor="consultation-test-search">{ru ? 'Поиск по названию' : 'Search tests by name'}</label>
    <input id="consultation-test-search" type="search" value={search}
      onChange={event => setSearch(event.target.value)}
      placeholder={ru ? 'Введите название теста…' : 'Type a test name…'}
      disabled={selectedKeys.length >= max} />
    <select aria-label={ru ? 'Добавить тест из каталога' : 'Add a test from the catalog'} value=""
      disabled={selectedKeys.length >= max || matches.length === 0}
      onChange={event => add(event.target.value)}>
      <option value="">{matches.length === 0
        ? (ru ? 'Тесты не найдены' : 'No matching tests')
        : (ru ? 'Выберите тест из списка…' : 'Choose a test…')}</option>
      {available.map(test => <option key={test.key} value={test.key}>
        {test.title}{test.startLocale !== locale ? (ru ? ' (на другом языке)' : ' (other language)') : ''}
      </option>)}
    </select>
    {matches.length > available.length && <small>{ru
      ? 'Уточните название в поиске, чтобы увидеть остальные тесты.'
      : 'Narrow your search to find more tests.'}</small>}
    {chosen.length > 0 && <ul className="consultation-recommended-tests-selection">
      {chosen.map((test, index) => <li key={test.key}>
        <span><strong>{index + 1}. {test.title}</strong>
          {test.startLocale !== locale && <small>{ru ? 'Тест откроется на доступном языке' : 'Opens in its available language'}</small>}
        </span>
        <button type="button" aria-label={(ru ? 'Удалить ' : 'Remove ') + test.title}
          onClick={() => onChange(selectedKeys.filter(key => key !== test.key))}>
          {ru ? 'Удалить' : 'Remove'} ×
        </button>
      </li>)}
    </ul>}
  </div>
}
