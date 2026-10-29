import { buildMeditationNarrativeBlocks, MEDITATION_TECHNIQUES, MEDITATION_ATTENTION, MEDITATION_DEPTHS, MEDITATION_ENDINGS, MEDITATION_MOMENTS } from "./meditation-narrative-blocks.mjs";
import { parseMeditationNarration } from "./meditation-narration.mjs";
// Private, first-party, deterministic meditation writing. This is a text script,
// not an AI model, clinical decision, external render, diagnosis or paid service.
// Only explicit local editor settings and consented, manually selected goals enter.
export const PERSONAL_MEDITATION_VERSION = "resource-meditation-script-1";
export const MEDITATION_ACCENTS = Object.freeze([
  "calm","confidence","clarity","boundaries","acceptance","motivation","rest","gratitude"
]);
export const MEDITATION_IMAGES = Object.freeze(["video","garden","water","light","home","forest","coast","mountain"]);
export const MEDITATION_TONES = Object.freeze(["gentle","grounded","uplifting"]);
export const MEDITATION_LENGTHS = Object.freeze([3,5,8,12]);
const THEMES = Object.freeze(["energy","money","relationships","goals","life","health"]);
const DEFAULT_ACCENT = {energy:"rest",money:"clarity",relationships:"boundaries",
  goals:"motivation",life:"gratitude",health:"calm"};
const COPY = {
  en:{
    crisis:"A personal guided meditation is not an appropriate response to immediate danger or thoughts of self-harm. Contact local emergency services or a qualified crisis support service and, if possible, someone you trust. You can stop this exercise now.",
    title:"PERSONAL MEDITATION",themes:{energy:"energy and balance",money:"work and money",relationships:"relationships",goals:"goals and direction",life:"meaning",health:"wellbeing"},
    themeGuides:{energy:"Notice which everyday sources of energy are available without pushing yourself.",
      money:"Imagine a fair, clear conversation about work or resources, without trying to predict an outcome.",
      relationships:"Notice a connection that allows both closeness and a comfortable distance.",
      goals:"A meaningful direction can be approached through a manageable, freely chosen step.",
      life:"Perhaps a small ordinary moment points to something you value.",
      health:"Care can start with rest, comfort and suitable professional support, without demanding a particular result."},
    intro:"Find a position that feels comfortable. Notice where the chair, bed or floor supports you. You may keep your eyes open, move, pause, or stop whenever you wish.",
    intention:"Today's gentle theme is",difficulty:"You mentioned a difficulty:",goal:"You named an intention:",wish:"You also wrote:",caption:"Your video phrase:",priority:"Other chosen directions:",detail:"Specific priorities:",
    permission:"You do not have to solve or relive anything now. You can set this topic aside and return to the room at any moment.",
    image:"An image is only an invitation, not a task. Imagine, remember or simply look at a scene:",
    images:{video:"the scene you chose for your video",garden:"a garden with room to rest",water:"a quiet stream watched from a comfortable bank",light:"gentle daylight falling through a window",home:"a welcoming room with a door you may open or close",forest:"a forest with a broad path and a resting place",coast:"a calm shore with plenty of room",mountain:"a distant mountain view from a safe and comfortable place"},
    scene:"Your selected visual motif is",slow:"Let the image change at its own unhurried pace.",dynamic:"Notice one gentle movement, then a moment of stillness.",
    soft:"The light may be as soft as you need.",bright:"If pleasant, notice a little more daylight around the image.",
    sound:"If it feels comfortable, allow the selected background sound to remain simply in the background.",silent:"Silence is also a complete and valid way to practise.",
    tones:{gentle:"There is no need to do anything perfectly.",grounded:"Notice one simple, real support available here and now.",uplifting:"A modest possibility can be enough for today."},
    focus:"Choose just one part of this image that feels neutral or supportive. You may decide how near to approach it. Allow yourself time to notice shape, colour and distance.",
    pause:"[Optional quiet pause: ",seconds:" seconds]",expanded:"You may stay with this image a little longer or replace it with another. What small detail feels manageable today? There is no required answer.",
    action:"If it is useful, imagine one small, freely chosen step toward the intention you named. It can be as simple as resting or asking for support.",
    affirmations:"Optional words to try or change in your own way:",noAffirmations:"No affirmations are required. A quiet image or an ordinary moment of rest is enough.",
    close:"Notice the surface beneath you again. Look around the actual room. Move your hands or feet if you wish. Carry forward only what feels useful; you can leave the rest.",
    note:"Personal reflective script, not psychotherapy or medical advice. Stop if uncomfortable; seek qualified personal support for distress or crisis.",
    metadata:"Context",sceneLabel:"scene",soundLabel:"sound",paceLabel:"movement",durationLabel:"suggested pacing",minutes:"min",
    accents:{
      calm:"Perhaps the next moment can be a little slower. You may simply observe what is here without changing it.",
      confidence:"Recall an ordinary action you have already managed. It need not be impressive to count as your own resource.",
      clarity:"Imagine placing several choices on a table. You may look at one at a time; no decision is needed right now.",
      boundaries:"A comfortable door can open, remain closed, or be left untouched. You decide what to allow near you.",
      acceptance:"What is present may be noticed without judging it. A feeling does not have to become a command.",
      motivation:"A path may begin with a single practical step. You may also choose to rest before taking it.",
      rest:"Rest can be allowed without earning it. Feel the support underneath you for a few ordinary moments.",
      gratitude:"Notice one small thing that has already offered some support today, if anything comes to mind."
    }
  },
  ru:{
    crisis:"При непосредственной опасности или мыслях о самоповреждении персональная медитация не заменяет экстренную помощь. Обратитесь в местные экстренные службы или кризисную службу и, по возможности, к человеку, которому доверяете. Практику можно остановить.",
    title:"ПЕРСОНАЛЬНАЯ МЕДИТАЦИЯ",themes:{energy:"энергия и равновесие",money:"работа и деньги",relationships:"отношения",goals:"цели и движение",life:"смыслы",health:"самочувствие и забота"},
    themeGuides:{energy:"Заметьте, откуда сегодня можно взять немного сил, не заставляя себя собираться.",
      money:"Можно представить спокойный разговор о справедливом обмене и работе, не пытаясь предсказать результат.",
      relationships:"Образ контакта может включать и близость, и удобную для вас дистанцию.",
      goals:"Даже важное направление допускает маленький, добровольно выбранный шаг.",
      life:"Небольшой повседневный момент может напомнить о том, что для вас ценно.",
      health:"Забота может начаться с комфорта, отдыха и подходящей профессиональной поддержки, без ожидания определённого результата."},
    intro:"Устройтесь так, как вам удобно. Заметьте опору под телом: кресло, кровать или пол. Можно оставить глаза открытыми, двигаться, делать паузу или остановить практику в любой момент.",
    intention:"Мягкая тема этой практики —",difficulty:"Вы обозначили сложность:",goal:"Вы обозначили направление:",wish:"Вы также написали:",caption:"Подпись к видео:",priority:"Другие выбранные направления:",detail:"Уточнённые акценты:",
    permission:"Не нужно прямо сейчас решать проблему или возвращаться к неприятным воспоминаниям. В любой момент можно отложить тему и заметить комнату вокруг.",
    image:"Образ — только приглашение, а не обязательное задание. Можно представить, вспомнить или просто посмотреть на:",
    images:{video:"выбранный вами сюжет видео",garden:"сад, в котором есть место для отдыха",water:"тихий ручей, за которым удобно наблюдать с берега",light:"мягкий дневной свет у окна",home:"уютную комнату с дверью, которую можно открывать и закрывать по желанию",forest:"лес с широкой тропой и местом отдыха",coast:"спокойный морской берег с большим пространством",mountain:"далёкие горы из уютного и безопасного места"},
    scene:"Выбранный визуальный мотив —",slow:"Пусть образ меняется в своём неспешном ритме.",dynamic:"Заметьте одно мягкое движение, а затем короткую паузу.",
    soft:"Свет может быть настолько мягким, насколько вам комфортно.",bright:"Если приятно, позвольте дневному свету стать немного ярче.",
    sound:"Если комфортно, пусть выбранный звуковой фон остаётся лишь тихим сопровождением.",silent:"Тишина тоже подходит для этой практики.",
    tones:{gentle:"Здесь не требуется ничего делать идеально.",grounded:"Заметьте одну простую, реальную опору здесь и сейчас.",uplifting:"Даже небольшая возможность на сегодня уже имеет значение."},
    focus:"Выберите одну деталь, которая кажется нейтральной или поддерживающей. Вы сами определяете расстояние до неё. Можно обратить внимание на форму, цвет и пространство вокруг.",
    pause:"[Пауза по желанию: ",seconds:" сек.]",expanded:"Если хочется, побудьте с образом ещё немного или замените его другим. Какая небольшая деталь сейчас воспринимается спокойно? Отвечать необязательно.",
    action:"Если подходит, представьте один небольшой, добровольно выбранный шаг в сторону вашей цели. Это может быть отдых, разговор или просьба о поддержке.",
    affirmations:"Необязательные фразы — их можно принять, изменить или пропустить:",noAffirmations:"Аффирмации необязательны. Достаточно спокойного образа или обычной паузы.",
    close:"Снова заметьте опору под собой и реальную комнату. Если хочется, пошевелите руками и ногами. Возьмите из этой практики только то, что полезно; остальное можно оставить.",
    note:"Текст для личной рефлексии, не психотерапия и не медицинская рекомендация. При дискомфорте остановитесь; при кризисе обратитесь за профессиональной помощью.",
    metadata:"Контекст",sceneLabel:"сюжет",soundLabel:"звук",paceLabel:"движение",durationLabel:"примерный ритм",minutes:"мин",
    accents:{
      calm:"Следующий момент может стать чуть спокойнее. Можно просто наблюдать происходящее, ничего не меняя.",
      confidence:"Вспомните обычное действие, которое вам уже удавалось. Оно не обязано быть большим, чтобы оставаться вашим ресурсом.",
      clarity:"Представьте несколько вариантов на столе. Можно рассматривать их по одному, не принимая решения прямо сейчас.",
      boundaries:"Уютная дверь может открываться, оставаться закрытой или ждать. Только вы выбираете, что впускать в своё пространство.",
      acceptance:"Можно заметить то, что есть, без оценки. Чувство необязательно превращать в действие.",
      motivation:"Путь может начинаться с одного посильного шага. Можно также сначала отдохнуть.",
      rest:"Для отдыха не нужно сначала заслужить право на него. Несколько мгновений можно замечать опору под собой.",
      gratitude:"Если хочется, заметьте одну небольшую вещь, которая уже поддержала вас сегодня."
    }
  },
  es:{
    crisis:"Ante un peligro inmediato o pensamientos de autolesión, una meditación no sustituye el apoyo urgente. Contacta a los servicios locales de emergencia o ayuda en crisis y, si es posible, a una persona de confianza. Puedes detener este ejercicio.",
    title:"MEDITACIÓN PERSONAL",themes:{energy:"energía y equilibrio",money:"trabajo y dinero",relationships:"relaciones",goals:"metas y dirección",life:"sentido",health:"bienestar y cuidado"},
    themeGuides:{energy:"Observa una fuente cotidiana de energía sin exigirte más esfuerzo.",
      money:"Imagina una conversación justa y clara sobre trabajo o recursos sin anticipar resultados.",
      relationships:"Una conexión puede incluir cercanía y una distancia que te resulte cómoda.",
      goals:"Una dirección valiosa puede empezar con un paso pequeño y voluntario.",
      life:"Un detalle cotidiano quizá te recuerde algo que valoras.",
      health:"El cuidado puede comenzar con descanso, comodidad y apoyo profesional adecuado, sin esperar un resultado concreto."},
    intro:"Busca una postura cómoda. Observa el apoyo de la silla, cama o suelo. Puedes mantener los ojos abiertos, moverte, hacer una pausa o detenerte en cualquier momento.",
    intention:"El tema amable de hoy es",difficulty:"Has mencionado una dificultad:",goal:"Has elegido una intención:",wish:"También escribiste:",caption:"Tu frase de vídeo:",priority:"Otras direcciones elegidas:",detail:"Prioridades específicas:",
    permission:"No necesitas resolver nada ni revivir recuerdos difíciles ahora. Puedes dejar el tema a un lado y volver a observar la habitación.",
    image:"Una imagen es una invitación, no una obligación. Puedes imaginar, recordar o simplemente mirar:",
    images:{video:"la escena que elegiste para el vídeo",garden:"un jardín con un lugar para descansar",water:"un arroyo tranquilo visto desde una orilla cómoda",light:"la luz suave junto a una ventana",home:"una habitación acogedora con una puerta que puedes abrir o cerrar",forest:"un bosque con un camino amplio",coast:"una costa tranquila con mucho espacio",mountain:"las montañas desde un lugar cómodo y seguro"},
    scene:"El motivo visual elegido es",slow:"Deja que la imagen cambie a su propio ritmo pausado.",dynamic:"Observa un movimiento suave y después un instante de quietud.",
    soft:"La luz puede ser tan tenue como necesites.",bright:"Si te agrada, observa un poco más de luz natural.",
    sound:"Si te resulta cómodo, deja que el sonido elegido permanezca en segundo plano.",silent:"El silencio también es una forma válida de practicar.",
    tones:{gentle:"No necesitas hacer nada perfectamente.",grounded:"Observa un apoyo simple y real aquí y ahora.",uplifting:"Una pequeña posibilidad puede ser suficiente por hoy."},
    focus:"Elige un detalle que resulte neutro o amable. Tú decides cuánto acercarte. Puedes observar su forma, color y espacio alrededor.",
    pause:"[Pausa opcional: ",seconds:" segundos]",expanded:"Puedes quedarte un poco más con esta imagen o elegir otra. ¿Qué detalle pequeño se siente manejable hoy? No necesitas responder.",
    action:"Si te sirve, imagina un pequeño paso libremente elegido hacia tu intención. También puede ser descansar o pedir ayuda.",
    affirmations:"Frases opcionales que puedes adaptar o saltar:",noAffirmations:"Las afirmaciones no son necesarias. Una imagen tranquila o un momento de descanso es suficiente.",
    close:"Observa de nuevo el apoyo bajo tu cuerpo y el espacio real. Mueve las manos o los pies si quieres. Conserva solo lo que te sea útil.",
    note:"Guion de reflexión personal, no psicoterapia ni consejo médico. Detente si te incomoda; busca ayuda profesional ante malestar intenso o crisis.",
    metadata:"Contexto",sceneLabel:"escena",soundLabel:"sonido",paceLabel:"movimiento",durationLabel:"ritmo aproximado",minutes:"min",
    accents:{
      calm:"Quizá el próximo momento pueda ser un poco más lento. Puedes observar sin cambiar nada.",
      confidence:"Recuerda un gesto cotidiano que ya hayas conseguido. No tiene que ser grande para ser un recurso.",
      clarity:"Imagina varias opciones sobre una mesa. Puedes mirar una por una sin decidir ahora.",
      boundaries:"Una puerta cómoda puede abrirse, quedarse cerrada o esperar. Tú eliges qué dejar entrar.",
      acceptance:"Puedes observar lo que hay sin juzgarlo. Una emoción no tiene que convertirse en una orden.",
      motivation:"Un camino puede empezar con un paso posible. También puedes descansar antes.",
      rest:"No necesitas ganarte el derecho a descansar. Siente por unos momentos el apoyo debajo de ti.",
      gratitude:"Si te apetece, reconoce algo pequeño que hoy te haya sostenido."
    }
  }
};
function clean(value,limit=180){
  return typeof value==="string"
    ? value.normalize("NFKC").replace(/[\u0000-\u001f\u007f<>\u202a-\u202e\u2066-\u2069]/g," ")
      .replace(/\s+/g," ").trim().slice(0,limit)
    : "";
}
const crisis=/suicid|self.harm|kill myself|самоубийств|суицид|самоповрежд|autolesi[oó]n/i;
/**
 * Fit actual scripted silent intervals to the chosen length. This keeps the
 * reader's full meaningful sentences and changes *real* pause durations,
 * rather than publishing a misleading 3/5/8/12-minute label.
 * Native voice rates vary by device; the UI shows an independent estimate.
 */
export function calibrateMeditationPauses(script,targetMinutes){
  const segments=parseMeditationNarration(script);
  const spokenWords=segments.filter(x=>x.kind==="speech")
    .reduce((sum,x)=>sum+x.text.split(/\s+/u).filter(Boolean).length,0);
  const spokenSeconds=spokenWords/(125*0.9)*60;
  const desired=Math.max(0,Math.round(targetMinutes*60-spokenSeconds));
  const cue=/\[(Optional quiet pause|Пауза по желанию|Pausa opcional):\s*(\d+)\s*(seconds|сек\.|segundos)\]/gu;
  const matches=[...script.matchAll(cue)];
  if(!matches.length)return script;
  // Even a short client-specific script should have a little real silence:
  // never eliminate every pause merely to hit a nominal clock target.
  let remaining=Math.min(60*matches.length,Math.max(matches.length,desired));
  let weights=matches.reduce((sum,m)=>sum+Number(m[2]),0);
  let cursor=0;
  return script.replace(cue,(_,label,old,unit)=>{
    const weight=Number(old);
    cursor++;
    const reserve=matches.length-cursor;
    const current=cursor===matches.length
      ? Math.min(60,remaining)
      : Math.max(1,Math.min(60,remaining-reserve,
        Math.round((remaining-reserve)*weight/Math.max(1,weights))));
    weights-=weight;
    remaining-=current;
    return "["+label+": "+current+" "+unit+"]";
  }).replace(/\n{3,}/g,"\n\n");
}
export function buildPersonalMeditationScript(input={}){
  const locale=["en","ru","es"].includes(input.locale)?input.locale:"en";
  const t=COPY[locale];
  const theme=THEMES.includes(input.theme)?input.theme:"energy";
  const image=MEDITATION_IMAGES.includes(input.image)?input.image:"video";
  const tone=MEDITATION_TONES.includes(input.tone)?input.tone:"gentle";
  const duration=MEDITATION_LENGTHS.includes(input.length)?input.length:5;
  const technique=MEDITATION_TECHNIQUES.includes(input.technique)?input.technique:"imagery";
  const attention=MEDITATION_ATTENTION.includes(input.attention)?input.attention:"mixed";
  const depth=MEDITATION_DEPTHS.includes(input.depth)?input.depth:"light";
  const ending=MEDITATION_ENDINGS.includes(input.ending)?input.ending:"return";
  const moment=MEDITATION_MOMENTS.includes(input.moment)?input.moment:"any";
  const accents=Array.isArray(input.accents)?[...new Set(input.accents.filter(a=>MEDITATION_ACCENTS.includes(a)))].slice(0,3):[];
  const focus=input.focus && typeof input.focus==="object"?input.focus:{};
  // Local word matches choose supportive, NON-clinical emphases when the
  // visitor has not explicitly selected their own. Never infer a disorder.
  const words=[input.wish,focus.difficulty,focus.goal,input.extra]
    .filter(x=>typeof x==="string").join(" ").toLowerCase().slice(0,700);
  const hints=[
    ["calm",/тревог|тревож|стресс|волнени|страх|напряж|anxious|anxiet|stress|fear|nervous|ansied|estr[eé]s|miedo|tensi[oó]n/],
    ["rest",/отдых|сон|устал|выгор|relax|sleep|rest|tired|burnout|descans|sue[nñ]o|cansad/],
    ["confidence",/уверен|самооцен|сомнен|confidence|self.doubt|confian|duda/],
    ["clarity",/ясност|выбор|решени|неопредел|clarity|decision|uncertain|claridad|decisi[oó]n|incertid/],
    ["boundaries",/границ|конфликт|давлени|boundary|boundaries|conflict|pressure|l[ií]mite|conflicto|presi[oó]n/],
    ["acceptance",/принят|стыд|вина|accept|shame|guilt|acept|verg[uü]enza|culpa/],
    ["motivation",/цель|начать|откладыв|проект|motivat|goal|procrastinat|motivac|meta|posterg/],
    ["gratitude",/благодар|ценност|смысл|gratit|value|purpose|gratitud|valor|sentido/]
  ];
  const inferred=hints.filter(([,pattern])=>pattern.test(words)).map(([id])=>id);
  const sensitiveInputs=[input.wish,input.caption,input.extra,focus.difficulty,focus.goal,
    ...(Array.isArray(focus.details)?focus.details:[]),...(Array.isArray(input.affirmations)?input.affirmations:[])];
  if(sensitiveInputs.some(value=>crisis.test(clean(value,300))))return t.title+"\n\n"+t.crisis;
  const selected=accents.length?accents:
    [...new Set([...inferred.slice(0,2),DEFAULT_ACCENT[theme]])].slice(0,2);
  const raw=[input.wish,focus.difficulty,focus.goal,input.extra,input.caption].map(v=>clean(v));
  // Do not copy explicit crisis terms into a guided-imagery exercise.
  const personal=raw.some(v=>crisis.test(v))?["","","","",""]:raw;
  const goals=Array.isArray(focus.goals)?focus.goals.filter(v=>THEMES.includes(v)).slice(0,3):[];
  const details=Array.isArray(focus.details)?focus.details.map(x=>clean(x,80)).filter(Boolean).slice(0,3):[];
  const affirmations=input.affirmationsEnabled && Array.isArray(input.affirmations)
    ? input.affirmations.map(a=>clean(a,120)).filter(Boolean).slice(0,3):[];
  const scene=clean(input.scene,80),sound=clean(input.sound,80);
  const pace=input.pace==="dynamic"?"dynamic":"slow";
  const light=input.brightness==="bright"?"bright":"soft";
  const p=seconds=>t.pause+seconds+t.seconds;
  const narrative=buildMeditationNarrativeBlocks({locale,technique,attention,depth,ending,moment,setting:image,length:duration});
  const header=t.title+" · "+t.themes[theme];
  const metadata=t.metadata+" · "+t.sceneLabel+": "+(scene||t.images[image])+
    " · "+t.soundLabel+": "+(sound||t.silent)+
    " · "+t.paceLabel+": "+pace+" · "+t.durationLabel+": "+duration+" "+t.minutes;
  const personalLines=[
    personal[1]?t.difficulty+" «"+personal[1]+"»":null,
    personal[2]?t.goal+" «"+personal[2]+"»":null,
    personal[0]?t.wish+" «"+personal[0]+"»":null,
    personal[3]?t.wish+" «"+personal[3]+"»":null,
    personal[4]&&personal[4]!==scene?t.caption+" «"+personal[4]+"»":null,
    goals.length?t.priority+" "+goals.map(g=>t.themes[g]).join(", ")+".":null,
    details.length?t.detail+" "+details.join("; ")+".":null
  ].filter(Boolean);
  const lines=[
    header,metadata,"",
    t.intro,p(10),
    t.intention+" "+t.themes[theme]+".",
    ...personalLines,t.permission,p(10),
    t.image+" "+t.images[image]+".",
    image==="video"&&scene?t.scene+" «"+scene+"».":null,
    pace==="dynamic"?t.dynamic:t.slow,
    t[light],t.tones[tone],t.themeGuides[theme],p(duration===3?12:20),
    t.focus,p(duration>=8?35:duration===5?25:12),
    ...narrative.flatMap((block,index)=>[block,p(duration===3?7:duration===5?10:duration===8?15:20)]),
    ...selected.map((accent,index)=>t.accents[accent]+"\n"+p(index===0?20:12)),
    ...(duration>=5?[t.expanded,p(duration===8?45:25)]:[]),
    ...(duration>=8?[t.focus,p(duration===12?55:35),t.expanded,p(duration===12?45:30)]:[]),
    ...(duration===12?[t.focus,p(55),t.expanded,p(45),t.action,p(50)]:[]),
    t.action,p(duration===8?35:15),
    affirmations.length?t.affirmations:t.noAffirmations,
    ...affirmations.map(line=>"• "+line),
    affirmations.length?p(20):null,
    sound?t.sound:t.silent,p(10),
    t.close,"",t.note
  ].filter(line=>line!==null);
  return calibrateMeditationPauses(lines.join("\n\n").replace(/\n{3,}/g,"\n\n"),duration);
}
