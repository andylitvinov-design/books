import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {MOTIVATOR_MIND_VERSION,MOTIVATOR_APPROACHES,MOTIVATOR_BELIEFS,buildMotivatorMessage,buildMotivatorCreativeBrief} from '../lib/assessments/motivator-mind.mjs'
const report=(domain='anxiety',review=false)=>({verified:true,rulesVersion:'tested-v3',sections:[{key:'test',domain,bandBasis:'descriptive',recommendedReview:review}]})
const result={id:'synthetic-42',definitionKey:'hh-anxiety'}

test('standalone persona has diverse methods and multilingual believable affirmations',()=>{
  assert.equal(MOTIVATOR_MIND_VERSION,'1.0.0')
  assert.ok(MOTIVATOR_APPROACHES.length>=11)
  assert.ok(MOTIVATOR_BELIEFS.length>=10)
  assert.ok(MOTIVATOR_BELIEFS.every(item=>item.ru&&item.en&&item.es))
})
test('verified reports receive deterministic local messages in EN, RU and ES',()=>{
  const texts=new Set()
  for(const locale of ['en','ru','es']){
    const options={report:report(),result,locale}
    const message=buildMotivatorMessage(options)
    assert.deepEqual(message,buildMotivatorMessage(options))
    assert.equal(message.topic,'anxiety')
    assert.equal(message.methodId,'cbt_reframe')
    assert.ok(message.paragraph.length>100)
    assert.ok(message.paragraph.includes(message.quote))
    texts.add(message.paragraph)
  }
  assert.equal(texts.size,3)
})
test('choice of topic changes approach, and a quote is one sentence',()=>{
  const a=buildMotivatorMessage({report:report('burnout'),result,locale:'ru'})
  const b=buildMotivatorMessage({report:report('work'),result,locale:'ru'})
  assert.equal(a.methodId,'self_compassion')
  assert.equal(b.methodId,'implementation_intentions')
  assert.notEqual(a.paragraph,b.paragraph)
  assert.equal(buildMotivatorMessage({report:report('work'),result,locale:'ru',format:'quote'}).paragraph,b.quote)
})
test('clinical review overrides exciting tone and does not displace professional care',()=>{
  const message=buildMotivatorMessage({report:report('mood',true),result,locale:'ru',tone:'inspiring'})
  assert.equal(message.topic,'review')
  assert.equal(message.tone,'gentle')
  assert.match(message.paragraph,/квалифицированным специалистом/)
  assert.doesNotMatch(message.paragraph,/вылеч|обязательно выздоров|всё пройдёт/)
})
test('no personal message for unverified, incompatible, empty or urgent contexts',()=>{
  assert.equal(buildMotivatorMessage({report:{...report(),verified:false},result}),null)
  assert.equal(buildMotivatorMessage({report:{verified:true,sections:[]},result}),null)
  assert.equal(buildMotivatorMessage({report:{verified:true,sections:[{bandBasis:'unavailable'}]},result}),null)
  assert.equal(buildMotivatorMessage({report:report(),result,safetyState:'crisis'}),null)
})
test('Bach stays non-medical and future model brief never grants transmission consent',()=>{
  const bach={verified:true,reportKind:'bach',sections:[{key:'a',domain:'bach',bandBasis:'descriptive',group:'main'}]}
  const message=buildMotivatorMessage({report:bach,result})
  assert.equal(message.topic,'bach')
  assert.doesNotMatch(message.paragraph,/cure|heals|treats/)
  const brief=buildMotivatorCreativeBrief({report:bach,result})
  assert.equal(brief.requiresExplicitModelConsent,true)
  assert.equal(brief.baseline,message.paragraph)
})
test('existing report UI renders the persona after method/caveats',()=>{
  const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
  const standard=read('components/app/compact-assessment-report.jsx')
  const bach=read('components/app/personal-result-report.jsx')
  assert.match(standard,/<MotivatorMind report=\{report\}/)
  assert.match(bach,/<MotivatorMind report=\{report\}/)
  assert.ok(standard.indexOf('<MotivatorMind')>standard.indexOf('data-assessment-methodology'))
  assert.ok(bach.indexOf('<MotivatorMind')>bach.indexOf('<footer'))
})
