import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Web/iHelp/Client share one canonical assistant and Web Voice UI',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const help=source('components/sitewide-ihelp.tsx');
 const avatar=source('components/app/emotional-avatar.tsx');
 const voice=source('components/voice-companion-controls.tsx');
 const client=source('components/app/messages-orders-clients.jsx');
 const workspace=source('components/app/messenger-ai-workspace.jsx');
 assert.match(chat,/useVoiceCompanion\(locale\)/);
 assert.match(chat,/VoiceCompanionControls/);
 assert.match(chat,/data-hh-voice-turn/);
 assert.match(chat,/companionVoice=\{voiceEnabled\?voice:undefined\}/);
 assert.match(chat,/voice\.autoRead/);
 assert.match(chat,/onTranscript=\{text=>setDraft/);
 assert.match(chat,/setMessages\(prev=>/);
 assert.match(chat,/voice\.stop\(\);controller\.current\?\.abort\(\)/);
 assert.match(avatar,/if\(externalSpeech\)return/);
 assert.match(voice,/createDeviceSpeech\(\(\)=>window\)/);
 assert.doesNotMatch(voice,/new SpeechSynthesisUtterance|window\.speechSynthesis/);
 assert.match(help,/<HolisticAgentChat locale=\{locale\} compact pageHelp=\{context\}/);
 assert.match(help,/hh:voice-companion-stop/);
 assert.match(client,/MessengerAiWorkspace/);
 assert.match(workspace,/<HolisticAgentChat locale=\{locale\} compact authenticated=\{authenticated\}/);
});
test('browser voice is consented, cancelable, and private turns never sent to TTS servers',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const speech=source('components/voice-companion-controls.tsx');
 const route=source('app/api/holistic-agent/turn/route.js');
 assert.match(chat,/fetch\("\/api\/holistic-agent\/turn"/);
 assert.match(route,/requireSameOrigin\(request,config\)/);
 for(const token of ['playbackConsent','sttConsent','captureGeneration','createRecognitionGate','speechSegments','setRecording(false)','speechLocale']){
  assert.ok(speech.includes(token),token);
 }
 assert.match(speech,/instance\.onresult=event/);
 assert.match(speech,/if\(!capture\.isActive\(\)\)return/);
 assert.match(speech,/normalizeDeviceVoiceId\(voiceId,voices,speechLocale\)/);
 assert.doesNotMatch(speech,/\bfetch\s*\(|https:\/\/.*(?:gemini|openai|elevenlabs)/);
});
test('web-only release contains no Telegram/outbox TTS migration',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const policy=source('lib/voice-companion/browser-voice.mjs');
 assert.match(policy,/createRecognitionGate/);
 assert.match(chat,/NEXT_PUBLIC_HH_VOICE_COMPANION_WEB/);
 const webChatPath=source('components/voice-companion-controls.tsx');
 assert.doesNotMatch(webChatPath,/HH_SUBSCRIBER_AI_TTS_ENABLED|sendVoice|subscriber_ai_tts_file_cache/);
});
