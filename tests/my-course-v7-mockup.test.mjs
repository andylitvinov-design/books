import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V6} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'

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
  assert.match(map,/visibleRoadmap\.map/)
  assert.match(map,/showAllDays \? roadmap : roadmap\.filter/)
  assert.match(map,/View all 14 lessons/)
  assert.match(map,/<ol className=\{styles\.path\}>/)
  assert.match(map,/<img className=\{styles\.journeyScene\}/)
  assert.match(mapCss,/\.mapShell \.pathRow\{[^}]*grid-template-columns:minmax\(0,1fr\) 88px minmax\(0,1fr\)/s)
  assert.match(mapCss,/\.mapShell \.pathLabel\{[^}]*position:static!important/s)
  assert.match(mapCss,/\.mapShell \.path::before\{/)
  assert.match(mapCss,/\.mapShell \.pathRow\[data-side=right\] \.pathLabel/)
  assert.match(mapCss,/@media\(max-width:355px\)/)
  assert.doesNotMatch(map,/correctAnswer|scorePenalty|leaderboard/)
})

test('first mission slide welcomes the learner, with thematic feeling choices and an uncropped background',()=>{
  assert.match(player,/welcome: 'How are you feeling today\?'/)
  assert.match(player,/welcome: 'Как вы себя чувствуете сегодня\?'/)
  assert.match(player,/key: 'welcome', kind: 'welcome'/)
  assert.match(player,/key: 'baseline', kind: 'baseline'/)
  assert.match(player,/key: 'checkin', kind: 'checkin'/)
  assert.match(player,/kind:'understand'/)
  assert.match(player,/guided\.map\(\(section, index\)/)
  assert.match(player,/slide\.kind === 'welcome'/)
  assert.match(player,/welcomeFeelingChoices/)
  assert.match(player,/welcomeFeelingSupport/)
  assert.match(player,/aria-pressed=\{welcomeFeeling === choice.id\}/)
  assert.match(player,/welcomeFeeling:welcomeFeeling\|\|'skip'/)
  assert.match(player,/data-course-welcome/)
  assert.match(player,/data-course-welcome/)
  assert.match(playerCss,/\.welcomeBackgroundImage\{/)
  assert.match(playerCss,/object-fit:contain/)
  assert.match(playerCss,/\.welcomeChoices button\[aria-pressed=true\]/)
  assert.doesNotMatch(player,/key: 'pace', kind: 'pace'/)
  // Genuine NAV-2.0 OPORA lessons are practice-led, not a second daily questionnaire.
  assert.match(player,/slide\.kind === 'checkin' \? \(lesson\.antiStress\|\|isOporaModule \? goNext : \(\) => void saveCheckin\(\)\)/)
  assert.match(player,/day:cycle\.day,lessonId:lesson\.id,operationId:sessionOp\.current/)
  assert.match(player,/if \(response\) \{ sessionOp\.current = null; setEarned\(true\); setIndex\(slides\.length\) \}/)
  assert.match(player,/compareLessonMoments/)
  assert.match(player,/onFinish\|\|onClose/)
  assert.equal((today.match(/onFinish=\{finishLessonPlayer\}/g)||[]).length,3)
  assert.match(today,/const finishLessonPlayer=returnToCourseMap/)
  assert.match(today,/const returnToCourseMap=\(\)=>\{closeLessonPlayer\(\);setView\('path'\)\}/)
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
import { mount, nodes, textOf, findButton, findPart, dailyView } from './helpers/course-ui-harness.mjs'
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

test('warm welcome changes only local supportive wording and saves its feeling with the final lesson',async()=>{
 const {h,calls}=playerFixture()
 findButton(h.tree,'I feel tense').props.onClick();await h.settle()
 assert.equal(findButton(h.tree,'I feel tense').props['aria-pressed'],true)
 assert.ok(textOf(h.tree).includes('Nothing needs to change right away'))
 assert.equal(calls.preferences.length,0);assert.equal(calls.sessions.length,0);assert.equal(calls.finish,0)
 primary(h).props.onClick();await h.settle()
 assert.ok(textOf(h.tree).includes('Notice your state at the start'))
 assert.equal(calls.preferences.length,0);assert.equal(calls.sessions.length,0)
 await toSave(h);primary(h).props.onClick();await h.settle()
 assert.equal(calls.sessions.length,1);assert.equal(calls.sessions[0].welcomeFeeling,'tense')
 assert.equal(calls.preferences.length,0);assert.equal(calls.finish,0)
 h.unmount()
})

test('welcome skip stays optional, performs no immediate writes and busy state disables every welcome control',async()=>{
 const {h,calls,props}=playerFixture()
 const welcomeButtons=()=>nodes(h.tree).filter(node=>node.type==='button'&&(node.props['aria-pressed']!==undefined||node.props.className==='welcomeSkip'))
 assert.equal(welcomeButtons().length,5)
 h.render({...props,busy:true});await h.settle()
 assert.ok(welcomeButtons().every(node=>node.props.disabled===true));assert.equal(primary(h).props.disabled,true)
 h.render(props);await h.settle()
 assert.ok(welcomeButtons().every(node=>node.props.disabled===false))
 nodes(h.tree).find(node=>node.props.className==='welcomeSkip').props.onClick();await h.settle()
 assert.ok(textOf(h.tree).includes('Notice your state at the start'))
 assert.equal(calls.preferences.length,0);assert.equal(calls.sessions.length,0);assert.equal(calls.finish,0)
 await toSave(h);primary(h).props.onClick();await h.settle()
 assert.equal(calls.sessions.length,1);assert.equal(calls.sessions[0].welcomeFeeling,'skip')
 assert.equal(calls.preferences.length,0);h.unmount()
})

test('optional welcome advances without a write and explanation remains separate from the thought',async()=>{
 const {h,calls}=playerFixture()
 primary(h).props.onClick();await h.settle();assert.equal(calls.preferences.length,0)
 for(let i=0;i<2;i++){primary(h).props.onClick();await h.settle()}
 assert.ok(textOf(h.tree).includes('A small thought.'));assert.ok(!textOf(h.tree).includes('One idea at a time.'))
 primary(h).props.onClick();await h.settle()
 assert.ok(textOf(h.tree).includes('One idea at a time.'));assert.ok(!textOf(h.tree).includes('A small thought.'))
 h.unmount()
})

test('saved ordinary lessons return to the course without a repeated offer; X closes without another save',async()=>{
 for(const exit of ['finish','close']){
  const {h,calls}=playerFixture({promotion:{show:true,checkoutReady:false}})
  await toSave(h);primary(h).props.onClick();await h.settle()
  assert.equal(calls.sessions.length,1)
  primary(h).props.onClick();await h.settle()
  assert.ok(nodes(h.tree).some(node=>node.props['data-course-reward-stage']==='xp'))
  primary(h).props.onClick();await h.settle()
  assert.ok(nodes(h.tree).some(node=>node.props['data-course-completion-progress']!==undefined))
  assert.equal(nodes(h.tree).some(node=>node.props['data-course-post-lesson-promo']!==undefined),false)
  if(exit==='finish')primary(h).props.onClick()
  else nodes(h.tree).find(node=>node.type==='button'&&node.props['aria-label']==='Return to my course').props.onClick()
  assert.equal(calls.finish,exit==='close'?0:1);assert.equal(calls.close,exit==='close'?1:0)
  assert.equal(calls.sessions.length,1);h.unmount()
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
 assert.equal(nodes(h.tree).some(node=>node.props['data-course-post-lesson-promo']!==undefined),false)
 assert.ok(textOf(primary(h)).includes('Back to my learning path'));h.unmount()
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

const presenterCases=[
 ['CourseSlidePlayer',null,'course-slide-player'],
 ['OporaV6SlidePlayer',COURSE_ANTISTRESS_SKILLS_V6,'opora-v6-slide-player'],
 ['OporaExperiencePlayer',COURSE_ANTISTRESS_SKILLS_V7,'opora-experience-player'],
]

test('each presenter separates X close, first-slide Back and Finish without writes or rewards',async()=>{
 for(const locale of ['en','ru'])for(const [name,version] of presenterCases)
  for(const view of ['today','path'])for(const reviewing of [false,true])for(const exit of ['onClose','onBackToMap','onFinish']){
   const dismissals=[],notify=[],day=reviewing?2:1
   const data=dailyView('course-a','cycle-a',{
    cycle:{...dailyView().cycle,day},
    lesson:version?lessonFor('calm_regulation',day,locale,'standard',version):fixture().lesson,
    ...(version?{programme:{id:'stress',title:'Synthetic course'}}:{}),
    currentSession:reviewing?{completedAt:'2026-10-20T12:00:00Z',signals:{}}:null,
    progress:{days:[],practiceCount:reviewing?1:0},
    roadmap:[{day,status:reviewing?'completed':'today'}],
   })
   const before=JSON.stringify(data),token='cycle-a:'+day+':'+data.lesson.id
   const dismiss=()=>dismissals.push(token)
   const h=mount('course-today',{props:{locale,accountId:'owner-a',courseId:'course-a'},fetcher:()=>data,extraModules:{
    './use-course-promotion':{useCoursePromotion:()=>({show:true,checkoutReady:false,dismiss})},
    './subscription-access':{useLessonCompletionOffer:()=>completion=>notify.push(completion)},
   }})
   try{
    await h.settle()
    if(h.tree.props['data-course-view']!==view){
     const labels=view==='today'?[locale==='ru'?'Сегодня':'Today']:
      [locale==='ru'?'Все 14 дней':'See all 14 days',locale==='ru'?'Путь · 14 дней':'14-day path']
     const control=labels.map(label=>findButton(h.tree,label)).find(Boolean)
     assert.ok(control,'real backing-view control exists');control.props.onClick();await h.settle()
    }
    assert.equal(h.tree.props['data-course-view'],view)
    if(view==='path')findPart(h.tree,'CourseQuestMap').props.onPlay(day)
    else nodes(h.tree).find(node=>node.type==='button'&&node.props['data-course-today-primary']!==undefined).props.onClick()
    await h.settle()
    const presenter=findPart(h.tree,name);assert.ok(presenter,name)
    assert.equal(presenter.props.reviewOnly,reviewing)
    if(reviewing)assert.equal(presenter.props.onSession({operationId:'synthetic-replay'}),null)
    assert.equal(typeof presenter.props[exit],'function',name+' '+exit)
    presenter.props[exit]();await h.settle()
    assert.equal(findPart(h.tree,name),undefined)
    assert.equal(h.tree.props['data-course-view'],exit==='onClose'?view:'path',name+' '+exit+' from '+view)
    assert.deepEqual(dismissals,[token],'release exactly the mounted presenter token')
    assert.equal(notify.length,0,'navigation cannot earn a saved-lesson offer')
    assert.equal(h.calls.filter(call=>call.body).length,0,'navigation and review cannot write')
    assert.equal(JSON.stringify(data),before,'saved lesson and progress remain unchanged')
   }finally{h.unmount()}
  }
})

test('actual presenter first-Back and X button expressions keep separate callbacks and compatible fallback',()=>{
 for(const [name,,path] of presenterCases){
  const source=read('components/app/'+path+'.jsx')
  const state=path==='course-slide-player'?'index':'step'
  const first=source.match(new RegExp('onClick=\\{('+(path==='opora-v6-slide-player'?'afterSave\\?[^}\\n]+':state+'===0\\?[^}\\n]+')+')\\}'))
  assert.ok(first,name+' first Back expression')
  const closeClass=path==='course-slide-player'?'close':path==='opora-v6-slide-player'?'controlIcon':'iconButton'
  const close=source.match(new RegExp('className=\\{styles\\.'+closeClass+'\\} onClick=\\{([^}]+)\\}[\\s\\S]*?<X'))
  assert.ok(close,name+' X button expression')
  const fallback=source.match(/onBackToMap\s*=\s*(onClose)(?:,|\s*,)/)
  assert.ok(fallback,name+' optional callback keeps legacy standalone callers usable')
  for(const position of [0,1]){
   const events=[],context={index:position,step:position,afterSave:false,
    onClose:()=>events.push('close'),onBackToMap:()=>events.push('map'),
    goBack:()=>events.push('previous'),back:()=>events.push('previous')}
   runInNewContext('('+first[1]+')',context)()
   assert.deepEqual(events,[position===0?'map':'previous'])
   events.length=0;runInNewContext('('+close[1]+')',context)();assert.deepEqual(events,['close'])
   events.length=0;runInNewContext(fallback[1],context)();assert.deepEqual(events,['close'])
  }
 }
})

test('ordinary player Escape still uses close, restores focus and refuses exit while busy',async()=>{
 for(const busy of [false,true]){
  let trap=null,closed=0,back=0,prevented=0,focused=0
  const document={activeElement:{isConnected:true,focus(){focused++}},body:{style:{overflow:'auto'}},
   addEventListener(type,listener){if(type==='keydown')trap=listener},
   removeEventListener(type){if(type==='keydown')trap=null}}
  const h=mount('course-slide-player',{props:{locale:'en',data:fixture(),busy,onClose(){closed++},onBackToMap(){back++}},globals:{document}})
  await h.settle();assert.equal(typeof trap,'function')
  trap({key:'Escape',preventDefault(){prevented++}})
  assert.equal(closed,busy?0:1);assert.equal(back,0);assert.equal(prevented,1)
  h.unmount();assert.equal(trap,null);assert.equal(document.body.style.overflow,'auto');assert.equal(focused,1)
 }
})

test('closing clears the selected replay without switching views; the separate map action closes before navigation',()=>{
 const close=today.match(/const closeLessonPlayer=(\(\)=>\{[^\n]+\})/)
 const map=today.match(/const returnToCourseMap=(\(\)=>\{[^\n]+\})/)
 assert.ok(close&&map)
 const events=[]
 const closeLessonPlayer=runInNewContext('('+close[1]+')',{
  setQuestOpen:value=>events.push(['open',value]),setReviewLesson:value=>events.push(['review',value]),
  setView:value=>events.push(['view',value]),
 })
 closeLessonPlayer();assert.deepEqual(events,[['open',false],['review',null]])
 events.length=0
 runInNewContext('('+map[1]+')',{closeLessonPlayer,setView:value=>events.push(['view',value])})()
 assert.deepEqual(events,[['open',false],['review',null],['view','path']])
})
