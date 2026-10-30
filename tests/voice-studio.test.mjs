import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  VOICE_STUDIO_VOICES,VOICE_STUDIO_MODEL,VOICE_STUDIO_MAX_CHARS,VOICE_STUDIO_SAMPLE,
  voiceStudioReady,voiceStudioKey,findStudioVoice,validateStudioRequest,buildStudioPayload,studioExcerpt,
} from '../lib/mandala/voice-studio.mjs';

const get=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('six stable gender/pitch voices, RU and EN names, distinct Google voice IDs',()=>{
  assert.equal(VOICE_STUDIO_VOICES.length,6);
  assert.equal(new Set(VOICE_STUDIO_VOICES.map(v=>v.provider)).size,6);
  for(const gender of ['male','female']) {
    const members=VOICE_STUDIO_VOICES.filter(v=>v.gender===gender);
    assert.equal(members.length,3);
    assert.deepEqual(members.map(v=>v.pitch),['low','medium','high']);
  }
  for(const voice of VOICE_STUDIO_VOICES){
    assert.ok(voice.name.ru && voice.name.en && voice.name.es);
    assert.equal(findStudioVoice(voice.id),voice);
  }
});
test('free tier cannot activate on an unrelated Gemini key or billable defaults',()=>{
  assert.equal(VOICE_STUDIO_MODEL,'gemini-3.8-flash-lite-tts');
  assert.equal(voiceStudioReady({HH_COUNCIL_GEMINI_API_KEY:'other-secret'}),false);
  assert.equal(voiceStudioReady({HH_VOICE_STUDIO_ENABLED:'true',HH_VOICE_STUDIO_GEMINI_API_KEY:'super-secret-is-present'}),false);
  assert.equal(voiceStudioReady({HH_VOICE_STUDIO_ENABLED:'true',HH_VOICE_STUDIO_FREE_TIER_CONFIRMED:'true'}),false);
  assert.equal(voiceStudioReady({HH_VOICE_STUDIO_ENABLED:'true',HH_VOICE_STUDIO_FREE_TIER_CONFIRMED:'true',HH_VOICE_STUDIO_GEMINI_API_KEY:'super-secret-is-present'}),true);
  const approved={HH_VOICE_STUDIO_ENABLED:'true',HH_VOICE_STUDIO_FREE_TIER_CONFIRMED:'true',HH_VOICE_STUDIO_USE_EXISTING_COUNCIL_KEY:'true',HH_COUNCIL_GEMINI_API_KEY:'already-stored-server-key'};
  assert.equal(voiceStudioReady(approved),true);
  assert.equal(voiceStudioKey(approved),'already-stored-server-key');
  assert.equal(voiceStudioKey({...approved,HH_VOICE_STUDIO_USE_EXISTING_COUNCIL_KEY:'false'}),null);
  assert.equal(voiceStudioKey({...approved,HH_VOICE_STUDIO_FREE_TIER_CONFIRMED:'false'}),null);
  assert.equal(voiceStudioKey({...approved,HH_VOICE_STUDIO_ENABLED:'false'}),null);
  assert.equal(voiceStudioKey({...approved,HH_VOICE_STUDIO_GEMINI_API_KEY:'dedicated-valid-key'}),'dedicated-valid-key');

});
test('sample is server-owned; ignores attempts to inject personal text',()=>{
  for(const language of ['ru','en']) {
    const validated=validateStudioRequest({mode:'sample',voiceId:'mark',language});
    assert.equal(validated.text,VOICE_STUDIO_SAMPLE[language]);
    assert.throws(()=>validateStudioRequest({mode:'sample',voiceId:'mark',language,text:'my health data'}));
    assert.throws(()=>validateStudioRequest({mode:'sample',voiceId:'mark',language,consent:true}));
  }
});
test('invalid languages, unknown voices, additional fields and missing consent fail closed',()=>{
  assert.throws(()=>validateStudioRequest({mode:'sample',voiceId:'alien',language:'ru'}));
  assert.throws(()=>validateStudioRequest({mode:'sample',voiceId:'mark',language:'es'}));
  assert.throws(()=>validateStudioRequest({mode:'sample',voiceId:'mark',language:'en',provider:'paid'}));
  assert.throws(()=>validateStudioRequest({mode:'custom',voiceId:'mark',language:'en',text:'Hello',consent:false}));
  assert.throws(()=>validateStudioRequest({mode:'custom',voiceId:'mark',language:'en',text:'Hello'}));
  assert.throws(()=>validateStudioRequest({mode:'custom',voiceId:'mark',language:'en',text:'   ',consent:true}));
  assert.throws(()=>validateStudioRequest({mode:'custom',voiceId:'mark',language:'en',text:'x'.repeat(VOICE_STUDIO_MAX_CHARS+1),consent:true}));
  assert.throws(()=>validateStudioRequest({mode:'custom',voiceId:'mark',language:'en',text:'<xml>',consent:true}));
});
test('request speaks verbatim transcript via 3.8 Flash-Lite prebuilt voice and WAV',()=>{
  const input=validateStudioRequest({mode:'custom',voiceId:'maya',language:'ru',text:'Тихий свет и покой.',consent:true});
  const payload=buildStudioPayload(input);
  assert.deepEqual(payload.generationConfig.responseModalities,['AUDIO']);
  assert.equal(payload.generationConfig.responseFormat.audio.mimeType,'AUDIO_WAV');
  assert.equal(payload.generationConfig.speechConfig.voiceConfig.voice,'Sulafat');
  assert.equal(payload.contents[0].parts[0].text,input.text);
  assert.ok(payload.contents[0].parts[0].speech_metadata.style.includes('русском'));
  assert.equal(JSON.stringify(payload).includes('HH_COUNCIL_GEMINI_API_KEY'),false);
});
test('existing personal script is reduced to speech only, without metadata or pause instructions',()=>{
  const source=[
    'ПЕРСОНАЛЬНАЯ МЕДИТАЦИЯ · 5 мин',
    'Контекст · money · private data',
    'Почувствуйте опору под телом.',
    '[Пауза по желанию: 8 сек.]',
    'Мягко вернитесь в комнату.',
    'Текст для личной рефлексии, не медицинская рекомендация.'
  ].join('\n\n');
  const excerpt=studioExcerpt(source);
  assert.match(excerpt,/Почувствуйте/);
  assert.match(excerpt,/вернитесь/);
  assert.doesNotMatch(excerpt,/Контекст|Пауза|МЕДИТАЦИЯ|медицинская/);
  assert.ok(excerpt.length<=VOICE_STUDIO_MAX_CHARS);
});
test('real API route enforces origin, server auth for custom, durable quotas and provider-only WAV',()=>{
  const code=get('app/api/holistic-support/voice/route.js');
  assert.match(code,/voiceStudioReady\(process.env\)/);
  assert.match(code,/requireSameOrigin\(request,config\)/);
  assert.match(code,/auth\.verified\(\)/);
  assert.match(code,/consumeRate\(config/);
  assert.match(code,/voice-studio-free-global/);
  assert.match(code,/TTS_FREE_QUOTA_EXHAUSTED/);
  assert.match(code,/new NextResponse\(wav/);
  assert.match(code,/RIFF/);
  assert.match(code,/voiceStudioKey\(process\.env\)/);
  assert.doesNotMatch(code,/process\.env\.HH_COUNCIL_GEMINI_API_KEY/);
});
test('editor has a real cloud voice component and public route linked in all locales',()=>{
  const meditation=get('components/mandala-personal-meditation.tsx');
  const mandala=get('components/mandala-meditation-client.tsx');
  const standalone=get('app/[locale]/holistic-support/voice-studio/page.tsx');
  const client=get('components/mandala-cloud-voice-studio.tsx');
  const mix=get('lib/mandala/voice-audio-mix.ts');
  assert.match(meditation,/MandalaCloudVoiceStudio locale=\{locale\} sourceText=\{script\}/);
  assert.match(mandala,/holistic-support\/voice-studio/);
  assert.match(standalone,/PublicSiteHeader/);
  assert.match(standalone,/isPublicLocale/);
  assert.match(client,/VOICE_STUDIO_VOICES/);
  assert.match(client,/consent:true/);
  assert.match(client,/data-voice-studio-generate/);
  assert.match(client,/mixVoiceWithNature/);
  assert.match(mix,/mixPcmWavs/);
  assert.match(mix,/presetAudioUrl/);
});
