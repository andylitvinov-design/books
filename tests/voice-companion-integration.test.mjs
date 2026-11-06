import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('web, iHelp and client AI reuse the SAME authoritative HolisticAgentChat',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const ihelp=source('components/sitewide-ihelp.tsx');
 const avatar=source('components/app/emotional-avatar.tsx');
 const speech=source('components/voice-companion-controls.tsx');
 const client=source('components/app/messages-orders-clients.jsx');
 const workspace=source('components/app/messenger-ai-workspace.jsx');
 assert.match(chat,/useVoiceCompanion\(locale\)/);
 assert.match(chat,/VoiceCompanionControls/);
 assert.match(chat,/data-hh-voice-turn/);
 assert.match(chat,/companionVoice=\{voiceEnabled\?voice:undefined\}/);
 assert.match(avatar,/if\(externalSpeech\)return/);
 assert.match(speech,/createDeviceSpeech\(\(\)=>window\)/);
 assert.doesNotMatch(speech,/new SpeechSynthesisUtterance|window\.speechSynthesis/);
 assert.match(chat,/voice\.autoRead/);
 assert.match(chat,/onTranscript=\{text=>setDraft/);
 assert.match(chat,/setMessages\(prev=>/);
 assert.match(ihelp,/<HolisticAgentChat locale=\{locale\} compact pageHelp=\{context\}/);
 assert.match(ihelp,/hh:voice-companion-stop/);
 assert.match(client,/MessengerAiWorkspace/);
 assert.match(workspace,/<HolisticAgentChat locale=\{locale\} compact authenticated=\{authenticated\}/);
});

test('outgoing Telegram voice is revocable, private-safe and restricted to public templates',()=>{
 const app=source('lib/app/subscriber-ai-telegram.js');
 const policy=source('lib/app/subscriber-ai-policy.mjs');
 const tts=source('lib/app/subscriber-ai-tts.mjs');
 const migration=source('supabase/migrations/20261106203000_hh_subscriber_ai_tts_consent_cache.sql');
 for(const required of ['tts_consent_at=null','tts_pending_at=null',"kind='tts_output'",
  "job.kind==='tts_output'",'subscriberTtsReady(env)','sendOneTts','subscriberTtsPhrase',
  'subscriber_ai_tts_file_cache','allow_paid_broadcast:false'])
  assert.ok(app.includes(required),required);
 for(const required of ['/speak','/speak_off','hhai:tts-agree','hhai:tts-off'])
  assert.ok(policy.includes(required),required);
 assert.match(tts,/Never pass user turns, profile, history/);
 assert.match(app,/if\(action==='tts-disable'&&await ttsRevocationColumns\(db\)\)/);
 assert.doesNotMatch(app,/if\(action==='tts-disable'&&ttsSchema\)/);
 assert.match(tts,/HH_SUBSCRIBER_AI_TTS_FREE_CONFIRMED/);
 assert.match(tts,/voiceStudioKey\(env\)/);
 assert.doesNotMatch(tts,/voiceStudioOpenRouterKey/);
 assert.match(migration,/force row level security/);
 assert.match(migration,/kind in \('open'/);
});

test('companion uses no new paid API or worker and leaves all original AI decisions intact',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const tts=source('lib/app/subscriber-ai-tts.mjs');
 const route=source('app/api/holistic-agent/turn/route.js');
 assert.match(chat,/fetch\("\/api\/holistic-agent\/turn"/);
 assert.match(route,/requireSameOrigin\(request,config\)/);
 assert.doesNotMatch(tts,/paid_backup|openrouter.*paid|buy.*credit|wallet|GPU/iu);
 assert.doesNotMatch(tts,/https:\/\/(?!api\.telegram\.org)/u);
});