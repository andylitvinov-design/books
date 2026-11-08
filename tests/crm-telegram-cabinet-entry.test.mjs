import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {telegramCabinetLinkButtons,telegramMenuKeyboard,parseTelegramHomeAction,companionMessage} from '../lib/crm/telegram-companion-menu.mjs'
import {telegramCompanionNativeCommands} from '../lib/crm/telegram-companion-native-commands.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('RU/EN/ES Cabinet entry uses one fixed tokenless website URL',()=>{
 for(const [lang,choice] of [['ru','🏠 Мой кабинет'],['en','🏠 My Cabinet'],['es','🏠 Mi espacio']]){
  const keyboard=telegramMenuKeyboard(lang)
  assert.equal(keyboard.keyboard[0][0].text,choice)
  assert.equal(parseTelegramHomeAction(choice).action,'cabinet')
  assert.equal(parseTelegramHomeAction('/cabinet').action,'cabinet')
  assert.equal(parseTelegramHomeAction('/cabinet@DifferentBot','HolisticHouseBot'),null)
  const inline=telegramCabinetLinkButtons(lang)
  assert.deepEqual(inline,{inline_keyboard:[[{text:lang==='ru'?'🏠 Открыть мой кабинет':lang==='en'?'🏠 Open my Cabinet':'🏠 Abrir mi espacio',url:'https://holistichouse.vercel.app/'+lang+'/app'}]]})
  assert.ok(!/token=|code=|chat_id=|auth_key=/.test(inline.inline_keyboard[0][0].url))
  assert.ok(companionMessage(lang,'cabinet').length>100)
  assert.ok(telegramCompanionNativeCommands(lang).some(item=>item.command==='cabinet'))
 }
})

test('Existing AI, direct review, stop and marketing consent remain separate',()=>{
 for(const lang of ['ru','en','es']){
  const keys=telegramMenuKeyboard(lang).keyboard.flat().map(x=>parseTelegramHomeAction(x.text).action)
  assert.deepEqual(keys,['cabinet','ai','checkin','meditation','video','materials','review','daily','language'])
 }
 const service=read('lib/crm/telegram-companion-service.js')
 const provider=read('lib/crm/messenger-provider.js')
 assert.match(service,/action==='cabinet'/)
 assert.ok(service.includes("markup=language==='es'?telegramCabinetLinkButtons(language):telegramExploreDetailButtons(language,'cabinet')"))
 assert.match(provider,/telegramCabinetLinkButtons\(lang\)/)
 assert.match(service,/action==='daily_off'/)
 assert.match(service,/action==='review'/)
 assert.match(provider,/allow_paid_broadcast:false/)
})
