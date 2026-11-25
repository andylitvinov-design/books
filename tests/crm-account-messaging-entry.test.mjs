import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const root=new URL('..',import.meta.url)
const source=path=>readFileSync(new URL(path,root),'utf8')
test('Telegram reconnect must preserve the existing verified recipient until the new webhook claim',()=>{
 const sourceText=source('lib/app/messenger-notification-repository.js')
 const begin=sourceText.slice(sourceText.indexOf("if(input.action==='begin_telegram')"),sourceText.indexOf("if(input.action==='remove')"))
 assert.ok(begin.includes('notification_telegram_challenges'))
 assert.doesNotMatch(begin,/delete from app_private[.]notification_telegram_links/)
 // Scope this check to registration. The explicit Disconnect branch above
 // correctly deletes a verified link and must not trigger this assertion.
 const registration=sourceText.indexOf("if(input.action==='preferences')")
 const save=sourceText.slice(sourceText.indexOf("if(input.channel==='telegram')",registration),sourceText.indexOf("const encrypted=seal("))
 assert.match(save,/delete from app_private[.]notification_telegram_challenges/)
 assert.doesNotMatch(save,/delete from app_private[.]notification_telegram_links/)
 assert.match(sourceText,/if\(input.action==='remove'\)/)
 assert.match(sourceText,/delete from app_private[.]notification_telegram_links where account_id=\$1/)
})
test('Account messaging invitation is account-scoped, informational and never implies marketing opt-in',()=>{
 const component=source('components/app/account-messaging-entry.jsx')
 const portal=source('components/app/app-workspace.jsx')
 assert.match(component,/accountId,signal:controller\.signal/)
 assert.match(component,/notification-channels/)
 assert.match(component,/status\.connected/)
 assert.match(component,/verificationAvailable===true/)
 assert.match(component,/settings#hh-telegram-connect/)
 assert.match(component,/marketing remains separate/)
 assert.match(portal,/AccountMessagingEntry/)
})
