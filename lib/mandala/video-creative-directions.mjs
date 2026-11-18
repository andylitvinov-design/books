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
// Curated films for an explicitly selected anxiety topic: problem != goal.
// These scripts never diagnose the visitor or assert licensed footage exists.
const ANXIETY_STORIES=[
 {
  "id": "anxiety-quiet",
  "styleId": "cinematic",
  "keywords": [
   [
    "room",
    "window",
    "city"
   ],
   [
    "table",
    "keys",
    "hands"
   ],
   [
    "hands",
    "cup",
    "table"
   ],
   [
    "window",
    "sunlight",
    "shadow"
   ],
   [
    "door",
    "hallway",
    "walking"
   ],
   [
    "street",
    "morning",
    "walking"
   ]
  ],
  "en": {
   "title": "The Quiet Between Moments",
   "mode": "Intimate · realistic",
   "symbol": "The patch of light",
   "world": "Ordinary apartment, a small patch of sunlight, a quiet hallway and a familiar street",
   "character": "An unnamed adult in daily life; no medical explanation or invented biography",
   "idea": "Not every feeling brings an explanation. Sometimes the first change is the freedom to choose what happens next.",
   "story": "A person arrives home, puts down a bag, and hears the clock in a suddenly quiet room. There is an uneasiness they cannot name. They take their keys out of a tight fist and place them on the table. A cup of water waits nearby. Sunlight moves slowly across the floor while the world carries on outside the window. The person opens the door and takes one ordinary step into the corridor. The feeling has not magically vanished. But the next moment is theirs to choose.",
   "stages": [
    "An unnamed uneasiness",
    "A small visible pause",
    "The room keeps moving",
    "A step chosen freely"
   ],
   "shots": [
    [
     "The busy room",
     "An adult enters a quiet apartment as traffic moves outside the window.",
     "Uncertainty"
    ],
    [
     "The keys",
     "A clenched hand loosens around a keyring and sets it on a table.",
     "Pause"
    ],
    [
     "The cup",
     "Fingers rest beside a glass of water on the table.",
     "Grounding"
    ],
    [
     "Moving sunlight",
     "A square of sunlight drifts across a wall and floor.",
     "Perspective"
    ],
    [
     "The doorway",
     "The person opens an apartment door without hurrying.",
     "Choice"
    ],
    [
     "A simple step",
     "Shoes cross the threshold into a sunlit street.",
     "Open possibility"
    ]
   ]
  },
  "ru": {
   "title": "Тишина между мгновениями",
   "mode": "Камерная · реалистичная",
   "symbol": "Пятно солнечного света",
   "world": "Обычная квартира, солнечный свет на полу, тихий коридор и знакомая улица",
   "character": "Безымянный взрослый в повседневной жизни; без диагноза и выдуманной биографии",
   "idea": "Не каждое чувство приходит с объяснением. Иногда перемена начинается с возможности самому выбрать следующий шаг.",
   "story": "Человек возвращается домой, ставит сумку у двери — и слышит, как неожиданно громко тикают часы. Возникает беспокойство, которому не находится названия. Он разжимает пальцы и кладёт ключи на стол. Рядом стоит стакан воды. Солнечный свет медленно пересекает пол, за окном продолжается обычная жизнь. Человек открывает дверь и делает один шаг в коридор. Чувство не исчезает по волшебству. Но следующий миг уже не обязан быть продиктован им.",
   "stages": [
    "Тревога без объяснения",
    "Маленькая пауза",
    "Пространство вокруг",
    "Свой следующий шаг"
   ],
   "shots": [
    [
     "Тихая комната",
     "Человек входит в квартиру, за окном движется вечерний город.",
     "Неясность"
    ],
    [
     "Ключи",
     "Сжатая ладонь разжимается и кладёт связку ключей на стол.",
     "Пауза"
    ],
    [
     "Стакан воды",
     "Рука на мгновение останавливается рядом со стаканом воды.",
     "Опора"
    ],
    [
     "Солнечный свет",
     "Пятно солнечного света медленно движется по стене и полу.",
     "Перспектива"
    ],
    [
     "Дверь",
     "Человек без спешки открывает дверь квартиры.",
     "Выбор"
    ],
    [
     "Один шаг",
     "Ноги переступают порог на освещённую улицу.",
     "Возможность"
    ]
   ]
  },
  "es": {
   "title": "La calma entre instantes",
   "mode": "Íntima · realista",
   "symbol": "Un rayo de sol",
   "world": "Apartamento cotidiano, luz del sol, pasillo silencioso y una calle cercana",
   "character": "Una persona adulta sin historia clínica ni biografía inventada",
   "idea": "No todos los sentimientos traen una explicación. A veces el cambio empieza al poder elegir el siguiente paso.",
   "story": "Una persona regresa a casa, deja la bolsa y oye el reloj en una habitación demasiado silenciosa. Siente inquietud sin saber por qué. Afloja los dedos y deja las llaves sobre la mesa. Al lado espera un vaso de agua. La luz del sol avanza lentamente por el suelo mientras la vida sigue al otro lado de la ventana. La persona abre la puerta y da un paso corriente hacia el pasillo. La inquietud no desaparece por arte de magia. Pero ese instante ya admite una elección propia.",
   "stages": [
    "Inquietud sin explicación",
    "Una pausa pequeña",
    "El espacio alrededor",
    "Elegir el próximo paso"
   ],
   "shots": [
    [
     "La habitación",
     "Una persona entra en casa mientras la ciudad se mueve tras la ventana.",
     "Incertidumbre"
    ],
    [
     "Las llaves",
     "Una mano afloja las llaves y las coloca sobre la mesa.",
     "Pausa"
    ],
    [
     "El vaso",
     "Los dedos descansan junto a un vaso de agua.",
     "Apoyo"
    ],
    [
     "La luz",
     "Una franja de sol se desplaza por la pared y el suelo.",
     "Perspectiva"
    ],
    [
     "La puerta",
     "La persona abre una puerta sin apresurarse.",
     "Elección"
    ],
    [
     "Un paso",
     "Unos zapatos cruzan el umbral hacia una calle iluminada.",
     "Posibilidad"
    ]
   ]
  }
 },
 {
  "id": "anxiety-platform",
  "styleId": "cinematic",
  "keywords": [
   [
    "people",
    "train",
    "station"
   ],
   [
    "phone",
    "hands",
    "screen"
   ],
   [
    "train",
    "window",
    "reflection"
   ],
   [
    "platform",
    "bench",
    "sitting"
   ],
   [
    "sky",
    "clouds",
    "station"
   ],
   [
    "train",
    "walking",
    "station"
   ]
  ],
  "en": {
   "title": "The Train Can Wait",
   "mode": "Everyday · human",
   "symbol": "The empty bench",
   "world": "A train station, reflected windows, a platform bench and open sky",
   "character": "An anonymous traveler whose inner state is shown through ordinary actions, not labels",
   "idea": "The world can keep its pace while we take a moment to find our own.",
   "story": "A commuter stands on a crowded platform as the arriving train fills every corner with motion. Their phone glows with messages; nothing on the screen explains the sudden unease. The doors open. For once, the traveler does not rush aboard. They sit on an empty bench and watch the reflection of the last carriage slide away. Above the roof, a strip of blue sky appears between the clouds. Another train will come. The story ends not with the world becoming quiet, but with someone choosing a little time.",
   "stages": [
    "Too much motion",
    "Noticing the rush",
    "Allowing a pause",
    "An unforced decision"
   ],
   "shots": [
    [
     "The platform",
     "A commuter waits among moving people at a busy train station.",
     "Overwhelm"
    ],
    [
     "The screen",
     "Notifications light up a phone in the commuter's hands.",
     "Pressure"
    ],
    [
     "The passing train",
     "A train glides past the person's reflection in the window.",
     "Choice"
    ],
    [
     "The bench",
     "The traveler sits on a vacant platform bench.",
     "Pause"
    ],
    [
     "A strip of sky",
     "Clouds drift over the station roof and a patch of blue appears.",
     "Space"
    ],
    [
     "The next train",
     "The traveler stands calmly as a later train approaches.",
     "Agency"
    ]
   ]
  },
  "ru": {
   "title": "Поезд подождёт",
   "mode": "Повседневная · человеческая",
   "symbol": "Пустая скамейка",
   "world": "Железнодорожная платформа, отражения в окнах, скамейка и полоска неба",
   "character": "Неизвестный пассажир; переживания передаются через действия, без ярлыков",
   "idea": "Мир может спешить в своём ритме, пока мы ищем собственный.",
   "story": "На шумную платформу приходит поезд. В толпе кто-то машинально проверяет телефон: новые сообщения, привычные дела — и внезапное беспокойство, которому нет очевидной причины. Двери открываются. Но впервые пассажир не бросается внутрь. Он садится на свободную скамейку и смотрит, как в стекле проплывает последний вагон. Над крышей вокзала между облаками появляется голубая полоска неба. Будет другой поезд. Эта история не о том, как мир затих. Она о минуте, которую человек разрешил себе выбрать.",
   "stages": [
    "Слишком много движения",
    "Заметить спешку",
    "Разрешить паузу",
    "Решить без давления"
   ],
   "shots": [
    [
     "На платформе",
     "Пассажир ждёт среди движущейся толпы на станции.",
     "Перегрузка"
    ],
    [
     "Экран",
     "В ладонях загорается экран телефона с уведомлениями.",
     "Напряжение"
    ],
    [
     "Отражение",
     "Поезд проходит мимо отражения пассажира в окне.",
     "Выбор"
    ],
    [
     "Скамейка",
     "Человек садится на пустую скамейку на платформе.",
     "Пауза"
    ],
    [
     "Полоска неба",
     "Между облаками над крышей станции появляется просвет.",
     "Простор"
    ],
    [
     "Следующий поезд",
     "Человек встаёт, когда к платформе подходит следующий поезд.",
     "Самостоятельность"
    ]
   ]
  },
  "es": {
   "title": "El tren puede esperar",
   "mode": "Cotidiana · humana",
   "symbol": "El banco vacío",
   "world": "Andén, reflejos en las ventanas, banco de la estación y cielo abierto",
   "character": "Una persona viajera anónima, sin atribuirle diagnósticos ni historia privada",
   "idea": "El mundo puede seguir su ritmo mientras encontramos un momento para el nuestro.",
   "story": "Un tren llega a un andén lleno de gente. Una persona mira el móvil: mensajes de siempre, asuntos pendientes y una inquietud repentina sin motivo evidente. Se abren las puertas, pero esta vez no se apresura a entrar. Se sienta en un banco vacío y observa cómo el último vagón se desliza en el reflejo del cristal. Encima del techo de la estación aparece una franja azul entre las nubes. Llegará otro tren. La historia no termina porque el mundo se haya detenido, sino porque alguien ha elegido un pequeño intervalo.",
   "stages": [
    "Demasiado movimiento",
    "Percibir la prisa",
    "Permitir una pausa",
    "Decidir sin presión"
   ],
   "shots": [
    [
     "Andén concurrido",
     "Una persona espera entre viajeros en una estación animada.",
     "Sobrecarga"
    ],
    [
     "Pantalla",
     "El teléfono muestra notificaciones en sus manos.",
     "Presión"
    ],
    [
     "El reflejo",
     "Un tren pasa junto al reflejo de la persona en el cristal.",
     "Elección"
    ],
    [
     "El banco",
     "La persona se sienta en un banco vacío del andén.",
     "Pausa"
    ],
    [
     "El cielo",
     "Un claro azul aparece entre nubes sobre la estación.",
     "Espacio"
    ],
    [
     "Otro tren",
     "La persona se levanta al acercarse un tren posterior.",
     "Autonomía"
    ]
   ]
  }
 },
 {
  "id": "anxiety-lamp",
  "styleId": "symbolic",
  "keywords": [
   [
    "desk",
    "lamp",
    "night"
   ],
   [
    "notebook",
    "pen",
    "hands"
   ],
   [
    "lamp",
    "light",
    "table"
   ],
   [
    "curtain",
    "window",
    "night"
   ],
   [
    "notebook",
    "page",
    "hands"
   ],
   [
    "window",
    "sunrise",
    "morning"
   ]
  ],
  "en": {
   "title": "A Light Left On",
   "mode": "Poetic · gentle",
   "symbol": "A small lamp",
   "world": "A desk at night, notebook, amber lamp and the first light of morning",
   "character": "An unnamed person; the light is a metaphor for attention, not a cure",
   "idea": "We do not have to solve the whole darkness to notice one light that is already here.",
   "story": "Night settles over a desk. A notebook lies open, its page covered with unfinished lines. A person tries to write down what is wrong but stops: there is no clear answer. Instead of filling every blank, they switch on a small lamp. Its light rests on the page, the pencil, and a pair of ordinary hands. Outside, the wind moves a curtain. The person closes the notebook without a conclusion. When morning light reaches the window, the lamp is still there: not a solution to every worry, simply a sign that a gentler next moment is possible.",
   "stages": [
    "Searching for an answer",
    "Allowing the unknown",
    "A smaller circle of light",
    "An open morning"
   ],
   "shots": [
    [
     "After dark",
     "A small desk and lamp stand beside a dark window.",
     "Uncertainty"
    ],
    [
     "Unfinished notes",
     "A hand pauses over an open notebook with incomplete lines.",
     "Searching"
    ],
    [
     "The switch",
     "Fingers turn on a warm table lamp.",
     "A point of light"
    ],
    [
     "The curtain",
     "A curtain moves softly beside the window.",
     "Breathing room"
    ],
    [
     "Closing the book",
     "Hands close the notebook without tearing any pages.",
     "Acceptance"
    ],
    [
     "Morning",
     "Dawn lights the desk and the little lamp beside it.",
     "Quiet possibility"
    ]
   ]
  },
  "ru": {
   "title": "Свет, который остаётся",
   "mode": "Поэтическая · мягкая",
   "symbol": "Небольшая лампа",
   "world": "Рабочий стол ночью, тетрадь, тёплый свет лампы и раннее утро",
   "character": "Неизвестный человек; свет — метафора внимания, а не обещание исцеления",
   "idea": "Чтобы заметить один живой огонёк, не обязательно сначала объяснить всю темноту.",
   "story": "Ночь опускается на письменный стол. В открытой тетради — начатые и оборванные строки. Человек пытается записать, что с ним не так, но слов для этого нет. Вместо того чтобы заполнять пустоту ответами, он зажигает небольшую лампу. Тёплый свет ложится на страницу, карандаш и обыкновенные руки. За окном ветер шевелит занавеску. Тетрадь закрывается без вывода. К утру комната становится светлее. Лампа остаётся на месте — не как решение всех тревог, а как знак, что следующее мгновение может быть мягче.",
   "stages": [
    "Искать объяснение",
    "Оставить место неизвестному",
    "Маленький круг света",
    "Утро без обязательного ответа"
   ],
   "shots": [
    [
     "После заката",
     "Письменный стол с лампой стоит рядом с тёмным окном.",
     "Неопределённость"
    ],
    [
     "Незаконченные строки",
     "Рука замирает над тетрадью с незавершёнными строками.",
     "Поиск"
    ],
    [
     "Выключатель",
     "Пальцы включают настольную лампу с тёплым светом.",
     "Опора"
    ],
    [
     "Занавеска",
     "Лёгкая занавеска двигается у окна.",
     "Пространство"
    ],
    [
     "Закрытая тетрадь",
     "Ладони бережно закрывают тетрадь, не вырывая страниц.",
     "Принятие"
    ],
    [
     "Наступает утро",
     "Рассвет освещает стол и маленькую лампу рядом.",
     "Возможность"
    ]
   ]
  },
  "es": {
   "title": "Una luz encendida",
   "mode": "Poética · suave",
   "symbol": "Una lámpara pequeña",
   "world": "Escritorio de noche, cuaderno, lámpara cálida y primeras luces del día",
   "character": "Una persona sin biografía atribuida; la luz es una metáfora, no una cura",
   "idea": "No hace falta explicar toda la oscuridad para descubrir una pequeña luz que ya está aquí.",
   "story": "La noche cae sobre un escritorio. En el cuaderno abierto hay frases empezadas y abandonadas. Una persona intenta escribir qué sucede, pero no encuentra respuesta. En lugar de llenar el vacío con explicaciones, enciende una lámpara pequeña. La luz cae sobre la página, el lápiz y unas manos corrientes. Fuera, el viento mueve una cortina. La persona cierra el cuaderno sin conclusión. Al amanecer la habitación se vuelve más luminosa. La lámpara sigue ahí: no es la solución de todas las inquietudes, solo la posibilidad de un instante más amable.",
   "stages": [
    "Buscar una explicación",
    "Dejar sitio a lo desconocido",
    "Un círculo de luz",
    "Una mañana abierta"
   ],
   "shots": [
    [
     "Anochece",
     "Un escritorio con una lámpara junto a una ventana oscura.",
     "Incertidumbre"
    ],
    [
     "Frases inacabadas",
     "Una mano se detiene sobre un cuaderno abierto.",
     "Búsqueda"
    ],
    [
     "La lámpara",
     "Los dedos encienden una lámpara de mesa cálida.",
     "Apoyo"
    ],
    [
     "La cortina",
     "Una cortina se mueve junto a la ventana.",
     "Espacio"
    ],
    [
     "Cerrar el cuaderno",
     "Las manos cierran suavemente el cuaderno.",
     "Aceptación"
    ],
    [
     "Amanecer",
     "La luz de la mañana ilumina la mesa y la lámpara.",
     "Posibilidad"
    ]
   ]
  }
 }
];
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
 if(concept.topicId==="anxiety-no-reason"){
  const scenarios=listMyTubeScenarios(concept.topicId,l);
  return ANXIETY_STORIES.map((def,i)=>{
   const p=def[l];
   return {id:def.id,title:p.title,mode:p.mode,idea:p.idea,story:p.story,
    stages:[...p.stages],styleId:def.styleId,symbol:p.symbol,world:p.world,
    character:p.character,arc:[...p.stages],plotMode:"grounded_dilemma",
    storyboard:p.shots.map(([title,action,emotion],j)=>({
     title,action,emotion,keywords:[...def.keywords[j]]})),
    provenance:"curated_editorial",scenarioId:scenarios[i]?.id||concept.scenarioId};
  });
 }
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
