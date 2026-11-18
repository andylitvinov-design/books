/**
 * Converts original, scenario-specific editorial beats into filmable actions.
 * A strict concrete-action supplement for scenes 3–5; never displays catalog
 * arrow chains and never asserts that video footage has been obtained.
 */
const LANG=["ru","en","es"];
const T=(ru,en,es)=>({ru,en,es});
const D={
 contact:T([
 "Герой открывает переписку, находит незавершённое сообщение и останавливает палец над экраном, прежде чем что-либо отправлять.",
 "Человек перечитывает короткий вопрос, удаляет обвиняющую фразу и набирает одно спокойное предложение своими словами.",
 "На экране остаётся отправленное сообщение. Телефон ложится рядом, а герой не пытается заранее угадать ответ."
 ],[
 "A phone opens on an unfinished message. The person's thumb pauses above the screen before sending anything.",
 "The person rereads a short question, deletes a blaming phrase and types one calm sentence in their own words.",
 "A short message is sent. The phone is set down, with no attempt to guess how or when anyone will reply."
 ],[
 "El móvil muestra un mensaje inacabado. El dedo se detiene sobre la pantalla antes de enviarlo.",
 "La persona borra una frase acusadora y escribe una oración tranquila con sus propias palabras.",
 "El mensaje queda enviado. Deja el móvil sin intentar adivinar la respuesta."
 ]),
 money:T([
 "На стол ложатся два чека. Человек проводит карандашом под реальной суммой, отделяя её от записанного предположения.",
 "Герой раскладывает на листе расходы и доступные средства. Одно число обводится: именно его можно перепроверить.",
 "В блокноте появляется конкретный финансовый вопрос для разговора. Бумага остаётся на виду, но результат ещё не известен."
 ],[
 "Two receipts are set on a table. A pencil underlines a real amount, separating it from an imagined figure.",
 "The person sets the expenses beside the available resources and circles one number that can be checked.",
 "A single concrete money question is written in a notebook for a future conversation. The outcome is still unknown."
 ],[
 "Dos recibos quedan sobre la mesa. La persona subraya una cifra real y la separa de una suposición.",
 "Ordena gastos y recursos en una hoja y rodea un número que puede comprobar.",
 "Escribe una pregunta económica concreta para una futura conversación. Todavía no conoce el resultado."
 ]),
 map:T([
 "На столе раскрывается карта. Палец выходит за пределы маршрута, отмеченного кем-то другим, и задерживается на свободном участке.",
 "Человек поворачивает карту, замечает короткую боковую дорогу и карандашом отмечает собственную возможную остановку.",
 "Появляется одна небольшая отметка на маршруте. Герой складывает карту так, чтобы следующая часть пути оставалась открытой."
 ],[
 "A paper map opens on the table. A finger leaves somebody else's marked route and stops at an unmarked stretch.",
 "The person rotates the map, finds a short side path and pencils in one possible stop of their own.",
 "One modest waypoint now marks the route. The map folds with the next stretch still unresolved."
 ],[
 "Un mapa se abre sobre la mesa. Un dedo deja el camino trazado por otros y se detiene en una zona sin marcar.",
 "La persona gira el mapa, encuentra un sendero lateral y señala una parada posible.",
 "Ahora hay una sola marca. Dobla el mapa sin decidir todavía el resto del camino."
 ]),
 time:T([
 "Человек переворачивает страницу календаря и видит несколько занятых дней подряд. Палец останавливается у свободного промежутка.",
 "На календаре появляется небольшое окно времени. Герой осторожно передвигает одну необязательную запись, ничего не вычёркивая навсегда.",
 "Рядом с выбранным днём стоит маленькая отметка. Телефон перестаёт мигать, пока человек проверяет следующий посильный шаг."
 ],[
 "A calendar opens to a row of crowded days. The person's finger stops beside one unclaimed gap.",
 "A modest window of time appears as one optional appointment is moved rather than erased forever.",
 "A small mark stays next to the chosen day. The phone lies silent while the person considers a manageable step."
 ],[
 "El calendario muestra varios días llenos. Un dedo se detiene en un pequeño espacio libre.",
 "La persona mueve una cita opcional y deja un rato disponible sin borrar el resto del plan.",
 "Una marca queda junto al día elegido. El móvil descansa mientras considera un paso posible."
 ]),
 plan:T([
 "Герой раскладывает длинный список дел на столе. Один пункт оказывается слишком большим, чтобы поместиться на отдельной карточке.",
 "Человек делит большую задачу на три короткие строки и проводит рамку только вокруг первой, оставляя остальные на потом.",
 "Первая маленькая строка получает отметку. Список остаётся рядом — его не нужно закончить весь ради одного начала."
 ],[
 "A long task list spreads across the desk. One oversized item barely fits on the card placed beside it.",
 "The person breaks the large task into three short lines and draws a box around only the first.",
 "A small tick appears beside that first line. The larger list remains unfinished without spoiling the start."
 ],[
 "Una lista larga ocupa la mesa. Una tarea es demasiado grande para la tarjeta que tiene al lado.",
 "La persona divide esa tarea en tres líneas breves y rodea solamente la primera.",
 "Aparece una marca junto a ese primer paso. El resto de la lista sigue pendiente, sin borrar lo avanzado."
 ]),
 support:T([
 "Рядом появляется второй стул. Человек сдвигает его ближе, но оставляет достаточно пространства, чтобы другой мог сам выбрать место.",
 "Одна пара рук удерживает лист, пока другая помогает расправить угол. Движение получается лишь благодаря простому сотрудничеству.",
 "Две руки убирают со стола по одному предмету. Человек благодарно кивает, не превращая помощь в обязанность для другого."
 ],[
 "A second chair is drawn closer, with enough space left for the other person to choose where to sit.",
 "One pair of hands holds a sheet steady while another smooths its curled corner. A small task becomes shared.",
 "Both people clear one object from the table. One nods in thanks without turning the help into a demand."
 ],[
 "Acercan una segunda silla, pero dejan espacio suficiente para elegir dónde sentarse.",
 "Una mano sujeta el papel mientras otra alisa una esquina. Una tarea pequeña se vuelve compartida.",
 "Cada persona retira un objeto de la mesa. Llega un gesto de agradecimiento sin convertir la ayuda en obligación."
 ]),
 boundary:T([
 "Человек замечает, как одна папка заняла весь стол. Он проводит между двумя стопками простую карандашную черту.",
 "Герой возвращает одну вещь на своё место и произносит вслух короткое правило для себя, не обращая его против других.",
 "На столе остаются два отдельных пространства. Человек придвигает своё кресло к выбранной стороне и спокойно делает паузу."
 ],[
 "The person notices one folder covering the whole table and draws a plain pencil line between two piles.",
 "One object is returned to its place. The person quietly rehearses a limit meant for themselves, not as a threat.",
 "Two separate spaces remain on the table. The chair is moved toward the chosen side, leaving time to pause."
 ],[
 "Una carpeta ocupa toda la mesa. La persona dibuja una línea sencilla entre dos montones.",
 "Devuelve un objeto a su lugar y ensaya un límite breve, sin usarlo contra nadie.",
 "Quedan dos espacios diferenciados. Acerca su silla al lado elegido y hace una pausa."
 ]),
 practice:T([
 "Человек раскрывает альбом на странице с неровной первой попыткой. Вместо нового листа он поднимает оставшийся карандаш.",
 "Медленно повторяется одно небольшое движение. Второй след остаётся рядом с первым — не идеальный, но заметно другой.",
 "На странице появляется третья короткая линия. Герой закрывает колпачок и рассматривает три попытки, не стирая ни одну."
 ],[
 "The notebook opens to an uneven first attempt. Instead of turning to a clean page, the person picks up the pencil.",
 "One small movement is repeated more slowly. A second mark stays beside the first—imperfect, but different.",
 "A third short line appears. The pencil is set down and all three attempts remain visible without erasing."
 ],[
 "El cuaderno se abre por un primer intento imperfecto. En vez de pasar de página, toma el lápiz.",
 "Repite un movimiento pequeño más despacio. La segunda marca queda junto a la primera, distinta aunque imperfecta.",
 "Aparece una tercera línea. Deja el lápiz y observa los tres intentos sin borrarlos."
 ]),
 object:T([
 "Герой подносит памятный предмет ближе к окну. В боковом свете становятся заметны следы времени, которых он раньше не видел.",
 "Вещь осторожно перемещается со старого места на полку. Рядом остаётся место и для других важных предметов.",
 "Человек закрывает коробку и ставит её там, где можно вернуться к воспоминанию добровольно, а не по требованию."
 ],[
 "A keepsake is held closer to the window. Side light reveals the small traces of time that were not visible before.",
 "The object is moved carefully from its old position to a shelf, leaving space beside it for other things.",
 "The box is closed and placed where the memory can be revisited by choice, rather than on command."
 ],[
 "Acerca un recuerdo a la ventana. La luz lateral muestra marcas del tiempo antes invisibles.",
 "Coloca el objeto en otro estante, dejando espacio para más cosas importantes.",
 "Cierra la caja y la deja donde se puede volver al recuerdo por elección, no por obligación."
 ]),
 nature:T([
 "Человек замечает маленький лист растения, наклонившийся к свету. Он передвигает горшок, не ломая стебель.",
 "На земле рядом с растением появляется свободное место. Герой убирает лишний камешек и осторожно расправляет почву.",
 "Растение остаётся незавершённым живым процессом. В кадре видны руки, пустая лейка и место для дальнейшего роста."
 ],[
 "A small leaf bends toward the light. The person moves the pot without forcing its delicate stem.",
 "A little space appears around the plant as a stone is lifted away and the soil gently loosened.",
 "The growing plant remains unfinished. The frame holds resting hands, an empty watering can and room for new growth."
 ],[
 "Una hoja pequeña se inclina hacia la luz. Mueve la maceta sin forzar el tallo.",
 "Retira una piedra y afloja la tierra con cuidado, dejando espacio alrededor de la planta.",
 "La planta sigue creciendo a su ritmo. Quedan unas manos quietas, una regadera vacía y espacio para crecer."
 ]),
 body:T([
 "Человек замечает сжатые пальцы на краю стола и медленно разжимает ладонь, не пытаясь заставить себя расслабиться.",
 "Стопы находят удобное положение на полу. Герой переставляет стул так, чтобы можно было сидеть без напряжённой позы.",
 "Руки остаются на коленях на несколько мгновений. Человек смотрит на предмет перед собой, не оценивая ощущения."
 ],[
 "Tight fingers are noticed on the edge of the table. The hand slowly opens without forcing the body to relax.",
 "Feet find a comfortable place on the floor and the chair moves slightly into a less demanding position.",
 "Hands rest on the knees for a moment. The person looks at an object in the room without judging the sensation."
 ],[
 "Observa los dedos tensos al borde de la mesa. Abre la mano despacio sin forzar la relajación.",
 "Busca un apoyo cómodo para los pies y mueve un poco la silla.",
 "Las manos descansan sobre las rodillas. Mira un objeto cercano sin juzgar lo que siente."
 ]),
 choice:T([
 "Человек берёт две карточки с разными вариантами и ставит их рядом. Ни один ещё не зачёркнут.",
 "Герой поворачивает карточки и пишет с обратной стороны по одному реальному последствию каждого решения.",
 "Одна карточка остаётся ближе к руке. Человек проверяет маленький шаг, сохраняя право вернуться и изменить выбор."
 ],[
 "Two cards carrying different options are laid side by side. Neither has been crossed out yet.",
 "The person turns them over and writes one realistic consequence behind each possible choice.",
 "One card stays closer to the hand. A small step is tested with room to reconsider later."
 ],[
 "Pone dos tarjetas con opciones distintas una junto a otra. No tacha ninguna.",
 "Les da la vuelta y escribe una consecuencia realista detrás de cada decisión.",
 "Una tarjeta queda más cerca de la mano. Prueba un paso pequeño con libertad para reconsiderar."
 ]),
 pause:T([
 "Человек замечает, что всё время смотрел на часы. Стрелка продолжает движение, но рука больше не тянется к новой задаче.",
 "На столе закрывается ноутбук. В наступившей тишине герой переставляет чашку ближе и освобождает себе немного места.",
 "Пауза продолжается без отчёта о продуктивности. Часы остаются в кадре рядом со спокойной рукой."
 ],[
 "The person notices how long they have watched the clock. It keeps moving, but the hand stops reaching for another task.",
 "A laptop closes on the table. In the quiet that follows, a cup is moved closer and some space is cleared.",
 "The pause continues without a productivity score. The clock remains in frame beside a resting hand."
 ],[
 "Se da cuenta de cuánto ha mirado el reloj. El tiempo sigue, pero la mano deja de buscar otra tarea.",
 "Cierra el portátil. En el silencio acerca una taza y despeja un poco de espacio.",
 "La pausa continúa sin notas de productividad. El reloj queda en el plano junto a una mano descansando."
 ])
};
const SPECIAL={
 trauma:T([
 "Человек кладёт закрытую коробку на стол. Он не открывает её и может просто отодвинуть подальше, если сейчас не хочется вспоминать.",
 "Рядом появляется карточка с именем надёжного человека. Герой выбирает оставить коробку закрытой и заняться настоящим днём.",
 "Карточка поддержки остаётся рядом с лампой. Человек отодвигает коробку и свободно выходит из комнаты, не обязанный ничего вспоминать."
 ],[
 "A closed keepsake box is set down. The person does not open it and may move it farther away if remembering feels unwelcome.",
 "A trusted contact card is placed beside the box. The person chooses to keep the lid closed and return to the present day.",
 "The support card remains near a small lamp. The person moves the unopened box aside and reaches for a glass of water."
 ],[
 "Coloca sobre la mesa una caja cerrada. No tiene que abrirla y puede alejarla si no quiere recordar nada.",
 "Deja cerca una tarjeta con un contacto de confianza. La caja permanece cerrada mientras vuelve al presente.",
 "La tarjeta de apoyo queda junto a una lámpara. Aparta la caja sin abrirla ni revivir ningún recuerdo."
 ]),
 anxiety:T([
 "Герой замечает знакомый предмет на столе и спокойно рассматривает его форму. Камера остаётся в безопасной, привычной комнате.",
 "Человек записывает на листе вопрос, на который пока нет ответа, и откладывает ручку без требования срочно всё объяснить.",
 "Рядом с ладонью лежит карточка надёжного человека, которому можно позвонить. Герой решает, нужен ли сейчас разговор."
 ],[
 "A familiar object on the table comes into focus. The camera stays in an ordinary, known room rather than showing a threatening scene.",
 "A question without an immediate answer is written on a small card. The person puts the pencil down and allows the uncertainty to remain.",
 "A trusted contact card stays within reach. The person considers whether to make a call, with their feet still resting on the floor."
 ],[
 "Observa la forma de un objeto familiar. La cámara permanece en una habitación conocida, sin imágenes amenazantes.",
 "Escribe una pregunta sin respuesta inmediata y deja el lápiz sin exigirse una explicación.",
 "Una tarjeta con un contacto de confianza queda al alcance. La persona decide si quiere hacer una llamada."
 ]),
 lowmood:T([
 "На столе остаётся привычная вещь, которая сегодня почти не вызывает отклика. Герой просто замечает её, не заставляя себя радоваться.",
 "Человек выбирает один нейтральный жест заботы: придвигает чашку и освобождает рядом немного места.",
 "В финале на столе лежит карточка поддержки. Человек сидит рядом с чашкой, не изображая обязательную радость."
 ],[
 "A familiar object offers little response today. The person notices it without making a performance of feeling better.",
 "One neutral act of care becomes visible: a cup is moved nearer and a little space is cleared.",
 "A support contact card rests on the table. The person sits beside the cup, without performing a smile for the camera."
 ],[
 "Un objeto conocido despierta poca reacción. La persona lo observa sin fingir alegría.",
 "Hace un gesto sencillo de cuidado: acerca la taza y despeja un espacio pequeño.",
 "Una tarjeta de apoyo queda sobre la mesa. La persona se sienta junto a la taza sin forzarse a sonreír."
 ])
};
const RULES=[
 ["contact",/message|reply|phone|call|email|invitation|conversation|spea(?:k|king)|communicat|listening|contact|talk|dialogue|saying|sentence|questions?/i],
 ["money",/money|cash|income|budget|payment|spending|price|salary|cost|financial|receipt|save|saving|value of work|numbers|profit/i],
 ["map",/map|path|route|bridge|lighthouse|road|shore|journey|compass|travel|direction|crossing/i],
 ["time",/calendar|schedule|hour|minute|time|routine|daily|rhythm|morning|evening/i],
 ["plan",/task|plan|list|priority|goal|step|milestone|project|deadline|measure|manage|done/i],
 ["support",/support|help|friend|team|together|companion|group|circle|shared|colleague|mentor/i],
 ["boundary",/boundary|boundaries|limit|space|distance|consent|permission|independence|separat|respect/i],
 ["practice",/practice|skill|learn|try|attempt|draw|write|pencil|workshop|experiment|prototype|rehears/i],
 ["object",/memory|memories|photograph|photo|past|remember|keep|box|letter|childhood|old/i],
 ["nature",/garden|plant|tree|seed|flower|forest|water|river|wave|nature|growth/i],
 ["body",/body|breath|hands|muscle|floor|feet|tension|sensations|panic|fear|feeling|ground/i],
 ["choice",/decision|choose|option|alternative|different|reframe|perspective|view|compare|true|question/i],
 ["pause",/rest|pause|slow|quiet|calm|stop|relax|stillness|peace|care|comfort/i]
];
export function classifyFilmBeat(englishBeat=""){
 const text=String(englishBeat);
 return RULES.find(([,rx])=>rx.test(text))?.[0]||"choice";
}
export function filmedBeatAction(englishBeat="",locale="en",phase=2,subcategoryId="",visualProp=""){
 const guarded={
  "psychological-trauma":"trauma",
  "anxiety-fears":"anxiety",
  "depression-apathy":"lowmood"
 }[subcategoryId];
 const type=guarded||classifyFilmBeat(englishBeat);
 const index=phase<=2?0:phase===3?1:2;
 const l=LANG.includes(locale)?locale:"en";
 const core=(SPECIAL[type]||D[type])[l][index];
 // The turning point must visibly reuse this film's unique central object,
 // even if two unrelated catalog beats share a high-level action category.
 const cue=phase===3&&visualProp?({
  ru:" В том же кадре остаётся узнаваемая деталь: ",
  en:" The central object remains visible beside the action: ",
  es:" El objeto central sigue visible junto a la acción: "
 })[l]+String(visualProp).trim()+".":"";
 return {type,action:core+cue};
}
