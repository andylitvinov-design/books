/**
 * Deterministic final gate for LLM prose. These are guardrails and editorial
 * signals, NOT clinical assessment or a claim that prose is safe for release.
 */
import { WRITER_BEAT_IDS } from "./contract.mjs";
export const WRITER_EDITOR_VERSION="writer-editor-v1";
const FORBIDDEN_GENERAL=[
  /https?:\/\/|www\./iu,
  /<\s*\/?\s*(?:script|iframe|audio|video|img|a|style)\b/iu,
  /(?:ignore (?:all |previous |the )?instructions|system prompt|developer instructions)/iu,
  /(?:игнорируй (?:все |предыдущие )?инструкции|системный промпт)/iu,
  /(?:гарантированно (?:исцел|разбогат)|(?:вы|ты) обязательно (?:исцел|разбогат))/iu,
  /(?:guaranteed (?:cure|healing|wealth)|you will definitely be cured)/iu,
  /(?:curaci[oó]n garantizada|riqueza garantizada)/iu,
  /(?:вспомните|вспомни|вернитесь|вернись).{0,60}(?:детск|травм)/iu,
  /(?:relive|recover).{0,40}(?:trauma|childhood memory)/iu,
  /(?:revive|recuerda).{0,50}(?:trauma|infancia)/iu,
  // Even without an eyes_closed avoidance choice, never require closed eyes.
  /(?:закройте|закрой|плотно сомкните) (?:свои )?глаза/iu,
  /(?:close your eyes|cierra los ojos)/iu,
  /(?:задержите|задержи).{0,25}(?:дыхание|вдох|выдох)/iu,
  /(?:hold your breath|cont[eé]n (?:tu )?respiraci[oó]n)/iu,
];
const EXCLUSIONS={
  breath_focus:[
    /(?:сосредоточьтесь|следите|контролируйте|углубите|замедлите|дышите|сделайте).{0,45}(?:дыхани|вдох|выдох)/iu,
    /(?:focus on|control|slow|deepen|take a deep).{0,35}(?:breath|inhale|exhale)/iu,
    /(?:conc[eé]ntrate|controla|respira profundamente).{0,35}(?:respiraci[oó]n|aire)?/iu,
  ],
  eyes_closed:[/(?:закройте|закрой) (?:свои )?глаза/iu,/(?:close your eyes|cierra los ojos)/iu],
  touch:[/(?:прикоснитесь|коснитесь|погладьте|обнимите)/iu,/(?:touch|embrace|stroke your)/iu,/(?:toca|abraza|acaricia)/iu],
  water:[/(?:вода|воды|воду|море|река|озеро|ручей|водопад|дождь)/iu,/\b(?:water|sea|river|lake|brook|rain|ocean)\b/iu,/\b(?:agua|mar|r[ií]o|lago|lluvia|oc[eé]ano)\b/iu],
  animals:[/(?:животн|птиц|собак|кошк|волк|лошад)/iu,/\b(?:animal|bird|dog|cat|wolf|horse)\b/iu,/\b(?:animal|p[aá]jaro|perro|gato|lobo|caballo)\b/iu],
  darkness:[/(?:темнот|тьм|ноч[ьи]|мрак|тёмн)/iu,/\b(?:dark|darkness|night|shadow)\b/iu,/\b(?:oscuridad|noche|sombra)\b/iu],
  people:[/(?:незнакомец|другой человек|группа людей|встреча с человеком)/iu,/\b(?:stranger|another person|a crowd|people gather)\b/iu,/\b(?:desconocido|otra persona|multitud)\b/iu],
  body_scan:[/(?:сканируйте тело|пройдите вниманием по телу|ощутите каждую часть тела)/iu,/(?:scan your body|body scan|every part of your body)/iu,/(?:escanea tu cuerpo|recorre todo tu cuerpo)/iu],
};
const words=text=>text.trim().split(/\s+/u).filter(Boolean);
export function reviewNarrationSegment({brief,beat,text}={}) {
  const issues=[];
  if(!brief || !beat || !WRITER_BEAT_IDS.includes(beat.id) ||
     typeof text!=="string" || text.length<35 || text.length>2400 ||
     /[\u0000-\u0008\u000B-\u001F]/u.test(text||""))
    return Object.freeze({ok:false,issues:["SEGMENT_INVALID"]});
  const trimmed=text.trim();
  const wc=words(trimmed).length;
  if(wc>beat.maxWords || wc<Math.max(8,Math.floor(beat.targetWords*0.24)))
    issues.push("WORD_BUDGET_MISMATCH");
  if(FORBIDDEN_GENERAL.some(rx=>rx.test(trimmed)))issues.push("FORBIDDEN_CONTENT");
  if((brief.avoidElements||[]).some(id=>(EXCLUSIONS[id]||[]).some(rx=>rx.test(trimmed))))
    issues.push("EXPLICIT_AVOIDANCE_BROKEN");
  if(brief.locale==="ru" && !/[А-Яа-яЁё]/u.test(trimmed))issues.push("WRONG_LOCALE");
  if(brief.locale!=="ru" && /[А-Яа-яЁё]/u.test(trimmed))issues.push("WRONG_LOCALE");
  if(/^\s*[\[{]/u.test(trimmed) || /^\s*(?:#{1,3}|\d+\.)\s/u.test(trimmed))
    issues.push("NARRATION_NOT_PLAIN_TEXT");
  return Object.freeze({ok:issues.length===0,issues:Object.freeze(issues),
    words:wc});
}
export function reviewMeditationDraft({brief,segments}={}) {
  const errors=[];
  if(!brief || !Array.isArray(segments) || segments.length!==WRITER_BEAT_IDS.length)
    return {status:"rejected",errors:["DRAFT_SEGMENTS_INVALID"],requiresHumanReview:true};
  let totalWords=0;
  for(let i=0;i<segments.length;i++){
    const s=segments[i];
    const beat=brief.beats?.[i];
    if(!s || s.beatId!==WRITER_BEAT_IDS[i] || beat?.id!==s.beatId){
      errors.push("BEAT_SEQUENCE_INVALID");continue;
    }
    const item=reviewNarrationSegment({brief,beat,text:s.text});
    totalWords+=item.words||0;
    errors.push(...item.issues.map(x=>s.beatId+":"+x));
    if(!Number.isInteger(s.pauseAfterMs) || s.pauseAfterMs<0 || s.pauseAfterMs>12000)
      errors.push(s.beatId+":PAUSE_INVALID");
  }
  // Compare to actual audio after TTS. This is an estimate, not 5/10/15min guarantee.
  const estimatedSpeechSeconds=Math.ceil(totalWords/1.6);
  const estimatedPauseSeconds=Math.round(segments.reduce((a,s)=>a+(s?.pauseAfterMs||0),0)/1000);
  const joined=segments.map(s=>s?.text||"").join(" ");
  const sentences=joined.split(/[.!?。！？]+/u).map(x=>x.trim().toLowerCase()).filter(x=>x.length>18);
  const duplicates=sentences.length-new Set(sentences).size;
  const warnings=duplicates?["REPEATED_SENTENCES"]:[];
  return Object.freeze({
    status:errors.length?"rejected":"draft_review_required",
    errors:Object.freeze([...new Set(errors)]),warnings:Object.freeze(warnings),
    totalWords,estimatedSpeechSeconds,estimatedPauseSeconds,
    estimatedDurationSeconds:estimatedSpeechSeconds+estimatedPauseSeconds,
    editorialChecklist:Object.freeze(["semantic_fidelity","narrative_coherence",
      "literary_expression","spoken_naturalness","emotional_agency","pacing"]),
    requiresHumanReview:true,mayPublishAutomatically:false,
  });
}
