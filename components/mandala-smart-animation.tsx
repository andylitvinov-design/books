"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {createCartoonStoryboard,CARTOON_PRESETS} from "@/lib/mandala/cartoon/storyboard.mjs";
import {renderCartoonSvg} from "@/lib/mandala/cartoon/fox-svg.mjs";
import styles from "./mandala-smart-animation.module.css";

type Locale="ru"|"en"|"es";
type Preset="auto"|"friendship"|"courage"|"calm"|"celebration";
type Aspect="portrait"|"landscape";
const labels={
  ru:{
    title:"Smart Animation · мультфильм за минуту",
    intro:"Оригинальный лисёнок, восемь настоящих анимированных сцен и одна добрая история. Пока это локальный аниматик, а не готовый MP4.",
    prompt:"О чём будет история?",placeholder:"Например: о дружбе, смелости или спокойном путешествии",
    presets:{auto:"По описанию",friendship:"Дружба",courage:"Смелость",calm:"Спокойствие",celebration:"Праздник"},
    portrait:"Вертикально",landscape:"Горизонтально",play:"Смотреть",pause:"Пауза",
    another:"Другой сюжет",scenes:"8 сцен · 60 секунд",limit:"Доступен только наш оригинальный лисёнок. Сложные персонажи по произвольному описанию и озвученный MP4 пока не поддерживаются здесь.",
    preview:"Живой предпросмотр · файл ещё не создан"
  },
  en:{
    title:"Smart Animation · a one-minute cartoon",
    intro:"An original little fox, eight truly animated scenes and one gentle story. This is a local animatic preview, not a finished MP4.",
    prompt:"What is your story about?",placeholder:"For example: friendship, courage or a peaceful journey",
    presets:{auto:"From the idea",friendship:"Friendship",courage:"Courage",calm:"Calm",celebration:"Celebration"},
    portrait:"Vertical",landscape:"Landscape",play:"Preview",pause:"Pause",
    another:"Another story",scenes:"8 scenes · 60 seconds",limit:"Only our original fox is available. Arbitrary new characters and a narrated MP4 are not supported here yet.",
    preview:"Animated preview · no file has been created"
  },
  es:{
    title:"Smart Animation · un cuento de un minuto",
    intro:"Un zorrito original, ocho escenas animadas y una historia amable. Esto es una vista previa local, no un MP4 terminado.",
    prompt:"¿De qué trata la historia?",placeholder:"Por ejemplo: amistad, valentía o un viaje tranquilo",
    presets:{auto:"Según la idea",friendship:"Amistad",courage:"Valentía",calm:"Calma",celebration:"Fiesta"},
    portrait:"Vertical",landscape:"Horizontal",play:"Vista previa",pause:"Pausar",
    another:"Otra historia",scenes:"8 escenas · 60 segundos",limit:"Solo está disponible nuestro zorrito original. Aún no ofrecemos personajes arbitrarios ni MP4 narrado.",
    preview:"Vista previa animada · todavía no hay un archivo"
  }
} as const;

export function MandalaSmartAnimation({locale}:{locale:Locale}){
  const t=labels[locale];
  const [wish,setWish]=useState("");
  const [preset,setPreset]=useState<Preset>("auto");
  const [aspect,setAspect]=useState<Aspect>("portrait");
  const [variation,setVariation]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [clockMs,setClockMs]=useState(0);
  const elapsedRef=useRef(0);
  const plan=useMemo(()=>createCartoonStoryboard({wish,locale,preset,aspect,variation}),
    [wish,locale,preset,aspect,variation]);
  const videoWidth=aspect==="portrait"?360:640;
  const videoHeight=aspect==="portrait"?640:360;
  const svg=useMemo(()=>renderCartoonSvg(plan,Math.min(59999,clockMs),
    {width:videoWidth,height:videoHeight}),[plan,clockMs,videoWidth,videoHeight]);
  const previewUrl=useMemo(()=>`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,[svg]);
  const seek=(ms:number)=>{setPlaying(false);elapsedRef.current=ms;setClockMs(ms);};
  useEffect(()=>{
    setPlaying(false);elapsedRef.current=0;setClockMs(0);
  },[plan]);
  useEffect(()=>{
    if(!playing)return;
    const start=performance.now()-elapsedRef.current;
    const preferReduced=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const msPerFrame=preferReduced?170:85;
    let raf=0,last=-1000;
    function tick(now:number){
      if(now-last>=msPerFrame){
        const elapsed=Math.max(0,now-start);
        if(elapsed>=60000){elapsedRef.current=59999;setClockMs(59999);setPlaying(false);return;}
        elapsedRef.current=elapsed;
        setClockMs(elapsed);
        last=now;
      }
      raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[playing,plan]);
  const active=plan.scenes.findIndex(scene=>clockMs>=scene.startMs&&clockMs<scene.startMs+scene.durationMs);
  return <section className={styles.root} data-smart-animation data-cartoon-variant={variation}>
    <div className={styles.intro}><strong>{t.title}</strong><p>{t.intro}</p></div>
    <label className={styles.prompt}><span>{t.prompt}</span>
      <textarea value={wish} maxLength={300} rows={2} placeholder={t.placeholder}
        data-cartoon-wish onChange={e=>setWish(e.currentTarget.value)}/>
    </label>
    <div className={styles.presets} role="group" aria-label={t.prompt}>
      {(["auto",...CARTOON_PRESETS] as Preset[]).map(id=>
        <button type="button" key={id} aria-pressed={preset===id}
          onClick={()=>setPreset(id)}>{t.presets[id]}</button>)}
    </div>
    <div className={styles.aspect} role="group" aria-label="Video aspect ratio">
      <button type="button" aria-pressed={aspect==="portrait"} onClick={()=>setAspect("portrait")}>{t.portrait} · 9:16</button>
      <button type="button" aria-pressed={aspect==="landscape"} onClick={()=>setAspect("landscape")}>{t.landscape} · 16:9</button>
    </div>
    <div className={styles.stage} data-cartoon-preview>
      {/* This self-contained trusted SVG comes only from allowlisted first-party geometry. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewUrl} width={videoWidth} height={videoHeight} alt={plan.title}
        className={aspect==="portrait"?styles.portrait:styles.landscape}/>
      <span className={styles.previewLabel}>{t.preview}</span>
    </div>
    <div className={styles.controls}>
      <button type="button" data-cartoon-play onClick={()=>{if(elapsedRef.current>=59999)seek(0);setPlaying(p=>!p);}}>
        {playing?t.pause:t.play}
      </button>
      <button type="button" data-cartoon-variant onClick={()=>setVariation(n=>n===0?1:0)}>{t.another}</button>
    </div>
    <p className={styles.storyTitle}>{plan.title} · {t.scenes}</p>
    <ol className={styles.scenes} data-cartoon-storyboard>
      {plan.scenes.map((scene,index)=><li key={scene.shotId}>
        <button type="button" data-cartoon-scene={index+1}
          aria-pressed={active===index} onClick={()=>seek(scene.startMs)}>
          <span className={styles.number}>{String(index+1).padStart(2,"0")}</span>
          <span><small>{Math.floor(scene.startMs/1000)}–{Math.floor((scene.startMs+scene.durationMs)/1000)}s</small>
            <span>{scene.narration}</span></span>
        </button>
      </li>)}
    </ol>
    <p className={styles.limit}>{t.limit}</p>
  </section>;
}
