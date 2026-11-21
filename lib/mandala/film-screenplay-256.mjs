/**
 * Full 256-film screenplay library, derived from the canonical 64×4 taxonomy
 * and 256 independently chosen visual props in film-256-props.mjs.
 *
 * One record = one titled 30-second, six-event silent film with an authorial
 * idea, plot, visual action and open ending, localized RU / EN / ES.
 * The original 4 beats remain metadata, never copied as mechanical arrow prose.
 * No local LLM, extra service, external fetch, runtime payment or footage claim.
 */
import taxonomy from "../../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json" with {type:"json"};
import {getFilmTopicProp,FILM_TOPIC_PROPS} from "./film-256-props.mjs";
import {getFilm256EditorialOverride} from "./film-256-editorial-overrides.mjs";
import {filmedBeatAction} from "./film-256-beat-actions.mjs";
import {reviewConceptQuality} from "./cinematic-concept-v3.mjs";

const L=(ru,en,es)=>Object.freeze({ru,en,es});
const W=(place,pressure,next)=>Object.freeze({place,pressure,next});
const WORLD=Object.freeze({
 "purpose-development":W(L("небольшой мастерской у окна","a small studio by a window","un pequeño taller junto a una ventana"),
  L("Старый план закрывает края чистого листа.","An old plan covers the edge of a blank page.","Un plan antiguo tapa una página nueva."),
  L("Человек вешает на доску записку об одной пробе вместо большого обещания.","A note for one small experiment is pinned to the board instead of a grand promise.","Coloca en el tablero la nota de una pequeña prueba.")),
 "goal-achievement":W(L("утреннем рабочем уголке","a morning work corner","un rincón de trabajo por la mañana"),
  L("На столе лежит слишком длинный список незаконченных дел.","An overlong list of unfinished tasks covers the desk.","Una lista interminable de tareas cubre la mesa."),
  L("Герой отмечает в календаре одно небольшое действие и оставляет остальное открытым.","One modest action is placed on the calendar, leaving the rest open.","Anota una acción pequeña en el calendario.")),
 "money-abundance":W(L("кухонном уголке с чеками","a kitchen corner with receipts","una cocina con recibos"),
  L("Цифры на листке не совпадают с тревожными предположениями героя.","Figures on paper do not quite match the person's worried guesses.","Los números en papel no coinciden con las preocupaciones."),
  L("Рядом с цифрами появляется один конкретный вопрос, который можно проверить.","One checkable question is written beside the figures.","Una pregunta verificable aparece junto a las cifras.")),
 "business-career":W(L("светлом кабинете с рабочими заметками","a bright office with work notes","una oficina luminosa con apuntes"),
  L("Несколько чужих ожиданий тесно стоят на полях блокнота.","Other people's expectations crowd the margins of a notebook.","Las expectativas ajenas llenan los márgenes del cuaderno."),
  L("Герой готовит короткую просьбу о разговоре, не подменяя факты мечтой.","A brief request for a conversation is prepared, with facts kept in view.","Prepara una petición breve sin exagerar los hechos.")),
 "loneliness-breakups":W(L("тихой гостиной с двумя стульями","a quiet living room with two chairs","un salón tranquilo con dos sillas"),
  L("Один стул стоит чуть дальше другого, и это заметно в тишине.","One chair stands farther away than the other, and the silence is palpable.","Una silla está más lejos que la otra, y se nota el silencio."),
  L("Человек оставляет возле телефона карточку контакта, не требуя немедленного ответа.","A contact card stays near the phone without demanding an immediate reply.","Deja una tarjeta de contacto junto al móvil sin exigir respuesta.")),
 "finding-love":W(L("небольшом кафе у окна","a small café by the window","una pequeña cafetería junto a la ventana"),
  L("На соседнем стуле лежит сумка, словно для ожидания не осталось места.","A bag occupies the neighboring chair as if no space is left for chance.","Una bolsa ocupa la silla de al lado."),
  L("Герой записывает вопрос для знакомства и оставляет свободу ответить или нет.","An invitation is written with room for the other person to decline.","Escribe una invitación que admite un no.")),
 "couple-relationships":W(L("домашней кухне с общим столом","a home kitchen with a shared table","una cocina con mesa compartida"),
  L("Два листка с разными мнениями лежат на противоположных краях стола.","Two different notes sit at opposite edges of the table.","Dos notas distintas están en extremos de la mesa."),
  L("Человек кладёт два взгляда рядом и записывает один вопрос без обвинений.","The two views are set side by side and one question is written without blame.","Acerca las dos notas y escribe una pregunta sin culpas.")),
 "intimacy-family":W(L("жилой комнате с мягким светом","a living room in soft daylight","una sala con luz suave"),
  L("Знакомые вещи напоминают о разговоре, который снова отложили.","Familiar objects recall a conversation postponed once again.","Los objetos recuerdan una charla aplazada."),
  L("Герой предлагает простой жест контакта, оставляя другому человеку место и выбор.","A small gesture of contact is offered without taking away anyone's choice.","Ofrece un gesto sencillo respetando el espacio ajeno.")),
 "stress-fatigue":W(L("прихожей после длинного дня","an entryway after a long day","un recibidor después de un día largo"),
  L("Рабочие вещи всё ещё лежат поверх домашней одежды.","Work things still cover the person's everyday belongings.","Los objetos del trabajo siguen sobre la ropa de casa."),
  L("Герой откладывает один предмет и на минуту возвращается к выбранному ритму.","One thing is set aside, giving the next minute a different pace.","Aparta un objeto y deja un minuto sin prisas.")),
 "body-health":W(L("спокойной комнате с удобным стулом","a quiet room with a comfortable chair","una habitación tranquila con una silla cómoda"),
  L("Тело спешит за задачей, хотя сам человек пока остаётся на месте.","The person rushes in their thoughts while still sitting in place.","La mente se apresura aunque la persona sigue sentada."),
  L("Ноги находят пол, а руки удобно ложатся на колени: ничего не требуется доказывать.","Feet find the floor and hands rest comfortably, without forcing a result.","Los pies encuentran el suelo y las manos descansan sin esfuerzo.")),
 "vital-energy":W(L("утренней кухне с открытой занавеской","a morning kitchen with an open curtain","una cocina matinal con la cortina abierta"),
  L("Рядом с чашкой лежит план, рассчитанный на гораздо больше сил.","A demanding plan sits beside a simple breakfast cup.","Un plan exigente está junto a la taza."),
  L("На сегодня выбирается одно доступное движение, а не обязательство быть бодрым.","One available movement is chosen, not a demand to feel energetic.","Elige un movimiento posible sin exigirse energía.")),
 "confidence-calm":W(L("светлом коридоре перед встречей","a bright hallway before a meeting","un pasillo iluminado antes de una reunión"),
  L("На карточке написаны длинные слова, которые трудно произнести вслух.","A card carries overly rehearsed words that feel difficult to say.","Una tarjeta tiene palabras ensayadas difíciles de decir."),
  L("Герой оставляет одно ясное предложение и готовится сказать его естественно.","One plain sentence remains on the card, ready to be spoken naturally.","Deja una frase clara lista para decirla con naturalidad.")),
 "stress-burnout":W(L("квартире после рабочего вечера","an apartment at the end of a demanding workday","un apartamento tras una jornada exigente"),
  L("Уведомления продолжают мигать, пока куртка ещё лежит на спинке стула.","Messages continue to appear while the coat still hangs over the chair.","Siguen llegando mensajes mientras el abrigo está en la silla."),
  L("Герой делает паузу и отмечает, какую просьбу о помощи можно отправить.","A pause makes room for a short, specific request for support.","Una pausa permite escribir una petición de apoyo.")),
 "anxiety-fears":W(L("знакомой тихой комнате","a familiar quiet room","una habitación tranquila y familiar"),
  L("Непонятное беспокойство отвлекает взгляд от вещей, которые действительно рядом.","Uncertainty draws attention away from the things actually in the room.","La incertidumbre aparta la atención de lo que hay cerca."),
  L("Человек замечает форму устойчивого предмета и решает, к кому можно обратиться.","The shape of a steady object is noticed, and a possible support contact is kept in mind.","Observa un objeto estable y recuerda un contacto de apoyo.")),
 "psychological-trauma":W(L("комнате сегодняшнего дня с настольной лампой","a present-day room with a small lamp","una habitación del presente con una lámpara"),
  L("Непростой предмет лежит закрытым: нет необходимости вновь проживать прошлое.","A difficult keepsake stays closed; no memory needs to be revisited.","Un recuerdo difícil permanece cerrado; no hay que revivir nada."),
  L("Человек ставит рядом карточку доступной поддержки и оставляет себе право остановиться.","A support card is placed close by, with full permission to stop.","Deja una tarjeta de apoyo y conserva el derecho a parar.")),
 "depression-apathy":W(L("тихой утренней комнате","a quiet morning room","una habitación tranquila por la mañana"),
  L("Обычные вещи не вызывают прежнего отклика, и герой ничего не изображает.","Familiar things bring little response, and the person does not pretend otherwise.","Las cosas conocidas provocan poco, sin necesidad de fingir."),
  L("Герой выбирает один нейтральный жест заботы и оставляет рядом контакт помощи.","One neutral act of care is chosen, with support details kept in reach.","Elige un gesto sencillo de cuidado y deja un contacto al alcance."))
});
const cap=x=>x?x.charAt(0).toLocaleUpperCase()+x.slice(1):"";
const COPY={
 ru:{titles:["Первые детали","Заметная остановка","Другой ракурс","Поворот истории","Маленький ответ","Открытый финал"],
  arc:["Настороженность","Замеченное","Собственный выбор","Открытость"],
  tone:{journey:"Путь и выбор",shelter:"Тихая поддержка",reframe:"Изменение взгляда",integration:"Связать важное"},
  idea:{
   journey:p=>"Не весь путь можно увидеть заранее. Иногда "+p+" становится знаком одного небольшого шага, который человек выбирает сам.",
   shelter:p=>"Пока весь день требует ответа, "+p+" напоминает о маленькой паузе. У истории остаётся место для заботы без требования немедленно измениться.",
   reframe:p=>"Стоит сменить ракурс, и привычная деталь — "+p+" — открывается иначе. Пробовать другой взгляд можно без приговора самому себе.",
   integration:p=>"Две разные потребности могут быть рядом. "+cap(p)+" остаётся видимым знаком того, что следующий шаг не обязан перечёркивать уже прожитое."
  },
  pitch:(p,w)=>"В "+w+" взгляд героя останавливается на простой детали: "+p+". Одно маленькое решение меняет ход дня; финал остаётся открытым.",
  shot:{
   journey:[
    (p,w)=>"В "+w+" человек разворачивает лист с незаконченной схемой. Рядом лежит "+p+"; на бумаге видны следы прежних попыток.",
    (p,w,q)=>q+" Герой берёт карандаш, тянется к старой стрелке и останавливает руку над ней.",
    (p)=>"Человек подносит предмет ближе к свету, медленно поворачивает его в руках. Маленькая тень ложится поперёк старой линии на карте.",
    (p)=>"Он зачёркивает одну навязанную стрелку, рисует собственную короткую линию и кладёт карандаш рядом с предметом.",
    (p,w,q,next)=>next+" Герой смотрит на запись, не пытаясь сразу заполнить весь лист.",
    (p)=>"В последнем плане предмет остаётся возле новой линии. Видно свободное место на бумаге, а дверь комнаты приоткрыта."
   ],
   shelter:[
    (p,w)=>"В "+w+" перед человеком лежит заметная деталь: "+p+". Рядом скапливаются незавершённые дела; рука устало замирает.",
    (p,w,q)=>q+" Человек опускает плечи и осторожно освобождает рядом с собой небольшое место.",
    (p)=>"Он ставит предмет в полосу спокойного света и проводит ладонью по поверхности, убирая один лишний лист.",
    (p)=>"Вместо нового обещания герой записывает одну посильную просьбу или границу и кладёт лист рядом с предметом.",
    (p,w,q,next)=>next+" Рука ненадолго остаётся на столе; ответ не нужно торопить.",
    (p)=>"Камера отъезжает: предмет стоит на своём месте, рядом лежит короткая записка. Незавершённый день остаётся за пределами кадра."
   ],
   reframe:[
    (p,w)=>"В "+w+" взгляд человека упирается в одну деталь: "+p+". За ней скрывается ещё что-то, пока не видимое.",
    (p,w,q)=>q+" Герой подвигает стул, но сначала машинально возвращает его на старое место.",
    (p)=>"Теперь предмет оказывается в боковом свете. Герой поворачивает его, и прежде незаметная деталь становится видимой.",
    (p)=>"Человек отодвигает лист с прежней оценкой, кладёт рядом чистую карточку и рисует на ней один возможный вариант.",
    (p,w,q,next)=>next+" Он проверяет этот вариант небольшим жестом и не пытается доказать результат заранее.",
    (p)=>"В широком финальном кадре видны и старый лист, и новая карточка. Предмет стоит между ними, ничего не скрывая."
   ],
   integration:[
    (p,w)=>"В "+w+" между двумя стопками появляется предмет: "+p+". Человек по очереди тянется к каждой стороне.",
    (p,w,q)=>q+" Герой отодвигает одну стопку, но затем замечает оставленную на ней важную записку.",
    (p)=>"Обе стопки возвращаются в кадр. Герой перемещает предмет между ними, находя место, где ничто не нужно прятать.",
    (p)=>"Он оставляет две короткие пометки рядом, соединяет их одной аккуратной линией и откладывает ненужные инструкции.",
    (p,w,q,next)=>next+" Человек делает одно небольшое действие, сохраняя право позже изменить решение.",
    (p)=>"Последний кадр держит предмет и две заметки в одной композиции. Остаётся свободный уголок для следующего решения."
   ]
  }
 },
 en:{titles:["The small detail","A visible pause","Another angle","A chosen turn","One response","An open ending"],
  arc:["Hesitation","Noticing","A chosen step","Openness"],
  tone:{journey:"A journey and a choice",shelter:"Quiet support",reframe:"A shifted perspective",integration:"Bringing parts together"},
  idea:{
   journey:p=>"The whole route cannot be known in advance. "+cap(p)+" quietly marks one honest step that a person can choose for themselves, without a promised arrival.",
   shelter:p=>"While an unfinished day asks for more, "+p+" makes a small pause visible. The story gives care a place without demanding an instant transformation.",
   reframe:p=>"Even "+p+" appears different when the light changes. The character can try another point of view without turning one imperfect moment into a verdict.",
   integration:p=>"Two different needs can remain side by side. "+cap(p)+" becomes a visible reminder that the next decision need not erase what mattered before."
  },
  pitch:(p,w)=>"In "+w+", "+p+" interrupts the usual rhythm. A person makes one visible change to a familiar situation; the result stays open.",
  shot:{
   journey:[
    (p,w)=>"In "+w+", a person unfolds an unfinished sketch. Beside it rests "+p+", and the paper bears faint marks from earlier attempts.",
    (p,w,q)=>q+" A pencil follows an old arrow on the page, then stops halfway as the person lifts their hand.",
    (p)=>"The person turns the object toward the light. Its small shadow now crosses the old route on the paper.",
    (p)=>"Rather than retrace someone else's arrow, the person draws one short line of their own and lays the pencil beside the object.",
    (p,w,q,next)=>next+" They study the new mark without trying to fill the rest of the page.",
    (p)=>"The object and the new line remain together in the final frame. Blank paper is still visible; the door is slightly open."
   ],
   shelter:[
    (p,w)=>"In "+w+", a person holds "+p+" while unfinished tasks crowd the nearby surface. Their fingers nearly lose their grip.",
    (p,w,q)=>q+" The person makes a little space beside them and sets down something they no longer need to carry.",
    (p)=>"The object is moved into a soft band of daylight. A hand clears one unnecessary paper from the table.",
    (p)=>"Instead of promising to change everything, the person writes one manageable request or limit and places it beside the object.",
    (p,w,q,next)=>next+" Their hand stays on the table for a moment; nobody needs to rush the reply.",
    (p)=>"The camera draws back from the object and the small note. The rest of the unfinished day remains outside the frame."
   ],
   reframe:[
    (p,w)=>"In "+w+", the person studies "+p+" from one fixed angle. Something small remains hidden behind it.",
    (p,w,q)=>q+" A chair scrapes against the floor; the person moves it, then almost returns it to its old place.",
    (p)=>"Turning the object toward the side light reveals a detail that was invisible from the first position.",
    (p)=>"The person slides the old judgment aside, takes a clean card and draws one alternative without crossing out the past.",
    (p,w,q,next)=>next+" A small practical test follows, without any attempt to prove the outcome in advance.",
    (p)=>"The wide frame holds both the original page and the new card. The object now stands between them, obscuring neither."
   ],
   integration:[
    (p,w)=>"In "+w+", a person places "+p+" between two small piles of belongings and reaches first for one, then the other.",
    (p,w,q)=>q+" One pile is pushed away; a little note on its edge makes the person stop and reconsider.",
    (p)=>"Both piles return to the frame. The object is set between them, where neither part has to disappear.",
    (p)=>"The person writes two short notes, connects them with one careful line and folds away the instructions that no longer help.",
    (p,w,q,next)=>next+" One modest action follows, with space to change the choice later.",
    (p)=>"In the final still image, the object and both notes share the same table. One corner is deliberately left empty."
   ]
  }
 },
 es:{titles:["Un detalle","Una pausa visible","Otro ángulo","Una elección","Una respuesta","Final abierto"],
  arc:["Vacilación","Atención","Elección propia","Apertura"],
  tone:{journey:"Camino y decisión",shelter:"Apoyo tranquilo",reframe:"Otra perspectiva",integration:"Unir lo importante"},
  idea:{
   journey:p=>"No hace falta conocer todo el camino. "+cap(p)+" señala un paso pequeño que la persona puede elegir sin prometerse la llegada.",
   shelter:p=>"Mientras el día sigue exigiendo, "+p+" vuelve visible una pausa. La historia hace sitio al cuidado sin exigir una transformación inmediata.",
   reframe:p=>"Hasta "+p+" parece diferente cuando cambia la luz. Se puede probar otra perspectiva sin convertir un momento imperfecto en sentencia.",
   integration:p=>"Dos necesidades distintas pueden convivir. "+cap(p)+" recuerda que la siguiente decisión no tiene que borrar lo que importó antes."
  },
  pitch:(p,w)=>"En "+w+", "+p+" interrumpe una costumbre. Una persona cambia algo visible y deja abierto el resultado.",
  shot:{
   journey:[
    (p,w)=>"En "+w+", una persona despliega un boceto incompleto. A su lado hay "+p+" y marcas de intentos anteriores.",
    (p,w,q)=>q+" Un lápiz sigue una flecha antigua en el papel, pero la mano se detiene antes de llegar al final.",
    (p)=>"La persona gira el objeto hacia la luz. Su sombra cruza ahora la ruta antigua sobre la hoja.",
    (p)=>"En lugar de repetir la flecha ajena, dibuja una línea propia y deja el lápiz junto al objeto.",
    (p,w,q,next)=>next+" Observa la nueva marca sin intentar llenar toda la página.",
    (p)=>"El objeto y la línea nueva quedan juntos. Todavía hay papel en blanco y la puerta sigue entreabierta."
   ],
   shelter:[
    (p,w)=>"En "+w+", una persona sostiene "+p+" mientras se acumulan tareas a su alrededor. Sus dedos casi lo sueltan.",
    (p,w,q)=>q+" Hace un poco de espacio a su lado y deja algo que ya no necesita cargar.",
    (p)=>"Coloca el objeto bajo una franja de luz suave y retira un papel innecesario de la mesa.",
    (p)=>"En vez de prometer cambiarlo todo, escribe una petición o límite posible y lo deja junto al objeto.",
    (p,w,q,next)=>next+" La mano descansa un instante sobre la mesa, sin apurar ninguna respuesta.",
    (p)=>"La cámara se aleja del objeto y de la nota. El resto del día inacabado queda fuera del encuadre."
   ],
   reframe:[
    (p,w)=>"En "+w+", una persona observa "+p+" siempre desde el mismo ángulo. Algo pequeño queda oculto detrás.",
    (p,w,q)=>q+" Mueve la silla, duda y casi vuelve a colocarla donde estaba.",
    (p)=>"El objeto gira hacia la luz lateral y deja ver un detalle que antes no aparecía.",
    (p)=>"Aparta el juicio antiguo, toma una tarjeta limpia y dibuja una alternativa sin borrar el pasado.",
    (p,w,q,next)=>next+" Prueba el cambio con un gesto pequeño sin exigir un resultado perfecto.",
    (p)=>"En el plano general se ven la hoja anterior y la tarjeta nueva. El objeto queda en medio, sin ocultar ninguna."
   ],
   integration:[
    (p,w)=>"En "+w+", una persona deja "+p+" entre dos montones de objetos y toca primero uno y luego el otro.",
    (p,w,q)=>q+" Aparta uno de los montones, pero una pequeña nota en el borde la hace detenerse.",
    (p)=>"Los dos montones vuelven al encuadre. El objeto queda entre ellos; ninguna parte tiene que desaparecer.",
    (p)=>"Escribe dos notas breves, las une con una línea y guarda las instrucciones que ya no sirven.",
    (p,w,q,next)=>next+" Da un pequeño paso, conservando el derecho a cambiar de idea más tarde.",
    (p)=>"En la imagen final, el objeto y ambas notas comparten la mesa. Queda una esquina libre para otra decisión."
   ]
  }
 }
};
const stageOf=[0,0,1,2,3,3];
const styleOf={journey:"cinematic",shelter:"realistic",reframe:"cinematic",integration:"realistic"};
const modes=new Set(["journey","shelter","reframe","integration"]);
const scoreProfile=(kind,subcategory)=>({
 current:kind==="journey"?["uncertain","stuck","afraid"]:
  kind==="shelter"?["fatigue","drained","overwhelmed","loneliness"]:
  kind==="reframe"?["selfcritical","uncertain","discouraged"]:["stuck","irritated","overwhelmed"],
 desired:kind==="journey"?["clarity","hopeful","freedom","confident"]:
  kind==="shelter"?["safe","calm","rested","supported","comforted"]:
  kind==="reframe"?["clarity","accepted","confident","understood"]:
  ["balanced","connected","fulfilled","freedom"],
 focus:kind==="journey"?["growth","freedom","agency"]:
  kind==="shelter"?["connection","anchor","support","meaning"]:
  kind==="reframe"?["dignity","agency","meaning"]:
  ["connection","wholeness","growth"],
 energy:kind==="journey"?"rise":"gentle"
});
const compact=x=>String(x??"").normalize("NFKC").replace(/\s+/gu," ").trim();
const subjectOf=(scene,index)=>["adult person","hands","the central object","a written decision","the first response","an unfinished next step"][index];
const allRows=taxonomy.categories.flatMap(cat=>cat.subcategories.flatMap(sub=>
 sub.topics.flatMap(topic=>topic.scenarios.map((scenario,index)=>({
  cat,sub,topic,scenario,index
 })))));
const byId=new Map(allRows.map(row=>[row.scenario.id,row]));
const read=(value,locale)=>compact(value?.[locale]||value?.en||"");
const sceneId=(s,index)=>s+":scene:"+(index+1);
export const FILM_SCREENPLAY_COUNT=allRows.length;
export const FILM_SCREENPLAY_SOURCE_STATUS="editorial_screenplay_unverified_media";
export const listScreenplayIds=()=>allRows.map(row=>row.scenario.id);
export function createCompleteFilm(row,locale="en",concept={}){
 const l=COPY[locale]?locale:"en",s=row.scenario,k=modes.has(s.archetype)?s.archetype:"journey";
 const w=WORLD[row.sub.id],prop=getFilmTopicProp(row.topic.id,row.index);
 if(!w||!prop||prop.length!==3)throw Error("missing_cinematic_world:"+s.id);
 const p=prop[["ru","en","es"].indexOf(l)],place=read(w.place,l),
  pressure=read(w.pressure,l),next=read(w.next,l);
 const c=COPY[l],frames=c.shot[k];
 const override=getFilm256EditorialOverride(s.id,l);
 const originalBeats=[...s.storyboard[l]];
 const actions=override?.scenes?.length===6?
  override.scenes.map(compact):frames.map(fn=>compact(fn(p,place,pressure,next)));
 // Replace recurring prop-only middle beats with visible actions chosen by
 // their original *scenario-specific* plot events. Never change a hand-written
 // director-approved scene or assume that a source clip has been found.
 const filmedBeats=[];
 if(!override){
  for(const shotIndex of [2,3,4]){
   const beatIndex=stageOf[shotIndex];
   const specific=filmedBeatAction(s.storyboard.en[beatIndex],l,shotIndex,row.sub.id,p);
   actions[shotIndex]=specific.action;
   filmedBeats.push({scene:shotIndex+1,originalBeat:originalBeats[beatIndex],
    motif:specific.type});
  }
 }
 const filmIdea=override?.idea||c.idea[k](p);
 const filmPitch=override?.pitch||c.pitch(p,place);
 const filmSymbol=override?.symbol||p;
 const filmArc=override?.arc?.length===4?[...override.arc]:[...c.arc];
 const scenes=actions.map((action,index)=>Object.freeze({
  id:sceneId(s.id,index),index:index+1,action,narrative:action,
  sourceBeatIndex:stageOf[index],sourceBeat:originalBeats[stageOf[index]]
 }));
 const storyboard=actions.map((action,index)=>Object.freeze({
  index:index+1,sceneId:scenes[index].id,
  startSeconds:index*5,endSeconds:(index+1)*5,
  visualAction:action,action,
  title:index===0?read(s.label,l):index===5?c.titles[5]:originalBeats[stageOf[index]],
  visualSubject:subjectOf(s,index),shotType:["medium","close-up","detail","medium","close-up","wide"][index],
  emotionalFunction:filmArc[stageOf[index]],emotion:filmArc[stageOf[index]],
  sourceBeatIndex:stageOf[index],sourceBeat:originalBeats[stageOf[index]],
  continuityKeys:["same-adult","primary-prop-"+s.id,"same-setting-"+row.sub.id],
  keywords:[row.cat.id.split("-")[0],"person","hands","object","paper"],
  searchKeywords:[row.cat.id.split("-")[0],"person","hands"],
  sourceStatus:"editorial_unverified",sourceVerified:false
 }));
 const psychologicalBrief=Object.freeze({family:row.cat.id,topic:row.topic.id,
  confirmedStateOnly:true,doNotAssume:["diagnosis","biography","family history","guaranteed outcome"]});
 const emotionalBeats=[...filmArc];
 const film={
  id:"film256-"+s.id,scenarioId:s.id,topicId:row.topic.id,
  categoryId:row.cat.id,subcategoryId:row.sub.id,
  title:read(s.label,l),mode:c.tone[k],genre:k,styleId:styleOf[k],
  idea:filmIdea,mainIdea:filmIdea,
  pitch:filmPitch,dramaticPremise:filmPitch,
  story:scenes.map(x=>x.narrative).join("\n\n"),
  conceptStory:scenes.map(x=>x.narrative).join("\n\n"),
  conceptScenes:scenes,sourceStages:originalBeats,
  stages:originalBeats,arc:emotionalBeats,emotionalBeats,
  symbol:filmSymbol,activeSymbol:{name:filmSymbol,functionInPlot:read(s.label,l)},
  world:place,character:"anonymous_adult_editorial",
  obstacle:pressure,centralAction:actions[3],turningPoint:actions[3],
  endingImage:actions[5],logline:filmPitch,
  shots:storyboard,storyboard,continuityKeys:["same-adult","primary-prop-"+s.id],
  originalCatalogId:s.id,visualAnchor:filmSymbol,
  specificBeatActions:filmedBeats,
  fitProfile:scoreProfile(k,row.sub.id),
  editorialTreatment:override?"individually_directed":"story_specific_prop_composition",
  provenance:"256_screenplay_editorial",creativeSchemaVersion:"hh-creative-concept-v3",
  mediaBindingStatus:"editorial_only_unverified",
  sourceStatus:"editorial_unverified",
  psychologicalBrief
 };
 film.review=reviewConceptQuality(film,{
  locale:l,goal:concept.goal||row.topic.label[l],
  avoidImagery:concept.avoidImagery||[]
 });
 return film;
}
export function listCompleteFilmScreenplays(topicId,locale="en",concept={}){
 const candidates=allRows.filter(row=>row.topic.id===topicId);
 return candidates.map(row=>createCompleteFilm(row,locale,concept));
}
export function getCompleteFilmScreenplay(scenarioId,locale="en",concept={}){
 const row=byId.get(scenarioId);
 return row?createCompleteFilm(row,locale,concept):null;
}
export function auditCompleteFilmScreenplays(locale="en"){
 const ids=new Set(),errors=[],roles=new Set(),reviews=[];
 for(const row of allRows){
  if(ids.has(row.scenario.id))errors.push("duplicate_id:"+row.scenario.id);
  ids.add(row.scenario.id);
  const film=createCompleteFilm(row,locale);
  reviews.push({id:film.id,score:film.review.score,issues:film.review.hardFailures});
  if(film.storyboard.length!==6||film.conceptScenes.length!==6)
   errors.push("scene_count:"+row.scenario.id);
  if(film.review.status!=="pass")
   errors.push("review:"+row.scenario.id+":"+film.review.hardFailures.join(","));
  if(film.story.includes("→"))errors.push("arrow_story:"+row.scenario.id);
  if(film.storyboard.some((shot,i)=>shot.sceneId!==film.conceptScenes[i]?.id||
       shot.visualAction!==film.conceptScenes[i]?.action))
   errors.push("storyboard_not_screenplay:"+row.scenario.id);
  roles.add(film.genre);
 }
 for(const cat of taxonomy.categories)for(const sub of cat.subcategories)for(const t of sub.topics){
  if(!Array.isArray(FILM_TOPIC_PROPS[t.id])||FILM_TOPIC_PROPS[t.id].length!==4)
   errors.push("missing_visual_motifs:"+t.id);
 }
 return Object.freeze({
  total:ids.size,catalogVersion:taxonomy.schemaVersion,
  locales:["ru","en","es"],narrativeStyles:[...roles],errors,
  failed:reviews.filter(x=>x.issues.length),ok:!errors.length
 });
}
