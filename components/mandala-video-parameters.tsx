"use client";

import {useEffect, useMemo, useState} from "react";
import {Check, ChevronDown, ChevronRight, Film, PencilLine, Sparkles} from "lucide-react";
import {QUESTION_REGISTRY, questionsForDraft} from "@/lib/mandala/video-studio-question-registry.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./mandala-video-parameters.module.css";

export type VideoQuestionGroup="principal"|"personalization"|"advanced"|"pro"|"extra";
type Answer={selectedOptionId:string|null;customText:string|null;confirmed:boolean};
type Question={
  id:string;group:VideoQuestionGroup;scope:string;conditions:readonly string[];
  labels:Record<PublicLocale,string>;options:readonly {id:string;labels:Record<PublicLocale,string>}[];
};
type Props={
  locale:PublicLocale;disabled:boolean;group:VideoQuestionGroup;
  onGroupChange:(group:VideoQuestionGroup)=>void;visualIdea:string;generated:boolean;
  selectedShotNumber:number|null;globalAnswers:Record<string,Answer>;sceneAnswers:Record<string,Answer>;
  onAnswer:(id:string,choice:string|null,custom:string|null,scene:boolean,confirmed:boolean)=>void;
};
const order:readonly VideoQuestionGroup[]=["principal","personalization","advanced","pro","extra"];
const priority:Record<VideoQuestionGroup,readonly string[]>={
  principal:["BASIC_06","BASIC_05","BASIC_01"],
  personalization:["PERSONAL_05","PERSONAL_12","PERSONAL_13"],
  advanced:["ADV_01","ADV_08","ADV_09"],
  pro:["PRO_01","PRO_09","PRO_20"],
  extra:["EXTRA_01","EXTRA_02","EXTRA_05"],
};
const posters:Record<VideoQuestionGroup,string>={
  principal:"/videos/holistic-house/film-collection-v3/shore-breath.jpg",
  personalization:"/videos/holistic-house/film-collection-v3/lake-mist-dawn.jpg",
  advanced:"/videos/holistic-house/film-collection-v3/forest-renewal.jpg",
  pro:"/videos/holistic-house/film-collection-v3/still-water.jpg",
  extra:"/videos/holistic-house/film-collection-v3/petal-hope.jpg",
};
const labels={
  ru:{
    heading:"Параметры видео",subtitle:"Уточните детали — мы подберём подходящий сценарий, сцены и звук.",
    optional:"Все 49 вопросов необязательны. Умный подбор показывает главное, остальные настройки — по желанию.",
    groups:{
      principal:["Параметры видео","Формат, продолжительность и основная цель"],
      personalization:["Персонализация","Ваш герой, история и индивидуальные пожелания"],
      advanced:["Стиль и визуальный мир","Атмосфера, цвет, свет и развитие сюжета"],
      pro:["Про-режиссура","Камера, планы, движение, свет и звук"],
      extra:["Дополнительные настройки","Эффекты, мандалы, анимация и музыка"],
    },
    showAll:"Показать все вопросы",showLess:"Свернуть дополнительные вопросы",own:"Свой вариант",
    ownHint:"Необязательно. Сохраняется локально, не отправляется видеосервисам.",
    proHint:"Выберите отдельную сцену в сценарии, чтобы настроить её параметры.",
    extraHint:"Дополнительные эффекты можно настроить после построения сценария.",
    unavailable:"Эта функция требует отдельного инструмента или подтверждения.",
    progress:"ответов из 49",recommendation:"Рекомендуемые настройки",done:"Выбрано",
  },
  en:{
    heading:"Video parameters",subtitle:"Refine the details to find a suitable script, scenes and soundtrack.",
    optional:"All 49 questions are optional. Smart selection shows the essentials first.",
    groups:{
      principal:["Video parameters","Format, duration and main purpose"],
      personalization:["Personalization","Your character, story and personal wishes"],
      advanced:["Visual style and world","Atmosphere, colours, light and story"],
      pro:["Pro direction","Camera, framing, movement, light and sound"],
      extra:["Extra settings","Effects, mandalas, animation and music"],
    },
    showAll:"Show all questions",showLess:"Show fewer questions",own:"My own answer",
    ownHint:"Optional. Stored locally, never sent to video providers.",
    proHint:"Select a storyboard scene to adjust its cinematic settings.",
    extraHint:"Extra effects become available after you create the storyboard.",
    unavailable:"This setting needs a separate tool or approval.",
    progress:"answers out of 49",recommendation:"Recommended settings",done:"Selected",
  },
  es:{
    heading:"Parámetros de vídeo",subtitle:"Ajusta los detalles para elegir guion, escenas y sonido.",
    optional:"Las 49 preguntas son opcionales. La selección inteligente muestra primero lo esencial.",
    groups:{
      principal:["Parámetros de vídeo","Formato, duración y objetivo principal"],
      personalization:["Personalización","Tu personaje, historia y preferencias"],
      advanced:["Estilo visual y mundo","Atmósfera, color, luz e historia"],
      pro:["Dirección profesional","Cámara, planos, movimiento, luz y sonido"],
      extra:["Opciones adicionales","Efectos, mandalas, animación y música"],
    },
    showAll:"Mostrar todas las preguntas",showLess:"Mostrar menos",own:"Mi respuesta",
    ownHint:"Opcional. Permanece local, no se envía a proveedores.",
    proHint:"Selecciona una escena para ajustar los detalles cinematográficos.",
    extraHint:"Los efectos se activan después de preparar el guion visual.",
    unavailable:"Esta función requiere una herramienta o aprobación adicional.",
    progress:"respuestas de 49",recommendation:"Opciones recomendadas",done:"Elegido",
  },
} as const;
const questionRegistry=QUESTION_REGISTRY as readonly Question[];
const limitedCapabilities=new Set(["external_likeness_capable","voice_enabled","voice_or_text_enabled","music_enabled"]);
const groupQuestions=(group:VideoQuestionGroup)=>questionRegistry.filter(q=>q.group===group);

/**
 * Progressive, first-party creative controls. No provider calls, logging,
 * profile requests or storage. Original 49 IDs and 147 EN/RU/ES choices are
 * taken directly from the canonical question registry, not duplicated here.
 */
export function MandalaVideoParameters({locale,disabled,group,onGroupChange,visualIdea,generated,
  selectedShotNumber,globalAnswers,sceneAnswers,onAnswer}:Props){
  const t=labels[locale]||labels.en;
  const [open,setOpen]=useState(true);
  const [showAll,setShowAll]=useState<Partial<Record<VideoQuestionGroup,boolean>>>({});
  const allAnswered=useMemo(()=>
    questionRegistry.filter(q=>(q.group==="pro"?sceneAnswers[q.id]:globalAnswers[q.id])?.confirmed).length,
    [globalAnswers,sceneAnswers]);
  const suggestions=useMemo(()=>questionsForDraft({intentText:visualIdea,answers:globalAnswers,limit:3}) as readonly Question[],
    [visualIdea,globalAnswers]);
  useEffect(()=>{if(selectedShotNumber!==null&&group==="pro")setOpen(true);},[selectedShotNumber,group]);
  return <section className={styles.panel} data-director-contextual-questions
    data-video-parameters-accordion data-total-questions={questionRegistry.length}>
    <div className={styles.intro}>
      <span className={styles.introCopy}><Sparkles size={16} aria-hidden="true"/>{t.optional}</span>
      <span className={styles.progress} aria-live="polite">
        <strong>{allAnswered} / {questionRegistry.length}</strong>
        <small>{t.progress}</small>
        <span className={styles.progressTrack} aria-hidden="true">
          <span style={{width:(allAnswered/questionRegistry.length*100)+"%"}}/>
        </span>
      </span>
    </div>
    <div className={styles.groups}>
      {order.map((section,index)=>{
        const all=groupQuestions(section);
        const answerSet=section==="pro"?sceneAnswers:globalAnswers;
        const completed=all.filter(q=>answerSet[q.id]?.confirmed).length;
        const expanded=group===section&&open;
        const shortIds=[...priority[section]];
        if(section==="personalization"){
          if(globalAnswers.PERSONAL_05?.selectedOptionId==="other")shortIds.push("PERSONAL_06");
          if(globalAnswers.PERSONAL_06?.selectedOptionId==="animal")shortIds.push("PERSONAL_07");
        }
        for(const q of suggestions)if(q.group===section&&!shortIds.includes(q.id))shortIds.push(q.id);
        const listed=showAll[section]?all:shortIds.map(id=>all.find(q=>q.id===id)).filter((q):q is Question=>Boolean(q));
        const unavailable=section==="pro"&&selectedShotNumber===null||section==="extra"&&!generated;
        return <article key={section} className={styles.group} data-video-parameter-group={section}
          data-open={expanded?"true":"false"}>
          <button type="button" className={styles.groupHeading} data-director-category={section}
            aria-controls={"video-parameter-body-"+section} aria-expanded={expanded} aria-pressed={expanded}
            onClick={()=>{if(group===section)setOpen(o=>!o);else{onGroupChange(section);setOpen(true);}}}>
            <span className={styles.thumb} style={{backgroundImage:"url('"+posters[section]+"')"}} aria-hidden="true">
              <span>{index+1}</span>
            </span>
            <span className={styles.groupCopy}>
              <strong>{t.groups[section][0]}</strong>
              <small>{t.groups[section][1]}</small>
            </span>
            <span className={styles.groupCount}>{completed} / {all.length}</span>
            {expanded?<ChevronDown size={18} className={styles.up} aria-hidden="true"/>:
              <ChevronDown size={18} aria-hidden="true"/>}
          </button>
          {expanded?<div id={"video-parameter-body-"+section} className={styles.groupBody}>
            {unavailable?<p className={styles.contextHint} role="note">
              <Film size={16} aria-hidden="true"/>{section==="pro"?t.proHint:t.extraHint}
            </p>:null}
            <div className={styles.rows}>
              {listed.map((question,n)=>{
                const answer=answerSet[question.id];
                const scene=question.scope==="scene";
                const capabilityPending=question.conditions.some(condition=>limitedCapabilities.has(condition));
                const locked=disabled||unavailable||capabilityPending;
                const hasCustom=Boolean(answer?.customText);
                const choiceName=question.labels[locale];
                return <fieldset key={question.id} className={styles.question}
                  data-director-question={question.id}
                  data-director-answer={answer?.confirmed?question.id:undefined}
                  data-director-answer-scope={scene?"scene":"global"}
                  disabled={locked}>
                  <legend className={styles.srOnly}>{choiceName}</legend>
                  <div className={styles.questionGrid}>
                    <span className={styles.questionTitle}>
                      <span className={styles.questionNumber}>{index+1}.{String(showAll[section]?all.indexOf(question)+1:n+1)}</span>
                      <span>{choiceName}</span>
                    </span>
                    <div className={styles.answers} role="group" aria-label={choiceName}>
                      {question.options.map(option=><button key={option.id} type="button"
                        aria-pressed={answer?.confirmed&&answer.selectedOptionId===option.id}
                        title={option.labels[locale]} disabled={locked}
                        onClick={()=>onAnswer(question.id,option.id,null,scene,true)}>
                        <span className={styles.radio} aria-hidden="true">
                          {answer?.confirmed&&answer.selectedOptionId===option.id?<Check size={11}/>:null}
                        </span>
                        <span>{option.labels[locale]}</span>
                      </button>)}
                    </div>
                  </div>
                  <details className={styles.custom}>
                    <summary><PencilLine size={13} aria-hidden="true"/>{t.own}{hasCustom?" · "+t.done:""}</summary>
                    <input type="text" maxLength={160} value={answer?.customText||""}
                      placeholder={t.own} aria-label={t.own+" · "+choiceName}
                      onChange={event=>onAnswer(question.id,null,event.currentTarget.value,scene,false)}
                      onBlur={event=>{if(event.currentTarget.value.trim())
                        onAnswer(question.id,null,event.currentTarget.value.trim(),scene,true);}}/>
                    <small>{t.ownHint}</small>
                  </details>
                  {capabilityPending?<small className={styles.pending} role="note">{t.unavailable}</small>:null}
                </fieldset>;
              })}
            </div>
            {all.length>shortIds.length?<button type="button" className={styles.showMore}
              data-video-parameter-show-all={section}
              onClick={()=>setShowAll(current=>({...current,[section]:!current[section]}))}>
              <Film size={17} aria-hidden="true"/>
              {showAll[section]?t.showLess:t.showAll}
              <ChevronRight size={18} aria-hidden="true"/>
            </button>:null}
          </div>:null}
        </article>;
      })}
    </div>
  </section>;
}
