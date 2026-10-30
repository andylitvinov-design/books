import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
test('native logout ends per-account live activity before auth cookie expires',()=>{
 const code=readFileSync('components/app/app-workspace.jsx','utf8')
 const anchor=code.slice(code.indexOf('async function logout('),code.indexOf('async function completePlan('))
 assert.ok(anchor.indexOf("notifications/live-stop")>=0)
 assert.ok(anchor.indexOf("notifications/live-stop")<anchor.indexOf("auth/logout"))
})
test('private push dispatch remains manual, cron paths are unique and housekeeping stays daily',()=>{
 const route=readFileSync('app/api/internal/notification-dispatch/route.js','utf8')
 const vercel=JSON.parse(readFileSync('vercel.json','utf8'))
 assert.match(route,/HH_PUSH_CRON_SECRET/)
 assert.match(route,/timingSafeEqual/)
 assert.match(route,/status:401/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.ok(Array.isArray(vercel.crons),'Vercel scheduled housekeeping must be declared')
 const paths=vercel.crons.map(cron=>cron.path)
 assert.equal(new Set(paths).size,paths.length,'duplicate cron paths can cause duplicate work')
 assert.deepEqual(vercel.crons.filter(cron=>cron.path==='/api/internal/housekeeping'),
  [{path:'/api/internal/housekeeping',schedule:'0 5 * * *'}])
 assert.ok(!paths.includes('/api/internal/notification-dispatch'),
  'private push dispatch must not be scheduled on Hobby')
 for(const cron of vercel.crons){
  assert.match(cron.path,/^\/api\/internal\/[a-z0-9-]+$/)
  const fields=cron.schedule.trim().split(/\s+/)
  assert.equal(fields.length,5,'invalid cron expression')
  assert.notEqual(fields[1],'*','hourly Vercel Cron is not allowed')
 }
})
