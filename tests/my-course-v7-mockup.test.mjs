import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const today=read('components/app/course-today.jsx')
const todayCss=read('components/app/course-today.module.css')
const map=read('components/app/course-quest.jsx')
const mapCss=read('components/app/course-quest.module.css')
const player=read('components/app/course-slide-player.jsx')
const playerCss=read('components/app/course-slide-player.module.css')
const hero=read('public/images/holistic-house/course-hero-mindful.svg')

test('first screen presents course identity and one focused CTA with approved original character',()=>{
  assert.match(today,/data-course-today-heading/)
  assert.match(today,/Мой курс/)
  assert.match(today,/Number\(progress\.practiceCount\)\|\|0/)
  assert.match(today,/course-focus-mountain-boy\.webp/)
  assert.match(today,/data-course-teal-hero/)
  assert.match(today,/data-course-today-primary/)
  assert.match(today,/data-course-view=\{view\}/)
  assert.match(hero,/^<svg[^>]*viewBox="0 0 460 560"/)
  assert.match(hero,/<linearGradient/)
  assert.match(todayCss,/\.heroPerson\{/)
  assert.match(todayCss,/\.todayGreeting\{/)
  assert.match(todayCss,/\.todayReward\{/)
  assert.match(todayCss,/\.momentPeek\{/)
  assert.match(today,/data-course-today-trends/)
  assert.match(today,/view==='path'&&<CourseQuestMap/)
  assert.match(today,/view==='details'&&<>/)
  assert.doesNotMatch(today,/localStorage|sessionStorage|dangerouslySetInnerHTML/)
})

test('game map zigzags without overlapping absolute labels, with honest locked future state',()=>{
  assert.match(map,/data-side=\{index % 2 === 0 \? 'left' : 'right'\}/)
  assert.match(map,/\(item\.status === 'planned' \|\| item\.status === 'upcoming'\) \? <LockKeyhole/)
  assert.match(map,/roadmap\.map/)
  assert.match(map,/<ol className=\{styles\.path\}>/)
  assert.match(map,/<img className=\{styles\.journeyScene\}/)
  assert.match(mapCss,/\.mapShell \.pathRow\{[^}]*grid-template-columns:minmax\(0,1fr\) 88px minmax\(0,1fr\)/s)
  assert.match(mapCss,/\.mapShell \.pathLabel\{[^}]*position:static!important/s)
  assert.match(mapCss,/\.mapShell \.path::before\{/)
  assert.match(mapCss,/\.mapShell \.pathRow\[data-side=right\] \.pathLabel/)
  assert.match(mapCss,/@media\(max-width:355px\)/)
  assert.doesNotMatch(map,/correctAnswer|scorePenalty|leaderboard/)
})

test('first mission slide offers three real persisted practice choices; original check-ins remain separate',()=>{
  assert.match(player,/pace: 'Choose your rhythm'/)
  assert.match(player,/pace: 'Выберите свой темп'/)
  assert.match(player,/key: 'pace', kind: 'pace'/)
  assert.match(player,/key: 'baseline', kind: 'baseline'/)
  assert.match(player,/key: 'checkin', kind: 'checkin'/)
  assert.match(player,/kind:'understand'/)
  assert.match(player,/guided\.map\(\(section, index\)/)
  assert.match(player,/slide\.kind === 'pace'/)
  assert.match(player,/aria-pressed=\{pace===key\}/)
  assert.match(player,/async function savePace\(\)/)
  assert.match(player,/const result = await onPreferences\(next\)/)
  assert.match(player,/if \(result\) goNext\(\)/)
  assert.match(player,/slide\.kind === 'pace' \? \(\) => void savePace\(\)/)
  assert.match(player,/slide\.kind === 'checkin' \? \(\) => void saveCheckin\(\)/)
  assert.match(player,/day:cycle\.day,lessonId:lesson\.id,operationId:sessionOp\.current/)
  assert.match(player,/if \(response\) \{ sessionOp\.current = null; setEarned\(true\); setIndex\(slides\.length\) \}/)
  assert.match(player,/compareLessonMoments/)
  assert.match(player,/onFinish\|\|onClose/)
  assert.match(today,/onFinish=\{\(\)=>\{setQuestOpen\(false\);setView\('path'\)\}\}/)
  assert.match(playerCss,/\.paceChoices button\[aria-pressed=true\]/)
  assert.match(playerCss,/\.paceIcon\{/)
})

test('EN/RU mobile course stays keyboard accessible with a visible bottom action',()=>{
  assert.match(player,/event\.key === 'Escape'/)
  assert.match(player,/event\.key !== 'Tab'/)
  assert.match(player,/aria-modal="true"/)
  assert.match(player,/data-slide-scroller/)
  assert.match(playerCss,/safe-area-inset-bottom/)
  assert.match(playerCss,/@media\(max-width:540px\)/)
  assert.match(playerCss,/@media\(max-width:360px\)/)
  assert.match(playerCss,/prefers-reduced-motion:reduce/)
  assert.match(todayCss,/@media\(max-width:365px\)/)
  assert.match(mapCss,/@media\(max-width:620px\)/)
})

// Execute the real JSX with synthetic hooks only. No browser, account or DB.
import { mount, nodes, textOf, findButton, findPart, deferred, dailyView } from './helpers/course-ui-harness.mjs'
const fixture=()=>dailyView('course-a','cycle-a',{lesson:{id:'lesson-a',title:'Synthetic practice',sections:[{kind:'learn',text:'One idea at a time.'}],aphorism:'A small thought.'}})
const primary=h=>nodes(h.tree).find(node=>node.type==='button'&&node.props.className==='primary')
const playerFixture=(overrides={})=>{
 const calls={preferences:[],sessions:[],finish:0,close:0}
 const props={locale:'en',data:fixture(),onClose:()=>{calls.close++},onFinish:()=>{calls.finish++},
  onPreferences:async patch=>{calls.preferences.push(patch);return fixture()},onSession:async body=>{calls.sessions.push(body);return fixture()},onCheckin:async()=>fixture(),...overrides}
 const h=mount('course-slide-player',{props})
 return {h,calls,props}
}
async function toSave(h){
 for(let i=0;i<25&&!textOf(primary(h)).includes('Finish and save');i++){primary(h).props.onClick();await h.settle()}
 assert.ok(textOf(primary(h)).includes('Finish and save'))
}

test('V7 rhythm changes wait for server confirmation, serialize double-clicks and never complete a lesson',async()=>{
 const slow=deferred(),updates=[]
 const {h,calls}=playerFixture({onPreferences:patch=>{updates.push(patch);return slow.promise}})
 findButton(h.tree,'Short').props.onClick();await h.settle()
 const advance=primary(h).props.onClick;advance();advance();await h.settle()
 assert.equal(updates.length,1)
 assert.deepEqual(JSON.parse(JSON.stringify(updates[0])),{length:'quick',imagery:'optional'})
 assert.ok(textOf(h.tree).includes('Choose your rhythm'));assert.equal(primary(h).props.disabled,true)
 assert.equal(calls.sessions.length,0);assert.equal(calls.finish,0)
 slow.resolve(fixture());await h.settle()
 assert.ok(textOf(h.tree).includes('Notice your state before the practice'));assert.equal(calls.sessions.length,0)
 h.unmount()
})

test('false and rejected rhythm saves remain retryable on the same slide without XP or completion',async()=>{
 for(const fail of [()=>false,()=>{throw Error('synthetic failure')}]){
  let attempts=0
  const {h,calls}=playerFixture({onPreferences:async()=>{attempts++;return attempts===1?fail():fixture()}})
  findButton(h.tree,'No imagery').props.onClick();await h.settle()
  primary(h).props.onClick();await h.settle()
  assert.ok(textOf(h.tree).includes('Choose your rhythm'));assert.equal(primary(h).props.disabled,false)
  assert.ok(nodes(h.tree).some(node=>node.props.role==='alert'))
  assert.equal(calls.sessions.length,0);assert.equal(nodes(h.tree).some(node=>node.props.className==='xpReward'),false)
  primary(h).props.onClick();await h.settle()
  assert.equal(attempts,2);assert.ok(textOf(h.tree).includes('Notice your state before the practice'))
  assert.equal(calls.sessions.length,0);h.unmount()
 }
})

test('unchanged rhythm advances without a write and explanation remains separate from the thought',async()=>{
 const {h,calls}=playerFixture()
 primary(h).props.onClick();await h.settle();assert.equal(calls.preferences.length,0)
 for(let i=0;i<2;i++){primary(h).props.onClick();await h.settle()}
 assert.ok(textOf(h.tree).includes('A small thought.'));assert.ok(!textOf(h.tree).includes('One idea at a time.'))
 primary(h).props.onClick();await h.settle()
 assert.ok(textOf(h.tree).includes('One idea at a time.'));assert.ok(!textOf(h.tree).includes('A small thought.'))
 h.unmount()
})

test('V7 finish and promo skip call onFinish, while X calls onClose and neither creates another save',async()=>{
 for(const exit of ['finish','skip','close']){
  const {h,calls,props}=playerFixture({promotion:{show:true,checkoutReady:false}})
  await toSave(h);primary(h).props.onClick();await h.settle()
  assert.equal(calls.sessions.length,1)
  primary(h).props.onClick();await h.settle()
  assert.ok(nodes(h.tree).some(node=>node.props['data-course-reward-stage']==='xp'),'saved lesson first advances to the canonical XP/streak reward')
  primary(h).props.onClick();await h.settle()
  assert.ok(nodes(h.tree).some(node=>node.props['data-course-completion-progress']!==undefined))
  primary(h).props.onClick();await h.settle()
  assert.ok(nodes(h.tree).some(node=>node.props['data-course-post-lesson-promo']!==undefined))
  const promotionalLabel=h.tree.props['aria-label']
  if(exit==='finish')primary(h).props.onClick()
  else if(exit==='skip')findButton(h.tree,'No thanks').props.onClick()
  else nodes(h.tree).find(node=>node.type==='button'&&node.props['aria-label']==='Return to my course').props.onClick()
  assert.equal(calls.finish,exit==='close'?0:1);assert.equal(calls.close,exit==='close'?1:0)
  assert.equal(calls.sessions.length,1)
  h.render({...props,promotion:{show:false}});await h.settle()
  assert.notEqual(h.tree.props['aria-label'],promotionalLabel)
  assert.ok(h.tree.props['aria-label'].includes('A little step forward!'))
  h.unmount()
 }
})

test('failed lesson saves do not earn an offer or completion and retries reuse the operation id',async()=>{
 const writes=[];let succeed=false
 const {h,calls}=playerFixture({promotion:{show:true},onSession:async body=>{writes.push(body);return succeed?fixture():null}})
 await toSave(h);primary(h).props.onClick();await h.settle()
 assert.ok(textOf(primary(h)).includes('Finish and save'));assert.equal(calls.finish,0)
 assert.ok(!nodes(h.tree).some(node=>node.props.className==='xpReward'||node.props['data-course-post-lesson-promo']!==undefined))
 succeed=true;primary(h).props.onClick();await h.settle()
 assert.equal(writes.length,2);assert.equal(writes[0].operationId,writes[1].operationId)
 primary(h).props.onClick();await h.settle()
 assert.ok(nodes(h.tree).some(node=>node.props['data-course-reward-stage']==='xp'))
 primary(h).props.onClick();await h.settle()
 assert.ok(textOf(primary(h)).includes('See the Pro options'));h.unmount()
})

test('V7 completion returns to the path and releases the exact presenter token; X preserves the current screen',async()=>{
 for(const exit of ['finish','close']){
  const dismissals=[],notify=[]
  const dismiss=()=>dismissals.push('cycle-a:1:lesson-a')
  const h=mount('course-today',{props:{locale:'en',accountId:'owner-a',courseId:'course-a'},fetcher:()=>fixture(),extraModules:{
   './use-course-promotion':{useCoursePromotion:()=>({show:true,checkoutReady:false,dismiss})},
   './subscription-access':{useLessonCompletionOffer:()=>completion=>notify.push(completion)},
  }})
  await h.settle();findButton(h.tree,'Start today’s practice').props.onClick();await h.settle()
  const player=findPart(h.tree,'CourseSlidePlayer');assert.ok(player)
  if(exit==='finish')player.props.onFinish();else player.props.onClose()
  await h.settle()
  assert.equal(findPart(h.tree,'CourseSlidePlayer'),undefined)
  assert.equal(h.tree.props['data-course-view'],exit==='finish'?'path':'today')
  assert.deepEqual(dismissals,['cycle-a:1:lesson-a'])
  assert.equal(notify.length,0,'completion navigation alone does not earn an offer')
  h.unmount()
 }
})


test('Today story, illustration, CTA and progress have separate non-overlapping responsive rows',()=>{
  const heroStart=today.indexOf('<header className={styles.questHero}')
  const contentStart=today.indexOf('className={styles.todayCore}',heroStart)
  const storyStart=today.indexOf('className={styles.todayStory}',contentStart)
  const illustration=today.indexOf('className={styles.todayVisual}',storyStart)
  const primary=today.indexOf('className={styles.todayPrimary}',illustration)
  const progress=today.indexOf('className={styles.heroProgress}',primary)
  assert.ok(heroStart>=0 && contentStart>heroStart && storyStart>contentStart)
  assert.ok(illustration>storyStart && primary>illustration && progress>primary)
  assert.equal((today.match(/className=\{styles\.heroPerson\}/g)||[]).length,1)
  assert.match(todayCss,/\.shell\[data-course-view=today\] \.todayCore\{\s*display:grid;grid-template-columns:/)
  assert.match(todayCss,/\.todayVisual\{[^}]*position:relative/s)
  assert.match(todayCss,/\.todayVisual \.heroPerson\{[^}]*position:absolute!important/s)
  assert.match(todayCss,/\.shell\[data-course-view=today\] button\.todayPrimary\{[^}]*margin:0!important/s)
  assert.match(todayCss,/@media\(max-width:360px\)/)
})
