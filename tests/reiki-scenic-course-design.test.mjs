import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { parse, one, ownerFunction, attributeText, assertLive, evaluate, nodes, textContent } from './helpers/reiki-current-course-contract.mjs'
import {
  energyworkSequence, ENERGYWORK_LESSON_STARTS, ENERGYWORK_VERSION,
  ENERGYWORK_REPORT_IDS, ENERGYWORK_LESSON_ANSWER_IDS,
} from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const learner = read('components/energywork-ai-learner.tsx')
const css = read('components/energywork-ai-learner.module.css')
const curriculum = read('data/academy/energywork-ai-curriculum.ts')
const design = read('docs/design/REIKI_PRACTITIONER_SCENIC_V1_APPROVED.md')

test('Approved scenic design is preserved across new unified five-lesson course', () => {
  assert.match(learner, /data-course-theme="reiki-scenic-v1"/)
  assert.match(learner, /data-course-one-screen="v1"/)
  assert.match(css, /REIKI SCENIC COURSE DESIGN V1/)
  assert.match(css, /\.page\[data-course-theme="reiki-scenic-v1"\]/)
  assert.match(css, /course-focus-mountain-boy\.webp/)
  assert.match(design, /Owner approval:.*18 October 2026/)
  assert.match(curriculum, /ENERGYWORK_COURSE_VERSION = "2026-10-20.p10"/)
  assert.equal(ENERGYWORK_VERSION, '2026-10-20.p10')
  assert.equal(energyworkSequence().length,63)
  for(const legacyPath of ['yggdrasil','tantra','kundalini'])
    assert.deepEqual(energyworkSequence(legacyPath),energyworkSequence())
})

test('Immersive journey dots now follow the actual five lessons, not a path-selection', () => {
  assert.match(learner, /<nav className=\{styles\.journey\} aria-label=\{t\.fiveLessons\}>/)
  assert.match(learner, /energyworkLessons\.map\(\(lesson, number\) =>/)
  assert.match(learner, /aria-current=\{lessonNumber === number \+ 1 \|\| \(lessonNumber === 0 && number === 0\) \? "step" : undefined\}/)
  assert.match(learner, /className=\{styles\.journeyDot\}/)
  assert.doesNotMatch(learner, /onClick=\{\(\) => choosePath\(choice\.id\)\}/)
  assert.doesNotMatch(learner, /slide\.kind === "path-choice" && !path/)
  assert.deepEqual(ENERGYWORK_LESSON_STARTS,['flight-01','tan-01','kun-01','ygg-01','paths-01'])
})

test('Every type of teaching screen uses existing glass typography and safe controls', () => {
  const kinds = ['welcome', 'lesson', 'video', 'practice', 'reflection', 'finish']
  for(const kind of kinds)assert.ok(curriculum.includes('kind: "'+kind+'"'),kind)
  for(const selector of ['.slide','.description','.video','.question','.choice','.practiceTimer','.final'])
    assert.ok(css.includes('.page[data-course-theme] '+selector),selector)
  assert.match(learner, /<PracticeTimer key=\{slide\.id\} locale=\{locale\}/)
  assert.match(learner, /<AcademyVideoPlayer/)
  assert.match(learner, /onClick=\{copyNotes\}/)
  assert.match(learner, /onClick=\{\(\) => window\.print\(\)\}/)
  assert.doesNotMatch(learner, /autoplay|autoPlay/)
  // Short-lived same-tab OAuth handoff uses sessionStorage; regular answers stay server-encrypted.
  assert.doesNotMatch(learner, /localStorage\s*[.\[]/)
  assert.match(learner, /window\.sessionStorage\.setItem\(ENERGYWORK_FIRST_LESSON_STORAGE_KEY/)
})

test('Welcome keeps the free course scenic illustration and three benefits while describing all five lessons', () => {
  // Merged #1453 introduced five-day copy; #1636 binds the compact cover facts
  // and the voluntary initiation request disclosure, not the retired benefit cards.
  const ast = parse(learner), owner = ownerFunction(ast, 'EnergyworkAiLearner')
  const declaration = one(ast, node => ts.isVariableDeclaration(node) && node.name.getText() === 'copy')
  const localized = evaluate('module.exports = ' + declaration.initializer.getText())
  assert.equal(one(owner.body, node => ts.isVariableDeclaration(node) && node.name.getText() === 't').initializer.getText(), 'copy[locale]')
  const reward = one(owner, node => ts.isJsxElement(node) && attributeText(node.openingElement, 'className') === 'styles.welcomeReward')
  assertLive(reward, owner, ['slide.kind === "welcome"'])
  let conditional = reward.parent
  while (ts.isParenthesizedExpression(conditional)) conditional = conditional.parent
  assert.ok(ts.isConditionalExpression(conditional))
  const expected = {
    en: ['5 days · 3 Reiki traditions','5 short lessons','Guided meditations','At your own pace'],
    ru: ['5 дней · 3 системы Рейки','5 коротких уроков','Медитации с сопровождением','В своём темпе'],
  }
  for (const locale of ['en','ru']) {
    const t = localized.value[locale]
    assert.equal(t.welcomeOffer, expected[locale][0])
    const scope = {t, Sparkles:'icon',Check:'icon',Award:'icon',ChevronDown:'icon', styles: {
      welcomeReward:'reward',welcomeRewardTitle:'ribbon',coverFacts:'facts',welcomeGift:'gift',welcomeGiftExpanded:'expanded',
    }}
    const rendered = evaluate('module.exports = ' + conditional.getText(), {...scope,slide:{kind:'welcome'}})
    const tree = rendered.value
    assert.equal(tree.props['aria-label'],expected[locale][0])
    const facts = nodes(tree).filter(node => node.props.className === 'facts')
    assert.equal(facts.length,1)
    assert.equal(facts[0].props['aria-label'],t.benefits)
    assert.deepEqual(nodes(facts[0]).filter(node => node.type === 'span').map(textContent),expected[locale].slice(1))
    const gift = nodes(tree).filter(node => node.type === 'details' && Object.hasOwn(node.props,'data-reiki-initiation-gift'))
    assert.equal(gift.length,1)
    assert.ok(!gift[0].props.open,'Initiation detail is optional, not another required action')
    assert.ok(textContent(gift[0]).includes(t.welcomeGiftShort))
    assert.ok(textContent(gift[0]).includes(t.welcomeGiftText))
    assert.match(t.welcomeGiftText,locale === 'en' ? /all five lessons.*request one free Level 1 initiation.*in chat.*does not confer initiation/ : /После пяти уроков.*запросить одну бесплатную инициацию.*в чате.*Сам курс не является инициацией/)
    const hidden = evaluate('module.exports = ' + conditional.getText(), {...scope,slide:{kind:'reflection'}})
    assert.equal(hidden.value,null)
    rendered.clean(); hidden.clean()
  }
  localized.clean()
  assert.match(learner, /Want individual guidance\? Ask about a personal session with Andrey/)
  assert.match(learner, /styles\.welcomeReward/)
  assert.match(learner, /styles\.coverFacts/)
  assert.match(learner, /startFree: "Start free program"/)
  assert.match(learner, /startFree: "Начать бесплатный курс"/)
})

test('Course has teacher initiation readiness checklist with five private reports + twenty-two answers', () => {
  assert.equal(ENERGYWORK_REPORT_IDS.length,5)
  assert.equal(ENERGYWORK_LESSON_ANSWER_IDS.length,22)
  assert.match(learner, /const initiationReady = readyCount === readyTargetCount/)
  assert.match(learner, /data-initiation-readiness/)
  assert.match(css, /\.page\[data-course-theme\] \.reviewChecklist/)
  assert.match(learner, /jumpToSlide\(item\.reportId\)/)
  assert.match(learner, /jumpToSlide\(item\.nextQuestionId\)/)
  assert.match(learner, /initiationReady \? \(savedInitiationReady \? t\.reviewDone : t\.reviewSaveNeeded\) : t\.reviewNeeded/)
})

test('Bottom progress and mobile viewport safe-area fit remain approved', () => {
  const position = learner.indexOf('className={styles.progressFooter}')
  assert.ok(position > learner.indexOf('</section>'))
  assert.ok(position < learner.indexOf('className={styles.programme}'))
  assert.match(learner, /aria-valuenow=\{reachedIndex \+ 1\}/)
  assert.match(learner, /progressPercent/)
  assert.match(learner, /lessonProgressLabel/)
  assert.match(learner, /t\.completedLabel/)
  assert.match(learner, /className=\{styles\.programmeIntro\}/)
  assert.match(learner, /<ReikiCourseReferralShare locale=\{locale\} \/>/)
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /@media \(max-width: 380px\)/)
  assert.match(css, /@media \(max-width: 760px\) and \(max-height: 700px\)/)
  assert.match(css, /env\(safe-area-inset-bottom\)/)
  assert.match(css, /overflow-y: auto/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /@media print/)
  assert.match(css, /:focus-visible/)
})

test('Private consent and optimistic saving survive the visual design transition', () => {
  assert.match(learner, /action: "start", consent: true/)
  assert.match(learner, /expectedRevision: revisionRef\.current/)
  assert.match(learner, /await store\(nextId\)/)
  assert.match(learner, /dirtyRef\.current/)
  assert.match(learner, /data-reiki-first-lesson-save/)
  assert.match(learner, /t\.consentText/)
  assert.match(learner, /data-reiki-private-save-status/)
  assert.match(learner, /className=\{styles\.saveSettings\}/)
  assert.match(learner, /data-reiki-final-share-consent/)
  assert.match(learner, /setSaveError\(t\.saveFailed\)/)
})

test('Public catalogue systems and descriptions match the interactive learning order', () => {
  const landing = read('components/principles-of-energywork.tsx')
  const paths = landing.split('const paths = [')[1].split('] as const;')[0]
  const order = [...paths.matchAll(/key: "(tantra|kundalini|yggdrasil)"/g)].map(x => x[1])
  assert.deepEqual(order, ['tantra','kundalini','yggdrasil'])
  assert.match(landing, /systemsTitle: "Three Reiki paths"/)
  assert.match(landing, /systemsTitle: "Три пути Рейки"/)
  assert.match(landing, /systemsTitle: "Tres caminos de Reiki"/)
})
