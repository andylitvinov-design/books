/** Four authored conflict films in RU/EN/ES; scene-accurate editorial actions,
 * NOT claims of matching footage, clinical outcome, or private client history. */
const f=(idea,pitch,scenes,symbol,arc)=>Object.freeze({idea,pitch,scenes:Object.freeze(scenes),symbol,arc:Object.freeze(arc)});
const source={
  "couple-conflict-s1": {
    "en": {
      "idea": "A useful pause is voluntary and includes a way to ask when talking can resume.",
      "pitch": "A couple interrupt escalating voices and choose a return time without a magical reconciliation.",
      "symbol": "A written return time",
      "arc": [
        "Escalation",
        "Pause",
        "Agreement",
        "A quieter opening"
      ],
      "scenes": [
        "At a kitchen table two adults talk over each other about an unfinished household plan. A pencil rolls away.",
        "One person moves their chair back and asks for a pause; the other puts the pen down without following.",
        "The first adult steps into another room and sets a timer. The household plan stays untouched on the table.",
        "A message asks, 'Could we return to this at seven?' The other person checks the clock before replying.",
        "A reply appears: 'Seven works.' Later, both return to the table with the same unresolved household plan.",
        "One person picks up the pencil and asks which point to discuss first. No outcome has been decided yet."
      ]
    },
    "ru": {
      "idea": "Пауза полезна, когда её можно выбрать и ясно предложить время возвращения к разговору.",
      "pitch": "Пара прерывает нарастающий спор и обсуждает время продолжения без чудесного примирения.",
      "symbol": "Записанное время возвращения",
      "arc": [
        "Нарастание",
        "Пауза",
        "Договорённость",
        "Тише начать"
      ],
      "scenes": [
        "За кухонным столом двое перебивают друг друга, споря о незавершённом плане дел. Карандаш катится на пол.",
        "Один отодвигает стул и просит паузу; другой кладёт ручку и не идёт следом через комнату.",
        "Первый выходит в другую комнату и ставит таймер. Домашний план остаётся лежать на столе.",
        "В сообщении написано: «Можем вернуться к этому в семь?» Второй проверяет время перед ответом.",
        "Приходит ответ: «В семь удобно». Позже оба садятся за стол к тому же нерешённому плану.",
        "Один поднимает карандаш и спрашивает, какой пункт обсудить первым. Решения пока нет."
      ]
    },
    "es": {
      "idea": "La pausa ayuda cuando cada persona puede elegirla y proponer cuándo hablar de nuevo.",
      "pitch": "Dos adultos detienen una discusión creciente y fijan una hora sin fingir reconciliación.",
      "symbol": "La hora de regreso escrita",
      "arc": [
        "Tensión",
        "Pausa",
        "Acuerdo",
        "Inicio más tranquilo"
      ],
      "scenes": [
        "En la mesa de la cocina dos adultos se interrumpen por un plan doméstico incompleto. Un lápiz rueda al suelo.",
        "Una persona aparta su silla y pide una pausa; la otra deja el bolígrafo sin seguirla.",
        "La primera se va a otra habitación y pone un temporizador. El plan sigue sobre la mesa.",
        "Escribe: «¿Podemos volver a hablar a las siete?» La otra persona mira el reloj antes de responder.",
        "Llega la respuesta: «A las siete está bien». Más tarde ambos vuelven a la mesa con el mismo problema.",
        "Uno recoge el lápiz y pregunta qué punto abordar primero. La decisión todavía está abierta."
      ]
    }
  },
  "couple-conflict-s2": {
    "en": {
      "idea": "Changing the shared task can matter more than choosing who wins the argument.",
      "pitch": "Two partners release a rope and work out how to move a heavy planter together.",
      "symbol": "A blue moving rope",
      "arc": [
        "Opposition",
        "Release",
        "Common question",
        "Cooperation"
      ],
      "scenes": [
        "In a courtyard two partners pull opposite ends of a blue rope around a heavy planter. It barely moves.",
        "Each pulls harder. The rope tightens, the planter begins to tip and both stop before it falls.",
        "They loosen their hands and set the rope down. One points toward a narrow gate on the other side.",
        "A rough sketch on scrap paper shows where the planter must go, not which person was right.",
        "One partner opens the gate while the other steadies the planter; they guide it through together.",
        "The planter rests by the doorway. The rope lies unused while they examine the remaining route."
      ]
    },
    "ru": {
      "idea": "Изменить общее действие иногда важнее, чем выяснить, кто победил в споре.",
      "pitch": "Двое отпускают канат и ищут способ вместе перенести тяжёлый цветочный горшок.",
      "symbol": "Синий канат",
      "arc": [
        "Противодействие",
        "Отпустить",
        "Общий вопрос",
        "Сотрудничество"
      ],
      "scenes": [
        "Во дворике двое тянут противоположные концы синего каната вокруг тяжёлого горшка. Он почти не движется.",
        "Каждый тянет сильнее. Канат натягивается, горшок начинает падать, и оба вовремя останавливаются.",
        "Они ослабляют ладони и кладут верёвку на землю. Один показывает на узкую калитку впереди.",
        "На обрывке бумаги рисуют путь горшка к нужному месту вместо спора о том, кто был прав.",
        "Один открывает калитку, второй придерживает горшок. Вместе они проводят его через проход.",
        "Горшок стоит возле входа. Канат остался на земле, а им ещё предстоит выбрать окончательное место."
      ]
    },
    "es": {
      "idea": "Cambiar una tarea compartida puede ser más útil que decidir quién ganó.",
      "pitch": "Dos personas sueltan una cuerda y encuentran cómo mover una maceta pesada juntas.",
      "symbol": "Una cuerda azul",
      "arc": [
        "Oposición",
        "Soltar",
        "Pregunta común",
        "Colaborar"
      ],
      "scenes": [
        "En un patio dos personas tiran de extremos opuestos de una cuerda azul atada a una maceta grande.",
        "Ambas tiran más fuerte. La cuerda se tensa, la maceta empieza a caer y se detienen a tiempo.",
        "Aflojan las manos y dejan la cuerda en el suelo. Una señala la puerta estrecha del patio.",
        "En un papel dibujan hacia dónde llevar la maceta, sin discutir quién estaba en lo cierto.",
        "Una persona abre la puerta; la otra sostiene la maceta. Juntas la pasan lentamente por el hueco.",
        "La maceta queda junto a la entrada. La cuerda no se usa mientras miran el camino que falta."
      ]
    }
  },
  "couple-conflict-s3": {
    "en": {
      "idea": "A specific apology recognises one's own action without demanding the other person's forgiveness.",
      "pitch": "After an argument, one adult names what they did and offers a practical repair.",
      "symbol": "A chipped ceramic mug",
      "arc": [
        "Blame",
        "Recognising",
        "Apology",
        "Repair without pressure"
      ],
      "scenes": [
        "After a quarrel a chipped mug sits on the kitchen counter. Two adults stand apart beside an unfinished meal.",
        "One opens a phone to type 'You always...' then stops and deletes the blaming sentence without sending it.",
        "They look at the mug that fell when they raised their voice and waved an arm, then set it carefully down.",
        "Facing the other person, they say, 'I shouted and knocked your mug over. I am sorry for that.'",
        "They offer to replace the mug and wipe the spill. The other person points to a towel but remains quiet.",
        "The table is clean again. Both can step away; a replacement mug has not settled the disagreement."
      ]
    },
    "ru": {
      "idea": "Конкретное извинение признаёт свой поступок, не требуя от другого немедленного прощения.",
      "pitch": "После ссоры один человек называет свою ошибку и предлагает исправление без давления.",
      "symbol": "Чашка со сколом",
      "arc": [
        "Обвинение",
        "Признание",
        "Извинение",
        "Исправление без давления"
      ],
      "scenes": [
        "После ссоры на кухонной стойке стоит чашка со сколом. Двое молчат по разные стороны ужина.",
        "Один набирает в телефоне «Ты всегда...», затем останавливается и удаляет неотправленное обвинение.",
        "Он видит чашку, упавшую, когда он повысил голос и резко махнул рукой, и осторожно ставит её.",
        "Повернувшись ко второму, он говорит: «Я накричал и сбил твою чашку. Извини за это».",
        "Он предлагает заменить чашку и вытереть пролитый чай. Второй указывает на полотенце, но молчит.",
        "Стол снова чистый. Оба могут отойти; новая чашка ещё не означает разрешённого конфликта."
      ]
    },
    "es": {
      "idea": "Una disculpa concreta reconoce el acto propio sin exigir el perdón de la otra persona.",
      "pitch": "Tras discutir, alguien reconoce una acción y ofrece repararla sin presionar.",
      "symbol": "Una taza desportillada",
      "arc": [
        "Culpa",
        "Reconocer",
        "Disculpa",
        "Reparación libre"
      ],
      "scenes": [
        "Tras una pelea una taza desportillada queda en la cocina. Dos adultos están separados junto a la cena.",
        "Uno empieza a escribir «Tú siempre...» en el móvil, se detiene y borra la frase antes de enviarla.",
        "Mira la taza caída cuando levantó la voz y movió el brazo bruscamente. La coloca con cuidado.",
        "Dice a la otra persona: «Grité y tiré tu taza. Lo siento por eso». No exige una respuesta.",
        "Ofrece reemplazar la taza y limpiar el té derramado. La otra persona señala la toalla, sin hablar.",
        "La mesa vuelve a estar limpia. Ambos pueden apartarse; otra taza no demuestra reconciliación."
      ]
    }
  },
  "couple-conflict-s4": {
    "en": {
      "idea": "Boundaries in conflict are voluntary; threats and humiliation are not ordinary disagreements.",
      "pitch": "Two adults try a pause agreement while preserving each person's right to leave.",
      "symbol": "A pause card",
      "arc": [
        "Deadlock",
        "Limits",
        "Proposed rule",
        "Respecting a stop"
      ],
      "scenes": [
        "After a tiring conversation two adults sit apart at a table with notes crossed out in different inks.",
        "One writes 'No insults or threats' on a card. The other adds 'Either person may stop the talk.'",
        "They place the card between them and mark only the terms each agrees to, without surrendering the right to leave.",
        "One suggests a pause gesture and a time to ask whether both want to continue. The other considers it.",
        "When voices rise again, one points to the card. The other stops speaking and allows space to move away.",
        "The card stays visible on the quiet table. Neither person must resume a conversation that feels unsafe."
      ]
    },
    "ru": {
      "idea": "Границы в споре возможны по согласию; угрозы и унижение не являются обычным конфликтом.",
      "pitch": "Двое обсуждают право остановить разговор, сохраняя свободу уйти.",
      "symbol": "Карточка паузы",
      "arc": [
        "Тупик",
        "Границы",
        "Предложение правила",
        "Уважить остановку"
      ],
      "scenes": [
        "После долгого разговора двое сидят за разными краями стола. Рядом лежат исписанные листы.",
        "Один пишет: «Без оскорблений и угроз». Второй добавляет: «Каждый вправе остановить разговор».",
        "Карточку кладут посередине. Оба отмечают только то, на что согласны, сохраняя право уйти.",
        "Один предлагает жест паузы и время, когда можно спросить, хотят ли оба продолжать. Второй думает.",
        "Когда голоса снова повышаются, один указывает на карточку. Другой замолкает и даёт отойти.",
        "На столе тихо. Карточка остаётся видна; никто не обязан возвращаться к небезопасному разговору."
      ]
    },
    "es": {
      "idea": "Los límites de una discusión son voluntarios; las amenazas no son una discusión normal.",
      "pitch": "Dos adultos proponen una pausa sin perder el derecho a marcharse.",
      "symbol": "La tarjeta de pausa",
      "arc": [
        "Bloqueo",
        "Límites",
        "Regla propuesta",
        "Respetar el alto"
      ],
      "scenes": [
        "Después de hablar con tensión, dos adultos se sientan separados junto a hojas llenas de tachaduras.",
        "Una persona escribe: «Sin insultos ni amenazas». La otra añade: «Cualquiera puede parar la charla».",
        "Colocan la tarjeta entre ambas y marcan solo aquello que aceptan, sin perder el derecho a salir.",
        "Una propone un gesto de pausa y una hora para preguntar si quieren continuar. La otra lo piensa.",
        "Cuando sube la voz de nuevo, una señala la tarjeta. La otra calla y deja espacio para apartarse.",
        "La tarjeta queda sobre la mesa en silencio. Nadie tiene que retomar una charla que no sea segura."
      ]
    }
  }
};
export const relationshipEditorial=Object.freeze(Object.fromEntries(
 Object.entries(source).map(([id,locales])=>[id,Object.freeze(Object.fromEntries(
 ["ru","en","es"].map(locale=>{const x=locales[locale];return [locale,f(x.idea,x.pitch,x.scenes,x.symbol,x.arc)];})
 ))])
));
