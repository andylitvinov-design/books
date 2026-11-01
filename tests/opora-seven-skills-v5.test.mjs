import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { OPORA_SEVEN_SKILLS, oporaSkillCards, oporaSkillForDay, oporaSkillPassportValid,
  COURSE_ANTISTRESS_SKILLS_V5, OPORA_SKILL_SLIDE_MODEL } from '../lib/inner-growth/anti-stress-skills-v5.js'
import { lessonFor, COURSE_ANTISTRESS_OUTCOME_V3 } from '../lib/inner-growth/lesson-library.js'
import { buildCourseSlides, verifyCourseSlideVisitOrder } from '../lib/inner-growth/course-slide-sequence.js'
import { antiStressBlueprint } from '../lib/inner-growth/anti-stress-blueprint.js'

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('AS-5.0 specifies seven skills introduced in week one and revisited in week two',()=>{
 assert.equal(COURSE_ANTISTRESS_SKILLS_V5,'hh-antistress-skills-v5-20261017')
 assert.equal(oporaSkillPassportValid(),true)
 assert.equal(OPORA_SEVEN_SKILLS.length,7)
 for(const locale of ['ru','en']){
   const skills=oporaSkillCards(locale)
   assert.deepEqual(skills.map(row=>row.days),[[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],[7,14]])
   for(let day=1;day<=14;day++){
     const l=oporaSkillForDay(day,locale)
     const index=(day-1)%7
     assert.equal(l.skillId,skills[index].id)
     assert.equal(l.week,day<=7?1:2)
     assert.equal(l.practiceMode,day<=7?'guided_optional':'independent_or_hint')
     assert.equal(l.slideModel,OPORA_SKILL_SLIDE_MODEL)
     assert.equal(l.durationSeconds,540)
     assert.ok(l.guide.length>75&&l.action.length>35)
     assert.equal(l.skill,skills[index].title)
     assert.notEqual(l.title,(day<=7?oporaSkillForDay(day+7,locale):oporaSkillForDay(day-7,locale)).title)
   }
 }
})

test('New V5 enrolments have seven compact slides; older V3 lessons preserve 15 screens and immutable IDs',()=>{
 for(const lang of ['ru','en']){
   for(let day=1;day<=14;day++){
     const v5=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_SKILLS_V5)
     const old=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_OUTCOME_V3)
     assert.ok(v5&&old)
     assert.notEqual(v5.id,old.id)
     assert.equal(v5.antiStress.slideModel,OPORA_SKILL_SLIDE_MODEL)
     assert.equal(v5.antiStress.week,day<=7?1:2)
     const slides=buildCourseSlides(v5)
     assert.deepEqual(slides.map(item=>item.kind),['welcome','checkin','guided','ritual','transfer','reflection','feedback'])
     assert.equal(new Set(slides.map(s=>s.key)).size,7)
     assert.equal(slides[2].section.kind,'meditation')
     assert.ok(v5.durationSeconds>=480&&v5.durationSeconds<=720)
     assert.equal(verifyCourseSlideVisitOrder(slides,slides.map(s=>s.key)),true)
     assert.equal(verifyCourseSlideVisitOrder(slides,slides.map(s=>s.key).slice(0,-1)),false)
     assert.equal(buildCourseSlides(old).length,15)
     assert.match(old.id,/hh-antistress-outcomes-v3-20261014/)
   }
 }
})

test('Public V6 fifteen-screen preview preserves seven skill IDs and supports all three public languages',()=>{
 for(const locale of ['ru','en','es']){
   const blueprint=antiStressBlueprint(locale)
   assert.equal(blueprint.skills.length,7)
   assert.equal(blueprint.days.length,14)
   assert.deepEqual(blueprint.skills.map(skill=>skill.days),[[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],[7,14]])
   for(let day=1;day<=14;day++){
     const d=blueprint.days[day-1]
     const ref=oporaSkillForDay(day,locale==='es'?'en':locale)
     assert.equal(d.day,day)
     assert.equal(d.skillId,ref.skillId)
     assert.equal(d.week,ref.week)
     assert.equal(d.checkDay,day>7)
     assert.equal(d.screens.length,15)
     assert.ok(d.screens.every(s=>s.expected.length>=10))
     assert.equal(d.methodStatus,'implemented')
     assert.equal(d.methodNames.length,3)
   }
 }
})

test('V5 remains version-pinned while new AS2 cycles select V6 and keep old module routes',()=>{
 const server=read('lib/app/growth-daily.js')
 const player=read('components/app/course-slide-player.jsx')
 const passport=read('docs/myspace/HOLISTIC_HOUSE_OPORA_ANTISTRESS_7_SKILLS_COURSE_PASSPORT_AS5_2026-10-17.md')
 assert.match(server,/\? COURSE_ANTISTRESS_SKILLS_V7 : COURSE_CONTENT_V4/)
 assert.match(server,/const firstStressDay=Boolean\(version===COURSE_ANTISTRESS_OUTCOME_V3/)
 assert.match(server,/verifyCourseSlideVisitOrder\(requiredSlides,input.visitedSlideKeys\)/)
 assert.match(player,/const isSkillV5=Boolean\(lesson\.antiStress\?\.slideModel===OPORA_SKILL_SLIDE_MODEL/)
 assert.match(player,/!isSkillV5 && lesson\.antiStress/)
 assert.match(player,/isSkillV5\?'8–12'/)
 assert.match(passport,/Неделя|неделя/)
 assert.match(passport,/ПТСР/)
 assert.match(passport,/AS4/)
})

test('V5 practice screens omit visible Skip response buttons; saved legacy routes remain supported',()=>{
 const player=read('components/app/course-slide-player.jsx')
 assert.match(player,/\{!isSkillV5&&!isDayOne&&<button type="button" className=\{styles\.welcomeSkip\}/)
 assert.match(player,/\{!isSkillV5&&!isDayOne&&\(\['baseline','checkin','guided','ritual','transfer','symbol','moment','reflection'\]/)
 assert.match(player,/\.\.\.\(!isSkillV5\?\[\['skip',learning\.practiceSkip\]\]:\[\]\)/)
 const feedbackGate=player.match(/\.\.\.\(!isSkillV5\?\[\['skip',words\.preferNot\]\]:\[\]\)/g)||[]
 assert.equal(feedbackGate.length,3)
 // Older lesson versions still understand previously saved 'skip' values.
 assert.match(player,/session\?\.signals\?\.comfort \|\| 'skip'/)
 assert.match(player,/session\?\.signals\?\.practiceAttempt \|\| ''/)
 // The normal footer action does not gate continuation on any optional answer.
 assert.match(player,/index === slides\.length - 1 \? \(\) => void finishLesson\(\)/)
 assert.match(player,/isSkillV5\?'8–12'/)
})
