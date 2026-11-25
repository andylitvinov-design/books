import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveTelegramFirstEntry} from '../lib/app/telegram-entry-url.mjs'

const available={
 url:'https://t.me/holistichouse_bot',
 available:true,directAvailable:false,
 urls:{
  en:'https://t.me/holistichouse_bot?start=hhreview_en',
  ru:'https://t.me/holistichouse_bot?start=hhreview_ru',
  es:'https://t.me/holistichouse_bot?start=hhreview_es',
 },
}
test('when direct chat is off, existing official Telegram free-review route is honestly shown',()=>{
 for(const lang of ['en','ru','es']){
  assert.deepEqual(resolveTelegramFirstEntry(available,lang),{
   href:available.urls[lang],kind:'review',
  })
 }
})
test('explicitly ready direct chat takes priority, but never reuses review consent as a direct link',()=>{
 for(const lang of ['en','ru','es']){
  const url='https://t.me/holistichouse_bot?start=hhtalk_'+lang
  const v=resolveTelegramFirstEntry({...available,directAvailable:true,
   directUrls:{[lang]:url}},lang)
  assert.deepEqual(v,{href:url,kind:'direct'})
 }
})
test('a broken declared direct link fails closed instead of silently falling back',()=>{
 assert.equal(resolveTelegramFirstEntry({...available,directAvailable:true},'ru'),null)
 assert.equal(resolveTelegramFirstEntry({...available,directAvailable:true,
  directUrls:{ru:available.urls.ru}},'ru'),null)
})
test('no unknown bots, credentials, extra query parameters or open redirects',()=>{
 const bad=[
  'https://fake.example/holistichouse_bot?start=hhreview_ru',
  'http://t.me/holistichouse_bot?start=hhreview_ru',
  'https://t.me.evil.example/holistichouse_bot?start=hhreview_ru',
  'https://t.me/u:pass@holistichouse_bot?start=hhreview_ru',
  'https://t.me/not_a_bot?start=hhreview_ru',
  'https://t.me/holistichouse_bot?start=hhreview_ru&secret=x',
  'https://t.me/holistichouse_bot?start=hhreview_ru#session',
  'https://t.me/holistichouse_bot?start=hhtalk_ru',
  'https://t.me/holistichouse_bot/extra?start=hhreview_ru',
  '/ru/app/settings#hh-telegram-connect',
 ]
 for(const url of bad){
  assert.equal(resolveTelegramFirstEntry({...available,urls:{ru:url}},'ru'),null,url)
 }
 assert.equal(resolveTelegramFirstEntry({...available,available:false},'ru'),null)
 assert.equal(resolveTelegramFirstEntry(available,'fr'),null)
 assert.equal(resolveTelegramFirstEntry(null,'ru'),null)
})
