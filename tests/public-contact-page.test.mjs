import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {whatsappEnquiryUrl,telegramEnquiryUrlFromWhatsApp} from '../lib/whatsapp-enquiry.js'

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('all locale contact pages provide public safe access and do not collect sensitive data',()=>{
 const p=source('app/[locale]/contact/page.tsx')
 for(const lang of ['en','ru','es'])assert.match(p,new RegExp('\\b'+lang+':\\s*\\{'))
 assert.match(p,/validContactLocale\(locale\)/)
 assert.match(p,/publicLocales\.map\(locale=>\(\{locale\}\)\)/)
 assert.match(p,/notFound\(\)/)
 assert.match(p,/PublicSiteHeader/)
 assert.match(p,/whatsappEnquiryUrl/)
 assert.match(p,/telegramEnquiryUrlFromWhatsApp/)
 assert.match(p,/explore\/business/)
 assert.match(p,/app\/settings#hh-client-contact-phone/)
 assert.doesNotMatch(p,/localStorage|mailto:|function sendSms|fetch\('/)
 const locales=source('lib/public-locales.ts')
 assert.match(locales,/about\|contact\|toronto/)
 assert.match(locales,/pathname\.replace\(/)
})
test('public WhatsApp/Telegram contact links are client-initiated and never include private routes',()=>{
 const url=whatsappEnquiryUrl({locale:'ru',service:'Holistic House',request:'General contact enquiry',pagePath:'/ru/contact'})
 assert.match(url,/^https:\/\/wa\.me\//)
 assert.match(new URL(url).searchParams.get('text')||'',/Holistic House/)
 assert.match(new URL(url).searchParams.get('text')||'',/\/ru\/contact/)
 assert.match(telegramEnquiryUrlFromWhatsApp(url),/^https:\/\/t\.me\//)
 const unsafe=whatsappEnquiryUrl({locale:'en',service:'Holistic House',request:'General contact enquiry',pagePath:'/en/app/consultations?secret=abc'})
 assert.doesNotMatch(new URL(unsafe).searchParams.get('text')||'',/secret=abc/)
})
