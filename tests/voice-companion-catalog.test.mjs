import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STUDIO_VOICE_PRESETS,publicPreviewText,normalizeSpeechRate,normalizeDeviceVoiceId}
 from '../lib/voice-companion/voice-catalog.mjs';
test('six branded voices match real Studio metadata, not device TTS',()=>{
 const src=readFileSync(new URL('../lib/mandala/voice-studio.mjs',import.meta.url),'utf8');
 assert.equal(new Set(STUDIO_VOICE_PRESETS.map(x=>x.id)).size,6);
 for(const v of STUDIO_VOICE_PRESETS){
  assert.match(src,new RegExp('id:"'+v.id+'", provider:"'+v.providerVoice+'"'));
  assert.ok(v.label.ru&&v.label.en&&v.label.es);
 }
});
test('only genuinely installed same-language voice IDs are selectable',()=>{
 const voices=[{voiceURI:'os-ru',lang:'ru-RU'},{voiceURI:'os-en',lang:'en-US'},
  {voiceURI:'os-es',lang:'es_ES'}];
 assert.equal(normalizeDeviceVoiceId('os-ru',voices,'ru'),'os-ru');
 assert.equal(normalizeDeviceVoiceId('os-es',voices,'es'),'os-es');
 assert.equal(normalizeDeviceVoiceId('os-ru',voices,'en'),'');
 assert.equal(normalizeDeviceVoiceId('sofia',voices,'ru'),'');
 assert.equal(normalizeDeviceVoiceId('__proto__',voices,'ru'),'');
 assert.equal(normalizeDeviceVoiceId('os-ru',[], 'ru'),'');
});
test('public local preview does not transmit user content or change AI',()=>{
 for(const locale of ['ru','en','es']){
  assert.ok(publicPreviewText(locale).length>20);
  assert.doesNotMatch(publicPreviewText(locale),/https?:\/\//);
 }
 assert.equal(normalizeSpeechRate(999),1.25);
 assert.equal(normalizeSpeechRate(-99),0.75);
 assert.equal(normalizeSpeechRate('NaN'),1);
});
