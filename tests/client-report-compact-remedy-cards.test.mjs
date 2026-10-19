import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('report recommendations show a compact image-free card without changing authored fields', async () => {
  const source = await readFile('components/prescription-document.jsx', 'utf8')
  const start = source.indexOf('return <section className="canonical-remedy" key={number}>')
  const end = source.indexOf('</section>\n        })}', start)
  assert.ok(start > 0 && end > start, 'the real prescription card must be present')
  const card = source.slice(start, end)

  assert.doesNotMatch(card, /<img|canonical-remedy-card-photo|primary_image/)
  assert.match(card, /item\.displayName/)
  assert.match(card, /remedySchedule\(item, locale, document\.recommendationType\)/)
  assert.match(card, /canonical-remedy-schedule/)
  assert.match(card, /href=\{item\.remedyPath\}/)
  assert.match(card, /Описание препарата/)
  assert.match(card, /Remedy description/)
  assert.match(card, /canonical-remedy-fields/)
  assert.match(card, /item\[key\]/)
  assert.match(card, /aria-label=\{locale === 'ru'/)

  // Images remain available in the separate, full general-library appendix.
  assert.match(source, /canonical-remedy-profile-photo/)
  assert.match(source, /selectedProfiles\.map/)
})

test('compact cards keep responsive width, readable instructions, a text link and print behavior', async () => {
  const css = await readFile('components/consultation-report.css', 'utf8')
  const anchor = css.indexOf('Compact image-free recommendation cards — owner approved')
  assert.ok(anchor > 0, 'report card styles must be present')
  const compact = css.slice(anchor)
  assert.match(compact, /max-width:\s*680px/)
  assert.match(compact, /\.canonical-remedy-group\s*\{/)
  assert.match(compact, /\.canonical-remedy-title h3\s*\{/)
  assert.match(compact, /\.canonical-remedy-schedule\s*\{/)
  assert.match(compact, /\.canonical-remedy\s*>\s*a\.canonical-remedy-profile-action\s*\{/)
  assert.match(compact, /text-decoration:\s*underline/)
  assert.match(compact, /\.canonical-remedy-fields\s*>\s*div/)
  assert.match(compact, /@media screen and \(max-width:\s*700px\)/)
  assert.match(compact, /@media print/)
  assert.doesNotMatch(compact, /\.canonical-remedy-card-photo/)
})
