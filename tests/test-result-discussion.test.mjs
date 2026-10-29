import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import { buildTestResultDiscussion,discussionTopicForTags,
  interpretTestDiscussionQuestion,testDiscussionOffers, discussionFormatFromText,
  discussionPriorityReason, discussionOpening, discussionReflectionQuestion } from '../lib/assessments/test-result-discussion.mjs'

const result={id:'private-result',definitionKey:'hh-current-state',measurementAt:'2026-10-28T12:00:00.000Z'}
const report={verified:true,sections:[
  {key:'stress',construct:'Tension',value:8,min:0,max:10,presentationDirection:'difficulty',bandBasis:'descriptive',summary:'Verified tension summary.',domain:'stress',recommendedReview:false},
  {key:'rest',construct:'Rest',value:3,min:0,max:10,presentationDirection:'resource',bandBasis:'descriptive',summary:'Verified rest summary.',domain:'resources',recommendedReview:false},
  {key:'trait',construct:'Curiosity',value:7,min:0,max:10,presentationDirection:'neutral',bandBasis:'descriptive',summary:'Descriptive trait.',domain:'personality',recommendedReview:false},
]}
test('uses original instrument points and source commentary, not arbitrary health percentages',()=>{
  const m=buildTestResultDiscussion({result,report,locale:'ru'})
  assert.equal(m.verified,true)
  assert.equal(m.highlights[0].key,'stress')
  assert.equal(m.highlights[0].score,'8 / 0–10')
  assert.equal(m.highlights[0].summary,'Verified tension summary.')
  assert.ok(!JSON.stringify(m).includes('80%'))
})
test('unverified results never create private analysis or offers',()=>{
  const m=buildTestResultDiscussion({result,report:{...report,verified:false},locale:'ru'})
  assert.equal(m.verified,false)
  assert.deepEqual(m.highlights,[])
  assert.deepEqual(testDiscussionOffers({verified:false}),[])
})
test('professional-review flags preserve source guidance and suppress paid upsell',()=>{
  const m=buildTestResultDiscussion({result,report:{...report,sections:[
    {...report.sections[0],recommendedReview:true,followUp:'Discuss symptoms with a qualified professional.'},
    report.sections[1],
  ]}})
  assert.equal(m.needsProfessional,true)
  assert.match(m.reviewNote,/qualified professional/)
  assert.ok(!testDiscussionOffers({needsProfessional:m.needsProfessional}).some(x=>x.id==='session'))
})
test('ASRS-6 real source-verified screening is discussable without made-up severity grades',()=>{
  const def=getAssessmentDefinition('asrs-6','v1','en')
  const answers=Object.fromEntries(Array.from({length:6},(_,i)=>['asrs6.'+String(i+1).padStart(2,'0'),0]))
  const result={...scoreAssessment(def,answers,syntheticTraumaContext(def)),id:'owned-asrs-test-result'}
  const original=buildAssessmentResultReport(result,'en')
  assert.equal(original.verified,undefined)
  assert.equal(original.sections[0].bandBasis,'screening')
  const discussion=buildTestResultDiscussion({result,report:original,locale:'en'})
  assert.equal(discussion.verified,true)
  assert.equal(discussion.highlights.length,1)
  assert.equal(discussion.highlights[0].score,'0 / 0–6')
  assert.match(discussion.highlights[0].summary,/screening threshold/i)
  assert.doesNotMatch(JSON.stringify(discussion),/0% healthy|severity grade/i)
})

test('visitor question can change theme; urgent language cannot become a sales recommendation',()=>{
  assert.deepEqual(interpretTestDiscussionQuestion('Хочу улучшить отношения','energy'),{urgent:false,topic:'relationships'})
  assert.deepEqual(interpretTestDiscussionQuestion('I want to kill myself','energy'),{urgent:true,topic:null})
  assert.equal(discussionTopicForTags(['work','stress']),'work')
})
test('EN/RU/ES deep links contain only allowlisted editorial keys',()=>{
  for(const locale of ['en','ru','es']){
    const offers=testDiscussionOffers({topic:'work',locale})
    assert.equal(offers.length,4)
    assert.ok(offers.every(x=>x.href.startsWith('/'+locale+'/')&&!x.href.includes('private-result')))
    assert.equal(offers.find(x=>x.id==='test').href,'/'+locale+'/client/tests?journey=business')
    assert.equal(offers.find(x=>x.id==='video').href,'/'+locale+'/holistic-support/mobile?view=meditation&topic=business')
  }
})
test('account history + result page both expose discussion; no additional data transport',()=>{
  const workspace=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
  const battery=readFileSync(new URL('../components/app/account-test-battery.jsx',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/app/test-result-discussion.jsx',import.meta.url),'utf8')
  assert.match(workspace,/<TestResultDiscussion /)
  assert.match(workspace,/discussionLoadedId === result.id/)
  assert.match(workspace,/setDiscussionLoadedId\(r\?\.id === id \? id : null\)/)
  const guideAt=workspace.indexOf('<TestResultDiscussion key={result.id')
  const reportAt=workspace.indexOf('<PersonalResultReport result={result}')
  assert.ok(guideAt>=0 && reportAt>guideAt, 'Discussion action must appear before the long report')
  assert.match(battery,/discuss=1#hh-test-result-discussion/)
  assert.match(ui,/data-test-result-offers/)
  assert.doesNotMatch(ui,/fetch\(|appFetch\(|localStorage|sessionStorage/)
})


test('all offer cards stop when the source recommends professional review',()=>{
  const offers=testDiscussionOffers({topic:'energy',locale:'ru',needsProfessional:true})
  assert.deepEqual(offers,[])
  const ui=readFileSync(new URL('../components/app/test-result-discussion.jsx',import.meta.url),'utf8')
  assert.match(ui,/model\.verified&&!model\.needsProfessional&&phase==='offers'/)
  assert.match(ui,/phase!=='safety'&&<button type="button" className=\{styles\.restart\}/)
})

test('missing numeric values cannot become verified personal interpretation',()=>{
  const missing={...report,sections:[{
    ...report.sections[0],value:99,max:10,
  }]}
  const model=buildTestResultDiscussion({result,report:missing,locale:'en'})
  assert.equal(model.verified,false)
  assert.deepEqual(model.highlights,[])
})

test('completion CTA and guest Google handoff preserve exact saved-result consent',()=>{
  const finish=readFileSync(new URL('../components/app/test-finish-actions.jsx',import.meta.url),'utf8')
  const workspace=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
  const guest=readFileSync(new URL('../components/app/cabinet-landing.jsx',import.meta.url),'utf8')
  assert.match(finish,/data-finish-discuss-test/)
  assert.match(finish,/typeof onDiscuss === 'function'/)
  assert.match(workspace,/onDiscuss=\{!courseMode \? \(\) => finish\('discuss'\)/)
  assert.match(workspace,/savedGuestDiscussionTarget/)
  assert.match(workspace,/sessionStorage\.getItem\(TEST_DISCUSSION_INTENT_KEY\)/)
  assert.match(workspace,/discuss=1#hh-test-result-discussion/)
  assert.match(guest,/data-guest-discuss-test/)
  assert.match(guest,/saveToCabinet\(guestResult, true\)/)
  assert.match(guest,/sessionStorage\.setItem\(TEST_DISCUSSION_INTENT_KEY, intent\.id\)/)
  assert.doesNotMatch(guest,/sessionStorage\.setItem\(.*(score|answer|health)/i)
})


test('professional reading distinguishes published screening, difficulties, resources and neutral traits',()=>{
  const m=buildTestResultDiscussion({result,report,locale:'ru'})
  assert.equal(m.highlights.length,3)
  assert.match(m.summary,/«/)
  assert.match(m.summary,/3 показателя/)
  assert.match(m.highlights[0].priorityReason,/трудност/)
  assert.match(m.highlights[1].priorityReason,/ресурс/)
  assert.match(m.highlights[2].priorityReason,/особенност/)
  for(const row of m.highlights){
    assert.ok(row.reflectionQuestion.length>10)
    assert.equal(row.trend,null)
    assert.doesNotMatch(row.priorityReason,/процент здоровья|выше среднего населения/i)
  }
  const screening=discussionPriorityReason({...report.sections[0],bandBasis:'screening',recommendedReview:true},'en')
  assert.match(screening,/professional-review/i)
  assert.equal(discussionOpening({title:'Sample',highlights:[m.highlights[0]],locale:'ru'}).includes('1 показатель'),true)
  assert.equal(discussionOpening({title:'Sample',highlights:[m.highlights[0]],locale:'es'}).includes('1 indicador.'),true)
})

test('professional reading can show arithmetic trend only for exact-source compatible history',()=>{
  const def=getAssessmentDefinition('asrs-6','v1','en')
  const score=(positive)=>scoreAssessment(def,Object.fromEntries(
    Array.from({length:6},(_,i)=>['asrs6.'+String(i+1).padStart(2,'0'),i<positive?2:0])
  ),syntheticTraumaContext(def))
  const owner='160dd802-78ed-4ecd-ad2b-2e096372ace3'
  const prior={...score(0),id:'c7003c77-f71c-41de-9974-80d9059948b4',accountId:owner,measurementAt:'2026-10-07T12:00:00.000Z'}
  const latest={...score(1),id:'d058b909-bfd1-4531-8181-63e1fdc4674f',accountId:owner,measurementAt:'2026-10-28T12:00:00.000Z'}
  const source=buildAssessmentResultReport(latest,'en')
  const m=buildTestResultDiscussion({result:latest,report:source,locale:'en',history:[latest,prior]})
  assert.equal(m.verified,true)
  assert.equal(m.comparablePrior,true)
  assert.equal(m.highlights[0].trend.from,0)
  assert.equal(m.highlights[0].trend.to,1)
  assert.match(m.highlights[0].trend.detail,/arithmet|cannot establish/i)
  const wrongOwner={...prior,accountId:'not-the-same-account'}
  const noComparison=buildTestResultDiscussion({result:latest,report:source,locale:'en',history:[latest,wrongOwner]})
  assert.equal(noComparison.highlights[0].trend,null)
  const wrongVersion={...prior,contentHash:'tampered'}
  const wrongInstrument=buildTestResultDiscussion({result:latest,report:source,locale:'en',history:[latest,wrongVersion]})
  assert.equal(wrongInstrument.highlights[0].trend,null)
})

test('explicit format choice controls first recommendation without turning a click into a sale',()=>{
  for(const locale of ['en','ru','es']){
    const byTest=testDiscussionOffers({locale,topic:'work',preference:'test'})
    assert.deepEqual(byTest.map(v=>v.id),['test','video','course','session'])
    const byVideo=testDiscussionOffers({locale,topic:'relationships',preference:'video'})
    assert.equal(byVideo[0].id,'video')
    assert.match(byVideo[0].href,/topic=love$/)
    const bySession=testDiscussionOffers({locale,topic:'energy',preference:'session'})
    assert.equal(bySession[0].id,'session')
    assert.ok(bySession.every(v=>!/(payment|success|checkout|orderId|score=)/i.test(v.href)))
  }
  assert.deepEqual(testDiscussionOffers({locale:'en',needsProfessional:true,preference:'session'}),[])
})

test('source topic selects a specific, non-diagnostic question in all three locales',()=>{
  for(const locale of ['en','ru','es']){
    const energy=discussionReflectionQuestion('energy',locale)
    const work=discussionReflectionQuestion('work',locale)
    const relationships=discussionReflectionQuestion('relationships',locale)
    const meaning=discussionReflectionQuestion('meaning',locale)
    assert.ok([energy,work,relationships,meaning].every(q=>q.length>30&&q.includes('?')))
    assert.equal(new Set([energy,work,relationships,meaning]).size,4)
    assert.doesNotMatch(energy+work+relationships+meaning,/diagnos(?:ed)? with|у вас диагноз|diagnóstico confirmado/i)
  }
})

test('bounded free-text intent never invents a diagnosis, hidden goal or payment',()=>{
  assert.equal(discussionFormatFromText('Хочу посмотреть короткое видео'),'video')
  assert.equal(discussionFormatFromText('Пройти следующий тест'),'test')
  assert.equal(discussionFormatFromText('I want a course'),'course')
  assert.equal(discussionFormatFromText('Quiero una sesión'),'session')
  assert.equal(discussionFormatFromText('я хочу умереть'),'urgent')
  assert.equal(discussionFormatFromText('Почему я так чувствую себя?'),null)
})

test('the UI waits for user relevance before offers and renders only three choices',()=>{
  const ui=readFileSync(new URL('../components/app/test-result-discussion.jsx',import.meta.url),'utf8')
  const workspace=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
  assert.match(ui,/data-discussion-choose-scale/)
  assert.match(ui,/data-discussion-relevance-choice=/)
  assert.match(ui,/data-discussion-format-choice=/)
  assert.match(ui,/data-discussion-professional-review/)
  assert.match(ui,/model\.summary/)
  assert.match(ui,/row\.trend/)
  assert.match(ui,/selected\.optionalStep/)
  assert.match(ui,/offers\.slice\(0,3\)/)
  assert.match(ui,/phase!=='safety'/)
  assert.match(workspace,/history=\{data\.results \|\| \[\]\}/)
  assert.match(workspace,/discussionLoadedId === result.id/)
  assert.doesNotMatch(ui,/navigator\.sendBeacon|fetch\(|appFetch\(|localStorage|sessionStorage|POST|autoEnroll/i)
})
