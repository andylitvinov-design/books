import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import {
  COACHING_REQUEST_TOPICS, coachingRequestTopicLabel, isCoachingRequestTopic,
} from '../lib/coaching/session-onboarding.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const client=read('components/coaching-session-onboarding.jsx')
const guest=read('components/public-coaching-discovery.jsx')
const privateClient=read('components/app/personal-coaching.jsx')
const tradition=read('components/app/tradition-coaching.jsx')
const backend=read('lib/app/personal-coaching.js')

test('coaching request topics have stable, unique, accessible EN/RU/ES choices',()=>{
  assert.deepEqual(COACHING_REQUEST_TOPICS.map(item=>item.id),[
    'love','relationships','money','business','career','wellbeing','sexuality','growth','other',
  ])
  assert.equal(new Set(COACHING_REQUEST_TOPICS.map(item=>item.id)).size,9)
  for(const item of COACHING_REQUEST_TOPICS){
    assert.equal(isCoachingRequestTopic(item.id),true)
    for(const locale of ['en','ru','es']){
      assert.ok(item.label[locale]?.length>2,item.id+' '+locale)
      assert.equal(coachingRequestTopicLabel(item.id,locale),item.label[locale])
    }
  }
  for(const value of ['',null,undefined,'unverified','sexuality;DROP TABLE','<script>'])
    assert.equal(isCoachingRequestTopic(value),false)
  assert.equal(coachingRequestTopicLabel('__unknown__','ru'),'')
})

test('introduction explains duration, framework, specialist, style, outcome, self-coaching boundary',()=>{
  assert.match(client,/data-coaching-intro-slide/)
  assert.match(client,/name=\{?/) // static contract; localized title rendered as h1
  assert.match(client,/t\.duration/)
  assert.match(client,/t\.model/)
  assert.match(client,/t\.specialistValue/)
  assert.match(client,/t\.thinking/)
  assert.match(client,/t\.outcome/)
  assert.match(client,/t\.selfGuided/)
  for(const line of ['Continue coaching session','Продолжить коучинг-сессию','Continuar'])
    assert.ok([guest,privateClient,tradition].some(file=>file.includes(line)),line)
  assert.doesNotMatch(client,/new Audio\(|autoplay|navigator\.mediaDevices|getUserMedia/)
})

test('topic screen displays choices on the page, not inside a popover or mandatory essay',()=>{
  assert.match(client,/data-coaching-topic-slide/)
  assert.match(client,/COACHING_REQUEST_TOPICS\.map/)
  assert.match(client,/aria-pressed=\{value===topic\.id\}/)
  assert.match(client,/data-coaching-topic-choice=\{topic\.id\}/)
  assert.match(client,/onChange\(topic\.id\)/)
  assert.match(client,/value==='sexuality'&&onAgeConfirm/)
  assert.match(client,/checked=\{ageConfirmed\}/)
  assert.doesNotMatch(client,/<textarea|<dialog|localStorage|sessionStorage|fetch\(/)
  const css=read('components/coaching-session-onboarding.module.css')
  assert.match(css,/@media\(max-width:600px\)/)
  assert.match(css,/\.topicGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css,/\.topic\{[^}]*min-height:54px/)
  assert.match(css,/safe-area-inset|focus-visible/)
})

test('public guest starts with two screens, preserves original question runner and safe topic-only recap',()=>{
  assert.match(guest,/const \[entryStep,setEntryStep\]=useState\('intro'\)/)
  assert.match(guest,/setEntryStep\('topic'\)/)
  assert.match(guest,/setEntryStep\('questions'\)/)
  assert.match(guest,/entryStep==='intro'\?<CoachingSessionIntroduction/)
  assert.match(guest,/entryStep==='topic'\?<CoachingSessionTopic/)
  assert.match(guest,/data-public-coaching-slide=\{current\.id\}/)
  assert.match(guest,/data-public-coaching-complete/)
  assert.match(guest,/sessionTopic\?t\.yourTopic/)
  assert.match(guest,/requiresAdult&&!adultAcknowledged/)
  assert.match(guest,/setAdultAcknowledged\(true\)/)
  assert.doesNotMatch(guest,/localStorage|sessionStorage|sendBeacon\(|gtag\(|fbq\(|\bfetch\(/)
})

test('private start happens only after both slides, then stores consented topic encrypted',()=>{
  assert.match(privateClient,/onChoose=\{prepare\}/)
  assert.match(privateClient,/function prepare\(/)
  assert.match(privateClient,/function begin\(\)/)
  assert.match(privateClient,/entry\.step==='intro'\?<CoachingSessionIntroduction/)
  assert.match(privateClient,/:<CoachingSessionTopic/)
  assert.match(privateClient,/entry\.step==='topic'&&\(!entry\.clientTopic/)
  assert.match(privateClient,/begin\(\)/)
  assert.match(privateClient,/clientQuestion,clientTopic/)
  assert.match(backend,/function validatedCoachingTopic\(value\)/)
  assert.match(backend,/PERSONAL_COACH_INVALID_TOPIC/)
  assert.match(backend,/clientTopic:selection\.clientTopic/)
  assert.match(backend,/clientTopic==='sexuality'/)
  assert.match(backend,/clientTopic\?\{clientTopic\}/)
  assert.match(backend,/seal\(course,sealContext\(actor\),config\)/)
  assert.match(backend,/readRow\(db,actor,true\)/)
  assert.match(backend,/onlyKeys\(input,\['action','revision','schemeKey','clientQuestion','clientTopic','adultConfirmed'\]\)/)
  assert.doesNotMatch(privateClient,/localStorage|sessionStorage|\bfetch\(|sendBeacon\(/)
})

test('Egyptian and Greek preserve session history and only save after topic choice',()=>{
  assert.match(tradition,/data-tradition-coaching-onboarding/)
  assert.match(tradition,/entryStep==='intro'\?<CoachingSessionIntroduction/)
  assert.match(tradition,/:<CoachingSessionTopic/)
  assert.match(tradition,/send\('start',\{clientTopic,adultConfirmed:topicAdultConfirmed\}\)/)
  assert.match(tradition,/setRestartRequested\(true\)/)
  assert.match(tradition,/data-tradition-one-question/)
  assert.match(backend,/course\.traditionTracks\[template\]/)
  assert.match(backend,/current:newSession\(null,clientTopic\)/)
  assert.match(backend,/clientTopic==='sexuality'&&input\.adultConfirmed!==true/)
})

test('all changed onboarding JSX parses; CSS classes and screen actions exist',()=>{
  for(const path of [
    'components/coaching-session-onboarding.jsx',
    'components/public-coaching-discovery.jsx',
    'components/app/personal-coaching.jsx',
    'components/app/tradition-coaching.jsx',
  ]){
    const contents=read(path)
    const parsed=ts.createSourceFile(path,contents,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    assert.deepEqual(parsed.parseDiagnostics.map(diag=>ts.flattenDiagnosticMessageText(diag.messageText,' ')),[],path)
  }
  const css=read('components/coaching-session-onboarding.module.css')
  const actual=new Set([...css.matchAll(/(?<![\w-])\.([A-Za-z_][A-Za-z_0-9-]*)/g)].map(match=>match[1]))
  const used=[...client.matchAll(/styles\.([A-Za-z_][A-Za-z_0-9]*)/g)].map(match=>match[1])
  assert.deepEqual(used.filter(item=>!actual.has(item)),[])
})
