import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {resolve,dirname} from 'node:path'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const read=path=>readFileSync(resolve(root,path),'utf8')

test('CRM owner video handoff is separate from FFmpeg and private video jobs',()=>{
 const handler=read('lib/practitioners/owner-telegram-video-crm-fallback.mjs')
 const route=read('app/api/app/crm/messenger/webhook/[provider]/route.js')
 assert.match(route,/verifyMessengerWebhook\(provider,raw,request\.headers\)/)
 assert.match(route,/receiveOwnerTelegramVideoCrmFallback\(config,body\)/)
 assert.doesNotMatch(route,/from ['"]@\/lib\/practitioners\/owner-telegram-video-service['"]/)
 assert.match(handler,/parseOwnerVideoUpdate\(update,\{now,botUsername:username\}\)/)
 assert.match(handler,/resolvedOwnerTelegramEnv\(config,env\)/)
 assert.match(handler,/event\.chatId!==chat\|\|event\.userId!==chat/)
 assert.match(handler,/event\.action==='media'\|\|event\.action==='reject'/)
 assert.match(handler,/https:\/\/t\.me\/Andydotbot\?start=audio/)
 assert.doesNotMatch(handler,/(?:from|import\()[^\n]*(?:ffmpeg-static|owner-telegram-video-service|video-render)/)
})

test('only the signed Dot webhook may trace the FFmpeg executable',()=>{
 const next=read('next.config.ts')
 const owner=read('lib/practitioners/owner-telegram-video-service.js')
 const dot=read('app/api/app/notification-channels/telegram/webhook/route.js')
 const trace=read('scripts/ensure-owner-video-renderer.mjs')
 assert.match(owner,/return receiveOwnerTelegramVideoCrmFallback\(config,update,\{env,fetcher,now\}\)/)
 assert.match(dot,/verifyClientTelegramSecret\(request\.headers\.get\('x-telegram-bot-api-secret-token'\)\)/)
 assert.match(dot,/receiveOwnerTelegramVideoWebhook\(config,update,\{channel:'practice'\}\)/)
 assert.match(next,/outputFileTracingExcludes:[\s\S]*"\/api\/app\/crm\/messenger\/webhook\/\*": \[\s*"\.\/node_modules\/ffmpeg-static\/ffmpeg"/)
 assert.doesNotMatch(next,/outputFileTracingIncludes:[\s\S]*"\/api\/app\/crm\/messenger\/webhook\/\*":/)
 assert.match(next,/"\/api\/app\/notification-channels\/telegram\/webhook": \["\.\/node_modules\/ffmpeg-static\/ffmpeg"\]/)
 assert.match(trace,/HH_OWNER_VIDEO_CRM_FFMPEG_NOT_TRACED/)
})
