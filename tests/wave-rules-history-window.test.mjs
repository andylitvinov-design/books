import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {waveStagedDialogueTurn} from '../lib/holistic-support/wave-staged-dialogue.mjs';
import {waveNativeTurn} from '../lib/holistic-support/wave-native-router.mjs';
import {planWaveMagicTurn} from '../lib/holistic-support/wave-magic-director.mjs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('12 first-party Rules turns retain unified P0 Mind context while owned inference stays six',()=>{
 const api=src('app/api/holistic-agent/turn/route.js');
 const ui=src('components/holistic-agent-chat.tsx');
 const native=src('lib/holistic-support/wave-native-router.mjs');
 assert.match(api,/body\.history\.length > \(body\.mode==="rules"\?12:6\)/);
 assert.match(ui,/const historyLimit=mode==="rules"\?12:6/);
 assert.match(ui,/\.\.\.messages\.slice\(-\(historyLimit-1\)\)/);
 assert.match(native,/history\.slice\(-12\)\.filter/);
 assert.match(src('lib/holistic-support/wave-magic-director.mjs'),/const historyOf=turns=>\(Array\.isArray\(turns\)\?turns:\[\]\)\.slice\(-12\)/);
 assert.match(src('lib/holistic-support/wave-staged-dialogue.mjs'),/const turns=\(Array\.isArray\(history\)\?history:\[\]\)\.slice\(-12\)\.filter/);
});

test('a user-requested no-advice boundary can outlive eight turns but never cause an order',()=>{
 const history=[{role:'user',text:'Не хочу советов'},{role:'assistant',text:'Хорошо. Я слушаю.'}];
 for(let i=0;i<4;i++)history.push({role:'user',text:'Сегодня мне было трудно справляться.'},
   {role:'assistant',text:'Я понимаю, расскажите подробнее.'});
 assert.equal(history.length,10);
 const continued=waveStagedDialogueTurn({message:'Я устал',locale:'ru',history});
 assert.equal(continued?.phase,'listen');
 assert.ok(!/оплачено|забронировано|записал вас/u.test(continued.reply));
 for(const msg of ['Оплати заказ','Не могу дышать','/stop'])
   assert.equal(waveNativeTurn({message:msg,locale:'ru',history}),null);
});

test('the protected production Alchemy Mind remains authoritative instead of a competing Director',()=>{
 const director=src('lib/holistic-support/wave-magic-director.mjs');
 const router=src('lib/holistic-support/wave-native-router.mjs');
 assert.match(director,/export function planWaveMagicTurn/);
 assert.doesNotMatch(router,/import \{planWaveMagicDirector\}/);
 const planned=planWaveMagicTurn({message:'Book me a session',locale:'en',safety:{status:'clear'}});
 assert.equal(planned.handoff?.maySubmit,false);
 assert.equal(planned.constraints.noCRMWrite,true);
});
