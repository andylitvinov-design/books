/** Individually authored self-acceptance films (RU,EN,ES; six 5s beats).
 * Fictional non-coercive actions, no real footage/licence/clinical validation. */
const film=(idea,pitch,scenes,symbol,arc)=>Object.freeze({idea,pitch,scenes:Object.freeze(scenes),symbol,arc:Object.freeze(arc)});
const authored={
  "self-acceptance-s1": {
    "en": {
      "idea": "A living garden is not improved by forcing every plant to have the same shape.",
      "pitch": "A volunteer stops correcting crooked stems and starts noticing where each plant can grow.",
      "symbol": "Three mismatched plant labels",
      "arc": [
        "Inspection",
        "Difference",
        "Adjustment",
        "Room to grow"
      ],
      "scenes": [
        "In a community garden, a volunteer aligns three flowerpots with a ruler and straightens their uneven stems.",
        "A tall seedling droops under the shelf while a small one reaches toward the morning light.",
        "The volunteer removes the ruler, turns a pot and notices different care notes on three faded labels.",
        "They move the shade-loving pot back from the window and bring the sun-loving plant closer to the light.",
        "Instead of trimming the crooked stem, the volunteer writes a new label showing its actual needs.",
        "The ruler lies unused near three differently placed pots. Each grows in its own direction; none is finished."
      ]
    },
    "ru": {
      "idea": "Живой сад не становится лучше от требования, чтобы все растения были одинаковыми.",
      "pitch": "Человек перестаёт выравнивать стебли и начинает замечать потребности каждого растения.",
      "symbol": "Три разные бирки для растений",
      "arc": [
        "Проверка",
        "Различия",
        "Уход",
        "Место для роста"
      ],
      "scenes": [
        "В общественном саду волонтёр выстраивает три горшка по линейке и пытается расправить неровные стебли.",
        "Высокий росток поникает под полкой, а маленький тянется к утреннему свету у окна.",
        "Человек убирает линейку и разворачивает горшки. На старых бирках написаны разные условия ухода.",
        "Тенелюбивое растение отодвигают от окна, а светолюбивое осторожно ставят ближе к солнцу.",
        "Вместо обрезания изогнутого стебля волонтёр подписывает новую бирку с его реальными потребностями.",
        "Линейка лежит без дела. Три горшка стоят по-разному, и растения продолжают расти своим способом."
      ]
    },
    "es": {
      "idea": "Un jardín vivo no necesita que todas las plantas crezcan con la misma forma.",
      "pitch": "Una persona deja de enderezar cada tallo y observa qué necesita cada planta.",
      "symbol": "Tres etiquetas distintas",
      "arc": [
        "Inspección",
        "Diferencia",
        "Cuidado",
        "Espacio"
      ],
      "scenes": [
        "En un huerto comunitario, una voluntaria alinea tres macetas con una regla y endereza tallos torcidos.",
        "Una planta alta se inclina bajo la estantería mientras un brote pequeño busca la luz matinal.",
        "La voluntaria retira la regla y gira las macetas. Descubre instrucciones diferentes en tres etiquetas gastadas.",
        "Aleja de la ventana la planta que prefiere sombra y acerca otra que necesita más sol.",
        "En lugar de cortar el tallo torcido, escribe una etiqueta nueva con sus necesidades reales de cuidado.",
        "La regla queda a un lado. Las tres plantas ocupan lugares distintos y siguen creciendo sin una forma impuesta."
      ]
    }
  },
  "self-acceptance-s2": {
    "en": {
      "idea": "A fairer view of oneself can begin by describing what is present rather than collecting harsh labels.",
      "pitch": "A person removes judgmental notes from a mirror and practices seeing details without grading them.",
      "symbol": "A mirror with paper labels",
      "arc": [
        "Judgment",
        "Light",
        "Noticing",
        "Neutral view"
      ],
      "scenes": [
        "In a bedroom mirror, small sticky notes read 'Too tired', 'Not enough' and 'Always wrong' around a reflection.",
        "The person reaches to add another label but stops when morning light reveals a fingerprint on the glass.",
        "They wipe the fingerprint, then lift the first note and look at the face behind it without changing anything.",
        "On a clean card, they write observable details: 'I was here. I got dressed. My eyes look tired.'",
        "The harsh labels move into a closed drawer; the clean card rests below the mirror, not across the face.",
        "The person leaves the room with the mirror unchanged. The card remains, and no forced smile appears."
      ]
    },
    "ru": {
      "idea": "Более справедливый взгляд на себя начинается с наблюдения, а не с новых суровых ярлыков.",
      "pitch": "Человек снимает оценочные записки с зеркала и учится замечать конкретные факты.",
      "symbol": "Зеркало с бумажными ярлыками",
      "arc": [
        "Оценка",
        "Свет",
        "Наблюдение",
        "Нейтральный взгляд"
      ],
      "scenes": [
        "Вокруг отражения на зеркале приклеены записки: «Недостаточно», «Опять ошибся», «Вечно устал».",
        "Человек собирается добавить ещё одну, но утренний свет высвечивает отпечаток пальца на стекле.",
        "Он стирает отпечаток, снимает первую записку и смотрит на отражение, ничего в нём не исправляя.",
        "На чистой карточке появляется запись: «Я здесь. Я оделся. Мои глаза сегодня выглядят уставшими».",
        "Суровые ярлыки убирают в закрытый ящик. Новая карточка лежит под зеркалом, не закрывая лицо.",
        "Человек выходит из комнаты. Зеркало не изменилось; в отражении не требуется обязательная улыбка."
      ]
    },
    "es": {
      "idea": "Una mirada más justa empieza por observar hechos, en vez de repetir etiquetas duras.",
      "pitch": "Una persona retira notas críticas del espejo y empieza a mirar sin puntuarse.",
      "symbol": "Un espejo con notas adhesivas",
      "arc": [
        "Juicio",
        "Luz",
        "Observación",
        "Mirada neutral"
      ],
      "scenes": [
        "En el espejo del dormitorio hay notas alrededor de la cara: «Nunca basta», «Siempre mal», «Demasiado cansada».",
        "La persona intenta pegar otra, pero la luz de la mañana revela una huella en el cristal.",
        "Limpia la huella, despega la primera nota y mira su rostro sin intentar cambiar nada de inmediato.",
        "En una tarjeta limpia escribe hechos: «Estoy aquí. Me he vestido. Hoy mis ojos parecen cansados».",
        "Guarda las etiquetas críticas en un cajón. La tarjeta nueva queda debajo del espejo sin tapar el rostro.",
        "Sale de la habitación con el espejo intacto. No aparece ninguna sonrisa obligatoria ni una transformación mágica."
      ]
    }
  },
  "self-acceptance-s3": {
    "en": {
      "idea": "Two conflicting feelings may be present without either one having to disappear before choosing an action.",
      "pitch": "An artist keeps two difficult emotions visible while making one small choice about a conversation.",
      "symbol": "Two transparent colored sheets",
      "arc": [
        "Conflict",
        "Seeing both",
        "Choice",
        "No suppression"
      ],
      "scenes": [
        "At an art desk, a person labels a red transparent sheet 'Angry' and a blue one 'I still care'.",
        "They try to hide the red sheet under a notebook, but its edge keeps showing beside the blue.",
        "The sheets are placed over a window. Their overlapping colors make a third shade without erasing either color.",
        "On a separate card they write, 'I am upset, and I want time before speaking.' The card stays unsent.",
        "They put both colored sheets into the same open folder, leaving the card where it can be read again.",
        "The folder closes gently. Neither feeling has vanished, and the person has not been forced to reply."
      ]
    },
    "ru": {
      "idea": "Два противоречивых чувства могут сосуществовать, пока человек выбирает безопасное действие.",
      "pitch": "Художник оставляет гнев и заботу видимыми и не заставляет себя немедленно отвечать.",
      "symbol": "Два прозрачных цветных листа",
      "arc": [
        "Противоречие",
        "Оба чувства",
        "Выбор",
        "Без подавления"
      ],
      "scenes": [
        "За столом человек подписывает красный прозрачный лист «Злюсь», а синий — «Мне всё ещё важно».",
        "Он прячет красный лист под блокнот, но край всё равно виднеется рядом с синим.",
        "Оба листа поднимают к окну. На пересечении появляется третий оттенок, не уничтожая исходные цвета.",
        "На карточке написано: «Я расстроен и хочу немного времени перед разговором». Отправлять её пока не нужно.",
        "Оба листа кладут в одну открытую папку. Карточка остаётся рядом, чтобы к ней можно было вернуться.",
        "Папка тихо закрывается. Ни одно чувство не исчезло, и никто не требует немедленного ответа."
      ]
    },
    "es": {
      "idea": "Dos emociones contradictorias pueden coexistir mientras una persona elige una acción cuidadosa.",
      "pitch": "Una artista mantiene visibles el enfado y el cariño antes de decidir si hablar.",
      "symbol": "Dos láminas de color transparentes",
      "arc": [
        "Conflicto",
        "Ver ambas",
        "Elegir",
        "Sin reprimir"
      ],
      "scenes": [
        "En su mesa una persona escribe «Enfado» sobre una lámina roja y «Todavía me importa» sobre otra azul.",
        "Intenta esconder la lámina roja bajo un cuaderno, pero su borde sigue visible junto a la azul.",
        "Sostiene ambas láminas contra la ventana. La superposición crea otro tono sin borrar ninguno de los dos.",
        "Escribe en una tarjeta: «Estoy molesta y necesito tiempo antes de hablar». Todavía no la envía.",
        "Coloca las dos láminas en la misma carpeta abierta, dejando la tarjeta cerca para leerla después.",
        "Cierra despacio la carpeta. Ninguna emoción ha desaparecido y nadie exige una respuesta inmediata."
      ]
    }
  },
  "self-acceptance-s4": {
    "en": {
      "idea": "Someone else's timeline need not determine when a personal change is considered late or successful.",
      "pitch": "A person replaces strict growth deadlines with observation after two seeds sprout at different times.",
      "symbol": "A seedling calendar",
      "arc": [
        "Pressure",
        "Different rhythms",
        "Observation",
        "An open season"
      ],
      "scenes": [
        "On a windowsill, two seed trays sit beneath a calendar covered in red deadlines and comparison marks.",
        "One seedling has emerged; the second pot still shows bare earth. The person circles a missed date in frustration.",
        "They gently examine the soil, find it moist and healthy, and move the calendar away from the pots.",
        "A fresh page records sunlight and watering instead of a fixed day when each seed must appear.",
        "The person waters both pots and leaves the second one undisturbed, making no claim that it must sprout tomorrow.",
        "At sunset one green shoot stands beside quiet soil. The calendar now tracks care rather than a verdict."
      ]
    },
    "ru": {
      "idea": "Чужой календарь не обязан определять, когда личные изменения считаются своевременными.",
      "pitch": "Человек меняет строгие сроки роста на наблюдение за двумя семенами с разным ритмом.",
      "symbol": "Календарь для ростков",
      "arc": [
        "Давление",
        "Разный ритм",
        "Наблюдение",
        "Открытое время"
      ],
      "scenes": [
        "На подоконнике стоят две ёмкости с семенами, а над ними висит календарь, испещрённый красными сроками.",
        "В первом горшке появился росток. Во втором только земля. Человек раздражённо обводит пропущенную дату.",
        "Он осторожно проверяет влажность почвы, видит, что всё в порядке, и снимает календарь со стены.",
        "На новой странице записаны свет и полив вместо обязательного числа, когда каждому семени пора взойти.",
        "Оба горшка поливают. Второй оставляют в покое, не требуя от семени результата к завтрашнему утру.",
        "На закате росток стоит рядом с тихой землёй. В календаре теперь отмечен уход, а не приговор."
      ]
    },
    "es": {
      "idea": "El calendario de otra persona no decide cuándo un cambio personal llega demasiado tarde.",
      "pitch": "Una persona sustituye plazos rígidos por observación cuando dos semillas crecen a ritmos distintos.",
      "symbol": "Un calendario de brotes",
      "arc": [
        "Presión",
        "Ritmos distintos",
        "Observar",
        "Temporada abierta"
      ],
      "scenes": [
        "En la ventana hay dos macetas con semillas y un calendario lleno de fechas límite marcadas en rojo.",
        "Una maceta tiene un brote verde; en la otra solo hay tierra. La persona rodea una fecha con frustración.",
        "Comprueba con cuidado la humedad del suelo y aparta el calendario al ver que la tierra está bien.",
        "En una página nueva anota la luz y el riego en vez de una fecha obligatoria para cada semilla.",
        "Riega ambas macetas y deja tranquila la que aún no brota, sin exigir resultados para mañana.",
        "Al atardecer, un tallo verde está junto a la tierra silenciosa. El calendario ahora registra cuidados."
      ]
    }
  }
};
export const selfAcceptanceEditorial=Object.freeze(Object.fromEntries(
 Object.entries(authored).map(([id,localized])=>[id,Object.freeze(Object.fromEntries(
 ["ru","en","es"].map(locale=>{const x=localized[locale];return [locale,film(x.idea,x.pitch,x.scenes,x.symbol,x.arc)];})
 ))])
));
