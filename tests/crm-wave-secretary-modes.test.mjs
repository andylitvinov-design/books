import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SECRETARY_MODES,SECRETARY_PSYCHOLOGIST_COPY,
  v3PsychologistStart,secretaryDepthPlan,secretaryModeInstruction,
  secretaryPsychologistSummaryInstruction} from '../lib/assist/secretary-modes.mjs';
import {v3Context,v3StartLocale} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {v3ModelMessages} from '../lib/crm/telegram-ai-diagnostic-v3-model.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('psychologist entry requires exact explicit locale-bearing command',()=>{
 assert.deepEqual(v3PsychologistStart('/start hhpsych_ru'),{
   locale:'ru',mode:SECRETARY_MODES.PSYCHOLOGIST});
 assert.deepEqual(v3PsychologistStart('/psychologist_es'),{
   locale:'es',mode:SECRETARY_MODES.PSYCHOLOGIST});
 for(const bad of ['я тревожусь','/start hhpsych_ru?photo=x','/start hhpsych_de',
   '/start hhpsych_ru and pay','/psychologist_ru blah']){
   assert.equal(v3PsychologistStart(bad),null,bad);
 }
 assert.equal(v3StartLocale('/start hhsecretary_en'),'en');
 assert.equal(v3StartLocale('/start hhreview_ru'),'ru');
});
test('mode remains an allowlisted field within the existing encrypted context',()=>{
 assert.equal(v3Context({turns:[],mode:SECRETARY_MODES.PSYCHOLOGIST}).mode,
   SECRETARY_MODES.PSYCHOLOGIST);
 assert.equal(v3Context({turns:[],mode:'clinical_diagnosis'}).mode,undefined);
 assert.equal(v3Context({turns:[],mode:'secretary',chat_id:'bogus'}).chat_id,undefined);
 const turns=Array.from({length:60},(_,i)=>({role:i%2?'assistant':'user',text:'t'+i}));
 assert.equal(v3Context({turns,mode:SECRETARY_MODES.PSYCHOLOGIST}).turns.length,30);
 assert.equal(v3Context({turns,mode:'secretary'}).turns.length,20);
});
test('depth changes gently without asserting clinical evidence',()=>{
 for(const [n,level] of [[0,'situation'],[1,'goal'],[3,'obstacle'],
   [5,'experience'],[7,'patterns'],[9,'resources'],[11,'integration']]){
   const turns=Array.from({length:n},(_,i)=>({role:'user',text:'Client reply '+i}));
   const p=secretaryDepthPlan({turns,locale:'ru'});
   assert.equal(p.level,level);
   assert.ok(p.question&&p.alternatives.length===3);
   assert.equal(p.userTurnCount,n);
 }
 const hold=secretaryDepthPlan({turns:[{role:'user',text:'не готов'}]});
 assert.equal(hold.hold,true);
 assert.equal(hold.question,null);
 assert.match(hold.fallback,/не будем углубляться/);
 const unsure=secretaryDepthPlan({turns:[{role:'user',text:'не знаю'}]});
 assert.match(unsure.question,/не торопиться/);
});
test('distinct mode prompts, voluntary safety, and review-only transfer',()=>{
 const short=secretaryModeInstruction({mode:'secretary',locale:'en',serviceSelected:true});
 assert.match(short,/already selected a service/);
 assert.match(short,/2–5/);
 const deep=secretaryModeInstruction({mode:'secretary_psychologist',locale:'ru'});
 assert.match(deep,/NON-CLINICAL/);
 assert.match(deep,/ONE natural/);
 assert.match(deep,/not ask for photos in Telegram/);
 for(const locale of ['ru','en','es']){
   assert.doesNotMatch(SECRETARY_PSYCHOLOGIST_COPY[locale].intro,/OpenRouter|Qwen/);
   assert.match(SECRETARY_PSYCHOLOGIST_COPY[locale].intro,/Ali/);
   assert.doesNotMatch(SECRETARY_PSYCHOLOGIST_COPY[locale].intro,/\bWave\b/);
   assert.match(SECRETARY_PSYCHOLOGIST_COPY[locale].intro,/\/stop/);
   const q=v3ModelMessages({kind:'question',mode:'secretary_psychologist',locale,
     turns:[{role:'user',text:'I want to understand what gets in my way'}]});
   assert.match(q[0].content,/Secretary Psychologist Mind/);
   const summary=v3ModelMessages({kind:'summary',mode:'secretary_psychologist',locale});
   assert.match(summary[0].content,/CLIENT for correction/);
 }
 assert.match(secretaryPsychologistSummaryInstruction('ru'),/Never claim a photo/);
});
test('production handler requires explicit start and reuses consent/STOP/CRM gates',()=>{
 const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(service,/psychStart=v3PsychologistStart\(raw\)/);
 assert.match(service,/mode:SECRETARY_MODES\.PSYCHOLOGIST/);
 assert.match(service,/mode:prior\.ctx\.mode/);
 assert.match(service,/ctx\.mode===SECRETARY_MODES\.PSYCHOLOGIST\?SECRETARY_PSYCHOLOGIST_COPY\[lang\]\.first/);
 assert.match(service,/ctx\.mode===FREE_DIAGNOSTIC_MODE\?v3ButtonsFor\(lang,'free_interview',0\):\[\]/);
 assert.match(service,/ai_review_consent_at=now\(\)/);
 assert.match(service,/if\(stop\)/);
 assert.match(service,/SECRETARY_PSYCHOLOGIST_COPY\[lang\]/);
});