"use client";

/**
 * Optional device-local speech preview. No TTS API, audio download, voice
 * cloning, app-controlled upload or storage. Browser/OS voices may use network
 * services according to the browser vendor's policy; do not claim offline.
 */
import { useCallback, useEffect, useRef, useState } from "react";
type Locale="ru"|"en"|"es";
type Segment={id:string;text:string;optionalSilenceSeconds:number};
const copy={
  ru:{voice:"Голос устройства",start:"Прослушать на устройстве",
    stop:"Остановить",unavailable:"На этом устройстве нет доступной озвучки.",
    note:"Голос браузера; некоторые системные голоса могут использовать интернет. Качество зависит от устройства, паузы сокращены. MP3 не создан."},
  en:{voice:"Device voice",start:"Listen on this device",stop:"Stop",
    unavailable:"Speech is not available on this device.",
    note:"Browser voice; some system voices may use online services. Quality varies by device and pauses are shortened. No MP3 is created."},
  es:{voice:"Voz del dispositivo",start:"Escuchar en este dispositivo",stop:"Detener",
    unavailable:"La voz no está disponible en este dispositivo.",
    note:"Voz del navegador; algunas voces del sistema pueden usar servicios en línea. La calidad varía; pausas breves. No se crea un MP3."},
};
export function MeditationWriterDeviceVoice({locale,segments}:{
  locale:Locale;segments:Segment[];
}){
  const t=copy[locale];
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [voiceKey,setVoiceKey]=useState("");
  const [speaking,setSpeaking]=useState(false);
  const [error,setError]=useState("");
  const current=useRef(0);
  const active=useRef(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const stop=useCallback(()=>{
    active.current=false;
    if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}
    if(typeof window!=="undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    setSpeaking(false);
  },[]);
  useEffect(()=>{
    if(typeof window==="undefined" || !("speechSynthesis" in window))return;
    const synth=window.speechSynthesis;
    const refresh=()=>setVoices(synth.getVoices().filter(v=>v.lang.toLowerCase().startsWith(locale)));
    refresh();
    synth.addEventListener("voiceschanged",refresh);
    return ()=>{synth.removeEventListener("voiceschanged",refresh);synth.cancel();
      active.current=false;
      if(timer.current!==null)clearTimeout(timer.current);
    };
  },[locale]);
  useEffect(()=>()=>{active.current=false;
    if(timer.current!==null)clearTimeout(timer.current);
    if(typeof window!=="undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
  },[segments]);
  function start(){
    if(typeof window==="undefined" || !("speechSynthesis" in window)){
      setError(t.unavailable);return;
    }
    const synth=window.speechSynthesis;
    if(!segments.length){setError(t.unavailable);return;}
    stop();
    setError("");setSpeaking(true);active.current=true;current.current=0;
    const speakNext=()=>{
      if(!active.current)return;
      if(current.current>=segments.length){
        active.current=false;setSpeaking(false);return;
      }
      const s=segments[current.current];
      const utterance=new SpeechSynthesisUtterance(s.text);
      utterance.lang=locale==="ru"?"ru-RU":locale==="es"?"es-ES":"en-US";
      utterance.rate=.88;
      const selected=voices.find(v=>v.name+"::"+v.lang===voiceKey);
      if(selected)utterance.voice=selected;
      utterance.onend=()=>{
        if(!active.current)return;
        current.current+=1;
        const delay=Math.max(0,Math.min(5,s.optionalSilenceSeconds||0))*1000;
        timer.current=setTimeout(speakNext,delay);
      };
      utterance.onerror=()=>{
        if(!active.current)return;
        active.current=false;setSpeaking(false);setError(t.unavailable);
      };
      synth.speak(utterance);
    };
    speakNext();
  }
  return <div style={{borderTop:"1px solid #ccd8df",marginTop:20,paddingTop:18}}>
    {voices.length>0&&<label style={{display:"block",marginBottom:12,fontWeight:600}}>
      {t.voice}
      <select value={voiceKey} onChange={e=>setVoiceKey(e.target.value)}
        style={{display:"block",width:"100%",maxWidth:380,padding:10,borderRadius:9,
          border:"1px solid #9badb8",background:"#fff",color:"#173141",marginTop:8}}>
        <option value="">{t.voice}</option>
        {voices.map(v=><option key={v.name+"::"+v.lang} value={v.name+"::"+v.lang}>
          {v.name} ({v.lang})
        </option>)}
      </select>
    </label>}
    <button type="button" onClick={speaking?stop:start}
      style={{background:"#1f5260",color:"#fff",border:0,borderRadius:10,
        padding:"12px 18px",fontWeight:700,cursor:"pointer"}}>
      {speaking?t.stop:t.start}
    </button>
    {error&&<p role="alert" style={{color:"#9d2831"}}>{error}</p>}
    <p style={{fontSize:".88rem",color:"#526d7b"}}>{t.note}</p>
  </div>;
}
