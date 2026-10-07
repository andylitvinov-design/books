import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('distance homeopathy guide is linked from the Library in all public locales', async () => {
  const library = await readFile('components/library-hub.tsx', 'utf8')
  assert.match(library, /library-distance-homeopathy/)
  assert.match(library, /\/library\/distance-homeopathy/)
  assert.match(library, /Дистанционная гомеопатия/)
  assert.match(library, /Distance homeopathy/)
  assert.match(library, /Homeopatía a distancia/)
  assert.match(library, /distance-homeopathy\.webp/)
})

test('distance homeopathy guide preserves the author workflow with explicit evidence and medical-safety boundaries', async () => {
  const guide = await readFile('components/distance-homeopathy-guide.tsx', 'utf8')
  assert.match(guide, /Дистанционная гомеопатия/)
  assert.match(guide, /5 гранул 3 раза в день/)
  assert.match(guide, /30–50%/)
  assert.match(guide, /10–20 минут/)
  assert.match(guide, /кристалл/)
  assert.match(guide, /не подтверждены надёжными клиническими данными/)
  assert.match(guide, /не заменяет диагностику/)
  assert.match(guide, /not supported by reliable clinical evidence/)
  assert.match(guide, /no sustituye diagnóstico/)
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
