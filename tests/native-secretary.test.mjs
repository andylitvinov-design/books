import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {nativeSecretaryTurn,nativeSecretaryAllowsUtterance,nativeSecretaryAllowsIntent} from '../lib/holistic-support/native-secretary.mjs';
import {classifyNativeSecretaryIntent} from '../lib/holistic-support/native-intent-model.mjs';
import {ruleConversationReply} from '../lib/holistic-support/rule-conversation.mjs';

test('price fallback states uncertainty without assuming the subject is a site service',()=>{
  for(const [locale,message,uncertainty,conditional] of [
    ['ru','Сколько стоит новый велосипед?',/не могу проверить актуальную цену/iu,/если.*holistic house/iu],
    ['en','How much does a new bicycle cost?',/cannot check the current price/iu,/if.*holistic house/iu],
  ]){
    const rule=ruleConversationReply({message,locale,history:[]});
    assert.equal(rule?.id,'price');assert.match(rule.reply,uncertainty);assert.match(rule.reply,conditional);
    const native=nativeSecretaryTurn({message,locale,history:[]});
    if(native?.intent==='pricing'){assert.match(native.reply,uncertainty);assert.match(native.reply,conditional);}
  }
});
const cases=[
['ru','здравствуйте','hello'],['ru','сколько это стоит','pricing'],
['ru','как связаться с человеком','human'],['ru','интересуют ваши курсы','courses'],
['ru','не работает кнопка на сайте','technical'],['en','hello there','hello'],
['en','how much is it','pricing'],['en','where is my order','status'],
['en','who am I chatting with','identity'],['en','I want to book a consultation','booking'],
['es','hola buenos dias','hello'],['es','cuanto cuesta','pricing'],
['es','como puedo encontrar cursos','courses'],
['es','me puedes ayudar a contactar con alguien','human'],
['es','la pagina no abre','technical']
];
test('own intent model answers multilingual held-out receptionist phrases',()=>{
  for(const [locale,text,intent] of cases){
    const result=classifyNativeSecretaryIntent(text);
    assert.equal(result.intent,intent,locale+': '+text+' -> '+JSON.stringify(result));
    assert.equal(result.accepted,true,locale+': '+text+' not accepted');
    const reply=nativeSecretaryTurn({message:text,locale});
    assert.ok(reply?.reply?.length>0);
    assert.equal(reply.source,'hh-native-secretary-v1');
    assert.equal(reply.modelUsed,false);
    assert.equal(reply.actionExecuted,false);
  }
});
test('unrecognized long-tail free questions safely abstain',()=>{
  for(const text of ['абракадабра васильковый протон','unrelated quantum unicorn waffle theory',''])
    assert.equal(nativeSecretaryTurn({message:text,locale:'ru'}),null);
});
test('safety, sensitive content and domain actions are delegated to trusted owner',()=>{
  for(const text of ['хочу умереть','не могу дышать','diagnose my depression','создай видео','удали мой аккаунт','send my payment','crea un video'])
    assert.equal(nativeSecretaryTurn({message:text,locale:'ru'}),null,text);
});
test('model never sends dialogue to third-party AI or creates memory',()=>{
  const source=readFileSync(new URL('../lib/holistic-support/native-secretary.mjs',import.meta.url),'utf8');
  const model=readFileSync(new URL('../lib/holistic-support/native-intent-model.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source+model,/\bfetch\s*\(|openai|anthropic|gemini|openrouter|ollama|https:\/\//i);
  assert.equal(nativeSecretaryTurn({message:'привет',locale:'ru'}).memorySaved,false);
});
test('existing server route places native model behind actor, rate, safety and protected choice gates',()=>{
  const source=readFileSync(new URL('../app/api/holistic-agent/turn/route.js',import.meta.url),'utf8');
  const pos=source.indexOf('const nativeReply=');
  assert.ok(pos>source.indexOf('const safety = preflight('));
  assert.ok(pos>source.indexOf('await consumeRate('));
  assert.match(source,/nativeSecretaryTurn\(\{message:body\.message,locale:body\.locale,history:body\.history\}\)/);
  assert.match(source,/body\.judgmentContext==null && body\.judgmentChoice==null/);
  assert.match(source,/modelUsed:false[\s\S]{0,200}source:nativeReply\.source/);
});

test('explicit refusals override inferred catalog topic and short social replies',()=>{
  for(const [locale,message] of [['ru','Не предлагай мне курсы'],['es','No quiero cursos'],['en',"I don't want a session"],['ru','Спасибо, но вопрос остался']])
    assert.equal(nativeSecretaryTurn({message,locale}),null,message);
});
test('explicit RU/EN action refusals cannot become secretary intents',()=>{
 for(const message of [
  'Не предлагайте мне никакие услуги','Не записывайте меня к специалисту',
  'Не показывай мне больше курсы','Не отправляйте мои данные кому-либо',
  'Please do not recommend any services to me','Do not book me with a specialist',
  'Please do not show courses','Do not send my information to anyone',
 ])assert.equal(nativeSecretaryAllowsUtterance(message),false,message);
 for(const message of ['Какие услуги у вас есть?','How can I contact a person?'])
  assert.equal(nativeSecretaryAllowsUtterance(message),true,message);
});
test('refusing offers is never routed as a request for courses or services',()=>{
 for(const message of ['Please do not offer me any courses',"Don't offer me services",'Не предлагай мне курсы']){
  assert.equal(nativeSecretaryAllowsUtterance(message),false,message);
  assert.equal(nativeSecretaryTurn({message,locale:message.startsWith('Не')?'ru':'en'}),null,message);
 }
});
test('status replies require an explicit status or item reference in RU/EN',()=>{
 for(const [locale,message] of [['ru','Как вырастить цветок дома'],['en','How can I grow a flower indoors']])
  assert.equal(nativeSecretaryAllowsIntent(message,locale,'status'),false,message);
 for(const [locale,message] of [['ru','На каком этапе моя заявка'],['ru','Готов ли мой заказ'],['en','Is my request ready'],['en','Where is my order']])
  assert.equal(nativeSecretaryAllowsIntent(message,locale,'status'),true,message);
 assert.equal(nativeSecretaryAllowsIntent('otro texto','es','status'),true);
 assert.equal(nativeSecretaryAllowsIntent('hello','en','hello'),true);
});

// A social prefix with a new request must not swallow the actual request.
test('compound RU/EN social openers delegate substantive requests to context',()=>{
 for(const [locale,message] of [
  ['en','Hello, can you show courses?'],
  ['en','Hi there, I need help choosing a service'],
  ['en','Thanks for your help, but I need to ask about another service'],
  ['en','Thank you, could you help me with a course?'],
  ['ru','Привет! Мне нужна консультация'],
  ['ru','Здравствуйте, подскажите, где найти курсы'],
  ['ru','Спасибо за помощь, но есть другой вопрос'],
  ['ru','Благодарю, а теперь подскажите про занятия'],
 ]){
  assert.equal(nativeSecretaryAllowsUtterance(message),false,message);
  assert.equal(nativeSecretaryTurn({message,locale}),null,message);
 }
 for(const message of ['hello there','hi','Привет','Здравствуйте','спасибо','Спасибо большое','thanks','Thank you for your help','gracias','Hola, quiero un curso'])
  assert.equal(nativeSecretaryAllowsUtterance(message),true,message);
});

test('only authenticated native responses expose classifier provenance',()=>{
 const source=readFileSync(new URL('../app/api/holistic-agent/turn/route.js',import.meta.url),'utf8');
 const branch=source.split('if(nativeReply && NATIVE_INTENTS.has(nativeReply.intent) &&')[1]?.split('if(fastRule&&FAST_RULE_IDS.has(fastRule.id))')[0]||'';
 assert.match(branch,/source:nativeReply\.source,nativeModelUsed:true/);
 assert.match(branch,/nativeModelKind:nativeReply\.modelKind,nativeModelVersion:nativeReply\.modelVersion/);
 assert.match(branch,/modelUsed:false/); // no generative model even when native classifier ran
 const result=nativeSecretaryTurn({message:'hello there',locale:'en'});
 assert.ok(result?.modelVersion?.startsWith('hh-native-intent-'));
 assert.equal(result.modelUsed,false);
 assert.equal(result.memorySaved,false);
 assert.equal(result.actionExecuted,false);
});
