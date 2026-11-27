import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {startAliOwnerAudio} from '../lib/voice-companion/ali-owner-audio.mjs';
import {startAliCallBarge} from '../lib/voice-companion/ali-call-barge.mjs';
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
 assert.match(voice,/setPhoneReplayAvailable\(false\);phoneTurnReadyAt\.current=null;stop\(\);\s*resumeDialogue\.current\?\.\(\)/);
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

test('owner natural audio is explicitly consented, fresh and never a second assistant turn',()=>{
 const chat=source('components/holistic-agent-chat.tsx'),call=source('components/ali-audio-call.tsx');
 const voice=source('components/voice-companion-controls.tsx'),audio=source('lib/voice-companion/ali-owner-audio.mjs');
 assert.match(chat,/if\(!authenticated\|\|messages\.length!==0\|\|ownerAudioBlocked\|\|voice\.conversing\|\|voice\.paused\)return/);
 assert.match(chat,/ownerAudio&&phone&&authenticated&&!ownerAudioBlocked&&messages\.length===0/);
 assert.match(chat,/if\(voice\.ownerAudioActive\(\)\)\{voice\.stopDialogue\(\);return;\}/);
 assert.match(chat,/ownerAudioBlocked[\s\S]*?useAgentMemory\|\|useSavedTests\|\|useSavedHistory/);
 assert.match(call,/possible training use/);
 assert.match(call,/ownerReady&&ownerTestEligible&&onOwnerStart/);
 assert.match(voice,/closeOwnerAudio\(\); \/\/ Explicit local replay/);
 assert.match(audio,/freeOnly:true,nonSensitiveTest:true,privacyConsent:true,trainingConsent:true/);
 assert.doesNotMatch(audio,/localStorage|sessionStorage|sendSelectedTurn|gemini_tts_paid/);
});
test('real owner PCM output rejects digital silence and cancels stale completion',async()=>{
 const events=[],calls=[];
 const env={AbortController,setTimeout:()=>1,clearTimeout(){},fetch:async(url,init)=>{
  calls.push({url,body:JSON.parse(init.body)});
  return {ok:true,headers:{get:()=> 'audio/wav'},arrayBuffer:async()=>new ArrayBuffer(80)};
 }};
 let sourceNode;
 const context={state:'running',destination:{},decodeAudioData:async()=>({numberOfChannels:1,duration:1,getChannelData:()=>new Float32Array([0,0.1])}),
 createBufferSource:()=>sourceNode={connect(){},disconnect(){},start(){events.push('graph')},stop(){},onended:null}};
 const opts={environment:env,context,personaId:'max',locale:'en',text:'Hello',onStart:()=>events.push('start'),onEnd:()=>events.push('end'),onError:()=>events.push('error')};
 const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
 startAliOwnerAudio(opts);await flush();
 assert.deepEqual(events,['graph','start']);assert.equal(calls.length,1);
 assert.equal(calls[0].body.text,'Hello');
 sourceNode.onended();assert.deepEqual(events,['graph','start','end']);
 events.length=0;context.decodeAudioData=async()=>({numberOfChannels:1,duration:1,getChannelData:()=>new Float32Array([0,0])});
 startAliOwnerAudio(opts);await flush();assert.deepEqual(events,['error']);
 events.length=0;const cancelled=startAliOwnerAudio(opts);cancelled.cancel();await flush();
 assert.deepEqual(events,[]);assert.equal(calls.length,2);
});

test('call barge ownership is restricted to consented owner PCM and records no private timing payload',()=>{
 const voice=source('components/voice-companion-controls.tsx');
 const call=source('components/ali-audio-call.tsx');
 const recorder=source('lib/personal-coaching/coach-recorded-turn.mjs');
 assert.match(voice,/if\(phone&&ownerAudioPersona\.current&&!retryVoice\)/);
 assert.match(voice,/recordedSupported&&useRecordedDialogue\.current&&\s*recordedPurpose\.current==='ali_chat'&&setCoachIos27DuplexRoute/);
 assert.match(voice,/if\(monitor\?\.continueAfterCoach\(\)\)return/);
 assert.match(voice,/onEcho:\(\)=>\{if\(current\(\)\)\{clearIdle\(\);releaseMonitor\(\);setRecording\(false\);nextListen\(\);\}\}/);
 assert.match(voice,/markPhoneOutput\('pcm-graph'\)/);
 assert.match(voice,/markPhoneOutput\('device-speech-event'\)/);
 assert.match(voice,/performance\.measure\('hh-ali-text-to-'\+kind,\{start,end:window\.performance\.now\(\)\}\)/);
 assert.match(call,/voice\.speaking&&voice\.phoneAutoInterrupt/);
 assert.match(recorder,/const prefix=fastCoach\?'hh-coach':'hh-ali'/);
});

test('barge gate ducks only a candidate, then accepts exactly one human turn and no playback echo',()=>{
 const events=[];let opts,cancelled=0,continues=0,live=true;
 const startCapture=options=>{opts=options;return {cancel(){cancelled++},continueAfterCoach(){continues++;opts.onState('listening');return true}}};
 const monitor=startAliCallBarge({environment:{},context:{},locale:'en',
  spokenText:'Tell me what matters most to you about this situation today.',isCurrent:()=>live,startCapture,
  onReady:()=>events.push('ready'),onDuck:v=>events.push(v),onRecovering:()=>events.push('recover'),
  onInterrupt:()=>events.push('interrupt'),onListen:()=>events.push('listen'),
  onTranscribing:()=>events.push('stt'),onResult:t=>events.push(t),onEcho:()=>events.push('echo'),
  onFailure:(code,client)=>events.push([code,client])});
 assert.ok(monitor);assert.equal(opts.purpose,'ali_chat');assert.equal(opts.monitorPlayback,true);
 assert.equal(opts.textOnly,true);assert.equal(opts.fastConversation,true);
 opts.onState('listening');opts.onCandidate();opts.onCandidateExpired();opts.onState('recovering');
 opts.onState('listening');opts.onCandidate();opts.onSpeechDetected();opts.onSpeechDetected();
 opts.onState('hearing');opts.onState('transcribing');opts.onResult('I want to change jobs');opts.onResult('duplicate');
 assert.deepEqual(events,['ready',0.18,1,'recover','ready',0.18,'interrupt','listen','stt','I want to change jobs']);
 assert.equal(monitor.continueAfterCoach(),false);assert.equal(continues,0);assert.equal(cancelled,0);
 events.length=0;
 startAliCallBarge({environment:{},context:{},locale:'en',spokenText:'Tell me what matters most to you about this situation today.',
  isCurrent:()=>live,startCapture,onInterrupt:()=>events.push('interrupt'),onEcho:()=>events.push('echo'),onResult:t=>events.push(t)});
 opts.onSpeechDetected();opts.onResult('Tell me what matters most to you about this situation today.');
 assert.deepEqual(events,['interrupt','echo']);
});
test('uninterrupted playback transfers one existing capture; cancel and stale callbacks are inert',()=>{
 const events=[];let opts,cancelled=0,continues=0,live=true;
 const startCapture=o=>{opts=o;return {cancel(){cancelled++},continueAfterCoach(){continues++;opts.onState('listening');return true}}};
 const make=()=>startAliCallBarge({environment:{},context:{},locale:'ru',spokenText:'Привет, что хочешь обсудить?',
  isCurrent:()=>live,startCapture,onReady:()=>events.push('ready'),onListen:()=>events.push('listen'),
  onResult:t=>events.push(t),onEcho:()=>events.push('echo'),onFailure:(code,client)=>events.push([code,client])});
 const monitor=make();opts.onState('listening');assert.equal(monitor.continueAfterCoach(),true);
 opts.onResult('работа');opts.onResult('дубликат');assert.deepEqual(events,['ready','listen','работа']);
 assert.equal(continues,1);
 events.length=0;const cancelledMonitor=make();cancelledMonitor.cancel();opts.onSpeechDetected();opts.onResult('late');opts.onFailure('MIC_CAPTURE');
 assert.equal(cancelled,1);assert.deepEqual(events,[]);
 const stale=make();live=false;opts.onState('listening');opts.onResult('stale');assert.equal(stale.continueAfterCoach(),false);
 stale.cancel();assert.deepEqual(events,[]);assert.equal(cancelled,2);
 live=true;make();opts.onFailure('MIC_CAPTURE');assert.deepEqual(events,[['MIC_CAPTURE',false]]);
 events.length=0;const failure=make();failure.continueAfterCoach();opts.onFailure('STT_RATE_LIMIT');
 assert.deepEqual(events,['listen',['STT_RATE_LIMIT',true]]);
});
test('owner output gain only changes this graph and is retired on cancellation',async()=>{
 let gain,sourceNode,disconnects=0,stops=0;const events=[];
 const env={AbortController,setTimeout:()=>1,clearTimeout(){},fetch:async()=>({ok:true,headers:{get:()=> 'audio/wav'},arrayBuffer:async()=>new ArrayBuffer(80)})};
 const context={state:'running',destination:{},decodeAudioData:async()=>({numberOfChannels:1,duration:1,getChannelData:()=>new Float32Array([0,0.2])}),
  createGain:()=>gain={gain:{value:0},connect(){},disconnect(){disconnects++}},
  createBufferSource:()=>sourceNode={connect(target){assert.equal(target,gain)},disconnect(){disconnects++},start(){},stop(){stops++},onended:null}};
 const playback=startAliOwnerAudio({environment:env,context,personaId:'max',locale:'en',text:'Hello',onStart:()=>events.push('start'),onEnd:()=>events.push('end')});
 for(let i=0;i<12;i++)await Promise.resolve();
 assert.equal(gain.gain.value,1);playback.setVolume(0.18);assert.equal(gain.gain.value,0.18);
 playback.setVolume(4);assert.equal(gain.gain.value,1);playback.cancel();
 assert.equal(sourceNode.onended,null);assert.equal(stops,1);assert.equal(disconnects,2);assert.deepEqual(events,['start']);
});
