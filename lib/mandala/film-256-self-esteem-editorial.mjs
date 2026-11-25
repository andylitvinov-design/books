/** Individually authored low-self-esteem films (RU/EN/ES, 6 x 5s).
 * An editorial representation, never claims about users or matched footage. */
const film=(idea,pitch,scenes,symbol,arc)=>Object.freeze({idea,pitch,scenes:Object.freeze(scenes),symbol,arc:Object.freeze(arc)});
const authored={
  "low-self-esteem-s1": {
    "en": {
      "idea": "A cruel thought written in large letters is still a thought, not a verified account of a person's work.",
      "pitch": "A designer compares a harsh label with one completed piece of evidence and writes a fairer sentence.",
      "symbol": "A glass board with labels",
      "arc": [
        "Judgment",
        "Evidence",
        "Fairer words",
        "Unfinished respect"
      ],
      "scenes": [
        "In a small design studio, a glass board reads 'You always fail' above a folder of completed sketches.",
        "The designer lifts a marker to underline the accusation but finds a dated client thank-you note inside the folder.",
        "They place the note beside the words on the glass and compare the specific project with the sweeping claim.",
        "The words 'always fail' are wiped away. The designer writes, 'One draft needed revisions; another was completed.'",
        "They photograph the factual sentence for later and put the client note back, without pretending every project succeeded.",
        "The board remains half clean beside unfinished sketches. The designer returns to work without assigning a final grade."
      ]
    },
    "ru": {
      "idea": "Жёсткая мысль крупными буквами остаётся мыслью, а не проверенным итогом всей человеческой работы.",
      "pitch": "Дизайнер сравнивает суровую оценку с конкретным фактом и формулирует более точную мысль.",
      "symbol": "Стеклянная доска с надписью",
      "arc": [
        "Осуждение",
        "Факт",
        "Точные слова",
        "Открытая работа"
      ],
      "scenes": [
        "В мастерской на стеклянной доске написано «Ты всегда проваливаешься». Под ней лежит папка эскизов.",
        "Дизайнер берёт маркер, чтобы подчеркнуть обвинение, но замечает в папке датированную благодарность клиента.",
        "Благодарность кладут рядом с надписью и сравнивают реальный законченный заказ с общим категоричным утверждением.",
        "Фразу «всегда проваливаешься» стирают. Вместо неё появляется: «Один эскиз переделал, другой заказ завершил».",
        "Дизайнер фотографирует точную фразу на память и возвращает письмо в папку, не скрывая неудачные попытки.",
        "Половина доски остаётся чистой. Рядом лежит незаконченная работа; окончательную оценку себе никто не ставит."
      ]
    },
    "es": {
      "idea": "Un pensamiento cruel escrito en grande sigue siendo un pensamiento, no un resumen probado de una vida.",
      "pitch": "Una diseñadora compara una etiqueta dura con un trabajo concreto y busca palabras más precisas.",
      "symbol": "Una pizarra de cristal",
      "arc": [
        "Juicio",
        "Prueba",
        "Palabras justas",
        "Trabajo abierto"
      ],
      "scenes": [
        "En un pequeño estudio una pizarra dice «Siempre fracasas» sobre una carpeta de bocetos ya realizados.",
        "La diseñadora coge un rotulador, pero encuentra una nota de agradecimiento fechada dentro de la carpeta.",
        "Coloca la nota junto a la frase y compara un proyecto terminado con aquella afirmación absoluta.",
        "Borra «Siempre fracasas». Escribe: «Un dibujo necesitó cambios; otro encargo quedó terminado».",
        "Fotografía la frase concreta y guarda la nota del cliente, sin fingir que todo su trabajo salió bien.",
        "La pizarra queda medio limpia junto a bocetos incompletos. Vuelve a trabajar sin ponerse una nota final."
      ]
    }
  },
  "low-self-esteem-s2": {
    "en": {
      "idea": "Quiet work remains real even when it has not received applause or public recognition.",
      "pitch": "An event volunteer documents modest efforts that held a community meeting together.",
      "symbol": "A creased backstage checklist",
      "arc": [
        "Invisible work",
        "Evidence",
        "Recognition",
        "A modest record"
      ],
      "scenes": [
        "After a small community meeting, a volunteer gathers unused chairs while the audience applauds speakers in another room.",
        "On a creased checklist, tasks like arranging access signs and preparing water remain unticked despite being finished.",
        "The volunteer walks the empty hall and photographs the ramp sign, filled water jug and orderly rows of chairs.",
        "They place three dated photographs beside the checklist and mark each completed task without adding invented achievements.",
        "A colleague asks who organised the entrance. The volunteer points to the checklist and answers with one plain sentence.",
        "The hall is empty and still needs cleaning. The checklist now records the work that happened, applause or not."
      ]
    },
    "ru": {
      "idea": "Тихая работа остаётся настоящей, даже когда её никто не замечает и не сопровождает аплодисментами.",
      "pitch": "Волонтёр фиксирует конкретные действия, благодаря которым прошла встреча жителей.",
      "symbol": "Помятый список дел за сценой",
      "arc": [
        "Невидимый труд",
        "Факты",
        "Признание",
        "Скромный результат"
      ],
      "scenes": [
        "После встречи жителей волонтёр складывает стулья, пока в соседней комнате аплодируют выступавшим.",
        "В помятом списке дела «поставить указатели» и «приготовить воду» почему-то остались без галочек.",
        "Волонтёр проходит по залу и фотографирует указатель доступного входа, кувшин воды и ровные ряды стульев.",
        "Три фотографии кладут рядом со списком и отмечают только действительно сделанные пункты.",
        "Коллега спрашивает, кто организовал вход. Волонтёр показывает список и спокойно отвечает одним предложением.",
        "Зал пуст, уборка ещё впереди. Список теперь показывает выполненную работу без требования аплодисментов."
      ]
    },
    "es": {
      "idea": "Un trabajo discreto sigue contando aunque nadie lo aplauda ni lo mencione en público.",
      "pitch": "Una voluntaria registra pequeños esfuerzos que permitieron realizar una reunión vecinal.",
      "symbol": "Una lista arrugada tras el escenario",
      "arc": [
        "Trabajo invisible",
        "Pruebas",
        "Reconocer",
        "Registro modesto"
      ],
      "scenes": [
        "Tras una reunión vecinal una voluntaria recoge sillas mientras se oyen aplausos para ponentes en otra sala.",
        "En una lista arrugada, colocar señales de acceso y preparar agua siguen sin marcar aunque ya están hechos.",
        "La voluntaria fotografía la señal de entrada, una jarra llena y las filas de sillas del salón.",
        "Pone tres fotos fechadas junto a la lista y marca las tareas terminadas sin inventar más logros.",
        "Una compañera pregunta quién organizó la entrada. La voluntaria señala la lista y responde con tranquilidad.",
        "La sala está vacía y aún queda limpieza. La lista registra el trabajo real aunque no hubo aplausos."
      ]
    }
  },
  "low-self-esteem-s3": {
    "en": {
      "idea": "Comparing a finished display to an unfinished practice can hide the steps that every craft requires.",
      "pitch": "An illustrator stops grading their first draft against a shop window and returns to one meaningful next attempt.",
      "symbol": "A worn sketchbook beside a shop window",
      "arc": [
        "Comparison",
        "Hidden work",
        "Shift of view",
        "Practice"
      ],
      "scenes": [
        "Outside a gallery, an illustrator studies polished drawings in the window, hiding their own dog-eared sketchbook.",
        "They open the book to a rough street scene and quickly close it as visitors pass the bright display.",
        "A worker inside the gallery turns a framed picture over, revealing trial sketches and pencil marks on the back.",
        "The illustrator sits on a nearby bench and sketches the same street corner again, keeping the first attempt visible.",
        "Two versions lie side by side. They circle one improved line instead of ranking the whole person against the gallery.",
        "The window still shines behind them. The sketchbook stays open on the bench for another ordinary practice session."
      ]
    },
    "ru": {
      "idea": "Сравнение готовой витрины с собственной незаконченной работой скрывает путь, который проходит любой мастер.",
      "pitch": "Иллюстратор перестаёт оценивать себя по чужой выставке и возвращается к следующей конкретной попытке.",
      "symbol": "Потрёпанный блокнот у витрины",
      "arc": [
        "Сравнение",
        "Невидимые усилия",
        "Другой взгляд",
        "Практика"
      ],
      "scenes": [
        "У галереи иллюстратор рассматривает идеальные рисунки в витрине, пряча за спиной потрёпанный альбом.",
        "Он открывает неровный набросок улицы и быстро закрывает его, когда мимо проходят зрители.",
        "Работник галереи переворачивает одну раму; на обороте видны пробы линий и карандашные пометки.",
        "Иллюстратор садится на скамью неподалёку и снова рисует тот же угол улицы, сохраняя первый вариант.",
        "Два рисунка лежат рядом. Карандаш обводит одну удачную линию, не выставляя оценку человеку целиком.",
        "Витрина по-прежнему блестит за спиной. Альбом остаётся открытым для следующей обычной попытки."
      ]
    },
    "es": {
      "idea": "Comparar una obra terminada con un ensayo propio oculta el proceso que requiere cualquier oficio.",
      "pitch": "Una ilustradora deja de juzgarse por una vitrina y vuelve a intentar un dibujo concreto.",
      "symbol": "Un cuaderno gastado junto a un escaparate",
      "arc": [
        "Comparación",
        "Trabajo oculto",
        "Otro ángulo",
        "Práctica"
      ],
      "scenes": [
        "Ante una galería una ilustradora mira dibujos perfectos en la vitrina y esconde su cuaderno gastado.",
        "Abre un boceto torcido de una calle y lo cierra deprisa cuando pasan visitantes ante la exposición.",
        "Alguien dentro de la galería gira un cuadro y deja ver pruebas a lápiz en la parte trasera.",
        "La ilustradora se sienta en un banco y dibuja otra vez la misma esquina, conservando el primer intento.",
        "Los dos dibujos quedan juntos. Rodea una línea mejorada sin convertirlo en una nota sobre su propio valor.",
        "La vitrina sigue brillando detrás. El cuaderno queda abierto para otro rato normal de práctica."
      ]
    }
  },
  "low-self-esteem-s4": {
    "en": {
      "idea": "A person's dignity need not rise or fall with numbers assigned by an audience or a single performance.",
      "pitch": "A volunteer removes a public scorecard from their shirt and chooses what feedback is actually useful.",
      "symbol": "A removable numbered badge",
      "arc": [
        "Scoring",
        "Questioning",
        "Choice",
        "Dignity"
      ],
      "scenes": [
        "At an amateur talent rehearsal, a volunteer wears a paper badge with a large score while setting out chairs.",
        "Someone adjusts the number after a mistake. The volunteer looks at the badge rather than at the task.",
        "They unclip the badge, place it beside a chair and read the practical feedback written on its back.",
        "On another card they write, 'Move the microphone closer.' The numerical score stays on the table.",
        "They fix the microphone stand and ask a colleague if it is easier to hear; the colleague checks the sound.",
        "The rehearsal continues without a number on anyone's chest. The badge remains removable, not a verdict."
      ]
    },
    "ru": {
      "idea": "Человеческое достоинство не обязано меняться вместе с цифрами, которые поставили за выступление.",
      "pitch": "Волонтёр снимает оценочный бейдж и выбирает полезную конкретную обратную связь.",
      "symbol": "Съёмный бейдж с цифрой",
      "arc": [
        "Оценка",
        "Сомнение",
        "Выбор",
        "Достоинство"
      ],
      "scenes": [
        "На любительской репетиции волонтёр расставляет стулья с бумажным бейджем, на котором крупно написана оценка.",
        "После ошибки кто-то меняет цифру. Волонтёр смотрит не на работу, а только на бейдж.",
        "Он отстёгивает бейдж, кладёт его на стул и читает практическое замечание на обороте.",
        "На новой карточке появляется фраза: «Подвинуть микрофон ближе». Цифра остаётся лежать на столе.",
        "Человек поправляет стойку и спрашивает коллегу, стало ли лучше слышно. Тот проверяет звук.",
        "Репетиция продолжается без оценки на груди. Бейдж остаётся съёмным, а не приговором человеку."
      ]
    },
    "es": {
      "idea": "La dignidad personal no sube ni baja con una cifra puesta por el público o una sola actuación.",
      "pitch": "Una voluntaria se quita la nota del pecho y elige un comentario útil sobre su trabajo.",
      "symbol": "Una insignia con número",
      "arc": [
        "Puntuación",
        "Preguntar",
        "Elegir",
        "Dignidad"
      ],
      "scenes": [
        "En un ensayo comunitario una voluntaria coloca sillas llevando una insignia de papel con una cifra grande.",
        "Alguien cambia el número tras un error. Ella empieza a mirar la insignia en vez de la tarea.",
        "Se quita la insignia, la deja sobre una silla y lee la observación práctica del reverso.",
        "En otra tarjeta escribe «Acercar el micrófono». El número anterior se queda sobre la mesa.",
        "Ajusta el soporte y pregunta a una compañera si se escucha mejor. La compañera comprueba el sonido.",
        "El ensayo continúa sin cifras en el pecho. La insignia es desmontable y no determina la dignidad."
      ]
    }
  }
};
export const selfEsteemEditorial=Object.freeze(Object.fromEntries(
 Object.entries(authored).map(([id,localized])=>[id,Object.freeze(Object.fromEntries(
 ["ru","en","es"].map(locale=>{const x=localized[locale];return [locale,film(x.idea,x.pitch,x.scenes,x.symbol,x.arc)];})
 ))])
));
