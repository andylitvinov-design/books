import type { PublicLocale } from "@/lib/public-locales";

/** Curated learning sequence, not a reconstruction of an undocumented historical syllabus.
 * Every source ID belongs to one module only; original records are never rewritten. */
export type TempleStage = {
  id: string;
  image: string;
  sourceIds: readonly string[];
  copy: Record<PublicLocale, {
    title: string;
    subtitle: string;
    introduction: string;
    lessons: Array<{ title: string; description: string }>;
    exercise: string;
    outcome: string;
  }>;
};

export const templeStages: TempleStage[] = [
  {
    id: "foundations",
    image: "/images/holistic-house/hero-olive-incense.webp",
    sourceIds: ["history"],
    copy: {
      en: {
        title: "Foundations of Temple Studies", subtitle: "Learn how to read the language of a mystery",
        introduction: "Begin with the Academy's central method: a myth, a symbol and an embodied experience are three different ways of examining a human question. Distinguish historical traditions from a modern personal practice so you can explore them without confusing metaphor with fact.",
        lessons: [
          { title: "What is a temple mystery?", description: "Discover ritual and initiation as historical and symbolic formats: entering a story, encountering a threshold, and carrying its meaning back into ordinary life." },
          { title: "Archetypes, images and intention", description: "Learn to formulate a personal question and notice how a mythic figure or image evokes associations, emotions, resources and limits." },
          { title: "A responsible practice", description: "Introduce reflection, voluntary participation, boundaries and cultural context. Different traditions are compared without claiming they are identical." },
        ],
        exercise: "Write one question you would like to explore. Identify the image you associate with it, the feeling it brings up and one observation you can test in everyday life.",
        outcome: "You have a clear question, the basic vocabulary of Temple Studies and a safe framework for the following modules.",
      },
      ru: {
        title: "Основы храмовых мистерий", subtitle: "Учимся читать язык мистерий",
        introduction: "Основа метода Академии: миф, символ и личное переживание — разные способы исследовать человеческий вопрос. Сначала важно отличить историческую традицию от современной авторской практики, чтобы понимать, где культурный источник, а где образное исследование себя.",
        lessons: [
          { title: "Что такое храмовая мистерия", description: "Ритуал и инициация как исторические и символические формы: вход в сюжет, прохождение внутреннего порога и перенос полученного смысла в повседневную жизнь." },
          { title: "Архетипы, образы и намерение", description: "Учимся формулировать запрос и замечать, какие ассоциации, переживания, ресурсы и ограничения проявляются при встрече с мифологическим образом." },
          { title: "Экологичная практика", description: "Добровольность, согласие, границы, интеграция опыта и уважение к происхождению традиций. Мы сопоставляем культуры, но не объявляем их одной и той же системой." },
        ],
        exercise: "Запишите один личный вопрос. Определите связанный с ним образ, возникающее чувство и одно наблюдение, которое можно проверить в реальной жизни.",
        outcome: "Сформирован запрос, понятен язык Temple Studies и есть опора для последующих этапов.",
      },
      es: {
        title: "Fundamentos de los misterios del templo", subtitle: "Aprender el lenguaje de los misterios",
        introduction: "El punto de partida es distinguir mito, símbolo y experiencia personal. Una tradición histórica no es lo mismo que una práctica contemporánea de reflexión; entenderlo da claridad al recorrido.",
        lessons: [
          { title: "¿Qué es un misterio del templo?", description: "El ritual y la iniciación como formas históricas y simbólicas: entrar en un relato, cruzar un umbral e integrar su significado." },
          { title: "Arquetipos, imágenes e intención", description: "Formular una pregunta propia y observar las asociaciones, emociones, recursos y límites que despierta una figura mítica." },
          { title: "Práctica responsable", description: "Consentimiento, límites, participación voluntaria y respeto por el contexto cultural de cada tradición." },
        ],
        exercise: "Escribe una pregunta personal, una imagen asociada, la emoción que provoca y una observación comprobable en tu vida cotidiana.",
        outcome: "Has definido tu pregunta y adquirido un marco responsable para los siguientes módulos.",
      },
    },
  },
  {
    id: "greek",
    image: "/library/maya-mysteries/media/post-244-1.jpg",
    sourceIds: ["traditions/greece","mysteries/greece-rome/beauty-and-power","mysteries/archetypes-of-gods"],
    copy: {
      en: {
        title: "Greek Mysteries & Archetypes", subtitle: "Life, desire, change and inner sovereignty",
        introduction: "The Greek tradition offers a vivid language for the human journey. Instead of learning a long pantheon without context, we follow three linked themes: beginning and attachment, desire and freedom, and the passage from disruption into maturity.",
        lessons: [
          { title: "Demeter, Persephone and belonging", description: "Explore care, separation and return as symbolic stages of growing up. Reflect on attachment, loss, the need for support and the capacity to stand on your own." },
          { title: "Dionysus, Eros and vitality", description: "Examine passion, spontaneity, sensuality and the tension between authentic desire and social roles; make room for boundaries alongside openness." },
          { title: "Athena, Artemis and the inner guide", description: "Work with agency, discernment, autonomy and the inner capacity to choose a direction without losing connection to others." },
        ],
        exercise: "Select one Greek figure that speaks to your current life question. Describe its constructive and difficult qualities, then choose a small concrete action.",
        outcome: "You can recognize Greek mythic patterns in your own story without treating them as diagnoses or predictions.",
      },
      ru: {
        title: "Греческие мистерии и архетипы", subtitle: "Жизнь, желание, перемены и внутренняя самостоятельность",
        introduction: "Греческие мистерии дают яркий язык для исследования человеческого пути. Вместо бессвязного каталога богов идём через три темы: близость и отделение, желание и свобода, переход от внутреннего конфликта к зрелому выбору.",
        lessons: [
          { title: "Деметра, Персефона и принадлежность", description: "Забота, разлука и возвращение как символы взросления. Исследуем контакт с поддержкой, переживание потери, потребность в близости и способность опираться на себя." },
          { title: "Дионис, Эрос и жизненность", description: "Страсть, спонтанность, чувственность и напряжение между истинным желанием и социальной ролью; свобода проявления вместе с уважением границ." },
          { title: "Афина, Артемида и внутренний проводник", description: "Воля, различение, самостоятельность и способность выбирать путь, оставаясь в связи с людьми." },
        ],
        exercise: "Выберите один греческий архетип, связанный с вашим запросом. Опишите его созидательную и теневую стороны и выберите небольшое реальное действие.",
        outcome: "Вы понимаете мифологические сюжеты Греции как модели для размышления, а не как диагноз или предсказание.",
      },
      es: {
        title: "Misterios y arquetipos griegos", subtitle: "Vida, deseo, cambio y autonomía interior",
        introduction: "Los misterios griegos ofrecen un lenguaje para explorar la vida: vínculo y separación, deseo y libertad, conflicto y elección madura.",
        lessons: [
          { title: "Deméter, Perséfone y pertenencia", description: "El cuidado, la separación y el retorno como imágenes del crecimiento y del apoyo interior." },
          { title: "Dioniso, Eros y vitalidad", description: "Pasión, espontaneidad, deseo auténtico y respeto por los límites personales." },
          { title: "Atenea, Artemisa y dirección", description: "Discernimiento, autonomía y capacidad de decidir sin perder el vínculo con los demás." },
        ],
        exercise: "Elige una figura griega vinculada a tu pregunta, observa sus cualidades luminosas y difíciles y determina una acción concreta.",
        outcome: "Puedes utilizar los mitos griegos como marcos de reflexión, no como diagnósticos ni predicciones.",
      },
    },
  },
  {
    id: "egypt",
    image: "/library/maya-egregor-gods/media/post-203-1.jpg",
    sourceIds: ["traditions/egypt","mysteries/egypt/high-wisdom"],
    copy: {
      en: {
        title: "Egyptian Temple Mysteries", subtitle: "From confusion toward order and purposeful action",
        introduction: "The Egyptian cycle is presented as a symbolic journey through intention, reflection and transformation. These themes prepare the eight-step applied Egyptian model used later, without repeating the same practice here.",
        lessons: [
          { title: "Isis and Osiris: loss and renewal", description: "Consider fragmentation, continuity and the patient work of finding a new form after a major change. Distinguish mythic language from historical claims." },
          { title: "Thoth and Ma'at: clarity and balance", description: "Use writing, observation and the image of balance to separate assumptions from facts and bring more order to a complex choice." },
          { title: "Horus and Ra: agency and visibility", description: "Reflect on taking a position, accepting responsibility and moving from an inner intention toward visible action." },
        ],
        exercise: "Choose a situation that feels unclear. Write what is known, what is imagined, what really matters and which first action is possible.",
        outcome: "You gain an Egyptian symbolic vocabulary for clarifying a question before approaching practical archetypal work.",
      },
      ru: {
        title: "Египетские храмовые мистерии", subtitle: "От хаоса к порядку и осознанному действию",
        introduction: "Египетский цикл изучается как символический путь через намерение, понимание и преобразование. Он готовит к практической восьмишаговой модели египетского курса, которая появится на заключительном этапе — без повторения здесь.",
        lessons: [
          { title: "Исида и Осирис: утрата и возрождение", description: "Распад привычной формы, сохранение внутреннего ядра и постепенное восстановление целостности после перемен. Мифологический образ отделяется от исторических фактов." },
          { title: "Тот и Маат: ясность и равновесие", description: "Письменная рефлексия, наблюдение и символика меры помогают различать факты, предположения и ценности в сложном выборе." },
          { title: "Гор и Ра: действие и проявленность", description: "Внутренняя позиция, ответственность, собственная воля и переход от намерения к заметному действию." },
        ],
        exercise: "Возьмите неясную ситуацию. Разделите факты и фантазии, назовите главное и найдите первый выполнимый шаг.",
        outcome: "Вы освоили египетский символический язык для прояснения запроса перед прикладными практиками.",
      },
      es: {
        title: "Misterios del templo egipcio", subtitle: "Del desorden a la claridad y la acción",
        introduction: "La tradición egipcia se presenta como un recorrido simbólico de intención, comprensión y transformación. Prepara el modelo práctico de ocho pasos del último módulo sin duplicarlo.",
        lessons: [
          { title: "Isis y Osiris: pérdida y renovación", description: "La continuidad interior, el cambio y la búsqueda de una nueva forma tras una ruptura." },
          { title: "Thot y Maat: claridad y equilibrio", description: "Distinguir hechos, supuestos y valores mediante la escritura y la reflexión." },
          { title: "Horus y Ra: acción y presencia", description: "Responsabilidad, voluntad y paso de una intención hacia una acción visible." },
        ],
        exercise: "Escribe qué sabes de una situación confusa, qué supones y qué primer paso real puedes dar.",
        outcome: "Has adquirido un lenguaje simbólico egipcio para aclarar tus preguntas personales.",
      },
    },
  },
  {
    id: "traditions",
    image: "/images/holistic-house/books-library.webp",
    sourceIds: ["mysteries/maya-aztec/feathered-serpent","mysteries/slavic/fairy-tales-mysteries","mysteries/slavic/shamanism","mysteries/zoroastrism/eastern-magic","symbolic/scandinavian-mysteries"],
    copy: {
      en: {
        title: "World Traditions & Sacred Narratives", subtitle: "Different cultural paths, a wider perspective",
        introduction: "Having studied the Greek and Egyptian systems separately, compare several other bodies of tradition without flattening their differences. This is a cultural and symbolic overview, not a claim to initiate students into living Indigenous or religious traditions.",
        lessons: [
          { title: "Maya and Mesoamerican imagery", description: "Read serpent, transformation and cosmic-cycle images in their historical context; avoid treating Maya and Aztec traditions as interchangeable." },
          { title: "Slavic fairy tales and shamanic motifs", description: "Recognize thresholds, helpers, journeys and personal responsibility in folklore, distinguishing storytelling from contemporary spiritual interpretations." },
          { title: "Northern and Eastern narratives", description: "Consider the world tree, runic mythology and selected Eastern or Zoroastrian images as separate maps of cosmology. The technical study of runes belongs to the next stage." },
        ],
        exercise: "Compare two motifs from different traditions. Record both a similarity and a meaningful cultural difference; notice what each brings to your original question.",
        outcome: "You can compare traditions responsibly and select symbolic material with context, not by mixing disconnected fragments.",
      },
      ru: {
        title: "Традиции мира и сакральные сюжеты", subtitle: "Разные культурные пути — более широкий взгляд",
        introduction: "После отдельного знакомства с Грецией и Египтом сравниваем другие культурные традиции, не стирая различий между ними. Это обзор мифологии и символов, а не заявление об инициации в живые коренные или религиозные традиции.",
        lessons: [
          { title: "Майя и образы Мезоамерики", description: "Пернатый змей, переходы и циклы космоса в культурном контексте. Традиции Майя и Ацтеков рассматриваются раздельно, а не как единое учение." },
          { title: "Славянские сказки и шаманские мотивы", description: "Порог, помощник, путешествие и ответственность героя; отделяем фольклорный источник от поздних духовных трактовок." },
          { title: "Северные и восточные сюжеты", description: "Мировое дерево, скандинавские мифы и отдельные восточные, зороастрийские образы как самостоятельные картины мира. Техника рун — на следующем этапе." },
        ],
        exercise: "Сопоставьте два мотива из разных традиций: назовите сходство и принципиальное культурное различие. Отметьте, что они дают вашему исходному запросу.",
        outcome: "Вы умеете сопоставлять традиции бережно и пользоваться символами с пониманием их контекста.",
      },
      es: {
        title: "Tradiciones del mundo y relatos sagrados", subtitle: "Caminos culturales distintos, una visión más amplia",
        introduction: "Tras estudiar Grecia y Egipto, comparamos otras tradiciones sin confundirlas entre sí. Es una mirada cultural y simbólica, no una iniciación a tradiciones religiosas o indígenas vivas.",
        lessons: [
          { title: "Imaginarios mayas y mesoamericanos", description: "La serpiente emplumada, los ciclos y el cambio en sus contextos culturales; las tradiciones maya y azteca no se consideran idénticas." },
          { title: "Cuentos eslavos y motivos chamánicos", description: "Umbrales, guías y viajes, distinguiendo folclore de interpretaciones posteriores." },
          { title: "Relatos nórdicos y orientales", description: "El árbol del mundo y otros mapas simbólicos. El estudio técnico de runas se realiza en el módulo siguiente." },
        ],
        exercise: "Compara dos motivos de culturas distintas y anota semejanzas y diferencias significativas.",
        outcome: "Sabes comparar relatos simbólicos respetando su contexto cultural.",
      },
    },
  },
  {
    id: "symbols",
    image: "/images/holistic-house/hero-olive-incense.webp",
    sourceIds: ["runes/northern-runes","elements/elemental-magic","elements/water","symbolic/tarot/major-arcana-mysteries","symbolic/artifacts-talismans"],
    copy: {
      en: {
        title: "Runes, Elements, Tarot & Ritual Objects", subtitle: "Turn symbolic literacy into deliberate practice",
        introduction: "This is the toolkit stage. Runes, elemental correspondences, the Major Arcana and artifacts have different lineages, so each is studied as its own symbolic system. Their shared skill is careful interpretation followed by an observable choice.",
        lessons: [
          { title: "Runes: qualities and choices", description: "Explore the Northern rune tradition as a sequence of themes and associations. Interpret a symbol in relation to a question without claiming certain prediction." },
          { title: "Elements: attention and inner balance", description: "Use water, fire, air and earth as metaphors for different modes of experience. Compare the elemental course with its water-focused historical material." },
          { title: "Tarot, mandalas and objects", description: "Study Major Arcana and symbolic maps, then create a mandala or simple object as a reminder of a consciously chosen intention, not a guarantee of external effects." },
        ],
        exercise: "Choose one symbol from a single system. Write what it represents, what it does not establish as fact and one action the symbol prompts you to consider.",
        outcome: "You can work with symbolic tools without confusing systems or assigning the same theme repeatedly to every tradition.",
      },
      ru: {
        title: "Руны, стихии, Таро и ритуальные предметы", subtitle: "От понимания символов — к осмысленной практике",
        introduction: "На этом этапе собираем инструменты. У рун, стихий, Старших Арканов и артефактов разные источники, поэтому каждая система изучается самостоятельно. Общее — внимательная интерпретация и переход к проверяемому решению.",
        lessons: [
          { title: "Руны: качества и выбор", description: "Северная руническая традиция как последовательность тем и ассоциаций. Читаем символ относительно вопроса, не заявляя о гарантированном предсказании." },
          { title: "Стихии: внимание и внутренний баланс", description: "Вода, огонь, воздух и земля как метафоры разных режимов переживания. Сопоставляем общий курс стихий и сохранившийся материал по воде." },
          { title: "Таро, мандалы и предметы", description: "Старшие Арканы и символические карты, затем создание мандалы или простого предмета как напоминания об осознанном намерении, без обещаний внешнего эффекта." },
        ],
        exercise: "Выберите символ из одной системы. Запишите, что он для вас обозначает, чего он не доказывает и какое действие предлагает рассмотреть.",
        outcome: "Вы научились работать с символическими инструментами, не смешивая системы и не повторяя одну тему под разными названиями.",
      },
      es: {
        title: "Runas, elementos, Tarot y objetos rituales", subtitle: "De comprender símbolos a practicar conscientemente",
        introduction: "Las runas, los elementos, los Arcanos Mayores y los objetos rituales tienen linajes distintos. Aquí se estudia cada sistema por separado.",
        lessons: [
          { title: "Runas: cualidades y elecciones", description: "Interpretar símbolos nórdicos como temas de reflexión, sin afirmar una predicción segura." },
          { title: "Elementos: atención y equilibrio", description: "Agua, fuego, aire y tierra como metáforas de distintas experiencias." },
          { title: "Tarot, mandalas y objetos", description: "Arcanos Mayores y creación de un símbolo personal para recordar una intención elegida." },
        ],
        exercise: "Escoge un símbolo, anota lo que representa, lo que no demuestra y una acción que te sugiere explorar.",
        outcome: "Puedes trabajar con herramientas simbólicas sin mezclar sus tradiciones.",
      },
    },
  },
  {
    id: "initiation",
    image: "/library/maya-egregor-gods/media/post-203-1.jpg",
    sourceIds: ["mysteries/initiations","applied/archetypal-attunements","applied/archetypal-therapy/big-figures","applied/imagery-therapy-symboldrama","applied/imagery-therapy/mirrorland","applied/hypnotherapy-regressions","applied/body-psychotherapy-bodynamics"],
    copy: {
      en: {
        title: "Initiation & Inner Archetypal Practice", subtitle: "Move from studying an image to experiencing it",
        introduction: "This stage is about the participant's relationship with an archetypal image, not another list of deities. Historical attunements, guided imagery, symbolic initiation and body awareness can be explored as reflective, voluntary practices.",
        lessons: [
          { title: "Choosing an archetype", description: "Start from a lived question, name the capacities associated with a symbolic figure and observe both attraction and resistance before doing any ritual." },
          { title: "Imagery and inner dialogue", description: "Use guided imagery and methods preserved in the symboldrama and archetypal-therapy archive to notice personal associations and alternative responses." },
          { title: "Ritual, boundaries and integration", description: "A simple symbolic initiation may include intention, meditation, a mandala and reflection. Participation remains optional, and the meaning is tested against everyday experience." },
        ],
        exercise: "Create a short personal imagery practice around one selected archetype. Journal the experience and reflect on what changed in your understanding, not on unverified powers.",
        outcome: "You can structure a safe archetypal experience and integrate it without confusing symbolic insight with a clinical treatment.",
      },
      ru: {
        title: "Инициации и внутренняя архетипическая практика", subtitle: "От изучения образа — к личному переживанию",
        introduction: "Теперь важен не новый перечень богов, а отношение человека к выбранному архетипу. Исторические настройки, образные упражнения, символические инициации и телесное осознавание изучаются как добровольные рефлексивные практики.",
        lessons: [
          { title: "Выбор архетипа", description: "Идём от реального запроса, называем качества символической фигуры и исследуем одновременно притяжение к ним и сопротивление." },
          { title: "Образная работа и внутренний диалог", description: "Направленное воображение, методы из архива символдрамы и архетипической терапии помогают замечать собственные ассоциации и новые способы реагирования." },
          { title: "Ритуал, границы и интеграция", description: "Простая символическая инициация может включать намерение, медитацию, мандалу и рефлексию. Любое участие добровольное, а смысл соотносится с повседневной жизнью." },
        ],
        exercise: "Проведите короткую образную практику с выбранным архетипом. Запишите переживания и новые понимания — без приписывания себе непроверяемых способностей.",
        outcome: "Вы можете выстроить бережную архетипическую практику и осмысленно интегрировать опыт, не подменяя ею клиническую помощь.",
      },
      es: {
        title: "Iniciación y práctica arquetípica interior", subtitle: "Del estudio de una imagen a la experiencia",
        introduction: "Ahora trabajamos la relación personal con una imagen elegida: sintonizaciones históricas, imaginación guiada e iniciación simbólica como prácticas voluntarias de reflexión.",
        lessons: [
          { title: "Elegir un arquetipo", description: "Partir de una pregunta real y explorar las cualidades y resistencias asociadas a una figura simbólica." },
          { title: "Imaginación y diálogo interior", description: "Visualizaciones y fuentes de symboldrama para observar asociaciones y respuestas alternativas." },
          { title: "Ritual, límites e integración", description: "Intención, meditación y mandala con participación voluntaria y reflexión posterior." },
        ],
        exercise: "Realiza una breve práctica de imaginación con un arquetipo y escribe lo que has comprendido, sin atribuirle efectos no comprobados.",
        outcome: "Puedes estructurar una experiencia simbólica con cuidado y sin confundirla con tratamiento médico.",
      },
    },
  },
  {
    id: "application",
    image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
    sourceIds: ["mysteries/archetypes-of-love","mysteries/hypno-love","mysteries/egyptian-hypno-course","mysteries/guidance-of-gods","runes/runes-business","applied/archetypal-therapy/program","applied/business/demiurges-of-creation","applied/sexual-energy-greek-gods","applied/tantric-healing","applied/energy-massage","path/magister-archetypal-therapies"],
    copy: {
      en: {
        title: "Temple Constellations & Integration", subtitle: "Apply the entire journey to life and personal goals",
        introduction: "The final stage combines what was learned — mythic narratives, symbolic interpretation and inner practice — in one clear process for a real question. Relationships, personal resources and goals are possible application contexts, not new isolated programs.",
        lessons: [
          { title: "Clarify the situation", description: "Use the preserved Egyptian eight-step framework to distinguish your present position, desired result, obstacles, resources and a realistic next action." },
          { title: "Archetypal and systemic exploration", description: "Apply a constellation-inspired perspective or imagery exercise to roles, relationships, boundaries, values or a professional goal. The symbols serve reflection rather than diagnosis." },
          { title: "Integrate and choose", description: "Compare the insights with real-world evidence, identify a small action, and decide whether to continue learning or seek relevant professional support for concerns outside this course." },
        ],
        exercise: "Return to the question from Stage 1. Describe what is clearer now, what remains uncertain, one practical step for the next week and how you will check its usefulness.",
        outcome: "You leave with a repeatable method: question → symbolism → lived experience → reflection → concrete choice. Earlier source programs are retained as optional deeper reading.",
      },
      ru: {
        title: "Храмовые расстановки и интеграция", subtitle: "Применяем весь путь к жизни, отношениям и целям",
        introduction: "Последний этап соединяет уже изученное — мифологический сюжет, язык символов и личную практику — в одну понятную процедуру работы с реальным запросом. Отношения, ресурсы и цели становятся областями применения, а не новыми отдельными курсами.",
        lessons: [
          { title: "Прояснить ситуацию", description: "Воспользоваться сохранённой египетской восьмишаговой моделью: исходная точка, желаемый результат, ограничения, доступные ресурсы и реалистичное действие." },
          { title: "Архетипическое и системное исследование", description: "Расстановочный взгляд или образное упражнение применяются к ролям, отношениям, границам, ценностям либо рабочей цели. Символы помогают размышлять, но не ставят диагноз." },
          { title: "Интеграция и личный выбор", description: "Проверить идеи о реальность, выбрать небольшой шаг и определить, где достаточно самостоятельной практики, а где нужна помощь другого специалиста." },
        ],
        exercise: "Вернитесь к запросу из первого этапа. Запишите, что стало яснее, что осталось неизвестным, одно действие на неделю и способ оценить его пользу.",
        outcome: "У вас остаётся повторяемая схема: запрос → символ → переживание → осмысление → конкретное решение. Старые учебные курсы доступны для дальнейшего изучения.",
      },
      es: {
        title: "Constelaciones del templo e integración", subtitle: "Aplicar el recorrido a la vida y a los objetivos",
        introduction: "La etapa final reúne mitos, herramientas simbólicas y experiencia interior para explorar una pregunta real. Relaciones, recursos y objetivos son contextos de aplicación, no programas separados.",
        lessons: [
          { title: "Aclarar la situación", description: "Usar el modelo egipcio de ocho pasos: situación actual, resultado deseado, obstáculos, recursos y acción realista." },
          { title: "Exploración arquetípica y sistémica", description: "Utilizar imágenes o una mirada de constelaciones para reflexionar sobre vínculos, roles, valores y objetivos sin realizar diagnósticos." },
          { title: "Integrar y elegir", description: "Comparar las ideas con la realidad, escoger un paso pequeño y reconocer cuándo se necesita ayuda profesional apropiada." },
        ],
        exercise: "Vuelve a la pregunta del módulo 1. Escribe qué has aclarado, qué sigue incierto y una acción concreta para la próxima semana.",
        outcome: "Terminas con un método repetible: pregunta → símbolo → experiencia → reflexión → decisión.",
      },
    },
  },
];

export const templeLegacyAnchors: Record<string, string> = {
  mysteries: "greek",
  symbolic: "symbols",
  applied: "initiation",
  path: "application",
  traditions: "traditions",
  runes: "symbols",
  elements: "symbols",
};

export function validateTempleCurriculum() {
  const ids = new Set<string>();
  const sources = new Set<string>();
  for (const stage of templeStages) {
    if (ids.has(stage.id)) throw new Error("Duplicate Temple Studies stage: " + stage.id);
    ids.add(stage.id);
    for (const id of stage.sourceIds) {
      if (sources.has(id)) throw new Error("Duplicate Temple Studies source: " + id);
      sources.add(id);
    }
    for (const locale of ["en", "ru", "es"] as const) {
      if (stage.copy[locale].lessons.length !== 3) throw new Error("Incomplete " + stage.id + "/" + locale);
    }
  }
}
