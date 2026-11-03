"use client";
import {useEffect,useRef,useState} from "react";
import type {PointerEvent as ReactPointerEvent} from "react";
import {AudioLines,Film,Music2,Pause,Play,Plus,Type,ChevronLeft,ChevronRight} from "lucide-react";
import {moveTrackWindow,normalizeTrackWindow} from "@/lib/mandala/multitrack-timing.mjs";
import css from "./mandala-multitrack-timeline.module.css";

export type TimelineTextClip={id:string;text:string;startSeconds:number;endSeconds:number};
export type TimelineAudioClip={id:string;label:string;startSeconds:number;endSeconds:number};
type Shot={id:string;label:string;durationSeconds:number;poster?:string};
type Props={
 locale:"ru"|"en"|"es";duration:number;shots:readonly Shot[];
 texts:readonly TimelineTextClip[];audios:readonly TimelineAudioClip[];
 playhead:number;playing:boolean;disabled:boolean;canCreate:boolean;
 onSeek:(seconds:number)=>void;onPreview:()=>void;onCreate:()=>void;
 onAddFootage:()=>void;onReorderShot:(index:number,delta:-1|1)=>void;
 onShiftCut:(index:number,delta:-1|1)=>void;
 onAddText:()=>void;onChangeText:(id:string,change:Partial<TimelineTextClip>)=>void;
 onDeleteText:(id:string)=>void;onOpenAudio:()=>void;
 onChangeAudio:(id:string,startSeconds:number,endSeconds:number)=>void;
};
const copy={
 ru:{title:"Монтаж по дорожкам",video:"Видео",text:"Текст",audio:"Звук",choose:"Выбрать видеосюжет",emptyText:"Нажмите + Текст",emptyAudio:"Добавьте музыку или голос",caption:"Надпись",start:"Начало",end:"Конец",remove:"Удалить",preview:"Предпросмотр",create:"Создать видео",move:"Время",cut:"Стык",help:"Перемещайте блоки пальцем или ползунками. Сцены идут без чёрных промежутков."},
 en:{title:"Multi-track montage",video:"Video",text:"Text",audio:"Audio",choose:"Choose a video storyboard",emptyText:"Tap + Text",emptyAudio:"Attach music or narration",caption:"Caption",start:"Start",end:"End",remove:"Remove",preview:"Preview",create:"Create video",move:"Time",cut:"Cut",help:"Drag clips or use sliders. Film shots remain contiguous with no black gaps."},
 es:{title:"Montaje por pistas",video:"Vídeo",text:"Texto",audio:"Audio",choose:"Elegir escenas",emptyText:"Pulsa + Texto",emptyAudio:"Añade música o voz",caption:"Texto",start:"Inicio",end:"Fin",remove:"Quitar",preview:"Vista previa",create:"Crear vídeo",move:"Tiempo",cut:"Corte",help:"Arrastra bloques o usa los controles. Las escenas no dejan huecos."}
};
type Drag={kind:"video"|"text"|"audio";id:string;index:number;pointerId:number;x:number;left:number;width:number;start:number;end:number};
const time=(n:number)=>"0:"+String(Math.floor(n)).padStart(2,"0")+(n%1?".5":"");
export function MandalaMultitrackTimeline(p:Props){
 const {locale,duration,shots,texts,audios,playhead,playing,disabled,canCreate,onSeek,onPreview,onCreate,
  onAddFootage,onReorderShot,onShiftCut,onAddText,onChangeText,onDeleteText,onOpenAudio,onChangeAudio}=p;
 const t=copy[locale];
 const [selectedText,setSelectedText]=useState<string|null>(null);
 const [selectedAudio,setSelectedAudio]=useState<string|null>(null);
 const [selectedKind,setSelectedKind]=useState<"none"|"text"|"audio">("none");
 const dragRef=useRef<Drag|null>(null);
 useEffect(()=>{if(texts.length&&!texts.some(x=>x.id===selectedText)){
   setSelectedText(texts[texts.length-1].id);setSelectedKind("text");
  }
  if(!texts.length&&selectedText)setSelectedText(null);
 },[texts,selectedText]);
 useEffect(()=>{if(audios.length&&!audios.some(x=>x.id===selectedAudio)){
   setSelectedAudio(audios[0].id);setSelectedKind(kind=>kind==="none"?"audio":kind);
  }
  if(!audios.length&&selectedAudio)setSelectedAudio(null);
 },[audios,selectedAudio]);
 const chosenText=texts.find(x=>x.id===selectedText);
 const chosenAudio=audios.find(x=>x.id===selectedAudio);
 function dragBegin(e:ReactPointerEvent<HTMLButtonElement>,kind:Drag["kind"],id:string,index:number,start:number,end:number){
  if(disabled||(e.pointerType==="mouse"&&e.button!==0))return;
  const rect=e.currentTarget.parentElement?.getBoundingClientRect();if(!rect||!rect.width)return;
  dragRef.current={kind,id,index,pointerId:e.pointerId,x:e.clientX,left:rect.left,width:rect.width,start,end};
  e.currentTarget.setPointerCapture(e.pointerId);
 }
 function dragEnd(e:ReactPointerEvent<HTMLButtonElement>){
  const d=dragRef.current;if(!d||e.pointerId!==d.pointerId)return;
  dragRef.current=null;if(Math.abs(e.clientX-d.x)<7)return;
  if(d.kind==="video"){
   const second=Math.max(0,Math.min(duration-.001,(e.clientX-d.left)/d.width*duration));
   let cumulative=0;
   const target=Math.max(0,shots.findIndex(shot=>{
     cumulative+=shot.durationSeconds;return second<cumulative;
   }));
   for(let i=d.index;i<target;i++)onReorderShot(i,1);
   for(let i=d.index;i>target;i--)onReorderShot(i,-1);
  }else{
   const value=moveTrackWindow({startSeconds:d.start,endSeconds:d.end},d.start+(e.clientX-d.x)/d.width*duration,duration);
   if(d.kind==="text"){onChangeText(d.id,value);setSelectedText(d.id);setSelectedKind("text");}
   else {onChangeAudio(d.id,value.startSeconds,value.endSeconds);setSelectedAudio(d.id);setSelectedKind("audio");}
  }
 }
 const left=(n:number)=>100*Math.max(0,Math.min(duration,n))/Math.max(.5,duration)+"%";
 const width=(a:number,b:number)=>100*Math.max(.5,b-a)/Math.max(.5,duration)+"%";
 const trackWindow=(a:number,b:number)=>normalizeTrackWindow(a,b,duration);
 return <section className={css.root} data-video-multitrack-editor data-video-editor-timeline aria-label={t.title}>
  <div className={css.heading}>
   <h3><Film size={18} aria-hidden="true"/>{t.title}</h3>
   <div className={css.addActions}>
    <button type="button" onClick={onAddFootage} disabled={disabled} data-montage-add-video><Plus size={14}/>{t.video}</button>
    <button type="button" onClick={onAddText} disabled={disabled||texts.length>=8} data-montage-add-text><Plus size={14}/>{t.text}</button>
    <button type="button" onClick={onOpenAudio} disabled={disabled} data-montage-add-audio><Plus size={14}/>{t.audio}</button>
   </div>
  </div>
  <div className={css.playControls}>
   <button type="button" onClick={onPreview} disabled={disabled} aria-label={t.preview} data-montage-preview>
    {playing?<Pause size={19} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}
   </button>
   <strong>{time(playhead)} <span>/ {time(duration)}</span></strong>
  </div>
  <div className={css.ruler} data-montage-time-ruler>
   <input type="range" aria-label={t.move} min={0} max={duration} step={.5}
    value={Math.min(duration,Math.max(0,Math.round(playhead*2)/2))}
    onChange={e=>onSeek(Number(e.currentTarget.value))} disabled={disabled}/>
   <div className={css.ticks} aria-hidden="true">{[0,.25,.5,.75,1].map(f=><span key={f}>{Math.round(duration*f)}s</span>)}</div>
  </div>
  <div className={css.lanes} data-montage-track-lanes>
   <div className={css.laneRow}>
    <span className={css.laneLabel}><Film size={14}/>{t.video}</span>
    <div className={[css.lane,css.videoLane].join(" ")} data-montage-video-track>
     {shots.length?shots.map((shot,i)=><button key={shot.id+"-"+i} type="button"
      className={css.videoClip} style={{flexGrow:shot.durationSeconds}}
      disabled={disabled} title={shot.label+" · "+shot.durationSeconds+"s"}
      aria-label={shot.label+" "+(i+1)} data-montage-video-clip={shot.id}
      onPointerDown={e=>dragBegin(e,"video",shot.id,i,0,duration)}
      onPointerUp={dragEnd} onPointerCancel={()=>{dragRef.current=null;}}>
      {shot.poster?<>
       {/* eslint-disable-next-line @next/next/no-img-element */}
       <img src={shot.poster} alt="" loading="lazy"/>
      </>:null}
      <span>{i+1}</span><small>{shot.durationSeconds}s</small>
     </button>):<button type="button" className={css.emptyLane} onClick={onAddFootage} disabled={disabled}>{t.choose}</button>}
    </div>
   </div>
   <div className={css.laneRow}>
    <span className={css.laneLabel}><Type size={14}/>{t.text}</span>
    <div className={[css.lane,css.textLane].join(" ")} data-montage-text-track
      style={{height:Math.max(43,texts.length*36+7)}}>
     {texts.length?texts.map((clip,index)=><button key={clip.id} type="button"
      className={css.textClip} style={{left:left(clip.startSeconds),width:width(clip.startSeconds,clip.endSeconds),
       top:4+index*36,height:32,bottom:"auto"}}
      aria-pressed={selectedText===clip.id} disabled={disabled} title={clip.text||t.caption}
      onClick={()=>{setSelectedText(clip.id);setSelectedKind("text");}}
      onPointerDown={e=>dragBegin(e,"text",clip.id,0,clip.startSeconds,clip.endSeconds)}
      onPointerUp={dragEnd} onPointerCancel={()=>{dragRef.current=null;}}>
      <span>{clip.text||t.caption}</span>
     </button>):<button type="button" className={css.emptyLane} onClick={onAddText} disabled={disabled}>{t.emptyText}</button>}
    </div>
   </div>
   <div className={css.laneRow}>
    <span className={css.laneLabel}><AudioLines size={14}/>{t.audio}</span>
    <div className={[css.lane,css.audioLane].join(" ")} data-montage-audio-track
      style={{height:Math.max(43,audios.length*36+7)}}>
     {audios.length?audios.map((clip,index)=><button type="button" key={clip.id}
      className={css.audioClip} style={{left:left(clip.startSeconds),width:width(clip.startSeconds,clip.endSeconds),
       top:4+index*36,height:32,bottom:"auto"}}
      disabled={disabled} aria-pressed={selectedAudio===clip.id} title={clip.label}
      onClick={()=>{setSelectedAudio(clip.id);setSelectedKind("audio");}}
      onPointerDown={e=>dragBegin(e,"audio",clip.id,0,clip.startSeconds,clip.endSeconds)}
      onPointerUp={dragEnd} onPointerCancel={()=>{dragRef.current=null;}}>
      <Music2 size={12}/><span>{clip.label}</span>
     </button>):<button type="button" className={css.emptyLane} onClick={onOpenAudio} disabled={disabled}>{t.emptyAudio}</button>}
    </div>
   </div>
   <div className={css.cursor} style={{left:"calc(62px + (100% - 62px) * "+(Math.max(0,Math.min(duration,playhead))/Math.max(.5,duration))+")"}} aria-hidden="true"/>
  </div>
  {chosenText&&selectedKind==="text"?<div className={css.inspector} data-montage-text-inspector>
   <label className={css.textInput}>{t.caption}<input type="text" maxLength={96}
    value={chosenText.text} disabled={disabled} onChange={e=>onChangeText(chosenText.id,{text:e.currentTarget.value})}/></label>
   <div className={css.windowControls}>
    <label>{t.start} · {time(chosenText.startSeconds)}<input type="range" min={0} max={Math.max(0,duration-.5)} step={.5}
     value={chosenText.startSeconds} disabled={disabled}
     onChange={e=>onChangeText(chosenText.id,trackWindow(Number(e.currentTarget.value),chosenText.endSeconds))}/></label>
    <label>{t.end} · {time(chosenText.endSeconds)}<input type="range" min={.5} max={duration} step={.5}
     value={chosenText.endSeconds} disabled={disabled}
     onChange={e=>onChangeText(chosenText.id,trackWindow(chosenText.startSeconds,Number(e.currentTarget.value)))}/></label>
    <button type="button" onClick={()=>onDeleteText(chosenText.id)} disabled={disabled} data-montage-remove-text>{t.remove}</button>
   </div>
  </div>:null}
  {chosenAudio&&selectedKind==="audio"?<div className={css.inspector} data-montage-audio-inspector>
   <strong><Music2 size={14}/>{chosenAudio.label}</strong>
   <div className={css.windowControls}>
    <label>{t.start} · {time(chosenAudio.startSeconds)}<input type="range" min={0} max={Math.max(0,duration-.5)} step={.5}
     value={chosenAudio.startSeconds} disabled={disabled}
     onChange={e=>{const w=trackWindow(Number(e.currentTarget.value),chosenAudio.endSeconds);onChangeAudio(chosenAudio.id,w.startSeconds,w.endSeconds);}}/></label>
    <label>{t.end} · {time(chosenAudio.endSeconds)}<input type="range" min={.5} max={duration} step={.5}
     value={chosenAudio.endSeconds} disabled={disabled}
     onChange={e=>{const w=trackWindow(chosenAudio.startSeconds,Number(e.currentTarget.value));onChangeAudio(chosenAudio.id,w.startSeconds,w.endSeconds);}}/></label>
   </div>
  </div>:null}
  {shots.length>1?<div className={css.cutActions} data-montage-cut-controls>
   {shots.slice(0,-1).map((shot,i)=><div key={shot.id+"-cut-"+i}>
    <span>{t.cut} {i+1}</span>
    <button type="button" aria-label={t.cut+" "+(i+1)+" -1s"} disabled={disabled||shot.durationSeconds<=2} onClick={()=>onShiftCut(i,-1)}><ChevronLeft size={15}/></button>
    <button type="button" aria-label={t.cut+" "+(i+1)+" +1s"} disabled={disabled||shots[i+1].durationSeconds<=2} onClick={()=>onShiftCut(i,1)}><ChevronRight size={15}/></button>
   </div>)}
  </div>:null}
  <p className={css.help}>{t.help}</p>
  <div className={css.footer}>
   <button type="button" onClick={onPreview} disabled={disabled}><Play size={17}/>{t.preview}</button>
   <button type="button" className={css.primary} onClick={onCreate} disabled={!canCreate} data-montage-render><Film size={17}/>{t.create}</button>
  </div>
 </section>;
}
