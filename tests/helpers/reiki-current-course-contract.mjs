// Synthetic, offline execution of current production declarations. Not browser/DB QA.
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { sourceFixture, element, nodes, textContent } from './current-navigation-fixture.mjs'
import { energyworkSequence, ENERGYWORK_VERSION, ENERGYWORK_REPORT_IDS, ENERGYWORK_LESSON_ANSWER_IDS } from '../../data/academy/energywork-ai-schema.js'

export { nodes, textContent }
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
export const parse = (source, name = 'production.tsx') => {
  const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(ast.parseDiagnostics.length, 0, name + ' parses')
  return ast
}
export function all(root, predicate) {
  const found = []
  const visit = node => { if (predicate(node)) found.push(node); ts.forEachChild(node, visit) }
  visit(root); return found
}
export function one(root, predicate) { const found = all(root, predicate); assert.equal(found.length, 1, 'One real production binding'); return found[0] }
export const attribute = (node, name) => node.attributes.properties.find(value => value.name?.getText() === name)?.initializer
export const attributeText = (node, name) => { const value = attribute(node, name); return value && (ts.isJsxExpression(value) ? value.expression?.getText() : value.text) }
export const ownerFunction = (ast, name) => one(ast, node => ts.isFunctionDeclaration(node) && node.name?.text === name)
// A declaration/string in dead JSX is not a production binding. Only the named,
// explicit conditional gates may occur between a node and the final return.
export function assertLive(node, owner, conditions = []) {
  let current = node
  while (current.parent !== owner.body) {
    const parent = current.parent
    assert.ok(parent, 'Binding belongs to its component')
    if (ts.isConditionalExpression(parent)) {
      const condition = conditions.find(value => (typeof value === 'string' ? value : value.test) === parent.condition.getText())
      assert.ok(condition, 'Unexpected render gate: ' + parent.condition.getText())
      assert.equal(typeof condition === 'object' && condition.branch === 'false' ? parent.whenFalse : parent.whenTrue, current, 'Binding uses the approved render branch')
    } else assert.ok(ts.isJsxElement(parent) || ts.isJsxFragment(parent) || ts.isJsxExpression(parent) || ts.isParenthesizedExpression(parent) || ts.isReturnStatement(parent), 'Binding cannot be disabled or detached: ' + ts.SyntaxKind[parent.kind])
    current = parent
  }
  assert.ok(ts.isReturnStatement(current))
  assert.equal(owner.body.statements.at(-1), current)
  assert.deepEqual(owner.body.statements.filter(ts.isReturnStatement), [current], 'No early unconditional render replacement')
}
export function evaluate(source, scope = {}) {
  const denied = []
  function forbidden() { denied.push('external operation'); throw new Error('External operation forbidden') }
  const runtime = new Proxy({ jsx: element, jsxs: element, Fragment: 'fragment' }, {
    get(target, name) { if (!Object.hasOwn(target, name)) return forbidden(); return target[name] },
  })
  const moduleValue = { exports: {} }
  const js = ts.transpileModule(source, { fileName: 'production-fragment.tsx', compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, { ...scope, module:moduleValue, exports: moduleValue.exports,
    fetch: forbidden, appFetch: forbidden, WebSocket: forbidden, XMLHttpRequest: forbidden,
    require(name) { if (name !== 'react/jsx-runtime') return forbidden(); return runtime },
  }, { timeout: 5000 })
  return { value: moduleValue.exports, clean() { assert.deepEqual(denied, [], 'No external attempts, including caught failures') } }
}

// Merged #1569 retains the final lesson; #1620 retires flight-save. The
// canonical course adds init-photo-01 immediately before end-02: 64 total,
// with 7 screens in Lessons 1 and 5. Keep an explicit inventory to prevent
// count-preserving loss/replacement rather than checking only a total.
export const approvedGroups = [
  ['welcome-01','welcome-02','welcome-video'],
  ['flight-01','flight-02','flight-voices','flight-05','flight-04','flight-03','flight-done'],
  ['tan-01','tan-intro-video','tan-02','tan-voices','tan-04','tan-05','tan-study-04','tan-06','tan-study-06','tan-study-07','tan-study-02','presence-01','presence-04','tan-03','tan-done'],
  ['kun-01','kun-intro-video','kun-02','kun-voices','kun-04','kun-05','kun-study-v2-01','kun-study-v2-02','kun-study-v2-03','kun-study-v2-04','kun-study-v2-05','kun-study-v2-06','kun-study-v2-07','kun-study-v2-08','kun-study-v2-09','kun-03','kun-done'],
  ['ygg-01','ygg-intro-video','ygg-02','ygg-voices','ygg-04','ygg-05','ygg-study-v2-01','ygg-study-v2-02','ygg-study-v2-03','ygg-study-v2-04','ygg-study-v2-05','ygg-study-v2-06','ygg-study-v2-07','ygg-03','ygg-done'],
  ['paths-01','paths-03','init-02','end-01','intention-04','init-photo-01','end-02'],
]
function runtimeSource(source) {
  // Keep every declaration. Type exports have no runtime value; the shared
  // loader checks the complete remaining runtime import/export allowlist.
  const edits = all(parse(source), node => ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node))
    .flatMap(node => (node.modifiers || []).filter(mod => mod.kind === ts.SyntaxKind.ExportKeyword))
    .sort((a, b) => b.pos - a.pos)
  for (const mod of edits) source = source.slice(0, mod.getStart()) + ' '.repeat(mod.end - mod.getStart()) + source.slice(mod.end)
  return source
}
export function currentCurriculum() {
  const fixture = sourceFixture()
  const testimonials = fixture.load(runtimeSource(read('data/academy/yggdrasil-testimonials.ts')), 'testimonials.ts', {
    '@/lib/public-locales': { PublicLocale: undefined },
  }, { exports: ['yggdrasilTextTestimonials','yggdrasilVideoTestimonials'] })
  const questions = fixture.load(read('data/academy/yggdrasil-preparation-questions.ts'), 'questions.ts', {}, { exports: ['yggdrasilPreparationQuestions'] })
  const curriculum = fixture.load(runtimeSource(read('data/academy/energywork-ai-curriculum.ts')), 'curriculum.ts', {
    './english-guided-meditations': { EnglishGuidedMeditation: undefined },
    './yggdrasil-testimonials': testimonials, './yggdrasil-preparation-questions': questions,
  }, { exports: ['ENERGYWORK_COURSE_ID','ENERGYWORK_COURSE_VERSION','sunVoices','kundaliniVoices','tantraVoices','energyworkPhases','energyworkLessons','energyworkInitiationRequirements','energyworkPathChoices','energyworkSlides'] })
  fixture.assertNoExternalOperations()
  return { ...curriculum, clean: fixture.assertNoExternalOperations }
}
export function assertCurrentCourse() {
  const curriculum = currentCurriculum(), expected = approvedGroups.flat()
  assert.equal(ENERGYWORK_VERSION, '2026-10-20.p10')
  assert.equal(curriculum.ENERGYWORK_COURSE_VERSION, ENERGYWORK_VERSION)
  assert.equal(expected.length, 64)
  for (const path of [null, 'tantra', 'kundalini', 'yggdrasil']) {
    assert.deepEqual(energyworkSequence(path), expected, 'Canonical active registry')
    const slides = curriculum.energyworkSlides(path)
    assert.deepEqual(Array.from(slides, slide => slide.id), expected, 'Actual rendered curriculum, including intro videos')
    assert.equal(new Set(slides.map(slide => slide.id)).size, expected.length)
    for (const slide of slides) for (const locale of ['en','ru']) {
      assert.ok(slide.title[locale]?.trim(), slide.id + ' localized title')
      assert.ok(slide.body[locale]?.trim(), slide.id + ' localized content')
    }
    for (const id of [...ENERGYWORK_REPORT_IDS, ...ENERGYWORK_LESSON_ANSWER_IDS])
      assert.equal(slides.find(slide => slide.id === id)?.question?.type, 'text', id + ' real private answer field')
    for (const [id,key] of Object.entries({'flight-02':'flight-to-sun','tan-02':'tantra-reiki','kun-02':'kundalini-reiki','ygg-02':'reiki-yggdrasil'}))
      assert.equal(slides.find(slide => slide.id === id)?.videoKey, key, id + ' exact original meditation binding')
    for (const [id,key] of Object.entries({'flight-01':'flight','tan-01':'tantra','kun-01':'kundalini','ygg-01':'yggdrasil','paths-01':'initiation'}))
      assert.equal(slides.find(slide => slide.id === id)?.introAudioKey, key, id + ' exact teacher audio binding')
  }
  curriculum.clean()
  return curriculum
}

export function assertCurrentNextGate(source) {
  const ast = parse(source), owner = ownerFunction(ast, 'EnergyworkAiLearner')
  const button = one(owner, node => ts.isJsxElement(node) && node.openingElement.attributes.properties.some(attr => attr.name?.getText() === 'data-energywork-next'))
  assertLive(button, owner, ['(slide.kind === "milestone" || !completed)'])
  assert.equal(attributeText(button.openingElement, 'onClick'), 'next')
  const expression = attributeText(button.openingElement, 'disabled')
  const names = ['busy','experienceMissing','feedbackMissing','tantraStudyMissing','otherStudyMissing']
  const fixture = evaluate('module.exports = ({busy,experienceMissing,feedbackMissing,tantraStudyMissing,otherStudyMissing,sync,slide,firstLessonConsent}) => (' + expression + ')')
  for (const sync of ['checking','unavailable','guest','consent','ready']) for (const id of ['flight-done','tan-study-04']) for (const firstLessonConsent of [false,true]) for (let flags = 0; flags < 32; flags++) {
    const state = {sync,slide:{id},firstLessonConsent,...Object.fromEntries(names.map((name,i) => [name,Boolean(flags & (1 << i))]))}
    const expected = flags !== 0 || sync === 'checking' || sync === 'unavailable' || (id === 'flight-done' && sync !== 'ready' && !firstLessonConsent)
    assert.equal(fixture.value(state), expected, 'Real next button preserves every completion/private-save guard: ' + JSON.stringify(state))
  }
  fixture.clean()
}
