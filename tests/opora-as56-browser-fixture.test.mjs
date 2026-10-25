import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildOporaBrowserFixture, oporaFixturePath, oporaFixtureDocument,
  oporaFixtureBundlePath, requireHostedOporaBrowser, assertFixtureCompilation } from '../scripts/opora-as56-browser-fixture.mjs'
import { OPORA_BROWSER_FRESH_EDITION, OPORA_BROWSER_DAY5_COPY } from '../scripts/fixtures/opora-as60-day5-copy.mjs'
import { OPORA_BROWSER_FRESH_EDITION as HISTORICAL_EDITION, OPORA_BROWSER_DAY5_COPY as HISTORICAL_DAY5_COPY } from '../scripts/fixtures/opora-as59-day5-copy.mjs'
import { oporaAs60Day, OPORA_EXPERIENTIAL_EDITION } from '../lib/inner-growth/opora-as60-experiential-practices.js'
import { oporaAs59Day, OPORA_SEVEN_SKILLS_EDITION } from '../lib/inner-growth/opora-as59-seven-skills.js'
import { oporaAs58Day } from '../lib/inner-growth/opora-as58-one-action.js'
import { oporaExperienceGuide, oporaExperienceSupport } from '../lib/inner-growth/opora-as56-experience-guides.js'
import { lessonFor } from '../lib/inner-growth/lesson-library.js'
import { COURSE_ANTISTRESS_SKILLS_V7 } from '../lib/inner-growth/anti-stress-skills-v7.js'
import { mount, findButton, nodes, textOf } from './helpers/route-pipeline-harness.mjs'
import { advanceOporaTo } from './helpers/opora-gentle-navigation.mjs'
import { verifyOporaTakeaway } from '../scripts/helpers/opora-takeaway-acceptance.mjs'

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8')
test('OPORA browser fixture accepts only supported synthetic locales and no saved data', () => {
  for (const locale of ['ru', 'en', 'es']) assert.equal(oporaFixturePath(locale), '/__hh-test__/opora-as56/' + locale)
  for (const locale of ['fr', '', '../en', '<script>']) assert.throws(() => oporaFixturePath(locale))
  assert.throws(() => oporaFixtureDocument('en', { cycle: { day: 1 }, currentSession: null }, ''))
  assert.throws(() => oporaFixtureDocument('en', { cycle: { day: 5 }, currentSession: {} }, ''))
  const html = oporaFixtureDocument('ru', { cycle: { day: 5 }, currentSession: null, marker: '</script><script>bad' }, 'a{color:red}')
  assert.ok(html.includes(oporaFixtureBundlePath))
  assert.ok(html.includes('\\u003c/script>'))
  assert.ok(!html.includes('</script><script>bad'))
})
test('OPORA browser runner refuses local/deployed environments instead of changing auth or sandbox', () => {
  const env = { CI: 'true', GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', HH_APP_TEST_RUNTIME: 'isolated' }
  requireHostedOporaBrowser(env)
  for (const key of Object.keys(env)) assert.throws(() => requireHostedOporaBrowser({ ...env, [key]: '' }))
  assert.throws(() => requireHostedOporaBrowser({ ...env, VERCEL: '1' }))
})
test('OPORA fixture fails closed without the existing repository build toolchain', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'opora-toolchain-'))
  try {
    await writeFile(join(dir, 'package.json'), '{"private":true}')
    await assert.rejects(buildOporaBrowserFixture({ projectRoot: dir }), /refusing a fallback or package installation/)
  } finally { await rm(dir, { recursive: true, force: true }) }
})
test('hosted verification has exact mobile coverage, fully intercepted requests and no save transport', async () => {
  const browser = await read('scripts/verify-opora-as56-browser.mjs')
  const entry = await read('scripts/fixtures/opora-as56-browser.jsx')
  const workflow = await read('.github/workflows/opora-module-ci.yml')
  assert.match(entry, /import OporaExperiencePlayer from '@\/components\/app\/opora-experience-player'/)
  assert.match(entry, /createRoot\(/)
  assert.doesNotMatch(entry, /fetch\(|\/api\/|localStorage|sessionStorage|cookie/i)
  assert.match(entry, /Object\.freeze\(value\)/)
  for (const fragment of ["['ru', 'en', 'es']", '[320, 360, 390, 430]', '[false, true]', "serviceWorkers: 'block'",
    "route.abort('blockedbyclient')", 'assert.equal(state.saves, 0', 'assert.deepEqual(unexpectedRequests, []',
    'assert.equal(state.finalData, state.initialData', 'await click(t.previous)', 'await click(t.neutral)',
    "await page.keyboard.press('Escape')", 'assert.equal(evidence.cases.length, 24)']) assert.ok(browser.includes(fragment), fragment)
  assert.doesNotMatch(browser, /route\.continue|request\.post|\.request\.fetch|createServer|process\.env\.[A-Z_]*(?:TOKEN|SECRET|PASSWORD)/)
  assert.match(workflow, /browser: \[chromium, webkit\]/)
  assert.match(workflow, /node scripts\/verify-opora-as56-browser\.mjs/)
  assert.match(workflow, /path: artifacts\/opora-as56-mobile\//)
})
test('actual AS5.6 JSX, validators and CSS bundle unchanged with traceable source hashes', async () => {
  const fixture = await buildOporaBrowserFixture()
  assert.ok(fixture.bundle.length > 100000 && fixture.bundle.length <= 804 * 1024)
  assert.ok(fixture.css.includes('.hh-app'))
  for (const path of ['components/app/opora-experience-player.jsx', 'components/app/opora-experience-player.module.css',
    'lib/inner-growth/opora-as56-experience-guides.js', 'lib/inner-growth/anti-stress-skills-v6.js',
    'lib/inner-growth/course-slide-sequence.js', 'lib/inner-growth/opora-as59-seven-skills.js',
    'lib/inner-growth/opora-as60-experiential-practices.js', 'lib/inner-growth/opora-as60-integrated-journey.js', 'app/globals.css', 'app/[locale]/app/[[...path]]/workspace.css']) {
    const proof = fixture.sourceProof.find(item => item.path === path)
    assert.ok(proof, path)
    assert.equal(proof.sha256, createHash('sha256').update(await read(path)).digest('hex'))
  }
})

test('OPORA fixture compilation still fails on every build error or warning', () => {
  for (const [errors,warnings] of [[true,false],[false,true],[true,true]]) {
    assert.throws(() => assertFixtureCompilation({hasErrors:()=>errors,hasWarnings:()=>warnings,
      toString:()=>warnings?'Asset size warning':'Compilation error'}), /warning|error/)
  }
  assert.doesNotThrow(() => assertFixtureCompilation({hasErrors:()=>false,hasWarnings:()=>false}))
})

test('fresh AS6.0 browser copy pins exact Day5 fields, not the archived exercise', async () => {
  assert.equal(OPORA_BROWSER_FRESH_EDITION, 'as-6.0-experiments-v1')
  assert.equal(OPORA_BROWSER_FRESH_EDITION, OPORA_EXPERIENTIAL_EDITION)
  assert.deepEqual(Object.keys(OPORA_BROWSER_DAY5_COPY), ['ru', 'en', 'es'])
  for (const locale of ['ru', 'en', 'es']) {
    const copy = OPORA_BROWSER_DAY5_COPY[locale], day = oporaAs60Day(5, locale)
    assert.deepEqual(copy, { supportTitle: day.purposeTitle, purpose: day.purpose, practice: day.practice, experiment: day.experiment })
    assert.notEqual(copy.practice, oporaAs58Day(5, locale).practice)
    assert.notEqual(copy.practice, oporaAs59Day(5, locale).practice)
    assert.ok((copy.practice.replace(/…/gu, '').match(/[.!?]/gu) || []).length <= 1)
    assert.notEqual(copy.practice, oporaExperienceGuide(5, locale))
    assert.notEqual(copy.purpose, oporaExperienceSupport(5, locale).body)
    assert.ok(copy.practice.length <= 140 && copy.practice.split(/\s+/u).length <= 20)
  }
  const browser = await read('scripts/verify-opora-as56-browser.mjs')
  for (const binding of [
    "copy = OPORA_BROWSER_DAY5_COPY[locale], brief = copy.practice",
    "assert.equal(data.currentSession, null",
    "toHaveAttribute('data-opora-practical-skills-version', OPORA_BROWSER_FRESH_EDITION)",
    "[data-opora-daily-support=\"5\"]')).toHaveText(copy.purpose)",
    "name: copy.supportTitle, exact: true",
    "[data-opora-overview-purpose] p')).toHaveText(copy.purpose)",
    "[data-opora-one-daily-practice=\"5\"]')).toBeVisible()",
    "[data-opora-one-daily-practice=\"5\"]')).toHaveText(brief)",
    String.raw`assert.ok((brief.replace(/…/gu, '').match(/[.!?]/gu) || []).length <= 1)`,
    String.raw`assert.ok(brief.length <= 140 && brief.split(/\s+/u).length <= 20)`,
  ]) assert.ok(browser.includes(binding), binding)
})

test('fresh AS6.0 Day5 renders the pinned support, overview and practice without writes', async () => {
  for (const locale of ['ru', 'en', 'es']) {
    const copy = OPORA_BROWSER_DAY5_COPY[locale]
    const data = { cycle: { id: '00000000-0000-4000-8000-000000001056', day: 5, durationDays: 14 },
      programme: { id: 'stress' }, currentSession: null,
      lesson: lessonFor('calm_regulation', 5, locale, 'standard', COURSE_ANTISTRESS_SKILLS_V7) }
    const original = structuredClone(data)
    let saves = 0
    const h = mount('opora-experience-player', { locale, data, onClose() {}, onFinish() {},
      onSession: async () => { saves++; return false } })
    const next = { ru: 'Продолжить', en: 'Continue', es: 'Continuar' }[locale]
    try {
      assert.ok(nodes(h.tree).some(n => n.props?.['data-opora-practical-skills-version'] === OPORA_BROWSER_FRESH_EDITION))
      await advanceOporaTo(h, 'support', next)
      assert.equal(textOf(nodes(h.tree).find(n => n.props?.['data-opora-daily-support'] === 5)), copy.purpose)
      assert.ok(nodes(h.tree).some(n => /^h[1-6]$/.test(n.type) && textOf(n) === copy.supportTitle))
      await advanceOporaTo(h, 'recapPractice', next)
      const purpose = nodes(h.tree).find(n => n.props?.['data-opora-overview-purpose'])
      assert.equal(textOf(nodes(purpose).find(n => n.type === 'p')), copy.purpose)
      await advanceOporaTo(h, 'practice', next)
      const practice = nodes(h.tree).find(n => n.props?.['data-opora-one-daily-practice'] === 5)
      assert.equal(textOf(practice.props.children[0]), copy.practice)
      assert.ok(!textOf(h.tree).includes(oporaAs58Day(5, locale).practice))
      assert.equal(saves, 0)
      assert.deepEqual(data, original)
    } finally { h.unmount() }
  }
})

test('saved AS5.8 Day5 retains its original practice and never adopts fresh browser copy', async () => {
  for (const locale of ['ru', 'en', 'es']) {
    const data = { cycle: { id: '00000000-0000-4000-8000-000000001056', day: 5, durationDays: 14 },
      programme: { id: 'stress' },
      currentSession: { signals: { opora54: { answers: { experienceEdition: 'as-5.8-one-action-v1' } } } },
      lesson: lessonFor('calm_regulation', 5, locale, 'standard', COURSE_ANTISTRESS_SKILLS_V7) }
    const original = structuredClone(data)
    let saves = 0
    const h = mount('opora-experience-player', { locale, data, reviewOnly: true, onClose() {}, onFinish() {},
      onSession: async () => { saves++; return false } })
    try {
      await advanceOporaTo(h, 'practice', { ru: 'Продолжить', en: 'Continue', es: 'Continuar' }[locale])
      const practice = nodes(h.tree).find(n => n.props?.['data-opora-one-daily-practice'] === 5)
      assert.equal(textOf(practice.props.children[0]), oporaAs58Day(5, locale).practice)
      assert.ok(!nodes(h.tree).some(n => n.props?.['data-opora-practical-skills-version']))
      assert.ok(!textOf(h.tree).includes(OPORA_BROWSER_DAY5_COPY[locale].practice))
      assert.equal(saves, 0)
      assert.deepEqual(data, original)
    } finally { h.unmount() }
  }
})

// Keep the exact old predicate and negative proof. AS6.0 does not rewrite a
// saved AS5.9 lesson or retroactively approve its two-action Day5 wording.
function assertOriginalBriefGate(brief) {
  assert.ok((brief.replace(/…/gu, '').match(/[.!?]/gu) || []).length <= 1)
  assert.ok(brief.length <= 140 && brief.split(/\s+/u).length <= 20)
}
test('historical AS5.9 exact copy remains unchanged and still fails the original single-action gate', () => {
  assert.equal(HISTORICAL_EDITION, OPORA_SEVEN_SKILLS_EDITION)
  for (const locale of ['ru', 'en', 'es']) {
    const copy = HISTORICAL_DAY5_COPY[locale], day = oporaAs59Day(5, locale)
    assert.deepEqual(copy, { supportTitle: day.purposeTitle, purpose: day.purpose, practice: day.practice })
    assert.throws(() => assertOriginalBriefGate(copy.practice), { code: 'ERR_ASSERTION' })
    assertOriginalBriefGate(OPORA_BROWSER_DAY5_COPY[locale].practice)
  }
})

test('saved AS5.9 Day5 keeps its exact archived practice without AS6 micro-steps or writes', async () => {
  for (const locale of ['ru', 'en', 'es']) {
    const data = { cycle: { id: '00000000-0000-4000-8000-000000001056', day: 5, durationDays: 14 },
      programme: { id: 'stress' },
      currentSession: { signals: { opora54: { answers: { experienceEdition: HISTORICAL_EDITION } } } },
      lesson: lessonFor('calm_regulation', 5, locale, 'standard', COURSE_ANTISTRESS_SKILLS_V7) }
    const original = structuredClone(data)
    let saves = 0
    const h = mount('opora-experience-player', { locale, data, reviewOnly: true, onClose() {}, onFinish() {},
      onSession: async () => { saves++; return false } })
    try {
      await advanceOporaTo(h, 'practice', { ru: 'Продолжить', en: 'Continue', es: 'Continuar' }[locale])
      const practice = nodes(h.tree).find(n => n.props?.['data-opora-one-daily-practice'] === 5)
      assert.equal(textOf(practice.props.children[0]), HISTORICAL_DAY5_COPY[locale].practice)
      assert.equal(nodes(h.tree).filter(n => n.props?.['data-opora-practical-skills-version'] === HISTORICAL_EDITION).length, 1)
      assert.equal(nodes(h.tree).filter(n => n.props?.['data-opora-micro-step']).length, 0)
      assert.equal(saves, 0); assert.deepEqual(data, original)
    } finally { h.unmount() }
  }
})

test('fresh AS6.0 Day5 shows one exact experiment step at a time, with optional unsaved choices', async () => {
  for (const locale of ['ru', 'en', 'es']) {
    const copy = OPORA_BROWSER_DAY5_COPY[locale]
    const data = { cycle: { id: '00000000-0000-4000-8000-000000001056', day: 5, durationDays: 14 },
      programme: { id: 'stress' }, currentSession: null,
      lesson: lessonFor('calm_regulation', 5, locale, 'standard', COURSE_ANTISTRESS_SKILLS_V7) }
    const original = structuredClone(data)
    let saves = 0
    const h = mount('opora-experience-player', { locale, data, onClose() {}, onFinish() {},
      onSession: async () => { saves++; return false } })
    const next = { ru: 'Продолжить', en: 'Continue', es: 'Continuar' }[locale]
    const microNext = { ru: 'Следующий шаг', en: 'Next step', es: 'Siguiente paso' }[locale]
    const press = async label => { const b=findButton(h.tree,label); assert.ok(b,label); assert.equal(b.props.disabled,false); await b.props.onClick(); await h.settle() }
    try {
      await advanceOporaTo(h, 'practice', next)
      for (let step = 0; step < 3; step++) {
        const visible = nodes(h.tree).filter(n => n.props?.['data-opora-micro-step'])
        assert.equal(visible.length, 1)
        assert.equal(visible[0].props['data-opora-micro-step'], step + 1)
        assert.equal(textOf(visible[0]), copy.experiment.steps[step])
        const choices = nodes(h.tree).find(n => n.props?.role === 'group' && n.props?.['aria-label'] === copy.experiment.prompt)
        if (step < 2) { assert.equal(choices, undefined); await press(microNext) }
        else {
          const buttons=nodes(choices).filter(n => n.type === 'button')
          assert.deepEqual(buttons.map(n => textOf(n)), copy.experiment.choices.map(c => c.label))
          assert.ok(buttons.every(n => n.props['aria-pressed'] === false))
          await press(copy.experiment.choices[0].label)
          assert.equal(findButton(h.tree,copy.experiment.choices[0].label).props['aria-pressed'],true)
        }
        assert.equal(saves, 0); assert.deepEqual(data, original)
      }
      await press(next)
      assert.ok(nodes(h.tree).some(n => n.props?.['data-opora-current-screen'] === 'ritualPractice'))
      assert.equal(nodes(h.tree).filter(n => n.props?.['data-opora-micro-step']).length, 0)
      assert.equal(saves, 0); assert.deepEqual(data, original)
    } finally { h.unmount() }
    // A separate fresh learner can skip without traversing steps or selecting a choice.
    const skip = mount('opora-experience-player', { locale, data, onClose() {}, onFinish() {},
      onSession: async () => { saves++; return false } })
    try {
      await advanceOporaTo(skip, 'practice', next)
      assert.equal(nodes(skip.tree).find(n => n.props?.['data-opora-micro-step'])?.props['data-opora-micro-step'], 1)
      await findButton(skip.tree,next).props.onClick(); await skip.settle()
      assert.ok(nodes(skip.tree).some(n => n.props?.['data-opora-current-screen'] === 'ritualPractice'))
      assert.equal(saves, 0); assert.deepEqual(data, original)
    } finally { skip.unmount() }
  }
})

function takeawayFixture(moment='recap',mutate=()=>{}) {
  const element=(tag,attrs={},children=[],text='')=>({tag,attrs,children,text,visible:true})
  const heading=element('strong',{},[],'A synthetic idea'),detail=element('small',{},[],'One synthetic detail')
  const copy=element('div',{},[heading,detail]),idea=element('div',{class:'opora_summaryItem_hash123'},[element('span',{'aria-hidden':'true'},[],'*'),copy])
  const summary=element('div',moment==='recap'?{'data-opora-lesson-recap':'true'}:{'data-opora-daily-homework':'5'},[idea])
  const panel=element('section',{'data-opora-current-screen':moment},[summary])
  const root=element('main',{},[panel])
  mutate({root,panel,summary,idea,copy,heading,detail,element})
  const all=node=>[node,...node.children.flatMap(all)]
  const match=(node,selector)=>{
    const attribute=selector.match(/^\[([^=]+)="([^"]+)"\]$/)
    return attribute?node.attrs[attribute[1]]===attribute[2]:selector==='*'||node.tag===selector
  }
  const locator=values=>({values,count:async()=>values.length,
    locator:selector=>locator(values.flatMap(node=>selector.startsWith(':scope > ')
      ?node.children.filter(child=>match(child,selector.slice(9)))
      :node.children.flatMap(all).filter(child=>match(child,selector)))),
    innerText:async()=>{assert.equal(values.length,1);return all(values[0]).map(node=>node.text).join('')},
  })
  const page={locator:selector=>locator(all(root).filter(node=>match(node,selector)))}
  const visible=node=>node.visible&&(!node.parent||visible(node.parent))
  const bind=node=>{for(const child of node.children){child.parent=node;bind(child)}};bind(root)
  const expect=target=>({toBeVisible:async()=>{assert.equal(target.values.length,1);assert.ok(visible(target.values[0]),'visible idea field')}})
  return {page,expect}
}
for(const moment of ['recap','recapNext'])test('hashed CSS takeaway uses exact semantic '+moment+' scope',async()=>{
  const f=takeawayFixture(moment);await verifyOporaTakeaway(f.page,f.expect,moment)
})
for(const [name,mutate] of [
  ['missing panel',f=>{f.root.children=[]}],
  ['duplicate panel',f=>{f.root.children.push(f.panel)}],
  ['missing semantic container',f=>{f.panel.children=[]}],
  ['wrong semantic marker',f=>{f.summary.attrs={'data-opora-daily-homework':'4'}}],
  ['duplicate semantic container',f=>{f.panel.children.push(f.summary)}],
  ['missing idea',f=>{f.summary.children=[]}],
  ['duplicate idea',f=>{f.summary.children.push(f.idea)}],
  ['hidden idea',f=>{f.idea.visible=false}],
  ['hidden parent',f=>{f.summary.visible=false}],
  ['missing copy group',f=>{f.idea.children=[]}],
  ['duplicate copy group',f=>{f.idea.children.push(f.copy)}],
  ['extra copy child',f=>{f.copy.children.push(f.element('p',{},[],'Unexpected'))}],
  ['missing heading',f=>{f.copy.children=[f.detail]}],
  ['missing detail',f=>{f.copy.children=[f.heading]}],
  ['duplicate heading',f=>{f.copy.children=[f.heading,f.heading]}],
  ['duplicate detail',f=>{f.copy.children=[f.detail,f.detail]}],
  ['nested duplicate heading',f=>{f.detail.children.push(f.element('strong',{},[],'Duplicate'))}],
  ['nested duplicate detail',f=>{f.heading.children.push(f.element('small',{},[],'Duplicate'))}],
  ['hidden heading',f=>{f.heading.visible=false}],
  ['hidden detail',f=>{f.detail.visible=false}],
  ['empty heading',f=>{f.heading.text='  '}],
  ['empty detail',f=>{f.detail.text='  '}],
])for(const moment of ['recap','recapNext'])test('semantic '+moment+' takeaway rejects '+name,async()=>{
  const f=takeawayFixture(moment,mutate);await assert.rejects(verifyOporaTakeaway(f.page,f.expect,moment))
})
test('takeaway verifier rejects an unrelated screen without querying the page',async()=>{
  await assert.rejects(verifyOporaTakeaway({locator:()=>assert.fail('unexpected query')},()=>{},'practice'))
})
test('browser takeaway repair retains original geometry, no-save and exact current markers',async()=>{
  const browser=await read('scripts/verify-opora-as56-browser.mjs')
  const component=await read('components/app/opora-experience-player.jsx')
  assert.match(browser,/await verifyOporaTakeaway\(recapPage, expect, moment\)/)
  assert.doesNotMatch(browser,/\.summaryItem/)
  for(const fragment of ['size.panelScroll <= size.panelClient + 2','size.mainScroll <= size.mainClient + 2',
    'size.screenWidth <= width + 1',"assert.equal(recapSaves,0,'Viewing recap cannot write a private practice')",
    'assert.equal(state.saves, 0','assert.deepEqual(unexpectedRequests, []','assert.deepEqual(errors, []'])assert.ok(browser.includes(fragment),fragment)
  assert.match(component,/moment==='recap'&&<div className=\{styles\.recapSummary\} data-opora-lesson-recap="true"/)
  assert.match(component,/moment==='recapNext'&&<div className=\{styles\.recapSummary\}\s+data-opora-daily-homework=\{cycle\.day\}/)
  assert.match(component,/<div className=\{styles\.summaryItem\}><span aria-hidden="true">/)
})
for(const locale of ['ru','en','es'])for(const moment of ['recap','recapNext'])test('actual fresh Day5 '+locale+' '+moment+' retains one nonempty heading/detail without save',async()=>{
  let saves=0
  const data={cycle:{id:'00000000-0000-4000-8000-000000001056',day:5,durationDays:14},programme:{id:'stress'},currentSession:null,
    lesson:lessonFor('calm_regulation',5,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)}
  const original=structuredClone(data),h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},onSession:async()=>{saves++;return false}})
  try {
    await advanceOporaTo(h,moment,{ru:'Продолжить',en:'Continue',es:'Continuar'}[locale])
    const panel=nodes(h.tree).find(node=>node.props?.['data-opora-current-screen']===moment)
    assert.ok(panel)
    const summaries=nodes(panel).filter(node=>moment==='recap'?node.props?.['data-opora-lesson-recap']==='true':node.props?.['data-opora-daily-homework']===5)
    assert.equal(summaries.length,1)
    for(const tag of ['strong','small']){const fields=nodes(summaries[0]).filter(node=>node.type===tag);assert.equal(fields.length,1);assert.ok(textOf(fields[0]).trim().length>0)}
    assert.equal(saves,0);assert.deepEqual(data,original)
  }finally{h.unmount()}
})

