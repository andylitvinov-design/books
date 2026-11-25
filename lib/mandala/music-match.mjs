import {curatedAudioTracks} from "./curated-audio-recommendations.mjs";
/**
 * Music Match: a single explainable, device-local ranking for already approved
 * Holistic House melodies. No uploads, network requests, opaque AI scores,
 * personal profiles or speculative rights checks.
 *
 * All song sources are supplied by the existing verified asset registries.
 * Ineligible unpublished candidates and nature/tones/pulse are excluded.
 */
export const MUSIC_MATCH_VERSION = "hh-music-match-v1";
const THEMES=new Set(["money","energy","relationships","goals","life","health"]);
const MOODS=new Set(["calm","focus","uplift"]);
const CURATED_LICENSES=new Set(["CC0-1.0","CC-BY-3.0","CC-BY-4.0","PDM-1.0"]);
const PACES=new Set(["slow","steady","active"]);
const LANGS=["ru","en","es"];
const INTENT_PATTERNS=Object.freeze({
  calm:/спокой|тишин|тихо|нежн|мягк|расслаб|восстанов|отдых|тревог|стресс|покой|calm|peace|quiet|gentle|soft|rest|relax|anxiet|stress|tranquil|seren|descans|suave|paz/iu,
  focus:/ясност|фокус|вниман|концентр|собран|решен|работ|проект|презентац|план|действ|focus|clarity|clear|concentrat|business|project|work|present|decisi|plan|claridad|enfoque|concentraci[oó]n|trabajo|proyecto/iu,
  uplift:/вдохнов|энерг|радост|праздн|побед|успех|рассвет|солнц|рост|мотивац|сила|возможност|inspir|energy|joy|celebrat|sunrise|sunlight|success|growth|motivat|uplift|confidence|alegr[ií]a|energ[ií]a|crecim|fuerza|[eé]xito|celebraci[oó]n/iu,
});
const PURPOSE_PATTERNS=Object.freeze({
  rest:/сон|отдых|успок|расслаб|медитац|stress|rest|sleep|relax|meditat|calm|descans|dormir|tranquil/iu,
  connection:/любов|сердц|близост|отношен|семь|мам|довер|обнят|love|heart|connect|family|tender|trust|amor|coraz[oó]n|familia|confianza|cari[nñ]o/iu,
  confidence:/уверен|опор|устойчив|поддерж|смелост|strength|confidence|ground|support|courage|confianza|apoyo|seguridad|estabilidad/iu,
  activation:/новый этап|начат|старт|движен|успех|праздн|поздрав|start|begin|rise|celebrat|success|momentum|nuevo comienzo|felicita|logro/iu,
});
const PURPOSE_MOODS={rest:"calm",connection:"calm",confidence:"focus",activation:"uplift"};
const PURPOSE_PACES={rest:"slow",connection:"slow",confidence:"steady",activation:"active"};
const INSTRUMENTS=Object.freeze({
  piano:/piano|пианино|фортепиано|клавиш|teclas/iu,
  harp:/арф|harp|arpa/iu,
  flute:/флейт|flute|flauta/iu,
  strings:/струн|скрипк|strings|cuerdas/iu,
  marimba:/маримб|marimba/iu,
  kalimba:/калимб|kalimba/iu,
  bells:/колоколь|bells|campanas|челест|celesta/iu,
});
const MOTIF_WORDS=Object.freeze({
  sun:/солнц|рассвет|луч|sun|sunlight|dawn|solar|sol|amanecer/iu,
  nature:/лес|природ|луг|гор|forest|nature|mountain|naturaleza|bosque|monta[nñ]a/iu,
  ocean:/море|волн|океан|морск|ocean|sea|wave|mar|ola/iu,
  night:/ноч|сон|зв[её]зд|night|star|sleep|noche|estrella|dormir/iu,
  heart:/любов|сердц|близ|heart|love|tender|amor|coraz[oó]n/iu,
  money:/деньг|финанс|бизнес|доход|money|financial|business|negocio|dinero/iu,
  path:/путь|дорог|цель|движен|path|journey|goal|road|camino|meta/iu,
});
const WORD_LIMIT=1000;
const textOf=v=>String(v||"").slice(0,WORD_LIMIT).toLocaleLowerCase();
const unique=x=>[...new Set(x)];
const trackTitle=track=>LANGS.map(lang=>[track.name?.[lang],track.detail?.[lang]]).flat().filter(Boolean).join(" ").toLocaleLowerCase();
function intentFrom(text){
  const moods=Object.entries(INTENT_PATTERNS).filter(([,rx])=>rx.test(text)).map(([k])=>k);
  const purposes=Object.entries(PURPOSE_PATTERNS).filter(([,rx])=>rx.test(text)).map(([k])=>k);
  for(const purpose of purposes)if(!moods.includes(PURPOSE_MOODS[purpose]))moods.push(PURPOSE_MOODS[purpose]);
  return {moods,purposes,motifs:Object.entries(MOTIF_WORDS).filter(([,rx])=>rx.test(text)).map(([k])=>k)};
}
function tagTrack(track){
  const text=trackTitle(track)+" "+textOf(track.id);
  const instruments=Object.entries(INSTRUMENTS).filter(([,rx])=>rx.test(text)).map(([k])=>k);
  const motifs=Object.entries(MOTIF_WORDS).filter(([,rx])=>rx.test(text)).map(([k])=>k);
  return Object.freeze({
    themes:Object.freeze([...track.themes]),moods:Object.freeze([...track.moods]),pace:track.pace,
    voiceSafe:track.voiceSafe,instruments:Object.freeze(instruments),motifs:Object.freeze(motifs),
    durationSeconds:track.durationSeconds??null,
  });
}

const PUBLISHED_CUSTOMER_RECORDINGS=new Map(curatedAudioTracks.map(track=>[track.id,track]));
/** For NEW recommendations only, a rights-reviewed imported recording is required.
 * Historical generated files remain resolvable for saved project compatibility.
 * Artistic listening acceptance remains a separate human gate. */
function isVerifiedPublishedRecording(track){
 const master=PUBLISHED_CUSTOMER_RECORDINGS.get(track?.id);
 if(!master||!track?.rights||!master.rights)return false;
 return track.kind==="melody"&&
  track.rights.sourceType==="reviewed_external_recording"&&
  CURATED_LICENSES.has(track.rights.license)&&
  track.rights.license===master.rights.license&&
  track.rights.sourcePage===master.rights.sourcePage&&
  track.rights.recordingLicenseEvidence===master.rights.recordingLicenseEvidence&&
  track.rights.creator===master.rights.creator&&
  track.rights.performer===master.rights.performer&&
  track.rights.composerRights===master.rights.composerRights&&
  ["public_domain","licensed_for_commercial_sync"].includes(track.rights.composerRights)&&
  /^https:\/\//.test(track.rights.sourcePage||"")&&
  track.durationSeconds===master.durationSeconds&&
  track.pace===master.pace&&track.voiceSafe===master.voiceSafe&&
  track.themes.join("|")===master.themes.join("|")&&
  track.moods.join("|")===master.moods.join("|")&&
  LANGS.every(lang=>track.name[lang]===master.name[lang]);
}
const safeSong=t=>t&&t.kind==="melody"&&typeof t.id==="string"&&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id)&&
  t.name&&t.detail&&LANGS.every(l=>typeof t.name[l]==="string"&&t.name[l].trim()&&
    typeof t.detail[l]==="string")&&
  Array.isArray(t.themes)&&t.themes.length>0&&t.themes.every(x=>THEMES.has(x))&&
  Array.isArray(t.moods)&&t.moods.length>0&&t.moods.every(x=>MOODS.has(x))&&
  PACES.has(t.pace)&&typeof t.voiceSafe==="boolean"&&
  (typeof t.durationSeconds==="number"&&Number.isFinite(t.durationSeconds)&&t.durationSeconds>0)&&
  isVerifiedPublishedRecording(t);
/**
 * The only input is the current consented request, theme, scenario and approved
 * existing music catalogs. Returns ranked tracks with structured tags/reasons.
 */
export function rankPersonalMusic({tracks=[],theme="energy",wish="",transcript="",scenarioId="",
  priorityIds=[],kind="melody",mood="all",pace="all",voiceFriendly=false,limit=3}={}){
  if(!Array.isArray(tracks)||tracks.length>4000)return [];
  const hasVoice=voiceFriendly===true;
  const safeLimit=Number.isInteger(limit)?Math.min(300,Math.max(1,limit)):3;
  const userText=(textOf(wish)+" "+textOf(transcript)).trim();
  const intent=intentFrom(userText);
  const chosenPace=PACES.has(pace)?pace:null;
  const chosenMood=MOODS.has(mood)?mood:null;
  const preferredIds=new Set(Array.isArray(priorityIds)?priorityIds.filter(x=>typeof x==="string").slice(0,20):[]);
  const seen=new Set();const scored=[];
  for(const [index,track] of tracks.entries()){
    if(!safeSong(track)||seen.has(track.id)||
      kind!=="all"&&kind!=="melody" ||
      chosenMood&&!track.moods.includes(chosenMood) ||
      chosenPace&&track.pace!==chosenPace ||
      hasVoice&&!track.voiceSafe)continue;
    seen.add(track.id);
    const tags=tagTrack(track);
    const themeScore=track.themes.includes(theme)?35:0;
    const contextScore=preferredIds.has(track.id)?30:
      typeof scenarioId==="string"&&scenarioId&&track.id.startsWith("score-"+scenarioId+"-")?25:0;
    const moodMatches=unique(intent.moods.filter(x=>track.moods.includes(x)));
    let emotionScore=moodMatches.length?Math.min(27,moodMatches.length*18):0;
    if(chosenMood&&track.moods.includes(chosenMood))emotionScore+=8;
    const pacePreferences=unique(intent.purposes.map(x=>PURPOSE_PACES[x]));
    const paceScore=chosenPace?12:pacePreferences.includes(track.pace)?12:
      intent.moods.includes("calm")&&track.pace==="slow"?10:
      intent.moods.includes("focus")&&track.pace==="steady"?9:
      intent.moods.includes("uplift")&&track.pace==="active"?9:0;
    const motifMatches=intent.motifs.filter(x=>tags.motifs.includes(x));
    const motifScore=Math.min(12,motifMatches.length*6);
    const vocalScore=hasVoice&&track.voiceSafe?8:0;
    const score=themeScore+contextScore+emotionScore+paceScore+motifScore+vocalScore;
    const reasons=[...(contextScore?["story"]:[]),...(themeScore?["goal"]:[]),...(moodMatches.length?["mood"]:[]),
      ...(paceScore?["tempo"]:[]),...(motifMatches.length?["imagery"]:[]),...(hasVoice?["voice"]:[])];
    scored.push({...track,tags,score,reasons,index});
  }
  scored.sort((a,b)=>b.score-a.score||a.index-b.index);
  // Diversity: real alternatives, not three near-identical versions.
  const picked=[],usedSignatures=new Set();
  for(const t of scored){
    if(picked.length>=safeLimit)break;
    const signature=t.pace+":"+[...t.moods].sort().join("+");
    if(usedSignatures.has(signature))continue;
    picked.push(t);usedSignatures.add(signature);
  }
  for(const t of scored){if(picked.length>=safeLimit)break;if(!picked.includes(t))picked.push(t)}
  return picked.map(({index,...row})=>Object.freeze(row));
}
