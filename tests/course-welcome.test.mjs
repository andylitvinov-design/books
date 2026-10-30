import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GROWTH_GOALS } from '../lib/inner-growth/course-model.js'
import {
  WELCOME_FEELING_IDS,
  welcomeFeelingChoices,
  welcomeFeelingSupport,
} from '../lib/inner-growth/course-welcome.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('six course goals have four accessible distinct EN/RU feeling choices', () => {
  assert.deepEqual(WELCOME_FEELING_IDS, ['steady', 'tense', 'low', 'unsure'])
  assert.equal(Object.keys(GROWTH_GOALS).length, 6)
  for (const goal of Object.keys(GROWTH_GOALS)) for (const locale of ['ru', 'en']) {
    const options = welcomeFeelingChoices(goal, locale)
    assert.deepEqual(options.map(option => option.id), WELCOME_FEELING_IDS)
    assert.equal(new Set(options.map(option => option.label)).size, 4)
    assert.ok(options.every(option => option.label.length >= 7))
    for (const choice of options) assert.ok(welcomeFeelingSupport(choice.id, locale).length >= 18)
  }
  assert.notDeepEqual(welcomeFeelingChoices('attention_clarity', 'ru'), welcomeFeelingChoices('inner_support', 'ru'))
  assert.deepEqual(welcomeFeelingChoices('unknown', 'ru'), welcomeFeelingChoices('calm_regulation', 'ru'))
  assert.equal(welcomeFeelingSupport('skip', 'ru'), '')
})

test('welcome is purely qualitative; quantitative baseline and last-24-hours check-in stay distinct', () => {
  const player = read('components/app/course-slide-player.jsx')
  const api = read('lib/app/growth-daily.js')
  const css = read('components/app/course-slide-player.module.css')
  const today = read('components/app/course-today.jsx')
  assert.match(player, /key: 'welcome', kind: 'welcome'/)
  assert.match(player, /key: 'baseline', kind: 'baseline'/)
  assert.match(player, /key: 'checkin', kind: 'checkin'/)
  assert.match(player, /data-course-welcome/)
  assert.match(player, /welcomeFeelingChoices\(cycle\.activeGoal \|\| cycle\.primaryGoal, locale\)/)
  assert.match(player, /welcomeFeeling:welcomeFeeling\|\|'skip'/)
  assert.match(today, /onPreferences=\{patch=>reviewLesson\?null:submit\('preferences'/)
  assert.match(player, /onCheckin\(\{/)
  assert.match(api, /welcomeFeelingOptions=new Set\(\['steady','tense','low','unsure','skip'\]\)/)
  assert.match(api, /welcomeFeeling:optionalChoice\(input\.welcomeFeeling,welcomeFeelingOptions\)/)
  assert.match(api, /welcomeFocus:focus\.goal/)
  assert.match(css, /\.welcomeBackgroundImage\{/)
  assert.match(css, /object-fit:contain/)
  assert.match(player, /src="\/images\/holistic-house\/course-focus-mountain-boy\.webp"/)
  assert.doesNotMatch(player, /async function savePace/)
  assert.doesNotMatch(player, /key: 'pace', kind: 'pace'/)
  assert.doesNotMatch(player, /localStorage|sessionStorage/)
  assert.match(today, /length:'quick'/)
})

test('welcome choice never silently changes preferences, goal, or a validated score', () => {
  const player = read('components/app/course-slide-player.jsx')
  const welcomeStart = player.indexOf("{slide.kind === 'welcome' &&")
  const welcomeEnd = player.indexOf("{slide.kind === 'baseline' &&", welcomeStart)
  assert.ok(welcomeStart > 0 && welcomeEnd > welcomeStart)
  const welcome = player.slice(welcomeStart, welcomeEnd)
  assert.match(welcome, /setWelcomeFeeling\(choice\.id\)/)
  assert.doesNotMatch(welcome, /onPreferences|onCheckin|onSession|setSeverity|setEntryNow/)
  assert.match(welcome, /welcomeSkip/)
  assert.match(welcome, /aria-pressed=/)
})
