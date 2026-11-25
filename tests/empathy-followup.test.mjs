import test from 'node:test';
import assert from 'node:assert/strict';
import {followEmpathyConversation} from '../lib/holistic-support/empathy-followup.mjs';
const safe={status:'clear'};
const prompts={
 ru:'Вы говорите об усталости и раздражении. Похоже, напряжения накопилось немало. С чем это сейчас больше связано — с работой, отношениями или чем-то другим?',
 en:'It sounds like you have been exhausted. What is this most connected to — work, relationships or something else?',
 es:'Parece que el cansancio se ha acumulado. ¿Con que se relaciona mas este cansancio: trabajo, relaciones u otra cosa?'
};
for(const [lang,start,detail,goal] of [
 ['ru','Работа. Постоянно чего-то требуют.','Хочу научиться отключаться после работы.','рабочих мыслей'],
 ['en','Work. Everyone keeps demanding things.','I want to switch off after work.','work following you home'],
 ['es','Trabajo. Todo el tiempo me exigen cosas.','Quiero desconectar después del trabajo.','trabajo a casa']
])test('empathetic, bounded continuity: '+lang,()=>{
 const firstHistory=[{role:'user',text:'I am exhausted'},{role:'assistant',text:prompts[lang]}];
 const first=followEmpathyConversation({message:start,locale:lang,history:firstHistory,safety:safe});
 assert.equal(first?.phase,'source');assert.equal(first.noAction,true);
 assert.ok((first.reply.match(/[?？]/g)||[]).length<=1);
 const second=followEmpathyConversation({message:detail,locale:lang,history:[...firstHistory,{role:'user',text:start},{role:'assistant',text:first.reply}],safety:safe});
 assert.equal(second?.phase,'goal');assert.ok(second.reply.includes(goal));
 assert.equal(second.noDiagnosis,true);assert.equal(second.noPersistence,true);
});
test('no unsolicited response when a client did not receive our own question',()=>{
 assert.equal(followEmpathyConversation({message:'Работа, устаю',locale:'ru',history:[{role:'assistant',text:'Чем я могу помочь?'}],safety:safe}),null);
});
test('no-advice preference from client is respected across turns',()=>{
 const r=followEmpathyConversation({message:'Работа, постоянные требования',locale:'ru',history:[
  {role:'user',text:'Просто выслушай, без советов'},
  {role:'assistant',text:prompts.ru}
 ],safety:safe});
 assert.equal(r?.noAdvice,true);assert.doesNotMatch(r?.reply||'',/\?/u);
 assert.doesNotMatch(r?.reply||'',/консультац|запиш|оплат/u);
});
test('user corrected topic, asks for a service or reports a risk',()=>{
 for(const message of ['Давай о другом','Сколько стоит консультация?','Хочу записаться','Не могу дышать','Мне страшно','Стоп','Сгенерируй видео'])
  assert.equal(followEmpathyConversation({message,locale:'ru',history:[{role:'assistant',text:prompts.ru}],safety:safe}),null,message);
 assert.equal(followEmpathyConversation({message:'Работа',locale:'ru',history:[{role:'assistant',text:prompts.ru}],safety:{status:'urgent'}}),null);
});
test('no client text or private history is emitted in metadata',()=>{
 const r=followEmpathyConversation({message:'Работа',locale:'ru',history:[{role:'user',text:'PRIVATE_USER_123'},{role:'assistant',text:prompts.ru}],safety:safe});
 assert.ok(r);assert.doesNotMatch(JSON.stringify(r),/PRIVATE_USER_123/);
});
test('bare Russian work answer is treated as work, not as unrecognized topic',()=>{
 const a=followEmpathyConversation({message:'Работа',locale:'ru',history:[{role:'assistant',text:prompts.ru}],safety:safe});
 assert.match(a?.reply||'',/работа сейчас забирает много сил/u);
});
