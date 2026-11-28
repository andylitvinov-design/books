import test from 'node:test'
// Keep profile contract tests inside the already-tested coaching/navigation suite.
import './my-coach-compact-profile.test.mjs'
import './my-coach-three-programs.test.mjs'
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
  assert.match(component, /coachSessionHref\(lang, selected.id, safeSettings, safeMethod\)/)
  assert.match(component, /a generative text dialogue is offered when a verified free privacy-preserving model is configured/i)
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
  // About must not auto-scroll or redirect. Topic shortcuts may intentionally scroll to the directory.
  const aboutHandler = catalog.match(/const choose = \(id\) => \{[\s\S]*?\n  \}/)?.[0]
  assert.ok(aboutHandler, 'inline About handler remains present')
  assert.doesNotMatch(aboutHandler, /scrollIntoView|router\.push|window\.location/)
  const ribbon = read('components/sitewide-antistress-banner.tsx')
  assert.match(ribbon, /my-coach/)
  assert.match(catalogCss, /\.cardSelected \.profile\{/)
  assert.match(runner, /\{!session\?selectedPersona\?<section/)
  assert.match(runner, /data-my-coach-handoff=\{selectedPersona.id\}/)
  assert.match(runner, /data-my-coach-begin-conversation/)
  assert.match(runner, /onClick=\{\(\)=>start\(starterScheme,true\)\}/)
  assert.match(runner, /setEntryStep\(direct\?'questions':'intro'\)/)
  assert.match(runner, /coachingSchemeRequiresAdultConsent\(s\)/)
  assert.match(runnerCss, /prefers-reduced-motion:reduce/)
})


test('header Back checkpoints consented draft without opening the Insight review', () => {
  const source=read('components/my-coach-live-dialogue.jsx')
  const back=source.slice(source.indexOf('async function navigateBackToCoaches'),source.indexOf('function resumeFromProtocol'))
  assert.match(back,/retainPendingClient\(\)/)
  assert.match(back,/autoSaveRef\.current/)
  assert.match(back,/await autoSaveQueueRef\.current\?\.flush\(\)/)
  assert.match(back,/window\.location\.assign\(href\)/)
  assert.doesNotMatch(back,/endWithProtocol|setProtocolOpen/)
  assert.match(source,/className=\{styles\.chooseCoach\}[^\n]+onClick=\{navigateBackToCoaches\}/)
})

test('Insight foregrounds the normalized overview and collapses the transcript', () => {
  const source=read('components/my-coach-live-dialogue.jsx')
  // The result preview and PDF projection share the same immutable reviewed snapshot.
  assert.match(source,/insightResult=protocolSaveSnapshotRef\.current\|\|currentProtocol\(\)\s*\n\s*insightOverview=myCoachProtocolPdfOptions\(insightResult,\{locale:conversationLang\}\)\.protocolOverview/)
  assert.match(source,/insightRows=coachCourseProtocolRows\(insightResult\.courseSessionId,insightResult\.turns,insightResult\.courseFieldReview,lang\)/)
  assert.match(source,/insightProfile=coachSavedProfileV3\(insightResult,lang\)/)
  const view=source.slice(source.indexOf('data-my-coach-protocol>'))
  assert.ok(view.indexOf('data-coach-insight-overview')>=0)
  assert.ok(view.indexOf('data-coach-insight-overview')<view.indexOf('data-coach-insight-transcript'))
  assert.match(view,/<details data-coach-insight-transcript>/)
})


test('catalog method preference reaches the existing authenticated greeting, never starts a session itself',()=>{
 const catalog=read('components/my-coach-catalog.jsx')
 const runner=read('components/public-coaching-discovery.jsx')
 const dialogue=read('components/my-coach-live-dialogue.jsx')
 assert.ok(catalog.includes('data-coach-catalog-method'))
 assert.ok(runner.includes('methodPreference={personaSelection?.methodId}'))
 assert.ok(dialogue.includes('methodPreference&&resolveCoachMethodId(personaId,methodPreference)'))
 assert.ok(dialogue.includes('method&&protocolOwnerRef.current?{methodId:method,methodSessionId:crypto.randomUUID()'))
 assert.ok(dialogue.includes('methodSelectionEnabled={protocolOwnerReady}'))
 assert.ok(dialogue.includes("protocolOwnerReady&&!greetingAccepted?selectedMethod:''"))
})


test('private My Page sessions link opens actual coaching protocol and unfinished draft archive',()=>{
 const profile=read('components/app/profile-personal-summary.jsx')
 const plan=read('components/app/my-coaching-plan.jsx')
 const cabinet=read('components/app/my-page-client.jsx')
 const sessions=profile.slice(profile.indexOf('data-my-page-sessions'),profile.indexOf('</section>',profile.indexOf('data-my-page-sessions')))
 assert.ok(sessions.includes("href={'/'+appLocale+'/app/my-coaching-plan?tab=reports'}"))
 assert.ok(sessions.includes('data-my-page-coach-protocols'))
 assert.ok(sessions.includes("href={'/'+appLocale+'/app/portrait?space=sessions'}"))
 for(const label of ['AI coach protocols and drafts','Протоколы и черновики AI-коуча','Protocolos y borradores del coach IA'])assert.ok(profile.includes(label))
 assert.ok(profile.includes("const appLocale=language==='es'?'en':language"))
 assert.ok(profile.includes('data-private-profile-only'))
 assert.ok(cabinet.includes("status==='ready'&&data"))
 assert.ok(cabinet.includes('<ProfilePersonalSummary'))
 assert.ok(plan.includes("searchParams?.get('tab')"))
 assert.ok(plan.includes("['reports','context'].includes(requestedTab)"))
 assert.ok(plan.includes("tab==='reports'&&"))
 assert.ok(plan.includes('<MyCoachDraftArchive key={accountId} accountId={accountId}'))
 assert.ok(plan.includes('data-my-coach-saved-protocol'))
})


test('My Coach prioritizes its first visible poster without eagerly loading the coach rail',()=>{
 const catalog=read('components/my-coach-catalog.jsx')
 const media=read('components/my-coach-motion-media.jsx')
 assert.match(catalog, /<MyCoachMotionMedia[^>]*context="hero"/)
 assert.ok(media.includes("loading={context==='hero'||context==='greeting'?'eager':'lazy'}"))
 assert.ok(media.includes("fetchPriority={context==='hero'||(isGenie&&context==='greeting')?'high':undefined}"))
 assert.ok(media.includes('preload="metadata"'))
})
