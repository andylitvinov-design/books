import test from 'node:test'
import assert from 'node:assert/strict'
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
  {path:'/api/internal/revenue-ideas-telegram',schedule:'0 13,14 * * *'},
  {path:'/api/internal/practice-telegram-digest',schedule:'0 13,14,19,20 * * *'},
  {path:'/api/internal/council-archive-telegram',schedule:'0 16,17 * * *'},
 ])
 assert.equal(vercel.crons.some(cron=>cron.path==='/api/internal/notification-dispatch'),false)
})
