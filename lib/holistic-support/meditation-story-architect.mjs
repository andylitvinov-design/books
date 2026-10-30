/**
 * Meditation Story Architect — purpose-tuned, multi-language narrative arcs
 * with conservative, deterministic selection. This is NOT a clinical treatment
 * protocol. It never reads client notes or copies raw user text into narration.
 */
import { MEDITATION_IMAGE_ATLAS, MEDITATION_IMAGE_BY_ID, listMeditationImages } from "./meditation-image-atlas.mjs";
import { MEDITATION_METAPHORS, MEDITATION_METAPHOR_BY_ID, listMeditationMetaphors } from "./meditation-metaphor-atlas.mjs";
const arcRows=[
  {
    "id": "arrival_and_notice",
    "title": {
      "ru": "Сначала заметить",
      "en": "Arrive and notice",
      "es": "Llegar y observar"
    },
    "goals": [
      "settle",
      "support"
    ],
    "objectives": [
      "orientation",
      "support"
    ],
    "text": {
      "ru": {
        "opening": "Сегодня ничего не требуется менять сразу. Можно побыть рядом с тем, что уже есть.",
        "question": "Какую небольшую деталь вы замечаете? Можно не искать ответа.",
        "transfer": "Пусть выбранное наблюдение остаётся возможностью, а не заданием."
      },
      "en": {
        "opening": "Nothing needs changing right away. You can begin with what is already here.",
        "question": "What small detail do you notice? An answer is optional.",
        "transfer": "Let this observation remain an option, not an assignment."
      },
      "es": {
        "opening": "Hoy no hace falta cambiar nada de inmediato. Puedes empezar por lo que ya hay.",
        "question": "¿Qué detalle pequeño notas? Responder es opcional.",
        "transfer": "Que esta observación siga siendo una posibilidad, no una tarea."
      }
    }
  },
  {
    "id": "gentle_support",
    "title": {
      "ru": "Мягкая опора",
      "en": "Gentle support",
      "es": "Apoyo amable"
    },
    "goals": [
      "support",
      "settle",
      "self_worth"
    ],
    "objectives": [
      "support",
      "imagery"
    ],
    "text": {
      "ru": {
        "opening": "Опора бывает совсем обычной: место, предмет, звук или чья-то добрая фраза.",
        "question": "Есть ли здесь что-то, к чему приятно возвращать внимание? Если нет — это тоже допустимо.",
        "transfer": "Вспомните одну доступную поддержку, не требуя от себя сильных чувств."
      },
      "en": {
        "opening": "Support can be ordinary: a place, an object, a sound or a kind phrase.",
        "question": "Is there something you would like to notice again? If not, that is fine too.",
        "transfer": "Consider one available support without requiring yourself to feel a certain way."
      },
      "es": {
        "opening": "El apoyo puede ser cotidiano: un lugar, un objeto, un sonido o una frase amable.",
        "question": "¿Hay algo a lo que te gustaría volver a prestar atención? Si no, también está bien.",
        "transfer": "Piensa en un apoyo disponible sin exigirte sentir algo concreto."
      }
    }
  },
  {
    "id": "space_for_choice",
    "title": {
      "ru": "Пространство выбора",
      "en": "Space for choice",
      "es": "Espacio para elegir"
    },
    "goals": [
      "boundaries",
      "relationships"
    ],
    "objectives": [
      "boundaries",
      "options"
    ],
    "text": {
      "ru": {
        "opening": "Представьте, что рядом с каждым решением есть немного свободного пространства. В него помещается пауза.",
        "question": "Какой выбор сегодня действительно принадлежит вам? Необязательно решать его сейчас.",
        "transfer": "Может быть достаточно одной спокойной фразы о вашей границе."
      },
      "en": {
        "opening": "Imagine a little space beside every decision, enough for a pause.",
        "question": "Which choice is yours today? No decision is required now.",
        "transfer": "One calm sentence about a boundary may be enough."
      },
      "es": {
        "opening": "Imagina un pequeño espacio junto a cada decisión, suficiente para una pausa.",
        "question": "¿Qué elección es tuya hoy? No hay que resolverla ahora.",
        "transfer": "Una frase serena sobre tu límite puede bastar."
      }
    }
  },
  {
    "id": "another_perspective",
    "title": {
      "ru": "Ещё один ракурс",
      "en": "Another perspective",
      "es": "Otra perspectiva"
    },
    "goals": [
      "clarity",
      "self_worth"
    ],
    "objectives": [
      "beliefs",
      "pattern"
    ],
    "text": {
      "ru": {
        "opening": "Иногда достаточно чуть изменить точку зрения, чтобы заметить деталь, которую раньше закрывала тень.",
        "question": "Как ещё можно описать происходящее, не споря с собственными чувствами?",
        "transfer": "Можно унести с собой альтернативную формулировку — без требования верить ей немедленно."
      },
      "en": {
        "opening": "A small change of perspective may reveal a detail that was out of sight.",
        "question": "How else might you describe the situation without dismissing your feelings?",
        "transfer": "You may take an alternative description with you, without needing to believe it immediately."
      },
      "es": {
        "opening": "Un cambio pequeño de perspectiva puede mostrar un detalle antes oculto.",
        "question": "¿Cómo más podrías describir la situación sin negar lo que sientes?",
        "transfer": "Puedes llevarte otra formulación sin tener que creerla de inmediato."
      }
    }
  },
  {
    "id": "one_meaningful_step",
    "title": {
      "ru": "Один важный шаг",
      "en": "One meaningful step",
      "es": "Un paso significativo"
    },
    "goals": [
      "goals",
      "meaning",
      "confidence"
    ],
    "objectives": [
      "values",
      "practice",
      "transfer"
    ],
    "text": {
      "ru": {
        "opening": "Большое направление складывается из маленьких, не обязательно прямых шагов.",
        "question": "Какое действие было бы одновременно посильным и близким вашим ценностям?",
        "transfer": "Вы можете выбрать этот шаг, изменить его или отложить."
      },
      "en": {
        "opening": "A meaningful direction can consist of small, not always straight steps.",
        "question": "What action would feel both manageable and close to your values?",
        "transfer": "You may choose it, change it or leave it for later."
      },
      "es": {
        "opening": "Una dirección valiosa puede construirse con pasos pequeños, no siempre rectos.",
        "question": "¿Qué acción sería posible y acorde con tus valores?",
        "transfer": "Puedes elegirla, cambiarla o dejarla para otro momento."
      }
    }
  },
  {
    "id": "inner_kindness",
    "title": {
      "ru": "Бережность к себе",
      "en": "Kindness towards yourself",
      "es": "Amabilidad contigo"
    },
    "goals": [
      "self_worth",
      "support"
    ],
    "objectives": [
      "self_talk",
      "support"
    ],
    "text": {
      "ru": {
        "opening": "Вы можете относиться к себе чуть мягче, не делая вид, что трудностей нет.",
        "question": "Какие слова поддержки прозвучали бы естественно и правдоподобно именно для вас?",
        "transfer": "Одна доброжелательная фраза может быть небольшим экспериментом."
      },
      "en": {
        "opening": "You may treat yourself a little more kindly without pretending difficulties are absent.",
        "question": "Which supportive words would sound believable in your own voice?",
        "transfer": "One kind sentence may be a small experiment."
      },
      "es": {
        "opening": "Puedes tratarte con un poco más de amabilidad sin negar las dificultades.",
        "question": "¿Qué palabras de apoyo sonarían creíbles con tu propia voz?",
        "transfer": "Una frase amable puede ser un pequeño experimento."
      }
    }
  },
  {
    "id": "compass_of_values",
    "title": {
      "ru": "Компас ценностей",
      "en": "Compass of values",
      "es": "Brújula de valores"
    },
    "goals": [
      "meaning",
      "goals"
    ],
    "objectives": [
      "values",
      "options"
    ],
    "text": {
      "ru": {
        "opening": "Ориентир не обязан раскрывать весь путь. Иногда достаточно вспомнить, ради чего вы делаете следующий выбор.",
        "question": "Какая ценность звучит здесь тише всего, но всё ещё важна?",
        "transfer": "Пусть она подскажет возможность, а не обязательство."
      },
      "en": {
        "opening": "A direction need not reveal the whole journey. Remembering what matters can be enough.",
        "question": "Which value may be quiet but still important here?",
        "transfer": "Let it suggest a possibility, not an obligation."
      },
      "es": {
        "opening": "Una orientación no necesita mostrar todo el camino. Recordar lo importante puede bastar.",
        "question": "¿Qué valor quizá suena bajo, pero sigue siendo importante?",
        "transfer": "Deja que sugiera una posibilidad, no una obligación."
      }
    }
  },
  {
    "id": "pause_and_response",
    "title": {
      "ru": "Пауза перед ответом",
      "en": "Pause before responding",
      "es": "Pausa antes de responder"
    },
    "goals": [
      "settle",
      "boundaries",
      "clarity"
    ],
    "objectives": [
      "pattern",
      "options"
    ],
    "text": {
      "ru": {
        "opening": "Между событием и ответом иногда находится маленькая пауза. Её не нужно делать идеальной.",
        "question": "Что вы могли бы заметить в такой паузе?",
        "transfer": "В следующий раз можно попробовать один короткий момент выбора, если ситуация безопасна."
      },
      "en": {
        "opening": "There can be a small pause between an event and your response. It need not be perfect.",
        "question": "What might you notice in such a pause?",
        "transfer": "You may try one brief moment of choice next time, if it is safe."
      },
      "es": {
        "opening": "Puede haber una pausa pequeña entre lo que sucede y tu respuesta. No tiene que ser perfecta.",
        "question": "¿Qué podrías notar en esa pausa?",
        "transfer": "La próxima vez puedes probar un instante de elección, si es seguro."
      }
    }
  },
  {
    "id": "everyday_connection",
    "title": {
      "ru": "Близость и пространство",
      "en": "Closeness and space",
      "es": "Cercanía y espacio"
    },
    "goals": [
      "relationships",
      "boundaries"
    ],
    "objectives": [
      "boundaries",
      "self_talk"
    ],
    "text": {
      "ru": {
        "opening": "У отношений может быть свой удобный ритм: время вместе и время наедине.",
        "question": "Какая дистанция сейчас ощущается уважительной к вам и к другому?",
        "transfer": "Необязательно менять отношения сегодня; можно начать с ясности о потребности."
      },
      "en": {
        "opening": "Relationships can have a comfortable rhythm: time together and time apart.",
        "question": "What distance feels respectful to you and another person now?",
        "transfer": "You do not have to change a relationship today; clarity about a need is a start."
      },
      "es": {
        "opening": "Las relaciones pueden tener un ritmo cómodo: tiempo juntos y tiempo aparte.",
        "question": "¿Qué distancia resulta respetuosa para ti y para otra persona ahora?",
        "transfer": "No tienes que cambiar una relación hoy; reconocer una necesidad es un comienzo."
      }
    }
  },
  {
    "id": "rest_and_energy",
    "title": {
      "ru": "Ритм восстановления",
      "en": "Rhythm of renewal",
      "es": "Ritmo de recuperación"
    },
    "goals": [
      "energy",
      "settle",
      "support"
    ],
    "objectives": [
      "support",
      "transfer"
    ],
    "text": {
      "ru": {
        "opening": "Восстановление не всегда похоже на всплеск сил. Иногда это простое разрешение уменьшить нагрузку.",
        "question": "Что может быть посильным способом отдыха без требования немедленно взбодриться?",
        "transfer": "Можно выбрать небольшой перерыв и заметить, подходит ли он."
      },
      "en": {
        "opening": "Renewal does not always feel like a burst of energy. Sometimes it begins by reducing demand.",
        "question": "What small form of rest might be possible without requiring instant relief?",
        "transfer": "Choose a brief pause if you wish, and notice whether it suits you."
      },
      "es": {
        "opening": "Recuperarse no siempre es sentir mucha energía. A veces empieza al reducir la exigencia.",
        "question": "¿Qué descanso pequeño sería posible sin esperar alivio inmediato?",
        "transfer": "Si quieres, elige una pausa y observa si te sirve."
      }
    }
  },
  {
    "id": "learning_from_attempt",
    "title": {
      "ru": "Опыт без экзамена",
      "en": "Learning without a test",
      "es": "Aprender sin examen"
    },
    "goals": [
      "confidence",
      "goals",
      "self_worth"
    ],
    "objectives": [
      "practice",
      "transfer"
    ],
    "text": {
      "ru": {
        "opening": "Проба — не экзамен на вашу ценность. Она лишь добавляет немного сведений о том, что подходит.",
        "question": "Что удалось узнать, даже если результат не совпал с ожиданием?",
        "transfer": "Следующий шаг можно сделать меньше, изменить или вовсе пропустить."
      },
      "en": {
        "opening": "An experiment is not a test of your worth. It simply adds information about what fits.",
        "question": "What did you learn, even if the outcome surprised you?",
        "transfer": "The next step can be smaller, different or skipped."
      },
      "es": {
        "opening": "Un experimento no mide tu valor. Solo aporta información sobre lo que encaja.",
        "question": "¿Qué aprendiste, aunque el resultado fuera inesperado?",
        "transfer": "El siguiente paso puede ser menor, distinto u opcional."
      }
    }
  },
  {
    "id": "closing_and_carrying",
    "title": {
      "ru": "Завершить и взять с собой",
      "en": "Close and carry forward",
      "es": "Cerrar y continuar"
    },
    "goals": [
      "support",
      "meaning",
      "clarity"
    ],
    "objectives": [
      "integration",
      "transfer"
    ],
    "text": {
      "ru": {
        "opening": "Завершение не обязано быть окончательной точкой. Можно сохранить то, что было полезным, и отпустить остальное.",
        "question": "Что вы хотите взять из этой практики, а что оставить здесь?",
        "transfer": "Пусть следующий день начнётся со свободного выбора, а не со строгого обещания."
      },
      "en": {
        "opening": "An ending need not settle everything. You can keep what was useful and leave the rest.",
        "question": "What would you take from this practice, and what would you leave here?",
        "transfer": "Let the next day begin with a free choice, not a strict promise."
      },
      "es": {
        "opening": "Cerrar no significa resolverlo todo. Puedes conservar lo útil y dejar el resto.",
        "question": "¿Qué te gustaría llevarte de esta práctica y qué dejar aquí?",
        "transfer": "Que el día siguiente empiece con una elección libre, no una promesa rígida."
      }
    }
  }
];
const LOCALES=new Set(["ru","en","es"]);
const KNOWN_GOALS=new Set(["settle","support","confidence","boundaries","clarity","energy","relationships","goals","meaning"]);
const safeLocale=x=>LOCALES.has(x)?x:"en";
const safeArray=a=>Array.isArray(a)?a.filter(x=>typeof x==="string").slice(0,30):[];
const normalizeIndex=(n,max)=>Number.isInteger(n)?Math.max(0,Math.min(max,n)):0;
const l=(x,locale)=>x[safeLocale(locale)];
export const MEDITATION_STORY_ARCS=Object.freeze(arcRows.map(a=>Object.freeze({
  ...a,title:Object.freeze(a.title),goals:Object.freeze(a.goals),
  objectives:Object.freeze(a.objectives),text:Object.freeze(
    Object.fromEntries(Object.entries(a.text).map(([lang,v])=>[lang,Object.freeze(v)]))),
  selfGuided:true,clinicalProtocol:false,origin:"holistic_house_original"
})));
export const MEDITATION_STORY_ARC_BY_ID=Object.freeze(Object.fromEntries(MEDITATION_STORY_ARCS.map(a=>[a.id,a])));
export function listMeditationStoryArcs({locale="ru",goal=null,objective=null}={}){
  return MEDITATION_STORY_ARCS.filter(a=>(!goal||a.goals.includes(goal))&&
    (!objective||a.objectives.includes(objective)))
    .map(a=>({id:a.id,title:l(a.title,locale),goals:[...a.goals],
      objectives:[...a.objectives],selfGuided:true}));
}
function select(collection,id,kind,{goal,objective,avoid,preferredChannel="neutral",exclude=[],variation=0}){
  if(id!==null&&id!==undefined){
    if(typeof id!=="string")return {error:"invalid_"+kind};
    const found=collection.find(c=>c.id===id);
    if(!found)return {error:"unknown_"+kind};
    if(found.selfGuided!==true)return {error:"clinician_review_required"};
    if(found.avoidTags?.some(x=>avoid.has(x)))return {error:"preferences_conflict"};
    return {item:found,reason:"explicit_user_choice"};
  }
  const eligible=collection.filter(c=>c.selfGuided===true&&!c.avoidTags?.some(t=>avoid.has(t)));
  if(!eligible.length)return {error:"no_eligible_"+kind};
  const priority=eligible.map(item=>({
    item,score:(item.goals.includes(goal)?8:0)+(item.stages?.includes(objective)||item.objectives?.includes(objective)?4:0)+
      (item.sense&&preferredChannel!=="neutral"&&item.sense===preferredChannel?2:0)-
      (exclude.includes(item.id)?12:0)
  })).sort((a,b)=>b.score-a.score||a.item.id.localeCompare(b.item.id));
  // Prefer relevant options, then rotate modestly for session-to-session variation.
  const shortlist=priority.slice(0,Math.min(4,priority.length));
  return {item:shortlist[variation%shortlist.length].item,reason:"safe_relevance_and_variety"};
}
export function selectMeditationNarrative({
  locale="ru",goal="support",objective="support",sceneId=null,
  metaphorId=null,arcId=null,avoidElements=[],historySceneIds=[],
  historyMetaphorIds=[],variationIndex=0,preferredChannel="neutral",
  useMetaphor=true
}={}){
  const lang=safeLocale(locale);
  const cleanGoal=KNOWN_GOALS.has(goal)?goal:"support";
  const avoid=new Set(safeArray(avoidElements));
  const variation=normalizeIndex(variationIndex,1000);
  const scene=select(MEDITATION_IMAGE_ATLAS,sceneId,"scene",{goal:cleanGoal,
    objective,avoid,preferredChannel,exclude:safeArray(historySceneIds),variation});
  if(scene.error)return {status:scene.error,sceneId:sceneId??null,metaphorId:null,arcId:null};
  const arc=select(MEDITATION_STORY_ARCS,arcId,"arc",{goal:cleanGoal,
    objective,avoid,variation});
  if(arc.error)return {status:arc.error,sceneId:scene.item.id,metaphorId:null,arcId:arcId??null};
  const metaphor=useMetaphor||metaphorId!==null?
    select(MEDITATION_METAPHORS,metaphorId,"metaphor",{goal:cleanGoal,
      objective,avoid,exclude:safeArray(historyMetaphorIds),variation})
    :{item:null,reason:"metaphor_opted_out"};
  if(metaphor.error)return {status:metaphor.error,
    sceneId:scene.item.id,metaphorId:metaphorId??null,arcId:arc.item.id};
  const a=arc.item.text[lang];
  return {
    status:"ready",locale:lang,goal:cleanGoal,objective,
    sceneId:scene.item.id,metaphorId:metaphor.item?.id??null,arcId:arc.item.id,
    sceneTitle:l(scene.item.title,lang),metaphorTitle:metaphor.item?l(metaphor.item.title,lang):null,
    arcTitle:l(arc.item.title,lang),
    narration:{opening:a.opening,scene:l(scene.item.prose,lang),
      observation:a.question,metaphor:metaphor.item?l(metaphor.item.prose,lang):null,
      transfer:a.transfer},
    selection:{scene:scene.reason,arc:arc.reason,metaphor:metaphor.reason},
    fixedSymbolInterpretation:null,diagnosis:null,
    selfGuided:true,clinicalTreatment:false,requiresEditorialReview:true
  };
}
export function listMeditationNarrativeCatalog({locale="ru",goal=null,
  avoidElements=[],includeClinical=false,objective=null}={}){
  return {version:"meditation-story-architect-v2",locale:safeLocale(locale),
    scenes:listMeditationImages({locale,goal,avoidElements,includeClinical,limit:100}),
    metaphors:listMeditationMetaphors({locale,goal,avoidElements,includeClinical,limit:100}),
    arcs:listMeditationStoryArcs({locale,goal,objective}),
    selfGuidedOnly:!includeClinical,generatedMedia:false};
}
