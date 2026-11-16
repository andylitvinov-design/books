import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('live AI chat gets the same iPhone visual viewport lock as guided coaching',()=>{
  const page=source('components/public-coaching-discovery.jsx')
  const css=source('components/public-coaching-discovery.module.css')
  assert.match(page,/if\(!session&&!liveChat\)return/)
  assert.match(page,/\},\[session,liveChat\]\)/)
  assert.match(page,/data-coach-session-layout=\{liveChat\?'true':undefined\}/)
  assert.match(page,/document\.body\.style\.overflow='hidden'/)
  assert.match(page,/--coach-visible-height/)
  assert.match(page,/--coach-visible-top/)
  assert.match(css,/\.root\[data-public-coaching-active="true"\] \.personaWelcome\[data-coach-session-layout="true"\]\{[\s\S]*?height:100%;[\s\S]*?overflow:hidden;/)
  assert.match(css,/\.personaWelcome\[data-coach-session-layout="true"\] > \[data-my-coach-live-dialogue\]\{[\s\S]*?height:100%;/)
})

test('iPhone text focus pins Send to the bottom, leaving only transcript scrolling',()=>{
  const css=source('components/my-coach-live-dialogue.module.css')
  const ui=source('components/my-coach-live-dialogue.jsx')
  const keyboard=css.indexOf('/* iPhone keyboard mode:')
  assert.ok(keyboard>css.indexOf('[data-coach-showcase=\'true\'] .sessionHero'),'keyboard focus must override large portrait')
  const rules=css.slice(keyboard)
  assert.match(rules,/@media\(max-width:699px\)/)
  assert.match(rules,/:has\(\.textComposer textarea:focus\) \.sessionScroll,/)
  assert.match(rules,/:has\(\.textComposer textarea:focus\) \.voiceControls,/)
  assert.match(rules,/:has\(\.textComposer textarea:focus\) \.conversationPanel\{[\s\S]*?min-height:0;max-height:100%/)
  assert.match(rules,/:has\(\.textComposer textarea:focus\) \.conversationPanel \.transcriptFeed\{[\s\S]*?overflow-y:auto/)
  assert.match(rules,/:has\(\.textComposer textarea:focus\) \.conversationPanel \.textComposer\{[\s\S]*?flex:0 0 auto/)
  assert.match(ui,/<textarea ref=\{composerRef\} id="hh-my-coach-live-input"/)
  assert.match(ui,/<button className=\{styles.send\} type="submit"/)
})
