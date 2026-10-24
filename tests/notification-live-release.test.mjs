import test from 'node:test'
import assert from 'node:assert/strict'
import {timingSafeEqual} from 'node:crypto'
import {sourceFunction} from './helpers/release-contract-source.mjs'
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
 assert.deepEqual(vercel.crons,[
   {path:'/api/internal/housekeeping',schedule:'0 5 * * *'},
   {path:'/api/internal/practice-telegram-digest',schedule:'0 13 * * *'},
   {path:'/api/internal/council-archive-telegram',schedule:'0 21 * * *'},
 ])
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

test('dispatch route fails closed before work and never returns credentials on any response',async()=>{
 const path='app/api/internal/notification-dispatch/route.js'
 const {PRIVATE_HEADERS}=await import('../lib/app/http.js')
 const secret='synthetic-secret-'.repeat(4)
 const authorized=sourceFunction(path,'authorized',{Buffer,timingSafeEqual})
 for(const mode of ['unauthorized','success','failure']){
   const calls=[]
   const GET=sourceFunction(path,'GET',{
     authorized,process:{env:{HH_PUSH_CRON_SECRET:secret}},PRIVATE_HEADERS,
     NextResponse:{json:(body,options)=>({body,...options})},
     getAppConfig:()=>{calls.push('config');return {}},
     dispatchCourseReminders:async()=>{
       calls.push('dispatch')
       if(mode==='failure')throw new Error('private-detail:'+secret)
       return {sent:0}
     },
     closeDatabase:async()=>{calls.push('close')},
   })
   const response=await GET({headers:new Headers({authorization:mode==='unauthorized'?'Bearer wrong':'Bearer '+secret})})
   assert.equal(response.status??200,mode==='unauthorized'?401:mode==='failure'?503:200)
   assert.equal(response.headers,PRIVATE_HEADERS)
   assert.match(response.headers['Cache-Control'],/private, no-store/)
   assert.equal(response.headers['Referrer-Policy'],'no-referrer')
   assert.doesNotMatch(JSON.stringify(response),new RegExp(secret+'|private-detail'))
   if(mode==='unauthorized')assert.deepEqual(calls,[])
   else assert.deepEqual(calls,['config','dispatch','close'])
 }
})
