import assert from 'node:assert/strict'
import test from 'node:test'
import { validateServiceDraft, serviceCopy } from '../lib/practitioners/contracts.js'
import { readFile } from 'node:fs/promises'

const base = {
  areaKey:'personal_development', offeringType:'session', deliveryFormat:'online',
  locationLabel:'', languages:['en'], pricingMode:'contact', confirmedPrice:null,
  currency:'', durationMinutes:null, imagePath:'', goals:[], methods:[], benefits:[],
  faq:[], displayLocales:['en','ru'], whatsapp:'', telegram:'',
}

test('a practitioner can submit a complete service in one source language',()=>{
  const english=validateServiceDraft({
    ...base, copy:{en:{title:'Reiki introduction',shortDescription:'A private one-to-one consultation.'}},
  },{complete:true})
  assert.equal(english.copy.en.title,'Reiki introduction')
  assert.equal(english.copy.ru.title,'')
  assert.equal(english.copy.es.title,'')
  const russian=validateServiceDraft({
    ...base, languages:['ru'],
    copy:{ru:{title:'Личная консультация',shortDescription:'Спокойное знакомство с методом.'}},
  },{complete:true})
  assert.equal(russian.copy.ru.title,'Личная консультация')
  const spanish=validateServiceDraft({
    ...base, languages:['es'], displayLocales:['en','ru','es'],
    copy:{es:{title:'Sesión de Reiki',shortDescription:'Sesión individual en línea.'}},
  },{complete:true})
  assert.equal(spanish.copy.es.title,'Sesión de Reiki')
})

test('empty or title-only services still cannot be published',()=>{
  assert.throws(()=>validateServiceDraft({...base,copy:{}},{complete:true}),/INCOMPLETE_SERVICE/)
  assert.throws(()=>validateServiceDraft({
    ...base,copy:{ru:{title:'Только название'}},languages:['ru'],
  },{complete:true}),/INCOMPLETE_SERVICE/)
})

test('service readers fall back to an actual non-empty language',()=>{
  const row={localized_copy:{
    en:{title:'',shortDescription:'',description:''},
    ru:{title:'Рейки',shortDescription:'Консультация',description:'Консультация'},
    es:{title:'Reiki',shortDescription:'Consulta',description:'Consulta'},
  }}
  assert.deepEqual(serviceCopy(row,'en'),{
    title:'Рейки', shortDescription:'Консультация', description:'Консультация',
  })
  assert.equal(serviceCopy(row,'es').title,'Reiki')
})

test('mobile practitioner editor keeps only two required visible fields',async()=>{
  const [editor,workspace,styles]=await Promise.all([
    readFile('components/app/simple-service-editor.jsx','utf8'),
    readFile('components/app/practice-workspace.jsx','utf8'),
    readFile('components/app/simple-service-editor.module.css','utf8'),
  ])
  assert.match(editor,/maxLength=\{160\}/)
  assert.match(editor,/maxLength=\{500\}/)
  assert.match(editor,/className=\{styles.advanced\}/)
  assert.match(editor,/onSaveAndSubmit/)
  assert.match(editor,/value=\{activeLanguage\}/)
  assert.match(workspace,/SimpleServiceEditor/)
  assert.match(workspace,/action:'submit',expectedRevision:saved.revision/)
  assert.match(styles,/@media \(max-width:500px\)/)
})
