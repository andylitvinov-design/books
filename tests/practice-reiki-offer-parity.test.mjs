import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { normalizeReikiOffer, reikiOfferPricing, matchReikiVariants } from '../lib/practitioners/reiki-offer.mjs';
import { validateServiceDraft } from '../lib/practitioners/contracts.js';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const base = {
  copy:{ru:{title:'Рейки: индивидуальная поддержка',shortDescription:'Дистанционная практика по договоренности.'}},
  areaKey:'energy_spiritual', offeringType:'session', deliveryFormat:'online', languages:['ru'], methods:['Tantra Reiki'],
  pricingMode:'from',confirmedPrice:0,currency:'EUR',durationMinutes:null,
};
const session = {kind:'session',currency:'EUR',timings:['day','days'],role:'master',variants:[
  {duration:30,report:'brief',certificate:false,price:20},
  {duration:30,report:'voice',certificate:false,price:50},
  {duration:60,report:'text',certificate:false,price:100},
]};
const initiation = {kind:'initiation',currency:'EUR',timings:['days','chosen'],role:null,variants:[
  {duration:null,report:'brief',certificate:false,price:50},
  {duration:null,report:'brief',certificate:true,price:75},
  {duration:null,report:'voice',certificate:true,price:110},
]};
const course = {kind:'course',currency:'EUR',timings:['chosen'],role:null,variants:[
  {duration:null,report:'brief',certificate:false,price:0},
  {duration:null,report:'text',certificate:true,price:25},
]};
test('support: same-price duration/report bands, accepted timing, verified role, never session certificate',()=>{
  assert.equal(matchReikiVariants(session,{kind:'session',price:'low',time:'day',report:'brief',role:'master'}).length,1);
  assert.equal(matchReikiVariants(session,{kind:'session',price:'low',time:'day',report:'voice',role:'master'}).length,0);
  assert.equal(matchReikiVariants(session,{kind:'session',price:'mid',time:'day',report:'voice',role:'master'}).length,1);
  assert.equal(matchReikiVariants(session,{kind:'session',time:'chosen',role:'master'}).length,0);
  assert.equal(matchReikiVariants(session,{kind:'session',time:'day',role:'practitioner'}).length,0);
  assert.equal(matchReikiVariants(session,{kind:'initiation',time:'day'}).length,0);
  assert.equal(normalizeReikiOffer(session,{complete:true}).variants.length,3);
});
test('initiation/course show certificate price separately, free and paid not mixed',()=>{
  assert.deepEqual(matchReikiVariants(initiation,{kind:'initiation',price:'high',time:'days',report:'brief',certificate:true}).map(x=>x.price),[75]);
  assert.deepEqual(matchReikiVariants(initiation,{kind:'initiation',price:'mid',time:'days',report:'brief',certificate:false}).map(x=>x.price),[50]);
  assert.equal(matchReikiVariants(initiation,{kind:'initiation',price:'mid',time:'days',report:'brief',certificate:true}).length,0);
  assert.equal(matchReikiVariants(course,{kind:'course',price:'free',time:'chosen',report:'brief',certificate:false}).length,1);
  assert.equal(matchReikiVariants(course,{kind:'course',price:'free',time:'chosen',report:'brief',certificate:true}).length,0);
  assert.equal(reikiOfferPricing(course).pricingMode,'from');
});
test('server refuses fake certificate on session, duplicates, unsupported variant, malformed price or role',()=>{
  const invalid = [
    {...session,variants:[{...session.variants[0],certificate:true}]},
    {...session,variants:[session.variants[0],session.variants[0]]},
    {...session,variants:[{...session.variants[0],duration:45}]},
    {...session,variants:[{...session.variants[0],price:-1}]},
    {...session,variants:[{...session.variants[0],price:5.123}]},
    {...session,variants:[{...session.variants[0],price:'20'}]},
    {...session,role:'friend'},
    {...initiation,role:'master'},
    {...initiation,variants:[{...initiation.variants[0],duration:30}]},
    {...session,timings:['day','day']},
    {...session,variants:[]},
  ];
  for(const offer of invalid)assert.throws(()=>normalizeReikiOffer(offer,{complete:true}),/INVALID_REIKI_OFFER/);
});
test('moderated server derives honest price, forbids arbitrary area/type, keeps drafts private',()=>{
  const approved = validateServiceDraft({...base,pricingMode:'contact',confirmedPrice:null,currency:'',reikiOffer:session},{complete:true});
  assert.equal(approved.areaKey,'energy_spiritual');
  assert.equal(approved.confirmedPrice,20);
  assert.equal(approved.pricingMode,'from');
  assert.equal(approved.reikiOffer.variants[1].price,50);
  assert.equal(validateServiceDraft({...base,pricingMode:'contact',confirmedPrice:null,currency:'',offeringType:'course',reikiOffer:course},{complete:true}).pricingMode,'from');
  assert.throws(()=>validateServiceDraft({...base,areaKey:'business_money',reikiOffer:session},{complete:true}),/INVALID_REIKI_OFFER/);
  assert.throws(()=>validateServiceDraft({...base,offeringType:'course',reikiOffer:session},{complete:true}),/INVALID_REIKI_OFFER/);
  assert.throws(()=>validateServiceDraft({...base,pricingMode:'contact',confirmedPrice:null,currency:'',reikiOffer:{...session,variants:[]}},{complete:true}),/INVALID_REIKI_OFFER/);
  assert.equal(validateServiceDraft({...base,pricingMode:'contact',confirmedPrice:null,currency:'',reikiOffer:{...session,variants:[]}},{complete:false}).reikiOffer.variants.length,0);
});
test('create service dedicated Reiki path and published-only read preserve existing security',()=>{
  const editor=read('components/app/simple-service-editor.jsx'),workspace=read('components/app/practice-workspace.jsx');
  const gallery=read('components/holistic-support-master-gallery.tsx'),publicApi=read('lib/practitioners/public-remote-support-masters.ts');
  const repository=read('lib/practitioners/repository.js'),route=read('app/api/public/remote-energy-support-masters/route.ts');
  const css=read('components/app/simple-service-editor.module.css');
  for(const kind of ['session','initiation','course']) assert.ok(editor.includes("'"+kind+"'"),kind);
  for(const label of ['data-reiki-service-editor','data-reiki-variant','data-reiki-certificate','data-reiki-timing','data-reiki-role'])assert.ok(editor.includes(label),label);
  assert.match(workspace,/data-create-practice-reiki/);
  assert.match(publicApi,/service\.status === "published"/);
  assert.match(repository,/reikiOffer:draft\.reikiOffer/);
  assert.match(route,/kind === "reiki"/);
  assert.match(gallery,/matchReikiVariants/);
  assert.match(css,/@media\s*\(max-width:650px\)/);
  assert.doesNotMatch(publicApi,/draftCopy|draft_copy/);
});

test('unfinished price rows remain private saveable drafts, never published free offers', () => {
  const pending={...session,variants:[{...session.variants[0],price:null}]};
  assert.equal(normalizeReikiOffer(pending,{complete:false}).variants[0].price,null);
  assert.equal(reikiOfferPricing(normalizeReikiOffer(pending,{complete:false})).pricingMode,'contact');
  assert.deepEqual(matchReikiVariants(pending,{kind:'session',report:'brief',price:'free'}),[]);
  assert.throws(()=>normalizeReikiOffer(pending,{complete:true}),/INVALID_REIKI_OFFER/);
  const saved=validateServiceDraft({...base,pricingMode:'contact',confirmedPrice:null,currency:'',reikiOffer:pending},{complete:false});
  assert.equal(saved.reikiOffer.variants[0].price,null);
  assert.throws(()=>validateServiceDraft({...base,reikiOffer:pending},{complete:true}),/INVALID_REIKI_OFFER/);
});
