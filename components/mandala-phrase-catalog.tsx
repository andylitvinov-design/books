"use client";

import {useEffect,useMemo,useState} from "react";
import {ArrowRight,Check,Heart,Layers3,MessageCircleHeart,Music2,Sparkles} from "lucide-react";
import {
  listVideoGoalCategories,listVideoGoalTopics,listVideoGoalScenarios,
} from "@/lib/mandala/video-goal-taxonomy.mjs";
import {
  formatVideoPhraseForOverlay,listVideoPhraseIdeas,listPreparedVideoPhrases,
  suggestVideoPhrasePath,
} from "@/lib/mandala/video-phrase-catalog.mjs";
import type {PreparedVideoPhrase,VideoPhraseLength,VideoPhraseSpeaker,VideoPhraseTone} from
  "@/lib/mandala/video-phrase-catalog.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import styles from "./mandala-phrase-catalog.module.css";

type Props={
  locale:PublicLocale;theme:VideoTheme;wish:string;disabled:boolean;
  selectedPhrase:string;onPhraseChoose:(text:string)=>void;onOpenAudio:()=>void;
};
type Path={categoryId:string;topicId:string;scenarioId:string;ideaId:string};
const copy={
  ru:{
    title:"Подберите свои слова",subtitle:"Выберите историю и идею — фразы уже готовы.",
    goal:"1. Цель",topic:"2. Тема",scenario:"3. Сценарий",
    idea:"4. Идея",tone:"Тон",speaker:"Обращение",length:"Длина",
    ready:"Готовые фразы",choose:"Выбрать фразу",selected:"Выбрано",
    gentle:"Бережно",confident:"Уверенно",grounded:"Спокойно",inspiring:"Вдохновляюще",
    self:"От себя: «Я»",support:"Поддержка: «Ты»",
    short:"Короткие",extended:"Развёрнутые",
    note:"Выбранные слова появятся в видео. При необходимости их можно изменить.",
    empty:"Для этого сочетания фразы пока не найдены.",
    audio:"Настроить аудиогид, музыку и голос",
  },
  en:{
    title:"Choose your own words",subtitle:"Select a story and an idea — the phrases are ready.",
    goal:"1. Goal",topic:"2. Topic",scenario:"3. Story",
    idea:"4. Idea",tone:"Tone",speaker:"Voice",length:"Length",
    ready:"Ready-made phrases",choose:"Choose phrase",selected:"Selected",
    gentle:"Gentle",confident:"Confident",grounded:"Grounded",inspiring:"Inspiring",
    self:"From me: ‘I’",support:"Support: ‘You’",
    short:"Short",extended:"Extended",
    note:"Your chosen words will appear in the video. You can edit them afterwards.",
    empty:"No ready phrases for these choices.",
    audio:"Set up audio guide, music and voice",
  },
  es:{
    title:"Elige tus palabras",subtitle:"Elige una historia y una idea: las frases ya están listas.",
    goal:"1. Objetivo",topic:"2. Tema",scenario:"3. Historia",
    idea:"4. Idea",tone:"Tono",speaker:"Voz",length:"Longitud",
    ready:"Frases preparadas",choose:"Elegir frase",selected:"Elegida",
    gentle:"Suave",confident:"Segura",grounded:"Serena",inspiring:"Inspiradora",
    self:"Desde mí: «Yo»",support:"Apoyo: «Tú»",
    short:"Cortas",extended:"Ampliadas",
    note:"Las palabras elegidas aparecerán en el vídeo. Luego puedes cambiarlas.",
    empty:"No hay frases para esta selección.",
    audio:"Configurar audioguía, música y voz",
  },
} as const;
const tones=["gentle","confident","grounded","inspiring"] as const;
const speakers=["self","support"] as const;
const lengths=["short","extended"] as const;

export function MandalaPhraseCatalog({
  locale,theme,wish,disabled,selectedPhrase,onPhraseChoose,onOpenAudio,
}:Props){
  const t=copy[locale];
  const recommended=useMemo(()=>suggestVideoPhrasePath({
    request:wish,legacyTheme:theme,locale,
  }),[wish,theme,locale]);
  const [path,setPath]=useState<Path>(()=>recommended||{
    categoryId:"body",topicId:"body-release",
    scenarioId:"body-release-s1",ideaId:"body-release-s1-i1",
  });
  const [tone,setTone]=useState<VideoPhraseTone>("gentle");
  const [speaker,setSpeaker]=useState<VideoPhraseSpeaker>("self");
  const [length,setLength]=useState<VideoPhraseLength>("short");
  const [remote,setRemote]=useState<{key:string;rows:PreparedVideoPhrase[]}|null>(null);
  const scenarioKey=path.scenarioId+":"+locale;
  useEffect(()=>{
    const controller=new AbortController();
    setRemote(null);
    const params=new URLSearchParams({scenarioId:path.scenarioId,locale});
    fetch("/api/holistic-support/video-phrases?"+params.toString(),{
      method:"GET",signal:controller.signal,
    }).then(async response=>response.ok?response.json():null)
      .then(data=>{
        if(controller.signal.aborted||!data||!Array.isArray(data.items)||
          data.items.length!==192)return;
        setRemote({key:scenarioKey,rows:data.items as PreparedVideoPhrase[]});
      }).catch(()=>{});
    return ()=>controller.abort();
  },[path.scenarioId,locale,scenarioKey]);
  // If the client changes the primary goal, suggest the correct topic again;
  // changes to tone/voice/length never reset their selected story or idea.
  useEffect(()=>{if(recommended)setPath(recommended);},[recommended]);
  const categories=useMemo(()=>listVideoGoalCategories(locale),[locale]);
  const topics=useMemo(()=>listVideoGoalTopics(path.categoryId,locale),[path.categoryId,locale]);
  const scenarios=useMemo(()=>listVideoGoalScenarios(path.topicId,locale),[path.topicId,locale]);
  const ideas=useMemo(()=>listVideoPhraseIdeas(path.scenarioId,locale),[path.scenarioId,locale]);
  // Local strings render synchronously; the indexed DB library may refresh
  // them without waiting for an AI request or changing the selected filters.
  const phrases=useMemo(()=>{
    const local=listPreparedVideoPhrases({...path,locale,tone,speaker,length});
    if(remote?.key!==scenarioKey)return local;
    const matches=remote.rows.filter(row=>row.ideaId===path.ideaId&&
      row.tone===tone&&row.speaker===speaker&&row.length===length)
      .sort((a,b)=>a.variant-b.variant);
    return matches.length===3?matches:local;
  },[path,locale,tone,speaker,length,remote,scenarioKey]);

  const chooseCategory=(categoryId:string)=>{
    const firstTopic=listVideoGoalTopics(categoryId,locale)[0];
    if(!firstTopic)return;
    const scenarioId=listVideoGoalScenarios(firstTopic.id,locale)[0]?.id;
    if(!scenarioId)return;
    setPath({categoryId,topicId:firstTopic.id,scenarioId,ideaId:scenarioId+"-i1"});
  };
  const chooseTopic=(topicId:string)=>{
    const scenarioId=listVideoGoalScenarios(topicId,locale)[0]?.id;
    if(!scenarioId)return;
    setPath(previous=>({...previous,topicId,scenarioId,ideaId:scenarioId+"-i1"}));
  };
  const chooseScenario=(scenarioId:string)=>{
    setPath(previous=>({...previous,scenarioId,ideaId:scenarioId+"-i1"}));
  };
  return <div className={styles.root} data-video-phrase-catalog
      data-phrase-scenario={path.scenarioId} data-phrase-locale={locale}>
    <div className={styles.header}>
      <div className={styles.icon}><MessageCircleHeart size={24}/></div>
      <div><h4>{t.title}</h4><p>{t.subtitle}</p></div>
    </div>
    <fieldset className={styles.field}>
      <legend>{t.goal}</legend>
      <div className={styles.categories} role="group" aria-label={t.goal}>
        {categories.map(row=><button key={row.id} type="button"
          data-video-phrase-goal={row.id} aria-pressed={path.categoryId===row.id}
          disabled={disabled} onClick={()=>chooseCategory(row.id)}>{row.title}</button>)}
      </div>
    </fieldset>
    <fieldset className={styles.field}>
      <legend>{t.topic}</legend>
      <div className={styles.topics} role="group" aria-label={t.topic}>
        {topics.map(row=><button key={row.id} type="button"
          data-video-phrase-topic={row.id} aria-pressed={path.topicId===row.id}
          disabled={disabled} onClick={()=>chooseTopic(row.id)}>{row.title}</button>)}
      </div>
    </fieldset>
    <fieldset className={styles.field}>
      <legend>{t.scenario}</legend>
      <div className={styles.stories} role="group" aria-label={t.scenario}>
        {scenarios.map(row=><button key={row.id} type="button"
          data-video-phrase-scenario={row.id} aria-pressed={path.scenarioId===row.id}
          disabled={disabled} onClick={()=>chooseScenario(row.id)}>
          <Layers3 size={17}/><span>{row.title}</span>
          {path.scenarioId===row.id?<Check size={17}/>:null}
        </button>)}
      </div>
    </fieldset>
    <fieldset className={styles.field}>
      <legend>{t.idea}</legend>
      <div className={styles.ideas} role="group" aria-label={t.idea}>
        {ideas.map(item=><button key={item.id} type="button"
          data-video-phrase-idea={item.id} aria-pressed={path.ideaId===item.id}
          disabled={disabled} onClick={()=>setPath(previous=>({...previous,ideaId:item.id}))}>
          <Heart size={17}/><span>{item.title}</span>
        </button>)}
      </div>
    </fieldset>
    <div className={styles.filterPanel}>
      <div className={styles.filter}>
        <span>{t.tone}</span>
        <div role="group" aria-label={t.tone}>
          {tones.map(id=><button key={id} type="button" disabled={disabled}
            data-video-phrase-tone={id} aria-pressed={tone===id}
            onClick={()=>setTone(id)}>{t[id]}</button>)}
        </div>
      </div>
      <div className={styles.filterGrid}>
        <div className={styles.filter}>
          <span>{t.speaker}</span>
          <div role="group" aria-label={t.speaker}>
            {speakers.map(id=><button key={id} type="button" disabled={disabled}
              data-video-phrase-speaker={id} aria-pressed={speaker===id}
              onClick={()=>setSpeaker(id)}>{t[id]}</button>)}
          </div>
        </div>
        <div className={styles.filter}>
          <span>{t.length}</span>
          <div role="group" aria-label={t.length}>
            {lengths.map(id=><button key={id} type="button" disabled={disabled}
              data-video-phrase-length={id} aria-pressed={length===id}
              onClick={()=>setLength(id)}>{t[id]}</button>)}
          </div>
        </div>
      </div>
    </div>
    <div className={styles.results} aria-live="polite">
      <h5><Sparkles size={19}/>{t.ready}</h5>
      {phrases.length?phrases.map(phrase=>{
        const text=formatVideoPhraseForOverlay(phrase.text);
        if(!text)return null;
        const selected=selectedPhrase.trim()===text;
        return <button key={phrase.id} type="button" className={styles.phrase}
          data-video-prepared-phrase={phrase.id} data-video-quick-affirmation={phrase.variant-1}
          aria-pressed={selected}
          disabled={disabled} onClick={()=>onPhraseChoose(text)}>
          <span className={styles.quote}>{phrase.text}</span>
          <span className={styles.action}>{selected?<><Check size={16}/>{t.selected}</>:
            <>{t.choose}<Check size={16}/></>}</span>
        </button>;
      }):<p>{t.empty}</p>}
      <p className={styles.note}>{t.note}</p>
      <button type="button" className={styles.audioNext} data-video-phrase-audioguide
        disabled={disabled} onClick={onOpenAudio}><Music2 size={20}/>
        {t.audio}<ArrowRight size={19}/></button>
    </div>
  </div>;
}
