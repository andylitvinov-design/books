import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {nativeSecretaryTurn} from '../lib/holistic-support/native-secretary.mjs';
import {classifyNativeSecretaryIntent} from '../lib/holistic-support/native-intent-model.mjs';
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
