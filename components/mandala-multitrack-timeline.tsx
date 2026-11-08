/* eslint-disable @next/next/no-img-element */
"use client";

import {useRef,useState} from "react";
import type {PointerEvent as ReactPointerEvent,KeyboardEvent as ReactKeyboardEvent} from "react";
import {Film,Music2,Pause,Play,Plus,Trash2,Type,Scissors,Copy,Magnet,ZoomIn,ZoomOut,Undo2,Redo2,GripVertical,ChevronUp,ChevronDown,Sparkles} from "lucide-react";
import {snapTimelineSecond} from "@/lib/mandala/editable-timeline.mjs";
import {motionPreset} from "@/lib/mandala/creative-editor-keyframes.mjs";
import type {MyTubeMotion} from "@/lib/mandala/creative-editor-keyframes.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-multitrack-timeline.module.css";

export type TimelineTextClip={
  id:string;
  text:string;
  startSeconds:number;
  durationSeconds:number;
  styleId?:"classic"|"cinema"|"minimal"|"glow";
  motionId?:"none"|"fade"|"slide_up"|"pop"|"move"|"grow"|"shrink"|"rotate"|"float"|"pulse"|"type";
  motionSpeed?:.5|1|1.5|2;
  motionDirection?:"left"|"right";
  positionId?:"bottom"|"center"|"top";
};
export type TimelineTransition="soft"|"cut"|"fade_black"|"flash_white";
export type TimelineLook="original"|"warm"|"cool"|"dream";
export type TimelineShot={
  sceneId:string;
  title:string;
  poster?:string|null;
  transitionIn?:TimelineTransition;
  colorLook?:TimelineLook;
  motion?:MyTubeMotion|null;
  sourcePhasePercent?:number;
  sourceSpeed?:number;
  startSeconds:number;
  durationSeconds:number;
};
export type TimelineAudioClip={label:string;startSeconds:number;durationSeconds:number;peaks?:readonly number[]};
type Props={
  locale:PublicLocale;
  seconds:number;
  shots:readonly TimelineShot[];
  captions:readonly TimelineTextClip[];
  audio:TimelineAudioClip|null;
  musicBed?:TimelineAudioClip|null;
  playheadSeconds:number;
  playing:boolean;
  disabled:boolean;
  onSeek:(seconds:number)=>void;
  onTogglePlay:()=>void;
  canUndo:boolean;
  canRedo:boolean;
  onUndo:()=>void;
  onRedo:()=>void;
  onAddVideo:()=>void;
  onMoveShot:(from:number,to:number)=>void;
  onResizeShot:(index:number,direction:-1|1)=>void;
  onAddCaption:()=>string;
  onSetCaption:(id:string,patch:Partial<Omit<TimelineTextClip,"id">>)=>void;
  onRemoveCaption:(id:string)=>void;
  onSplitCaption:(id:string,atSeconds:number)=>string;
  onDuplicateCaption:(id:string)=>string;
  onSetShotEffect?:(index:number,patch:{transitionIn?:TimelineTransition;colorLook?:TimelineLook})=>void;
  onSetShotMotion?:(index:number,motion:MyTubeMotion|null)=>void;
  onSetShotSourceTiming?:(index:number,patch:{sourcePhasePercent?:number;sourceSpeed?:number})=>void;
  setupCandidates:readonly string[];
  onImportSetups:()=>void;
  onReorderSetups:(from:number,to:number,autoTiming:boolean)=>void;
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
    cool:"Прохладный",dream:"Мечта",undo:"Отменить",redo:"Повторить",
    textStyle:"Оформление",textMotion:"Анимация",textPosition:"Расположение",
    classic:"Обычный",cinema:"Кино",minimal:"Минимализм",glowText:"Свечение",
    noMotion:"Без анимации",fadeMotion:"Проявление",slideMotion:"Подъём",popMotion:"Появление",
    top:"Вверху",center:"По центру",bottom:"Внизу",
    motion:"Движение кадра",keyframes:"Ключевые кадры",
    stillMotion:"Без движения",pushIn:"Приближение",pullOut:"Отдаление",
    panLeft:"Панорама влево",panRight:"Панорама вправо",drift:"Плавное смещение",
    tilt:"Лёгкий поворот",custom:"Вручную",startZoom:"Масштаб в начале",
    endZoom:"Масштаб в конце",endPan:"Сдвиг в конце (X)",
    endPanY:"Сдвиг в конце (Y)",endRotation:"Поворот в конце",
    sourceTiming:"Монтаж исходника",sourcePhase:"Начальная позиция видео",
    sourceSpeed:"Скорость видеокадров",sourceNote:"Длительность видео, звук и надписи не меняются.",
    bedLane:"Фоновая музыка",setupImport:"Добавить установки",setupImportHelp:"Перенести выбранные установки",setupHeading:"Установки",autoTiming:"Автовремя",dragSetup:"Перетащить установку",moveUp:"Выше",moveDown:"Ниже",addTextFull:"Добавить текст",speed:"Скорость",direction:"Направление",left:"Влево",right:"Вправо",
    motionPresets:{none:"Нет",move:"Движение",grow:"Увеличить",shrink:"Уменьшить",rotate:"Вращать",float:"Плавать",pulse:"Пульс",type:"Печатать"}},
  en:{video:"Video",text:"Text",audio:"Audio",addVideo:"Video",addText:"Text",addAudio:"Audio",
    empty:"Choose a video story",emptyText:"Add a caption",emptyAudio:"Add music or narration",
    editor:"Editing tracks",editText:"Edit caption",textValue:"Text",start:"Start, sec",
    length:"Duration, sec",soundStart:"Audio starts",remove:"Remove caption",
    play:"Play",pause:"Pause",duration:"Timeline",shot:"Shot",shift:"Move shot",
    shorten:"Shorten by 1 second",lengthen:"Lengthen by 1 second",hint:"Drag a block or scrub the ruler to adjust timing.",
    zoom:"Zoom",snap:"Snap",split:"Split at playhead",duplicate:"Duplicate",
    transition:"Transition",look:"Color look",soft:"Soft",cut:"Cut",
    fadeBlack:"Fade to black",flashWhite:"White flash",original:"Original",warm:"Warm",
    cool:"Cool",dream:"Dream",undo:"Undo",redo:"Redo",
    textStyle:"Caption style",textMotion:"Animation",textPosition:"Position",
    classic:"Classic",cinema:"Cinema",minimal:"Minimal",glowText:"Glow",
    noMotion:"None",fadeMotion:"Fade",slideMotion:"Slide up",popMotion:"Pop",
    top:"Top",center:"Center",bottom:"Bottom",
    motion:"Shot motion",keyframes:"Keyframes",
    stillMotion:"Still",pushIn:"Zoom in",pullOut:"Zoom out",
    panLeft:"Pan left",panRight:"Pan right",drift:"Gentle drift",
    tilt:"Gentle tilt",custom:"Custom",startZoom:"Start zoom",
    endZoom:"End zoom",endPan:"End horizontal pan",
    endPanY:"End vertical pan",endRotation:"End rotation",
    sourceTiming:"Source editing",sourcePhase:"Video starting position",
    sourceSpeed:"Source playback speed",sourceNote:"Film length, soundtrack and captions stay unchanged.",
    bedLane:"Music bed",setupImport:"Add setups",setupImportHelp:"Insert chosen affirmations from Ideas",setupHeading:"Setups",autoTiming:"Auto timing",dragSetup:"Drag to reorder setup",moveUp:"Move up",moveDown:"Move down",addTextFull:"Add text",speed:"Speed",direction:"Direction",left:"Left",right:"Right",
    motionPresets:{none:"None",move:"Move",grow:"Grow",shrink:"Shrink",rotate:"Rotate",float:"Float",pulse:"Pulse",type:"Type"}},
  es:{video:"Vídeo",text:"Texto",audio:"Audio",addVideo:"Vídeo",addText:"Texto",addAudio:"Audio",
    empty:"Elige una historia",emptyText:"Añade un texto",emptyAudio:"Añade música o voz",
    editor:"Pistas de montaje",editText:"Editar texto",textValue:"Texto",start:"Inicio, seg",
    length:"Duración, seg",soundStart:"Inicio del audio",remove:"Quitar texto",
    play:"Reproducir",pause:"Pausa",duration:"Tiempo",shot:"Escena",shift:"Mover escena",
    shorten:"Acortar un segundo",lengthen:"Ampliar un segundo",hint:"Arrastra un bloque o la regla para ajustar el tiempo.",
    zoom:"Zoom",snap:"Imán",split:"Cortar en el cursor",duplicate:"Duplicar",
    transition:"Transición",look:"Color de escena",soft:"Suave",cut:"Corte",
    fadeBlack:"Fundido negro",flashWhite:"Destello blanco",original:"Original",warm:"Cálido",
    cool:"Frío",dream:"Sueño",undo:"Deshacer",redo:"Rehacer",
    textStyle:"Estilo",textMotion:"Animación",textPosition:"Posición",
    classic:"Clásico",cinema:"Cine",minimal:"Mínimo",glowText:"Brillo",
    noMotion:"Ninguna",fadeMotion:"Aparecer",slideMotion:"Subir",popMotion:"Salto",
    top:"Arriba",center:"Centro",bottom:"Abajo",
    motion:"Movimiento de escena",keyframes:"Fotogramas clave",
    stillMotion:"Sin movimiento",pushIn:"Acercar",pullOut:"Alejar",
    panLeft:"Panorámica izquierda",panRight:"Panorámica derecha",
    drift:"Desplazamiento suave",tilt:"Giro suave",custom:"Personalizado",
    startZoom:"Zoom inicial",endZoom:"Zoom final",endPan:"Panorámica X final",
    endPanY:"Panorámica Y final",endRotation:"Rotación final",
    sourceTiming:"Editar origen",sourcePhase:"Posición inicial",
    sourceSpeed:"Velocidad de la escena",sourceNote:"No cambia la duración, el audio ni los subtítulos.",
    bedLane:"Música de fondo",setupImport:"Añadir afirmaciones",setupImportHelp:"Insertar frases elegidas",setupHeading:"Afirmaciones",autoTiming:"Tiempo auto.",dragSetup:"Arrastrar para reordenar",moveUp:"Subir",moveDown:"Bajar",addTextFull:"Añadir texto",speed:"Velocidad",direction:"Dirección",left:"Izquierda",right:"Derecha",
    motionPresets:{none:"Nada",move:"Mover",grow:"Agrandar",shrink:"Reducir",rotate:"Girar",float:"Flotar",pulse:"Pulso",type:"Escribir"}}
} as const;

export function MandalaMultiTrackTimeline({
  locale,seconds,shots,captions,audio,musicBed,playheadSeconds,playing,disabled,
  onSeek,onTogglePlay,canUndo,canRedo,onUndo,onRedo,onAddVideo,onMoveShot,onResizeShot,onAddCaption,
  onSetCaption,onRemoveCaption,onSplitCaption,onDuplicateCaption,onSetShotEffect,onSetShotMotion,
  onSetShotSourceTiming,setupCandidates,onImportSetups,onReorderSetups,onOpenAudio,onChangeAudioStart
}:Props){
  const t=copy[locale];
  const drag=useRef<Drag|null>(null);
  const [selectedText,setSelectedText]=useState<string|null>(null);
  const [selectedShot,setSelectedShot]=useState<number|null>(null);
  const [zoom,setZoom]=useState(1);
  const [snapEnabled,setSnapEnabled]=useState(true);
  const [autoTiming,setAutoTiming]=useState(true);
  const setupDrag=useRef<{index:number;y:number}|null>(null);
  const setupClips=captions.filter(clip=>/^setup-[1-5]$/.test(clip.id));
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
  const addSetups=()=>{if(!setupCandidates.length||disabled)return;onImportSetups();setSelectedText("setup-1");};
  const finishSetupDrag=(event:ReactPointerEvent<HTMLButtonElement>)=>{
    const active=setupDrag.current;setupDrag.current=null;
    if(!active)return;
    if(event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    const rows=event.currentTarget.closest("[data-video-setup-list]")?.querySelectorAll<HTMLElement>("[data-video-setup-row]");
    if(!rows?.length)return;
    let target=rows.length-1;
    for(let i=0;i<rows.length;i++){
      if(event.clientY<rows[i].getBoundingClientRect().bottom){target=i;break;}
    }
    if(target!==active.index&&Math.abs(event.clientY-active.y)>6)
      onReorderSetups(active.index,target,autoTiming);
  };
  const handleEditorKeys=(event:ReactKeyboardEvent<HTMLElement>)=>{
    if(disabled||!(event.metaKey||event.ctrlKey)||event.altKey)return;
    // Do not steal the browser's undo stack from a caption input or select.
    const target=event.target as HTMLElement;
    if(target.closest("input,textarea,select,[contenteditable=true]"))return;
    const key=event.key.toLowerCase();
    if(key==="z"||(key==="y"&&!event.shiftKey)){
      event.preventDefault();
      if(event.shiftKey||key==="y"){if(canRedo)onRedo();}
      else if(canUndo)onUndo();
    }
  };

  return <section className={css.editor} data-video-multitrack-timeline
    aria-label={t.editor} onKeyDown={handleEditorKeys}>
    <div className={css.setupAddBar} data-video-setup-actions>
      <button type="button" data-video-setup-import onClick={addSetups}
        disabled={disabled||!setupCandidates.length} title={t.setupImportHelp}>
        <Sparkles size={16} aria-hidden="true"/>{t.setupImport} ({setupCandidates.length})
      </button>
      <button type="button" data-video-timeline-add-text onClick={addText}
        disabled={disabled||captions.length>=16}><Plus size={16} aria-hidden="true"/>{t.addTextFull}</button>
    </div>
    {setupClips.length?<div className={css.setupList} data-video-setup-list>
      <div className={css.setupHeading}><strong>{t.setupHeading} ({setupClips.length})</strong>
        <label>{t.autoTiming}<input type="checkbox" checked={autoTiming} disabled={disabled}
          data-video-setup-auto-timing onChange={event=>setAutoTiming(event.currentTarget.checked)}/></label>
      </div>
      {setupClips.map((clip,index)=><div className={css.setupRow}
        key={clip.id} data-video-setup-row={clip.id} data-active={selectedText===clip.id}>
        <button type="button" className={css.setupGrip} disabled={disabled}
          data-video-setup-drag={clip.id} title={t.dragSetup} aria-label={t.dragSetup+" "+(index+1)}
          onPointerDown={event=>{if(disabled||event.button!==0)return;
            setupDrag.current={index,y:event.clientY};
            event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();}}
          onPointerUp={finishSetupDrag}
          onPointerCancel={event=>{setupDrag.current=null;
            if(event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);}}>
          <GripVertical size={15}/></button>
        <button type="button" className={css.setupSelect} data-video-setup-select={clip.id}
          aria-pressed={selectedText===clip.id} disabled={disabled}
          onClick={()=>setSelectedText(clip.id)}>
          <span className={css.setupNumber}>{index+1}</span>
          <span className={css.setupText}>{clip.text}</span>
          <small>{time(clip.startSeconds)}–{time(clip.startSeconds+clip.durationSeconds)}</small>
        </button>
        <div className={css.setupMove}>
          <button type="button" data-video-setup-up={clip.id} disabled={disabled||index===0}
            onClick={()=>onReorderSetups(index,index-1,autoTiming)} aria-label={t.moveUp}><ChevronUp size={15}/></button>
          <button type="button" data-video-setup-down={clip.id} disabled={disabled||index===setupClips.length-1}
            onClick={()=>onReorderSetups(index,index+1,autoTiming)} aria-label={t.moveDown}><ChevronDown size={15}/></button>
        </div>
      </div>)}
    </div>:null}
    <div className={css.transport}>
      <strong><Scissors size={17} aria-hidden="true"/>{t.editor}</strong>
      <div className={css.transportActions}>
        <span className={css.clock}>{time(playheadSeconds)} <small>/ {time(seconds)}</small></span>
        <button type="button" className={css.historyAction} data-video-timeline-undo
          disabled={disabled||!canUndo} onClick={onUndo} title={t.undo} aria-label={t.undo}>
          <Undo2 size={17} aria-hidden="true"/>
        </button>
        <button type="button" className={css.historyAction} data-video-timeline-redo
          disabled={disabled||!canRedo} onClick={onRedo} title={t.redo} aria-label={t.redo}>
          <Redo2 size={17} aria-hidden="true"/>
        </button>
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
          {audio.peaks?.length?
            <span className={css.waveformPeaks} data-video-timeline-real-waveform
              aria-hidden="true">{audio.peaks.map((peak,i)=>
                <i key={i} style={{height:Math.round(Math.max(0,Math.min(1,peak))*100)+"%"}}/>)}
            </span>:null}
          <span>{audio.label}</span>
        </button>:<span className={css.placeholder}>{t.emptyAudio}</span>}
        <span className={css.playhead} style={{left:percent(playheadSeconds)}} aria-hidden="true"/>
      </div>
    </div>
    {musicBed?<div className={css.trackRow} data-video-track="audio-bed">
      <span className={css.laneName}><Music2 size={15} aria-hidden="true"/>{t.bedLane}</span>
      <div className={css.lane}>
        <div className={[css.block,css.audioBlock,css.musicBedBlock].join(" ")}
          data-video-timeline-music-bed
          style={{left:percent(musicBed.startSeconds),width:width(musicBed.durationSeconds)}}
          title={musicBed.label} aria-label={musicBed.label}>
          {/* No fabricated waveform: music is a separately selected original master. */}
          <span>{musicBed.label}</span>
        </div>
        <span className={css.playhead} style={{left:percent(playheadSeconds)}} aria-hidden="true"/>
      </div>
    </div>:null}
    </div>
    </div>
    <div className={css.addBar}>
      <button type="button" disabled={disabled} onClick={onAddVideo}
        data-video-timeline-add-video><Plus size={16}/><Film size={15}/>{t.addVideo}</button>
      <button type="button" disabled={disabled} onClick={onOpenAudio}
        data-video-timeline-add-audio><Plus size={16}/><Music2 size={15}/>{t.addAudio}</button>
    </div>
    {chosen?<div className={css.motionStrip} data-video-caption-motion-strip>
      <strong>{t.textMotion} · {chosen.text}</strong>
      <div className={css.motionChoices} role="group" aria-label={t.textMotion}>
        {(["none","move","grow","shrink","rotate","float","pulse","type"] as const).map(preset=>
          <button type="button" key={preset} data-video-caption-motion-preset={preset}
            aria-pressed={(chosen.motionId??"none")===preset} disabled={disabled}
            onClick={()=>onSetCaption(chosen.id,{motionId:preset})}>{t.motionPresets[preset]}</button>)}
      </div>
      <div className={css.motionAdjust}>
        <label>{t.speed}
          <select data-video-caption-motion-speed value={chosen.motionSpeed??1} disabled={disabled}
            onChange={e=>onSetCaption(chosen.id,{motionSpeed:Number(e.currentTarget.value) as .5|1|1.5|2})}>
            {[.5,1,1.5,2].map(value=><option key={value} value={value}>{value}×</option>)}
          </select>
        </label>
        <label>{t.direction}
          <select data-video-caption-motion-direction value={chosen.motionDirection??"right"} disabled={disabled}
            onChange={e=>onSetCaption(chosen.id,{motionDirection:e.currentTarget.value as "left"|"right"})}>
            <option value="left">{t.left}</option><option value="right">{t.right}</option>
          </select>
        </label>
      </div>
    </div>:null}
    {chosen?<details className={css.inspectorDisclosure} data-video-timeline-caption-inspector>
      <summary>{t.editText}: {chosen.text}</summary>
      <div className={css.inspector}>
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
      <div className={css.captionAppearance}>
        <label>{t.textStyle}
          <select data-video-caption-style value={chosen.styleId??"classic"} disabled={disabled}
            onChange={e=>onSetCaption(chosen.id,{
              styleId:e.currentTarget.value as NonNullable<TimelineTextClip["styleId"]>})}>
            <option value="classic">{t.classic}</option>
            <option value="cinema">{t.cinema}</option>
            <option value="minimal">{t.minimal}</option>
            <option value="glow">{t.glowText}</option>
          </select>
        </label>
        <label>{t.textMotion}
          <select data-video-caption-motion value={chosen.motionId??"none"} disabled={disabled}
            onChange={e=>onSetCaption(chosen.id,{
              motionId:e.currentTarget.value as NonNullable<TimelineTextClip["motionId"]>})}>
            <option value="none">{t.noMotion}</option>
            <option value="fade">{t.fadeMotion}</option>
            <option value="slide_up">{t.slideMotion}</option>
            <option value="pop">{t.popMotion}</option>
            <option value="move">{t.motionPresets.move}</option>
            <option value="grow">{t.motionPresets.grow}</option>
            <option value="shrink">{t.motionPresets.shrink}</option>
            <option value="rotate">{t.motionPresets.rotate}</option>
            <option value="float">{t.motionPresets.float}</option>
            <option value="pulse">{t.motionPresets.pulse}</option>
            <option value="type">{t.motionPresets.type}</option>
          </select>
        </label>
        <label>{t.textPosition}
          <select data-video-caption-position value={chosen.positionId??"bottom"} disabled={disabled}
            onChange={e=>onSetCaption(chosen.id,{
              positionId:e.currentTarget.value as NonNullable<TimelineTextClip["positionId"]>})}>
            <option value="bottom">{t.bottom}</option>
            <option value="center">{t.center}</option>
            <option value="top">{t.top}</option>
          </select>
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
      </div>
    </details>:null}
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
    {selectedShot!==null&&shots[selectedShot]&&onSetShotMotion?
      <div className={css.motionInspector} data-video-timeline-keyframes>
        <label>{t.motion}
          <select data-video-timeline-motion-preset
            value={shots[selectedShot].motion?.preset??"none"} disabled={disabled}
            onChange={event=>onSetShotMotion(selectedShot,motionPreset(event.currentTarget.value))}>
            <option value="none">{t.stillMotion}</option>
            <option value="push-in">{t.pushIn}</option>
            <option value="pull-out">{t.pullOut}</option>
            <option value="pan-left">{t.panLeft}</option>
            <option value="pan-right">{t.panRight}</option>
            <option value="drift">{t.drift}</option>
            <option value="tilt">{t.tilt}</option>
            <option value="custom">{t.custom}</option>
          </select>
        </label>
        {shots[selectedShot].motion?<details>
          <summary>{t.keyframes}</summary>
          <div className={css.motionSliders}>
            {([
              {id:"start-zoom",label:t.startZoom,at:"from",key:"zoom",min:1,max:1.6,step:.01},
              {id:"end-zoom",label:t.endZoom,at:"to",key:"zoom",min:1,max:1.6,step:.01},
              {id:"end-pan",label:t.endPan,at:"to",key:"x",min:-.16,max:.16,step:.01},
              {id:"end-pan-y",label:t.endPanY,at:"to",key:"y",min:-.16,max:.16,step:.01},
              {id:"end-rotation",label:t.endRotation,at:"to",key:"rotation",min:-6,max:6,step:.5}
            ] as const).map(control=>{
              const current=shots[selectedShot].motion!;
              return <label key={control.id}>
                <span>{control.label}: {current[control.at][control.key].toFixed(2)}</span>
                <input type="range" min={control.min} max={control.max}
                  step={control.step} value={current[control.at][control.key]}
                  data-video-timeline-keyframe-end-zoom={control.id==="end-zoom"?true:undefined}
                  data-video-timeline-keyframe-end-pan={control.id==="end-pan"?true:undefined}
                  disabled={disabled}
                  onChange={event=>{
                    const baseline=shots[selectedShot].motion??motionPreset("push-in")!;
                    onSetShotMotion(selectedShot,{
                      ...baseline,preset:"custom",
                      [control.at]:{...baseline[control.at],
                        [control.key]:Number(event.currentTarget.value)}
                    });
                  }}/>
              </label>;
            })}
          </div>
        </details>:null}
      </div>:null}
    {selectedShot!==null&&shots[selectedShot]&&onSetShotSourceTiming?
      <div className={css.sourceTimingInspector} data-video-timeline-source-editor>
        <strong>{t.sourceTiming}</strong>
        <label>{t.sourcePhase}: {shots[selectedShot].sourcePhasePercent??0}%
          <input type="range" min={0} max={95} step={5}
            data-video-timeline-source-phase
            value={shots[selectedShot].sourcePhasePercent??0} disabled={disabled}
            onChange={event=>onSetShotSourceTiming(selectedShot,{
              sourcePhasePercent:Number(event.currentTarget.value)})}/>
        </label>
        <label>{t.sourceSpeed}
          <select data-video-timeline-source-speed
            value={shots[selectedShot].sourceSpeed??1} disabled={disabled}
            onChange={event=>onSetShotSourceTiming(selectedShot,{
              sourceSpeed:Number(event.currentTarget.value)})}>
            <option value={.75}>0.75×</option>
            <option value={1}>1×</option>
            <option value={1.25}>1.25×</option>
            <option value={1.5}>1.5×</option>
          </select>
        </label>
        <small>{t.sourceNote}</small>
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
