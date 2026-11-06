import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSpeechText,speechSegments,browserSpeechLanguage,chooseVoiceRoute} from '../lib/voice-companion/browser-voice.mjs';

test('Web speech is always off without a deliberate playback opt-in',()=>{
 assert.equal(chooseVoiceRoute({channel:'web'}),'text');
 assert.equal(chooseVoiceRoute({channel:'web',playbackConsent:true}),'browser-speech');
 assert.equal(chooseVoiceRoute({channel:'telegram',freeTierConfirmed:true,cloudConsent:true}),'text');
 assert.equal(chooseVoiceRoute({channel:'telegram',staticPhrase:true,freeTierConfirmed:true,cloudConsent:true}),'gemini-static');
 assert.equal(chooseVoiceRoute({channel:'telegram',staticPhrase:true,freeTierConfirmed:false,cloudConsent:true}),'text');
 assert.equal(chooseVoiceRoute({channel:'telegram',staticPhrase:true,freeTierConfirmed:true,cloudConsent:false}),'text');
});
test('Browser speech strips links, code fences and markup, not user content',()=>{
 const text='Привет **друг**! [test](https://example.com)\n```js\nprivate();\n```';
 const speech=prepareSpeechText(text);
 assert.match(speech,/Привет друг!/);
 assert.match(speech,/test/);
 assert.doesNotMatch(speech,/https:|private\(\)|```/);
});
test('Speech chunks preserve short and long text without dropping Unicode',()=>{
 for(const locale of ['ru','en','es'])assert.match(browserSpeechLanguage(locale),/^[a-z]{2}-[A-Z]{2}$/);
 const text='Спасибо. '.repeat(70);
 const chunks=speechSegments(text,105);
 assert.ok(chunks.length>3);
 assert.ok(chunks.every(chunk=>[...chunk].length<=110));
 assert.equal(chunks.join(' ').replace(/\s+/g,' '),prepareSpeechText(text).replace(/\s+/g,' '));
});

test('Supplementary-plane letters survive Safari chunk boundaries',()=>{
 const text='𐐷 '.repeat(210);
 const chunks=speechSegments(text,65);
 assert.ok(chunks.length>5);
 assert.ok(chunks.every(chunk=>![...chunk].includes('\uFFFD')));
 assert.equal(chunks.join(' ').replace(/\s+/g,''),prepareSpeechText(text).replace(/\s+/g,''));
});
