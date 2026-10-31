import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BUSINESS_QUESTION_TOPICS, BUSINESS_TOPIC_GUIDE, inferBusinessTopic, businessNeedForTopic,
} from '../lib/business-consulting/question-guide.js'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('all eight Business themes have distinct EN/RU/ES follow-up questions and actionable tips',()=>{
  assert.equal(BUSINESS_QUESTION_TOPICS.length,8)
  assert.equal(new Set(BUSINESS_QUESTION_TOPICS).size,8)
  for(const locale of ['en','ru','es']){
    const topics=BUSINESS_TOPIC_GUIDE[locale]
    assert.deepEqual(Object.keys(topics),BUSINESS_QUESTION_TOPICS)
    for(const topic of BUSINESS_QUESTION_TOPICS){
      const entry=topics[topic]
      assert.ok(entry.label.length>=5,locale+' '+topic+' label')
      assert.ok(entry.question.length>=12,locale+' '+topic+' question')
      assert.ok(entry.idea.length>=18,locale+' '+topic+' idea')
      assert.ok(entry.options.length>=2&&entry.options.length<=3)
      assert.equal(new Set(entry.options.map(o=>o.id)).size,entry.options.length)
      for(const option of entry.options){
        assert.ok(option.label.length>=4&&option.tip.length>=18)
      }
    }
  }
})

test('a visitor question suggests a single clear topic but admits uncertainty',()=>{
  const samples=[
    ['Как привлечь клиентов?', 'clients'],
    ['Не хватает дохода', 'money'],
    ['Хочу открыть свой бизнес', 'start'],
    ['Не могу выбрать стратегию', 'strategy'],
    ['Как найти новую работу?', 'career'],
    ['Ищу новые возможности', 'opportunities'],
    ['Разногласия в команде', 'team'],
    ['Постоянно откладываю дела', 'focus'],
    ['How can I find more clients?', 'clients'],
    ['My salary is unpredictable', 'money'],
    ['I am launching a new business', 'start'],
    ['We need a new strategy', 'strategy'],
    ['I need a new job', 'career'],
    ['I am exploring new opportunities', 'opportunities'],
    ['My business partner disagrees', 'team'],
    ['Procrastination slows me down', 'focus'],
    ['¿Cómo encuentro clientes?', 'clients'],
    ['Necesito mejorar mis ingresos', 'money'],
    ['Quiero lanzar mi negocio', 'start'],
    ['Debo tomar una decisión estratégica', 'strategy'],
    ['Busco un nuevo empleo', 'career'],
    ['Busco nuevas oportunidades', 'opportunities'],
    ['Conflicto con mi socio', 'team'],
    ['Tengo poca motivación', 'focus'],
  ]
  for(const [question,expected] of samples)assert.equal(inferBusinessTopic(question),expected,question)
  assert.equal(inferBusinessTopic(''),null)
  assert.equal(inferBusinessTopic('???'),null)
  assert.equal(inferBusinessTopic('I need help with something unusual'),null)
  assert.equal(inferBusinessTopic('My clients and my income'),null,'ambiguous themes should not feign certainty')
  assert.equal(inferBusinessTopic(null),null)
})

test('recommendations remain within legitimate consultation families and do not leak free text',()=>{
  for(const topic of ['all',...BUSINESS_QUESTION_TOPICS]){
    assert.ok(['clarity','income','growth'].includes(businessNeedForTopic(topic)))
  }
  const finder=read('components/business-consultation-finder.tsx')
  const browser=read('components/business-service-browser.tsx')
  const selector=read('components/topic-journey-selector.tsx')
  assert.match(finder,/data-business-question-input/)
  assert.match(finder,/data-business-question-submit/)
  assert.match(finder,/onTopicIdentified\?\.\(nextTopic\)/)
  assert.match(browser,/data-business-clarification-idea/)
  assert.match(selector,/onTopicIdentified=\{setBusinessTopic\}/)
  assert.match(selector,/selectedTopic=\{businessTopic\}/)
  assert.doesNotMatch(finder,/fetch\(|localStorage|sessionStorage|URLSearchParams\(|JSON\.stringify\(question\)/)
  assert.doesNotMatch(browser,/fetch\(|localStorage|sessionStorage|URLSearchParams\(/)
  assert.match(finder,/data-business-finder-context': context/)
  assert.doesNotMatch(finder,/data-business-finder-context': question/)
})
