/**
 * Public, local-only soundtrack catalog for the existing Mandala video editor.
 * Every preset is an original synthetic WAV hosted on this site. No inference
 * from medical tests/profile, external calls, tracking or third-party licenses.
 */
export const mandalaAudioTracks = [
  {id:"harmony",new:false,durationSeconds:8,kind:"tones",pace:"slow",moods:["calm"],themes:["energy","health","life"],voiceSafe:true,
    icon:"♫",name:{en:"Harmony",ru:"Гармония",es:"Armonía"},detail:{en:"Soft warm chords",ru:"Мягкие тёплые аккорды",es:"Acordes suaves"}},
  {id:"prosperity",new:false,durationSeconds:8,kind:"tones",pace:"steady",moods:["uplift","focus"],themes:["money","goals"],voiceSafe:true,
    icon:"✧",name:{en:"Prosperity",ru:"Процветание",es:"Prosperidad"},detail:{en:"Golden ambient tones",ru:"Светлые обертоны",es:"Tonos luminosos"}},
  {id:"energy",new:false,durationSeconds:8,kind:"pulse",pace:"active",moods:["uplift"],themes:["energy","life","goals"],voiceSafe:false,
    icon:"✦",name:{en:"Energy",ru:"Энергия",es:"Energía"},detail:{en:"Lively harmonic pulse",ru:"Живой гармонический пульс",es:"Pulso armónico"}},
  {id:"love",new:false,durationSeconds:8,kind:"tones",pace:"slow",moods:["calm","uplift"],themes:["relationships","life"],voiceSafe:true,
    icon:"♡",name:{en:"Warmth",ru:"Тепло",es:"Calidez"},detail:{en:"Tender sustained notes",ru:"Нежные протяжные ноты",es:"Notas cálidas"}},
  {id:"meditation",new:false,durationSeconds:8,kind:"tones",pace:"slow",moods:["calm","focus"],themes:["health","energy","goals"],voiceSafe:true,
    icon:"◌",name:{en:"Stillness",ru:"Тишина",es:"Calma"},detail:{en:"Deep unhurried ambience",ru:"Глубокий спокойный фон",es:"Fondo sereno"}},
  {id:"rain",new:false,durationSeconds:8,kind:"nature",pace:"slow",moods:["calm","focus"],themes:["health","energy","relationships"],voiceSafe:true,
    icon:"☂",name:{en:"Soft rain",ru:"Мягкий дождь",es:"Lluvia suave"},detail:{en:"Synthesized rain texture",ru:"Синтезированный шум дождя",es:"Lluvia sintetizada"}},
  {id:"ocean",new:false,durationSeconds:8,kind:"nature",pace:"slow",moods:["calm"],themes:["health","energy","life"],voiceSafe:true,
    icon:"≋",name:{en:"Ocean waves",ru:"Океан",es:"Océano"},detail:{en:"Soft synthetic surf",ru:"Мягкий шум волн",es:"Oleaje sintetizado"}},
  {id:"breeze",new:false,durationSeconds:8,kind:"nature",pace:"steady",moods:["calm","focus"],themes:["life","relationships","goals"],voiceSafe:true,
    icon:"❧",name:{en:"Gentle breeze",ru:"Лёгкий ветер",es:"Brisa suave"},detail:{en:"Airy synthetic soundscape",ru:"Воздушная звуковая фактура",es:"Ambiente de brisa"}},
  {id:"focus",new:false,durationSeconds:8,kind:"tones",pace:"steady",moods:["focus"],themes:["money","goals","energy"],voiceSafe:true,
    icon:"◇",name:{en:"Clarity",ru:"Ясность",es:"Claridad"},detail:{en:"Clear balanced chords",ru:"Ровные ясные гармонии",es:"Acordes claros"}},
  {id:"grounding",new:false,durationSeconds:8,kind:"tones",pace:"slow",moods:["calm","focus"],themes:["health","relationships","money"],voiceSafe:true,
    icon:"●",name:{en:"Grounding",ru:"Опора",es:"Arraigo"},detail:{en:"Low comforting drone",ru:"Мягкий низкий тон",es:"Tono grave y suave"}},
  {id:"breath",new:false,durationSeconds:8,kind:"pulse",pace:"slow",moods:["calm"],themes:["health","energy","relationships"],voiceSafe:true,
    icon:"◍",name:{en:"Breathing",ru:"Дыхание",es:"Respiración"},detail:{en:"Slow swelling harmonics",ru:"Медленная звуковая волна",es:"Ondas lentas"}},
  {id:"sunrise",new:false,durationSeconds:8,kind:"tones",pace:"steady",moods:["uplift"],themes:["life","goals","money"],voiceSafe:true,
    icon:"☼",name:{en:"New beginning",ru:"Рассвет",es:"Amanecer"},detail:{en:"Hopeful bright chords",ru:"Светлые вдохновляющие аккорды",es:"Acordes luminosos"}},
  {id:"pulse",new:false,durationSeconds:8,kind:"pulse",pace:"active",moods:["focus","uplift"],themes:["money","goals","energy"],voiceSafe:false,
    icon:"✳",name:{en:"Momentum",ru:"Импульс",es:"Impulso"},detail:{en:"Steady motivational rhythm",ru:"Упругий мягкий ритм",es:"Ritmo motivador"}},
  {id:"soft-piano",kind:"melody",pace:"slow",moods:["calm","focus"],themes:["relationships","goals","health"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"♫",name:{en:"Soft piano",ru:"Мягкое пианино",es:"Piano suave"},detail:{en:"Gentle original keyboard motif",ru:"Нежная авторская клавишная мелодия",es:"Melodía original de teclado"}},
  {id:"kalimba",kind:"melody",pace:"steady",moods:["uplift","calm"],themes:["life","energy","relationships"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"♬",name:{en:"Kalimba",ru:"Калимба",es:"Kalimba"},detail:{en:"Bright synthesized plucked notes",ru:"Светлые синтезированные щипковые ноты",es:"Notas pulsadas sintetizadas"}},
  {id:"harp",kind:"melody",pace:"slow",moods:["calm","uplift"],themes:["relationships","life","goals"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"✧",name:{en:"Soft harp",ru:"Мягкая арфа",es:"Arpa suave"},detail:{en:"Original flowing string-like melody",ru:"Плавный авторский перебор струн (синтез)",es:"Arpegio original de cuerdas sintetizadas"}},
  {id:"flute",kind:"melody",pace:"slow",moods:["calm","focus"],themes:["health","relationships","energy"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"❧",name:{en:"Airy flute",ru:"Воздушная флейта",es:"Flauta aérea"},detail:{en:"Warm flute-like synthetic melody",ru:"Тёплая флейтовая мелодия (синтез)",es:"Melodía de flauta sintetizada"}},
  {id:"celesta",kind:"melody",pace:"steady",moods:["uplift","focus"],themes:["goals","life","money"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"✦",name:{en:"Celesta lights",ru:"Челеста",es:"Celesta"},detail:{en:"Light shimmering keyboard melody",ru:"Светлая мелодия хрустальных клавиш",es:"Melodía de teclas cristalinas"}},
  {id:"strings",kind:"melody",pace:"slow",moods:["calm","focus"],themes:["relationships","health","life"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"♩",name:{en:"Warm strings",ru:"Тёплые струны",es:"Cuerdas cálidas"},detail:{en:"Soft sustained synthetic strings",ru:"Мягкие протяжные синтезированные струны",es:"Cuerdas sintetizadas suaves"}},
  {id:"marimba",kind:"melody",pace:"steady",moods:["focus","uplift"],themes:["goals","money","energy"],voiceSafe:false,new:true,durationSeconds:16,
    icon:"♫",name:{en:"Wooden marimba",ru:"Маримба",es:"Marimba"},detail:{en:"Bouncy original wood-like notes",ru:"Авторская мелодия с деревянным тембром",es:"Notas originales de madera"}},
  {id:"lullaby",kind:"melody",pace:"slow",moods:["calm"],themes:["health","relationships","life"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"☾",name:{en:"Gentle lullaby",ru:"Колыбельная",es:"Canción de cuna"},detail:{en:"Unhurried original soothing phrase",ru:"Спокойная авторская мелодия",es:"Melodía original y tranquila"}},
  {id:"handpan",kind:"melody",pace:"steady",moods:["focus","calm"],themes:["goals","money","energy"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"◈",name:{en:"Handpan tones",ru:"Хэндпан",es:"Handpan"},detail:{en:"Resonant synthetic handpan motif",ru:"Резонансный ритмичный мотив (синтез)",es:"Motivo resonante sintetizado"}},
  {id:"forest",kind:"nature",pace:"slow",moods:["calm","focus"],themes:["health","life","relationships"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"♧",name:{en:"Forest air",ru:"Лесной воздух",es:"Aire de bosque"},detail:{en:"Synthetic rustle and gentle chirps",ru:"Синтезированный шелест и мягкие трели",es:"Susurros y trinos sintetizados"}},
  {id:"stream",kind:"nature",pace:"steady",moods:["calm","focus"],themes:["health","life","goals"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"≋",name:{en:"Flowing stream",ru:"Ручей",es:"Arroyo"},detail:{en:"Soft synthesized flowing water",ru:"Мягкий синтезированный поток воды",es:"Agua corriente sintetizada"}},
  {id:"waterfall",kind:"nature",pace:"steady",moods:["focus","calm"],themes:["energy","health","goals"],voiceSafe:false,new:true,durationSeconds:16,
    icon:"≈",name:{en:"Waterfall",ru:"Водопад",es:"Cascada"},detail:{en:"Wide synthetic rushing-water texture",ru:"Ровный синтезированный шум воды",es:"Flujo de agua sintetizado"}},
  {id:"fireplace",kind:"nature",pace:"slow",moods:["calm"],themes:["relationships","life","health"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"♨",name:{en:"Quiet fireplace",ru:"Тихий камин",es:"Chimenea"},detail:{en:"Gentle synthetic warm crackle",ru:"Мягкое синтезированное потрескивание",es:"Crepitar cálido sintetizado"}},
  {id:"night",kind:"nature",pace:"slow",moods:["calm","focus"],themes:["health","life","energy"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"☽",name:{en:"Night garden",ru:"Ночной сад",es:"Jardín nocturno"},detail:{en:"Night-like synthetic hush and chirps",ru:"Тихая ночная фактура и трели (синтез)",es:"Ambiente nocturno sintetizado"}},
  {id:"birdsong",kind:"nature",pace:"steady",moods:["uplift","calm"],themes:["life","health","energy"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"♬",name:{en:"Birdlike motifs",ru:"Птичьи мотивы",es:"Trinos"},detail:{en:"Synthetic birdlike notes, not a recording",ru:"Синтезированные трели, не полевая запись",es:"Trinos sintetizados, no una grabación"}},
  {id:"singing-bowl",kind:"tones",pace:"slow",moods:["calm","focus"],themes:["health","energy","relationships"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"◉",name:{en:"Resonant bowl",ru:"Поющая чаша",es:"Cuenco resonante"},detail:{en:"Deep slowly fading synthetic resonance",ru:"Глубокий резонансный тон (синтез)",es:"Resonancia profunda sintetizada"}},
  {id:"wind-chimes",kind:"tones",pace:"steady",moods:["calm","uplift"],themes:["life","relationships","goals"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"✧",name:{en:"Wind chimes",ru:"Колокольчики",es:"Campanillas"},detail:{en:"Light synthetic metallic overtones",ru:"Лёгкие металлические переливы (синтез)",es:"Armónicos metálicos sintetizados"}},
  {id:"crystal",kind:"tones",pace:"steady",moods:["focus","uplift"],themes:["money","goals","energy"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"◇",name:{en:"Crystal tones",ru:"Кристалл",es:"Cristal"},detail:{en:"Clear shimmering synthetic harmonics",ru:"Прозрачные синтезированные обертоны",es:"Armónicos cristalinos sintetizados"}},
  {id:"cosmos",kind:"tones",pace:"slow",moods:["calm","focus"],themes:["goals","energy","life"],voiceSafe:true,new:true,durationSeconds:16,
    icon:"✶",name:{en:"Cosmic drift",ru:"Космический фон",es:"Deriva cósmica"},detail:{en:"Slow spacious original tone layers",ru:"Медленные авторские звуковые слои",es:"Capas originales y espaciosas"}},
  {id:"soft-beat",kind:"pulse",pace:"active",moods:["focus","uplift"],themes:["energy","money","goals"],voiceSafe:false,new:true,durationSeconds:16,
    icon:"✳",name:{en:"Gentle beat",ru:"Мягкий бит",es:"Pulso suave"},detail:{en:"Subtle original synth rhythm",ru:"Ненавязчивый авторский синтез-ритм",es:"Ritmo original y discreto"}},
  {id:"earth-drum",kind:"pulse",pace:"steady",moods:["focus","calm"],themes:["goals","health","money"],voiceSafe:false,new:true,durationSeconds:16,
    icon:"●",name:{en:"Earth drum",ru:"Земной ритм",es:"Tambor tierra"},detail:{en:"Low synthetic drum-like pulses",ru:"Низкие синтезированные удары",es:"Pulsos graves sintetizados"}},
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
        +(track.pace==="slow"&&theme==="health"?1:0)
        +(track.kind==="melody"&&track.themes.includes(theme)?3:0)
        +(track.id==="prosperity"&&theme==="money"?4:0)
        +(track.id==="love"&&theme==="relationships"?4:0),
      stableIndex:index,
    }))
    .sort((a,b)=>b.relevance-a.relevance||a.stableIndex-b.stableIndex);
}
