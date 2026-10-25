import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateServiceDraft, OFFERING_TYPES } from '../lib/practitioners/contracts.js'
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8')
const editor=read('components/app/simple-service-editor.jsx')
const css=read('components/app/simple-service-editor.module.css')
const sql=read('supabase/migrations/20261025143000_hh_practitioner_talisman_service_type.sql')
const make=(patch={})=>({
  copy:{en:{title:'Synthetic service',shortDescription:'This is a personal session.'}},
  areaKey:'personal_development',offeringType:'assessment',deliveryFormat:'online',
  locationLabel:'',languages:['en'],pricingMode:'free',confirmedPrice:null,currency:'',
  durationMinutes:30,imagePath:'',...patch,
})
test('three service directions are shown first; free/paid is nested under diagnostics',()=>{
 for(const kind of ['diagnostic','energy','talisman'])assert.ok(editor.includes('data-service-kind="'+kind+'"'))
 for(const kind of ['diagnostic-free','diagnostic-paid'])assert.ok(editor.includes('data-service-choice="'+kind+'"'))
 assert.ok(editor.includes('typePickerOpen&&<section'))
 assert.ok(editor.includes('!typePickerOpen&&stage===0&&<section'))
 assert.ok(editor.includes("chooseServiceKind('diagnostic-free')"))
 assert.ok(editor.includes("chooseServiceKind('diagnostic-paid')"))
 assert.ok(editor.includes("chooseServiceKind('talisman')"))
 assert.ok(editor.includes("setTypePickerOpen(false)"))
 assert.ok(editor.includes("setDraft(prev=>({...prev,...preset,priceOptions:[]}))"))
})
test('free and paid diagnostics preserve existing server side assessment and pricing',()=>{
 const free=validateServiceDraft(make(),{complete:true})
 assert.equal(free.offeringType,'assessment')
 assert.equal(free.pricingMode,'free')
 assert.equal(free.confirmedPrice,null)
 const paid=validateServiceDraft(make({pricingMode:'fixed',confirmedPrice:50,currency:'EUR'}),{complete:true})
 assert.equal(paid.pricingMode,'fixed')
 assert.equal(paid.confirmedPrice,50)
 assert.throws(()=>validateServiceDraft(make({pricingMode:'fixed',confirmedPrice:null,currency:'EUR'})),/INVALID_PRICE/)
})
test('talisman is a real offering type validated by server and database',()=>{
 assert.ok(OFFERING_TYPES.includes('talisman'))
 const value=validateServiceDraft(make({offeringType:'talisman',areaKey:'energy_spiritual',pricingMode:'contact',confirmedPrice:null}),{complete:true})
 assert.equal(value.offeringType,'talisman')
 assert.equal(value.pricingMode,'contact')
 for(const type of OFFERING_TYPES)assert.ok(sql.includes("'"+type+"'"))
 assert.match(sql,/service_offerings_type_check/)
 assert.doesNotMatch(sql,/create table|drop table|drop policy|disable row level security/i)
})
test('EN RU ES include all types, no false medical claims or fabricated price',()=>{
 for(const copy of ['Free diagnostic','Paid diagnostic','Energy balancing','Talisman','Бесплатная диагностика','Платная диагностика','Энергетическая коррекция','Талисман','Evaluación gratuita','Evaluación de pago','Equilibrio energético','Talismán'])assert.ok(editor.includes(copy),copy)
 assert.ok(editor.includes('not a medical diagnosis'))
 assert.ok(editor.includes('не медицинский диагноз'))
 assert.ok(editor.includes("offeringType:'talisman'"))
 assert.ok(editor.includes("pricingMode:'contact'"))
 assert.ok(editor.includes("pricingMode:'free'"))
 assert.ok(editor.includes("pricingMode:'fixed'"))
 assert.ok(editor.includes('onSaveAndSubmit(item?.id||null,makePayload(),item?.revision)'))
})
test('type picker remains compact on iPhones without sticky save overlay',()=>{
 assert.match(css,/\.kindCards\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
 assert.ok(css.includes('.kindCards{grid-template-columns:1fr}'))
 assert.ok(css.includes('.quickForm .actions{position:static'))
 assert.ok(css.includes('@media(max-width:355px)'))
})
