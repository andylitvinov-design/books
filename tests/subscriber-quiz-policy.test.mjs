import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  parseSubscriberQuizCallback, subscriberQuizCatalog, subscriberQuizMenu,
  subscriberQuizConsent, subscriberQuizQuestion, subscriberQuizResult,
  subscriberQuizSafety, quizCopy,
} from '../lib/app/subscriber-quiz-policy.mjs'
import { parseSubscriberAiUpdate } from '../lib/app/subscriber-ai-policy.mjs'

test('callback grammar and 64-byte limit reject forged or malformed quiz actions',()=>{
  assert.deepEqual(parseSubscriberQuizCallback('hhq:a:4:0'),{type:'answer',revision:4,value:0})
  assert.deepEqual(parseSubscriberQuizCallback('hhq:p:7:3'),{type:'options',revision:7,page:3})
  assert.deepEqual(parseSubscriberQuizCallback('hhq:s:hh-current-state'),{type:'select',key:'hh-current-state'})
  assert.deepEqual(parseSubscriberQuizCallback('hhq:b:4'),{type:'back',revision:4})
  assert.deepEqual(parseSubscriberQuizCallback('hhq:k:4'),{type:'ack',revision:4})
  assert.equal(parseSubscriberQuizCallback('hhq:a:-1:0'),null)
  assert.equal(parseSubscriberQuizCallback('hhq:a:NaN:0'),null)
  assert.equal(parseSubscriberQuizCallback('hhq:s:42'),null)
  assert.deepEqual(parseSubscriberQuizCallback('hhq:g:hh-current-state'),{type:'agree',key:'hh-current-state'})
  assert.equal(parseSubscriberQuizCallback('hhq:g'),null)
  assert.equal(parseSubscriberQuizCallback('hhq:a:0:0x20'),null)
  assert.equal(parseSubscriberQuizCallback('hhq:x'.repeat(15)),null)
})

test('quiz callbacks are intercepted only after authentic private bot callback verification',()=>{
  const t=1762400000
  const cb={
    update_id:500,callback_query:{id:'callback1',data:'hhq:a:1:0',
      from:{id:12345,language_code:'ru'},
      message:{date:t,chat:{id:12345,type:'private'},
        from:{is_bot:true,username:'andydotbot'}}},
  }
  const parse=(event)=>parseSubscriberAiUpdate(event,'andydotbot',t*1000)
  assert.equal(parse(cb).action,'quiz')
  assert.equal(parse(cb).quiz.value,0)
  assert.equal(parse({...cb,callback_query:{...cb.callback_query,from:{id:9999}}}),null)
  assert.equal(parse({...cb,callback_query:{...cb.callback_query,message:{
    ...cb.callback_query.message,from:{is_bot:true,username:'foreignbot'}}}}),null)
  assert.equal(parse({...cb,callback_query:{...cb.callback_query,data:'hhq:a:1:9999'}}),null)
  assert.equal(parse({update_id:501,message:{
    date:t,text:'/tests_off',chat:{id:12345,type:'private'},
    from:{id:12345,language_code:'ru',is_bot:false},
  }}).action,'quiz-off')
})

test('catalog enumerates only approved and real rights-cleared questionnaires',()=>{
  for(const locale of ['ru','en','es']){
    const catalog=subscriberQuizCatalog(locale)
    assert.ok(catalog.length>10)
    assert.ok(catalog.some(x=>x.item.key==='hh-current-state'))
    assert.ok(catalog.every(x=>x.item.startable&&x.item.guestEligible&&x.item.rightsStatus==='cleared'))
    assert.ok(catalog.every(x=>x.definition.questions.length>0))
    assert.ok(!catalog.some(x=>x.item.key==='phq-9'))
    assert.ok(!catalog.some(x=>x.definition.administration?.kind==='trauma-front-matter-v1'))
    const menu=subscriberQuizMenu(locale,0)
    assert.ok(menu.keyboard.inline_keyboard.length>0)
    assert.ok(menu.keyboard.inline_keyboard.every(row=>row.every(x=>x.callback_data.length<=64)))
  }
})

test('consent precedes questionnaire and Telegram uses exact registered source text',()=>{
  const entry=subscriberQuizCatalog('ru').find(x=>x.item.key==='hh-current-state')
  assert.ok(entry)
  const consent=subscriberQuizConsent(entry.definition,'ru')
  assert.match(consent.text,/18\+/)
  assert.match(consent.text,/Telegram/)
  assert.equal(consent.keyboard.inline_keyboard[0][0].callback_data,'hhq:g:hh-current-state')
  const first=subscriberQuizQuestion(entry.definition,'ru',0,2,{})
  assert.ok(first.text.includes(entry.definition.questions[0].text))
  assert.match(first.text,/1\/5/)
  assert.ok(first.keyboard.inline_keyboard.some(row=>row.some(b=>b.callback_data==='hhq:a:2:0')))
  assert.ok(first.keyboard.inline_keyboard.every(row=>row.every(b=>b.callback_data.length<=64)))
})

test('numeric day-count choices are paginated to remain compact',()=>{
  const def={key:'days',questions:[{id:'a',text:'Days last month',min:0,max:30}],answerScale:{min:0,max:30}}
  const page0=subscriberQuizQuestion(def,'en',0,5,{})
  const page3=subscriberQuizQuestion(def,'en',0,5,{},3)
  assert.equal(page0.keyboard.inline_keyboard.flat().some(x=>x.callback_data==='hhq:a:5:0'),true)
  assert.equal(page0.keyboard.inline_keyboard.flat().some(x=>x.callback_data==='hhq:a:5:30'),false)
  assert.equal(page3.keyboard.inline_keyboard.flat().some(x=>x.callback_data==='hhq:a:5:30'),true)
  assert.equal(page0.keyboard.inline_keyboard.flat().some(x=>x.callback_data==='hhq:p:5:1'),true)
})

test('completed results and safety preserve explicit non-diagnostic disclaimers',()=>{
  const out=subscriberQuizResult({questions:[]},{dimensions:[{key:'mood',value:3,max:10,sourceConstruct:'mood'}]},'ru')
  assert.match(out.text,/не является диагнозом/i)
  assert.match(out.text,/mood: 3 \/ 10/)
  const risk=subscriberQuizSafety('en',4)
  assert.match(risk.text,/988/)
  assert.equal(risk.keyboard.inline_keyboard[0][0].callback_data,'hhq:k:4')
  assert.match(quizCopy('es').deleted,/Telegram/)
})

test('private table schema keeps RLS, encryption, single session, and revocation',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261106174500_hh_subscriber_quiz_private_v1.sql',import.meta.url),'utf8')
  assert.match(sql,/unique\s+references app_private\.subscriber_ai_sessions/)
  assert.match(sql,/force row level security/)
  assert.match(sql,/subscriber_quiz_server/)
  assert.match(sql,/answers_ciphertext/)
  assert.match(sql,/expires_at/)
  const runtime=readFileSync(new URL('../lib/app/subscriber-ai-telegram.js',import.meta.url),'utf8')
  assert.match(runtime,/purgeQuiz\(db,session\.id\)/)
  assert.match(runtime,/if\(action==='tests'&&!session\.consent_at\)action='open'/)
  assert.match(runtime,/action==='tests'\|\|action==='quiz'/)
  assert.match(runtime,/writeResponse\(db,config,session,event\.updateId,'tests',reply\)/)
})
