import test from 'node:test'
import './telegram-entry-url.test.mjs'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const component=read('components/app/messenger-sign-in.jsx')
const entry=read('lib/app/telegram-entry-url.mjs')
const hub=read('components/app/messages-hub.jsx')
const inbox=read('components/app/direct-message-inbox.jsx')

test('new owner guest starts messaging through the real verified Telegram bot, not Google-only chat',()=>{
 assert.match(component,/continueTo==='direct-messages'/)
 assert.match(component,/recipientSlug==='andy-litvinov'/)
 assert.match(component,/fetch\('\/api\/public\/telegram-diagnostic'/)
 assert.match(entry,/payload\.directAvailable===true/)
 assert.match(entry,/url.origin!=='https:\/\/t.me'/)
 assert.match(entry,/\(direct\?'hhtalk_':'hhreview_'\)\+locale/)
 assert.match(component,/data-hh-messenger-telegram-first/)
 assert.match(component,/telegramLink/)
 assert.match(component,/telegramRoute==='review'\?c.telegramReview:c.telegram/)
 assert.match(component,/resolveTelegramFirstEntry\(data,locale\)/)
 assert.match(component,/data-telegram-route=\{telegramRoute\}/)
 assert.match(component,/setTelegramChecked\(true\)/)
 assert.doesNotMatch(component,/href=['"]https:\/\/t\.me|setIsVerified\(true\)/)
})

test('existing secure Google/PKCE Cabinet login remains optional and video-studio behavior remains',()=>{
 assert.match(component,/data-hh-messenger-google-login/)
 assert.match(component,/messengerFirst\?c.cabinet:label\|\|c.button/)
 assert.match(component,/if\(!\['direct-messages','video-studio'\].includes\(continueTo\)\)/)
 assert.match(component,/directMessengerRecipient\(recipientSlug\|\|null\)/)
 assert.match(component,/AbortController/)
 assert.match(hub,/MessengerSignIn locale=\{locale\}/)
 assert.match(inbox,/<MessengerSignIn locale=\{locale\}/)
 for(const label of ['en','ru','es'])assert.match(component,new RegExp('\\b'+label+':\\{'))
})

test('other masters never inherit the owner Telegram deep link and no WhatsApp verification is fabricated',()=>{
 assert.match(component,/!recipientSlug\|\|recipientSlug==='andy-litvinov'/)
 assert.match(component,/<small role="status">\{c.differentMaster\}<\/small>/)
 assert.doesNotMatch(component,/wa\.me|HH_CRM_MSG_WHATSAPP|onClick=\{\(\)=>setTelegramLink/)
 assert.match(component,/rel="noopener noreferrer nofollow"/)
})
