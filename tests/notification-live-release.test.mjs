import test from 'node:test'
import assert from 'node:assert/strict'
import {timingSafeEqual} from 'node:crypto'
import {sourceFunction} from './helpers/source-contract-runtime.mjs'
import {readFileSync} from 'node:fs'
test('native logout ends per-account live activity before auth cookie expires',()=>{
 const code=readFileSync('components/app/app-workspace.jsx','utf8')
 const anchor=code.slice(code.indexOf('async function logout('),code.indexOf('async function completePlan('))
 assert.ok(anchor.indexOf("notifications/live-stop")>=0)
 assert.ok(anchor.indexOf("notifications/live-stop")<anchor.indexOf("auth/logout"))
})
test('hourly dispatch must keep secrets server-side and not use Hobby hourly Vercel cron',()=>{
 const route=readFileSync('app/api/internal/notification-dispatch/route.js','utf8')
 const vercel=JSON.parse(readFileSync('vercel.json','utf8'))
 assert.match(route,/HH_PUSH_CRON_SECRET/)
 // Daily housekeeping and the two deliberately added owner Telegram jobs are
 // separate from hourly push dispatch. Do not impose an obsolete global count.
 assert.deepEqual(vercel.crons.filter(job=>job.path==='/api/internal/housekeeping'),[
   {path:'/api/internal/housekeeping',schedule:'0 5 * * *'},
 ])
 assert.equal(new Set(vercel.crons.map(job=>job.path)).size,vercel.crons.length)
 for(const job of vercel.crons) {
   assert.notEqual(job.path,'/api/internal/notification-dispatch')
   const fields=job.schedule.trim().split(/\s+/)
   assert.equal(fields.length,5)
   assert.match(fields[0],/^(?:[0-9]|[1-5][0-9])$/,'one daily minute, not a wildcard/range')
   assert.match(fields[1],/^(?:[0-9]|1[0-9]|2[0-3])$/,'one daily hour, not hourly dispatch')
   assert.deepEqual(fields.slice(2),['*','*','*'])
 }
 const authorized=sourceFunction('app/api/internal/notification-dispatch/route.js','authorized',{Buffer,timingSafeEqual})
 const secret='synthetic-'.repeat(5)
 const request=value=>({headers:new Headers(value?{authorization:value}:{})})
 assert.equal(authorized(request('Bearer '+secret),{HH_PUSH_CRON_SECRET:secret}),true)
 assert.equal(authorized(request('Bearer '+secret),{CRON_SECRET:secret}),true)
 for(const value of ['',secret,'Bearer wrong','Bearer '+secret+'x'])
   assert.equal(authorized(request(value),{HH_PUSH_CRON_SECRET:secret}),false)
 assert.equal(authorized(request('Bearer short'),{HH_PUSH_CRON_SECRET:'short'}),false)
 assert.equal(authorized(request('Bearer undefined'),{}),false)
})
