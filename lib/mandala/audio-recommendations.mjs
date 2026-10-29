/**
 * Public, local-only soundtrack catalog for the existing Mandala video editor.
 * Every preset is an original synthetic WAV hosted on this site. No inference
 * from medical tests/profile, external calls, tracking or third-party licenses.
 */
export const mandalaAudioTracks = [
  {id:"harmony",kind:"tones",pace:"slow",moods:["calm"],themes:["energy","health","life"],voiceSafe:true,
    icon:"♫",name:{en:"Harmony",ru:"Гармония",es:"Armonía"},detail:{en:"Soft warm chords",ru:"Мягкие тёплые аккорды",es:"Acordes suaves"}},
  {id:"prosperity",kind:"tones",pace:"steady",moods:["uplift","focus"],themes:["money","goals"],voiceSafe:true,
    icon:"✧",name:{en:"Prosperity",ru:"Процветание",es:"Prosperidad"},detail:{en:"Golden ambient tones",ru:"Светлые обертоны",es:"Tonos luminosos"}},
  {id:"energy",kind:"pulse",pace:"active",moods:["uplift"],themes:["energy","life","goals"],voiceSafe:false,
    icon:"✦",name:{en:"Energy",ru:"Энергия",es:"Energía"},detail:{en:"Lively harmonic pulse",ru:"Живой гармонический пульс",es:"Pulso armónico"}},
  {id:"love",kind:"tones",pace:"slow",moods:["calm","uplift"],themes:["relationships","life"],voiceSafe:true,
    icon:"♡",name:{en:"Warmth",ru:"Тепло",es:"Calidez"},detail:{en:"Tender sustained notes",ru:"Нежные протяжные ноты",es:"Notas cálidas"}},
  {id:"meditation",kind:"tones",pace:"slow",moods:["calm","focus"],themes:["health","energy","goals"],voiceSafe:true,
    icon:"◌",name:{en:"Stillness",ru:"Тишина",es:"Calma"},detail:{en:"Deep unhurried ambience",ru:"Глубокий спокойный фон",es:"Fondo sereno"}},
  {id:"rain",kind:"nature",pace:"slow",moods:["calm","focus"],themes:["health","energy","relationships"],voiceSafe:true,
    icon:"☂",name:{en:"Soft rain",ru:"Мягкий дождь",es:"Lluvia suave"},detail:{en:"Synthesized rain texture",ru:"Синтезированный шум дождя",es:"Lluvia sintetizada"}},
  {id:"ocean",kind:"nature",pace:"slow",moods:["calm"],themes:["health","energy","life"],voiceSafe:true,
    icon:"≋",name:{en:"Ocean waves",ru:"Океан",es:"Océano"},detail:{en:"Soft synthetic surf",ru:"Мягкий шум волн",es:"Oleaje sintetizado"}},
  {id:"breeze",kind:"nature",pace:"steady",moods:["calm","focus"],themes:["life","relationships","goals"],voiceSafe:true,
    icon:"❧",name:{en:"Gentle breeze",ru:"Лёгкий ветер",es:"Brisa suave"},detail:{en:"Airy synthetic soundscape",ru:"Воздушная звуковая фактура",es:"Ambiente de brisa"}},
  {id:"focus",kind:"tones",pace:"steady",moods:["focus"],themes:["money","goals","energy"],voiceSafe:true,
    icon:"◇",name:{en:"Clarity",ru:"Ясность",es:"Claridad"},detail:{en:"Clear balanced chords",ru:"Ровные ясные гармонии",es:"Acordes claros"}},
  {id:"grounding",kind:"tones",pace:"slow",moods:["calm","focus"],themes:["health","relationships","money"],voiceSafe:true,
    icon:"●",name:{en:"Grounding",ru:"Опора",es:"Arraigo"},detail:{en:"Low comforting drone",ru:"Мягкий низкий тон",es:"Tono grave y suave"}},
  {id:"breath",kind:"pulse",pace:"slow",moods:["calm"],themes:["health","energy","relationships"],voiceSafe:true,
    icon:"◍",name:{en:"Breathing",ru:"Дыхание",es:"Respiración"},detail:{en:"Slow swelling harmonics",ru:"Медленная звуковая волна",es:"Ondas lentas"}},
  {id:"sunrise",kind:"tones",pace:"steady",moods:["uplift"],themes:["life","goals","money"],voiceSafe:true,
    icon:"☼",name:{en:"New beginning",ru:"Рассвет",es:"Amanecer"},detail:{en:"Hopeful bright chords",ru:"Светлые вдохновляющие аккорды",es:"Acordes luminosos"}},
  {id:"pulse",kind:"pulse",pace:"active",moods:["focus","uplift"],themes:["money","goals","energy"],voiceSafe:false,
    icon:"✳",name:{en:"Momentum",ru:"Импульс",es:"Impulso"},detail:{en:"Steady motivational rhythm",ru:"Упругий мягкий ритм",es:"Ritmo motivador"}},
];

/** Discrete, transparent local ranking. No network/AI profiling. A filter is
 * a strict limit; theme only changes the ranking inside the chosen subgenre.
 * A typed wish only informs broad calm/focus/uplift intent, never a diagnosis.
 */
export function recommendMandalaAudio({
  theme="energy", kind="all", mood="all", pace="all",
  voiceFriendly=false, wish="",
}={}) {
  const message=typeof wish==="string"?wish.slice(0,160).toLowerCase():"";
  const textMood = /focus|clarity|концентр|фокус|ясност|concentr|claridad|собран/.test(message)?"focus"
    : /calm|peace|quiet|relax|спокой|мир|покой|tranquil|calma/.test(message)?"calm"
    : /inspir|motivat|энерг|вдохнов|решим|inspirac|motivac/.test(message)?"uplift":null;
  return mandalaAudioTracks
    .filter(track=>(kind==="all"||track.kind===kind) &&
      (pace==="all"||track.pace===pace) &&
      (mood==="all"||track.moods.includes(mood)) &&
      (!voiceFriendly||track.voiceSafe))
    .map((track,index)=>({
      ...track, relevance:(track.themes.includes(theme)?16:0)
        +(mood!=="all"&&track.moods.includes(mood)?6:0)
        +(textMood&&track.moods.includes(textMood)?4:0)
        +(voiceFriendly&&track.voiceSafe?2:0)
        +(track.pace==="slow"&&theme==="health"?1:0),
      stableIndex:index,
    }))
    .sort((a,b)=>b.relevance-a.relevance||a.stableIndex-b.stableIndex);
}
