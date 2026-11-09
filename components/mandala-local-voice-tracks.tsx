"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, Mic, Play, Square, Trash2 } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { AffirmationVoiceResult } from "./mandala-affirmation-voice";
import css from "./mandala-affirmation-voice.module.css";

type Track={id:number;file:File;url:string;seconds:number};
const durationChoices=[10,20,30,60] as const;
const copy={
  ru:{record:"Записать трек",stop:"Завершить",recording:"Идёт запись…",
    saved:"Запись готова. Можно добавить в видео или записать следующую.",
    error:"Микрофон недоступен. Проверьте разрешения браузера.",
    bad:"Запись слишком короткая или превышает 15 МБ.",
    limit:"До 8 записей, каждая до 55 сек.",empty:"Запишите свой первый трек.",
    use:"В видео",remove:"Удалить",applied:"Эта дорожка прикреплена к видео.",
    approve:"Сначала подтвердите выбранные фразы.",
    note:"Записи хранятся только в этом сеансе браузера. Произнесённый текст не распознаётся автоматически.",
    name:"Мой трек"},
  en:{record:"Record track",stop:"Stop",recording:"Recording…",
    saved:"Recording ready. Add it to your video or record another.",
    error:"Microphone unavailable. Check browser permissions.",
    bad:"Recording is too short or larger than 15 MB.",
    limit:"Up to 8 recordings of 55 seconds.",empty:"Record your first track.",
    use:"Use in video",remove:"Delete",applied:"This track is attached to your video.",
    approve:"Approve the selected phrases first.",
    note:"Recordings stay in this browser session. Spoken words are not automatically transcribed.",
    name:"My track"},
  es:{record:"Grabar pista",stop:"Detener",recording:"Grabando…",
    saved:"Grabación lista. Añádela al vídeo o graba otra.",
    error:"Micrófono no disponible. Comprueba los permisos.",
    bad:"Grabación demasiado corta o de más de 15 MB.",
    limit:"Hasta 8 grabaciones de 55 segundos.",empty:"Graba tu primera pista.",
    use:"En el vídeo",remove:"Eliminar",applied:"La pista se añadió al vídeo.",
    approve:"Confirma primero las frases seleccionadas.",
    note:"Las grabaciones quedan en esta sesión del navegador. El texto hablado no se transcribe automáticamente.",
    name:"Mi pista"},
} as const;

export function MandalaLocalVoiceTracks({locale,disabled,approvalPending,hidden,onAttach,onDetach,compact=false,uploadAction}:{
  locale:PublicLocale;disabled:boolean;approvalPending:boolean;hidden:boolean;compact?:boolean;
  uploadAction?:ReactNode;
  onAttach:(result:AffirmationVoiceResult)=>void;onDetach?:(file:File)=>void;
}){
  const t=copy[locale];
  const [tracks,setTracks]=useState<Track[]>([]);
  const [recording,setRecording]=useState(false);
  const [selected,setSelected]=useState<number|null>(null);
  const [notice,setNotice]=useState("");
  const tracksRef=useRef<Track[]>([]);
  const sequence=useRef(0);
  const sessionRef=useRef<{
    recorder:MediaRecorder;stream:MediaStream;chunks:Blob[];
    startedAt:number;timeout:ReturnType<typeof setTimeout>;
  }|null>(null);
  tracksRef.current=tracks;
  useEffect(()=>()=> {
    const session=sessionRef.current;
    if(session){
      clearTimeout(session.timeout);
      session.recorder.onstop=null;
      if(session.recorder.state!=="inactive")session.recorder.stop();
      session.stream.getTracks().forEach(track=>track.stop());
    }
    for(const track of tracksRef.current)URL.revokeObjectURL(track.url);
  },[]);
  function stopRecording(){
    const current=sessionRef.current;
    if(current&&current.recorder.state!=="inactive")current.recorder.stop();
  }
  async function startRecording(){
    if(disabled||sessionRef.current||tracks.length>=8)return;
    if(typeof navigator==="undefined"||!navigator.mediaDevices?.getUserMedia||
      typeof MediaRecorder==="undefined"){setNotice(t.error);return;}
    let stream:MediaStream|null=null;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=["audio/mp4","audio/webm;codecs=opus","audio/webm"]
        .find(type=>MediaRecorder.isTypeSupported(type));
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
      const chunks:Blob[]=[];
      const session={recorder,stream,chunks,startedAt:performance.now(),
        timeout:setTimeout(()=>{if(recorder.state!=="inactive")recorder.stop();},55000)};
      sessionRef.current=session;
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onerror=()=>setNotice(t.error);
      recorder.onstop=()=>{
        clearTimeout(session.timeout);
        session.stream.getTracks().forEach(track=>track.stop());
        if(sessionRef.current!==session)return;
        sessionRef.current=null;
        setRecording(false);
        const seconds=Math.min(55,Math.max(0,(performance.now()-session.startedAt)/1000));
        const contentType=recorder.mimeType||mime||"audio/mp4";
        const ext=contentType.includes("webm")?"webm":"m4a";
        const id=++sequence.current;
        const file=new File(chunks,"holistic-house-voice-"+id+"."+ext,{type:contentType});
        if(seconds<0.5||file.size<128||file.size>15*1024*1024){setNotice(t.bad);return;}
        const url=URL.createObjectURL(file);
        setTracks(current=>[...current,{id,file,url,seconds}].slice(0,8));
        setNotice(t.saved);
      };
      recorder.start(250);
      setRecording(true);setNotice(t.recording);
    }catch{
      stream?.getTracks().forEach(track=>track.stop());
      setNotice(t.error);
    }
  }
  function selectRecordedTrack(track:Track){
    if(disabled||approvalPending){setNotice(t.approve);return;}
    const mixSeconds=durationChoices.find(n=>n>=Math.ceil(track.seconds+1))||60;
    onAttach({file:track.file,spokenText:"",voiceId:"local-"+track.id,language:locale,
      speechSeconds:track.seconds,mixSeconds,bed:"none",source:"local"});
    setSelected(track.id);setNotice(t.applied);
  }
  function removeTrack(id:number){
    const track=tracks.find(item=>item.id===id);
    if(!track)return;
    setTracks(current=>current.filter(item=>item.id!==id));
    onDetach?.(track.file);
    URL.revokeObjectURL(track.url);
    if(selected===id)setSelected(null);
  }
  return <section className={css.localTracks} hidden={hidden} data-video-own-voice
    aria-label={t.record}>
    <div className={css.localTop} data-ideas-own-voice-actions={compact?"true":undefined}>
      {compact?uploadAction:null}
      <button type="button" data-video-own-voice-record data-video-ideas-record-voice={compact?"":undefined}
        disabled={disabled||(!recording&&tracks.length>=8)} aria-pressed={recording}
        onClick={()=>recording?stopRecording():void startRecording()}>
        {recording?<Square size={20} aria-hidden="true"/>:<Mic size={20} aria-hidden="true"/>}
        {recording?t.stop:compact?(locale==="ru"?"Записать голос":locale==="es"?"Grabar voz":"Record a voice"):t.record}
      </button>
      {!compact?<small>{t.limit}</small>:null}
    </div>
    {compact?<small className={css.localLimit}>{t.limit}</small>:null}
    <p className={css.localHint}>{t.note}</p>
    {tracks.length===0?<p className={css.localEmpty}>{t.empty}</p>:<div className={css.localList}>
      {tracks.map(track=><div className={css.localItem} key={track.id}
        data-video-own-voice-track={track.id}>
        <div className={css.localItemTitle}><strong>{t.name} {track.id}</strong>
          <small>{Math.round(track.seconds)} s</small></div>
        <audio src={track.url} controls preload="metadata" aria-label={t.name+" "+track.id}/>
        <div className={css.localActions}>
          <button type="button" data-video-own-voice-attach={track.id}
            aria-pressed={selected===track.id} disabled={disabled||approvalPending}
            onClick={()=>selectRecordedTrack(track)}>
            {selected===track.id?<Check size={16} aria-hidden="true"/>:<Play size={16} aria-hidden="true"/>}
            {t.use}
          </button>
          <button type="button" disabled={disabled||recording}
            aria-label={t.remove+" "+t.name+" "+track.id}
            onClick={()=>removeTrack(track.id)}>
            <Trash2 size={17} aria-hidden="true"/>{t.remove}
          </button>
        </div>
      </div>)}
    </div>}
    {notice?<p className={css.localNotice} role="status" aria-live="polite">{notice}</p>:null}
  </section>;
}
