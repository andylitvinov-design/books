import test from 'node:test'
import assert from 'node:assert/strict'
import {DISCOVERY_THEMES,freeDiscoveryEntries,themeMatches,themeProgress,themeResults,discoveryTag,discoverySourceQuery,discoveryNavigation,discoveryTheme,discoveryView} from '../lib/app/self-discovery-themes.mjs'
import {buildExplorerEntries} from '../lib/assessments/test-explorer.js'
test('canonical eligible free catalog is covered by themes in all display languages',()=>{
 for(const locale of ['en','ru','es']){
  const entries=buildExplorerEntries({locale,audience:'account'}),free=freeDiscoveryEntries(entries)
  assert.ok(free.length>50)
  assert.ok(free.every(e=>e.selectable&&e.free&&e.definition&&e.rightsStatus==='cleared'))
  for(const e of free)assert.ok(DISCOVERY_THEMES.some(t=>t.id!=='all'&&themeMatches(e,t.id)),e.key)
  assert.ok(free.some(e=>e.key==='hh-love-affection'&&themeMatches(e,'love')))
  assert.ok(free.some(e=>e.key==='cfpb-financial-wellbeing-5'&&themeMatches(e,'money')))
  assert.ok(DISCOVERY_THEMES.every(t=>t.label[locale]&&t.title[locale]))
 }
})
test('progress counts unique verified keys, not attempts or unavailable tests',()=>{
 const rows=[{key:'a',topics:['love'],selectable:true,free:true},{key:'b',topics:['money'],selectable:true,free:true},{key:'c',topics:['love'],selectable:false,free:true}]
 const eligible=freeDiscoveryEntries(rows)
 assert.deepEqual(themeProgress(eligible,[{definitionKey:'a'},{definitionKey:'a'},{definitionKey:'c'}],'love'),{total:1,done:1})
 const unknown={definitionKey:'retired'},old={definitionKey:'a'}
 assert.deepEqual(themeResults([old,unknown],rows,'other'),[unknown])
 assert.deepEqual(themeResults([old,unknown],rows,'all'),[old,unknown])
 assert.equal(discoveryTag('love'),'self-discovery:love')
})

test('the fixed discovery return preserves theme, language and existing plan navigation without arbitrary URL input',()=>{
 for(const locale of ['en','ru','es'])for(const theme of DISCOVERY_THEMES){
  const q=new URLSearchParams(discoverySourceQuery(theme.id,locale))
  q.set('plan','opaque-existing-plan');q.set('returnTo','https://outside.example')
  const n=discoveryNavigation(q,locale==='es'?'en':locale)
  assert.equal(n.href,'/'+locale+'/app/daybook/self-discovery?theme='+theme.id+'&view=results')
  assert.equal(n.source,discoverySourceQuery(theme.id,locale))
 }
 assert.equal(discoveryNavigation(new URLSearchParams('from=other'),'en'),null)
 assert.equal(discoveryNavigation(new URLSearchParams('from=self-discovery&from=other'),'en'),null)
 const forged=discoveryNavigation(new URLSearchParams('from=self-discovery&discoveryTheme=https://outside.example&discoveryLocale=ru'),'en')
 assert.equal(forged.href,'/en/app/daybook/self-discovery?theme=love&view=results')
 assert.equal(discoveryTheme(['love']), 'love');assert.equal(discoveryView('https://outside.example'),null)
})
