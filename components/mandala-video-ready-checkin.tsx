"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import type {PublicLocale} from "@/lib/public-locales";
import {
  READY_CHECKIN_MEDIA,READY_CHECKIN_COPY,initialReadyCheckIn,scoreReadyCheckIn
} from "@/lib/mandala/ready-generation-checkin.mjs";
import css from "./mandala-video-ready.module.css";

const SCORES=[0,1,2,3,4,5,6,7,8,9,10] as const;

type Props={locale:PublicLocale;onFirstAnswer:()=>void;onDismiss:()=>void};
type CheckInState={index:number;answers:(number|null)[]};

export function ReadyGenerationCheckIn({locale,onFirstAnswer,onDismiss}:Props){
  const copy=READY_CHECKIN_COPY[locale];
  const [progress,setProgress]=useState<CheckInState>(()=>initialReadyCheckIn());
  const headingRef=useRef<HTMLHeadingElement|null>(null);
  // A shifting progress/photo panel can consume Safari's final click. Keep a
  // single guarded touch/pointer selection so one real tap = one answer.
  const scoreTapRef=useRef<{value:number;x:number;y:number;handled:boolean;moved:boolean}|null>(null);
  const {index,answers}=progress;
  const finished=index>=READY_CHECKIN_MEDIA.length;
  const current=READY_CHECKIN_MEDIA[index];
  useEffect(()=>{
    if(index>0)headingRef.current?.focus({preventScroll:true});
  },[index]);
  function answer(value:number){
    if(finished)return;
    setProgress(previous=>scoreReadyCheckIn(previous,value));
    onFirstAnswer();
  }
  function beginScoreTap(value:number,x:number,y:number){
    scoreTapRef.current={value,x,y,handled:false,moved:false};
  }
  function endScoreTap(value:number,x:number,y:number){
    const tap=scoreTapRef.current;
    if(!tap||tap.value!==value||tap.handled)return;
    // A swipe across the eleven scores must not select an accidental answer.
    if(Math.hypot(x-tap.x,y-tap.y)>12){tap.moved=true;return;}
    tap.handled=true;
    answer(value);
  }
  return <section className={css.readyCheckIn} data-ready-sequential-checkin
    data-checkin-tone={current?.id||"complete"} aria-label={copy.title}>
    <div className={css.checkinTop}>
      <span className={css.checkinEyebrow}>{copy.title}</span>
      <span className={css.checkinCount} aria-live="polite">
        {finished?READY_CHECKIN_MEDIA.length:index+1} / {READY_CHECKIN_MEDIA.length}
      </span>
    </div>
    <progress className={css.checkinProgress} max={READY_CHECKIN_MEDIA.length}
      value={index} aria-label={copy.question}/>
    {!finished?<div className={css.checkinBody}>
      <div className={css.checkinPicture}>
        {/* First-party scene photography, already shipped in the movie library. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={current.src} src={current.src} alt="" loading="eager" decoding="async"/>
        <span className={css.checkinPhotoLabel}>{copy.labels[index]}</span>
      </div>
      <h3 ref={headingRef} tabIndex={-1} id="ready-checkin-question"
        className={css.checkinQuestion} aria-live="polite">{copy.questions[index]}</h3>
      <p className={css.checkinGuidance}>{copy.guidance}</p>
      <div className={css.checkinNumbers} role="group" aria-labelledby="ready-checkin-question">
        {SCORES.map(value=><button key={value} type="button" data-ready-checkin-score={value}
          aria-label={value+" "+copy.score}
          onPointerDown={event=>{
            if(event.isPrimary)beginScoreTap(value,event.clientX,event.clientY);
          }}
          onTouchStart={event=>{
            const touch=event.touches.item(0);
            if(touch)beginScoreTap(value,touch.clientX,touch.clientY);
          }}
          onPointerUp={event=>{
            if(event.isPrimary)endScoreTap(value,event.clientX,event.clientY);
          }}
          onTouchEnd={event=>{
            const touch=event.changedTouches.item(0);
            if(touch)endScoreTap(value,touch.clientX,touch.clientY);
          }}
          onPointerCancel={()=>{scoreTapRef.current=null;}}
          onTouchCancel={()=>{scoreTapRef.current=null;}}
          onClick={event=>{
            const tap=scoreTapRef.current;
            scoreTapRef.current=null;
            // Pointerup/touchend already scored this tap. Do not skip a
            // question on the synthesized click; keyboard clicks still work.
            if(event.detail>0&&tap?.value===value&&(tap.handled||tap.moved))return;
            answer(value);
          }}>{value}</button>)}
      </div>
      <div className={css.checkinEnds}><span>0 · {copy.low}</span>
        <span>10 · {copy.high}</span></div>
      {index>0?<button type="button" className={css.checkinPrevious}
        onClick={()=>setProgress(previous=>({...previous,index:Math.max(0,previous.index-1)}))}>
        {copy.back}
      </button>:null}
    </div>:<div className={css.checkinSummary} data-ready-checkin-complete>
      <h3 ref={headingRef} tabIndex={-1} className={css.checkinQuestion}>{copy.complete}</h3>
      <p className={css.checkinGuidance}>{copy.completeLead}</p>
      <div className={css.checkinResults}>
        {copy.labels.map((label,questionIndex)=><div key={READY_CHECKIN_MEDIA[questionIndex].id}>
          <span>{label}</span><strong>{answers[questionIndex]} / 10</strong>
        </div>)}
      </div>
      <p className={css.checkinPrivacy}>{copy.privacy}</p>
      <div className={css.checkinFinishActions}>
        <button className={css.checkinDone} type="button" onClick={onDismiss}>{copy.done}</button>
        <button className={css.checkinAgain} type="button"
          onClick={()=>setProgress(initialReadyCheckIn())}>{copy.again}</button>
        <Link href={"/"+locale+"/holistic-support/mobile?view=tests"} prefetch={false}>
          {copy.more}
        </Link>
      </div>
    </div>}
  </section>;
}
