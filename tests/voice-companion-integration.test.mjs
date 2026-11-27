import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDeviceSpeech} from '../lib/assistant-avatar/device-speech.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Web/iHelp/Client share one canonical assistant and Web Voice UI',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const help=source('components/sitewide-ihelp.tsx');
 const avatar=source('components/app/emotional-avatar.tsx');
 const voice=source('components/voice-companion-controls.tsx');
 const client=source('components/app/messages-orders-clients.jsx');
 const workspace=source('components/app/messenger-ai-workspace.jsx');
 assert.match(chat,/useVoiceCompanion\(locale,voiceEnabled\)/);
 assert.match(chat,/VoiceCompanionControls/);
 assert.match(chat,/data-hh-voice-turn/);
 assert.match(chat,/companionVoice=\{voiceEnabled\?voice:undefined\}/);
 assert.match(chat,/voice\.autoRead/);
 assert.match(chat,/onTranscript=\{text=>setDraft/);
 assert.match(chat,/setMessages\(prev=>/);
 assert.match(chat,/voice\.stopDialogue\(\);controller\.current\?\.abort\(\)/);
 assert.match(avatar,/if\(externalSpeech\)return/);
 assert.match(voice,/createDeviceSpeech\(\(\)=>window\)/);
 assert.doesNotMatch(voice,/new SpeechSynthesisUtterance|window\.speechSynthesis/);
 assert.match(help,/<HolisticAgentChat locale=\{locale\} compact messengerView pageHelp=\{context\}/);
 assert.match(help,/hh:voice-companion-stop/);
 assert.match(client,/MessengerAiWorkspace/);
 assert.match(workspace,/<HolisticAgentChat locale=\{locale\} compact messengerView\s+authenticated=\{authenticated\}/);
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

test('explicit hands-free conversation stays inside original AI turn and stops safely',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const voice=source('components/voice-companion-controls.tsx');
 assert.match(chat,/onConversationTurn=\{text=>\{/);
 assert.match(chat,/void sendTurn\(text\)/);
 assert.match(chat,/voice\.autoRead\|\|voice\.conversing/);
 assert.match(voice,/data-hh-voice-conversation/);
 assert.match(voice,/dialogueActive\.current=false;dialogueOnTurn\.current=null/);
 assert.match(voice,/dialogueActive\.current&&!document\.hidden/);
 assert.match(voice,/if\(dialogueActive\.current&&!hadSpeech\)/);
 assert.match(voice,/if\(dialogueActive\.current&&!hadSpeech\)/);
 assert.match(voice,/if\(!supported\|\|\(!consentOnStart&&\(!playbackConsent\|\|!sttConsent\)\)\)/);
 assert.match(chat,/if\(requiresProtectedReply\(text,locale\)\)\{setAudioCallOpen\(false\);lukasRef\.current\?\.stop\(\);voice\.stopDialogue\(\);\}/);
});

test('hands-free fail-closed preserves unsent speech on busy or no model consent',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const speech=source('components/voice-companion-controls.tsx');
 assert.match(chat,/if\(busy\|\|mode==="owned"&&!agree\)\{setDraft\(text\);voice\.stopDialogue\(\);return;\}/);
 assert.match(speech,/if\(!parts.length\)\{if\(dialogueActive\.current\)stopDialogue\(\);return;\}/);
 assert.match(speech,/if\(!result\?\.ok&&seq===generation\.current\)\{[\s\S]*?outputFailed\(\);/);
 assert.match(speech,/const outputFailed=\(\)=>\{[\s\S]*?else\{if\(dialogueActive\.current\)stopDialogue\(\);/);
 assert.match(speech,/if\(!supported\|\|!speaker\.current\)\{[\s\S]*?stopDialogue\(\);/);
});

test('every deliberate conversation exit terminates hands-free audio before continuing',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const controls=source('components/voice-companion-controls.tsx');
 assert.match(chat,/function resetConversation\(\)\{[\s\S]*?voice\.stopDialogue\(\);[\s\S]*?controller\.current\?\.abort\(\);selectVoiceMessage\(null\);followTail\.current=true/);
 assert.doesNotMatch(chat,/onClick=\{\(\)=>\{voice\.stop\(\);controller\.current\?\.abort\(\);selectVoiceMessage\(null\)/);
 assert.match(chat,/<select value=\{mode\} onChange=\{event=>\{voice\.stopDialogue\(\);setMode\(/);
 assert.match(chat,/\{busy&&<button type="button" onClick=\{\(\)=>\{voice\.stopDialogue\(\);controller\.current\?\.abort\(\);\}\}/);
 assert.match(controls,/const stopDialogue=useCallback\(\(\)=>\{\s*dialogueActive\.current=false;dialogueOnTurn\.current=null;/);
 assert.match(controls,/if\(mounted\.current\)\{setConversing\(false\);setPaused\(false\);setNotice\(''\);setPhoneReplayAvailable\(false\);\}\s*stop\(\);/);
});

test('Voice Companion is fail-closed in production unless an explicit verified build flag enables it',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 assert.match(chat,/const voiceEnabled=process\.env\.NEXT_PUBLIC_HH_VOICE_COMPANION_WEB==="true";/);
 assert.doesNotMatch(chat,/NEXT_PUBLIC_HH_VOICE_COMPANION_WEB!=="false"/);
});

test('secure archive restore never auto-plays old assistant text or duplicates bot engines',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const voice=source('components/voice-companion-controls.tsx');
 assert.match(chat,/usePrivateChatHistory\(\{authenticated,onRestore:entries=>/);
 assert.match(chat,/voice\.stopDialogue\(\)/);
 assert.match(chat,/lastSpeechTurn\.current=previous\[previous\.length-1\]\|\|null/);
 assert.match(chat,/if\(authenticated\)void privateTranscript\.savePair\(text,reply\)/);
 assert.match(chat,/<SecureDialogueHistory history=\{privateTranscript\} locale=\{locale\}\/>/);
 assert.match(chat,/NEXT_PUBLIC_HH_VOICE_COMPANION_WEB==="true"/);
 assert.match(voice,/data-hh-voice-conversation/);
});

test('disabled Voice Companion never initializes browser audio, microphone detection or local preferences',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const voice=source('components/voice-companion-controls.tsx');
 assert.match(chat,/const voiceEnabled=process\.env\.NEXT_PUBLIC_HH_VOICE_COMPANION_WEB==="true";/);
 assert.match(chat,/useVoiceCompanion\(locale,voiceEnabled\)/);
 assert.match(voice,/export function useVoiceCompanion\(locale:PublicLocale,enabled=false\)/);
 assert.match(voice,/useEffect\(\(\)=>\{\s*if\(!enabled\)return;\s*mounted\.current=true;/);
 assert.match(voice,/useEffect\(\(\)=>\{\s*if\(!enabled\)return;\s*try\{\s*const value=JSON\.parse\(window\.localStorage/);
 assert.match(voice,/useEffect\(\(\)=>\{\s*if\(!enabled\|\|!prefsLoaded\)return;/);
 assert.match(voice,/const speak=useCallback\(\(text:string,explicitPlay=false,openingConsent=false\)=>\{\s*if\(!enabled\)return;/);
 assert.match(voice,/const dictate=useCallback\(\(onTranscript:.*\)=>\{\s*if\(!enabled\)return;/);
 assert.match(voice,/const startDialogue=useCallback\(\(onTurn:.*\)=>\{\s*if\(!enabled\|\|document\.hidden\)return false;/);
});

test('composer microphone owns AI voice turn, not the video recorder',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 assert.match(chat,/data-hh-conversation-mic/);
 assert.match(chat,/voice\.startDialogue\(text=>/);
 assert.match(chat,/setDraft\(text\);sendSelectedTurn\(text\)/);
 assert.doesNotMatch(chat,/className=\{styles\.recorderToggle\}[\s\S]{0,90}onClick=\{\(\)=>setRecorderOpen/);
 assert.match(chat,/!messengerView\|\|recorderOpen/);
});

test('iPhone Safari can use the same ephemeral recorded microphone capture as My Coach',()=>{
 const speech=source('components/voice-companion-controls.tsx');
 const chat=source('components/holistic-agent-chat.tsx');
 const recorder=source('lib/personal-coaching/coach-recorded-turn.mjs');
 const route=source('app/api/holistic-support/audio-storyboard/route.js');
 assert.match(speech,/ios27NeedsSpeechRecovery\(window\.navigator\)/);
 assert.match(speech,/coachRecordedSupported\(window\)/);
 assert.match(speech,/startCoachRecordedTurn\(/);
 assert.match(speech,/recordedPurpose\.current/);
 assert.match(speech,/const interruptReply=/);
 assert.match(speech,/recordedTurn\.current\?\.cancel\(\)/);
 assert.match(recorder,/purpose!=='public'/);
 assert.match(recorder,/body\.set\('consent','yes'\)/);
 assert.match(route,/if\(purpose==="my_coach"\)/);
 assert.match(route,/else if\(purpose==="ali_chat"\)/);
 assert.match(route,/createRequestAuth\(request,config\)\.verified\(\)/);
 assert.match(chat,/data-hh-ai-voice-consent/);
 assert.match(chat,/data-hh-ai-start-voice/);
 assert.match(chat,/data-hh-ai-stop-voice/);
 assert.match(chat,/data-hh-ai-voice-status/);
 assert.match(chat,/voice\.interruptReply\(\)/);
 assert.doesNotMatch(chat,/data-hh-conversation-mic[\s\S]{0,100}disabled=\{!voiceEnabled\|\|/);
});

test('phone replay is a user-gesture recovery of the same answer without a new AI turn',()=>{
 const voice=source('components/voice-companion-controls.tsx');
 const call=source('components/ali-audio-call.tsx');
 assert.match(call,/voice\.conversing&&voice\.phoneReplayAvailable&&!busy/);
 assert.match(call,/onClick=\{voice\.replayPhoneReply\}/);
 assert.match(voice,/phoneRetryVoice\.current=true;[\s\S]*?speak\(lastSpoken\.current,false,true\)/);
 assert.match(voice,/voiceURI:retryVoice\?'':normalizeDeviceVoiceId/);
 assert.match(voice,/if\(phone&&dialogueActive\.current\)\{[\s\S]*?setPhoneReplayAvailable\(true\)/);
 assert.match(voice,/if\(text\)\{hadSpeech=true;emptyListenRetries\.current=0;setPhoneReplayAvailable\(false\)/);
 assert.match(voice,/recordedTurn\.current=null;emptyListenRetries\.current=0;setRecording\(false\);setNotice\(''\);setPhoneReplayAvailable\(false\)/);
 assert.match(voice,/setPhoneReplayAvailable\(false\);stop\(\);\s*resumeDialogue\.current\?\.\(\)/);
});
test('shorter latency is scoped to phone conversation and preserves public dictation timing',()=>{
 const voice=source('components/voice-companion-controls.tsx');
 const recorder=source('lib/personal-coaching/coach-recorded-turn.mjs');
 assert.match(voice,/fastConversation:phoneCall\.current/);
 assert.match(voice,/\},phone\?160:450\)/);
 assert.match(recorder,/fastConversation\?\{silenceMs:750,longSilenceMs:1050,longSpeechAfterMs:6500\}:\{silenceMs:1050\}/);
});

test('owned queued speech timeout is bounded and permits fresh playback',()=>{
 let timerId=0,cancels=0,current;
 const timers=new Map(),events=[];
 const synth={pending:false,speaking:false,paused:false,getVoices:()=>[],
  speak(item){current=item;this.pending=true;},
  cancel(){cancels++;this.pending=false;current?.onerror?.();}};
 const env={speechSynthesis:synth,SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},
  setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},
  clearTimeout(id){timers.delete(id);}};
 const speech=createDeviceSpeech(env);
 assert.equal(speech.speak('first','en',{onEnd:reason=>events.push(reason)},{startTimeoutMs:4000}).ok,true);
 const stale=current;
 const timer=[...timers.values()].find(t=>t.ms===4000);
 assert.ok(timer);timer.fn();
 assert.equal(cancels,1);assert.deepEqual(events,['timeout']);assert.equal(synth.pending,false);
 assert.equal(stale.onstart,null);
 assert.equal(speech.speak('retry','en',{onStart:()=>events.push('start'),onEnd:reason=>events.push(reason)}).ok,true);
 synth.pending=false;synth.speaking=true;current.onstart();
 synth.speaking=false;current.onend();
 assert.deepEqual(events,['timeout','start','ended']);
 speech.destroy();
});
