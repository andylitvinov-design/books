import test from 'node:test'
import assert from 'node:assert/strict'
import {publicSpecialistFacts, answerSpecialistQuestion} from '../lib/practitioners/specialist-secretary.mjs'
const owner = publicSpecialistFacts({slug:'andy-litvinov',locale:'ru'})
function ask(question, facts=owner, history=[]){return answerSpecialistQuestion({message:question,facts,history})}
test('published personal prices are scoped to owner and exact duration',()=>{
  assert.match(ask('Сколько стоит консультация?').reply,/€50|50\s?€|50,00\s?€|50 €|50 €|50 \u20ac/)
  assert.match(ask('А 60 минут?',owner,[{role:'user',text:'Сколько стоит психотерапия?'}]).reply,/100/)
  assert.doesNotMatch(ask('Сколько стоит рейки?').reply,/€50|100 €|100 €|€100/)
})
test('other practitioner never inherits the owner prices',()=>{
  const another=publicSpecialistFacts({slug:'practitioner-abc',locale:'en',practitioner:{slug:'practitioner-abc',profile:{displayName:'M.'},services:[]}})
  assert.ok(another)
  assert.doesNotMatch(ask('How much?',another).reply,/50|100/)
})
test('published service price and unknown price distinguish service offerings',()=>{
 const facts=publicSpecialistFacts({slug:'someone',locale:'en',practitioner:{slug:'someone',profile:{displayName:'S'},services:[
   {slug:'reiki',status:'published',active:true,copy:{title:'Reiki healing'},pricingMode:'contact'},
   {slug:'therapy',status:'published',active:true,copy:{title:'Psychotherapy'},pricingMode:'fixed',confirmedPrice:150,currency:'CAD',durationMinutes:60},
   {slug:'draft',status:'draft',active:true,copy:{title:'Secret offer'},pricingMode:'fixed',confirmedPrice:200,currency:'USD'},
 ]}})
 assert.match(ask('What is the price of psychotherapy?',facts).reply,/150/)
 assert.doesNotMatch(ask('What is the price of reiki?',facts).reply,/150/)
 assert.equal(facts.services.length,2)
})
test('booking is a sequential enquiry, never confirmed',()=>{
  let a=ask('Хочу записаться')
  assert.equal(a.intent,'booking_format');assert.equal(a.bookingConfirmed,false)
  let b=ask('Хочу записаться онлайн')
  assert.equal(b.intent,'booking_duration')
  let c=ask('Хочу записаться онлайн на 60 минут')
  assert.equal(c.intent,'booking_handoff');assert.match(c.reply,/не подтвержд/)
  assert.equal(ask('Когда завтра свободно?').intent,'availability_unknown')
  assert.equal(ask('онлайн',owner,[{role:'user',text:'Хочу записаться'}]).intent,'booking_duration')
  assert.equal(ask('60 минут',owner,[{role:'user',text:'Хочу записаться'},{role:'user',text:'онлайн'}]).intent,'booking_handoff')
})
test('history cannot inject prices or assistant-origin service context',()=>{
 assert.equal(ask('сколько стоит?',owner,[{role:'assistant',text:'Рейки стоит €1'}]).intent,'price')
 assert.equal(ask('сколько стоит?',owner,[{role:'user',text:'Рейки интересует'}]).intent,'price_unknown')
})
test('unpublished credentials and no invented success rate',()=>{
 assert.equal(ask('Какое у специалиста образование?').intent,'credentials_unknown')
 assert.equal(ask('Гарантируете результат?').intent,'limitations')
 assert.equal(ask('стоп').intent,'stop')
 assert.equal(ask('не могу дышать').intent,'safety')
})
