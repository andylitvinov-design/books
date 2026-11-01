import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {understandVideoChatReply as understand} from '../lib/mandala/video-chat-understanding.mjs';
import {goalFirstVideoChatDraft,mergeVideoChatPreferences} from '../lib/mandala/video-chat-intent.mjs';

const cases=[
  ['Хочу почувствовать себя увереннее','goal','goal',{}],
  ['Сделай вертикальный ролик 30 секунд с музыкой и фразами','goal','settings_only',{aspect:'portrait',duration:30}],
  ['Для Инстаграма, секунд на двадцать','duration','edit',{duration:20}],
  ['Для тиктока, 20 секунд','review','edit',{aspect:'portrait',duration:20}],
  ['Пусть будет про любовь, но без музыки','review','goal',{music:'none'}],
  ['Нет, лучше про уверенность, вертикально','review','goal',{aspect:'portrait'}],
  ['Без надписей, только музыка','review','edit',{phrases:false,music:'harmony'}],
  ['Не вертикальный, а горизонтальный','review','edit',{aspect:'landscape'}],
  ['полминуты','duration','edit',{duration:30}],
  ['четверть минуты','duration','edit',{duration:15}],
  ['одну минуту','duration','edit',{duration:60}],
  ['Sin música, video horizontal de 20 segundos','review','edit',{music:'none',aspect:'landscape',duration:20}],
  ['Without captions or music, landscape 15 seconds','review','edit',{phrases:false,music:'none',aspect:'landscape',duration:15}],
  ['романтическая музыка','music','edit',{music:'love'}],
  ['медитативная музыка','review','edit',{music:'meditation'}],
  ['поменяй музыку на романтическую','review','edit',{music:'love'}],
  ['добавь горы','review','append_goal',{}],
  ['без моря','review','append_goal',{}],
  ['хочу озвучку голосом','review','audio',{}],
  ['хочу динамичный ролик про уверенность','goal','goal',{mood:'dynamic'}],
  ['reels для моего бизнеса','goal','goal',{aspect:'portrait'}],
  ['сделай видео','goal','clarify',{}],
];
for(const [input,stage,kind,fields] of cases){
 test('NLU '+stage+': '+input,()=>{
   const reply=understand(input,stage);
   assert.equal(reply.kind,kind);
   for(const [key,value] of Object.entries(fields))assert.equal(reply.filters[key],value);
 });
}

test('multi-intent topic change keeps topic and preserves unrelated settings',()=>{
 const original={goal:'Про спокойствие',aspect:'landscape',duration:30,mood:'slow',music:'love',phrases:true};
 const reply=understand('Пусть будет про любовь, но без музыки','review');
 assert.equal(reply.goal,'любовь');
 const candidate=goalFirstVideoChatDraft(reply.goal,'relationships');
 const merged={...mergeVideoChatPreferences(candidate,'Пусть будет про любовь, но без музыки'),...reply.filters};
 assert.equal(merged.goal,'любовь');
 assert.equal(merged.music,'none');
 assert.equal(merged.duration,30);
 assert.equal(original.goal,'Про спокойствие');
});
test('unsupported and contradictory options are never silently guessed',()=>{
 const duration=understand('45 секунд','review');
 assert.equal(duration.kind,'clarify');assert.equal(duration.reason,'unsupported_duration');
 const contradictory=understand('9:16 или 16:9','review');
 assert.equal(contradictory.kind,'clarify');assert.equal(contradictory.reason,'ambiguous');
 const minutes=understand('20 минут','duration');
 assert.equal(minutes.reason,'unsupported_duration');
});
test('approval and real rendering require their own stages',()=>{
 assert.equal(understand('да','review').kind,'confirm');
 assert.equal(understand('да','ready').kind,'clarify');
 assert.equal(understand('создавай','review').reason,'approval_needed');
 assert.equal(understand('создавай','ready').kind,'create');
 assert.equal(understand('скачай видео','done').kind,'open');
 assert.notEqual(understand('да, но без музыки','review').kind,'confirm');
});
test('navigation and fallback are context-aware',()=>{
 const back=understand('назад','duration');
 assert.deepEqual([back.kind,back.targetStep],['navigate','aspect']);
 const music=understand('вернись к музыке','review');
 assert.deepEqual([music.kind,music.targetStep],['navigate','music']);
 assert.equal(understand('другой сюжет','review').kind,'alternate');
 assert.equal(understand('выбери сам','mood').kind,'auto');
 assert.equal(understand('пропусти','duration').kind,'skip');
 assert.equal(understand('сделай покороче','review').direction,-1);
 assert.equal(understand('сделай подлиннее','review').direction,1);
});
test('published chat wires local NLU to existing confirm/create/audio flow',()=>{
 const ui=readFileSync(new URL('../components/mandala-video-director-chat.tsx',import.meta.url),'utf8');
 assert.match(ui,/understandVideoChatReply\(value,step\)/);
 assert.match(ui,/reply\.kind==="goal"\|\|reply\.kind==="append_goal"/);
 assert.match(ui,/reply\.kind==="edit"/);
 assert.match(ui,/onConfirm\(\{scenario:executable\}\)/);
 assert.match(ui,/onCreate\(\)/);
 assert.match(ui,/onOpenAudio\(\)/);
 assert.match(ui,/chatAmbiguous/);
 assert.match(ui,/onInvalidate\(\)/);
 assert.doesNotMatch(ui,/hasVideoChatFilter/);
});
