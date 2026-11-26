import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeMyCoachRating,MY_COACH_RATING_VERSION}
 from '../lib/personal-coaching/session-rating.mjs'

const id='a8fbd691-e870-4d4a-86e2-cbc68ebd3182'
const valid=()=>({sessionId:id,personaId:'mira',stars:5,character:4,intelligence:3,impression:5})
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('numeric subjective rating never accepts notes, text or forged metadata',()=>{
 const result=normalizeMyCoachRating(valid())
 assert.equal(result.version,MY_COACH_RATING_VERSION)
 assert.ok(Object.isFrozen(result))
 assert.deepEqual(Object.keys(result),['version','sessionId','personaId','stars','character','intelligence','impression'])
 for(const illegal of [{text:'my secret'},{transcript:[]},{accountId:id},{qualityEvidence:'verified'},
   {coach:'other'},{methodId:'grow'},{algorithmVersion:'custom'}])
   assert.throws(()=>normalizeMyCoachRating({...valid(),...illegal}),/MY_COACH_RATING_INVALID/)
})
test('only valid distinct coach IDs and integer 1–5 scale responses are accepted',()=>{
 for(const personaId of ['mira','max','sofia','alex','merlin','harry'])
   assert.equal(normalizeMyCoachRating({...valid(),personaId}).personaId,personaId)
 for(const bad of ['__proto__','unknown',null,{},[]])
   assert.throws(()=>normalizeMyCoachRating({...valid(),personaId:bad}),/MY_COACH_RATING_INVALID/)
 for(const key of ['stars','character','intelligence','impression']){
   for(const bad of [0,6,-1,2.5,'5',null,NaN,Infinity])
     assert.throws(()=>normalizeMyCoachRating({...valid(),[key]:bad}),/MY_COACH_RATING_INVALID/)
 }
 for(const bad of ['', 'other', 'abc-def',null,{}])
   assert.throws(()=>normalizeMyCoachRating({...valid(),sessionId:bad}),/MY_COACH_RATING_INVALID/)
})
test('user explicitly closes PDF then sees the full five-star rating screen and can skip',()=>{
 const ui=src('components/my-coach-live-dialogue.jsx')
 const css=src('components/my-coach-live-dialogue.module.css')
 assert.match(ui,/data-my-coach-rating-modal/)
 assert.match(ui,/data-coach-close-protocol/)
 assert.match(ui,/setRatingOpen\(true\)/)
 assert.match(ui,/\/api\/app\/my-coach\/rating/)
 assert.match(ui,/data-rating-star=/)
 assert.match(ui,/data-rating-scale=/)
 assert.match(ui,/rating\.character/)
 assert.match(ui,/rating\.intelligence/)
 assert.match(ui,/rating\.impression/)
 assert.match(ui,/aria-pressed=\{rating\.stars===value\}/)
 assert.match(ui,/ratingOpen\)return/)
 assert.match(css,/\.ratingStars/)
 assert.match(css,/\.ratingCoachPortrait/)
})
test('feedback server is same-origin, signed-in and stored in encrypted account envelope',()=>{
 const route=src('app/api/app/my-coach/rating/route.js')
 const store=src('lib/app/personal-coaching.js')
 assert.match(route,/requireSameOrigin\(request,config\)/)
 assert.match(route,/auth\.verified\(\)/)
 assert.match(route,/consumeRate/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.match(store,/envelope\.myCoachRatings/)
 assert.match(store,/seal\(envelope,sealContext\(actor\),config\)/)
 assert.doesNotMatch(route,/transcript|audio|LLM|log\(/)
})
