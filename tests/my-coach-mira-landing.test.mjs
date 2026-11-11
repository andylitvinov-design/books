import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('My Coach opens on Mira invitation and scrolls to a working filtered directory', () => {
  const component = read('components/my-coach-catalog.jsx')
  const css = read('components/my-coach-mira-landing.module.css')
  assert.match(component, /data-my-coach-hero=\{selected\.id\}/)
  assert.match(component, /data-my-coach-hero-start=\{selected\.id\}/)
  assert.match(component, /href=\{startHref\}/)
  assert.match(component, /id="my-coach-top"/)
  assert.match(component, /id="all-coaches"/)
  assert.match(component, /setTopic\(item\.id\)/)
  assert.match(component, /scrollIntoView/)
  assert.match(component, /COACH_PERSONAS/)
  assert.match(component, /aria-pressed=\{selected\.id === id\}/)
  assert.match(component, /iHelp/)
  assert.match(css, /@media\(max-width:540px\)/)
  assert.match(css, /@media\(max-width:355px\)/)
  assert.match(css, /my-coach-portraits\.avif/)
  assert.doesNotMatch(component, /<video[^>]+autoplay|<audio[^>]+autoplay/i)
})
