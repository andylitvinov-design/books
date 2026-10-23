import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { ACTIVE_COURSE_PROGRAM_ID, isPublicCourseProgramAvailable, getCourseProgram } from '../lib/inner-growth/course-programs.js'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

test('public course enrollments focus on Anti-Stress without deleting old programme definitions', () => {
  assert.equal(ACTIVE_COURSE_PROGRAM_ID, 'stress')
  assert.equal(isPublicCourseProgramAvailable('stress'), true)
  assert.equal(isPublicCourseProgramAvailable('focus'), false)
  assert.equal(isPublicCourseProgramAvailable('confidence'), false)
  assert.ok(getCourseProgram('focus'))
  assert.ok(getCourseProgram('confidence'))
  const ui = read('components/app/my-course.jsx')
  assert.match(ui, /program.id !== ACTIVE_COURSE_PROGRAM_ID/)
  assert.match(ui, /data-coming-soon/)
  assert.match(ui, /programId !== null && programId !== ACTIVE_COURSE_PROGRAM_ID/)
  assert.match(ui, /const entryConcerns=courseConcernsFromIntent\(entry, locale\)/)
  assert.match(ui, /applyProgramIntake\(started,programme,epoch,entryConcerns\)/)
})

test('original navy and burgundy free-review banner stays distinct from contextual course offers', async () => {
  const bar = read('components/sitewide-antistress-banner.tsx')
  const style = read('components/sitewide-antistress-banner.module.css')
  const layout = read('app/layout.tsx')
  const home = read('components/holistic-house-home.tsx')
  const picker = read('app/[locale]/client/tests/page.tsx')
  const publicExplorer = read('components/app/public-test-explorer.jsx')
  const client = read('components/app/cabinet-landing.jsx')
  const course = bar.slice(bar.indexOf('export function TestSelectionCourseBanner'))
  assert.match(layout, /<SitewideAntistressBanner initialLocale=\{lang\} \/>/)
  assert.match(bar, /export function SitewideAntistressBanner/)
  assert.match(bar, /data-sitewide-personal-review-banner/)
  assert.ok(bar.includes('className={styles.cta} href={`/${locale}/services/free-situation-review`}'))
  assert.match(bar, /Get free review/)
  assert.match(style, /\.ribbon\{/)
  assert.ok(style.includes('background:#102849'), 'original navy background')
  assert.ok(style.includes('background:#922f51'), 'original burgundy CTA')
  assert.ok(course.includes('data-tests-course-banner'))
  assert.ok(course.includes('app/course?program=stress'))
  assert.ok(course.includes('locale === "es" ? "en" : locale'))
  // The owner moved the contextual banner into the demand-loaded catalog;
  // the sitewide navy/burgundy review ribbon remains a separate layout entry.
  assert.match(home, /<HomepageTopicJourneys locale=\{locale\} \/>/)
  assert.match(home, /<HomeMoreDisclosure locale=\{locale\}>/)
  for(const locale of ['en','ru']) await assertDeferredCourseBanner(locale)
  assert.ok(picker.includes('<PublicTestExplorer locale={locale} embedded'))
  assert.ok(!picker.includes('<TestSelectionCourseBanner'))
  assert.ok(publicExplorer.includes('<TestSelectionCourseBanner locale={locale} showReview />'))
  assert.ok(publicExplorer.indexOf('<TestExplorer') < publicExplorer.indexOf('<TestSelectionCourseBanner'))
  assert.match(client, /phase === 'catalog' && <div id="cabinet-tests"><PublicTestExplorer/)
  assert.ok(!client.includes('TestSelectionCourseBanner'))
  assert.match(course, /coursePrimary/)
  assert.match(course, /courseSecondary/)
  assert.ok(course.includes('course-focus-mountain-boy.webp'))
  assert.ok(course.includes('data-tests-review-banner'))
  assert.ok(course.includes('services/free-situation-review'))
  assert.ok(course.includes('andy-about.png'))
  assert.ok(course.includes('showReview &&'))
  assert.match(style,/\.courseCard,\s*\.reviewCard\s*\{/)
  assert.match(style,/@media \(max-width: 360px\)\s*\{[\s\S]*?grid-template-columns: 90px minmax\(0, 1fr\)/)
  for (const translation of ['Пройдите курс «Антистресс»', 'Take the free Anti-Stress course', 'Haz el curso gratuito «Antiestrés»']) {
    assert.ok(bar.includes(translation), translation)
  }
  assert.match(style,/\.courseCard,\s*\.reviewCard\s*\{/)
  assert.match(style,/\.courseActions\s*\{/)
  assert.ok(style.includes('max-width:680px'))
  for (const unwanted of ['localStorage', 'sessionStorage', 'fetch(']) {
    assert.ok(!bar.includes(unwanted))
  }
})

test('all public course banners and landing pages lead to the Anti-Stress option', () => {
  const academy = read('components/academy-free-course-banner.tsx')
  const report = read('components/app/free-course-banner.jsx')
  const landing = read('components/public-growth-courses.tsx')
  const cabinet = read('components/public-course-cabinet.tsx')
  assert.match(academy, /app\/course\?program=stress/)
  assert.match(report, /app\/course\?program=stress/)
  assert.match(landing, /\["stress"\] as const/)
  assert.match(landing, /app\/course\?program=stress/)
  assert.doesNotMatch(landing, /\?entry=personal/)
  assert.match(cabinet, /\?program=stress/)
})



async function assertDeferredCourseBanner(locale) {
  let expanded
  const jsx = (type, props) => ({ type, props })
  const dynamic = (load, options) => ({ load, options })
  const dependencies = {
    'next/dynamic': { __esModule:true, default:dynamic },
    react: { useState: initial => {
      if(expanded === undefined) expanded = initial
      return [expanded, value => { expanded = value }]
    } },
    'next/link': { __esModule:true, default:'Link' },
    'react/jsx-runtime': { jsx, jsxs:jsx, Fragment:'Fragment' },
    './services-solutions': { ServicesSolutions:'ServicesSolutions' },
    './sitewide-antistress-banner': { TestSelectionCourseBanner:'TestSelectionCourseBanner' },
    './home-explore-sections': { HomeExploreSections:'HomeExploreSections' },
  }
  const exports = {}
  const path = 'components/home-more-disclosure.tsx'
  const code = ts.transpileModule(read(path), { fileName:path, compilerOptions: {
    module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX,
  } }).outputText
  runInNewContext(code, { exports, require(name) {
    assert.ok(Object.hasOwn(dependencies,name),'Unexpected disclosure dependency: '+name)
    return dependencies[name]
  } }, { filename:path, timeout:1000 })
  const nodes = value => Array.isArray(value) ? value.flatMap(nodes)
    : value && typeof value === 'object' ? [value,...nodes(value.props?.children)] : []
  const render = () => exports.HomeMoreDisclosure({ locale, children:null })
  const lazyNodes = tree => nodes(tree).filter(node => typeof node.type?.load === 'function')
  let tree = render()
  assert.equal(tree.type,'details')
  assert.equal(lazyNodes(tree).length,0,'Closed catalog must not mount course or service modules')
  for(const open of [true,false,true]){
    tree.props.onToggle({ currentTarget:{ open } });tree=render()
    const loaded = await Promise.all(lazyNodes(tree).map(async node => ({ node, component:await node.type.load() })))
    const banners = loaded.filter(item => item.component==='TestSelectionCourseBanner')
    assert.equal(banners.length,open?1:0,'Exactly one course banner only while catalog is open')
    if(open){
      assert.equal(banners[0].node.props.locale,locale,'Deferred banner preserves the visitor locale')
      assert.equal(banners[0].node.type.options.ssr,false,'Closed catalog stays deferred from initial SSR')
    }
  }
}
