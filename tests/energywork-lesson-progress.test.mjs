import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { energyworkLessonRanges, energyworkSequence } from "../data/academy/energywork-ai-schema.js"
import ts from 'typescript'
import { parse, one, ownerFunction, attributeText, assertLive, evaluate, currentCurriculum, nodes, textContent } from './helpers/reiki-current-course-contract.mjs'

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8")
const learner = read("components/energywork-ai-learner.tsx")
const cabinet = read("components/app/cabinet-free-course-banners.jsx")
const repo = read("lib/academy/energywork-course-repository.js")

test("The visible slide counter uses five real lesson lengths and a separate introduction", () => {
  const sequence = energyworkSequence()
  const ranges = energyworkLessonRanges(sequence)
  assert.equal(sequence.length, 63)
  assert.deepEqual(sequence.slice(3,10), ["flight-01","flight-02","flight-voices","flight-05","flight-04","flight-03","flight-done"], "Lesson 1 ends after the timed practice")
  assert.equal(ranges[0].start, 3, "Teacher welcome video and two welcome screens are outside lesson 1")
  assert.deepEqual(ranges.map(range => range.count), [7, 15, 17, 15, 6])
  assert.deepEqual(ranges.map(range => range.firstSlideId),
    ["flight-01", "tan-01", "kun-01", "ygg-01", "paths-01"])
  for (let i = 0; i < ranges.length; i++) {
    assert.equal(ranges[i].end, ranges[i + 1]?.start ?? sequence.length, "Lesson boundaries are adjacent")
    assert.equal(sequence[ranges[i].start], ranges[i].firstSlideId)
  }
  assert.match(learner, /currentLessonRange\.lesson/)
  assert.match(learner, /lessonProgressLabel/)
  assert.match(learner, /progressPercent/)
  assert.doesNotMatch(learner, /\{t\.lesson\} \{index \+ 1\} \{t\.of\} \{total\}/)
})

test("A single checkpoint action saves before advancing and does not promise guest saving", () => {
  assert.doesNotMatch(learner, /data-energywork-save-progress|saveAndLeave/);
  assert.match(learner, /saveAndContinue: "Save my lesson and continue"/);
  assert.match(learner, /saveAndContinue: "Сохранить урок и продолжить"/);
  assert.match(learner, /returnAnytime: "Pick up here anytime from My Courses\."/);
  assert.match(learner, /returnAnytime: "Вернуться к уроку можно через «Мои курсы»\."/);
  // Revisited unchanged slides skip duplicate writes; changed slides must persist before moving on.
  assert.match(learner, /async function next\(\) \{[\s\S]*?const alreadyStored = sync === "ready" && energyworkAdvanceAlreadyStored\([\s\S]*?if \(sync === "ready" && !alreadyStored\) \{[\s\S]*?await store\(nextId\);[\s\S]*?setIndex\(\(current\) => Math\.min\(current \+ 1, slides\.length - 1\)\)/);
  assert.match(learner, /data-reiki-milestone-choices/);
  assert.match(learner, /data-reiki-tomorrow-choice/);
  assert.match(learner, /data-energywork-next/);
  assert.match(repo, /MEDITATION_FEEDBACK_REQUIRED/);
  assert.match(repo, /nextIndex < slideIndex \|\| nextIndex > slideIndex\+1/);
});

test("Cabinet chapter picker uses saved owner progress and forbids deep-link skipping", () => {
  assert.match(cabinet, /appFetch\('academy-energywork'\)/)
  assert.match(cabinet, /data-energywork-cabinet-lessons/)
  assert.match(cabinet, /const unlocked = savedIndex >= range\.start/)
  assert.match(cabinet, /href=\{courseHref \+ '\?slide=' \+ encodeURIComponent\(range\.firstSlideId\)\}/)
  assert.match(cabinet, /aria-disabled="true"/)
  assert.match(learner, /requestedIndex >= 0 && requestedIndex <= savedIndex \? requestedIndex : savedIndex/)
  assert.match(repo, /COURSE_STEP_NOT_READY/)
  // #1140 removed learner programme chapter cards; #1157 keeps guide-only links.
  // The actual saved chapter links remain in the cabinet, not this help drawer.
  assert.doesNotMatch(learner, /jumpToSlide\(lesson\.firstSlideId\)/)
})

test('Real cabinet chapter links lock unreached lessons and bind each saved chapter target', () => {
  const ast = parse(cabinet), owner = ownerFunction(ast, 'CabinetFreeCourseBanners')
  const map = one(owner, node => ts.isCallExpression(node) && node.expression.getText() === 'ENERGYWORK_LESSON_RANGES.map')
  assertLive(map, owner, ['academyProgress'])
  const curriculum = currentCurriculum(), sequence = energyworkSequence(), ranges = energyworkLessonRanges(sequence)
  for (const [path,names] of [
    ['@/data/academy/energywork-ai-schema',['energyworkLessonRanges','energyworkSequence']],
    ['@/data/academy/energywork-ai-curriculum',['energyworkLessons']],
  ]) {
    const imported = one(ast, node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === path)
    assert.ok(ts.isNamedImports(imported.importClause?.namedBindings))
    assert.deepEqual(imported.importClause.namedBindings.elements.map(node => node.getText()).sort(),names.sort(), 'Use the genuine schema/curriculum bindings')
  }
  const topLevel = ['ENERGYWORK_SEQUENCE','ENERGYWORK_LESSON_RANGES'].map(name => {
    const node = one(ast, node => ts.isVariableDeclaration(node) && node.name.getText() === name)
    assert.equal(node.parent.parent.parent,ast,'Evaluate genuine module-level chapter data')
    return node.getText()
  })
  const modelSequence = evaluate('const ' + topLevel[0] + '; module.exports = ENERGYWORK_SEQUENCE', {energyworkSequence})
  assert.deepEqual(Array.from(modelSequence.value),sequence,'The real cabinet model retains the entire current sequence')
  modelSequence.clean()
  const modelRanges = evaluate('const ' + topLevel.join('; const ') + '; module.exports = ENERGYWORK_LESSON_RANGES', {energyworkSequence,energyworkLessonRanges})
  assert.deepEqual(JSON.parse(JSON.stringify(modelRanges.value)),ranges,'The real cabinet model retains all five lesson ranges')
  modelRanges.clean()
  const declarations = ['language','courseHref','savedIndex','currentLesson'].map(name =>
    one(owner.body, node => ts.isVariableDeclaration(node) && node.name.getText() === name).getText())
  for (const locale of ['en','ru']) for (const savedIndex of [0,...ranges.flatMap(range => [range.start-1,range.start,range.end-1])]) {
    const fixture = evaluate('const ' + [...topLevel,...declarations].join('; const ') + '; module.exports = ' + map.getText(), {
      locale, academyProgress: { slideId: sequence[savedIndex], status: 'active' },
      energyworkSequence, energyworkLessonRanges, energyworkLessons: curriculum.energyworkLessons,
      t: { lesson: 'Lesson', slides: 'slides', locked: 'Locked' }, Link: 'a', Check: 'check', LockKeyhole: 'lock',
      styles: { lessonLink: 'lessonLink', lessonLocked: 'lessonLocked' },
    })
    const items = fixture.value
    assert.equal(items.length, 5)
    items.forEach((item, i) => {
      assert.equal(item.type, 'li')
      const children = nodes(item), links = children.filter(node => node.type === 'a'), range = ranges[i]
      assert.equal(links.length, savedIndex >= range.start ? 1 : 0)
      if (links.length) {
        assert.equal(links[0].props.href, '/' + locale + '/academy/principles-of-energywork/learn?slide=' + range.firstSlideId)
        assert.equal(links[0].props.prefetch, false)
        assert.equal(links[0].props['aria-current'], savedIndex >= range.start && savedIndex < range.end ? 'step' : undefined)
      } else assert.equal(children.filter(node => node.props['aria-disabled'] === 'true').length, 1)
      assert.ok(textContent(item).includes(curriculum.energyworkLessons[i].title[locale]))
      assert.ok(textContent(item).includes(range.count + ' slides'))
    })
    fixture.clean()
  }
  curriculum.clean()
})

function jumpFixture({ busy = false, sync = 'ready', dirty = [], slide = {id: 'flight-04',kind: 'reflection',question: {}}, store } = {}) {
  const ast = parse(learner), owner = ownerFunction(ast, 'EnergyworkAiLearner')
  const handler = one(owner.body, node => ts.isFunctionDeclaration(node) && node.name?.text === 'jumpToSlide')
  assert.equal(handler.parent, owner.body, 'Use the actual learner handler, not a detached helper')
  const button = one(owner, node => ts.isJsxElement(node) && attributeText(node.openingElement, 'className') === 'styles.returnToReview')
  assertLive(button, owner, [
    'reviewReturn && !feedbackMissing && initiationItems.some((item) => item.reportId === slide.id || item.questionIds.includes(slide.id))',
    'slide.question', {test: 'slide.id === "end-01"', branch: 'false'},
  ])
  assert.equal(attributeText(button.openingElement, 'disabled'), 'busy')
  const events = [], ids = energyworkSequence()
  const fixture = evaluate(handler.getText() + '\nmodule.exports = { jumpToSlide, click: ' + attributeText(button.openingElement, 'onClick') + ' };', {
    busy, sync, slides: ids.map(id => ({id})), slide, dirtyRef: {current: new Set(dirty)}, reviewReturn: true,
    t: {saveFailed: 'save failed'}, store: async id => { events.push(['store',id]); if (store) await store(id) },
    setBusy: value => events.push(['busy',value]), setIndex: value => events.push(['index',ids[value]]),
    setReviewReturn: value => events.push(['review',value]), setSaveError: value => events.push(['error',value]),
  })
  return {...fixture.value, events, clean: fixture.clean}
}

test('Live review click saves dirty primary or secondary answers before jumping; failure stays put', async () => {
  for (const dirty of [['flight-04'],['secondary-answer']]) {
    let resolve
    const pending = new Promise(done => {resolve = done})
    const h = jumpFixture({dirty,slide: {id:'flight-04',kind:'reflection',question:{},secondaryQuestion:{id:'secondary-answer'}},store: () => pending})
    const clicked = h.click()
    assert.deepEqual(h.events,[['busy',true],['store','flight-04']], 'Navigation waits for private save acknowledgement')
    resolve(); await clicked
    assert.deepEqual(h.events,[['busy',true],['store','flight-04'],['busy',false],['review',false],['index','end-02']])
    h.clean()
  }
  const failed = jumpFixture({dirty:['flight-04'],store: () => {throw Error('synthetic save failure')}})
  await failed.click()
  assert.deepEqual(failed.events,[['busy',true],['store','flight-04'],['error','save failed'],['busy',false]])
  failed.clean()
})

test('Current jump handler preserves busy, missing-target, guest lesson lock and legacy answer alias guards', async () => {
  for (const [options,target] of [[{busy:true},'end-02'],[{},'missing-slide'],[{sync:'guest'},'tan-01'],[{sync:'consent'},'end-02'],[{sync:'checking'},'end-02'],[{sync:'unavailable'},'end-02']]) {
    const h = jumpFixture(options); await h.jumpToSlide(target); assert.deepEqual(h.events,[]); h.clean()
  }
  const guest = jumpFixture({sync:'guest',dirty:['flight-04']})
  await guest.jumpToSlide('flight-01')
  assert.deepEqual(guest.events,[['review',true],['index','flight-01']], 'Guest navigation never pretends to save')
  guest.clean()
  const clean = jumpFixture(); await clean.click()
  assert.deepEqual(clean.events,[['review',false],['index','end-02']], 'Unchanged answers do not generate another write')
  clean.clean()
  const alias = jumpFixture({slide:{id:'end-02',kind:'finish'}}); await alias.jumpToSlide('tan-study-03')
  assert.deepEqual(alias.events,[['review',true],['index','tan-study-02']]); alias.clean()
})

test('Journey help opens actual system guides in a new tab without navigating away from unsaved reflections', () => {
  const ast = parse(learner), owner = ownerFunction(ast, 'EnergyworkAiLearner')
  const help = one(owner, node => ts.isJsxElement(node) && attributeText(node.openingElement, 'id') === 'reiki-journey-help')
  assert.equal(attributeText(help.openingElement, 'hidden'), '!programmeOpen')
  const map = one(help, node => ts.isCallExpression(node) && node.expression.getText() === 'energyworkPathChoices.map')
  assertLive(map, owner)
  const curriculum = currentCurriculum()
  const descriptions = one(ast, node => ts.isVariableDeclaration(node) && node.name.getText() === 'programmeSystemDescriptions')
  for (const locale of ['en','ru']) {
    const fixture = evaluate('const ' + descriptions.getText() + '; module.exports = ' + map.getText(), {
      locale, energyworkPathChoices: curriculum.energyworkPathChoices,
      t:{systemDetails:'Details',programmeRead:'Read'},Link:'a',ExternalLink:'icon',
      styles:{programmeSystem:'system',programmeSystemText:'description',programmeSystemLink:'link'},
    })
    const links = nodes(fixture.value).filter(node => node.type === 'a')
    assert.equal(links.length,3)
    links.forEach((link,i) => {
      const choice = curriculum.energyworkPathChoices[i]
      assert.equal(link.props.href, '/' + locale + '/academy/' + choice.studyPath)
      assert.equal(link.props.target,'_blank')
      assert.equal(link.props.rel,'noopener noreferrer')
      assert.equal(link.props['aria-label'],choice.title[locale] + ' — Details')
      assert.equal(link.props.onClick,undefined,'Guide never invokes a course jump or save')
    })
    fixture.clean()
  }
  curriculum.clean()
})


test("Lesson 1 finishes directly on the inline consented save milestone", () => {
  const curriculum = read("data/academy/energywork-ai-curriculum.ts");
  const expected = energyworkSequence();
  const reportIndex = expected.indexOf("flight-04");
  const practiceIndex = expected.indexOf("flight-03");
  const doneIndex = expected.indexOf("flight-done");
  assert.ok(reportIndex < practiceIndex && practiceIndex < doneIndex);
  assert.equal(expected[doneIndex + 1], "tan-01");
  assert.ok(!expected.includes("flight-save"));
  assert.match(curriculum, /slide\.phase === "flight"/);
  assert.match(learner, /data-reiki-first-lesson-consent/);
  assert.match(learner, /saveLessonOneToCabinet\("continue"\)/);
});
