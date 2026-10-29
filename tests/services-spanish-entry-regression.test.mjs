import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync(new URL('../app/[locale]/services/page.tsx', import.meta.url), 'utf8')
const catalog = readFileSync(new URL('../app/[locale]/services/catalog/page.tsx', import.meta.url), 'utf8')

for (const [name, source] of [['personal services', main], ['practitioner directory', catalog]]) {
  test(name + ': all three public locales work without the EN/RU-only remedies gate', () => {
    assert.match(source, /import \{ isPublicLocale \} from ['"]@\/data\/academy\/catalog['"]/)
    assert.match(source, /if \(!isPublicLocale\(locale\)\) notFound\(\)/)
    assert.match(source, /return \[\{ locale: "en" \}, \{ locale: "ru" \}, \{ locale: "es" \}\]/)
    assert.doesNotMatch(source, /getHomeopathyLocaleParams|isSupportedLocale|as Locale/)
  })
}
test('Spanish personal services has its own SEO, consent-compatible footer and honest medical disclaimer', () => {
  assert.match(main, /es: \{[\s\S]*?title: "Servicios personales — Holistic House"/)
  assert.match(main, /footerTitle: "¿No sabes por dónde empezar\?"/)
  assert.match(main, /No se garantizan resultados/)
  assert.match(main, /locale === "es" \? "es_ES"/)
  assert.match(main, /languages: \{ ru: "\/ru\/services", en: "\/en\/services", es: "\/es\/services"/)
})
test('Spanish practitioner directory exposes a localized title, public links and the existing UI', () => {
  assert.match(catalog, /es: \{ title: "Directorio de servicios y profesionales/)
  assert.match(catalog, /const \{ title, description \} = seo\[locale\]/)
  assert.match(catalog, /"x-default": "\/en\/services\/catalog"/)
  assert.match(catalog, /<ServicesDirectoryPage locale=\{locale\} \/>/)
})
