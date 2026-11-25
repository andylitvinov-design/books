import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../lib/crm/messenger-provider.js',import.meta.url),'utf8')
const from=source.indexOf('export async function sendTelegramCompanionMessage')
const to=source.indexOf('export async function ensureTelegramCompanionNativeMenu',from)
const welcome=source.slice(from,to)
test('a confirmed rejected photo falls back to the same approved short Telegram menu text',()=>{
  assert.ok(from>0&&to>from)
  assert.match(welcome,/if\(!photo\|\|error\?\.code!=='PROVIDER_REJECTED'\)throw error/)
  assert.match(welcome,/response=await readProvider\(endpoint\+'\/sendMessage'/)
  assert.match(welcome,/chat_id:to,text,disable_web_page_preview:true/)
  assert.match(welcome,/allow_paid_broadcast:false,reply_markup:markup/)
})
test('unknown network/provider outcome is not retried, so client receives no duplicate',()=>{
  assert.match(welcome,/if\(!photo\|\|error\?\.code!=='PROVIDER_REJECTED'\)throw error/)
  assert.match(welcome,/if\(!Number\.isSafeInteger\(id\)\)throw new AppError\('PROVIDER_STATUS_UNKNOWN',503\)/)
  assert.match(welcome,/if\(photo&&\(!\['ru','en'\]/)
})
test('a normal menu send never changes to a second send on failure',()=>{
  assert.match(welcome,/response=await readProvider\(endpoint\+\(photo\?'\/sendPhoto':'\/sendMessage'\)/)
  assert.match(welcome,/if\(!photo\|\|error\?\.code!=='PROVIDER_REJECTED'\)throw error/)
})
