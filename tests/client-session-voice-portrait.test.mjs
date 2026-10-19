import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('report voice player reuses the verified homepage photograph, never a generated face',()=>{
  const player=read('components/client-session-page.jsx')
  const home=read('components/holistic-house-home.tsx')
  const portrait=JSON.parse(read('data/static-portrait.json'))
  assert.equal(portrait.source,'/images/holistic-house/andy-about.png')
  assert.match(home,/<StaticPortrait/)
  assert.match(player,/import \{ StaticPortrait \} from '\.\/static-portrait'/)
  assert.match(player,/<StaticPortrait src="\/images\/holistic-house\/andy-about\.png"/)
  assert.match(player,/sizes="\(max-width: 355px\) 70px, \(max-width: 580px\) 86px, 124px"/)
  assert.match(player,/alt=\{ru\?'Андрей Литвинов':'Andrey Litvinov'\}/)
})

test('practitioner portrait is scoped to the personal audio section, not unrelated videos or downloads',()=>{
  const page=read('components/client-session-page.jsx')
  const voice=page.slice(page.indexOf('export function ClientSessionVoiceMessage'),page.indexOf('export function ClientSessionPage'))
  assert.match(page,/const portraitEnabled=showPractitionerPortrait&&!isVideo/)
  assert.match(voice,/item\.kind==='audio'/)
  assert.match(voice,/showPractitionerPortrait\/>/)
  assert.equal((voice.match(/\baudio\.map\(/g)||[]).length,1)
  assert.equal((page.match(/showPractitionerPortrait\/>/g)||[]).length,1)
  assert.match(page,/const route=mode==='owner'\?/)
  assert.match(page,/mode==='saved'\?/)
  assert.match(page,/mode==='guest'\?/)
  assert.match(page,/credentials:'same-origin',cache:'no-store'/)
  assert.match(page,/if\(typeof data\.url!=='string'\|\|data\.url!==route\)/)
  assert.match(page,/onLoadedMetadata=\{restorePosition\}/)
  assert.match(page,/<audio ref=\{player\}/)
  assert.doesNotMatch(page,/autoplay|autoPlay/)
})

test('voice design remains responsive, touch accessible and excluded from PDF print',()=>{
  const css=read('components/client-session-voice-card.module.css')
  const shared=read('components/client-session.module.css')
  assert.match(css,/grid-template-columns:clamp\(70px,20vw,90px\) minmax\(0,1fr\)/)
  assert.match(css,/@media \(max-width:355px\)/)
  assert.match(css,/\.voicePlayButton:focus-visible/)
  assert.match(css,/min-height:45px/)
  assert.match(css,/\.activePlayer audio/)
  assert.match(css,/@media print \{\.voiceSection \{display:none!important\}\}/)
  assert.match(shared,/\.reportVoiceSection/)
  assert.doesNotMatch(css,/url\(|youtube\.com|https?:\/\//)
})
