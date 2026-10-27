import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const css = read('components/alchemy-soul-landing.module.css')
const markup = read('components/alchemy-soul-landing.tsx')
const marker = '/* RU short-screen request: trim only vertical padding; retain content and targets. */'
function validate(styles, component = markup) {
  assert.match(component, /<main className=\{styles\.page\} lang=\{locale\}/, 'locale selector is authored')
  assert.match(component, /className=\{\[styles\.panel, styles\.requestSection\]\.join\(" "\)\}/, 'request retains panel floor')
  const start = styles.indexOf(marker)
  assert.ok(start >= 0, 'bounded RU padding rule exists')
  assert.equal(styles.lastIndexOf(marker), start, 'one RU padding rule')
  const rule = styles.slice(start + marker.length).trim()
  assert.match(rule, /^@media\(max-width:350px\) and \(max-height:650px\)\{\s*\.page\[lang="ru"\] \.requestSection\{padding-top:8px;padding-bottom:8px\}\s*\}$/, 'only bounded RU vertical padding changes')
  assert.match(styles.slice(0,start), /\.panel\{min-height:calc\(100svh - 98px\);padding:10px 12px 12px\}/, 'short-screen floor and original budget retained')
  assert.match(styles.slice(0,start), /\.leadForm > label > select\{min-height:44px\}/, 'select targets retained')
  return {originalPadding:10+12, newPadding:8+8, floorAt568:568-98}
}
test('RU short request retains locale, panel floor and targets; only padding budget decreases', () => {
  assert.deepEqual(validate(css), {originalPadding:22,newPadding:16,floorAt568:470})
  // Native evidence was 492px; 486 is a prediction, never a native pass.
  assert.equal(492 - (22 - 16),486)
})
for (const [name,mutate] of [
  ['broader width',s=>s.replace(/(@media\(max-width:)350px(\) and \(max-height:650px\)\{\s*\.page\[lang="ru"\])/, '$1680px$2')],
  ['broader height',s=>s.replace(/max-height:650px\)\{\s*\.page\[lang="ru"\]/,'max-height:844px){ .page[lang="ru"]')],
  ['wrong locale',s=>s.replace('.page[lang="ru"] .requestSection{padding-top:8px','.page[lang="es"] .requestSection{padding-top:8px')],
  ['insufficient budget',s=>s.replace('padding-top:8px;padding-bottom:8px','padding-top:10px;padding-bottom:12px')],
  ['hidden content',s=>s.replace('padding-bottom:8px}','padding-bottom:8px;overflow:hidden}')],
  ['smaller font',s=>s.replace('padding-bottom:8px}','padding-bottom:8px;font-size:9px}')],
  ['changed floor',s=>s.replace('min-height:calc(100svh - 98px);padding:10px 12px 12px','min-height:0;padding:10px 12px 12px')],
  ['wrong class',s=>s.replace('.page[lang="ru"] .requestSection{padding-top:8px','.page[lang="ru"] .leadForm{padding-top:8px')],
]) test('padding contract rejects '+name,()=>assert.throws(()=>validate(mutate(css)),{code:'ERR_ASSERTION'}))
test('padding selector rejects missing authored locale',()=>assert.throws(()=>validate(css,markup.replace('lang={locale}','data-locale={locale}')),{code:'ERR_ASSERTION'}))
