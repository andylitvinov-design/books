import test from 'node:test'
import assert from 'node:assert/strict'
import {repositoryHarness,mount,findButton,textOf} from './helpers/route-pipeline-harness.mjs'
import {COURSE_ANTISTRESS_SKILLS_V6,OPORA54_PRE_SAVE_KEYS} from '../lib/inner-growth/anti-stress-skills-v6.js'
for(const locale of ['en','ru'])for(let day=1;day<=14;day++)test(`V6 ${locale} day ${day}: actual player saves the exact new factory lesson`,async()=>{
 const owner=repositoryHarness({freshPhase:true});const cycle=await owner.create('AS2')
 assert.equal(cycle.content_version,COURSE_ANTISTRESS_SKILLS_V6);owner.seedDay(day)
 const data=await owner.read(locale);let receipt,payload
 const player=mount('opora-v6-slide-player',{locale,data,onClose(){},onFinish(){},async onSession(input){payload=structuredClone(input);receipt=await owner.command(payload,locale);return true}})
 try{
  for(let step=0;step<14;step++){
   const label=step===13?(locale==='ru'?'Сохранить практику':'Save my practice'):(locale==='ru'?'Далее':'Continue')
   const button=findButton(player.tree,label);assert.ok(button,label+' in '+textOf(player.tree).slice(0,140));assert.ok(!button.props.disabled)
   await button.props.onClick();await player.settle()
  }
  assert.ok(receipt);assert.equal(owner.sessions.at(-1).lesson_id,data.lesson.id)
  assert.equal(owner.cycle.content_version,COURSE_ANTISTRESS_SKILLS_V6)
  assert.deepEqual(payload.visitedSlideKeys,Array.from(OPORA54_PRE_SAVE_KEYS))
  assert.equal(owner.sessions.at(-1).signals.interactionSchema,'as-5.4-fifteen-screens-v1')
  if(day===14)assert.equal(receipt.cycle.status,'completed')
 }finally{player.unmount()}
})
