import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PORTRAIT_SECTORS, PORTRAIT_AXIS_ORDER } from '../lib/assessments/portrait-sectors.js'
import {
  DEVELOPMENT_GOALS_VERSION, DEFAULT_DEVELOPMENT_TARGETS,
  normalizeDevelopmentGoals, targetForDevelopmentAxis, rankDevelopmentGaps, buildDevelopmentPlan,
} from '../lib/profile/development-program.js'

const goals = () => ({ version: DEVELOPMENT_GOALS_VERSION, targets: { ...DEFAULT_DEVELOPMENT_TARGETS }, details: {} })
const score = (axis, priorityPercent, id=axis) => ({
  axis, eligible:true, priorityPercent, id, resultId:'result-' + id,
  score:5, min:0, max:10, label:axis, testTitle:'Verified test',
  testKey:'hh-weekly-pulse', measuredAt:'2026-10-15T12:00:00Z',
})
const file = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('all four sectors keep editable neutral placeholders, not an 80% psychological norm', () => {
  assert.equal(PORTRAIT_SECTORS.length, 4)
  assert.equal(PORTRAIT_AXIS_ORDER.length, 17)
  assert.deepEqual(Object.keys(DEFAULT_DEVELOPMENT_TARGETS), ['body','work','relationships','growth'])
  const actual = normalizeDevelopmentGoals(goals())
  assert.deepEqual(actual, goals())
  for (const axis of PORTRAIT_AXIS_ORDER) assert.equal(targetForDevelopmentAxis(actual, axis),50)
})

test('custom scale targets override only their parent area; input is tightly validated', () => {
  const changed = goals()
  changed.targets.body = 70
  changed.details.sleep = 95
  assert.equal(targetForDevelopmentAxis(changed,'sleep'),95)
  assert.equal(targetForDevelopmentAxis(changed,'stress'),70)
  assert.equal(targetForDevelopmentAxis(changed,'clarity'),50)
  assert.deepEqual(normalizeDevelopmentGoals(changed),changed)
  for (const extra of [
    { ...goals(), targets:{...goals().targets, unknown:50} },
    { ...goals(), details:{'symptoms.gad7.total':50} },
    { ...goals(), details:{sleep:-1} },
    { ...goals(), details:{sleep:72.3} },
    { ...goals(), targets:{...goals().targets, body:101} },
    { ...goals(), version:99 },
    { ...goals(), details:[] },
  ]) assert.equal(normalizeDevelopmentGoals(extra),null)
})

test('missing and unsafe scores do not become gaps or fabricated zeroes', () => {
  const result=rankDevelopmentGaps([],goals())
  assert.equal(result.rows.length,0)
  assert.equal(result.priorities.length,0)
  assert.equal(result.missingAxes.length,17)
  assert.equal(result.sectors.every(sector=>sector.current===null),true)
  assert.equal(buildDevelopmentPlan({results:[],goals:goals()}).rows.length,0)
  const filtered=rankDevelopmentGaps([
    {...score('sleep',60),eligible:false},
    {...score('stress',60),resultId:null},
    {...score('relationships',NaN)},
    {...score('personality',90)},
  ],goals())
  assert.equal(filtered.rows.length,0)
})

test('largest positive personal goal gaps rank first, not clinically or by questionnaire total', () => {
  const chosen=goals()
  chosen.targets.body=90
  chosen.targets.work=90 // Explicitly opted-in work target, not an assumed 80% clinical norm.
  chosen.details.energy=50
  const profile=rankDevelopmentGaps([
    score('sleep',35),
    score('stress',80),
    score('energy',65),
    score('focus',45),
  ],chosen)
  assert.deepEqual(profile.priorities.map(row=>row.axis),['stress','focus','sleep','energy'])
  assert.equal(profile.rows.find(row=>row.axis==='stress').current,20)
  assert.equal(profile.rows.find(row=>row.axis==='stress').gap,70)
  assert.equal(profile.rows.find(row=>row.axis==='energy').gap,15)
  assert.equal(profile.sectors.find(sector=>sector.key==='body').measuredAxes,3)
  assert.equal(profile.missingAxes.includes('relationships'),true)
  assert.equal(profile.courses.some(course=>course.id==='stress'&&course.available),true)
  assert.equal(profile.courses.some(course=>course.id==='focus'&&!course.available),true)
})

test('a low target does not convert a higher current position into an improvement deficit', () => {
  const chosen=goals()
  chosen.targets.body=20
  const profile=rankDevelopmentGaps([score('sleep',10)],chosen)
  assert.equal(profile.rows[0].current,90)
  assert.equal(profile.rows[0].gap,0)
  assert.equal(profile.priorities.length,0)
  assert.equal(profile.courses.length,0)
})

test('reports UI uses the authenticated account and an owner-checked encrypted API', () => {
  const view=file('components/app/profile-domains.jsx')
  const workspace=file('components/app/app-workspace.jsx')
  const api=file('app/api/app/[...path]/route.js')
  const server=file('lib/app/development-goals.js')
  const migration=file('supabase/migrations/20261017165000_hh_reports_development_goals.sql')
  assert.match(view,/!external && accountId && <DevelopmentProgram/)
  assert.match(view, /hideBottomNotes\s*\/>/, 'Profile hides duplicate methodology and privacy copy')
  const programmeView=file('components/app/development-program.jsx')
  assert.match(programmeView, /hideBottomNotes = false/, 'Reports retains the original full explanation')
  assert.match(programmeView, /\{!hideBottomNotes && <>/, 'only the profile surface suppresses trailing notes')
  assert.match(workspace,/accountId={data.account.id}/)
  assert.ok(workspace.includes('<DevelopmentProgram accountId={accountId} locale={locale} results={data.results || []} />'))
  assert.match(api,/joined === 'development-goals'/)
  assert.match(api,/x-hh-account-id/)
  assert.match(server,/openSealed/)
  assert.match(server,/seal\(/)
  assert.match(server,/revision=revision\+1/)
  assert.match(migration,/enable row level security/)
  assert.match(migration,/hh_app_backend/)
  assert.match(migration,/auth.uid\(\)/)
  assert.doesNotMatch(migration,/grant .+ to authenticated/i)
})

test('Development programme presents two independent, collapsed links for goals and recommendations', () => {
  const view = file('components/app/development-program.jsx')
  const css = file('components/app/development-program.module.css')
  assert.match(view, /goalLink: 'Установить ориентиры и цели'/)
  assert.match(view, /planLink: 'Просмотреть рекомендованную программу развития'/)
  assert.match(view, /goalLink: 'Set goals & targets'/)
  assert.match(view, /planLink: 'View recommended development programme'/)
  assert.match(view, /const \[activePanel, setActivePanel\] = useState\(null\)/)
  assert.match(view, /aria-expanded=\{activePanel === 'goals'\}/)
  assert.match(view, /aria-expanded=\{activePanel === 'plan'\}/)
  assert.match(view, /activePanel === 'goals' && <div/)
  assert.match(view, /activePanel === 'plan' && <div/)
  assert.match(view, /setActivePanel\('plan'\)/)
  assert.doesNotMatch(view, /showPlan/)
  assert.match(css, /\.sectionLinks\{/)
  assert.match(css, /\.panel\{/)
})

test('isolated App R1 initializes the encrypted goals schema needed by export', () => {
 const setup=file('tests/helpers/app-db-setup.mjs')
 assert.match(setup,/20261017165000_hh_reports_development_goals\.sql/)
 assert.match(setup,/Refusing to initialize nonempty test DB/)
 assert.match(setup,/Isolated loopback test database required/)
})
