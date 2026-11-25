import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planEmotionalReaction} from '../lib/holistic-support/emotional-reaction.mjs';
import {planJudgmentTurn} from '../lib/holistic-support/judgment-mind.mjs';
const safe={status:'clear'};
const positives=[
 ['Мне грустно','en','emotion_sad','ru'],['Я расстроена','ru','emotion_sad','ru'],
 ['I feel sad','ru','emotion_sad','en'],["I'm sad",'en','emotion_sad','en'],
 ['Me siento triste','en','emotion_sad','es'],['Мне страшно','en','emotion_fear','ru'],
 ["I'm scared",'ru','emotion_fear','en'],['Tengo miedo','en','emotion_fear','es'],
 ['Я злюсь','ru','emotion_anger','ru'],["I'm angry",'en','emotion_anger','en'],
 ['Estoy enojado','es','emotion_anger','es'],['Я счастлива','ru','emotion_joy','ru'],
 ['I feel happy','en','emotion_joy','en'],['Me siento feliz','es','emotion_joy','es'],
 ['Мне плохо','en','emotion_distress','ru'],["I'm not okay",'en','emotion_distress','en'],
 ['Me siento mal','es','emotion_distress','es'],['Мне стало легче','en','emotion_relief','ru'],
 ['I feel better','en','emotion_relief','en'],['Хочу выговориться','en','emotion_listen','ru'],
 ['Just listen','ru','emotion_listen','en']
];
for(const [message,locale,id,lang] of positives)test('emotion: '+message,()=>{
 const result=planEmotionalReaction({message,locale,safety:safe});
 assert.equal(result?.id,id); assert.equal(result?.locale,lang);
 assert.ok(result.reply.length<300);
 assert.ok((result.reply.match(/[?？]/gu)||[]).length<=1);
 assert.equal(result.memorySaved,false); assert.equal(result.actionExecuted,false);
 assert.doesNotMatch(result.reply,/купите|запишитесь|оплатите|диагноз|€|buy now/iu);
});
for(const message of [
 'Создай грустное видео','Я хочу видео про грусть','Она сказала: мне грустно',
 'Мне не грустно',"I'm not sad",'Me siento no triste','The film is sad',
 'Он боится','I want a sad video','Найди медитацию от грусти',
 'Мне грустно и я хочу умереть','I feel sad and want to kill myself',
 'Мне плохо и не могу дышать','No puedo respirar, me siento triste'
])test('no emotional hijack: '+message,()=>{
 assert.equal(planEmotionalReaction({message,locale:'ru',safety:safe}),null);
});
test('risk and unknown safety states cannot use the emotional response',()=>{
 for(const status of ['human_review','urgent','unknown',undefined])
  assert.equal(planEmotionalReaction({message:'Мне грустно',locale:'ru',safety:{status}}),null);
});
test('continuity only after explicit self-reported feeling',()=>{
 const history=[{role:'user',text:'Мне грустно'},{role:'assistant',text:'Хотите рассказать?'}];
 for(const [message,id] of [['Пока не знаю','emotion_unsure'],['Помоги разобраться','emotion_support'],['Да','emotion_continue']]){
  const actual=planEmotionalReaction({message,locale:'ru',history,safety:safe});
  assert.equal(actual?.id,id);
 }
 for(const message of ['Создай видео','Нет'])
  assert.equal(planEmotionalReaction({message,locale:'ru',history,safety:safe}),null);
 assert.equal(planEmotionalReaction({message:'Не знаю',locale:'ru',history:[],safety:safe}),null);
});
test('existing Judgment Mind applies emotion-first without new signed categories',()=>{
 const plan=planJudgmentTurn({message:'Мне грустно',locale:'en',safety:safe});
 assert.equal(plan.status,'handled');assert.equal(plan.state,'emotion_acknowledged');
 assert.match(plan.reply,/грустно/);assert.equal(plan.situationCode,null);
 assert.equal(plan.actionExecuted,false);assert.equal(plan.memorySaved,false);
 assert.equal(plan.needsChoice,false);assert.deepEqual(plan.choices,[]);
 assert.equal(plan.pending,null);
 const follow=planJudgmentTurn({message:'Пока не знаю',locale:'ru',safety:safe,
  history:[{role:'user',text:'Мне грустно'},{role:'assistant',text:plan.reply}]});
 assert.equal(follow.state,'emotion_acknowledged');
 assert.equal(planJudgmentTurn({message:'Мне грустно и я хочу умереть',locale:'ru',safety:safe}).status,'handoff');
 assert.equal(planJudgmentTurn({message:'Создай грустное видео',locale:'ru',safety:safe}).status,'abstain');
});
test('integration: host history, natural fallback and schema are wired',()=>{
 const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 assert.match(text('app/api/holistic-agent/turn/route.js'),/message:body\.message,locale:body\.locale,safety,history:body\.history/);
 assert.match(text('components/holistic-agent-chat.tsx'),/history:prior,pending:judgmentView\?\.pending/);
 assert.match(text('components/holistic-agent-chat.tsx'),/emotion_acknowledged/);
 assert.match(text('lib/holistic-support/natural-dialogue.mjs'),/planEmotionalReaction/);
 assert.match(text('lib/holistic-support/natural-dialogue.mjs'),/First acknowledge explicitly stated emotions/);
 const schema=JSON.parse(text('lib/holistic-support/judgment-schema.json'));
 assert.ok(schema.properties.state.enum.includes('emotion_acknowledged'));
});
