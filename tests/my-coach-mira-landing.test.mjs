import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('My Coach opens compact discovery and preserves real help and session flows', () => {
  const component = read('components/my-coach-catalog.jsx')
  const css = read('components/my-coach-mira-landing.module.css')
  assert.match(component, /id="my-coach-top"/)
  assert.match(component, /id="all-coaches"/)
  assert.match(component, /data-my-coach-kind-switch/)
  assert.match(component, /<MyCoachExpressStart locale=\{lang\} embedded/)
  assert.match(component, /data-my-coach-card-start=\{persona\.id\}/)
  assert.match(component, /setTopic\(current => current === item\.id \? 'all' : item\.id\)/)
  assert.match(component, /COACH_PERSONAS/)
  assert.match(component, /iHelp/)
  assert.match(component, /document\.querySelector\('\[data-hh-ihelp-trigger\]'\)/)
  assert.match(component, /nativeHelp\.click\(\)/)
  assert.match(css, /:global\(body\):has\(\.landing\) :global\(\[data-hh-ihelp-trigger\]\)/)
  assert.doesNotMatch(component, /<video[^>]+autoplay|<audio[^>]+autoplay/i)
})
