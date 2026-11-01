/** 
 * Holistic House / Meditation Image Atlas v2 (original text and metadata).
 * These scenes invite optional reflection; they are neither clinical KIP 
 * procedures nor a dictionary of diagnostic symbol meanings.
 * Clinician-only reference motifs have no playable narration.
 */
const sceneRows = [
  {
    "id": "morning_window",
    "title": {
      "ru": "Утреннее окно",
      "en": "Morning window",
      "es": "Ventana de mañana"
    },
    "prose": {
      "ru": "Свет ложится на подоконник. День ещё не требует решений; можно просто заметить одну светлую деталь.",
      "en": "Light rests on the windowsill. The day is not demanding a decision; you may simply notice one bright detail.",
      "es": "La luz descansa sobre la ventana. El día aún no exige decisiones; puedes notar un detalle luminoso."
    },
    "goals": [
      "settle",
      "support"
    ],
    "stages": [
      "orientation",
      "support",
      "integration"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "garden_bench",
    "title": {
      "ru": "Скамья в саду",
      "en": "Garden bench",
      "es": "Banco en el jardín"
    },
    "prose": {
      "ru": "Среди зелени стоит скамья. Можно приблизиться к ней, посмотреть издали или выбрать совершенно другое место.",
      "en": "There is a bench among the leaves. You can come closer, look from afar, or choose somewhere else entirely.",
      "es": "Hay un banco entre las hojas. Puedes acercarte, observar de lejos o elegir otro lugar."
    },
    "goals": [
      "settle",
      "relationships",
      "support"
    ],
    "stages": [
      "support",
      "imagery"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "wooden_table",
    "title": {
      "ru": "Деревянный стол",
      "en": "Wooden table",
      "es": "Mesa de madera"
    },
    "prose": {
      "ru": "На столе есть свободное место для одной мысли. Остальные мысли можно пока не раскладывать по порядку.",
      "en": "There is room on the table for one thought. The rest need not be arranged just now.",
      "es": "Hay espacio en la mesa para una idea. Las otras no necesitan ordenarse ahora."
    },
    "goals": [
      "clarity",
      "goals"
    ],
    "stages": [
      "orientation",
      "values",
      "options"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "library_nook",
    "title": {
      "ru": "Уголок библиотеки",
      "en": "Library nook",
      "es": "Rincón de biblioteca"
    },
    "prose": {
      "ru": "Книги спокойно ждут на полках. Достаточно одной страницы; никто не просит прочесть всю историю сразу.",
      "en": "Books wait patiently on their shelves. One page is enough; nobody asks you to read the entire story at once.",
      "es": "Los libros esperan en sus estantes. Basta una página; nadie te pide leer toda la historia de golpe."
    },
    "goals": [
      "clarity",
      "meaning"
    ],
    "stages": [
      "support",
      "values"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "sunny_meadow",
    "title": {
      "ru": "Солнечная поляна",
      "en": "Sunny meadow",
      "es": "Pradera soleada"
    },
    "prose": {
      "ru": "Трава мягко светится под дневным небом. Взгляд может остановиться лишь на одном пятне цвета.",
      "en": "Grass glows quietly under the daylight. Your attention can rest on a single patch of colour.",
      "es": "La hierba brilla suavemente bajo el día. Tu atención puede descansar en un solo color."
    },
    "goals": [
      "settle",
      "energy",
      "support"
    ],
    "stages": [
      "support",
      "imagery"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "seed_in_pot",
    "title": {
      "ru": "Семя в горшочке",
      "en": "Seed in a pot",
      "es": "Semilla en maceta"
    },
    "prose": {
      "ru": "Горшочек стоит рядом со светом. Рост не обязан быть заметен каждую минуту; у растения свой ритм.",
      "en": "A small pot stands near the light. Growth need not be visible every minute; the plant has its own rhythm.",
      "es": "Una maceta está junto a la luz. El crecimiento no se ve cada minuto; la planta tiene su ritmo."
    },
    "goals": [
      "confidence",
      "energy",
      "goals"
    ],
    "stages": [
      "values",
      "practice",
      "transfer"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "stone_in_sun",
    "title": {
      "ru": "Камень на солнце",
      "en": "Stone in sunlight",
      "es": "Piedra al sol"
    },
    "prose": {
      "ru": "Обычный камень лежит в полосе света. Ему не нужно приписывать особое значение, чтобы заметить его форму.",
      "en": "An ordinary stone lies in the light. It does not need a special meaning for you to notice its shape.",
      "es": "Una piedra común recibe la luz. No necesita un significado especial para que observes su forma."
    },
    "goals": [
      "settle",
      "support",
      "confidence"
    ],
    "stages": [
      "support",
      "integration"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "cloud_opening",
    "title": {
      "ru": "Просвет в облаках",
      "en": "Opening in the clouds",
      "es": "Claro entre nubes"
    },
    "prose": {
      "ru": "Между облаками виден узкий просвет. Он не должен становиться больше; уже достаточно того, что его можно увидеть.",
      "en": "A narrow opening appears between the clouds. It need not grow wider; noticing it is enough.",
      "es": "Aparece un pequeño claro entre las nubes. No tiene que crecer; notarlo basta."
    },
    "goals": [
      "clarity",
      "settle"
    ],
    "stages": [
      "beliefs",
      "imagery"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "balcony_plants",
    "title": {
      "ru": "Растения на балконе",
      "en": "Balcony plants",
      "es": "Plantas en el balcón"
    },
    "prose": {
      "ru": "Рядом стоят разные растения. Каждое растёт по-своему, и нет нужды сравнивать их листья.",
      "en": "Different plants stand together. Each grows in its own way, and their leaves need not be compared.",
      "es": "Varias plantas crecen juntas. Cada una tiene su manera de crecer; no hace falta comparar sus hojas."
    },
    "goals": [
      "self_worth",
      "relationships"
    ],
    "stages": [
      "self_talk",
      "boundaries"
    ],
    "avoidTags": [
      "height"
    ],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "folded_blanket",
    "title": {
      "ru": "Сложенный плед",
      "en": "Folded blanket",
      "es": "Manta doblada"
    },
    "prose": {
      "ru": "На спинке кресла лежит плед. Он доступен, но не навязан: удобство остаётся вашим выбором.",
      "en": "A blanket rests over a chair. It is available, not imposed; comfort remains your choice.",
      "es": "Una manta descansa sobre una silla. Está disponible, no impuesta; la comodidad es tu elección."
    },
    "goals": [
      "support",
      "settle"
    ],
    "stages": [
      "support",
      "self_talk"
    ],
    "avoidTags": [
      "touch"
    ],
    "sense": "neutral",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "small_lamp",
    "title": {
      "ru": "Небольшая лампа",
      "en": "Small lamp",
      "es": "Lámpara pequeña"
    },
    "prose": {
      "ru": "Лампа освещает лишь часть стола. Необязательно видеть всё пространство, чтобы заметить ближайший шаг.",
      "en": "A lamp lights only part of the desk. You need not see the whole space to notice your next small step.",
      "es": "Una lámpara ilumina solo parte de la mesa. No hace falta verlo todo para notar el siguiente paso."
    },
    "goals": [
      "clarity",
      "meaning"
    ],
    "stages": [
      "beliefs",
      "values"
    ],
    "avoidTags": [
      "darkness"
    ],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "blank_notebook",
    "title": {
      "ru": "Чистая страница",
      "en": "Blank notebook page",
      "es": "Página en blanco"
    },
    "prose": {
      "ru": "Блокнот открыт на новой странице. Старые записи остаются; это не мешает появиться следующей строке.",
      "en": "A notebook lies open at a new page. Earlier writing remains; another line can still begin.",
      "es": "Un cuaderno está abierto en una página nueva. Lo anterior permanece; aun así puede empezar otra línea."
    },
    "goals": [
      "goals",
      "confidence",
      "meaning"
    ],
    "stages": [
      "orientation",
      "practice",
      "transfer"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "map_on_table",
    "title": {
      "ru": "Карта на столе",
      "en": "Map on a table",
      "es": "Mapa sobre la mesa"
    },
    "prose": {
      "ru": "Карта предлагает несколько направлений, но не отдаёт приказов. Можно посмотреть и не решать всё сегодня.",
      "en": "A map offers several directions but gives no orders. You may look without deciding everything today.",
      "es": "Un mapa ofrece varios caminos sin dar órdenes. Puedes observar sin decidirlo todo hoy."
    },
    "goals": [
      "goals",
      "clarity",
      "meaning"
    ],
    "stages": [
      "values",
      "options"
    ],
    "avoidTags": [
      "travel"
    ],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "compass",
    "title": {
      "ru": "Компас",
      "en": "Compass",
      "es": "Brújula"
    },
    "prose": {
      "ru": "Компас лежит рядом с книгой. Он не идёт вместо вас; просто напоминает, что ориентир можно выбирать.",
      "en": "A compass lies beside a book. It cannot walk for you; it offers a possible point of reference.",
      "es": "Una brújula está junto a un libro. No camina por ti; ofrece un punto de referencia posible."
    },
    "goals": [
      "meaning",
      "goals",
      "confidence"
    ],
    "stages": [
      "values",
      "options"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "waymarkers",
    "title": {
      "ru": "Небольшие указатели",
      "en": "Small waymarkers",
      "es": "Señales del camino"
    },
    "prose": {
      "ru": "У дорожки стоят скромные указатели. Необязательно выбирать весь путь: можно прочитать лишь ближайший.",
      "en": "Small signs stand by the path. You need not choose the whole route; perhaps read the nearest one.",
      "es": "Hay pequeñas señales junto al camino. No necesitas elegir la ruta completa; puedes leer la más cercana."
    },
    "goals": [
      "goals",
      "clarity"
    ],
    "stages": [
      "options",
      "practice"
    ],
    "avoidTags": [
      "travel"
    ],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "garden_gate",
    "title": {
      "ru": "Садовая калитка",
      "en": "Garden gate",
      "es": "Puerta del jardín"
    },
    "prose": {
      "ru": "Калитка слегка приоткрыта. Можно видеть обе стороны и при этом оставаться на своём месте.",
      "en": "A garden gate stands slightly open. You can see both sides while remaining where you are.",
      "es": "La puerta del jardín está entreabierta. Puedes ver ambos lados y quedarte donde estás."
    },
    "goals": [
      "boundaries",
      "relationships",
      "confidence"
    ],
    "stages": [
      "boundaries",
      "options"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "mosaic",
    "title": {
      "ru": "Цветная мозаика",
      "en": "Colourful mosaic",
      "es": "Mosaico de colores"
    },
    "prose": {
      "ru": "Мозаика состоит из непохожих фрагментов. Одна плитка не обязана объяснять всю картину.",
      "en": "A mosaic is made of different fragments. One tile does not have to explain the whole picture.",
      "es": "Un mosaico reúne piezas diferentes. Una pieza no tiene que explicar la imagen completa."
    },
    "goals": [
      "self_worth",
      "clarity",
      "meaning"
    ],
    "stages": [
      "pattern",
      "beliefs",
      "self_talk"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "painter_palette",
    "title": {
      "ru": "Палитра красок",
      "en": "Painter's palette",
      "es": "Paleta de colores"
    },
    "prose": {
      "ru": "Разные краски лежат рядом. Контрастные оттенки могут принадлежать одному рисунку, не отменяя друг друга.",
      "en": "Different colours rest side by side. Contrasting shades can belong in the same painting.",
      "es": "Varios colores descansan juntos. Los tonos contrastantes pueden pertenecer al mismo cuadro."
    },
    "goals": [
      "relationships",
      "self_worth",
      "clarity"
    ],
    "stages": [
      "self_talk",
      "beliefs"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "shelf_choices",
    "title": {
      "ru": "Полка возможностей",
      "en": "Shelf of options",
      "es": "Estante de opciones"
    },
    "prose": {
      "ru": "На полке стоят разные вещи. Можно взять только нужное сейчас; остальные спокойно останутся на своих местах.",
      "en": "A shelf holds several things. You may choose only what is useful now and leave the others in place.",
      "es": "Un estante guarda varios objetos. Puedes elegir solo lo necesario ahora y dejar el resto."
    },
    "goals": [
      "boundaries",
      "clarity",
      "goals"
    ],
    "stages": [
      "boundaries",
      "options"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "bridge_view",
    "title": {
      "ru": "Мостик издалека",
      "en": "Bridge at a distance",
      "es": "Puente a lo lejos"
    },
    "prose": {
      "ru": "Вдалеке виден мостик. Не нужно переходить его; достаточно знать, что такая возможность существует.",
      "en": "A little bridge is visible in the distance. No crossing is needed; knowing the option exists is enough.",
      "es": "Se ve un pequeño puente a lo lejos. No tienes que cruzarlo; saber que existe es suficiente."
    },
    "goals": [
      "goals",
      "confidence",
      "boundaries"
    ],
    "stages": [
      "options",
      "practice"
    ],
    "avoidTags": [
      "water",
      "travel"
    ],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "daytime_shore",
    "title": {
      "ru": "Берег в дневном свете",
      "en": "Daytime shore",
      "es": "Orilla durante el día"
    },
    "prose": {
      "ru": "На берегу меняется рисунок света. Вы сами определяете, с какой дистанции наблюдать воду.",
      "en": "At the shore the pattern of light changes. You choose how close or far away to watch the water.",
      "es": "En la orilla cambia el dibujo de la luz. Tú eliges desde qué distancia mirar el agua."
    },
    "goals": [
      "settle",
      "energy"
    ],
    "stages": [
      "support",
      "imagery"
    ],
    "avoidTags": [
      "water"
    ],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "orchard",
    "title": {
      "ru": "Садовая тропинка",
      "en": "Orchard path",
      "es": "Sendero del huerto"
    },
    "prose": {
      "ru": "Одни ветви в саду уже несут плоды, другие только растут. У каждого дерева свой сезон.",
      "en": "Some branches already bear fruit, while others are still growing. Each tree has its own season.",
      "es": "Unas ramas ya dan fruto y otras siguen creciendo. Cada árbol tiene su estación."
    },
    "goals": [
      "confidence",
      "self_worth",
      "goals"
    ],
    "stages": [
      "self_talk",
      "values"
    ],
    "avoidTags": [
      "travel"
    ],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "wildflowers",
    "title": {
      "ru": "Полевые цветы",
      "en": "Wildflowers",
      "es": "Flores silvestres"
    },
    "prose": {
      "ru": "Полевые цветы не выстраиваются в ровные ряды. И всё же каждый находит здесь место.",
      "en": "Wildflowers do not arrange themselves in neat rows. Each one still finds a place.",
      "es": "Las flores silvestres no crecen en filas perfectas. Aun así cada una encuentra su lugar."
    },
    "goals": [
      "relationships",
      "self_worth"
    ],
    "stages": [
      "self_talk",
      "imagery"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "cup_at_window",
    "title": {
      "ru": "Чашка у окна",
      "en": "Cup by the window",
      "es": "Taza junto a la ventana"
    },
    "prose": {
      "ru": "Чашка стоит у окна. Даже в обычном дне может оказаться место для небольшой паузы.",
      "en": "A cup waits beside the window. Even an ordinary day may have room for a small pause.",
      "es": "Una taza espera junto a la ventana. Incluso un día común puede tener espacio para una pausa."
    },
    "goals": [
      "settle",
      "energy",
      "support"
    ],
    "stages": [
      "support",
      "transfer"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "workbench",
    "title": {
      "ru": "Рабочий стол",
      "en": "Workbench",
      "es": "Mesa de trabajo"
    },
    "prose": {
      "ru": "На столе лежит незавершённая работа. Можно заметить сделанное, прежде чем решать, что делать дальше.",
      "en": "An unfinished project sits on a workbench. You can see what is done before deciding what comes next.",
      "es": "Un proyecto inacabado está sobre la mesa. Puedes ver lo que ya hiciste antes de decidir qué sigue."
    },
    "goals": [
      "goals",
      "confidence",
      "clarity"
    ],
    "stages": [
      "practice",
      "transfer"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "terrace",
    "title": {
      "ru": "Тихая терраса",
      "en": "Quiet terrace",
      "es": "Terraza tranquila"
    },
    "prose": {
      "ru": "С террасы видны крыши и деревья. Можно наблюдать, не вступая в происходящее, и возвращаться когда угодно.",
      "en": "A terrace looks over rooftops and trees. You can observe without joining in, and return whenever you like.",
      "es": "Desde una terraza se ven tejados y árboles. Puedes observar sin participar y volver cuando quieras."
    },
    "goals": [
      "boundaries",
      "support",
      "clarity"
    ],
    "stages": [
      "support",
      "boundaries"
    ],
    "avoidTags": [
      "height"
    ],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "city_tree",
    "title": {
      "ru": "Дерево в парке",
      "en": "Tree in a park",
      "es": "Árbol en un parque"
    },
    "prose": {
      "ru": "Обычное дерево растёт среди дорожек. Ему не нужно быть редким, чтобы его присутствие было заметным.",
      "en": "An ordinary tree grows among the paths. It need not be rare for its presence to be noticed.",
      "es": "Un árbol común crece junto a los senderos. No tiene que ser raro para que notes su presencia."
    },
    "goals": [
      "support",
      "settle",
      "self_worth"
    ],
    "stages": [
      "support",
      "imagery"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "leaf_light",
    "title": {
      "ru": "Свет сквозь листья",
      "en": "Light through leaves",
      "es": "Luz entre las hojas"
    },
    "prose": {
      "ru": "Свет перемещается по листьям маленькими пятнами. Можно выбрать одно и просто следить, как оно меняется.",
      "en": "Light moves across leaves in small patches. You might choose one and simply watch it change.",
      "es": "La luz se mueve entre las hojas. Puedes elegir una mancha y observar cómo cambia."
    },
    "goals": [
      "settle",
      "energy"
    ],
    "stages": [
      "support",
      "imagery"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "distant_hills",
    "title": {
      "ru": "Холмы вдали",
      "en": "Distant hills",
      "es": "Colinas lejanas"
    },
    "prose": {
      "ru": "Холмы лежат вдали под ясным небом. Сегодня не нужно восходить на вершину: пейзаж может оставаться пейзажем.",
      "en": "Hills rest beneath the clear sky. No ascent is needed today; a landscape may simply be a landscape.",
      "es": "Unas colinas descansan bajo el cielo. Hoy no hay que subir: el paisaje puede ser solo un paisaje."
    },
    "goals": [
      "clarity",
      "meaning",
      "goals"
    ],
    "stages": [
      "values",
      "options"
    ],
    "avoidTags": [
      "height"
    ],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "rustling_leaves",
    "title": {
      "ru": "Шелест листвы",
      "en": "Rustling leaves",
      "es": "Susurro de hojas"
    },
    "prose": {
      "ru": "Лёгкий ветер шевелит листву. Можно прислушаться к одному звуку, не пытаясь менять другие.",
      "en": "A breeze moves the leaves. You can attend to one sound without trying to change the others.",
      "es": "Una brisa mueve las hojas. Puedes escuchar un sonido sin intentar cambiar los demás."
    },
    "goals": [
      "settle",
      "clarity"
    ],
    "stages": [
      "support",
      "integration"
    ],
    "avoidTags": [],
    "sense": "auditory",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "open_book",
    "title": {
      "ru": "Открытая книга",
      "en": "Open book",
      "es": "Libro abierto"
    },
    "prose": {
      "ru": "Открытая книга показывает одну страницу, а не всю историю. Можно остаться именно здесь.",
      "en": "An open book shows one page, not the whole story. You may stay with this one for now.",
      "es": "Un libro abierto muestra una página, no toda la historia. Puedes quedarte aquí."
    },
    "goals": [
      "meaning",
      "goals",
      "clarity"
    ],
    "stages": [
      "values",
      "transfer"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "woven_threads",
    "title": {
      "ru": "Переплетение нитей",
      "en": "Woven threads",
      "es": "Hilos tejidos"
    },
    "prose": {
      "ru": "Разные нити образуют ткань. Ни одной нити не нужно держать весь узор в одиночку.",
      "en": "Different threads make a fabric. No single thread has to hold the whole pattern alone.",
      "es": "Distintos hilos forman una tela. Ningún hilo tiene que sostener el dibujo por sí solo."
    },
    "goals": [
      "relationships",
      "support"
    ],
    "stages": [
      "boundaries",
      "self_talk"
    ],
    "avoidTags": [],
    "sense": "visual",
    "tier": "self_guided_original",
    "provenance": "holistic_house_original"
  },
  {
    "id": "ancestral_hall",
    "title": {
      "ru": "Зал предков",
      "en": "Ancestral hall",
      "es": "Salón ancestral"
    },
    "prose": null,
    "goals": [
      "meaning",
      "relationships"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "people",
      "enclosed_spaces"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "childhood_room",
    "title": {
      "ru": "Комната детства",
      "en": "Childhood room",
      "es": "Habitación de infancia"
    },
    "prose": null,
    "goals": [
      "self_worth",
      "relationships"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "enclosed_spaces"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "cave_threshold",
    "title": {
      "ru": "Порог пещеры",
      "en": "Cave threshold",
      "es": "Umbral de cueva"
    },
    "prose": null,
    "goals": [
      "clarity",
      "confidence"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "darkness",
      "enclosed_spaces"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "shadow_double",
    "title": {
      "ru": "Теневая фигура",
      "en": "Shadow double",
      "es": "Doble en sombra"
    },
    "prose": null,
    "goals": [
      "self_worth",
      "relationships"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "darkness",
      "people"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "mask_gathering",
    "title": {
      "ru": "Собрание в масках",
      "en": "Masked gathering",
      "es": "Reunión en máscaras"
    },
    "prose": null,
    "goals": [
      "relationships",
      "self_worth"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "people",
      "crowds"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "labyrinth",
    "title": {
      "ru": "Лабиринт",
      "en": "Labyrinth",
      "es": "Laberinto"
    },
    "prose": null,
    "goals": [
      "meaning",
      "goals"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "enclosed_spaces"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "precipice",
    "title": {
      "ru": "Обрыв",
      "en": "Precipice",
      "es": "Precipicio"
    },
    "prose": null,
    "goals": [
      "confidence",
      "meaning"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "height"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "threatening_animal",
    "title": {
      "ru": "Опасное животное",
      "en": "Threatening animal",
      "es": "Animal amenazante"
    },
    "prose": null,
    "goals": [
      "confidence",
      "relationships"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "animals"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "locked_room",
    "title": {
      "ru": "Запертая комната",
      "en": "Locked room",
      "es": "Habitación cerrada"
    },
    "prose": null,
    "goals": [
      "boundaries",
      "relationships"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "enclosed_spaces"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "sea_storm",
    "title": {
      "ru": "Шторм",
      "en": "Storm at sea",
      "es": "Tormenta en el mar"
    },
    "prose": null,
    "goals": [
      "settle",
      "confidence"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "water",
      "darkness"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "underworld_steps",
    "title": {
      "ru": "Лестница под землю",
      "en": "Steps underground",
      "es": "Escalera bajo tierra"
    },
    "prose": null,
    "goals": [
      "meaning",
      "self_worth"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "darkness",
      "enclosed_spaces"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  },
  {
    "id": "burning_house",
    "title": {
      "ru": "Горящий дом",
      "en": "House in flames",
      "es": "Casa en llamas"
    },
    "prose": null,
    "goals": [
      "relationships",
      "meaning"
    ],
    "stages": [
      "clinician_review"
    ],
    "avoidTags": [
      "fire",
      "enclosed_spaces"
    ],
    "sense": "visual",
    "tier": "clinician_reference",
    "provenance": "original_archetypal_reference"
  }
];
const LOCALES=new Set(["en","ru","es"]);
const AVOID_TAGS=new Set(["breath_focus","eyes_closed","touch","water","animals","darkness","people","body_scan","fire","height","crowds","enclosed_spaces","travel","spiritual_symbols"]);
const localized=(v,locale)=>v[LOCALES.has(locale)?locale:"en"];
export const MEDITATION_IMAGE_ATLAS=Object.freeze(sceneRows.map(item=>Object.freeze({
  ...item,title:Object.freeze(item.title),prose:item.prose?Object.freeze(item.prose):null,
  goals:Object.freeze(item.goals),stages:Object.freeze(item.stages),
  avoidTags:Object.freeze(item.avoidTags),
  selfGuided:item.tier==="self_guided_original",
  clinicalReviewRequired:item.tier!=="self_guided_original",
  fixedSymbolMeaning:null,medicalClaim:false
})));
export const MEDITATION_IMAGE_BY_ID=Object.freeze(Object.fromEntries(MEDITATION_IMAGE_ATLAS.map(s=>[s.id,s])));
export const MEDITATION_IMAGE_AVOID_TAGS=Object.freeze([...AVOID_TAGS]);
export function listMeditationImages({locale="ru",goal=null,objective=null,
  channel=null,avoidElements=[],includeClinical=false,limit=100}={}){
  const avoid=new Set(Array.isArray(avoidElements)?avoidElements.filter(v=>AVOID_TAGS.has(v)):[]);
  const n=Number.isInteger(limit)?Math.max(0,Math.min(100,limit)):100;
  return MEDITATION_IMAGE_ATLAS.filter(s=>(includeClinical||s.selfGuided)&&
    (!goal||s.goals.includes(goal))&&(!objective||s.stages.includes(objective))&&
    (!channel||channel==="neutral"||s.sense===channel||s.sense==="visual")&&
    !s.avoidTags.some(tag=>avoid.has(tag)))
    .slice(0,n).map(s=>({id:s.id,title:localized(s.title,locale),
      goals:[...s.goals],stages:[...s.stages],sense:s.sense,
      avoidTags:[...s.avoidTags],selfGuided:s.selfGuided,
      clinicalReviewRequired:s.clinicalReviewRequired,
      origin:s.provenance}));
}
