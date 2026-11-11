import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('Messenger keeps four real initial choices but uses link-like rows after Hi', () => {
  const chat = source('components/holistic-agent-chat.tsx')
  const css = source('components/holistic-agent-chat.module.css')
  for(const action of ['video','meditation','hint','master']){
    assert.ok(chat.includes('data-hh-ai-start="'+action+'"'),action)
  }
  assert.ok(chat.includes('data-has-messages={messages.length>0||undefined}'))
  assert.ok(chat.includes('{compact&&entryOpen&&!pageHelp&&!messengerView&&<div className={styles.startActions}'))
  assert.ok(chat.includes('isCasualGreeting(text)'))
  assert.ok(chat.includes('setMessages(prev=>[...prev'))
  const initial = css.slice(css.indexOf('/* Four real chat entry actions'),css.indexOf('/* After a user turn'))
  assert.match(initial,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(initial,/min-height:106px/)
  const replies = css.slice(css.indexOf('/* After a user turn'),css.indexOf('.root[data-compact] .testLink{'))
  assert.match(replies,/\[data-has-messages="true"\] \.startActions/)
  assert.match(replies,/grid-template-columns:minmax\(0,1fr\)/)
  assert.match(replies,/min-height:44px/)
  assert.match(replies,/flex-direction:row/)
  assert.match(replies,/background:transparent/)
  assert.match(replies,/\.startActions small\{display:none\}/)
  assert.match(replies,/\.startActions :is\(button,a\):hover/)
})

test('Chat buttons retain handlers, new conversation reset and independent composer',()=>{
  const chat=source('components/holistic-agent-chat.tsx')
  for(const action of ['onClick={startContent}','startGuided("meditation")','startGuided("hint")',
    'href={"/"+locale+"/services/free-situation-review"}','setEntryOpen(false)',
    'setEntryOpen(true)','<form onSubmit={submit} className={styles.form}>']){
    assert.ok(chat.includes(action),action)
  }
})
