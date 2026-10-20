import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync,readFileSync,statSync} from 'node:fs'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {OPORA54_PRE_SAVE_KEYS} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

const read = file => readFileSync(new URL('../'+file,import.meta.url),'utf8')
const photoPaths = [
 '/images/holistic-house/course-focus-mountain-boy.webp',
 '/images/holistic-house/report-lighthouse-coast.webp',
 '/images/holistic-house/reiki-approved-sunrise-v3.webp',
]

test('OPORA preserves real locally hosted photos on every compact learning screen', () => {
 const source=read('components/app/opora-v6-slide-player.jsx')
 const css=read('components/app/opora-v6-slide-player.module.css')
 for(const path of photoPaths){
   assert.ok(existsSync(new URL('../public'+path,import.meta.url)),'Missing real photo '+path)
   assert.ok(statSync(new URL('../public'+path,import.meta.url)).size>30_000,'Full-bleed photo is a tiny thumbnail '+path)
   assert.ok(source.includes(path),'Photo must be in the versioned player '+path)
 }
 assert.match(source,/data-course-photo-layout="v1"/)
 assert.match(source,/data-opora-slide-photo/)
 assert.match(source,/className=\{styles\.slideIntro\}/)
 assert.match(source,/className=\{styles\.heroPhoto\}/)
 assert.match(source,/activityOptions\.length>0&&!picked/)
 assert.match(source,/styles\.choiceGrid/)
 assert.match(css,/\.heroPhoto img[\s\S]*?object-fit:cover/)
 assert.match(css,/\.slideIntro[\s\S]*?grid-template-columns/)
 assert.match(css,/@media\(max-width:500px\) and \(max-height:740px\)/)
 assert.match(css,/overflow-x:hidden;overflow-y:auto/)
 assert.doesNotMatch(css.slice(css.indexOf('OPORA photo-first, one-viewport')),/\.scroll\s*\{[^}]*overflow-y:hidden/)
 assert.doesNotMatch(source,/className=\{styles\.heroIcon\}/)
})

test('every one of the 15 screens, for either language, renders a real photo without hiding controls', async () => {
 for(const locale of ['en','ru'])for(const day of [1,7,14]){
   const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
   const data={programme:{id:'stress'},lesson,cycle:{
     id:'00000000-0000-4000-8000-000000024110',day,durationDays:14,preferences:{}
   },currentSession:null}
   let saved=false
   const h=mount('opora-v6-slide-player',{locale,data,onClose(){},onFinish(){},
     onSession:async()=>{saved=true;return true}})
   for(let slide=0;slide<=OPORA54_PRE_SAVE_KEYS.length;slide++){
     // The scenic redesign keeps a full-frame backdrop and a separate slide
     // hero. Verify each role instead of mistaking two intended photos for a duplicate.
     for(const marker of ['data-opora-lesson-photo','data-opora-slide-photo']){
       const frames=nodes(h.tree).filter(n=>n.props&&Object.hasOwn(n.props,marker))
       assert.equal(frames.length,1,`day ${day} ${locale} slide ${slide+1}: ${marker} missing or duplicated`)
       assert.equal(frames[0].props['aria-hidden'],'true')
       const photos=nodes(frames[0]).filter(n=>n.type==='img')
       assert.equal(photos.length,1,`${marker} must contain exactly one decorative photo`)
       assert.ok(photoPaths.includes(photos[0].props.src),'Photo must retain a reviewed local asset')
       assert.equal(photos[0].props.alt,'')
     }
     const actions=nodes(h.tree).filter(n=>n.type==='button')
     assert.ok(actions.some(n=>textOf(n).includes(locale==='ru'?'Пауза':'Pause')),
       'Safety pause must remain available on each screen')
     if(slide===OPORA54_PRE_SAVE_KEYS.length){
       assert.equal(saved,true,'Fifteenth receipt follows confirmed save')
       assert.match(textOf(h.tree),locale==='ru'?/Практика сохранена/:/Practice saved/)
       break
     }
     const label=slide===OPORA54_PRE_SAVE_KEYS.length-1
       ?(locale==='ru'?'Сохранить практику':'Save my practice')
       :(locale==='ru'?'Далее':'Continue')
     const btn=findButton(h.tree,label)
     assert.ok(btn,`Navigation missing on day ${day} ${locale} slide ${slide+1}`)
     btn.props.onClick()
     await h.settle()
   }
   h.unmount()
 }
})
