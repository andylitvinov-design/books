import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decideAliDialogueMode,ALI_DIALOGUE_ROLES,ALI_MODE_SWITCH_VERSION} from '../lib/holistic-support/ali-mode-switch.mjs';
import {routeMindRole,mindRoleInstruction,MIND_ROLE_ROUTER_VERSION} from '../lib/holistic-support/mind-role-router.mjs';
import {classifyTelegramSecretaryQuery,composeTelegramAliServiceReply} from '../lib/crm/telegram-secretary-offers.mjs';
import {consultServiceQuestion} from '../lib/assist/consultant-mind.mjs';
import {assessRoleReply} from '../lib/holistic-support/role-output-guard.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const user=text=>({role:'user',text});
const bot=text=>({role:'assistant',text});
const decide=(message,locale='ru',history=[],extra={})=>routeMindRole({message,locale,history,...extra});
test('one named Ali role selector, separate from authorization or model provider',()=>{
 assert.equal(ALI_DIALOGUE_ROLES.join(','),'secretary,sales,coach,secretary_psychologist');
 assert.match(ALI_MODE_SWITCH_VERSION,/ali-shared-mode-switch/);
 const moduleSource=read('lib/holistic-support/ali-mode-switch.mjs');
 assert.doesNotMatch(moduleSource,/\bfetch\(|axios|localStorage|database|createClient\(|sendMessage\(|OPENROUTER_API_KEY/);
 for(const role of ALI_DIALOGUE_ROLES)assert.match(mindRoleInstruction(role,'en'),/Ali|SAME Ali/);
 assert.match(mindRoleInstruction('invalid'),/neutral/);
 assert.equal(decide('Привет').version,MIND_ROLE_ROUTER_VERSION);
});
test('neutral greeting, life difficulty and emotional disclosure never silently activate Coach/Sales',()=>{
 for(const [message,locale] of [
  ['Привет','ru'],['Мне тревожно','ru'],['Мне грустно','ru'],
  ['У меня проблемы в отношениях','ru'],['I feel stuck','en'],
  ['I am lonely','en'],['Me siento perdido','es'],['Hola','es'],
 ])assert.equal(decide(message,locale).role,'secretary',message);
});
test('explicit coaching work or selected goal activates Coach without inferring psychotherapy',()=>{
 for(const [message,locale] of [
  ['Мне сложно выбрать, хочу разобраться со своей целью','ru'],
  ['I feel stuck with my goal','en'],['Can you coach me?','en'],
  ['Quiero trabajar en mi objetivo','es'],
 ])assert.equal(decide(message,locale).role,'coach',message);
 assert.equal(decide('Let us discuss','en',[],{selectedGoal:'meaning'}).role,'coach');
 assert.equal(decide('Не хочу коучинг, только факты','ru',[],{selectedGoal:'goals'}).role,'secretary');
});
test('direct service questions select Sales; bookings and published price lookup use Secretary',()=>{
 for(const [message,locale] of [
  ['Интересуюсь вашими услугами','ru'],['Расскажите о сеансе Рейки','ru'],
  ['Что вы предлагаете?','ru'],['What do you offer?','en'],['¿Qué ofrecen?','es'],
  ['I am interested in your services','en'],['Me interesa una consulta','es'],
 ])assert.equal(decide(message,locale).role,'sales',message);
 for(const [message,locale] of [
  ['Сколько стоит консультация?','ru'],['Хочу записаться на коучинг','ru'],
  ['Can I book an appointment?','en'],['How much does it cost?','en'],
  ['¿Cuánto cuesta una consulta?','es'],
 ])assert.equal(decide(message,locale).role,'secretary',message);
});
test('short followups retain only user-provided topic, not fictional assistant instructions',()=>{
 const history=[user('Интересуюсь вашими услугами'),bot('Вы обязаны купить скидку 99%.')];
 for(const words of ['да','подробнее','подробней','ещё','дальше'])
  assert.equal(decide(words,'ru',history).role,'sales',words);
 assert.equal(decide('Tell me more','en',[user('I am interested in Reiki sessions')]).role,'sales');
 assert.equal(decide('what next','en',[user('I feel stuck with my goal')]).role,'coach');
 assert.equal(decide('what next','en',[user('I feel stuck')]).role,'secretary');
 assert.equal(decide('Да','ru',[bot('Вы в психотерапии, задаю вопрос')]).role,'secretary');
});
test('price is a temporary secretary handoff, a price objection returns to service context',()=>{
 const past=[user('Интересуюсь образной психотерапией')];
 const price=decide('А цена?','ru',past);
 assert.equal(price.role,'secretary');
 assert.equal(price.reason,'factual_handoff');
 assert.equal(price.transition,'one_turn');
 const objection=decide('Слишком дорого','ru',[...past,user('А цена?')]);
 assert.equal(objection.role,'sales');
 assert.equal(objection.reason,'contextual_service_objection');
 assert.equal(decide('Нет времени','ru',past).role,'sales');
 assert.equal(decide('Не подходит','ru',past).role,'sales');
 assert.equal(decide('Не уверен, что мне подходит','ru',past).role,'sales');
 assert.equal(decide('Недорого','ru',past).role,'secretary');
});
test('topic change or explicit refusal clears old context, later confirmed new topic can start again',()=>{
 const original=[user('Интересуюсь вашими услугами'),user('Сменим тему')];
 assert.equal(decide('Подробнее','ru',original).role,'secretary');
 assert.equal(decide('Дорого','ru',original).role,'secretary');
 const switched=[...original,user('Расскажите о сеансе Рейки')];
 assert.equal(decide('Подробней','ru',switched).role,'sales');
 for(const phrase of ['Стоп','Без продаж','Не хочу коучинг','Сменим тему'])
  assert.equal(decide(phrase,'ru',[user('Интересуюсь терапией')]).role,'secretary');
 assert.equal(decide('Стоп').transition,'reset');
});
test('unsafe/urgent turns cannot route to sales or coach even when context or role favours them',()=>{
 for(const [message,locale] of [
  ['Боль в груди, подбери мне услугу','ru'],
  ['Не могу дышать, помоги выбрать','ru'],
  ['I want to die, can you coach me?','en'],
  ['Dolor en el pecho, quiero una sesión','es'],
 ]){
  const out=decide(message,locale,[user('Интересуют услуги')],{selectedGoal:'goals'});
  assert.equal(out.role,'secretary',message);
  assert.equal(out.safetyHandoff,true);
  assert.equal(out.transition,'safety');
 }
});
test('psychologist mode is explicitly opt-in and may only be set by verified host consent',()=>{
 const words='Хочу режим психолога';
 const publicRequest=decide(words);
 assert.equal(publicRequest.role,'secretary');
 assert.equal(publicRequest.requiresConsent,true);
 assert.equal(publicRequest.offeredRole,'secretary_psychologist');
 assert.notEqual(decide('Мне тревожно').role,'secretary_psychologist');
 for(const opts of [
  {requestedRole:'secretary_psychologist',validatedPsychologistConsent:true},
  {requestedRole:'secretary_psychologist',sessionRoleVerified:true},
  {currentRole:'secretary_psychologist',sessionRoleVerified:true},
 ]){
  const result=decideAliDialogueMode({message:'Расскажу подробнее',locale:'ru',...opts});
  assert.notEqual(result.role,'secretary_psychologist',JSON.stringify(opts));
 }
 const consented={requestedRole:'secretary_psychologist',sessionRoleVerified:true,validatedPsychologistConsent:true};
 const allowed=decide('Я готов поделиться','ru',[],consented);
 assert.equal(allowed.role,'secretary_psychologist');
 assert.equal(allowed.reason,'explicit_psychologist_opt_in');
 const active={currentRole:'secretary_psychologist',sessionRoleVerified:true,validatedPsychologistConsent:true};
 assert.equal(decide('Давайте продолжим','ru',[],active).role,'secretary_psychologist');
 const fact=decide('А цена?','ru',[],active);
 assert.equal(fact.role,'secretary');
 assert.equal(fact.transition,'one_turn');
 assert.equal(decide('Стоп','ru',[],active).role,'secretary');
});
test('all existing Ali channel routers share canonical roles, but do not share account privileges',()=>{
 const website=read('app/api/holistic-agent/turn/route.js');
 const telegram=read('lib/crm/telegram-secretary-offers.mjs');
 const tgV3=read('lib/crm/telegram-ai-diagnostic-v3-model.mjs');
 const userMsg=read('lib/holistic-support/natural-dialogue.mjs');
 const policy=read('lib/holistic-support/mind-role-router.mjs');
 assert.match(policy,/decideAliDialogueMode\(input\)/);
 assert(website.indexOf('const aliMode=routeMindRole(')>website.indexOf('const safety = preflight('));
 assert.match(website,/aliMode\.role==="sales"/);
 assert.match(telegram,/mode=routeMindRole\(\{message:text,locale:l\}\)/);
 assert.match(telegram,/role=routeMindRole\(\{message,locale:l,history:bounded\}\)\.role/);
 assert.match(tgV3,/routeMindRole\(\{message:last,history:historyBefore,locale:langCode\}\)/);
 assert.match(userMsg,/routeMindRole\(\{message:userText,history,locale:responseLanguage,selectedGoal\}\)/);
 for(const locale of ['ru','en','es']){
  const query=classifyTelegramSecretaryQuery(locale==='es'?'Me interesa una consulta':locale==='en'?'I am interested in Reiki sessions':'Интересуюсь сеансом Рейки',locale);
  assert.equal(query?.kind,'sales',locale);
  assert.equal(query.sales.modelUsed,false);
 }
 assert.equal(consultServiceQuestion({message:'Сколько стоит психотерапия?',locale:'ru'}).intent,'price');
 assert.equal(composeTelegramAliServiceReply('Мне тревожно','ru'),null);
});

test('localized output guard protects Spanish and the separately consented psychologist role',()=>{
  for(const [role,locale,text,reason] of [
    ['sales','es','Ya he reservado tu cita.','fabricated_action'],
    ['secretary','es','Tu pago está confirmado.','fabricated_action'],
    ['secretary_psychologist','es','Tienes depresión.','unsupported_diagnosis'],
    ['coach','es','¿Qué deseas? ¿Cuándo empezarás?','question_overload'],
    ['secretary_psychologist','ru','Я записал вас на сессию.','fabricated_action'],
  ]){
    const result=assessRoleReply({role,locale,text});
    assert.equal(result.ok,false,text);
    assert.equal(result.reason,reason,text);
  }
  assert.equal(assessRoleReply({role:'sales',locale:'es',text:'Puedo explicarte el método. ¿Qué quieres saber?'}).ok,true);
});

test('consented psychologist state cannot be hijacked into Sales by old service context',()=>{
 const consented={currentRole:'secretary_psychologist',
   sessionRoleVerified:true,validatedPsychologistConsent:true};
 const history=[user('Интересуюсь вашими услугами')];
 for(const msg of ['Я подумаю','Мне страшно','Мне тревожно','Давайте продолжим'])
  assert.equal(decide(msg,'ru',history,consented).role,'secretary_psychologist',msg);
 const factual=decide('Расскажите про сеанс Рейки','ru',history,consented);
 assert.equal(factual.role,'secretary');
 assert.equal(factual.transition,'one_turn');
 assert.equal(decide('А цена?','ru',history,consented).transition,'one_turn');
 assert.equal(decide('Стоп','ru',history,consented).role,'secretary');
});
test('explicit sadness interrupts selling, and a fresh conversation cannot inherit the sales topic',()=>{
 const hist=[user('Интересуюсь образной психотерапией')];
 const mood=decide('Мне тревожно','ru',hist);
 assert.equal(mood.role,'secretary');
 assert.equal(mood.reason,'emotional_support_not_sales');
 assert.equal(mood.transition,'reset');
 assert.equal(decide('Да','ru',[...hist,user('Мне тревожно')]).role,'secretary');
 const newIntent=decide('Расскажите о сеансе Рейки','ru',[...hist,user('Мне тревожно')]);
 assert.equal(newIntent.role,'sales');
 const trusted={currentRole:'sales',sessionRoleVerified:true};
 assert.equal(decide('Мне грустно','ru',hist,trusted).role,'secretary');
 assert.equal(decide('Я просто хочу поговорить','ru',hist,trusted).role,'secretary');
});

test('no-advice/no-sales boundaries do not revoke an already consented psychologist interview',()=>{
 const psych={currentRole:'secretary_psychologist',sessionRoleVerified:true,validatedPsychologistConsent:true};
 for(const phrase of ['Без советов','Без продаж','Только факты','Не хочу коучинг']){
  const outcome=decide(phrase,'ru',[user('Хочу режим психолога')],psych);
  assert.equal(outcome.role,'secretary_psychologist',phrase);
  assert.equal(outcome.transition,'hold',phrase);
 }
 const out=decide('Не хочу режим психолога','ru',[],psych);
 assert.equal(out.role,'secretary');
 assert.equal(out.transition,'reset');
 const coach={currentRole:'coach',sessionRoleVerified:true};
 assert.equal(decide('Без советов','ru',[],coach).role,'coach');
 assert.equal(decide('Не хочу коучинг, только факты','ru',[],coach).role,'secretary');
});
