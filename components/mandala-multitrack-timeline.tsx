/* eslint-disable @next/next/no-img-element */
"use client";

import {useRef,useState} from "react";
import type {PointerEvent as ReactPointerEvent,KeyboardEvent as ReactKeyboardEvent} from "react";
import {Film,Music2,Pause,Play,Plus,Trash2,Type,Scissors,Copy,Magnet,ZoomIn,ZoomOut} from "lucide-react";
import {snapTimelineSecond} from "@/lib/mandala/editable-timeline.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-multitrack-timeline.module.css";

export type TimelineTextClip={
  id:string;
  text:string;
  startSeconds:number;
  durationSeconds:number;
};
export type TimelineTransition="soft"|"cut"|"fade_black"|"flash_white";
export type TimelineLook="original"|"warm"|"cool"|"dream";
export type TimelineShot={
  sceneId:string;
  title:string;
  poster?:string|null;
  transitionIn?:TimelineTransition;
  colorLook?:TimelineLook;
  startSeconds:number;
  durationSeconds:number;
};
export type TimelineAudioClip={label:string;startSeconds:number;durationSeconds:number};
type Props={
  locale:PublicLocale;
  seconds:number;
  shots:readonly TimelineShot[];
  captions:readonly TimelineTextClip[];
  audio:TimelineAudioClip|null;
  playheadSeconds:number;
  playing:boolean;
  disabled:boolean;
  onSeek:(seconds:number)=>void;
  onTogglePlay:()=>void;
  onAddVideo:()=>void;
  onMoveShot:(from:number,to:number)=>void;
  onResizeShot:(index:number,direction:-1|1)=>void;
  onAddCaption:()=>string;
  onSetCaption:(id:string,patch:Partial<Omit<TimelineTextClip,"id">>)=>void;
  onRemoveCaption:(id:string)=>void;
  onSplitCaption:(id:string,atSeconds:number)=>string;
  onDuplicateCaption:(id:string)=>string;
  onSetShotEffect?:(index:number,patch:{transitionIn?:TimelineTransition;colorLook?:TimelineLook})=>void;
  onOpenAudio:()=>void;
  onChangeAudioStart:(seconds:number)=>void;
};
type Drag={
  kind:"video"|"text"|"audio"|"ruler";
  id?:string;
  index?:number;
  startX:number;
  startSeconds:number;
  moved:boolean;
};
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const round=(n:number)=>Math.round(n*10)/10;
const time=(n:number)=>Math.floor(n/60)+":"+String(Math.floor(n%60)).padStart(2,"0");
const copy={
  ru:{video:"Видео",text:"Текст",audio:"Аудио",addVideo:"Видео",addText:"Текст",addAudio:"Аудио",
    empty:"Выберите видеосюжет",emptyText:"Добавьте надпись",emptyAudio:"Добавьте музыку или голос",
    editor:"Монтажные дорожки",editText:"Настройка надписи",textValue:"Текст",start:"Начало, сек",
    length:"Длительность, сек",soundStart:"Начало звука",remove:"Удалить надпись",
    play:"Воспроизвести",pause:"Пауза",duration:"Время",shot:"Сцена",shift:"Переместить сцену",
    shorten:"Укоротить на секунду",lengthen:"Удлинить на секунду",hint:"Перетащите блок или ползунок, чтобы изменить время.",
    zoom:"Масштаб",snap:"Магнит",split:"Разрезать по курсору",duplicate:"Дублировать",
    transition:"Переход",look:"Цветовой стиль",soft:"Мягкий",cut:"Без перехода",
    fadeBlack:"Затемнение",flashWhite:"Белая вспышка",original:"Оригинал",warm:"Тёплый",
    cool:"Прохладный",dream:"Мечта"},
  en:{video:"Video",text:"Text",audio:"Audio",addVideo:"Video",addText:"Text",addAudio:"Audio",
    empty:"Choose a video story",emptyText:"Add a caption",emptyAudio:"Add music or narration",
    editor:"Editing tracks",editText:"Edit caption",textValue:"Text",start:"Start, sec",
    length:"Duration, sec",soundStart:"Audio starts",remove:"Remove caption",
    play:"Play",pause:"Pause",duration:"Timeline",shot:"Shot",shift:"Move shot",
    shorten:"Shorten by 1 second",lengthen:"Lengthen by 1 second",hint:"Drag a block or scrub the ruler to adjust timing.",
    zoom:"Zoom",snap:"Snap",split:"Split at playhead",duplicate:"Duplicate",
    transition:"Transition",look:"Color look",soft:"Soft",cut:"Cut",
    fadeBlack:"Fade to black",flashWhite:"White flash",original:"Original",warm:"Warm",
    cool:"Cool",dream:"Dream"},
  es:{video:"Vídeo",text:"Texto",audio:"Audio",addVideo:"Vídeo",addText:"Texto",addAudio:"Audio",
    empty:"Elige una historia",emptyText:"Añade un texto",emptyAudio:"Añade música o voz",
    editor:"Pistas de montaje",editText:"Editar texto",textValue:"Texto",start:"Inicio, seg",
    length:"Duración, seg",soundStart:"Inicio del audio",remove:"Quitar texto",
    play:"Reproducir",pause:"Pausa",duration:"Tiempo",shot:"Escena",shift:"Mover escena",
    shorten:"Acortar un segundo",lengthen:"Ampliar un segundo",hint:"Arrastra un bloque o la regla para ajustar el tiempo.",
    zoom:"Zoom",snap:"Imán",split:"Cortar en el cursor",duplicate:"Duplicar",
    transition:"Transición",look:"Color de escena",soft:"Suave",cut:"Corte",
    fadeBlack:"Fundido negro",flashWhite:"Destello blanco",original:"Original",warm:"Cálido",
    cool:"Frío",dream:"Sueño"}
} as const;

export function MandalaMultiTrackTimeline({
  locale,seconds,shots,captions,audio,playheadSeconds,playing,disabled,
  onSeek,onTogglePlay,onAddVideo,onMoveShot,onResizeShot,onAddCaption,
  onSetCaption,onRemoveCaption,onSplitCaption,onDuplicateCaption,onSetShotEffect,
  onOpenAudio,onChangeAudioStart
}:Props){
  const t=copy[locale];
  const drag=useRef<Drag|null>(null);
  const [selectedText,setSelectedText]=useState<string|null>(null);
  const [selectedShot,setSelectedShot]=useState<number|null>(null);
  const [zoom,setZoom]=useState(1);
  const [snapEnabled,setSnapEnabled]=useState(true);
  const chosen=captions.find(clip=>clip.id===selectedText);
  const cutMarks=[0,seconds,...shots.map(shot=>shot.startSeconds)];
  const snapPosition=(at:number,max=seconds)=>snapEnabled
    ?snapTimelineSecond(at,cutMarks,max):clamp(round(at),0,max);
  const percent=(start:number)=>String(clamp(start/Math.max(seconds,.1)*100,0,100))+"%";
  const width=(duration:number)=>String(clamp(duration/Math.max(seconds,.1)*100,0,100))+"%";
  const position=(clientX:number,element:HTMLElement)=>{
    const rect=element.getBoundingClientRect();
    return round(clamp((clientX-rect.left)/Math.max(1,rect.width)*seconds,0,seconds));
  };
  const begin=(event:ReactPointerEvent<HTMLElement>,kind:Drag["kind"],startSeconds:number,id?:string,index?:number)=>{
    if(disabled||event.button!==0)return;
    drag.current={kind,id,index,startX:event.clientX,startSeconds,moved:false};
    if(kind==="ruler")onSeek(position(event.clientX,event.currentTarget));
    event.currentTarget.setPointerCapture(event.pointerId);
    if(kind==="text"&&id)setSelectedText(id);
    if(kind==="video"&&index!==undefined)setSelectedShot(index);
    event.preventDefault();
  };
  const move=(event:ReactPointerEvent<HTMLElement>)=>{
    const active=drag.current;
    if(!active||disabled)return;
    const lane=active.kind==="ruler"?event.currentTarget:event.currentTarget.parentElement;
    if(!(lane instanceof HTMLElement))return;
    const rect=lane.getBoundingClientRect();
    const delta=(event.clientX-active.startX)/Math.max(1,rect.width)*seconds;
    if(Math.abs(event.clientX-active.startX)>4)active.moved=true;
    if(active.kind==="ruler")onSeek(position(event.clientX,lane));
    if(active.kind==="audio"&&audio)
      onChangeAudioStart(snapPosition(round(clamp(active.startSeconds+delta,0,
        Math.max(0,seconds-.1))),Math.max(0,seconds-.1)));
    if(active.kind==="text"&&active.id){
      const item=captions.find(clip=>clip.id===active.id);
      if(item)onSetCaption(active.id,{startSeconds:snapPosition(round(clamp(active.startSeconds+delta,0,
        Math.max(0,seconds-item.durationSeconds))),Math.max(0,seconds-item.durationSeconds))});
    }
  };
  const end=(event:ReactPointerEvent<HTMLElement>)=>{
    const active=drag.current;
    drag.current=null;
    if(!active)return;
    if(event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if(active.kind==="video"&&active.index!==undefined){
      const lane=event.currentTarget.parentElement;
      if(!(lane instanceof HTMLElement))return;
      const at=position(event.clientX,lane);
      const target=shots.findIndex(shot=>at>=shot.startSeconds&&at<shot.startSeconds+shot.durationSeconds);
      if(active.moved&&target>=0&&target!==active.index)onMoveShot(active.index,target);
      else if(!active.moved)onSeek(active.startSeconds);
    }
  };
  const scrubKey=(event:ReactKeyboardEvent<HTMLButtonElement>)=>{
    if(event.key==="ArrowLeft"||event.key==="ArrowRight"){
      event.preventDefault();
      onSeek(clamp(round(playheadSeconds+(event.key==="ArrowRight"?.5:-.5)),0,seconds));
    }
  };
  const addText=()=>setSelectedText(onAddCaption());

  return <section className={css.editor} data-video-multitrack-timeline
    aria-label={t.editor}>
    <div className={css.transport}>
      <strong><Scissors size={17} aria-hidden="true"/>{t.editor}</strong>
      <div className={css.transportActions}>
        <span className={css.clock}>{time(playheadSeconds)} <small>/ {time(seconds)}</small></span>
        <button type="button" onClick={onTogglePlay} disabled={disabled}
          aria-label={playing?t.pause:t.play} data-video-timeline-play>
          {playing?<Pause size={19} fill="currentColor"/>:<Play size={19} fill="currentColor"/>}
        </button>
      </div>
    </div>
    <div className={css.zoomBar}>
      <label data-video-timeline-snap><Magnet size={14} aria-hidden="true"/>
        <input type="checkbox" checked={snapEnabled} disabled={disabled}
          onChange={event=>setSnapEnabled(event.currentTarget.checked)}/>{t.snap}</label>
      <span>{t.zoom}</span>
      <button type="button" onClick={()=>setZoom(Math.max(1,zoom/2))}
        disabled={disabled||zoom<=1} aria-label={t.zoom+" −"}><ZoomOut size={16}/></button>
      <output data-video-timeline-zoom>{zoom}×</output>
      <button type="button" onClick={()=>setZoom(Math.min(4,zoom*2))}
        disabled={disabled||zoom>=4} aria-label={t.zoom+" +"}><ZoomIn size={16}/></button>
    </div>
    <div className={css.timelineViewport} data-video-timeline-viewport tabIndex={0}
      role="region" aria-label={t.editor}>
    <div className={css.timelineContent} style={{width:String(zoom*100)+"%"}}>
    <div className={css.rulerRow}>
      <span className={css.laneName} aria-hidden="true">{t.duration}</span>
      <button type="button" className={css.ruler} disabled={disabled}
        onKeyDown={scrubKey} aria-label={t.duration+" "+time(playheadSeconds)}
        onPointerDown={e=>begin(e,"ruler",playheadSeconds)}
        onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        data-video-timeline-scrubber>
        {[0,.25,.5,.75,1].map(f=><span key={f} style={{left:String(f*100)+"%"}}>{time(seconds*f)}</span>)}
        <span className={css.scrubHead} style={{left:percent(playheadSeconds)}}/>
      </button>
    </div>
    <div className={css.trackRow} data-video-track="text">
      <span className={css.laneName}><Type size={15} aria-hidden="true"/>{t.text}</span>
      <div className={css.lane}>
        {captions.map(clip=><button key={clip.id} type="button"
          className={[css.block,css.textBlock,selectedText===clip.id?css.selected:""].join(" ")}
          style={{left:percent(clip.startSeconds),width:width(clip.durationSeconds)}}
          disabled={disabled} title={clip.text} data-video-timeline-text-clip={clip.id}
          onPointerDown={e=>begin(e,"text",clip.startSeconds,clip.id)}
          onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          <span>{clip.text}</span>
        </button>)}
        {!captions.length?<span className={css.placeholder}>{t.emptyText}</span>:null}
        <span className={css.playhead} style={{left:percent(playheadSeconds)}} aria-hidden="true"/>
      </div>
    </div>
    <div className={css.trackRow} data-video-track="video">
      <span className={css.laneName}><Film size={15} aria-hidden="true"/>{t.video}</span>
      <div className={css.lane}>
        {shots.map((shot,index)=><button key={shot.sceneId+"-"+index} type="button"
          className={[css.block,css.videoBlock,selectedShot===index?css.selected:""].join(" ")}
          style={{left:percent(shot.startSeconds),width:width(shot.durationSeconds)}}
          disabled={disabled} data-video-timeline-shot={shot.sceneId}
          title={shot.title}
          onPointerDown={e=>begin(e,"video",shot.startSeconds,undefined,index)}
          onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          {shot.poster?<img src={shot.poster} alt="" loading="lazy"/>:null}
          <span>{shot.title}</span>
        </button>)}
        {!shots.length?<span className={css.placeholder}>{t.empty}</span>:null}
        <span className={css.playhead} style={{left:percent(playheadSeconds)}} aria-hidden="true"/>
      </div>
    </div>
    <div className={css.trackRow} data-video-track="audio">
      <span className={css.laneName}><Music2 size={15} aria-hidden="true"/>{t.audio}</span>
      <div className={css.lane}>
        {audio?<button type="button" disabled={disabled} title={audio.label}
          data-video-timeline-audio-clip
          className={[css.block,css.audioBlock].join(" ")}
          style={{left:percent(audio.startSeconds),width:width(audio.durationSeconds)}}
          onPointerDown={e=>begin(e,"audio",audio.startSeconds)}
          onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
          <span className={css.waveform} aria-hidden="true">▂▅▇▃▆▂▇▅▃▇▃▆</span>
          <span>{audio.label}</span>
        </button>:<span className={css.placeholder}>{t.emptyAudio}</span>}
        <span className={css.playhead} style={{left:percent(playheadSeconds)}} aria-hidden="true"/>
      </div>
    </div>
    </div>
    </div>
    <div className={css.addBar}>
      <button type="button" disabled={disabled} onClick={onAddVideo}
        data-video-timeline-add-video><Plus size={16}/><Film size={15}/>{t.addVideo}</button>
      <button type="button" disabled={disabled} onClick={addText}
        data-video-timeline-add-text><Plus size={16}/><Type size={15}/>{t.addText}</button>
      <button type="button" disabled={disabled} onClick={onOpenAudio}
        data-video-timeline-add-audio><Plus size={16}/><Music2 size={15}/>{t.addAudio}</button>
    </div>
    {chosen?<div className={css.inspector} data-video-timeline-caption-inspector>
      <strong>{t.editText}</strong>
      <label>{t.textValue}
        <input type="text" maxLength={96} disabled={disabled} value={chosen.text}
          onChange={e=>onSetCaption(chosen.id,{text:e.currentTarget.value})}/>
      </label>
      <div className={css.numberFields}>
        <label>{t.start}
          <input type="number" min={0} max={seconds} step={.1} disabled={disabled}
            value={chosen.startSeconds} onChange={e=>onSetCaption(chosen.id,{
              startSeconds:Number(e.currentTarget.value)})}/>
        </label>
        <label>{t.length}
          <input type="number" min={.1} max={seconds} step={.1} disabled={disabled}
            value={chosen.durationSeconds} onChange={e=>onSetCaption(chosen.id,{
              durationSeconds:Number(e.currentTarget.value)})}/>
        </label>
      </div>
      <div className={css.captionTools}>
        <button type="button" disabled={disabled||captions.length>=16||
          playheadSeconds<chosen.startSeconds+.2||
          playheadSeconds>chosen.startSeconds+chosen.durationSeconds-.2}
          data-video-timeline-split-caption
          onClick={()=>setSelectedText(onSplitCaption(chosen.id,playheadSeconds))}>
          <Scissors size={15}/>{t.split}</button>
        <button type="button" disabled={disabled||captions.length>=16}
          data-video-timeline-duplicate-caption
          onClick={()=>setSelectedText(onDuplicateCaption(chosen.id))}>
          <Copy size={15}/>{t.duplicate}</button>
      </div>
      <button type="button" className={css.remove} disabled={disabled}
        onClick={()=>{onRemoveCaption(chosen.id);setSelectedText(null);}}>
        <Trash2 size={15}/>{t.remove}</button>
    </div>:null}
    {selectedShot!==null&&shots.length>1&&shots[selectedShot]?<div className={css.shotActions}
      data-video-timeline-shot-inspector>
      <span>{t.shot} {selectedShot+1}</span>
      <button type="button" aria-label={t.shift+" ←"} disabled={disabled||selectedShot===0}
        onClick={()=>{onMoveShot(selectedShot,selectedShot-1);setSelectedShot(selectedShot-1);}}>←</button>
      <button type="button" aria-label={t.shift+" →"} disabled={disabled||selectedShot===shots.length-1}
        onClick={()=>{onMoveShot(selectedShot,selectedShot+1);setSelectedShot(selectedShot+1);}}>→</button>
      <button type="button" aria-label={t.shorten} disabled={disabled||selectedShot===shots.length-1||
        shots[selectedShot].durationSeconds<=2} onClick={()=>onResizeShot(selectedShot,-1)}>−1s</button>
      <button type="button" aria-label={t.lengthen} disabled={disabled||selectedShot===shots.length-1||
        shots[selectedShot+1].durationSeconds<=2} onClick={()=>onResizeShot(selectedShot,1)}>+1s</button>
    </div>:null}
    {selectedShot!==null&&shots[selectedShot]&&onSetShotEffect?
      <div className={css.sceneInspector} data-video-timeline-shot-effects>
        <label>{t.transition}
          <select data-video-timeline-transition
            value={shots[selectedShot].transitionIn??"soft"}
            disabled={disabled||selectedShot===0}
            onChange={event=>onSetShotEffect(selectedShot,{
              transitionIn:event.currentTarget.value as TimelineTransition})}>
            <option value="soft">{t.soft}</option>
            <option value="cut">{t.cut}</option>
            <option value="fade_black">{t.fadeBlack}</option>
            <option value="flash_white">{t.flashWhite}</option>
          </select>
        </label>
        <label>{t.look}
          <select data-video-timeline-look
            value={shots[selectedShot].colorLook??"original"} disabled={disabled}
            onChange={event=>onSetShotEffect(selectedShot,{
              colorLook:event.currentTarget.value as TimelineLook})}>
            <option value="original">{t.original}</option>
            <option value="warm">{t.warm}</option>
            <option value="cool">{t.cool}</option>
            <option value="dream">{t.dream}</option>
          </select>
        </label>
      </div>:null}
    {audio?<label className={css.audioOffset} data-video-timeline-audio-start>
      <span>{t.soundStart}: {audio.startSeconds.toFixed(1)}s</span>
      <input type="range" min={0} max={Math.max(0,seconds-.1)} step={.1}
        value={audio.startSeconds} disabled={disabled}
        onChange={e=>onChangeAudioStart(Number(e.currentTarget.value))}/>
    </label>:null}
    <small className={css.hint}>{t.hint}</small>
  </section>;
}
