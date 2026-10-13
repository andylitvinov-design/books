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
 assert.equal(vercel.crons.length,1)
 assert.equal(vercel.crons[0].schedule,'0 5 * * *')
})
