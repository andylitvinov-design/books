import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read = name => readFileSync(new URL('../.github/workflows/'+name+'.yml',import.meta.url),'utf8')
// Literal Next route directories are not GitHub filter character classes.
for(const name of ['hh-course-presets','hh-energywork-ai','practitioner-presentations','hh-cabinet-journey','holistic-house-mobile-install'])test(name+': bracketed route paths are escaped without changing permissions or jobs',()=>{
 const source=read(name)
 const patterns=source.split('\n').filter(line=>/^\s+- 'app\//.test(line)).map(line=>line.trim().slice(3,-1))
 assert.ok(patterns.length)
 const expected = name === 'holistic-house-mobile-install'
   ? 'app/\\[locale\\]/app/\\[\\[...path\\]\\]/page.jsx'
   : 'app/api/app/\\[...path\\]/route.js'
 assert.ok(patterns.includes(expected), 'Literal Next route must remain in the trigger')
 assert.ok(patterns.every(pattern=>!/(?<!\\)[\[\]]/.test(pattern)), 'No unescaped Next directory brackets')
 if(['hh-course-presets','hh-cabinet-journey'].includes(name)) {
  assert.ok(patterns.includes('app/api/app/*/route.js'), 'BASE reader needs a narrow one-segment route')
  for(const excluded of ['direct-messages','practitioner-client-messages','notification-channels'])
   assert.ok(source.includes("      - '!app/api/app/"+excluded+"/**'"), 'exclude unrelated Messenger API: '+excluded)
 }
 const api=patterns.find(p=>p.includes('...path'))
 assert.equal(api.replaceAll('\\[','[').replaceAll('\\]',']'), name === 'holistic-house-mobile-install'
   ? 'app/[locale]/app/[[...path]]/page.jsx' : 'app/api/app/[...path]/route.js')
 assert.match(source,/permissions:\s*\n\s+contents: read/)
 assert.match(source,/runs-on: ubuntu-latest/)
 assert.match(source,name === 'hh-cabinet-journey' ? /tsc --noEmit/ : /npm run build/)
 if(['hh-cabinet-journey','holistic-house-mobile-install'].includes(name)){
  assert.match(source,/node [^\n]*--test/)
  assert.match(source,/eslint/)
 }
 assert.doesNotMatch(source,/continue-on-error:\s*true|pull_request_target:/)
})

test('mobile install keeps literal locale and optional route matching in both PR and push events',()=>{
 const source=read('holistic-house-mobile-install')
 const [pr,push]=source.split('\n  push:')
 for(const event of [pr,push]){
  assert.ok(event.includes("'app/\\[locale\\]/install/**'"))
  assert.ok(event.includes("'app/\\[locale\\]/app/\\[\\[...path\\]\\]/page.jsx'"))
 }
 assert.match(push,/branches:\s*\n\s+- codex\/public-book-library/)
})


test('course and cabinet use owning API paths, not the shared Messenger catch-all', () => {
  const course = read('hh-course-presets');
  const cabinet = read('hh-cabinet-journey');
  for (const [name, source, expected] of [
    ['Course Presets', course, "'app/api/app/course/**'"],
    ['Cabinet Journey', cabinet, "'app/api/app/cabinet/**'"],
  ]) {
    assert.ok(source.includes(expected), name + ' must keep its API owner scope');
    assert.ok(source.includes("'app/api/app/\\[...path\\]/route.js'"), name + ' must retain the exact shared API dispatcher safety impact');
    assert.match(source, /permissions:\s*\n\s+contents: read/);
    assert.doesNotMatch(source, /continue-on-error:\s*true/);
  }
});
 
// Commander runs under Core's exact-HEAD contracts. Editing its isolated
// completion API must not launch legacy app, IA, profile, audio or Practice
// browser matrices, but those suites still own their respective app routes.
test('Commander-only PRs must not trigger unrelated specialist suites', async () => {
  const {parsePrTrigger, matchesTrigger} = await import('../lib/ci/specialist-aggregate.mjs')
  const commander = 'app/api/app/commander/pr-completion/route.js'
  const owners = [
    ['hh-app-browser', 'app/api/app/session/route.js'],
    ['hh-app-r1', 'app/api/app/session/route.js'],
    ['ia-v2', 'app/api/app/session/route.js'],
    ['hh-profile-axis-matching', 'app/api/app/meditation/route.js'],
    ['hh-private-audio-e2e', 'app/api/app/session/route.js'],
    ['practice-google-browser', 'app/api/app/practice/route.js'],
  ]
  for (const [name, ownedRoute] of owners) {
    const source = read(name)
    const trigger = parsePrTrigger(source, name)
    assert.equal(matchesTrigger(trigger, [commander]), false, name + ' must ignore Commander route')
    assert.equal(matchesTrigger(trigger, [ownedRoute]), true, name + ' retains real domain checks')
    assert.equal(matchesTrigger(trigger, [commander, ownedRoute]), true, name + ' still covers mixed PRs')
  }
  const reportPush = read('hh-reports-development-program').split('\n  pull_request:')[0]
  assert.ok(reportPush.includes("      - '!app/api/app/commander/**'"), 'skip unrelated postmerge report job')
  assert.ok(reportPush.includes("      - 'app/api/app/**'"), 'keep existing postmerge report API coverage')
})
