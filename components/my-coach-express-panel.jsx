'use client'
import {useState,useRef,useEffect} from 'react'
import Link from 'next/link'
import MyCoachGeminiLive from './my-coach-gemini-live'
import {CoachExpressCompletion} from './my-coach-express-intro'
import {expressCopy} from '@/lib/coaching/coach-express-intro.mjs'
const copy={
 en:{consent:'I agree to use Gemini Free for this short voice introduction. Google may use content to improve its models. Discuss general, nonpersonal topics only; do not share private, sensitive or confidential information.',stop:'End chat',back:'Back to greeting',time:'Time remaining',ended:'The voice connection ended. Return to the greeting to try again.'},
 ru:{consent:'Я согласен(на) на короткое голосовое знакомство через Gemini Free. Google может использовать содержание для улучшения моделей. Обсуждайте только общие, неличные темы; не сообщайте приватные, чувствительные или конфиденциальные данные.',stop:'Завершить чат',back:'К приветствию',time:'Осталось',ended:'Голосовая связь завершилась. Вернитесь к приветствию для повторной попытки.'},
 es:{consent:'Acepto usar Gemini Free para esta breve presentación por voz. Google puede usar el contenido para mejorar sus modelos. Habla solo de temas generales, no personales; no compartas información privada, sensible ni confidencial.',stop:'Finalizar chat',back:'Volver a la bienvenida',time:'Tiempo restante',ended:'La conexión de voz terminó. Vuelve a la bienvenida para intentarlo de nuevo.'}
}
export default function CoachExpressPanel({personaId,locale,name,voiceName,settings,onClose}){
 const t=copy[locale]||copy.en
 const voice=useRef(null),attempted=useRef(false)
 const [consent,setConsent]=useState(false),[phase,setPhase]=useState('idle'),[used,setUsed]=useState(false)
 const [deadline,setDeadline]=useState(null),[remaining,setRemaining]=useState(120),[completed,setCompleted]=useState(false)
 useEffect(()=>{if(!deadline)return;const tick=()=>setRemaining(Math.max(0,Math.ceil((deadline-Date.now())/1000)));tick();const interval=setInterval(tick,250);return()=>clearInterval(interval)},[deadline])
 function stop(){voice.current?.stop();onClose()}
 return <section data-coach-express-panel style={{padding:20,display:'grid',gap:14}}>
   <h2>{name} · {expressCopy(locale).button}</h2>
   <label><input type="checkbox" checked={consent} disabled={used} onChange={e=>setConsent(e.target.checked)}/> {t.consent}</label>
   <p role="status">{t.time}: {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</p>
   {!completed&&<MyCoachGeminiLive ref={voice} locale={locale} personaId={personaId} settings={settings} voiceName={voiceName}
     expressIntro enabled={consent} canStart={consent&&!used} onVoiceStateChange={({phase:next})=>{setPhase(next);if(next==='loading'&&!attempted.current){attempted.current=true;setUsed(true)}}}
     onSessionStart={end=>setDeadline(end)} onExpressDeadline={()=>setCompleted(true)}/>}
   {used&&phase==='idle'&&!completed&&<p role="status">{t.ended}</p>}
   <button type="button" onClick={stop}>{phase==='idle'?t.back:t.stop}</button>
   <Link href={'/'+locale+'/my-coach'}>{expressCopy(locale).other}</Link>
   <CoachExpressCompletion locale={locale} completed={completed} onStartCourse={onClose} onChooseCoach={()=>{window.location.assign('/'+locale+'/my-coach')}}/>
 </section>
}
