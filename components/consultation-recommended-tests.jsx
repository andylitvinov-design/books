'use client'

import { useMemo, useState } from 'react'
import { suggestReportTests, REPORT_TEST_SUGGESTION_COUNT } from '@/lib/consultations/report-test-matcher'

export function ConsultationRecommendedTests({
  locale='en',options=[],selectedKeys=[],onChange,
  analysis='',additionalNotes='',generalInstructions='',isDraftTemplate=false,
}) {
  const ru=locale==='ru'
  const [search,setSearch]=useState('')
  const [suggested,setSuggested]=useState(null)
  const [message,setMessage]=useState('')
  const selected=useMemo(()=>new Set(selectedKeys),[selectedKeys])
  const chosen=selectedKeys.map(key=>options.find(test=>test.key===key)).filter(Boolean)
  const matches=options.filter(test=>
    !selected.has(test.key)&&
    (test.title+' '+test.key).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const available=matches.slice(0,search.trim()?60:30)
  const max=8
  // A change to any report paragraph invalidates the old matching explanation
  // but never silently changes the practitioner's saved checkbox choices.
  const source=[locale,analysis,additionalNotes,generalInstructions].join('\u241f')
  const stale=suggested!==null&&suggested.source!==source

  function choose(key,checked) {
    if(!options.some(item=>item.key===key))return
    if(!checked){
      onChange(selectedKeys.filter(item=>item!==key))
      setMessage('')
    }else if(!selected.has(key)){
      if(selectedKeys.length>=max){
        setMessage(ru?'Выбрано максимум 8 тестов. Сначала снимите одну галочку.':
          'The limit is 8 tests. Remove one selection first.')
        return
      }
      onChange([...selectedKeys,key])
      setMessage('')
    }
  }
  function add(key){
    if(!key||selected.has(key))return
    choose(key,true)
    if(selectedKeys.length<max)setSearch('')
  }
  function autoPick(){
    if(isDraftTemplate){
      setSuggested(null)
      setMessage(ru?'Сначала замените пример анализа реальным описанием этой консультации.':
        'Replace the example analysis with this client’s own consultation notes first.')
      return
    }
    const results=suggestReportTests({analysis,additionalNotes,generalInstructions,options,locale})
    setSuggested({source,results})
    setMessage(results.length===0?
      (ru?'В тексте пока не хватает конкретных тем для подбора. Добавьте наблюдения в анализ и повторите.':
        'The report does not yet describe specific themes. Add observations to the analysis and try again.'):
      '')
  }

  return <div className="consultation-recommended-tests" aria-labelledby="consultation-recommended-tests-title">
    <div className="consultation-recommended-tests-heading">
      <h3 id="consultation-recommended-tests-title">{ru?'Рекомендуемые тесты':'Recommended tests'}</h3>
      <span>{chosen.length}/{max}</span>
    </div>
    <p>{ru?
      'Выберите тесты по названию или получите 5 предложений по тексту анализа. В отчёт попадут только отмеченные вами тесты.':
      'Choose tests by name or get five matches from your written analysis. Only tests you approve will appear in the client report.'}</p>

    <section className="consultation-test-auto" aria-label={ru?'Автоподбор тестов':'Automatic test matching'}>
      <button className="consultation-test-auto-button" type="button" onClick={autoPick}>
        {stale||suggested?(ru?'Обновить подбор 5 тестов':'Refresh five suggestions'):
          (ru?'Подобрать 5 тестов':'Suggest 5 tests')}
      </button>
      <small>{ru?'Анализ выполняется в редакторе, без отправки текста сторонним сервисам. Это подсказка, не диагноз.':
        'Matching stays in your browser; the client’s text is not sent to external services. This is not a diagnosis.'}</small>
      {stale&&<p className="consultation-test-stale" role="status">{ru?
        'Текст отчёта изменён — обновите подбор. Уже отмеченные тесты останутся выбранными.':
        'Report text changed — refresh suggestions. Previously selected tests are preserved.'}</p>}
      {suggested&&!stale&&suggested.results.length>0&&
        <fieldset className="consultation-test-suggestions">
          <legend>{ru?'Предлагаемые тесты — отметьте нужные':'Suggested tests — tick the ones you want'}</legend>
          <p>{ru?'Список не добавляется к отчёту, пока вы не отметите галочки и не сохраните отчёт.':
            'Nothing is added unless you tick a box and save the report.'}</p>
          {suggested.results.map((test,index)=><label key={test.key} className="consultation-test-suggestion">
            <input type="checkbox" checked={selected.has(test.key)}
              disabled={!selected.has(test.key)&&selectedKeys.length>=max}
              onChange={event=>choose(test.key,event.target.checked)}/>
            <span className="consultation-test-suggestion-copy">
              <strong>{index+1}. {test.title}</strong>
              <small>{test.reason}</small>
              {test.startLocale!==locale&&<small>{ru?'Доступен на другом языке':'Available in another language'}</small>}
            </span>
          </label>)}
          {suggested.results.length<REPORT_TEST_SUGGESTION_COUNT&&<small>{ru?
            'Найдены только тесты с подтверждённым тематическим совпадением. Остальные можно выбрать вручную.':
            'Only genuinely matching tests are shown. You can add more by name below.'}</small>}
        </fieldset>}
      {message&&<p className="consultation-test-auto-message" role="status">{message}</p>}
    </section>

    <label htmlFor="consultation-test-search">{ru?'Или найти тест по названию':'Or search tests by name'}</label>
    <input id="consultation-test-search" type="search" value={search}
      onChange={event=>setSearch(event.target.value)}
      placeholder={ru?'Введите название теста…':'Type a test name…'}
      disabled={selectedKeys.length>=max}/>
    <select aria-label={ru?'Добавить тест из каталога':'Add a test from the catalog'} value=""
      disabled={selectedKeys.length>=max||matches.length===0}
      onChange={event=>add(event.target.value)}>
      <option value="">{matches.length===0?
        (ru?'Тесты не найдены':'No matching tests'):
        (ru?'Выберите тест из списка…':'Choose a test…')}</option>
      {available.map(test=><option key={test.key} value={test.key}>
        {test.title}{test.startLocale!==locale?(ru?' (на другом языке)':' (other language)'):''}
      </option>)}
    </select>
    {matches.length>available.length&&<small>{ru?
      'Уточните название в поиске, чтобы увидеть остальные тесты.':
      'Narrow your search to find more tests.'}</small>}
    {chosen.length>0&&<ul className="consultation-recommended-tests-selection">
      {chosen.map((test,index)=><li key={test.key}>
        <span><strong>{index+1}. {test.title}</strong>
          {test.startLocale!==locale&&<small>{ru?'Тест откроется на доступном языке':'Opens in its available language'}</small>}
        </span>
        <button type="button" aria-label={(ru?'Удалить ':'Remove ')+test.title}
          onClick={()=>choose(test.key,false)}>
          {ru?'Удалить':'Remove'} ×
        </button>
      </li>)}
    </ul>}
  </div>
}
