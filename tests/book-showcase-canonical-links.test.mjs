import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {books} from '../data/library.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('remedy book cards retain explicit EN/RU canonical readers without redirect prefetch',()=>{
 const source=read('components/book-showcase.tsx')
 assert.ok(source.includes('href={`/${locale}/books/${book.id}`} prefetch={false}'))
 assert.doesNotMatch(source,/href=\{`\/books\//)
 assert.ok(source.includes('localizedBookText(book, locale)'))
 for(const locale of ['en','ru'])for(const book of books){
  const href=`/${locale}/books/${book.id}`
  assert.equal(new URL(href,'https://holistichouse.vercel.app').origin,'https://holistichouse.vercel.app')
  assert.ok(href.startsWith('/'+locale+'/books/'))
 }
})
test('Maya language and source-text acceptance exercises both actual localized routes',()=>{
 for(const f of ['scripts/verify-release-reaudit.mjs','scripts/verify-maya-reader-release.mjs']){
  const source=read(f),name=f.includes('reaudit')?'book':'slug'
  assert.ok(source.includes('[[`/en/books/${'+name+'}`, \'en\'], [`/ru/books/${'+name+'}`, \'ru\']]'))
  assert.ok(source.includes('Reader document language')||source.includes('Wrong reader language'))
 }
})

test('homeopathy source-title checks use the original Russian reader explicitly',()=>{
 const source=read('scripts/verify-homeopathy-routes.mjs')
 assert.ok(source.includes('request(`/ru/books/${book.id}`)'))
 assert.ok(source.includes('body.includes(book.title)'))
 assert.ok(!source.includes('request(`/books/'))
})
