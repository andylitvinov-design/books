import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BUSINESS_COURSE_VERSION, BUSINESS_WEEKS, BUSINESS_QUESTIONS, BUSINESS_DOMAINS,
  BUSINESS_METRICS, BUSINESS_SNAPSHOT_VERSION, businessDay, businessProgress,
  businessSnapshotScores, businessSuggestions, businessSurveyChanges, businessMetricChanges,
} from '../lib/business-coaching/program.js'
import {
  BUSINESS_WEEKLY_CONTENT_VERSION, BUSINESS_WEEK_MODULES, businessWeekModule,
  businessDayResult, businessWeekProgress,
} from '../lib/business-coaching/week-modules.js'

test('90-day track is complete, bilingual, stable, nonduplicated and bounded',()=>{
  assert.equal(BUSINESS_COURSE_VERSION,1)
  assert.match(BUSINESS_SNAPSHOT_VERSION,/v1$/)
  assert.equal(BUSINESS_WEEKS.length,12)
  assert.equal(BUSINESS_WEEKS.reduce((n,w)=>n+w.tasks.length,0),84)
  const all=Array.from({length:90},(_,i)=>businessDay(i+1,'en'))
  assert.deepEqual(all.map(d=>d.day),Array.from({length:90},(_,i)=>i+1))
  assert.equal(new Set(all.map(d=>d.action)).size,90)
  for(const lang of ['ru','en']){
    for(let day=1;day<=90;day++){
      const entry=businessDay(day,lang)
      assert.ok(entry.title.length>=5)
      assert.ok(entry.intro.length>=12)
      assert.ok(entry.action.length>=18)
      assert.equal(entry.week,Math.min(13,Math.ceil(day/7)))
    }
  }
  assert.equal(businessDay(0),null)
  assert.equal(businessDay(91),null)
  assert.equal(businessDay(10.5),null)
})
test('source-identified reflection: 18 questions, six domains, 14-day window; missing never becomes zero',()=>{
  assert.equal(BUSINESS_QUESTIONS.length,18)
  assert.equal(BUSINESS_DOMAINS.length,6)
  assert.equal(new Set(BUSINESS_QUESTIONS.map(q=>q.id)).size,18)
  for(const d of BUSINESS_DOMAINS) assert.equal(BUSINESS_QUESTIONS.filter(q=>q.domain===d.id).length,3)
  for(const q of BUSINESS_QUESTIONS) {
    assert.ok(q.ru.length>12&&q.en.length>12)
  }
  const absent=businessSnapshotScores({})
  assert.ok(absent.every(x=>x.count===0&&x.mean===null))
  const first=BUSINESS_QUESTIONS.filter(q=>q.domain==='clarity')
  const one=businessSnapshotScores({[first[0].id]:0}).find(x=>x.id==='clarity')
  assert.equal(one.mean,null)
  assert.equal(one.count,1)
  const two=businessSnapshotScores({[first[0].id]:0,[first[1].id]:4}).find(x=>x.id==='clarity')
  assert.equal(two.mean,2)
  assert.equal(two.count,2)
  const full=Object.fromEntries(BUSINESS_QUESTIONS.map(q=>[q.id,4]))
  assert.ok(businessSnapshotScores(full).every(x=>x.mean===4))
})
test('priority suggestions are advisory and default to user-selected track when no usable survey exists',()=>{
  assert.deepEqual(businessSuggestions({},'idea'),['clarity','customers','planning'])
  assert.deepEqual(businessSuggestions({},'career'),['clarity','opportunities','execution'])
  assert.deepEqual(businessSuggestions({},'owner'),['clarity','execution','customers'])
  const answers={}
  for(const q of BUSINESS_QUESTIONS)answers[q.id]=q.domain==='execution'?0:3
  assert.equal(businessSuggestions(answers)[0],'execution')
  assert.equal(BUSINESS_METRICS.length,6)
})
test('practice completion is distinct from questionnaire position and actual business outcomes',()=>{
  assert.deepEqual(businessProgress(null),{completed:0,total:90,percent:0})
  assert.deepEqual(businessProgress({days:{'1':{done:true},'2':{done:false},'90':{done:true},'100':{done:true}}}),
    {completed:2,total:90,percent:2})
})
test('private API contract: account header, auth and revision, encrypted state, scoped RLS and export',()=>{
  const route=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
  const repo=readFileSync(new URL('../lib/app/business-coaching.js',import.meta.url),'utf8')
  const sql=readFileSync(new URL('../supabase/migrations/20261020153500_hh_business_coaching_90_private.sql',import.meta.url),'utf8')
  assert.match(route,/await auth\.verified\(\)/)
  assert.match(route,/joined === 'business-coaching'/)
  assert.match(route,/x-hh-account-id/)
  assert.match(route,/readBusinessCoaching\(config, actor\)/)
  assert.match(route,/saveBusinessCoaching\(config, actor/)
  assert.match(route,/exported\.businessCoaching/)
  assert.match(repo,/openSealed\(/)
  assert.match(repo,/seal\(/)
  assert.match(repo,/BUSINESS_REVISION_CONFLICT/)
  assert.match(repo,/assertActive\(db,actor\)/)
  assert.match(repo,/BUSINESS_SURVEY_NOT_DUE/)
  assert.match(sql,/enable row level security/)
  assert.match(sql,/revoke all.*anon, authenticated/)
  assert.match(sql,/using \(account_id=\(select auth\.uid\(\)\)/)
  assert.doesNotMatch(sql,/grant .* to anon/i)
})
test('integration: business journey appears in My Courses and Development programme without mislabeling OPORA',()=>{
  const workspace=readFileSync(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8')
  const panel=readFileSync(new URL('../components/app/development-program.jsx',import.meta.url),'utf8')
  const courses=readFileSync(new URL('../components/app/my-courses-dashboard.jsx',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  assert.match(workspace,/page === 'business'/)
  assert.match(panel,/data-development-business-course/)
  assert.match(courses,/data-business-coaching-course-link/)
  assert.match(ui,/data-business-coaching/)
  assert.match(ui,/\bconsent\b/)
  assert.match(ui,/\bwindow\.print\(\)/)
})

test('actual business KPIs only compare non-overlapping, same-period, same-unit and same-currency entries',()=>{
  const rows=[
    {metric:'revenue',unit:'money',currency:'CAD',value:100,from:'2026-09-01',to:'2026-09-07',recordedAt:'2026-09-08T00:00:00Z'},
    {metric:'revenue',unit:'money',currency:'CAD',value:150,from:'2026-09-08',to:'2026-09-14',recordedAt:'2026-09-15T00:00:00Z'},
    {metric:'revenue',unit:'money',currency:'EUR',value:200,from:'2026-09-15',to:'2026-09-21',recordedAt:'2026-09-22T00:00:00Z'},
    {metric:'revenue',unit:'money',currency:'CAD',value:999,from:'2026-09-15',to:'2026-09-30',recordedAt:'2026-10-01T00:00:00Z'},
    {metric:'enquiries',unit:'count',value:0,from:'2026-09-01',to:'2026-09-07'},
    {metric:'enquiries',unit:'count',value:7,from:'2026-09-08',to:'2026-09-14'},
  ]
  const changes=businessMetricChanges(rows)
  const revenue=changes.find(x=>x.metric==='revenue')
  assert.equal(revenue.previous.value,100)
  assert.equal(revenue.latest.value,150)
  assert.equal(revenue.delta,50)
  assert.equal(revenue.percentage,50)
  const enquiries=changes.find(x=>x.metric==='enquiries')
  assert.equal(enquiries.delta,7)
  assert.equal(enquiries.percentage,null)
  assert.deepEqual(businessMetricChanges([]),[])
  assert.deepEqual(businessMetricChanges([{metric:'sales',unit:'count',value:4,from:'2026-10-01',to:'2026-10-07'}]),[])
})
test('formative survey changes are raw same-version mean deltas, never fake normative percentiles',()=>{
  const first={version:BUSINESS_SNAPSHOT_VERSION,referenceDays:14,recordedAt:'2026-09-01T10:00:00Z',answers:{}}
  const last={version:BUSINESS_SNAPSHOT_VERSION,referenceDays:14,recordedAt:'2026-09-28T10:00:00Z',answers:{}}
  const firstDomain=BUSINESS_QUESTIONS.filter(q=>q.domain==='clarity')
  first.answers[firstDomain[0].id]=0
  first.answers[firstDomain[1].id]=2
  last.answers[firstDomain[0].id]=4
  last.answers[firstDomain[1].id]=2
  const change=businessSurveyChanges(first,last)
  assert.deepEqual(change,[{id:'clarity',previous:1,latest:3,delta:2}])
  assert.deepEqual(businessSurveyChanges(first,{...last,version:'wrong-version'}),[])
  assert.deepEqual(businessSurveyChanges(first,{...last,referenceDays:30}),[])
  assert.deepEqual(businessSurveyChanges(first,{...last,recordedAt:'2026-08-31T00:00:00Z'}),[])
})
test('approved public business page and auth page point to a real allowed and private account route',()=>{
  const page=readFileSync(new URL('../app/[locale]/explore/[theme]/page.tsx',import.meta.url),'utf8')
  const cabinet=readFileSync(new URL('../app/[locale]/app/[[...path]]/page.jsx',import.meta.url),'utf8')
  assert.match(cabinet,/['"]business['"].*\.includes\(path\[0\]\)/)
  assert.match(page,/app\/business/)
  assert.match(cabinet,/robots: \{ index: false, follow: false \}/)
})

test('report print styling respects Next CSS Modules purity and hides cabinet chrome only for report prints',()=>{
  const moduleCss=readFileSync(new URL('../components/app/business-coaching.module.css',import.meta.url),'utf8')
  const globalCss=readFileSync(new URL('../app/[locale]/app/[[...path]]/workspace.css',import.meta.url),'utf8')
  assert.doesNotMatch(moduleCss,/^\s*:global\(/m,'Unscoped :global is forbidden in CSS Modules and blocks production Next builds')
  assert.match(globalCss,/\.hh-app:has\(#hh-business-printable-report\) \.hh-header/)
  assert.match(moduleCss,/@media print/)
})

test('weekly plan has 12 independent seven-day modules and six integration days',()=>{
  assert.equal(BUSINESS_WEEK_MODULES.length,13)
  assert.equal(BUSINESS_WEEKLY_CONTENT_VERSION,'weekly-results-v2')
  const firstTwelve=BUSINESS_WEEK_MODULES.slice(0,12)
  assert.ok(firstTwelve.every(m=>m.days.length===7))
  assert.equal(BUSINESS_WEEK_MODULES[12].days.length,6)
  const all=BUSINESS_WEEK_MODULES.flatMap(m=>m.days)
  assert.equal(all.length,90)
  assert.deepEqual(all.map(d=>d.day),Array.from({length:90},(_,i)=>i+1))
  assert.equal(new Set(all.map(d=>d.id)).size,90)
  assert.equal(new Set(BUSINESS_WEEK_MODULES.map(m=>m.id)).size,13)
  assert.ok(BUSINESS_WEEK_MODULES.every(m=>m.outcome.ru && m.outcome.en && m.capstone.ru && m.capstone.en))
  assert.equal(businessWeekModule(0),null)
  assert.equal(businessWeekModule(14),null)
  assert.equal(businessDayResult(-1),null)
  assert.equal(businessDayResult(91),null)
})
test('every learning day requires a concrete distinct bilingual output and review criterion',()=>{
  const ru=new Set(),en=new Set()
  for(let day=1;day<=90;day++){
    const module=BUSINESS_WEEK_MODULES[Math.ceil(day/7)-1]
    const result=module.days.find(d=>d.day===day)
    assert.ok(result, 'missing day '+day)
    const ruLesson=businessDayResult(day,'ru'),enLesson=businessDayResult(day,'en')
    assert.equal(ruLesson.week,Math.ceil(day/7))
    assert.equal(ruLesson.action,businessDay(day,'ru').action)
    assert.equal(enLesson.action,businessDay(day,'en').action)
    assert.equal(ruLesson.moduleId,'business-week-'+Math.ceil(day/7))
    assert.equal(ruLesson.contentVersion,BUSINESS_WEEKLY_CONTENT_VERSION)
    assert.ok(ruLesson.weeklyCapstone.length>=12)
    for(const [locale,lesson,uniques] of [['ru',ruLesson,ru],['en',enLesson,en]]){
      assert.ok(lesson.resultLabel.length>=11, 'vague artifact '+day+' '+locale)
      assert.ok(lesson.doneWhen.length>=32, 'non-measurable criterion '+day+' '+locale)
      assert.ok(!uniques.has(lesson.resultLabel),'duplicate deliverable '+lesson.resultLabel)
      uniques.add(lesson.resultLabel)
      assert.ok(lesson.weeklyOutcome.length>=50)
      assert.ok(lesson.moduleTitle.length>=5)
    }
  }
  assert.equal(ru.size,90)
  assert.equal(en.size,90)
})
test('weekly module progress preserves earlier checked-only days without miscounting documented deliverables',()=>{
  const course={days:{
    1:{done:true,note:'Earlier note, no separate result'},
    2:{done:true,result:'Two activities with evidence'},
    3:{done:false,result:'I mapped my work blocks'},
    4:{done:false},
    8:{done:true,result:'Concrete goal'},
    85:{done:true,result:'Two sustainable habits'},
  }}
  assert.deepEqual(businessWeekProgress(course,1),{week:1,complete:2,documented:1,drafts:1,total:7})
  assert.deepEqual(businessWeekProgress(course,2),{week:2,complete:1,documented:1,drafts:0,total:7})
  assert.deepEqual(businessWeekProgress(course,13),{week:13,complete:1,documented:1,drafts:0,total:6})
  assert.deepEqual(businessWeekProgress(null,12),{week:12,complete:0,documented:0,drafts:0,total:7})
  assert.equal(businessWeekProgress(null,14),null)
  // Existing overall progress remains unchanged, including historical notes.
  assert.equal(businessProgress(course).completed,4)
})
test('server pins result labels and rejects blank new-version completions while retaining old API compatibility',()=>{
  const source=readFileSync(new URL('../lib/app/business-coaching.js',import.meta.url),'utf8')
  assert.match(source,/onlyKeys\(input,\['action','revision','day','done','note','result','contentVersion'\]\)/)
  assert.match(source,/BUSINESS_WEEKLY_CONTENT_VERSION/)
  assert.match(source,/BUSINESS_DAILY_RESULT_REQUIRED/)
  assert.match(source,/input\.done===true && input\.contentVersion===BUSINESS_WEEKLY_CONTENT_VERSION && result\.length<6/)
  assert.match(source,/resultLabelSnapshot:names\|\|prior\.resultLabelSnapshot\|\|null/)
  assert.match(source,/const result=input\.result===undefined\?\(prior\.result\|\|''\)/)
  assert.match(source,/result,contentVersion:version/)
  assert.match(source,/transaction\(config,actor,async db=>/)
  assert.match(source,/select payload_ciphertext,revision,updated_at from app_private\.business_coaching_programs/)
})
test('mobile learning UX renders only the chosen module days, an authored daily result and grouped private report',()=>{
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/app/business-coaching.module.css',import.meta.url),'utf8')
  assert.match(ui,/data-business-weekly-lesson/)
  assert.match(ui,/data-business-weekly-modules/)
  assert.match(ui,/data-selected-business-week/)
  assert.match(ui,/openedModule\.days\.map/)
  assert.match(ui,/currentModule\.days\.map/)
  assert.match(ui,/businessWeekProgress\(course,week\)/)
  assert.match(ui,/businessWeekProgress\(course,moduleWeek\)/)
  assert.match(ui,/businessDayResult\(day,lang\)/)
  assert.match(ui,/dayResult\.trim\(\)\.length<6/)
  assert.match(ui,/contentVersion:BUSINESS_WEEKLY_CONTENT_VERSION/)
  assert.match(ui,/record\.resultLabelSnapshot\?\.\[lang\]/)
  assert.match(ui,/data-business-weekly-report/)
  assert.match(css,/\.moduleBrowser\{display:grid/)
  assert.match(css,/@media\(max-width:460px\)/)
  assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/)
  assert.doesNotMatch(css,/^\s*:global\(/m)
})

test('90-day journal capacity extension keeps original RLS/grants unchanged',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261020184500_hh_business_weekly_module_journal_capacity.sql',import.meta.url),'utf8')
  assert.match(sql,/app_private\.business_coaching_programs/)
  assert.match(sql,/750000/)
  assert.match(sql,/drop constraint business_coaching_programs_payload_ciphertext_check/)
  assert.match(sql,/add constraint business_coaching_programs_payload_ciphertext_check/)
  const executable=sql.split('\n').filter(line=>!line.trim().startsWith('--')).join('\n')
  assert.doesNotMatch(executable,/(?:grant|revoke|create policy|drop policy|disable row level security|drop table)/i)
})
test('unsaved daily results get explicit EN/RU confirmation before day navigation',()=>{
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  assert.match(ui,/unsavedResult:'Your current day has unsaved changes/)
  assert.match(ui,/unsavedResult:'В текущем дне остались несохранённые изменения/)
  assert.ok(ui.includes("dayResult!==(previous.result||'')"))
  assert.match(ui,/unsaved && !window\.confirm\(t\.unsavedResult\)/)
})

test('weekly business module helpers remain compatible with Next production lint and CSS imports',()=>{
  const helper=readFileSync(new URL('../lib/business-coaching/week-modules.js',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  for (const source of [helper,ui]) {
    assert.doesNotMatch(source,/\b(?:const|let|var)\s+module\b|\bmodule\s*=>/, 'Next disallows shadowing its special module variable')
  }
  assert.match(ui,/import styles from '\.\/business-coaching\.module\.css'/)
  assert.doesNotMatch(ui,/weekModule\.css/)
})


test('Business course uses a scoped premium wooden executive language with both reading modes',()=>{
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/app/business-coaching.module.css',import.meta.url),'utf8')
  assert.ok(css.includes('HOLISTIC HOUSE PREMIUM WOOD EXECUTIVE V4'))
  assert.ok(!css.includes('HOLISTIC HOUSE COURSE DESIGN V3'))
  assert.ok(css.includes('--wood-walnut:#503424'))
  assert.ok(css.includes('--wood-brass:#d8ae74'))
  assert.ok(css.includes('--wood-paper:#fffaf2'))
  assert.ok(css.includes('.root[data-wood-mode=dark]'))
  assert.ok(css.includes('repeating-linear-gradient'))
  assert.ok(css.includes('.deskScene'))
  assert.ok(css.includes('.deskCoffee'))
  assert.ok(css.includes('.deskNotebook'))
  assert.ok(css.includes('.deskPen'))
  assert.ok(css.includes('.deskBookmark'))
  assert.ok(css.includes('.lessonCards'))
  assert.ok(css.includes('@media(max-width:350px)'))
  assert.ok(css.includes('@media(max-width:620px)'))
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'))
  assert.ok(css.includes('@media print'))
  assert.doesNotMatch(css,/^\s*:global\(/m)
  assert.ok(ui.includes('data-course-visual="executive-wood-v2"'))
  assert.ok(ui.includes('data-wood-mode={woodMode}'))
  assert.ok(ui.includes('function ExecutiveDeskScene(){'))
  assert.ok(ui.includes('<ExecutiveDeskScene/>'))
  assert.ok(ui.includes('const [woodMode,setWoodMode]=useState(\'light\')'))
  assert.ok(ui.includes('hh-business-coaching-wood-mode'))
  assert.ok(ui.includes('aria-pressed={woodMode===\'light\'}'))
  assert.ok(ui.includes('aria-pressed={woodMode===\'dark\'}'))
  assert.ok(ui.includes("woodLight:'Светлое дерево'"))
  assert.ok(ui.includes("woodDark:'Тёмный кабинет'"))
  assert.ok(ui.includes('role="group" aria-label={t.woodTheme}'))
  assert.ok(!ui.includes('course-journey-landscape.svg'))
  assert.ok(!ui.includes("import Image from 'next/image'"))
})

function relativeLuminance(hex){
  const rgb=hex.replace('#','').match(/../g).map(s=>parseInt(s,16)/255)
    .map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4)
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
}
function wcagRatio(a,b){
  const l1=relativeLuminance(a),l2=relativeLuminance(b)
  return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)
}
test('Wood palette is legible for normal body copy and button text in both modes',()=>{
  assert.ok(wcagRatio('#35261d','#fffaf2')>=7)
  assert.ok(wcagRatio('#685140','#fffaf2')>=4.5)
  assert.ok(wcagRatio('#fff2df','#342821')>=7)
  assert.ok(wcagRatio('#e0c6a8','#342821')>=4.5)
  assert.ok(wcagRatio('#fff9ee','#654831')>=4.5)
  assert.ok(wcagRatio('#fff7e8','#5b3d29')>=4.5)
})
test('Wood redesign has complete CSS Module bindings without impacting other courses',()=>{
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/app/business-coaching.module.css',import.meta.url),'utf8')
  const used=[...new Set([...ui.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map(m=>m[1]))]
  const available=new Set([...css.matchAll(/(?<![\w-])\.([A-Za-z_][A-Za-z_0-9-]*)/g)].map(m=>m[1]))
  assert.deepEqual(used.filter(name=>!available.has(name)),[])
  const publicPage=readFileSync(new URL('../app/[locale]/explore/[theme]/page.tsx',import.meta.url),'utf8')
  const promoCss=readFileSync(new URL('../components/business-coaching-promo.module.css',import.meta.url),'utf8')
  const courseListCss=readFileSync(new URL('../components/app/my-courses-dashboard.module.css',import.meta.url),'utf8')
  assert.ok(publicPage.includes('data-business-free-90-day-plan'))
  assert.ok(publicPage.includes('business-coaching-promo.module.css'))
  assert.ok(publicPage.includes('12 недель, конкретный результат каждого дня'))
  assert.ok(publicPage.includes("locale==='ru'?'ru':'en'"))
  assert.ok(promoCss.includes('linear-gradient(105deg,#67462f,#483023)'))
  assert.ok(courseListCss.includes('.businessTrack'))
  assert.ok(courseListCss.includes('background:linear-gradient(118deg,#1c4e61,#1a314b')) // #1407 photo-left navy card.
  assert.ok(css.includes('data-wood-mode=dark'))
})

test('Business onboarding is one meaningful mobile screen at a time with explicit privacy consent',()=>{
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  assert.ok(ui.includes('data-business-one-screen-onboarding'))
  assert.ok(ui.includes('data-coaching-intake-step="goals"'))
  assert.ok(ui.includes('data-coaching-intake-step="reflection"'))
  assert.ok(ui.includes('data-coaching-intake-step="consent"'))
  assert.ok(ui.includes('const [startStep,setStartStep]=useState(1)'))
  assert.ok(ui.includes("startStep===1&&<section"))
  assert.ok(ui.includes("startStep===2&&<section"))
  assert.ok(ui.includes("startStep===3&&<section"))
  assert.ok(ui.includes('className={styles.trackChoices} role="group"'))
  assert.ok(ui.includes('BUSINESS_TRACKS.map(track=>'))
  assert.ok(ui.includes('disabled={goal.primaryGoal.trim().length<4}'))
  assert.ok(ui.includes('if(!consent||startStep!==3)return'))
  assert.ok(ui.includes('disabled={busy||!consent||goal.primaryGoal.trim().length<4}'))
  assert.ok(ui.includes('goalFields(true)')) // Full optional goal editor remains available after start.
  assert.ok(ui.includes('data-business-snapshot')) // Optional self-check remains in existing Survey.
  assert.ok(ui.includes("tab==='survey'"))
})

test('Optional Business Snapshot shows one actual question per screen without a new scoring instrument',()=>{
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  assert.ok(ui.includes('const [questionIndex,setQuestionIndex]=useState(0)'))
  assert.ok(ui.includes('data-business-question={question.id}'))
  assert.ok(ui.includes('data-business-domain={domain?.id}'))
  assert.ok(ui.includes('BUSINESS_QUESTIONS.filter(item=>Number.isInteger(answers[item.id]))'))
  assert.ok(ui.includes('BUSINESS_RESPONSE_LABELS[lang]'))
  assert.ok(ui.includes("if(e.target.value==='')delete next[question.id]"))
  assert.ok(ui.includes('setQuestionIndex(i=>Math.min(BUSINESS_QUESTIONS.length-1,i+1))'))
  assert.ok(ui.includes('setQuestionIndex(i=>Math.max(0,i-1))'))
  assert.ok(ui.includes('role="progressbar" aria-valuemin={0} aria-valuemax={BUSINESS_QUESTIONS.length}'))
})

test('One-idea lesson slides retain encrypted daily results, completion and prior-day guard',()=>{
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  const repo=readFileSync(new URL('../lib/app/business-coaching.js',import.meta.url),'utf8')
  assert.ok(ui.includes('data-business-one-screen-lesson'))
  assert.ok(ui.includes('data-business-lesson-slide data-lesson-stage={lessonStage}'))
  assert.ok(ui.includes('data-business-lesson-save'))
  assert.ok(ui.includes('const [lessonStage,setLessonStage]=useState(0)'))
  assert.ok(ui.includes('lessonStage===0&&'))
  assert.ok(ui.includes('lessonStage===1&&'))
  assert.ok(ui.includes('lessonStage===2&&'))
  assert.ok(ui.includes('lessonStage===3&&'))
  assert.ok(ui.includes('lessonStage===4&&savedDay.done&&!hasUnsavedDay&&'))
  assert.ok(ui.includes("async function saveDayAndContinue(complete=false)"))
  assert.ok(ui.includes("day,done:persistedDone,note:dayNote,result:dayResult,"))
  assert.ok(ui.includes('const persistedDone=complete || Boolean(savedDay.done)'))
  assert.ok(ui.includes("onClick={()=>void saveDayAndContinue(false)}"))
  assert.ok(ui.includes("else void saveDayAndContinue(true)"))
  assert.ok(ui.includes('if(complete)setLessonStage(4)'))
  assert.ok(!ui.includes('if(ok && advance)'))
  assert.ok(ui.includes("course?.days?.[next]?.result||''"))
  assert.ok(ui.includes("if(savedDay.done&&!hasUnsavedDay)setLessonStage(4)"))
  assert.ok(ui.includes("if(savedLessonCanContinue)chooseDay(day+1;")===false)
  assert.ok(ui.includes("else void saveDayAndContinue(true)"))
  assert.ok(ui.includes('dayResult.trim().length<6'))
  assert.ok(ui.includes('if(next!==day && course?.status'))
  assert.ok(ui.includes('window.confirm(t.unsavedResult)'))
  assert.ok(ui.includes('aria-valuemax={currentWeekProgress.total}'))
  assert.ok(ui.includes('aria-valuemax={90} aria-valuenow={progress.completed}'))
  assert.ok(ui.includes('aria-live="polite"'))
  assert.ok(ui.includes('data-day-status={dayStatus}'))
  assert.ok(ui.includes('aria-current={item.day===day'))
  assert.ok(ui.includes('window.print()'))
  assert.ok(repo.includes('BUSINESS_DAILY_RESULT_REQUIRED'))
  assert.ok(repo.includes('business_coaching_programs'))
  assert.ok(repo.includes('resultLabelSnapshot:names||prior.resultLabelSnapshot||null'))
})

test('Small-screen course keeps the actual Continue action visible and optional sections collapsed',()=>{
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/app/business-coaching.module.css',import.meta.url),'utf8')
  assert.ok(css.includes('HH BUSINESS ONE-SCREEN SLIDES V1'))
  assert.ok(css.includes('.heroArt{display:none!important}'))
  assert.ok(css.includes('.lessonSaveBar{position:static!important'))
  assert.ok(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'))
  assert.ok(css.includes('.lessonStageNav'))
  assert.ok(css.includes('.trackChoices'))
  assert.ok(css.includes('@media(max-width:350px)'))
  assert.ok(css.includes('@media(max-width:620px)'))
  assert.ok(ui.includes('<details className={styles.lessonBrowse}>'))
  assert.ok(ui.includes('<details className={styles.review} key={week}>'))
  assert.ok(ui.includes("nextLesson:'Next lesson'"))
  assert.ok(ui.includes("nextLesson:'Следующий урок'"))
})

test('Business mirrors Reiki / OPORA: skill recap, one thought per day, real action and post-save celebration',()=>{
  const ui=readFileSync(new URL('../components/app/business-coaching.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/app/business-coaching.module.css',import.meta.url),'utf8')
  const repo=readFileSync(new URL('../lib/app/business-coaching.js',import.meta.url),'utf8')
  for(const marker of [
    'data-business-skill-brief','data-business-real-practice',
    'data-business-one-reflection','data-business-private-result',
    'data-business-saved-celebration','data-business-focus-timer',
  ])assert.ok(ui.includes(marker),marker)
  assert.ok(ui.includes('const previousSkills=Array.from({length:day-1}'))
  assert.ok(ui.includes(".filter(previous=>course?.days?.[previous]?.done)"))
  assert.ok(ui.includes('selected.resultLabel'))
  assert.ok(ui.includes('selected.doneWhen'))
  assert.ok(ui.includes('day<90?chooseDay(day+1):setTab(\'report\')'))
  assert.ok(ui.includes('savedDay.done&&!hasUnsavedDay'))
  assert.ok(ui.includes('aria-pressed={reflectionChoice===value}'))
  assert.ok(ui.includes('reflectionChoice,contentVersion:BUSINESS_WEEKLY_CONTENT_VERSION'))
  assert.ok(ui.includes('reflectionChoice!==(savedDay.reflectionChoice||\'\')'))
  assert.ok(ui.includes('if(complete)setLessonStage(4)'))
  assert.ok(!ui.includes('if(ok && advance)'))
  assert.ok(!ui.includes('setDay(next)\n      setLessonStage(0)\n      setModuleWeek')) // no silent post-save advancement
  assert.ok(ui.includes('disabled={lessonStage===0&&day===1}'))
  assert.ok(css.includes('.lessonStageNav{grid-template-columns:repeat(5,minmax(0,1fr))}'))
  assert.ok(css.includes('.reflectionChoices button[aria-pressed=true]'))
  assert.ok(css.includes('.focusControls button'))
  assert.ok(css.includes('.savedCelebration'))
  assert.ok(css.includes('@media(max-width:350px)'))
  assert.ok(repo.includes("onlyKeys(input,['action','revision','day','done','note','result','contentVersion','reflectionChoice'])"))
  assert.ok(repo.includes("!['','agree','disagree','unsure'].includes(reflectionChoice)"))
  assert.ok(repo.includes("reflectionChoice=input.reflectionChoice===undefined?(prior.reflectionChoice||''):input.reflectionChoice"))
  assert.ok(repo.includes('result,reflectionChoice,contentVersion:version,'))
  assert.ok(repo.includes('payload_ciphertext'))
  assert.ok(ui.includes("saveContinue:'Save my lesson and continue'"))
  assert.ok(ui.includes("saveContinue:'Сохранить урок и продолжить'"))
  // No forged business video, messaging reminder, or externally transmitted quiz/health payload.
  assert.ok(ui.includes('no automatic reminder is sent'))
  assert.ok(!ui.includes('autoplay'))
})

test('business promotion matches the saved course photo-left design at phone widths',()=>{
  const component=readFileSync(new URL('../components/app/my-courses-dashboard.jsx',import.meta.url),'utf8')
  const css=readFileSync(new URL('../components/app/my-courses-dashboard.module.css',import.meta.url),'utf8')
  assert.match(component,/data-business-coaching-course-link/)
  assert.match(component,/className=\{styles\.businessTrackPhoto\}/)
  assert.match(component,/\/images\/holistic-house\/books-library\.webp/)
  assert.match(component,/className=\{styles\.businessTrackAction\}/)
  assert.match(component,/Start free plan/)
  assert.match(component,/Создать бесплатный план/)
  assert.match(css,/\.businessTrack\{[\s\S]*?grid-template-columns:clamp\(112px,19vw,162px\) minmax\(0,1fr\)/)
  assert.match(css,/\.businessTrack\{[\s\S]*?background:linear-gradient\(118deg,#1c4e61,#1a314b\)/)
  assert.match(css,/\.businessTrackAction\{[\s\S]*?background:#0b9fa8/)
  assert.match(css,/@media\(max-width:600px\)\{\s*\.businessTrack\{grid-template-columns:102px minmax\(0,1fr\)/)
  assert.match(css,/@media\(max-width:370px\)\{\s*\.businessTrack\{grid-template-columns:91px minmax\(0,1fr\)/)
})
