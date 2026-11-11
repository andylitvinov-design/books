import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isUnifiedMobileDockPath, unifiedMobileDockActive, unifiedMobileDockHref } from '../lib/unified-mobile-dock.mjs'

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('My Coach opens fictional AI personas while /masters remains the human directory', () => {
  const menu = read('components/site-navigation.tsx')
  const page = read('app/[locale]/my-coach/page.jsx')
  const catalog = read('components/my-coach-catalog.jsx')
  for (const locale of ['en', 'ru', 'es']) {
    assert.equal(unifiedMobileDockHref(locale, 'coach'), '/' + locale + '/my-coach')
    assert.equal(unifiedMobileDockActive('/' + locale + '/my-coach'), 'coach')
    assert.equal(unifiedMobileDockActive('/' + locale + '/masters'), null)
    assert.equal(isUnifiedMobileDockPath('/' + locale + '/my-coach'), true)
    assert.equal(isUnifiedMobileDockPath('/' + locale + '/masters'), true)
    assert.ok(page.includes('/' + locale + '/my-coach'))
  }
  assert.ok(menu.includes("label: myCoachMenuCopy[activeLocale], href: '/' + activeLocale + '/my-coach"))
  assert.ok(menu.includes('data-nav-item="human-mentors"'))
  assert.ok(catalog.includes("href={'/' + lang + '/masters'}"))
  assert.ok(catalog.includes('data-my-coach-catalog'))
  assert.ok(catalog.includes('data-my-coach-start={selected.id}'))
  assert.ok(catalog.includes('localStorage'))
  assert.ok(catalog.includes('COACH_PERSONAS'))
  assert.match(page, /generateMetadata/)
})

test('persona handoff keeps the existing, reviewed session runner and user consent flow', () => {
  const lounge = read('app/[locale]/coaching/sessions/page.jsx')
  const runner = read('components/public-coaching-discovery.jsx')
  const component = read('components/my-coach-catalog.jsx')
  const humanDirectory = read('app/[locale]/coaching/page.jsx')
  assert.match(humanDirectory, /coachSessionHref/)
  assert.match(lounge, /resolveCoachSelection/)
  assert.match(lounge, /personaSelection=\{personaSelection\}/)
  assert.match(runner, /data-my-coach-handoff/)
  assert.match(runner, /coachStagePrompt/)
  assert.match(runner, /personaMethodFit/)
  assert.match(runner, /authoredFollowupFor/)
  assert.match(runner, /CoachingSessionIntroduction/)
  assert.match(component, /coachSessionHref\(lang, selected.id, safeSettings\)/)
  assert.match(component, /Live generative AI and two-way voice are not enabled here/i)
  const reg = read('lib/coaching/persona-registry.mjs')
  assert.match(reg, /COACH_SAFETY_RULES/)
  assert.doesNotMatch(reg, /OPENROUTER_API_KEY|SUPABASE_SERVICE_ROLE_KEY/)
})

test('About coach expands inline and Start Session opens the selected persona, not the lounge', () => {
  const catalog = read('components/my-coach-catalog.jsx')
  const catalogCss = read('components/my-coach-catalog.module.css')
  const runner = read('components/public-coaching-discovery.jsx')
  const runnerCss = read('components/public-coaching-discovery.module.css')
  assert.match(catalog, /const \[expandedId, setExpandedId\] = useState\(null\)/)
  assert.match(catalog, /aria-expanded=\{isExpanded\} aria-controls=\{'my-coach-profile-' \+ persona.id\}/)
  assert.match(catalog, /\{isExpanded && \(/)
  assert.doesNotMatch(catalog, /scrollIntoView/)
  assert.match(catalogCss, /\.cardSelected \.profile\{/)
  assert.match(runner, /\{!session\?selectedPersona\?<section/)
  assert.match(runner, /data-my-coach-handoff=\{selectedPersona.id\}/)
  assert.match(runner, /data-my-coach-begin-conversation/)
  assert.match(runner, /onClick=\{\(\)=>start\(starterScheme,true\)\}/)
  assert.match(runner, /setEntryStep\(direct\?'questions':'intro'\)/)
  assert.match(runner, /coachingSchemeRequiresAdultConsent\(s\)/)
  assert.match(runnerCss, /prefers-reduced-motion:reduce/)
})
