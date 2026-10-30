import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8')
test('recap and next-step takeaways expose one stable marker each without depending on CSS Modules class names', async () => {
  const player = await read('components/app/opora-experience-player.jsx')
  const sections = [
    player.slice(player.indexOf("{moment==='recap'&&"), player.indexOf("{moment==='recapPractice'&&")),
    player.slice(player.indexOf("{moment==='recapNext'&&"), player.indexOf("{moment==='closingMeditation'&&")),
  ]
  for (const section of sections) {
    assert.ok(section.length > 0)
    assert.equal((section.match(/data-opora-recap-takeaway="true"/g) || []).length, 1)
    assert.match(section, /className=\{styles\.summaryItem\} data-opora-recap-takeaway="true"/)
  }
  assert.equal((player.match(/data-opora-recap-takeaway="true"/g) || []).length, 2)
})
test('hosted recap check keeps exact count, visibility, screen scope, layout and no-save guards', async () => {
  const runner = await read('scripts/verify-opora-as56-browser.mjs')
  assert.ok(runner.includes(`recapPage.locator('[data-opora-current-screen] [data-opora-recap-takeaway="true"]')`))
  assert.match(runner, /assert\.equal\(await takeaway\.count\(\),1,/)
  assert.match(runner, /await expect\(takeaway\)\.toBeVisible\(\)/)
  assert.doesNotMatch(runner, /\.summaryItem/)
  for (const guard of [
    'size.panelScroll <= size.panelClient + 2',
    'size.mainScroll <= size.mainClient + 2',
    'size.screenWidth <= width + 1',
    "assert.equal(recapSaves,0,'Viewing recap cannot write a private practice')",
  ]) assert.ok(runner.includes(guard), guard)
})

