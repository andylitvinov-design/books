"use client";
import {AudioLines,Check,Film,Mic2,Trash2,UploadCloud} from "lucide-react";
import type {TimedSpeechTranscript,AudioVisualPlan} from "@/lib/mandala/audio-visual-storyboard.mjs";
import type {AudioVideoConcept} from "@/lib/mandala/audio-concept-director.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-auto-video-director.module.css";

// This is presentation only: the parent Studio owns consent, transcription,
// the original user File and source-verified montage, without a second renderer.
export type RecipientAudioEntryProps={
  fileName:string|null;rightsGranted:boolean;consentGranted:boolean;
  busy:boolean;error:string;transcript:TimedSpeechTranscript|null;
  visualPlan:AudioVisualPlan|null;concept:AudioVideoConcept|null;
  clipLabel:(sceneId:string)=>string;
  onUpload:(file:File)=>void;onRemove:()=>void;
  onRightsChange:(allowed:boolean)=>void;onConsentChange:(allowed:boolean)=>void;
  onAnalyze:()=>void;onPrepare:()=>boolean;
};
const words={
 ru:{
  title:"Видеоряд по вашей аудиозаписи",
  subtitle:"Загрузите голос, медитацию или послание. Выделим смысловые образы и предложим настоящие видеосцены.",
  upload:"Загрузить аудио",hint:"MP3, M4A, WAV, WebM или AAC · до 4 МБ · до 59 секунд.",
  remove:"Убрать запись",rights:"Я имею право использовать эту аудиозапись в видео.",
  consent:"Разрешаю однократно передать запись внешнему сервису распознавания. Сайт не сохраняет запись и расшифровку.",
  analyze:"Расшифровать и подобрать видеоряд",busy:"Распознаём речь…",
  text:"Расшифрованный текст",segments:"Речь по времени",concept:"Концепция по ключевым словам",
  keywords:"Смысловые образы",purpose:"Назначение",goal:"Цель",category:"Категория",topic:"Тема",style:"Стиль",symbol:"Символ",pace:"Темп",paceSlow:"Мягкий",paceEven:"Ровный",paceFast:"Динамичный",suggestion:"Предложение на основе речи, не доказательство точного содержания кадра.",scene:"Монтажный план",ready:"Реальные проверенные видеосцены подобраны. Проверьте кадры перед созданием ролика.",
  planError:"Для записи не найдено достаточно подходящих проверенных кадров. Попробуйте другую короткую запись.",
  review:"Некоторые образы приблизительные, проверьте соответствие словам.",
  prepare:"Подготовить видеоряд и открыть монтаж",
  privacy:"Исходный голос останется в видео без повторов. Никакой автоматической публикации.",
 },
 en:{
  title:"Footage for your audio",
  subtitle:"Upload a voice message, meditation or narration. We match licensed video clips to spoken meaning.",
  upload:"Upload audio",hint:"MP3, M4A, WAV, WebM or AAC · up to 4 MB · up to 59 seconds.",
  remove:"Remove audio",rights:"I have permission to use this audio in a video.",
  consent:"I agree to send this recording once to an external transcription service. The site does not store audio or text.",
  analyze:"Transcribe and match scenes",busy:"Transcribing…",
  text:"Transcript",segments:"Timed speech",concept:"Keyword-based visual concept",
  keywords:"Visual concepts",purpose:"Purpose",goal:"Goal",category:"Category",topic:"Topic",style:"Style",symbol:"Symbol",pace:"Pace",paceSlow:"Gentle",paceEven:"Even",paceFast:"Dynamic",suggestion:"Suggested from the transcript; a scene tag does not guarantee an exact visual.",scene:"Shot-by-shot storyboard",ready:"Licensed footage matched. Review before creating your video.",
  planError:"Not enough verified footage matched this recording. Try another short clip.",
  review:"Some scenes are symbolic. Please check their meaning.",
  prepare:"Prepare footage and open Montage",
  privacy:"Your original voice stays in the video once, without looping. Nothing is published automatically.",
 },
 es:{
  title:"Vídeo a partir de tu audio",
  subtitle:"Sube una voz, meditación o mensaje. Seleccionamos escenas autorizadas por sus significados.",
  upload:"Subir audio",hint:"MP3, M4A, WAV, WebM o AAC · hasta 4 MB · hasta 59 segundos.",
  remove:"Quitar audio",rights:"Tengo permiso para usar este audio en un vídeo.",
  consent:"Autorizo enviar este audio una vez al servicio externo de transcripción. El sitio no guarda audio ni texto.",
  analyze:"Transcribir y elegir escenas",busy:"Transcribiendo…",
  text:"Transcripción",segments:"Voz por tiempos",concept:"Concepto visual por palabras clave",
  keywords:"Conceptos",purpose:"Finalidad",goal:"Objetivo",category:"Categoría",topic:"Tema",style:"Estilo",symbol:"Símbolo",pace:"Ritmo",paceSlow:"Suave",paceEven:"Uniforme",paceFast:"Dinámico",suggestion:"Una sugerencia basada en la voz, no la confirmación de cada imagen.",scene:"Guion visual",ready:"Clips autorizados listos. Revísalos antes de crear el vídeo.",
  planError:"Faltan clips verificados para esta grabación. Prueba un audio más corto.",
  review:"Algunas escenas son simbólicas. Comprueba su significado.",
  prepare:"Preparar y abrir montaje",
  privacy:"Tu voz original se mantiene sin repetirse. No se publica nada automáticamente.",
 }
} as const;
export function MandalaRecipientAudioEntry({locale,disabled,audio}:{
 locale:PublicLocale;disabled:boolean;audio:RecipientAudioEntryProps;
}){
 const t=words[locale];
 const plan=audio.visualPlan;
 const concept=audio.concept;
 const keywords=concept?.keywords.map(k=>k.id)||[];
 const canAnalyze=Boolean(audio.fileName)&&audio.rightsGranted&&audio.consentGranted&&!audio.busy&&!disabled;
 const canPrepare=Boolean(audio.fileName)&&audio.rightsGranted&&audio.transcript!==null&&
   plan?.canExport===true&&!audio.busy&&!disabled;
 return <section className={css.recipientAudioPanel} data-video-recipient-audio-workflow
   aria-labelledby="recipient-audio-heading">
   <div className={css.recipientAudioHeading}>
     <AudioLines size={24} aria-hidden="true"/>
     <div><strong id="recipient-audio-heading">{t.title}</strong><p>{t.subtitle}</p></div>
   </div>
   <label htmlFor="video-recipient-audio-file" className={css.recipientAudioUpload}>
     <UploadCloud size={20} aria-hidden="true"/>{t.upload}
   </label>
   <input id="video-recipient-audio-file" data-video-recipient-audio-upload
     className={css.recipientAudioFile} type="file"
     accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/webm,.mp3,.m4a,.wav,.aac,.mp4,.webm"
     disabled={disabled||audio.busy}
     onChange={event=>{
       const file=event.currentTarget.files?.[0];
       event.currentTarget.value="";
       if(file)audio.onUpload(file);
     }}/>
   <small className={css.recipientAudioSmall}>{t.hint}</small>
   {audio.fileName?<div className={css.recipientAudioSelected} data-video-recipient-audio-selected>
     <Mic2 size={17} aria-hidden="true"/><strong>{audio.fileName}</strong>
     <button type="button" onClick={audio.onRemove}
       disabled={disabled||audio.busy} aria-label={t.remove}><Trash2 size={17}/></button>
   </div>:null}
   {audio.fileName?<div className={css.recipientAudioConsent}>
     <label><input type="checkbox" data-video-recipient-audio-rights
       checked={audio.rightsGranted} disabled={disabled||audio.busy}
       onChange={event=>audio.onRightsChange(event.currentTarget.checked)}/>
       <span>{t.rights}</span></label>
     <label><input type="checkbox" data-video-recipient-audio-stt-consent
       checked={audio.consentGranted} disabled={disabled||audio.busy}
       onChange={event=>audio.onConsentChange(event.currentTarget.checked)}/>
       <span>{t.consent}</span></label>
     <button type="button" data-video-recipient-audio-analyze
       className={css.recipientAudioPrimary} disabled={!canAnalyze}
       onClick={audio.onAnalyze}><AudioLines size={17} aria-hidden="true"/>
       {audio.busy?t.busy:t.analyze}</button>
   </div>:null}
   {audio.error?<p role="alert" className={css.recipientAudioWarning}
     data-video-recipient-audio-error>{audio.error}</p>:null}
   {audio.transcript?<div className={css.recipientAudioResult}
     data-video-recipient-audio-transcript>
     <strong><Check size={17} aria-hidden="true"/>{t.text} · {audio.transcript.durationSeconds.toFixed(1)} s</strong>
     <p className={css.recipientAudioTranscript}>{audio.transcript.text}</p>
     <details><summary>{t.segments}</summary>
       <ol>{audio.transcript.segments.map((segment,index)=><li key={index}>
         {segment.startSeconds.toFixed(1)}–{segment.endSeconds.toFixed(1)} s · {segment.text}
       </li>)}</ol>
     </details>
   </div>:null}
   {concept?<div className={css.recipientAudioResult}
     data-video-recipient-audio-concept data-plan-status={plan?.status||"TRANSCRIPT_ONLY"}>
     <strong><Film size={18} aria-hidden="true"/>{t.concept}</strong>
     <dl className={css.recipientConceptFields} data-video-recipient-audio-fields>
       <div data-video-recipient-audio-purpose><dt>{t.purpose}</dt><dd>{concept.purpose}</dd></div>
       <div data-video-recipient-audio-goal><dt>{t.goal}</dt><dd>{concept.goal.text}</dd></div>
       <div data-video-recipient-audio-category><dt>{t.category}</dt><dd>{concept.category}</dd></div>
       {concept.topic?<div data-video-recipient-audio-topic><dt>{t.topic}</dt><dd>{concept.topic}</dd></div>:null}
       <div data-video-recipient-audio-style><dt>{t.style}</dt><dd>{concept.style.label||"—"}</dd></div>
       <div data-video-recipient-audio-symbol><dt>{t.symbol}</dt>
         <dd>{concept.symbol?.label||"—"}</dd></div>
       <div data-video-recipient-audio-pace><dt>{t.pace}</dt>
         <dd>{concept.pace==="gentle"?t.paceSlow:concept.pace==="dynamic"?t.paceFast:t.paceEven}</dd></div>
     </dl>
     {keywords.length?<p data-video-recipient-audio-keywords>
       <b>{t.keywords}:</b> {keywords.join(" · ")}</p>:null}
     <small className={css.recipientAudioSmall}>{t.suggestion}</small>
     {plan&&plan.canExport?<>
       <p>{t.ready}</p>
       <details open><summary>{t.scene} · {plan.shots.length}</summary>
         <ol>{plan.shots.map((shot,index)=><li key={index}>
           <b>{shot.startSeconds}–{shot.endSeconds} s</b> · {audio.clipLabel(shot.sceneId)}
           {shot.concepts.length?" · "+shot.concepts.join(", "):""}
           {shot.needsReview?" ⚠":""}
         </li>)}</ol>
       </details>
       {plan.needsReview?<p className={css.recipientAudioWarning}>{t.review}</p>:null}
       <button type="button" data-video-recipient-audio-prepare
         className={css.recipientAudioPrimary} disabled={!canPrepare}
         onClick={()=>audio.onPrepare()}><Film size={17} aria-hidden="true"/>{t.prepare}</button>
     </>:<p role="status" className={css.recipientAudioWarning}
       data-video-recipient-audio-no-footage>{t.planError} {plan?.status?"("+plan.status+")":""}</p>}
   </div>:null}
   <small className={css.recipientAudioSmall}>{t.privacy}</small>
 </section>;
}
