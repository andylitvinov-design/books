import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('My Coach separates AI and real-person views without replacing persona routing', () => {
  const catalog = read('components/my-coach-catalog.jsx')
  const css = read('components/my-coach-catalog.module.css')
  assert.match(catalog, /data-my-coach-kind-switch/)
  assert.match(catalog, /aria-pressed=\{directoryMode === 'ai'\}/)
  assert.match(catalog, /aria-pressed=\{directoryMode === 'human'\}/)
  assert.match(catalog, /hidden=\{directoryMode !== 'ai'\}/)
  assert.match(catalog, /hidden=\{directoryMode !== 'human'\}/)
  assert.match(catalog, /data-my-coach-human-card="andrey-litvinov"/)
  assert.match(catalog, /data-my-coach-card=\{persona.id\}/)
  assert.match(catalog, /coachSessionHref\(lang, persona.id, normalizeCoachSettings\(persona.id\)\)/)
  assert.match(css, /\.coachKindActive/)
  assert.match(css, /\.humanPortrait img\{[^}]*object-fit:cover/)
})

test('Human therapy uses approved existing photo and first-party enquiry route across locales', () => {
  const catalog = read('components/my-coach-catalog.jsx')
  const page = read('app/[locale]/my-coach/page.jsx')
  const target = read('app/[locale]/services/imagery-therapy/page.tsx')
  assert.match(catalog, /src="\/images\/holistic-house\/andy-about.png"/)
  assert.match(catalog, /href=\{'\/' \+ lang \+ '\/services\/imagery-therapy'\}/)
  assert.match(target, /service = "imagery-therapy"/)
  assert.match(catalog, /aria-expanded=\{humanExpanded\}/)
  for (const locale of ['en', 'ru', 'es']) {
    assert.match(catalog, new RegExp('\\b' + locale + ': \\{'))
    assert.ok(page.includes('/' + locale + '/my-coach'))
  }
  assert.match(catalog, /confirmed separately|подтверждаются отдельно|confirman después/)
  assert.doesNotMatch(catalog, /Guaranteed booking/)
})
