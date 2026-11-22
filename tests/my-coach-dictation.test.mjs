import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {detectedSpeechLocale,chooseDictationLanguage,coachSpokenTurnLocale,readDictationResults,ios27NeedsSpeechRecovery,hasCoachSpokenAnswer} from '../lib/personal-coaching/my-coach-dictation.mjs'
import {appendSpokenAnswer} from '../lib/personal-coaching/speech-text.js'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('Fresh speech prioritizes page RU over an English iPhone; manual choice and prior transcript still win',()=>{
 assert.equal(chooseDictationLanguage({locale:'en',browserLanguages:['ru-RU','en-CA']}),'en-GB')
 assert.equal(chooseDictationLanguage({locale:'ru',browserLanguages:['en-US','ru-RU']}),'ru-RU')
 assert.equal(chooseDictationLanguage({locale:'auto',browserLanguages:['ru-RU','en-CA']}),'ru-RU')
 assert.equal(chooseDictationLanguage({locale:'en',browserLanguages:['en-US'],lastTranscript:'Я хочу поговорить'}),'ru-RU')
 assert.equal(chooseDictationLanguage({locale:'ru',browserLanguages:['ru-RU'],lastTranscript:'I want to talk'}),'en-GB')
 assert.equal(chooseDictationLanguage({locale:'en',selection:'ru',browserLanguages:['en-US']}),'ru-RU')
 assert.equal(chooseDictationLanguage({locale:'ru',selection:'en',browserLanguages:['ru-RU']}),'en-GB')
 assert.equal(chooseDictationLanguage({locale:'es'}),'es-ES')
})
test('explicit spoken locale beats wrong-script ASR and live RU/EN switch does not require Play again',()=>{
 assert.equal(coachSpokenTurnLocale({selection:'en',recognizedLanguage:'en-GB',transcript:'Мать селфи'}),'en')
 assert.equal(coachSpokenTurnLocale({selection:'ru',recognizedLanguage:'ru-RU',transcript:'Mother selfie'}),'ru')
 assert.equal(coachSpokenTurnLocale({selection:'auto',recognizedLanguage:'en-GB',transcript:'I want to talk'}),'en')
 assert.equal(coachSpokenTurnLocale({selection:'auto',recognizedLanguage:'ru-RU',transcript:'Хочу поговорить'}),'ru')
 const loop=source('components/my-coach-speech-loop.jsx')
 const ui=source('components/my-coach-live-dialogue.jsx')
 for(const token of ['speechLocaleRef.current=speechLocale',
   'selection:selectionAtRecognitionRef.current',
   'recognizedLanguageRef.current=recognition.lang',
   'if(heardRef.current.trim())return',
   'restartSilentRecognition(recognition)',
   'turnRef.current?.(text,{locale:utteranceLocale,'])assert.ok(loop.includes(token),token)
 assert.ok(loop.includes('onApprovedPhrase:(phrase,locale)=>offerEarlyPhrase'))
 assert.ok(ui.includes('utteranceLocale:spoken?.locale'))
 assert.ok(ui.includes("voiceTurn&&['en','ru','es'].includes(utteranceLocale)"))
 assert.ok(!ui.includes("disabled={voiceState.phase!=='idle'}>"),'the live language selector must never be disabled')
})

test('One shared coaching Brain gets text detected as Russian or English',()=>{
 assert.equal(detectedSpeechLocale('Мне тревожно','en'),'ru')
 assert.equal(detectedSpeechLocale('I feel anxious','ru'),'en')
 assert.equal(detectedSpeechLocale('¿Qué pasa?','en'),'es')
 assert.equal(detectedSpeechLocale('…','ru'),'ru')
})
test('Safari partial and final speech is visible and appendable in editable draft',()=>{
 const interim=readDictationResults([{isFinal:false,0:{transcript:'Мне важно'}}])
 assert.deepEqual(interim,{final:'',interim:'Мне важно',visible:'Мне важно'})
 const mixed=readDictationResults([{isFinal:true,0:{transcript:'Мне важно'}},{isFinal:false,0:{transcript:'сегодня поговорить'}}])
 assert.deepEqual(mixed,{final:'Мне важно',interim:'сегодня поговорить',visible:'Мне важно сегодня поговорить'})
 assert.equal(appendSpokenAnswer('Мне важно','сегодня поговорить',1200),'Мне важно сегодня поговорить')
 assert.equal(readDictationResults([{isFinal:true,0:{transcript:'  Hi  '}}]).final,'Hi')
})

test('the live microphone displays interim words in transcript only',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  const ui=source('components/my-coach-live-dialogue.jsx')
  for(const marker of [
    'readDictationResults(event.results,1200)',
    "changePhase('starting')",
    "recognition.onresult=event=>{",
    "recognition.interimResults=true",
    'transcriptRef.current?.(visible)',
    'lastHeardRef.current=finished',
    "event.error==='network'",
  ])assert.ok(loop.includes(marker),marker)
  assert.ok(ui.includes('onTranscript={setSpeechPreview}'))
  assert.ok(ui.includes('initialDraft={draft}'))
  assert.ok(ui.includes('speechLocale={speechLocale}'))
  assert.ok(ui.includes('locale:responseLocale,consent:true,message'))
  assert.ok(!loop.includes('MediaRecorder'))
  assert.ok(!loop.includes('audio-storyboard'))
  assert.ok(!loop.includes('sendBeacon'))
  assert.ok(!loop.includes('sessionStorage'))
})

test('iOS 27 recognizer recovery retains locale detection and re-primes after replies',()=>{
  const ios27={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/27.2 Mobile/15E148 Safari/604.1'}
  assert.equal(ios27NeedsSpeechRecovery(ios27),true)
  assert.equal(ios27NeedsSpeechRecovery({userAgent:ios27.userAgent.replace('Version/27.2','Version/26.6')}),false)
  assert.equal(ios27NeedsSpeechRecovery({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/27.2 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:0}),false)
  assert.equal(ios27NeedsSpeechRecovery({userAgent:'Mozilla/5.0 (iPhone) CriOS/156.0 Mobile Safari/604.1'}),false)
  const loop=source('components/my-coach-speech-loop.jsx')
  for(const marker of ['ios27NeedsSpeechRecovery(window.navigator)',
    'hasRecognizedRef.current','cue.onend=finishCue',
    'cue.onerror=failCue','recognition.continuous=false',
    'restartSilentRecognition(recognition)','settleTimerRef.current=setTimeout',
    'void deliver(appendSpokenAnswer(draftAtStartRef.current,heard,1200))',
    'iosResultTimerRef.current=setTimeout',
    'armSilentWatchdog(14000)','armSilentWatchdog(9000)',
    'cue.volume=0.2','cue.onend=finishCue','cue.onerror=failCue'])
    assert.ok(loop.includes(marker),marker)
})

test('a repeated user turn restarts recognition without any record/stop/transcribe tap',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  const start=loop.slice(loop.indexOf('function startListening(){'),loop.indexOf('async function deliver(text){'))
  assert.ok(start.includes('recognition.onresult=event=>{'))
  assert.ok(start.includes('recognition.onend=()=>{'))
  assert.ok(start.includes('restartSilentRecognitionAfterEnd()'))
  assert.ok(start.includes('settleTimerRef.current=setTimeout'))
  assert.ok(start.includes('void deliver(appendSpokenAnswer'))
  assert.ok(loop.includes('const afterSpeech=()=>{'))
  assert.ok(loop.includes('startListening()'))
  assert.ok(loop.includes('retryAttemptsRef.current>=3'))
  assert.ok(!loop.includes('stopRecordedTurn'))
  assert.ok(!loop.includes('recorder.start'))
  assert.ok(!loop.includes('MediaRecorder'))
  for(const phrase of ['Как ты себя чувствуешь','Мне спокойнее','Я хочу продолжить разговор']){
    const result=readDictationResults([{isFinal:false,0:{transcript:phrase}}])
    assert.equal(result.visible,phrase)
    assert.equal(appendSpokenAnswer('',result.visible,1200),phrase)
  }
})

test('recorded-audio uploads and extra consent gates are removed only from My Coach',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  const ui=source('components/my-coach-live-dialogue.jsx')
  const route=source('app/api/app/my-coach/voice/synthesize/route.js')
  assert.ok(!loop.includes('MediaRecorder'))
  assert.ok(!loop.includes('new File('))
  assert.ok(!loop.includes('FormData'))
  assert.ok(!loop.includes("fetch('/api/holistic-support/audio-storyboard'"))
  assert.ok(!ui.includes('recordingModeHint'))
  assert.ok(!ui.includes('checked={cloudAgreed}'))
  assert.ok(!ui.includes('<dialog'))
  assert.ok(ui.includes('onSessionStart={()=>setCloudAgreed(true)}'))
  assert.ok(ui.includes('voiceProviderDetails'))
  assert.ok(route.includes('normalizeMyCoachFishRequest'))
  assert.ok(route.includes('normalizeGoogleChirpInput'))
  assert.ok(!loop.includes('localStorage'))
})

test('Safari fragment watchdog and silence settle commit once automatically',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  const handler=loop.slice(loop.indexOf('recognition.onresult=event=>{'),loop.indexOf('recognition.onerror=event=>{'))
  assert.ok(handler.includes('iosResultTimerRef.current=setTimeout'))
  assert.ok(handler.includes('settleTimerRef.current=setTimeout'))
  assert.ok(handler.includes('recognition.onend=null'))
  assert.ok(handler.includes('lastHeardRef.current=heard'))
  assert.ok(handler.includes('void deliver(appendSpokenAnswer'))
  assert.ok(!handler.includes('changePhase(\'stalled\')'))
})


test('iOS 27 keeps recognized Safari voice sessions alive until natural onend',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 const onresult=loop.slice(loop.indexOf('recognition.onresult=event=>{'),loop.indexOf('recognition.onerror=event=>{'))
 const iosFallback=onresult.slice(onresult.indexOf('if(ios27&&visible){'),onresult.indexOf('// Dictation is shown'))
 assert.match(iosFallback,/draftRef\.current\?\.\(appendSpokenAnswer\(draftAtStartRef\.current,heard,1200\)\)/)
 assert.match(iosFallback,/transcriptRef\.current\?\.\(''\)/)
 assert.match(iosFallback,/setNotice\(t\.iosAwaitEnd\)/)
 assert.doesNotMatch(iosFallback,/recognition\.abort\(\)|void deliver\(/,'never cut recognized iOS voice or auto-send before natural end')
 const settle=onresult.slice(onresult.indexOf('if(visible){'),onresult.length)
 assert.match(settle,/if\(!ios27\)\{[\s\S]*?settleTimerRef\.current=setTimeout\(/)
 assert.match(loop,/recognition\.continuous=false/)
 const naturalEnd=loop.slice(loop.indexOf('recognition.onend=()=>{'),loop.indexOf('const startRecognition=()=>{'))
 assert.match(naturalEnd,/void deliver\(appendSpokenAnswer\(draftAtStartRef\.current,recovered,1200\)\)/)
 assert.ok(loop.includes('cue.onend=finishCue'),'every subsequent Safari session still waits for the short recovery cue')
 for(const marker of ['iosAwaitEnd:',"setNotice(t.iosAwaitEnd)"])assert.ok(loop.includes(marker))
});

test('hands-free voice uses live consent and never ends on a natural TTS outage',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  assert.ok(loop.includes('voiceConfigRef.current={cloudAgreed,cloudAvailable,cloudProvider,voiceName}'))
  const live=loop.slice(loop.indexOf('async function speakCoachReply('),loop.indexOf('function toggle(){'))
  assert.match(live,/cloudProvider:voiceProvider,voiceName:selectedVoice}=voiceConfigRef\.current/)
  assert.ok(live.includes('(naturalVoice||voiceAgreed)&&voiceAvailable'))
  for(const marker of ['provider:voiceProvider',"voiceProvider==='google_chirp3_hd'",
    "['fish_free','gemini_tts_free'].includes(voiceProvider)",
    'voiceName:selectedVoice'])assert.ok(live.includes(marker),marker)
  const fallback=live.slice(live.indexOf('function showTextOnly(){'),live.indexOf('// Never synthesize'))
  assert.ok(fallback.includes("if(result.mode==='safety'||result.mode==='boundary')"),
    'safety and boundary stops retain their original guard')
  assert.ok(fallback.includes('afterSpeech()'))
  assert.ok(fallback.includes('startListening()'))
  assert.ok(fallback.includes('setNotice(t.fallback)'))
  assert.doesNotMatch(fallback,/silence\(\)|changePhase\('idle'\)|introStartedRef\.current=false/)
  assert.ok(live.includes('afterSpeech()'),'a successful spoken reply must also auto-listen')
  assert.ok(loop.includes('cue.onend=finishCue'),'iOS 27 WebKit recovery remains')
})

test('model-turn failure re-arms microphone without re-tapping or retrying an external model',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  const deliver=loop.slice(loop.indexOf('async function deliver(text){'),
    loop.indexOf('async function speakCoachReply('))
  assert.ok(deliver.includes('if(!activeRef.current||generationRef.current!==generation)return'),
    'End/cancel during the network turn must suppress any microphone restart')
  const failure=deliver.slice(deliver.indexOf('if(!result?.reply){'),
    deliver.indexOf("heardRef.current=''",deliver.indexOf('if(!result?.reply){')))
  for(const statement of ['currentDraftRef.current=text',"draftRef.current?.(text)",
    "transcriptRef.current?.('')",'startListening()',"setNotice(t.failed)"])
    assert.ok(failure.includes(statement),statement)
  assert.doesNotMatch(failure,/silence\(\)|changePhase\('idle'\)|turnRef\.current|fetch\(|speakCoachReply\(/,
    'an unavailable model must not end the voice session or repeat a provider request')
  assert.ok(loop.includes("if(result.mode==='safety'||result.mode==='boundary'){"),
    'explicit safety/boundary stops still end the voice session')
  assert.ok(loop.includes("const afterSpeech=()=>{"),
    'successful spoken turns still resume listening automatically')
  for(const text of ['The microphone is listening again','Микрофон снова слушает',
    'El micrófono vuelve a escuchar'])
    assert.ok(loop.includes(text),text)
})

test('provider status changes during a natural voice reply preserve the active mic',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  const effect=loop.slice(loop.indexOf('  useEffect(()=>{\n    // A provider outage/revoked consent'),
    loop.indexOf('  // If Web Speech ends without words'))
  assert.ok(effect.includes("providerUnavailableRef.current?.()"))
  assert.doesNotMatch(effect,/stopRef\.current\?\.\(\)|silence\(\)|changePhase\('idle'\)/)
  const speech=loop.slice(loop.indexOf('async function speakCoachReply('),loop.indexOf('function toggle(){'))
  const callback=speech.slice(speech.indexOf('providerUnavailableRef.current=()=>{'),
    speech.indexOf('const fallback=()=>{'))
  assert.ok(callback.includes('if(live()&&!controller.signal.aborted)showTextOnly()'))
  const fallback=speech.slice(speech.indexOf('function showTextOnly(){'),
    speech.indexOf('// Never synthesize'))
  assert.ok(fallback.includes('providerUnavailableRef.current=null'))
  assert.ok(fallback.includes('startListening()'))
  assert.ok(speech.includes('providerUnavailableRef.current=null\n            cloudControllerRef.current=null'))
  for(const marker of ["if(result.mode==='safety'||result.mode==='boundary')",
    'recognition.continuous=false','cue.onend=finishCue'])
    assert.ok(loop.includes(marker),marker)
})

test('five synthetic speech fragments remain distinct across recognition turn parsing',()=>{
  const phrases=['Хочу обсудить мои цели','Я чувствую тревогу','Это происходит на работе',
    'Мне важно выбрать шаг','Завтра попробую это']
  const recognized=[]
  for(const phrase of phrases){
    const interim=readDictationResults([{isFinal:false,0:{transcript:phrase}}])
    const final=readDictationResults([{isFinal:true,0:{transcript:phrase}}])
    const repeated=readDictationResults([{isFinal:true,0:{transcript:phrase}}])
    assert.equal(interim.visible,phrase)
    assert.equal(final.visible,phrase)
    assert.equal(repeated.visible,phrase)
    recognized.push(appendSpokenAnswer('',final.visible,1200))
  }
  assert.deepEqual(recognized,phrases)
  assert.equal(new Set(recognized).size,5)
  // This is text parsing coverage, not a physical Safari five-turn voice E2E.
})

test('short yes/no/number answers are complete coaching turns, not missing speech',()=>{
 for(const words of ['Да','Да!','Не','Нет','No','NO!','Sí','¿Sí?','Si','ok','OK','5','42','yes','угу'])
  assert.equal(hasCoachSpokenAnswer(words),true,words)
 for(const noise of ['',' ','.','?','а','я','I','…','!!','  ,  '])
  assert.equal(hasCoachSpokenAnswer(noise),false,noise)
 const sourceText=source('components/my-coach-speech-loop.jsx')
 const onend=sourceText.slice(sourceText.indexOf('recognition.onend=()=>{'),
  sourceText.indexOf('const startRecognition=()=>{'))
 assert.ok(onend.includes('if(hasCoachSpokenAnswer(finished))'))
 assert.ok(onend.includes('if(hasCoachSpokenAnswer(recovered))'))
 const iosWatchdog=sourceText.slice(sourceText.indexOf('if(ios27&&visible){'),
  sourceText.indexOf('// Dictation is shown'))
 assert.ok(iosWatchdog.includes('hasCoachSpokenAnswer(heard)'))
 assert.doesNotMatch(iosWatchdog,/restartSilentRecognition\(recognition\)|recognition\.abort\(\)/,
  'iOS never aborts a recognized short utterance before natural onend')
})


test('Safari audio-capture recovers while denied and missing devices fail clearly',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 assert.ok(loop.includes("if(event.error==='audio-capture'){"))
 assert.ok(loop.includes("restartSilentRecognition(recognition,'capture')"))
 assert.ok(loop.includes("const permissionRequest=microphonePermissionRef.current"))
 assert.ok(loop.includes("void permissionRequest.then(begin,begin)"))
 assert.ok(loop.includes("reason==='capture'?[800,1500,2600]"))
 assert.ok(!loop.includes("event.error==='audio-capture'?t.noMicrophone"))
 for(const message of ["captureRetry:'","captureFailed:'"])assert.equal(loop.split(message).length,4)
})

test('iOS 27 Safari installed PWA without Version UA gets WebKit speech recovery',()=>{
 assert.equal(ios27NeedsSpeechRecovery({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 27_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'}),true)
 assert.equal(ios27NeedsSpeechRecovery({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 27_2 like Mac OS X) AppleWebKit/605.1.15 CriOS/150.0 Mobile'}),false)
})

test('toolbar language setting controls transcription, response, persona intro and natural voice',()=>{
 const ui=source('components/my-coach-live-dialogue.jsx')
 const loop=source('components/my-coach-speech-loop.jsx')
 const css=source('components/my-coach-live-dialogue.module.css')
 assert.ok(ui.includes('data-coach-language-control'))
 assert.ok(ui.includes('<Languages size={16}'))
 assert.ok(ui.includes('value={speechLocale}'))
 assert.ok(ui.includes('onChange={event=>setSpeechLocale(event.target.value)}'))
 // The route language wins on entry; changing the toolbar is an explicit override.
 for(const language of ['en','ru','es'])
   assert.ok(ui.includes('<option value="'+language+'">'+language.toUpperCase()+'</option>'))
 assert.ok(ui.includes('const [speechLocale,setSpeechLocale]=useState(lang)'))
 assert.ok(ui.includes('useEffect(()=>{setSpeechLocale(lang)},[lang])'))
 assert.ok(ui.includes("const conversationLang=['en','ru','es'].includes(speechLocale)?speechLocale:lang"))
 assert.ok(!ui.includes('setDeviceSpeechLocale('))
 assert.ok(!ui.includes('<option value="auto">'))
 assert.ok(ui.includes('locale={conversationLang} speechLocale={speechLocale}'))
 assert.ok(ui.includes('getCoachPresentation(personaId,conversationLang)?.text'))
 assert.ok(ui.includes('coachIntroAudioPath(personaId,conversationLang)'))
 assert.ok(ui.includes("?utteranceLocale:['en','ru','es'].includes(speechLocale)"))
 assert.ok(ui.includes("role:'assistant',content:answer,locale:responseLocale"))
 assert.ok(ui.includes('locale:latestCoachTurn?.locale||detectedSpeechLocale(spoken,conversationLang)'))
 assert.ok(!ui.includes('className={styles.transcriptLanguage}'))
 assert.ok(css.includes('.languageControl select'))
 assert.ok(css.includes('.captionMore'))
 assert.ok(loop.includes("['en','ru','es'].includes(result.locale)?result.locale"))
 assert.ok(loop.includes("['en','ru','es'].includes(speechLocaleRef.current)?speechLocaleRef.current"))
 assert.ok(loop.includes('recognition.lang=chooseDictationLanguage'))
 assert.ok(loop.includes('restartSilentRecognition(recognition)'))
})


test('My Coach entry inherits the site locale, with a visible manual RU/EN/ES override',()=>{
  const ui=source('components/my-coach-live-dialogue.jsx')
  const loop=source('components/my-coach-speech-loop.jsx')
  const css=source('components/my-coach-live-dialogue.module.css')
  assert.match(ui,/const \[speechLocale,setSpeechLocale\]=useState\(lang\)/)
  assert.match(ui,/useEffect\(\(\)=>\{setSpeechLocale\(lang\)\},\[lang\]\)/)
  assert.match(ui,/const conversationLang=\['en','ru','es'\]\.includes\(speechLocale\)\?speechLocale:lang/)
  assert.doesNotMatch(ui,/deviceSpeechLocale|setDeviceSpeechLocale|<option value="auto"/)
  assert.match(ui,/data-coach-language-control/)
  for(const language of ['en','ru','es'])
    assert.ok(ui.includes('<option value="'+language+'">'+language.toUpperCase()+'</option>'))
  assert.ok(ui.includes('locale={conversationLang} speechLocale={speechLocale}'))
  assert.ok(ui.includes('value={speechLocale}'))
  assert.ok(css.includes('font:800 12px/1.2 system-ui'))
  assert.ok(loop.includes('selection:speechLocaleRef.current'),
    'the explicit locale is forwarded to speech recognition')
  assert.ok(loop.includes('coachIntroAudioPath(personaId,lang)'),
    'the introduction MP3 path follows the selected locale')
  assert.ok(loop.includes('locale:replyLocale,personaId'),
    'TTS receives the same locale as the coach reply')
  for(const [locale,asr] of [['en','en-GB'],['ru','ru-RU'],['es','es-ES']])
    assert.equal(chooseDictationLanguage({locale,selection:locale,
      browserLanguages:['ru-RU','en-US','es-ES'],lastTranscript:'Мама'}),asr,
      'the route/manual selection wins over device language and old text')
})

test('approved one-row mobile voice: manual language in header, real volume, Text and End only',()=>{
 const ui=source('components/my-coach-live-dialogue.jsx')
 const css=source('components/my-coach-live-dialogue.module.css')
 const speech=source('components/my-coach-speech-loop.jsx')
 const recorded=source('lib/personal-coaching/coach-recorded-turn.mjs')
 const header=ui.slice(ui.indexOf('<header className={styles.sessionTopbar}>'),ui.indexOf('</header>'))
 const row=ui.slice(ui.indexOf('<div className={styles.voiceControls} data-coach-inline-voice>'),
   ui.indexOf('<p className={styles.voicePlayNotice}',ui.indexOf('data-coach-inline-voice')))
 assert.match(header,/data-coach-language-control/)
 assert.match(header,/value=\{speechLocale\}/)
 assert.doesNotMatch(header,/<option value="auto">/)
 assert.match(row,/data-coach-live-wave/)
 assert.match(row,/onMicLevel=\{level=>\{/)
 assert.match(row,/className=\{styles.keyboardControl\}/)
 assert.match(row,/className=\{styles.endControl\}/)
 assert.doesNotMatch(row,/replayControl|data-coach-language-control/)
 assert.match(css,/grid-template-columns:62px minmax\(0,1fr\) 50px 50px/)
 assert.match(css,/\.voicePlayNotice\{display:none\}/)
 assert.match(css,/\.voicePlayNotice\[data-coach-voice-consent-one-play\]\{[\s\S]*?display:block/)
 assert.match(ui,/data-coach-voice-consent-one-play/)
 assert.match(speech,/micLevelRef.current\?\.\(value\)/)
 assert.match(recorded,/onLevel\(Math.min\(1,Math.max\(0,\(rms-0.012\)\*7\)\)\)/)
})

test('Gemini Free retry preserves Basic audio until readiness and prefers duplex Live over separate text TTS',()=>{
  const ui=source('components/my-coach-live-dialogue.jsx')
  const toggle=ui.slice(ui.indexOf('data-coach-basic-pro-toggle'),
    ui.indexOf('data-coach-pro-same-tap-disclosure'))
  assert.match(ui,/async function readGeminiEngineStatus\(signal\)/)
  assert.match(ui,/if\(response\.status===401\)return \{kind:'login'\}/)
  assert.match(toggle,/onClick=\{async \(\)=>\{/)
  assert.ok(toggle.indexOf('if(selectedGeminiEngine){')<
    toggle.indexOf('if(geminiAvailabilityInFlightRef.current)return'))
  const fromProbe=toggle.indexOf('await readGeminiEngineStatus(checkController.signal)')
  const checked=toggle.indexOf('if(!status.capabilities.gemini_live_free&&!status.capabilities.gemini_free)')
  const selected=toggle.indexOf("setCoachEngine(chooseLive?'gemini_live_free':'gemini_free')")
  assert.ok(fromProbe>0&&checked>fromProbe&&selected>checked)
  const preflight=toggle.slice(toggle.indexOf('if(geminiAvailabilityInFlightRef.current)return'),checked)
  assert.doesNotMatch(preflight,/speechRef\.current\?\.stop\?\.\(\)|cancelPendingCoachTurn\(\)/,
    'failed metadata check must not stop Basic')
  const enabled=toggle.slice(checked)
  assert.match(enabled,/pauseForTypedTurn\?\.\(\)/)
  assert.match(enabled,/cancelPendingCoachTurn\(\)/)
  assert.match(enabled,/setGeminiConsent\(!chooseLive\)/)
  assert.match(enabled,/const chooseLive=status\.capabilities\.gemini_live_free===true/)
  assert.match(enabled,/setGeminiVoiceConsent\(freeTtsReady\)/)
  assert.match(enabled,/resumeAfterTypedFailure\?\.\(\)/)
  assert.doesNotMatch(ui,/data-coach-experience-consent|experienceTextConsent|experienceTtsConsent/)
})
test('iPhone 27 STT outage uses bounded recorded-mic recovery, never silent Web Speech',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 const recovery=loop.slice(loop.indexOf('function recoverRecordedStt('),loop.indexOf('  function startListening(){'))
 assert.match(loop,/if\(ios27&&coachRecordedSupported\(window\)\)/)
 assert.match(loop,/\['STT_UNAVAILABLE','STT_RATE_LIMIT','STT_SIGN_IN'\]\.includes\(code\)/)
 assert.match(recovery,/if\(recovery\.retries>=1\)/)
 assert.match(recovery,/changePhase\('ready'\)/)
 assert.match(recovery,/code==='STT_RATE_LIMIT'\?61000:2200/)
 assert.match(recovery,/phaseRef\.current==='starting'\)startListening\(\)/)
 assert.doesNotMatch(loop,/recordedSttUnavailableRef/)
})
