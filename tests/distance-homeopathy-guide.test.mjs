import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('distance homeopathy guide is linked from the Library in all public locales', async () => {
  const library = await readFile('components/library-hub.tsx', 'utf8')
  assert.match(library, /library-distance-homeopathy/)
  assert.equal((library.match(/id: "library-distance-homeopathy"/g) || []).length, 1)
  assert.match(library, /\/library\/distance-homeopathy/)
  assert.match(library, /Дистанционная гомеопатия/)
  assert.match(library, /Distance homeopathy/)
  assert.match(library, /Homeopatía a distancia/)
  assert.match(library, /distance-homeopathy\.webp/)
})

test('distance homeopathy guide preserves the author workflow with explicit evidence and medical-safety boundaries', async () => {
  const guide = await readFile('components/distance-homeopathy-guide.tsx', 'utf8')
  const original = await readFile('data/distance-homeopathy-content.js', 'utf8')
  assert.match(guide, /distanceHomeopathyCopy/)
  assert.match(original, /Дистанционная гомеопатия/)
  assert.match(original, /5 гранул 3 раза в день/)
  assert.match(original, /3–4 раза в день/)
  assert.match(original, /непосредственно просмотр фотографии/)
  assert.match(original, /30–50%/)
  assert.match(original, /10–20 минут/)
  assert.match(original, /кристалл/)
  assert.match(original, /не подтверждены надёжными клиническими данными/)
  assert.match(original, /не заменяет диагностику/)
  assert.match(original, /not supported by reliable clinical evidence/)
  assert.match(original, /no sustituye diagnóstico/)
  assert.match(guide, /PublicConsultationCta/)
})

test('distance homeopathy guide has RU EN ES routes, sitemap entries, language counterparts and the supplied visual asset', async () => {
  for (const path of [
    'app/[locale]/library/distance-homeopathy/page.tsx',
    'app/es/library/distance-homeopathy/page.tsx',
    'public/images/holistic-house/distance-homeopathy.webp',
  ]) assert.equal(existsSync(path), true, path)

  const [sitemap, locales] = await Promise.all([
    readFile('app/sitemap.ts', 'utf8'),
    readFile('lib/public-locales.ts', 'utf8'),
  ])
  for (const locale of ['ru', 'en', 'es']) assert.match(sitemap, new RegExp('/' + locale + '/library/distance-homeopathy'))
  assert.match(locales, /library\(\?:\\\/distance-homeopathy\)\?/)
})

test('distance homeopathy guide is one readable editorial column at every breakpoint', async () => {
  const [guide, css] = await Promise.all([
    readFile('components/distance-homeopathy-guide.tsx', 'utf8'),
    readFile('components/distance-homeopathy-guide.module.css', 'utf8'),
  ])
  assert.match(guide, /<article className=\{styles\.article\}>/)
  assert.match(guide, /<figure className=\{styles\.heroImage\}>/)
  assert.match(guide, /text\.photoSteps\.map/)
  assert.match(guide, /text\.selfItems\.map/)
  assert.match(guide, /text\.sessionItems\.map/)
  assert.doesNotMatch(guide, /styles\.(?:optionGrid|advancedGrid|sessionGrid)/)
  assert.doesNotMatch(css, /grid-template-columns/)
  assert.match(css, /\.article\s*\{[^}]*width:\s*min\(100%,\s*790px\)/)
})
