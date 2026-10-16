import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
test('public compatibility aliases keep queries and explicit locales', async () => {
  const text=readFileSync('next.config.ts','utf8').replace(/import type[^\n]+\n/,'').replace(': NextConfig','')
  const {default: config}=await import(`data:text/javascript,${encodeURIComponent(text)}`)
  assert.equal(typeof config.redirects,'function')
  const rules=await config.redirects()
  for(const [source,destination] of [['/book','/books'],['/book/:bookId','/books/:bookId'],['/homeopathy','/ru/homeopathy'],['/homeopathy/remedies/:path*','/ru/homeopathy/remedies/:path*']]) {
    assert.ok(rules.some(r=>r.source===source && r.destination===destination && r.permanent===true),source)
  }
  // Locale-qualified aliases are allowed only for three vetted legacy deep links.
  // All other internationalized routes stay explicit, with no blanket redirects.
  const localizedAliases = rules.filter(r => /^\\/(en|ru)\\//.test(r.source))
    .map(({ source, destination, permanent }) => ({ source, destination, permanent }))
    .sort((a, b) => a.source.localeCompare(b.source))
  const approved = ['en', 'ru'].flatMap(locale => [
    { source: `/${locale}/tests`, destination: `/${locale}/client/tests`, permanent: true },
    { source: `/${locale}/cabinet`, destination: `/${locale}/client`, permanent: true },
    { source: `/${locale}/review`, destination: `/${locale}/services/free-situation-review`, permanent: true },
  ]).sort((a, b) => a.source.localeCompare(b.source))
  assert.deepEqual(localizedAliases, approved)
})
