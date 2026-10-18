import assert from 'node:assert/strict'
import test from 'node:test'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
test('public compatibility aliases keep queries and explicit locales', async () => {
  const text=ts.transpileModule(readFileSync('next.config.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
  const {default: config}=await import(`data:text/javascript,${encodeURIComponent(text)}`)
  assert.equal(typeof config.redirects,'function')
  const rules=await config.redirects()
  for(const [source,destination] of [['/book','/books'],['/book/:bookId','/books/:bookId'],['/homeopathy','/ru/homeopathy'],['/homeopathy/remedies/:path*','/ru/homeopathy/remedies/:path*']]) {
    assert.ok(rules.some(r=>r.source===source && r.destination===destination && r.permanent===true),source)
  }
  assert.ok(rules.every(r=>!r.source.startsWith('/en/') && !r.source.startsWith('/ru/')))
})
