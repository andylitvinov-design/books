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
 assert.match(voice,/if\(!value\)stopDialogue\(\)/);
 assert.match(voice,/if\(dialogueActive\.current&&!hadSpeech\)/);
 assert.match(voice,/if\(!supported\|\|!recognitionSupported\|\|!playbackConsent\|\|!sttConsent\)/);
 assert.match(chat,/if\(requiresProtectedReply\(text,locale\)\)voice\.stopDialogue\(\)/);
});

test('hands-free fail-closed preserves unsent speech on busy or no model consent',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const speech=source('components/voice-companion-controls.tsx');
 assert.match(chat,/if\(busy\|\|mode==="owned"&&!agree\)\{setDraft\(text\);voice\.stopDialogue\(\);return;\}/);
 assert.match(speech,/if\(!parts.length\)\{if\(dialogueActive\.current\)stopDialogue\(\);return;\}/);
 assert.match(speech,/if\(!result\?\.ok\)\{[\s\S]*?if\(dialogueActive\.current\)stopDialogue\(\);/);
 assert.match(speech,/if\(!supported\|\|!speaker\.current\)\{[\s\S]*?stopDialogue\(\);/);
});

test('every deliberate conversation exit terminates hands-free audio before continuing',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 const controls=source('components/voice-companion-controls.tsx');
 assert.match(chat,/function resetConversation\(\)\{voice\.stopDialogue\(\);[\s\S]*?controller\.current\?\.abort\(\);selectVoiceMessage\(null\);followTail\.current=true/);
 assert.doesNotMatch(chat,/onClick=\{\(\)=>\{voice\.stop\(\);controller\.current\?\.abort\(\);selectVoiceMessage\(null\)/);
 assert.match(chat,/<select value=\{mode\} onChange=\{event=>\{voice\.stopDialogue\(\);setMode\(/);
 assert.match(chat,/\{busy&&<button type="button" onClick=\{\(\)=>\{voice\.stopDialogue\(\);controller\.current\?\.abort\(\);\}\}/);
 assert.match(controls,/const stopDialogue=useCallback\(\(\)=>\{\s*dialogueActive\.current=false;dialogueOnTurn\.current=null;/);
 assert.match(controls,/if\(mounted\.current\)setConversing\(false\);\s*stop\(\);/);
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
 assert.match(voice,/const speak=useCallback\(\(text:string\)=>\{\s*if\(!enabled\)return;/);
 assert.match(voice,/const dictate=useCallback\(\(onTranscript:.*\)=>\{\s*if\(!enabled\)return;/);
 assert.match(voice,/const startDialogue=useCallback\(\(onTurn:.*\)=>\{\s*if\(!enabled\)return;/);
});

test('composer microphone owns AI voice turn, not the video recorder',()=>{
 const chat=source('components/holistic-agent-chat.tsx');
 assert.match(chat,/data-hh-conversation-mic/);
 assert.match(chat,/voice\.startDialogue\(text=>/);
 assert.match(chat,/setDraft\(text\);void sendTurn\(text\)/);
 assert.doesNotMatch(chat,/className=\{styles\.recorderToggle\}[\s\S]{0,90}onClick=\{\(\)=>setRecorderOpen/);
 assert.match(chat,/!messengerView\|\|recorderOpen/);
});
