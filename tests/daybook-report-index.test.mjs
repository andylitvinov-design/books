import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('Daybook report index checks authenticated account and exact saved publication without writes',()=>{
 const route=read('app/api/app/daybook-reports/route.js'),index=read('lib/app/daybook-report-index.js'),service=read('lib/clients/session-delivery-service.js')
 assert.match(route,/await auth\.verified\(\)/)
 assert.match(route,/request\.headers\.get\('x-hh-account-id'\)!==actor\.id/)
 assert.match(route,/headers:PRIVATE_HEADERS/)
 assert.doesNotMatch(route,/export async function POST/)
 assert.match(index,/transaction\(config,actor,/)
 assert.match(index,/where account_id=\$1 and removed_at is null/)
 assert.match(index,/expectedSource:\{revision:row\.source_revision,hash:row\.source_hash\}/)
 assert.doesNotMatch(index,/update app\.saved_sessions|insert into|markOpened/)
 assert.match(service,/row\.published_revision!==expectedSource\.revision/)
 assert.match(service,/digest\('hex'\)!==expectedSource\.hash/)
})
test('Clarity and Business render report links filtered by selected week',()=>{
 const ui=read('components/app/daybook-week-reports.jsx')
 assert.match(ui,/\{accountId,signal:controller\.signal\}/)
 assert.match(ui,/result\?\.key!==key/)
 assert.match(ui,/row\.week===week/)
 assert.match(read('components/app/clarity-program.jsx'),/<DaybookWeekReports[^>]*program="clarity"/)
 assert.match(read('components/app/business-daybook.jsx'),/<DaybookWeekReports[^>]*program="business"/)
})
