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
  const hours=new Set()
  for(const term of fields[1].split(',')){
   const match=/^(\*|\d{1,2}(?:-\d{1,2})?)(?:\/(\d{1,2}))?$/.exec(term)
   assert.ok(match,'invalid cron hour expression')
   const step=match[2]===undefined?1:Number(match[2])
   assert.ok(step>=1&&step<=23,'invalid cron hour step')
   const range=match[1]==='*'?[0,23]:match[1].split('-').map(Number)
   const start=range[0],end=range.length===2?range[1]:match[2]===undefined?start:23
   assert.ok(start>=0&&start<=end&&end<=23,'invalid cron hour range')
   for(let hour=start;hour<=end;hour+=step)hours.add(hour)
  }
  if(cron.path==='/api/internal/direct-message-push'){
   // Reviewed Vercel Pro exception: bounded, private five-minute recovery only.
   // All other jobs retain the existing no-hourly policy.
   assert.equal(cron.schedule,'*/5 * * * *','reviewed phone-push cadence is exact')
   const pushRoute=readFileSync('app/api/internal/direct-message-push/route.js','utf8')
   assert.ok(pushRoute.includes('cronAuthorized(request,process.env)'), 'private recovery must require the current Cron authorization')
   assert.match(pushRoute,/VERCEL_ENV==='preview'/)
   assert.match(pushRoute,/status:401/)
   assert.match(pushRoute,/PRIVATE_HEADERS/)
  }else if(cron.path==='/api/internal/video-scout-hourly'){
   // Explicitly reviewed existing Vercel Pro metadata-only scout; not a
   // blanket allowance for new hourly cron jobs or paid video downloads.
   assert.equal(cron.schedule,'17 * * * *','approved hourly scout slot must be exact')
   const scoutRoute=readFileSync('app/api/internal/video-scout-hourly/route.js','utf8')
   assert.match(scoutRoute,/process\.env\.VERCEL_ENV!=='production'/)
   assert.match(scoutRoute,/cronAuthorized\(request,process\.env\)/)
   assert.match(scoutRoute,/status:401/)
   assert.match(scoutRoute,/maxDuration=90/)
   const scoutRunner=readFileSync('lib/automations/scout-runner.js','utf8')
   assert.match(scoutRunner,/HH_VIDEO_SCOUT_ENABLED/)
   assert.match(scoutRunner,/runHourlyVideoScout/)
  }else assert.ok(hours.size<24,'hourly Vercel Cron is not allowed')
 }
})
