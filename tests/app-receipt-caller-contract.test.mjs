import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
function check(value) {
  assert.doesNotMatch(value,/openContactChannelChooser\(/)
  assert.match(value,/assertRegisteredEnquiryReceipt\(pricing,expect,servicePage,\{\s*locale,sourcePath:'\/'\+locale\+'\/services\/'\+slug,/)
  assert.match(value,/serviceTitle:locale==='ru'\?'Алхимия души \/ Психогомеопатия':'Alchemy of the Soul \/ Psycho-homeopathy'/)
  assert.match(value,/selectedFormat:locale==='ru'\?'Экспресс · 30 минут · €50':'Express review · 30 min · €50'/)
  assert.match(value,/data-alchemy-format="30".*toContainText\('€50'\)/)
  assert.match(value,/assertCompactLeadRequest\(servicePage,capture,expect,\{\s*locale,serviceTitle:await main.locator\('h1'\).innerText\(\),/)
  assert.match(value,/assertRegisteredEnquiryReceipt\(ready,expect,publicPage,\{[\s\S]*privateMarkers:\[uniqueProblem,uniqueGoal\]/)
  assert.ok(value.indexOf('window.__syntheticClipboardRecovery')<value.indexOf('assertRegisteredEnquiryReceipt(ready,'),'Clipboard recovery is tested before intentional receipt navigation')
  assert.ok(value.indexOf('Temporary analytics hold must emit no acquisition events')<value.indexOf('assertRegisteredEnquiryReceipt(ready,'))
  assert.match(value,/name:copy.copyButton,exact:true/)
  assert.doesNotMatch(value,/stayAfterSave|router\.push|force:true|force: true/)
}
test('app public callers preserve compact versus receipt flow, prices, clipboard privacy and analytics',()=>check(source))
for(const [label,from,to] of [
  ['legacy chooser','assertRegisteredEnquiryReceipt(pricing,expect,servicePage,','openContactChannelChooser(pricing,expect,servicePage,'],
  ['lost marker checks','privateMarkers:[uniqueProblem,uniqueGoal]','privateMarkers:[]'],
  ['wrong selected price',"toContainText('€50')","toContainText('€100')"],
  ['lost downstream format',"selectedFormat:locale==='ru'?","discardedFormat:locale==='ru'?"],
  ['wrong capture flow','assertCompactLeadRequest(servicePage,capture,expect,','assertRegisteredEnquiryReceipt(capture,expect,servicePage,'],
]) test('app caller contract rejects '+label,()=>{assert.ok(source.includes(from));assert.throws(()=>check(source.replace(from,to)))})
