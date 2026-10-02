import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('the legacy Maya collection URL is restored as a public hub for the four existing readers', async () => {
  const hub = await readFile('app/books/maya-tradition/page.tsx', 'utf8')

  assert.match(hub, /canonical: "\/books\/maya-tradition"/)
  assert.match(hub, /mediaSeries === "maya"/)
  for (const id of ['maya-egregor-gods', 'maya-calendar', 'maya-exorcism', 'maya-mysteries']) assert.match(hub, new RegExp(id))
  assert.doesNotMatch(hub, /redirect\(/)
  assert.doesNotMatch(hub, /client-access|secret|selector/i)
})
