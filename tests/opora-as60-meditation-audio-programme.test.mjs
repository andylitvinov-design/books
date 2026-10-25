import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,statSync} from 'node:fs'
import {oporaAs60Day} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {oporaAs60Journey,OPORA_EXPERIENCE_CHANNELS} from '../lib/inner-growth/opora-as60-integrated-journey.js'
import {antiStressBlueprint} from '../lib/inner-growth/anti-stress-blueprint.js'
import {validateOpora54Signals} from '../lib/inner-growth/anti-stress-skills-v6.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('public catalogue and lesson player share each of five day-specific exercises',()=>{
 for(const locale of ['ru','en','es']){
  const blueprint=antiStressBlueprint(locale)
  assert.equal(blueprint.days.length,14)
  for(let day=1;day<=14;day++){
   const entry=blueprint.days[day-1]
   const journey=oporaAs60Journey(day,locale)
   assert.equal(entry.title,oporaAs60Day(day,locale).title)
   assert.deepEqual(entry.experiences.map(e=>e.id),OPORA_EXPERIENCE_CHANNELS)
   assert.equal(entry.experiences.length,5)
   for(let i=0;i<5;i++){
    const key=OPORA_EXPERIENCE_CHANNELS[i]
    assert.equal(entry.experiences[i].text,journey[key].text)
    assert.equal(entry.experiences[i].title,journey[key].title)
   }
   assert.equal(entry.experiences[2].plan,journey.mental.plan)
   assert.ok(entry.experiences[3].title.length>10,'Imagery/meditation title')
  }
 }
 const overview=source('components/app/course-14-day-overview.jsx')
 assert.match(overview,/data-opora-five-experiences=\{day.day\}/)
 assert.match(overview,/day\.experiences\.map/)
 assert.match(overview,/data-opora-channel=\{item.id\}/)
 assert.match(overview,/!day\.experiences&&<details/)
})

test('local soundtrack exists, 2-minute meditations are tap-only and cancel on stop, hidden or unmount',()=>{
 const filepath=new URL('../public/audio/holistic-house-soft-melody-gentle-waves-20s.wav',import.meta.url)
 assert.ok(statSync(filepath).size>=500000,'WAV file is an actual recording, not a missing path')
 const audio=source('components/ocean-practice-audio.ts')
 assert.match(audio,/OCEAN_LOOP = "\/audio\/holistic-house-soft-melody-gentle-waves-20s.wav"/)
 assert.doesNotMatch(audio,/holistic-house-soft-melody-gentle-waves-96s.wav/)
 assert.match(audio,/return soundRef\.current\.play\(\)/)
 assert.match(audio,/document\.hidden/)
 assert.match(audio,/soundRef\.current\?\.dispose\(\)/)
 const player=source('components/app/opora-experience-player.jsx')
 assert.match(player,/channel==='imagery'&&<OporaOceanOutro locale=\{lang\} paused=\{safety\} compact\/>/)
 assert.match(player,/showIntegratedJourney\?OPORA_EXPERIENCE_SCENES\.slice\(0,4\):\[\]/)
 assert.match(player,/showIntegratedJourney\?OPORA_EXPERIENCE_SCENES\.slice\(4\):\[\]/)
 assert.doesNotMatch(player,/autoPlay=\{true\}/)
})

test('new private lesson marker is recognised without migrating old saved sessions',()=>{
 for(const edition of ['as-5.8-one-action-v1','as-5.9-seven-skills-v1','as-6.0-experiments-v1']){
  assert.equal(validateOpora54Signals({answers:{experienceEdition:edition},hints:[],ease:null})
    .answers.experienceEdition,edition)
 }
 assert.throws(()=>validateOpora54Signals({answers:{experienceEdition:'unknown'},hints:[],ease:null}))
 const player=source('components/app/opora-experience-player.jsx')
 assert.match(player,/const showIntegratedJourney=!hasSaved\|\|/)
 assert.match(player,/const \[channelAttempts,setChannelAttempts\]=useState\(\{\}\)/)
 const send=player.slice(player.indexOf('async function submit()'),player.indexOf('const title=moment==='))
 assert.ok(!send.includes('channelAttempts'),'Voluntary internal/emotional ratings stay device-local')
 assert.ok(!send.includes('microChoice'),'Optional choice is not a practice attempt')
})
