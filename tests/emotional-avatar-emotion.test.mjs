import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAvatarEmotion} from '../lib/assistant-avatar/emotion-policy.mjs';

const scenarios=[
  ['ru','Мне сегодня очень тяжело','concerned'],
  ['ru','Сегодня мне немного лучше','warm'],
  ['ru','Хочу создать медитацию','curious'],
  ['ru','Я злюсь на всех','attentive'],
  ['ru','Мне не лучше','concerned'],
  ['ru','Мне одновременно радостно и страшно','attentive'],
  ['ru','Мне не страшно','neutral'],
  ['ru','Мне не страшно, мне радостно','warm'],
  ['en','I am not scared, I am happy','warm'],
  ['es','No tengo miedo, estoy feliz','warm'],
  ['ru','Мне страшно и радостно одновременно','attentive'],
  ['en','I am feeling better','warm'],
  ['en','I am not feeling better','concerned'],
  ['en','I am angry at everyone','attentive'],
  ['en','I am both happy and afraid','attentive'],
  ['en','I want to create a meditation','curious'],
  ['es','Me siento mejor','warm'],
  ['es','No estoy mejor','concerned'],
  ['es','Estoy feliz pero tengo miedo','attentive'],
  ['es','Quiero crear una meditación','curious'],
  ['es','Estoy enojado','attentive'],
  ['es','Quiero calmarme','grounded'],
  ['ru','У меня получилось','encouraging'],
  ['ru','Нужно разобраться','neutral'],
  ['en','What is your name?','neutral'],
  ['es','Tal vez sí o no','neutral'],
  ['ru','Я не хочу жить','neutral'],
  ['en','I might kill myself','neutral'],
  ['es','Ya no quiero vivir','neutral'],
];
for(const [locale,phrase,expected] of scenarios){
  test(`${locale}: ${phrase} → ${expected}`,()=>{
    const actual=classifyAvatarEmotion(phrase,locale);
    assert.equal(actual.emotion,expected);
    assert.ok(actual.confidence>=0&&actual.confidence<=1);
    assert.ok([0,1,2].includes(actual.intensity));
  });
}
test('pure, safe fallback; no state survives between users',()=>{
  const a=classifyAvatarEmotion('Мне лучше','ru');
  const b=classifyAvatarEmotion('Не знаю','ru');
  assert.equal(a.emotion,'warm');
  assert.equal(b.emotion,'neutral');
  assert.deepEqual(classifyAvatarEmotion('','ru'),{emotion:'neutral',confidence:0,intensity:0});
  assert.equal(classifyAvatarEmotion('I feel good','unsupported').emotion,'neutral');
});
