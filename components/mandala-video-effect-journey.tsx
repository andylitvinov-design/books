"use client";

import {useEffect,useState} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import {VIDEO_EFFECT_AREAS,completeVideoEffectScores,compareVideoEffectScores} from "@/lib/mandala/video-effect-measurement.mjs";
import styles from "./mandala-video-effect-journey.module.css";

type Status="idle"|"preparing"|"rendering"|"verifying"|"ready"|"failed";
type Phase="before"|"reaction"|"after"|"results";
type Props={locale:PublicLocale;status:Status;progress:number;videoStarted:boolean;videoEnded:boolean};
type Answers=Array<number|null>;
const blank=():Answers=>Array.from({length:VIDEO_EFFECT_AREAS.length},()=>null);
const TEXT={
  ru:{
    progress:"Ваше видео генерируется",preparing:"Подготавливаем видеосцены…",rendering:"Создаём видео из выбранных сцен",verifying:"Видео записано. Проверяем воспроизведение…",
    invitation:"Давайте отследим эффект",beforeIntro:"Пока создаётся видео, оцените своё состояние до просмотра. Всего 7 коротких вопросов, каждый от 0 до 10.",
    afterIntro:"Ответьте на те же 7 вопросов после просмотра.",low:"0 — совсем нет",high:"10 — максимально",before:"До просмотра",after:"После просмотра",
    question:"Вопрос",back:"Назад",next:"Продолжить",savedBefore:"Первый замер готов",wait:"Посмотрите готовое видео, затем повторите оценку.",
    liked:"Вам понравилось видео?",yes:"Да",no:"Нет",soSo:"Так себе",yourChoice:"Ваш отзыв",repeat:"Повторить тест после просмотра",watchFirst:"Сначала посмотрите видео в проигрывателе выше.",watched:"Я уже посмотрел видео",
    missed:"Замер «до» не был завершён до начала просмотра. Вы можете оценить состояние сейчас, но сравнение без исходных данных не будет рассчитано.",
    failed:"Видео не прошло проверку. Повторная оценка будет доступна после готового ролика.",
    results:"Что изменилось после просмотра",increased:"Выше",decreased:"Ниже",unchanged:"Без изменений",summary:"Из 7 показателей",improved:"выросли",fell:"снизились",stable:"не изменились",
    onlyAfter:"Ваше состояние после просмотра",noBaseline:"Без замера «до» численные изменения определить нельзя.",average:"Средняя оценка",disclaimer:"Это ваш субъективный замер сразу после просмотра, а не доказательство лечебного действия видео.",
    privacy:"Ответы остаются только на этой странице и не отправляются в Telegram, аналитику или на сервер.",zero:"0",ten:"10",done:"Готово",restart:"Оценить другое видео — создайте новый ролик"
  },
  en:{
    progress:"Your video is being generated",preparing:"Preparing the film scenes…",rendering:"Composing your video from the chosen scenes",verifying:"The video has been recorded. Checking playback…",
    invitation:"Let's track how you feel",beforeIntro:"While your video is being made, rate how you feel before watching. Seven short questions, each from 0 to 10.",
    afterIntro:"Answer the same seven questions after watching.",low:"0 — not at all",high:"10 — as much as possible",before:"Before watching",after:"After watching",
    question:"Question",back:"Back",next:"Continue",savedBefore:"First check-in complete",wait:"Watch your finished video, then reassess how you feel.",
    liked:"Did you like the video?",yes:"Yes",no:"No",soSo:"So-so",yourChoice:"Your feedback",repeat:"Repeat the check-in after watching",watchFirst:"First watch the video in the player above.",watched:"I've watched the video",
    missed:"You didn't finish the initial check-in before playback began. You can still rate your state, but we won't calculate an unsupported change.",
    failed:"Video playback verification failed. You can repeat the check-in after a working video is ready.",
    results:"What changed after watching",increased:"Higher",decreased:"Lower",unchanged:"Unchanged",summary:"Out of 7 areas",improved:"increased",fell:"decreased",stable:"stayed the same",
    onlyAfter:"How you feel after watching",noBaseline:"Without a before score, numerical changes cannot be calculated.",average:"Average rating",disclaimer:"These are your subjective immediate ratings, not evidence that the video caused a therapeutic benefit.",
    privacy:"Your answers stay on this page; they are not sent to Telegram, analytics or a server.",zero:"0",ten:"10",done:"Done",restart:"To assess another video, create a new one"
  },
  es:{
    progress:"Se está generando tu vídeo",preparing:"Preparando las escenas…",rendering:"Montando tu vídeo con las escenas elegidas",verifying:"Vídeo grabado. Comprobando la reproducción…",
    invitation:"Vamos a medir cómo te sientes",beforeIntro:"Mientras se crea el vídeo, valora tu estado antes de verlo. Siete preguntas de 0 a 10.",
    afterIntro:"Responde las mismas siete preguntas después de verlo.",low:"0 — nada",high:"10 — al máximo",before:"Antes de verlo",after:"Después de verlo",
    question:"Pregunta",back:"Atrás",next:"Continuar",savedBefore:"Evaluación inicial completa",wait:"Mira el vídeo terminado y después repite la evaluación.",
    liked:"¿Te gustó el vídeo?",yes:"Sí",no:"No",soSo:"Regular",yourChoice:"Tu opinión",repeat:"Repetir evaluación después de verlo",watchFirst:"Mira primero el vídeo en el reproductor de arriba.",watched:"Ya he visto el vídeo",
    missed:"No terminaste la evaluación inicial antes de ver el vídeo. Puedes evaluar tu estado actual, pero no calcularemos cambios sin datos iniciales.",
    failed:"Falló la comprobación del vídeo. Podrás repetir la evaluación cuando esté listo un vídeo válido.",
    results:"Qué cambió después del vídeo",increased:"Subió",decreased:"Bajó",unchanged:"Sin cambio",summary:"De 7 áreas",improved:"subieron",fell:"bajaron",stable:"se mantuvieron",
    onlyAfter:"Tu estado después del vídeo",noBaseline:"Sin evaluación inicial no podemos calcular cambios numéricos.",average:"Valoración media",disclaimer:"Son valoraciones subjetivas inmediatas; no demuestran un efecto terapéutico causado por el vídeo.",
    privacy:"Tus respuestas se quedan en esta página: no se envían a Telegram, analíticas ni al servidor.",zero:"0",ten:"10",done:"Listo",restart:"Para evaluar otro vídeo, crea uno nuevo"
  },
} as const;

/** A separate component instance is keyed to each real export attempt in Studio. */
export function MandalaVideoEffectJourney({locale,status,progress,videoStarted,videoEnded}:Props){
  const t=TEXT[locale]||TEXT.en;
  const [phase,setPhase]=useState<Phase>("before");
  const [before,setBefore]=useState<Answers>(blank);
  const [after,setAfter]=useState<Answers>(blank);
  const [index,setIndex]=useState(0);
  const [reaction,setReaction]=useState<"yes"|"no"|"so-so"|null>(null);
  const [confirmedWatched,setConfirmedWatched]=useState(false);
  const hasBefore=completeVideoEffectScores(before);
  const viewed=videoStarted||videoEnded||confirmedWatched;
  const canPost=status==="ready";
  useEffect(()=>{
    if(viewed&&!hasBefore&&phase==="before")setPhase("reaction");
  },[viewed,hasBefore,phase]);
  if(status==="idle")return null;
  const beforeOrAfter=phase==="before"||phase==="after";
  const scores=phase==="after"?after:before;
  const shownQuestion=VIDEO_EFFECT_AREAS[index];
  const completeAfter=completeVideoEffectScores(after);
  const comparison=hasBefore&&completeAfter?compareVideoEffectScores(before as number[],after as number[]):null;
  function chooseScore(score:number){
    if(phase!=="before"&&phase!=="after")return;
    const next=scores.slice();next[index]=score;
    if(phase==="before")setBefore(next);else setAfter(next);
    if(index===VIDEO_EFFECT_AREAS.length-1){setPhase(phase==="before"?"reaction":"results");setIndex(0);}
    else setIndex(current=>Math.min(VIDEO_EFFECT_AREAS.length-1,current+1));
  }
  function startAfter(){
    if(!canPost||!viewed)return;
    setIndex(0);setPhase("after");
  }
  const renderedProgress=Math.max(0,Math.min(100,Math.round(Number.isFinite(progress)?progress:0)));
  return <section className={styles.root} id="video-effect-journey" data-video-effect-journey data-video-effect-status={status} aria-label={t.invitation}>
    {status==="preparing"||status==="rendering"||status==="verifying"?<div className={styles.render}>
      <strong>{status==="verifying"
        ?(locale==="ru"?"Проверка готового видео":locale==="es"?"Comprobando el vídeo":"Checking your video")
        :t.progress}</strong>
      <p role="status" aria-live="polite">{status==="preparing"?t.preparing:status==="rendering"?t.rendering:t.verifying}</p>
      {status!=="preparing"?<div className={styles.track} role="progressbar" aria-label={t.progress}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={renderedProgress}>
        <span style={{width:renderedProgress+"%"}}/></div>:null}
      {status!=="preparing"?<small>{renderedProgress}%</small>:null}
    </div>:null}
    <div className={styles.header}><h3>{t.invitation}</h3><span>{phase==="before"?t.before:t.after}</span></div>
    {status==="failed"?<p role="alert">{t.failed}</p>:null}
    {phase==="before"&&beforeOrAfter&&status!=="failed"&&!viewed?<p className={styles.explain}>{t.beforeIntro}</p>:null}
    {phase==="before"&&viewed?<p className={styles.explain}>{t.missed}</p>:null}
    {phase==="after"?<p className={styles.explain}>{t.afterIntro}</p>:null}
    {beforeOrAfter&&status!=="failed"&&!(phase==="before"&&viewed)?<div className={styles.question} data-effect-question={phase}>
      <div className={styles.questionHead}><small>{t.question} {index+1} / {VIDEO_EFFECT_AREAS.length}</small>
        <strong>{shownQuestion.label[locale]||shownQuestion.label.en}</strong></div>
      <div className={styles.rating} role="group" aria-label={shownQuestion.label[locale]||shownQuestion.label.en}>
        {Array.from({length:11},(_,value)=><button type="button" key={value}
          className={scores[index]===value?styles.selected:undefined}
          aria-pressed={scores[index]===value} data-video-effect-score={value}
          onClick={()=>chooseScore(value)}>{value}</button>)}
      </div>
      <div className={styles.range}><small>{t.low}</small><small>{t.high}</small></div>
      {index>0?<button type="button" className={styles.back} onClick={()=>setIndex(i=>i-1)}>{t.back}</button>:null}
    </div>:null}
    {phase==="reaction"&&status!=="failed"?<div className={styles.reaction}>
      {hasBefore?<p className={styles.explain}>{t.savedBefore}. {t.wait}</p>:<p className={styles.explain}>{t.missed}</p>}
      {canPost?<>
        <h4>{t.liked}</h4>
        <div className={styles.choices} role="group" aria-label={t.liked}>
          {([['yes',t.yes],['no',t.no],['so-so',t.soSo]] as const).map(([key,label])=><button type="button" key={key}
            data-video-effect-reaction={key} aria-pressed={reaction===key}
            className={reaction===key?styles.selected:undefined} onClick={()=>setReaction(key)}>{label}</button>)}
        </div>
        {!viewed?<button type="button" className={styles.back} onClick={()=>setConfirmedWatched(true)}>{t.watched}</button>:null}
        {reaction?<p className={styles.caption}>{t.yourChoice}: {reaction==="yes"?t.yes:reaction==="no"?t.no:t.soSo}</p>:null}
        <button type="button" className={styles.primary} onClick={startAfter} disabled={!viewed}
          data-video-effect-retest>{t.repeat}</button>
        {!viewed?<p className={styles.caption}>{t.watchFirst}</p>:null}
      </>:null}
    </div>:null}
    {phase==="results"&&completeAfter&&status==="ready"?<div className={styles.results} data-video-effect-results>
      <h4>{comparison?t.results:t.onlyAfter}</h4>
      {comparison?<p className={styles.explain}>{t.summary}: {comparison.improved} {t.improved}, {comparison.decreased} {t.fell}, {comparison.unchanged} {t.stable}.</p>
        :<p className={styles.explain}>{t.noBaseline}</p>}
      <div className={styles.rows}>
        {VIDEO_EFFECT_AREAS.map((area,i)=>{
          const delta=comparison?.rows[i].delta;
          return <div className={styles.resultRow} key={area.id}>
            <span>{area.label[locale]||area.label.en}</span>
            <strong>{comparison?before[i]+" → ":""}{after[i]}/10</strong>
            {delta!==undefined?<small data-effect-delta={area.id} data-direction={delta>0?"up":delta<0?"down":"same"}>
              {delta>0?"+"+delta:delta} · {delta>0?t.increased:delta<0?t.decreased:t.unchanged}</small>:null}
          </div>;
        })}
      </div>
      {comparison?<p className={styles.average}>{t.average}: {comparison.meanBefore} → {comparison.meanAfter} /10</p>:null}
      <p className={styles.caption}>{t.disclaimer}</p>
    </div>:null}
    <p className={styles.privacy}>{t.privacy}</p>
  </section>;
}
