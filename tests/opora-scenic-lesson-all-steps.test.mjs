import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, statSync} from 'node:fs'

const jsx=readFileSync(new URL('../components/app/opora-v6-slide-player.jsx',import.meta.url),'utf8')
const css=readFileSync(new URL('../components/app/opora-v6-slide-player.module.css',import.meta.url),'utf8')
const photo=new URL('../public/images/holistic-house/report-lighthouse-coast.webp',import.meta.url)

test('AS2 fifteen-step player keeps a real local photo on every step, including completion',()=>{
  assert.ok(statSync(photo).size>100_000,'approved local photo must be available')
  assert.match(jsx,/className=\{styles\.frame\} data-scene-role=\{afterSave\?'complete':\(role\|\|'welcome'\)\}/)
  assert.match(jsx,/className=\{styles\.scenicBackdrop\} aria-hidden="true" data-opora-lesson-photo/)
  assert.match(jsx,/className=\{styles\.scenicPhoto\}[\s\S]*?src="\/images\/holistic-house\/report-lighthouse-coast\.webp"/)
  assert.match(css,/\.scenicBackdrop\s*\{[\s\S]*?position:absolute;inset:0/)
  assert.match(css,/\.scenicPhoto\s*\{[\s\S]*?object-fit:cover/)
  assert.match(css,/\.frame\[data-scene-role="complete"\] \.heroIcon/)
})

test('the daily thought is italic lettering over the photograph, not an icon-only flat box',()=>{
  assert.match(jsx,/role==='aphorism'\s*\?\s*<blockquote className=\{styles\.aphorism\}>\{authored\?\.quote\}<\/blockquote>/)
  assert.match(css,/\.aphorism\s*\{[\s\S]*?font-style:italic/)
  assert.match(css,/\.frame\[data-scene-role="aphorism"\] \.card\s*\{[\s\S]*?backdrop-filter:none/)
  assert.match(css,/\.frame\[data-scene-role="aphorism"\] \.aphorism\s*\{[\s\S]*?background:transparent;border:0/)
  assert.match(css,/\.frame\[data-scene-role="aphorism"\] \.heroIcon\s*\{[\s\S]*?width:38px;height:38px/)
})

test('the scenic treatment does not remove pause, answer feedback, stable footer, or safe scrolling',()=>{
  assert.match(jsx,/className=\{styles\.safetyButton\}/)
  assert.match(jsx,/role!=='baseline'&&role!=='save'&&optionsAvailable\.length>0/)
  assert.match(jsx,/className=\{styles\.options\} role="group"/)
  assert.match(jsx,/className=\{styles\.footer\}/)
  assert.match(css,/\.scroll\{overflow:auto;overflow-x:hidden/)
  assert.match(css,/\.header,\.scroll,\.footer\{position:relative;z-index:1\}/)
  assert.match(css,/Longer translated copy \/ large text may scroll inside \.scroll/)
  assert.match(css,/@media\(prefers-reduced-transparency:reduce\),\(prefers-contrast:more\)/)
})
