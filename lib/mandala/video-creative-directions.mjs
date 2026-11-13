/**
 * Video Studio story director: three distinct, consent-free editorial directions.
 * No personal dossier, external LLM, paid provider or automatic footage approval.
 * A story is a creative proposal; film assets remain verified separately in Montage.
 */
import {listMyTubeScenarios} from "./mytube-content-taxonomy.mjs";

const LANG=new Set(["ru","en","es"]);
const langOf=value=>LANG.has(value)?value:"en";
const clean=(v,max=240)=>String(v??"").normalize("NFKC")
  .replace(/[\u0000-\u001f\u007f<>]/gu," ").replace(/\s+/gu," ").trim().slice(0,max);
const STORY_BOOK={
 space:{
  styleId:"cinematic",keywords:[
   ["people","city","walking"],["interior","chair","home"],["suitcase","memories","hands"],
   ["suitcase","shelf","chair"],["phone","message","hands"],["door","street","morning"]
  ],
  en:{
   title:"Making Room for Love",mode:"Symbolic · warm",
   idea:"Sometimes welcoming someone new begins with giving the past a place that is no longer the centre of our lives.",
   story:"Every evening, a tired person comes home to a table set for one. An old suitcase occupies the chair opposite. One night, they finally open it: a photograph, a small keepsake, something worth remembering. Nothing is thrown away. The case is gently closed and lifted onto a shelf. In the morning, the empty chair catches the light. A message appears on the phone: ‘Would you like to meet?’ Instead of searching for an excuse, the person replies: ‘Yes.’ Love is not promised. But there is finally room for someone new.",
   stages:["The weight of yesterday","A place occupied by the past","Keeping the memory, changing its place","Room for a new beginning"],
   shots:[
    ["The long way home","An exhausted commuter threads through an evening crowd carrying a worn suitcase.","Disconnection"],
    ["The second chair","At a small table for one, the suitcase fills the empty chair opposite.","A visual question"],
    ["A gentle look back","Hands open the case and touch an old photograph without tearing it up.","Tenderness"],
    ["A place for memories","The case goes onto a shelf; the now-free chair is drawn toward the table.","The turning point"],
    ["An invitation","A phone lights up with an invitation; after a quiet pause, the answer is ‘Yes.’","Agency"],
    ["The door opens","Morning light touches two chairs as the protagonist leaves the apartment.","Open possibility"]
   ]
  },
  ru:{
   title:"Место для двоих",mode:"Символическая · тёплая",
   idea:"Иногда новая близость становится возможной, когда прошлому находится место, но уже не в самом центре нашей жизни.",
   story:"Каждый вечер человек возвращается домой к столу, накрытому на одного. Напротив — второй стул, занятый старым чемоданом. Однажды вечером он открывает чемодан: фотография, маленькая памятная вещь, то, что не хочется забывать. Ничего не выбрасывая, он бережно закрывает его и ставит на полку. Утром на свободный стул падает свет. На телефоне появляется приглашение встретиться. Вместо привычного отказа человек отвечает: «Да». Любовь не гарантирована. Но в жизни появилось место для нового.",
   stages:["Груз вчерашнего дня","Место, занятое прошлым","Сохранить память и изменить её место","Пространство для нового"],
   shots:[
    ["Дорога домой","Уставший человек идёт сквозь вечернюю толпу со старым чемоданом.","Одиночество"],
    ["Второй стул","В маленькой квартире чемодан стоит на стуле напротив человека.","Вопрос"],
    ["Бережный взгляд назад","Руки открывают чемодан и прикасаются к фотографии, не уничтожая её.","Тепло"],
    ["Место для воспоминаний","Чемодан переезжает на полку, освободившийся стул придвигают к столу.","Поворот"],
    ["Приглашение","На экране телефона — предложение встретиться; после паузы ответ «Да».","Выбор"],
    ["Открытая дверь","Утренний свет касается двух стульев, герой выходит из квартиры.","Возможность"]
   ]
  },
  es:{
   title:"Un lugar para dos",mode:"Simbólica · cálida",
   idea:"A veces, para acoger una nueva conexión, hace falta guardar el pasado sin dejar que ocupe todo el presente.",
   story:"Cada noche, una persona cansada vuelve a casa y cena sola. En la silla de enfrente hay una vieja maleta. Una noche la abre: una foto, un pequeño recuerdo, algo que merece conservarse. No tira nada. Cierra la maleta con cuidado y la coloca en un estante. Por la mañana, la silla libre recibe la luz. El teléfono muestra una invitación: «¿Te apetece quedar?». En vez de inventar una excusa, la persona responde: «Sí». Nadie promete una historia de amor. Pero ahora hay espacio para que algo nuevo comience.",
   stages:["El peso de ayer","Un lugar ocupado por el pasado","Guardar el recuerdo sin ocupar el presente","Espacio para algo nuevo"],
   shots:[
    ["Vuelta a casa","Una persona cansada atraviesa la multitud con una vieja maleta.","Distancia"],
    ["La segunda silla","La maleta ocupa la silla de enfrente en un comedor pequeño.","Pregunta"],
    ["Mirar atrás con cuidado","Unas manos abren la maleta y acarician una fotografía.","Ternura"],
    ["Otro lugar para el pasado","La maleta se guarda en un estante; la silla vuelve a la mesa.","Cambio"],
    ["La invitación","Llega un mensaje para quedar; tras una pausa, la respuesta es «Sí».","Decisión"],
    ["La puerta abierta","La luz de la mañana ilumina las dos sillas mientras la persona sale.","Posibilidad"]
   ]
  }
 },
 real:{
  styleId:"realistic",keywords:[
   ["people","commute","street"],["home","phone","message"],["phone","hands","typing"],
   ["person","face","reflection"],["phone","message","hands"],["cafe","people","meeting"]
  ],
  en:{
   title:"Being Real",mode:"Intimate · realistic",
   idea:"The beginning of closeness can be one honest sentence, not a performance of being fine.",
   story:"After a difficult day, a person stands by the kitchen window while the phone vibrates. ‘How are you?’ For a moment they type the familiar answer: ‘Great, everything's fine.’ Then they delete it. Outside, people hurry through the rain. The person sits down, lets the silence settle, and writes instead: ‘Today was hard. But I would like to see you.’ The typing dots appear, vanish, then return. A reply: ‘I'd like that too.’ We leave them with the phone in their hands and the same imperfect day — now a little less lonely.",
   stages:["The practiced answer","An honest pause","A small risk of being seen","A mutual opening"],
   shots:[
    ["A tiring day","A person gets off crowded transport, shoulders heavy after work.","Recognition"],
    ["The question","At a rainy kitchen window, a phone shows: ‘How are you?’","Invitation"],
    ["The mask","Thumbs type ‘I'm great’ and slowly erase the words.","Conflict"],
    ["A moment of courage","The person watches the rain, exhales and chooses an honest answer.","Choice"],
    ["Truth, sent","The screen shows: ‘Today was hard. I'd like to see you.’","Action"],
    ["A reply","‘I'd like that too’ appears; the person smiles gently, not triumphantly.","Connection"]
   ]
  },
  ru:{
   title:"Можно быть настоящим",mode:"Личная · реалистичная",
   idea:"Близость иногда начинается с одной честной фразы, а не с попытки доказать, что у нас всё прекрасно.",
   story:"После трудного дня человек стоит у кухонного окна. Телефон вибрирует: «Как ты?». Пальцы привычно набирают: «Отлично, всё хорошо», — и стирают написанное. За окном спешат люди под дождём. Человек садится, выдерживает паузу и пишет иначе: «Сегодня было тяжело. Но я бы хотел тебя увидеть». Появляются три точки, исчезают, возвращаются. Ответ: «Я тоже». День не стал идеальным. Но кто-то узнал, каким он был на самом деле, и не отвернулся.",
   stages:["Привычный ответ","Пауза перед правдой","Маленький риск быть увиденным","Ответный шаг"],
   shots:[
    ["Тяжёлый день","Человек выходит из переполненного транспорта после работы.","Узнавание"],
    ["Вопрос","У дождливого окна телефон показывает: «Как ты?».","Приглашение"],
    ["Привычная маска","Пальцы набирают «Всё отлично» и медленно стирают фразу.","Конфликт"],
    ["Немного смелости","Человек смотрит на дождь, выдыхает и выбирает честный ответ.","Выбор"],
    ["Правда отправлена","На экране: «Было тяжело. Я бы хотел тебя увидеть».","Действие"],
    ["Взаимность","Приходит «Я тоже»; появляется тихая, настоящая улыбка.","Контакт"]
   ]
  },
  es:{
   title:"Ser uno mismo",mode:"Íntima · realista",
   idea:"La cercanía puede comenzar con una frase sincera, no con la obligación de aparentar que todo va bien.",
   story:"Después de un día difícil, una persona mira la lluvia desde la cocina. El móvil vibra: «¿Cómo estás?». Escribe «Genial, todo perfecto» y borra las palabras. Fuera, la ciudad sigue corriendo. Se sienta, deja pasar un instante y escribe: «Hoy ha sido duro, pero me gustaría verte». Aparecen los tres puntos de una respuesta, desaparecen y vuelven. Al fin llega: «A mí también». El día no se ha vuelto perfecto, pero alguien ha visto una verdad pequeña y ha querido quedarse cerca.",
   stages:["La respuesta ensayada","Una pausa honesta","El valor de mostrarse","Un gesto mutuo"],
   shots:[
    ["Un día agotador","Una persona sale del transporte lleno después del trabajo.","Reconocimiento"],
    ["Una pregunta","Junto a una ventana con lluvia, el móvil dice: «¿Cómo estás?».","Invitación"],
    ["La máscara","Un dedo escribe «Todo perfecto» y borra el texto.","Conflicto"],
    ["Un momento valiente","La persona observa la lluvia y decide contestar con sinceridad.","Elección"],
    ["La verdad enviada","En pantalla: «Hoy fue duro, pero me gustaría verte».","Acción"],
    ["La respuesta","Llega «A mí también» y una sonrisa discreta ilumina el rostro.","Conexión"]
   ]
  }
 },
 crossing:{
  styleId:"nature",keywords:[
   ["person","path","forest"],["bridge","river","person"],["bag","hands","ground"],
   ["feet","bridge","walking"],["person","bridge","distance"],["sunlight","path","people"]
  ],
  en:{
   title:"The Crossing",mode:"Poetic · nature",
   idea:"Being ready for love doesn't require certainty; it may mean taking one freely chosen step while still feeling afraid.",
   story:"A traveller reaches a narrow wooden bridge at dawn. A heavy bag presses against their hand. Across the river, another figure waits, without beckoning or promising anything. The traveller tests a plank, then steps back. They set the bag down and open it just long enough to remove a small keepsake, placing it in a pocket. They begin to cross, slowly and in their own time. The other figure remains still, leaving room to turn back. We end before they meet: not with a guaranteed romance, but with an unmistakable first step.",
   stages:["A threshold","The weight of hesitation","A step made freely","The possibility of meeting"],
   shots:[
    ["The threshold","A solitary traveller follows a misty woodland path at dawn.","Uncertainty"],
    ["The narrow bridge","A bridge spans a river; someone stands on the other bank, at a respectful distance.","Choice"],
    ["What to carry","A heavy bag is set down; one treasured object is placed in a pocket.","Discernment"],
    ["The first plank","Close-up of a foot stepping onto the bridge, then taking a second step.","Courage"],
    ["Space to choose","The figure across the water waits without calling; the traveller keeps moving.","Respect"],
    ["A story still open","Warm light reaches the far path; we cut before the two people meet.","Hope"]
   ]
  },
  ru:{
   title:"Навстречу",mode:"Поэтическая · природа",
   idea:"Готовность к близости — не отсутствие страха, а возможность сделать свой шаг, даже когда уверенности ещё нет.",
   story:"На рассвете путник выходит к узкому деревянному мосту. В руке тяжёлая сумка. На другом берегу стоит человек — не зовёт и ничего не обещает. Путник пробует первую доску и отступает. Потом ставит сумку на землю, достаёт из неё одну дорогую сердцу вещь и кладёт в карман. Он начинает переходить мост — медленно, в собственном темпе. Другой человек ждёт, не мешая вернуться. Фильм заканчивается до встречи. Это не обещание любви, а момент, когда путь к ней становится возможным.",
   stages:["Порог","Тяжесть сомнений","Свободно выбранный шаг","Возможность встречи"],
   shots:[
    ["У порога","Одинокий путник идёт через туманный лес на рассвете.","Неуверенность"],
    ["Узкий мост","Мост над рекой; человек на дальнем берегу сохраняет дистанцию.","Выбор"],
    ["Что взять с собой","Сумка остаётся на земле; один памятный предмет отправляется в карман.","Различение"],
    ["Первая доска","Крупно: нога ступает на мост и делает ещё один шаг.","Смелость"],
    ["Свобода двигаться","На другом берегу спокойно ждут, не зовут и не требуют.","Уважение"],
    ["Открытый финал","Свет озаряет дорожку за мостом; встречу зритель ещё не видит.","Надежда"]
   ]
  },
  es:{
   title:"El primer paso",mode:"Poética · naturaleza",
   idea:"Estar listo para la cercanía no exige dejar de tener miedo, sino poder dar un paso libremente.",
   story:"Al amanecer, una persona llega a un puente estrecho de madera. Lleva una bolsa pesada. Al otro lado del río hay alguien, quieto, sin pedir nada. La persona prueba la primera tabla y retrocede. Después deja la bolsa en el suelo, rescata un pequeño recuerdo y lo guarda en el bolsillo. Comienza a cruzar despacio, a su propio ritmo. La otra figura espera sin presionar y deja abierta la posibilidad de volver atrás. La película termina antes del encuentro. No promete amor: muestra el instante en que aparece la voluntad de acercarse.",
   stages:["El umbral","El peso de la duda","Un paso libre","La posibilidad del encuentro"],
   shots:[
    ["El umbral","Una persona camina por un sendero con niebla al amanecer.","Incertidumbre"],
    ["El puente estrecho","Un puente cruza el río; otra persona espera lejos, sin acercarse.","Elección"],
    ["Qué llevar","La bolsa se queda en el suelo y un recuerdo pasa al bolsillo.","Criterio"],
    ["La primera tabla","Un pie se posa sobre el puente y da otro paso.","Valentía"],
    ["Espacio para elegir","La figura del otro lado espera sin presionar.","Respeto"],
    ["Un final abierto","La luz alcanza el camino del otro lado antes del encuentro.","Esperanza"]
   ]
  }
 }
};

const CRAFT={
 space:{
  ru:{symbol:"Старый чемодан и второй стул",
   world:"Вечерний город и тихая квартира; чемодан, два стула и мягкий утренний свет",
   character:"Один неназванный взрослый герой; крупные планы рук и выразительный общий план",
   arc:["Одиночество","Бережная встреча с прошлым","Освобождение места","Тихое согласие"]},
  en:{symbol:"Old suitcase and second chair",
   world:"Evening city and a quiet apartment; suitcase, two chairs, soft morning light",
   character:"One unnamed adult protagonist; close-ups of hands and a revealing wide shot",
   arc:["Isolation","Tender remembrance","Making room","A quiet yes"]},
  es:{symbol:"Una maleta y una segunda silla",
   world:"Ciudad al atardecer, piso tranquilo, maleta, dos sillas y luz suave de mañana",
   character:"Una persona adulta sin nombre; primeros planos de manos y una vista general reveladora",
   arc:["Soledad","Recuerdo con ternura","Hacer espacio","Un sí tranquilo"]}
 },
 real:{
  ru:{symbol:"Телефон и честное сообщение",
   world:"Реальные городские улицы, кухня у дождливого окна, крупные планы телефона и лица",
   character:"Один неназванный взрослый герой; близкий, наблюдательный ракурс",
   arc:["Усталость","Сомнение перед правдой","Честный ответ","Взаимность"]},
  en:{symbol:"Phone and honest message",
   world:"Real city streets, a kitchen beside a rainy window, close-ups of phone and face",
   character:"One unnamed adult protagonist in an intimate, observational point of view",
   arc:["Exhaustion","Hesitation before honesty","A truthful reply","Reciprocity"]},
  es:{symbol:"Móvil y mensaje sincero",
   world:"Calles reales, cocina junto a una ventana con lluvia, primeros planos del móvil y el rostro",
   character:"Una persona adulta sin nombre vista de cerca, con respeto y discreción",
   arc:["Cansancio","Duda ante la verdad","Respuesta sincera","Reciprocidad"]}
 },
 crossing:{
  ru:{symbol:"Мост и тяжёлая сумка",
   world:"Туманный лес, узкий деревянный мост над рекой, два берега и рассветный свет",
   character:"Путник и далёкая фигура, без заданного пола или обещанной романтической встречи",
   arc:["Сомнение","Разобраться с грузом","Первый шаг","Надежда без гарантий"]},
  en:{symbol:"Bridge and heavy bag",
   world:"Misty woodland, a narrow wooden bridge over a river, two banks and dawn light",
   character:"A traveller and a distant figure, without assigned gender or promised romance",
   arc:["Hesitation","Choosing what to carry","The first step","Hope without guarantees"]},
  es:{symbol:"Puente y bolsa pesada",
   world:"Bosque con niebla, puente de madera sobre el río, dos orillas y luz del amanecer",
   character:"Una persona viajera y una figura lejana; sin géneros impuestos ni romance prometido",
   arc:["Duda","Elegir qué llevar","El primer paso","Esperanza sin garantías"]}
 }
};
const SCENARIOS={space:"ready-relationship-s1",real:"ready-relationship-s3",
 crossing:"ready-relationship-s2"};
const SENTENCE={
 ru:beat=>beat.endsWith(".")?beat:beat+".",
 en:beat=>beat.endsWith(".")?beat:beat+".",
 es:beat=>beat.endsWith(".")?beat:beat+"."
};
function fromCatalog(concept,locale){
 const l=langOf(locale);
 return listMyTubeScenarios(concept.topicId,l).slice(0,4).map((scenario,index)=>{
  const beats=(scenario.sceneOutline||[]).map(x=>clean(x,160)).filter(Boolean);
  if(beats.length!==4)return null;
  const intro={
   ru:"Открываем историю моментом: ",en:"The story opens with ",es:"La historia empieza con "
  }[l];
  const turn={
   ru:"Постепенно проявляется новое: ",en:"Something begins to change: ",es:"Algo empieza a cambiar: "
  }[l];
  const choice={
   ru:"Поворот наступает в момент: ",en:"Then comes the turning point: ",es:"Llega el momento decisivo: "
  }[l];
  const ending={
   ru:"Последний образ оставляет пространство для выбора: ",
   en:"The final image leaves room for a choice: ",
   es:"La imagen final deja espacio para elegir: "
  }[l];
  const last={
   ru:"Это возможность, а не обещание результата.",
   en:"It offers a possibility, not a promised outcome.",
   es:"Es una posibilidad, no una promesa de resultados."
  }[l];
  const story=[intro+SENTENCE[l](beats[0]),turn+SENTENCE[l](beats[1]),
   choice+SENTENCE[l](beats[2]),ending+SENTENCE[l](beats[3]),last].join(" ");
  const idea=clean(scenario.creativeBrief,350)||clean(scenario.label);
  return {id:"catalog-"+scenario.id,title:clean(scenario.label,100),
   mode:index===0?({ru:"Символическая",en:"Symbolic",es:"Simbólica"})[l]:
    index===1?({ru:"Реалистичная",en:"Grounded",es:"Realista"})[l]:
    ({ru:"Поэтическая",en:"Poetic",es:"Poética"})[l],
   idea,story,stages:beats,storyboard:null,styleId:concept.styleId,
   provenance:"catalog_scenario_editorial",scenarioId:scenario.id};
 }).filter(Boolean);
}

/** More than one film direction only for sufficiently specific intent. */
export function getVideoCreativeDirections(concept,locale="en"){
 if(!concept||!concept.hasPersonalInput||concept.source==="audio_transcript"||
   concept.speechBeatsSource==="transcript"||
   ["celebration","presentation","practice","audio_visual"].includes(concept.semanticPurpose))
   return [];
 const l=langOf(locale);
 if(concept.topicId==="ready-relationship"){
  const omit=new Set(concept.avoidImagery||[]);
  const ids=omit.has("water")||omit.has("forest")?["space","real"]:["space","real","crossing"];
  const entries=ids.map(id=>{
   const def=STORY_BOOK[id],p=def[l],craft=CRAFT[id][l];
   return {id,title:p.title,mode:p.mode,idea:p.idea,story:p.story,
    stages:[...p.stages],styleId:def.styleId,...craft,
    plotMode:id==="real"?"grounded_dilemma":"symbolic_quest",
    storyboard:p.shots.map(([title,action,emotion],i)=>({
     title,action,emotion,keywords:[...def.keywords[i]]})),
    provenance:"curated_editorial",scenarioId:SCENARIOS[id]};
  });
  if(entries.length<3)entries.push(...fromCatalog(concept,l)
   .filter(s=>s.scenarioId==="ready-relationship-s4").slice(0,1));
  return entries;
 }
 // Preserve low-confidence and free-text-only intentions without inventing
 // a new biography, diagnosis, character, recipient or relationship.
 if(concept.semanticConfidence==="low")return [];
 return fromCatalog(concept,l).slice(0,3);
}

/** Keep the original user-intent signature separate from each authored direction. */
export function applyVideoCreativeDirection(base,direction){
 if(!base||!direction)return base;
 const signature=String(base.baseSignature||base.signature).split("~director:")[0];
 const isCurated=Array.isArray(direction.storyboard)&&direction.storyboard.length===6;
 const outline=Array.isArray(direction.stages)?direction.stages.slice(0,4):[...base.sceneOutline];
 const arc=Array.isArray(direction.arc)&&direction.arc.length===4?
  [...direction.arc]:[...base.emotionalProgram];
 const actions=isCurated?direction.storyboard.map(x=>x.action):outline;
 const parameters=base.parameters?{...base.parameters}:undefined;
 const setParam=(key,value)=>{
  if(parameters)parameters[key]={value,status:"suggested",source:"creative_director"};
 };
 setParam("mainMessage",direction.idea);
 setParam("beats",outline);
 setParam("hook",actions[0]);
 setParam("centralAction",actions[3]||actions[2]);
 setParam("endingIntent",actions[actions.length-1]);
 setParam("visualActions",actions);
 setParam("emotionalProgram",arc);
 setParam("startingTone",arc[0]);
 setParam("endingTone",arc[3]);
 if(direction.plotMode)setParam("plotMode",direction.plotMode);
 if(direction.world)setParam("visualWorld",direction.world);
 if(direction.character)setParam("characterAndPOV",direction.character);
 setParam("styleId",direction.styleId||base.styleId);
 if(direction.scenarioId)setParam("scenarioId",direction.scenarioId);
 return {
  ...base,baseSignature:signature,signature:signature+"~director:"+direction.id,
  creativeDirectionId:direction.id,creativeTitle:direction.title,
  creativeMode:direction.mode,creativeSymbol:direction.symbol||undefined,
  storySource:direction.provenance,
  mainMessage:direction.idea,conceptText:direction.story,sceneOutline:outline,
  emotionalProgram:arc,
  storyboard:isCurated?direction.storyboard.map(s=>({...s,keywords:[...s.keywords]})):undefined,
  scenarioId:direction.scenarioId||base.scenarioId,
  styleId:direction.styleId||base.styleId,
  parameters
 };
}
