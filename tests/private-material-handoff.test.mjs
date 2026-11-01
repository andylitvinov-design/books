import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8')
for(const locale of ['en','ru','es'])test(locale+': free drawing entry keeps materials off messengers and reuses private intake',()=>{
 const source=read('components/free-drawing-intake.tsx')
 assert.doesNotMatch(source,/navigator\.clipboard|ContactChannelChooser|whatsappEnquiryUrl|<textarea|<form|emitPublicAnalyticsEvent/)
 assert.match(source,/\/coaching\/intake/)
 assert.ok(source.includes(locale+':'))
})
test('EN/RU/ES protect clinical answers while acknowledging optional consented Telegram photos and drawings',()=>{
 const landing=read('components/free-entry-landing.tsx'),capture=read('components/consultation-choice-capture.tsx')
 // The manual consultation and the full questionnaire still prohibit sending
 // sensitive private answers, drawings and scores through WhatsApp.
 for(const phrase of ['Do not send private answers','Не отправляйте личные ответы','No envíes respuestas privadas'])
   assert.ok(capture.includes(phrase),phrase)
 // Previously approved Telegram V2 invites an optional non-clinical photo and
 // drawing after explicit consent. The public instructions must not contradict it.
 for(const phrase of ['After consent, the Telegram dialogue may ask',
   'После согласия Telegram-бот может','Tras dar tu consentimiento, Telegram puede pedir'])
   assert.ok(landing.includes(phrase),phrase)
 for(const phrase of ['medical records, test results and sensitive details in the protected website form',
   'Медицинские документы, результаты тестов и чувствительные сведения передавайте только через защищённую форму сайта',
   'Envía expedientes médicos, pruebas y datos sensibles solo por el formulario protegido'])
   assert.ok(landing.includes(phrase),phrase)
 assert.doesNotMatch(landing,/Use WhatsApp or Telegram to share your answers|Пришлите анкету и фото рисунка в WhatsApp|Comparte las respuestas y la foto por WhatsApp/)
})
test('canonical draft is owner-only, consented and has no public analytics or messenger transport',()=>{
 const form=read('components/coaching-intake-form.tsx'),repo=read('lib/app/coaching-intake.js')
 for(const phrase of ['Do not send answers','Не отправляйте ответы','No envíes respuestas'])assert.ok(form.includes(phrase),phrase)
 assert.doesNotMatch(form,/emitPublicAnalyticsEvent|ContactChannelChooser|whatsappEnquiryUrl/)
 assert.match(repo,/account_id=\$1/)
 assert.match(repo,/consent !== true/)
 assert.match(repo,/transaction\(config, actor/)
})

test('entry renders only an allowlisted public topic link, never arbitrary query data', async()=>{
 const {coachingIntakeEntryTopic}=await import('../lib/coaching/intake-model.js')
 const source=read('components/free-drawing-intake.tsx')
 const jsx=(type,props)=>({type,props:props||{}})
 for(const locale of ['en','ru','es'])for(const topic of ['personal','goal','business','wellbeing']){
  let state='personal',effects=[]
  const exports={}, modules={
   'react/jsx-runtime':{jsx,jsxs:jsx},
   react:{useId:()=> 'private-intake',useState:()=>[state,value=>{state=value}],useEffect:effect=>{effects.push(effect)}},
   'next/link':{default:'a'},'lucide-react':{ArrowUpRight:'span',FileText:'span',ShieldCheck:'span'},
   '@/lib/coaching/intake-model':{coachingIntakeEntryTopic},'./free-drawing-intake.module.css':{default:{}},
  }
  const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText
  runInNewContext(compiled,{exports,URLSearchParams,window:{location:{search:'?topic='+topic+'&answers=private-secret'}},require:name=>{assert.ok(Object.hasOwn(modules,name),name);return modules[name]}})
  exports.FreeDrawingIntake({locale});effects.forEach(effect=>effect());effects=[]
  const tree=exports.FreeDrawingIntake({locale}),links=[]
  function visit(node){if(Array.isArray(node))return node.forEach(visit);if(node&&typeof node==='object'){if(node.props?.href)links.push(node.props.href);visit(node.props?.children)}}
  visit(tree)
  assert.deepEqual(links,['/'+locale+'/coaching/intake?topic='+topic])
 }
 assert.equal(coachingIntakeEntryTopic('?topic=unknown&answers=private'),'personal')
})
