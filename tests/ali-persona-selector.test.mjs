import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {ALI_PERSONAS,ALI_DEFAULT_PERSONA_ID,ALI_PERSONA_STORAGE_KEY,
 getAliPersona,isAliPersonaId,aliPersonaGreeting} from '../lib/holistic-support/ali-personas.mjs'
import {ALI_GEMINI_GREETING_VOICES,aliGeminiGreetingVoice,
 synthesizeAliGeminiGreeting} from '../lib/holistic-support/ali-gemini-free-tts.mjs'
import {geminiCoachTtsConfig} from '../lib/coaching/gemini-coach-tts.mjs'
import {myCoachFishConfig} from '../lib/coaching/my-coach-fish-voice.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('four portrait choices: two male and two female with distinct preapproved voice IDs',()=>{
 assert.equal(ALI_PERSONAS.length,4)
 assert.equal(ALI_PERSONAS.filter(p=>p.gender==='male').length,2)
 assert.equal(ALI_PERSONAS.filter(p=>p.gender==='female').length,2)
 assert.deepEqual(new Set(ALI_PERSONAS.map(p=>p.id)).size,4)
 assert.equal(getAliPersona('bogus').id,ALI_DEFAULT_PERSONA_ID)
 assert.equal(isAliPersonaId('bogus'),false)
 assert.equal(isAliPersonaId('mira'),true)
 assert.equal(ALI_PERSONA_STORAGE_KEY,'hh:ai-chat-persona-v1')
 assert.equal(getAliPersona('alex').name.ru,'Самир','existing default guide now displays as Samir')
 for(const persona of ALI_PERSONAS){
  assert.ok(existsSync(new URL('../public'+persona.image,import.meta.url)),persona.image)
  for(const locale of ['ru','en','es']){
   assert.ok(persona.name[locale])
   assert.ok(persona.role[locale])
   const text=aliPersonaGreeting(persona.id,locale)
   assert.ok(text.includes(persona.name[locale]),'localized speaker name must be spoken')
   assert.ok(text.length>50&&text.length<500,'safe short fixed speech')
  }
 }
 const fish=source('lib/coaching/my-coach-fish-voice.mjs')
 const google=source('lib/coaching/my-coach-google-chirp.mjs')
 for(const persona of ALI_PERSONAS){
  assert.match(fish,new RegExp(persona.id+":'"))
  assert.match(google,new RegExp(persona.id+":'"))
 }
})

test('UI retains protected chat and history while exposing visible selectable voice samples',()=>{
 const header=source('components/app/messages-orders-clients.jsx')
 const picker=source('components/app/ali-persona-picker.jsx')
 const landing=source('components/app/messenger-ai-landing.tsx')
 const chat=source('components/holistic-agent-chat.tsx')
 const audio=source('components/app/ali-persona-audio.js')
 assert.match(header,/data-hh-ali-persona-open/)
 assert.match(header,/<AliPersonaPicker open=\{personaOpen\}/)
 assert.match(header,/<MessengerAiWorkspace key=\{aiSession\}/)
 assert.match(picker,/data-ali-voice-preview=\{persona.id\}/)
 assert.match(picker,/ALI_PERSONAS.map\(/)
 assert.match(picker,/role="dialog" aria-modal="true"/)
 assert.match(picker,/data-ali-persona-confirm/)
 assert.match(picker,/setCandidate\(persona.id\)/)
 assert.match(picker,/data-selected=\{candidate===persona.id\}/)
 assert.match(picker,/t.description\[persona.id\]/)
 assert.match(picker,/role="group" aria-label=\{t.heading\}/)

 assert.match(picker,/hh:messenger-open-history/)
 assert.match(landing,/data-hh-ai-persona-voice-play/)
 assert.match(landing,/playAliPersonaAudio\(persona.id,locale/)
 assert.match(landing,/data-hh-ai-intro-play onClick=\{start\}/)
 assert.match(chat,/src=\{persona.image\|\|/)
 assert.match(chat,/voice.setVoiceId\(selected\)/)
 // The unified Messenger removed the redundant animated avatar from its
 // composer. Its actual voice controller still uses the selected persona.
 assert.match(chat,/const \{persona\}=useAliPersona\(\)/)
 assert.match(chat,/ordered\[persona\.voice\.slot%ordered\.length\]\?\.voiceURI/)
 assert.match(chat,/voice\.setRate\(persona\.voice\.rate\)/)
 assert.match(chat,/aliGeminiRequest\(\{message:text,locale:turnLocale,personaId:persona\.id,/)
 assert.match(landing,/--hh-ai-persona-image/)
 const avatar=source('components/app/emotional-avatar.tsx')
 assert.match(avatar,/getAliPersona\(personaId\)/)
 assert.match(avatar,/rate:persona\?\.voice\.rate/)
 assert.match(audio,/window.speechSynthesis/)
 assert.doesNotMatch(audio,/JSON.stringify\(\{.*message/)
})

test('public natural voice route is fixed-content, rate-limited and does not accept private chat turns',()=>{
 const route=source('app/api/ali/voice/[locale]/[persona]/route.js')
 assert.match(route,/aliPersonaGreeting\(persona,locale\)/)
 assert.match(route,/url.search/)
 assert.match(route,/export async function HEAD/)
 assert.match(route,/my-coach-google-global/)
 assert.match(route,/my-coach-public-intro-global-day/)
 assert.match(route,/s-maxage=86400/)
 assert.doesNotMatch(route,/request.json\(/)
 assert.doesNotMatch(route,/searchParams.get\(/)
 const styles=source('components/app/ali-persona-picker.module.css')
 assert.match(styles,/\.grid\{display:flex;flex-direction:column/)
 assert.match(styles,/env\(safe-area-inset-top\)/)
 assert.match(styles,/max-height:100%/)
})


test('Home and existing Messenger share persona and natural greeting, not separate chat history',()=>{
 const home=source('components/home-dialogue-entry.tsx')
 const homeCss=source('components/home-dialogue-entry.module.css')
 const messages=source('components/app/messages-orders-clients.jsx')
 const picker=source('components/app/ali-persona-picker.jsx')
 for(const component of [home,messages])assert.match(component,/useAliPersona/)
 assert.match(home,/data-home-open-ali-persona/)
 assert.match(home,/data-home-ali-persona=\{persona.id\}/)
 assert.match(home,/data-home-ali-greeting-play/)
 assert.match(home,/playAliPersonaAudio\(persona.id,locale/)
 assert.match(home,/AliPersonaPicker open=\{personaOpen\}/)
 assert.match(home,/stageHomeAliHandoff\(window.sessionStorage/)
 assert.match(homeCss,/\.guideAudio\{/)
 assert.match(homeCss,/@media\(max-width:355px\)/)
 assert.match(picker,/hh:messenger-open-history/)
 assert.match(messages,/data-hh-ali-active-persona=\{persona.id\}/)
 assert.doesNotMatch(home,/<iframe|<video|fetch\(/)
});

test('approved location: Persona replaces history in Ali header, never the main top tabs',()=>{
 const header=source('components/app/messages-orders-clients.jsx')
 const css=source('components/app/messages-orders-clients.module.css')
 const tabs=header.slice(header.indexOf('data-chat-top-tabs'),header.indexOf('<header className={styles.head}'))
 assert.ok(tabs.includes('hh-orders-panel')&&tabs.includes('hh-clients-panel')&&tabs.includes('hh-news-panel'))
 assert.ok(!tabs.includes('data-hh-ali-persona-open'),'do not add Persona as a fifth top tab')
 assert.match(header,/data-hh-ali-active-persona=\{persona.id\}/)
 const actions=header.slice(header.indexOf('data-hh-ai-assistant-actions'),header.indexOf('<\/header>',header.indexOf('data-hh-ai-assistant-actions')))
 assert.ok(actions.indexOf('data-hh-messenger-language-switcher')<actions.indexOf('data-hh-ali-persona-open'))
 assert.ok(actions.indexOf('data-hh-ali-persona-open')<actions.indexOf('data-hh-ai-new-chat'))
 assert.match(actions,/styles.personaActionText/)
 assert.match(actions,/Персона/)
 assert.match(css,/button\[data-hh-ali-persona-open\]/)
 assert.match(css,/@media\(max-width:355px\)/)
});

test('mobile AI guide picker keeps all four cards compact and voice states truthful',()=>{
 const ui=source('components/app/ali-persona-picker.jsx')
 const css=source('components/app/ali-persona-picker.module.css')
 const audio=source('components/app/ali-persona-audio.js')
 assert.match(css,/@media \(max-width:520px\)/)
 assert.match(css,/\.choose img\{width:68px;height:72px/)
 assert.match(css,/\.listen\{width:calc\(100% - 76px\);min-height:42px/)
 assert.match(css,/max-height:calc\(100dvh/)
 assert.match(css,/overflow-y:auto/)
 assert.match(css,/max-height:720px/)
 assert.match(css,/max-height:590px/)
 assert.match(ui,/aria-busy=\{playing===persona.id&&audioPhase==='loading'\}/)
 assert.match(ui,/audioFailed===persona.id\?t.retry:t.listen/)
 assert.match(audio,/utterance\.onstart=/)
 assert.match(audio,/speech\.speaking\|\|speech\.pending/)
 assert.match(audio,/audio\.onplaying=/)
 assert.doesNotMatch(audio,/iOS&&hasDevice/)
 assert.match(audio,/onPlaying\(false,result\)/)
 assert.match(audio,/onFinish\('error'\)/)
 assert.match(audio,/method:'HEAD'/)
 assert.match(audio,/timer=window\.setTimeout\(fail,24000\)/)
 assert.doesNotMatch(audio,/audio\.play\(\)\s*;\s*speech\.speak/)
});

test('iPhone always prefers a real audible MP3 in the original user tap',()=>{
 const audio=source('components/app/ali-persona-audio.js')
 const route=source('app/api/ali/voice/[locale]/[persona]/route.js')
 assert.match(audio,/audio\.muted=false/)
 assert.match(audio,/audio\.volume=1/)
 assert.match(audio,/const attempt=audio\.play\(\)/)
 assert.doesNotMatch(audio,/naturalStatus/)
 assert.match(audio,/audio\.onplaying=\(\)=>/)
 assert.match(route,/Buffer\.from\(await upstream\.arrayBuffer\(\)\)/)
 assert.match(route,/'Content-Length':String\(audio.length\)/)
});

test('Ali Free Gemini voices preserve the owner-selected RU/EN identities after Fish expiry',async()=>{
 assert.deepEqual(Object.keys(ALI_GEMINI_GREETING_VOICES).sort(),['alex','max','mira','sofia'])
 const expected={
  alex:{ru:'Alnilam',en:'Charon'},
  max:{ru:'Orus',en:'Orus'},
  mira:{ru:'Erinome',en:'Gacrux'},
  sofia:{ru:'Vindemiatrix',en:'Sulafat'}
 }
 for(const [persona,voices] of Object.entries(expected)){
  for(const [locale,voice] of Object.entries(voices)){
   assert.equal(aliGeminiGreetingVoice(persona,locale),voice)
  }
  assert.ok(aliGeminiGreetingVoice(persona,'es'))
 }
 assert.equal(aliGeminiGreetingVoice('bogus','en'),null)
 assert.equal(aliGeminiGreetingVoice('mira','it'),null)
 const key='AIza'+'q'.repeat(30)
 const env={HH_GEMINI_FREE_API_KEY:key,HH_MY_COACH_GEMINI_TTS_FREE_ENABLED:'true',
  HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED:'true',
  HH_MY_COACH_GEMINI_FREE_DATA_APPROVED:'true'}
 const approved=geminiCoachTtsConfig(env,'gemini_tts_free')
 assert.equal(approved?.model,'gemini-3.8-flash-lite-tts')
 assert.equal(geminiCoachTtsConfig(env,'gemini_tts_paid'),null)
 const wav=Buffer.alloc(64)
 wav.write('RIFF',0);wav.write('WAVE',8)
 let requestBody
 const result=await synthesizeAliGeminiGreeting({
  config:approved,locale:'ru',personaId:'mira',
  text:aliPersonaGreeting('mira','ru'),
  fetcher:async(_url,options)=>{
   requestBody=JSON.parse(options.body)
   return {ok:true,status:200,json:async()=>({
    steps:[{type:'model_output',content:[{type:'audio',data:wav.toString('base64')}]}]
   })}
  }
 })
 assert.equal(result.toString('ascii',0,4),'RIFF')
 assert.equal(requestBody.store,false)
 assert.equal(requestBody.generation_config.speech_config[0].voice,'Erinome')
 // A new AI Studio Free Authorization key has AQ. prefix, not AIza.
 // The public fixed-greeting helper must accept it even before #5234 merges.
 const authKey='AQ.'+'q'.repeat(50)
 const auth=await synthesizeAliGeminiGreeting({
  config:{...approved,apiKey:authKey},locale:'ru',personaId:'mira',
  text:aliPersonaGreeting('mira','ru'),
  fetcher:async(_url,options)=>{
   assert.equal(options.headers['x-goog-api-key'],authKey)
   return {ok:true,status:200,json:async()=>({
    steps:[{type:'model_output',content:[{type:'audio',data:wav.toString('base64')}]}]
   })}
  }
 })
 assert.equal(auth.toString('ascii',0,4),'RIFF')
 await assert.rejects(()=>synthesizeAliGeminiGreeting({
  config:{...approved,apiKey:'AQ.'+'q'.repeat(49)},locale:'ru',personaId:'mira',
  text:aliPersonaGreeting('mira','ru')
 }),/ALI_GEMINI_GREETING_INVALID/)
 await assert.rejects(()=>synthesizeAliGeminiGreeting({
  config:approved,locale:'ru',personaId:'mira',text:'private user text'
 }),/ALI_GEMINI_GREETING_INVALID/)
 assert.equal(myCoachFishConfig({},Date.parse('2026-12-02T00:00:00Z')),null)
 const route=source('app/api/ali/voice/[locale]/[persona]/route.js')
 assert.match(route,/geminiCoachTtsConfig\(process\.env,'gemini_tts_free'\)/)
 assert.match(route,/my-coach-gemini_tts_free-global-day/)
 assert.match(route,/Content-Type':'audio\/wav'/)
 assert.match(route,/synthesizeAliGeminiGreeting/)
 assert.match(route,/geminiFailed\?9000:15000/)
 assert.doesNotMatch(route,/gemini_tts_paid|s2\.1-pro['"]/)
});

test('failed HEAD is retried and never cached across selected voice requests',async t=>{
 const code=source('components/app/ali-persona-audio.js').replace(
  "'@/lib/holistic-support/ali-personas.mjs'",
  JSON.stringify(new URL('../lib/holistic-support/ali-personas.mjs',import.meta.url).href))
 const {prepareAliNaturalVoice}=await import('data:text/javascript,'+encodeURIComponent(code))
 const previousWindow=globalThis.window,previousFetch=globalThis.fetch
 t.after(()=>{globalThis.window=previousWindow;globalThis.fetch=previousFetch})
 globalThis.window={setTimeout,clearTimeout}
 const calls=[]
 const answers=[false,false,true,false,true]
 globalThis.fetch=async(url,opts)=>{calls.push([url,opts.method,opts.cache]);return {ok:answers.shift()}}
 assert.equal(await prepareAliNaturalVoice('mira','ru'),false)
 assert.equal(await prepareAliNaturalVoice('mira','ru'),true)
 assert.equal(await prepareAliNaturalVoice('sofia','es'),true)
 assert.deepEqual(calls,[
  ['/api/ali/voice/ru/mira','HEAD','no-store'],
  ['/api/ali/voice/ru/mira','HEAD','no-store'],
  ['/api/ali/voice/ru/mira','HEAD','no-store'],
  ['/api/ali/voice/es/sofia','HEAD','no-store'],
  ['/api/ali/voice/es/sofia','HEAD','no-store'],
 ])
 const route=source('app/api/ali/voice/[locale]/[persona]/route.js')
 assert.match(route.slice(route.indexOf('export async function HEAD'),route.indexOf('export async function GET')),/'Cache-Control':'no-store'/)
})

test('iPhone retries media once, then device voice; next Play returns to natural audio',async t=>{
 const code=source('components/app/ali-persona-audio.js').replace(
  "'@/lib/holistic-support/ali-personas.mjs'",
  JSON.stringify(new URL('../lib/holistic-support/ali-personas.mjs',import.meta.url).href))
 const {playAliPersonaAudio,stopAliPersonaAudio}=await import('data:text/javascript,'+encodeURIComponent(code)+'#ios')
 const previousWindow=globalThis.window,previousFetch=globalThis.fetch
 t.after(()=>{stopAliPersonaAudio();globalThis.window=previousWindow;globalThis.fetch=previousFetch})
 let attempts=0,speechCalls=0,mediaReady=false
 const phases=[]
 class Audio{
  play(){attempts++;if(mediaReady){this.onplaying?.();return Promise.resolve()}
   return Promise.reject(Error('transient'))}
  pause(){} removeAttribute(){} load(){}
 }
 class Utterance{constructor(text){this.text=text}}
 globalThis.window={Audio,SpeechSynthesisUtterance:Utterance,navigator:{userAgent:'iPhone'},
  setTimeout,clearTimeout,speechSynthesis:{getVoices:()=>[],speak(utterance){
   speechCalls++;assert.equal(utterance.lang,'ru-RU');utterance.onstart?.();utterance.onend?.()
  }}}
 globalThis.fetch=async()=>({ok:mediaReady})
 playAliPersonaAudio('mira','ru',(playing,phase)=>phases.push(phase))
 assert.equal(attempts,1,'first Play is synchronous')
 await new Promise(resolve=>setImmediate(resolve))
 assert.equal(attempts,2)
 assert.equal(speechCalls,1)
 assert.deepEqual(phases,['loading','playing','ended'])
 mediaReady=true
 playAliPersonaAudio('mira','ru',(playing,phase)=>phases.push(phase))
 assert.equal(attempts,3)
 assert.equal(phases.at(-1),'playing')
 assert.equal(speechCalls,1)
 stopAliPersonaAudio()
})

test('same-origin microphone permission covers coach and dictation entry routes',()=>{
 const config=source('next.config.ts')
 for(const path of ['/','/ru','/es','/en/my-coach','/ru/coaching/sessions','/es/coaching/sessions','/es/app/coaching'])
  assert.ok(config.includes('"'+path+'"'),path)
 assert.ok(config.includes('camera=(), microphone=(self), geolocation=()'))
})
