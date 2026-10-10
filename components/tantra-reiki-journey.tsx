import type { PublicLocale } from "@/lib/public-locales";
import tantraReikiArchive from "@/data/academy/tantra-reiki-full.generated.json";
import originalRussianEnglishTranslation from "@/data/academy/tantra-reiki-ru-en.generated.json";

// Stage descriptions and attunements are editorially aligned with the captured
// EN/RU PsiTrends source (data/academy/tantra-reiki-full.generated.json).
// Historical EN/RU attunement assignments differ at stages 2–3;
// present Andrey's full original RU author sequence in both EN and RU,
// while preserving the original alternative EN assignments in the full archive.
const stages = [
  {
    "en": {
      "title": "Spring of Life",
      "subtitle": "Awakening sensitivity",
      "intro": "The first step invites you to experience the Tantra Reiki flow through the body: gentle sensations, pleasure, vitality and a more present connection with yourself and a partner.",
      "att": [
        "Sexual energy activation",
        "Attractiveness · qualities of charisma",
        "Situation activation"
      ],
      "practice": "Learn to notice the flow and practise respectfully with a partner."
    },
    "ru": {
      "title": "Родник жизни",
      "subtitle": "Пробуждение чувствительности",
      "intro": "Первая ступень раскрывает телесные ощущения и контакт с жизненностью. В авторском описании это «родник Жизни»: мягкое удовольствие, пробуждение чувств и более живой контакт с собой и партнёром.",
      "att": [
        "Активация сексуальной энергии",
        "Привлекательность · качества харизмы",
        "Гармонизация ситуации"
      ],
      "practice": "Учимся ощущать поток и практикуем с партнёром, соблюдая границы и согласие."
    },
    "es": {
      "title": "Manantial de vida",
      "subtitle": "Despertar de la sensibilidad",
      "intro": "La primera etapa invita a sentir el flujo mediante el cuerpo, la vitalidad, la sensibilidad y una conexión más presente con uno mismo y con otra persona.",
      "att": [
        "Activación de energía sexual",
        "Atractivo y carisma",
        "Armonización de situaciones"
      ],
      "practice": "Aprender a reconocer el flujo y practicar con una pareja con consentimiento."
    }
  },
  {
    "en": {
      "title": "Fire of Life",
      "subtitle": "Energy, strength and confidence",
      "intro": "The second level explores the image of an inner fire. The original course connects this step with gathering energy, feeling more personally present and working symbolically with limitations and material goals.",
      "att": [
        "Accumulation of energy",
        "Money Magnet",
        "Burn Away Complexes"
      ],
      "practice": "Create your first simple Tantra Reiki mandala and explore symbolic exercises for personal focus and confidence."
    },
    "ru": {
      "title": "Жар жизни",
      "subtitle": "Энергия, сила и уверенность",
      "intro": "Здесь пробуждается «Жар Жизни»: ощущение страсти, расширения присутствия и силы. Практика направлена на работу с внутренними ограничениями и символическим образом собственного энергетического ресурса.",
      "att": [
        "Накопление энергии",
        "Денежный магнит",
        "Сжечь комплексы"
      ],
      "practice": "Начинаем составлять простые тантрические мандалы."
    },
    "es": {
      "title": "Fuego de vida",
      "subtitle": "Energía y confianza",
      "intro": "Esta etapa explora la imagen del fuego interior, la pasión, la presencia y el trabajo simbólico con los límites personales.",
      "att": [
        "Acumulación de energía",
        "Imán del dinero",
        "Disolver complejos"
      ],
      "practice": "Comenzar a crear mandalas sencillos de Tantra Reiki."
    }
  },
  {
    "en": {
      "title": "Ocean of Unity",
      "subtitle": "Attunement with the world",
      "intro": "The image of this level is the ocean: moving beyond the feeling of being separate and learning to notice connection with a larger field. It introduces the themes of unity, clearing and favourable movement.",
      "att": [
        "Attunement",
        "Luck · acceleration of time",
        "Talisman"
      ],
      "practice": "Reflect on your experiences, practise attunement with a partner, and develop a Tantra Reiki mandala."
    },
    "ru": {
      "title": "Океан единства",
      "subtitle": "Сонастройка с миром",
      "intro": "«Вы уже не рыбка в океане — вы и есть этот Океан». Третья ступень посвящена переживанию связи с окружающим пространством, сонастройке и работе с намерением.",
      "att": [
        "Сонастройка",
        "Удача · ускорение времени",
        "Талисман"
      ],
      "practice": "Готовим короткие письменные наблюдения и тантрические мандалы."
    },
    "es": {
      "title": "Océano de unidad",
      "subtitle": "Sintonía con el mundo",
      "intro": "La imagen del océano invita a explorar una conexión más amplia con el entorno, la sintonía y el trabajo con la intención.",
      "att": [
        "Sintonización",
        "Suerte · sentido del momento",
        "Talismán"
      ],
      "practice": "Escribir reflexiones breves y crear mandalas tántricos."
    }
  },
  {
    "en": {
      "title": "The Vertical of Love",
      "subtitle": "Archetypes and connection",
      "intro": "This level turns to the image of a vertical connection with the worlds of archetypes and the Gods of Love. The Astral Child is described in the tradition as a symbolic shared field of a couple or group.",
      "att": [
        "Enlightenment",
        "Gods of Love",
        "Astral Child · shared couple or group field"
      ],
      "practice": "Begin supervised work on Tantra Reiki mandalas for individual requests."
    },
    "ru": {
      "title": "Вертикаль любви",
      "subtitle": "Архетипы и соединение",
      "intro": "На четвёртой ступени появляется «Вертикаль»: символическая связь с мирами богов и архетипами Любви. Важной темой становится более осознанный, тонкий контакт с другим человеком.",
      "att": [
        "Боги любви",
        "Просветление",
        "Астральный ребёнок · общее поле пары"
      ],
      "practice": "Начинаем работу с индивидуальными запросами через тантрические мандалы."
    },
    "es": {
      "title": "La vertical del amor",
      "subtitle": "Arquetipos y conexión",
      "intro": "Esta etapa introduce una conexión simbólica con los arquetipos de amor y la idea de un campo compartido por una pareja o grupo.",
      "att": [
        "Dioses del amor",
        "Iluminación",
        "Niño astral · campo compartido"
      ],
      "practice": "Iniciar trabajo supervisado con mandalas para solicitudes personales."
    }
  },
  {
    "en": {
      "title": "Inner Light",
      "subtitle": "The source within",
      "intro": "Instead of imagining a current arriving from outside, the fifth level explores light arising from within. Its themes are creativity, personal energy and the symbolic opening of energy centres.",
      "att": [
        "Inner Light"
      ],
      "practice": "Explore charging symbolic Tantra Reiki artifacts with personal supervision."
    },
    "ru": {
      "title": "Внутренний свет",
      "subtitle": "Источник внутри",
      "intro": "«Это не поток, в котором вы купаетесь, это поток, в котором вы купаете Вселенную». Ступень обращается к внутреннему источнику силы, творческому потенциалу и раскрытию энергетических центров.",
      "att": [
        "Внутренний Свет"
      ],
      "practice": "Изучаем создание и настройку тантрических артефактов с супервизией."
    },
    "es": {
      "title": "Luz interior",
      "subtitle": "La fuente interna",
      "intro": "La quinta etapa explora la imagen de una luz que surge desde dentro, vinculada a la creatividad y a los centros energéticos simbólicos.",
      "att": [
        "Luz interior"
      ],
      "practice": "Explorar artefactos simbólicos con supervisión."
    }
  },
  {
    "en": {
      "title": "Worlds of Unity",
      "subtitle": "Rest and integration",
      "intro": "The sixth level uses the imagery of deep stillness and eternity. The original description speaks of calm, inner support, balance and the experience of being part of a greater whole.",
      "att": [
        "Worlds of Unity"
      ],
      "practice": "Design a clear outline for a personal Tantra Reiki practice session."
    },
    "ru": {
      "title": "Миры единства",
      "subtitle": "Покой и интеграция",
      "intro": "Образ шестой ступени — Вечность: мир как будто замирает, появляется ощущение глубокого покоя и общего единения. В описании настройки выделены поддержка, подпитка, стабилизация и баланс.",
      "att": [
        "Миры Единства"
      ],
      "practice": "Разрабатываем структуру собственной практики или индивидуального сеанса."
    },
    "es": {
      "title": "Mundos de unidad",
      "subtitle": "Calma e integración",
      "intro": "Esta etapa utiliza la imagen del silencio y la eternidad, con temas de calma, apoyo interior e integración.",
      "att": [
        "Mundos de unidad"
      ],
      "practice": "Diseñar una estructura de práctica o sesión personal."
    }
  },
  {
    "en": {
      "title": "Illumination",
      "subtitle": "Clarity of attention",
      "intro": "The seventh level shifts toward the experience of a clearer and more focused awareness. In the tradition, attention itself becomes central to the work of harmonising experience.",
      "att": [
        "Illumination"
      ],
      "practice": "Practise with feedback, document observations and collect testimonials only with consent."
    },
    "ru": {
      "title": "Озарение",
      "subtitle": "Ясность внимания",
      "intro": "На седьмой ступени автор описывает состояние наполненного светом сознания: больше осознанности, ясности и собранности. Главным инструментом работы становится само внимание.",
      "att": [
        "Озарение"
      ],
      "practice": "Ведём практику, собираем обратную связь и фиксируем наблюдения участников с их согласия."
    },
    "es": {
      "title": "Iluminación",
      "subtitle": "Claridad de atención",
      "intro": "La séptima etapa enfatiza la claridad, la consciencia y el enfoque de la atención.",
      "att": [
        "Iluminación"
      ],
      "practice": "Practicar con comentarios y registrar observaciones con consentimiento."
    }
  },
  {
    "en": {
      "title": "Creation of the World",
      "subtitle": "The creative impulse",
      "intro": "This stage explores a move from merely sensing or harmonising the flow to actively shaping creative intentions. The original text describes it as an impulse of creation.",
      "att": [
        "Creation of the World"
      ],
      "practice": "Create a personal symbolic ritual and write an educational reflection or article."
    },
    "ru": {
      "title": "Созидание мира",
      "subtitle": "Творческий импульс",
      "intro": "«Ты уже не только гармонизируешь миры, но и созидаешь их своим вниманием». Ступень посвящена творческому намерению, образу созидания и авторскому ритуалу.",
      "att": [
        "Созидание Мира"
      ],
      "practice": "Составляем собственный символический ритуал и пишем учебную заметку."
    },
    "es": {
      "title": "Creación del mundo",
      "subtitle": "Impulso creativo",
      "intro": "Se explora el paso desde sentir o armonizar hacia la formación consciente de intenciones creativas.",
      "att": [
        "Creación del mundo"
      ],
      "practice": "Diseñar un ritual simbólico personal y escribir una reflexión."
    }
  },
  {
    "en": {
      "title": "Fullness of Unity",
      "subtitle": "Integration and mastery",
      "intro": "The ninth level brings together the preceding images and practices. Its central idea is the experience of inner fullness, strength, balance and a unified perspective.",
      "att": [
        "Fullness of Unity"
      ],
      "practice": "Master-level initiation and final assessment are described in the historical programme; current certification terms should be confirmed directly."
    },
    "ru": {
      "title": "Полнота единства",
      "subtitle": "Интеграция и мастерство",
      "intro": "На девятой ступени соединяются разные пласты опыта. Автор описывает это как внутреннюю полноту, согласованность, силу и баланс — завершение пути девяти ступеней.",
      "att": [
        "Полнота Единства"
      ],
      "practice": "Итоговая практика и мастерская аттестация описаны в исторической программе; актуальные условия уточняются отдельно."
    },
    "es": {
      "title": "Plenitud de unidad",
      "subtitle": "Integración y maestría",
      "intro": "La última etapa reúne las experiencias anteriores en una imagen de plenitud, fuerza y equilibrio interior.",
      "att": [
        "Plenitud de unidad"
      ],
      "practice": "La iniciación y evaluación de maestría figuran en el programa histórico; confirmar condiciones actuales."
    }
  }
] as const;


/**
 * A distinct real photograph for each level, selected from the original
 * PsiTrends Tantra Reiki source archive. No synthetic diagrams or AI pictures.
 * These are illustrative archive photographs, not a claim that the pictured
 * attendees are taking the precise initiation described alongside the image.
 */
const levelPhotos = [
  { src: tantraReikiArchive.images.ru[17], description: "People sharing a Tantra Reiki gathering", archive: true, position: "center 48%" },
  { src: tantraReikiArchive.images.ru[18], description: "A real moment of connection at a Tantra event", archive: true, position: "center 48%" },
  { src: tantraReikiArchive.images.ru[19], description: "A group exploring embodied practice", archive: true, position: "center 50%" },
  { src: tantraReikiArchive.images.ru[20], description: "Tantra workshop participants together", archive: true, position: "center 50%" },
  { src: tantraReikiArchive.images.ru[21], description: "Mindful connection in a group practice", archive: true, position: "center 47%" },
  { src: tantraReikiArchive.images.ru[22], description: "Personal experience shared at a gathering", archive: true, position: "center 52%" },
  { src: tantraReikiArchive.images.ru[4], description: "Participants of an original Tantra event", archive: true, position: "center 50%" },
  { src: tantraReikiArchive.images.ru[6], description: "An original Tantra gathering and its participants", archive: true, position: "center 48%" },
  { src: tantraReikiArchive.images.ru[8], description: "Tantra practice in a real group setting", archive: true, position: "center 50%" }
] as const;

/**
 * The actual paragraphs written by Andrey, not shortened stage summaries.
 * Stable block indices refer to the verbatim PsiTrends RU snapshot (2026-10-07).
 * The English translation preserves its 1:1 block order and is rendered here.
 * The entire RU original and full translated transcript remain in the archive.
 */
/**
 * Spanish translations of the original Russian stage notes (not short stage summaries).
 * Paragraph groups correspond 1:1 to authorStageBlockIndices below.
 * The Russian archive remains the source of truth.
 */
const spanishAuthorDescriptions: string[][] = [
  [
    "En estas energías, el mundo que te rodea se vuelve lleno de sabor, fluido, y una agradable ola de placer comienza a recorrer tu cuerpo.",
    "Es como si abrieras un manantial de energía de Vida que, según la imagen de esta tradición, te limpia suavemente y despierta tu fuerza interior.",
    "Un placer suave y extático se extiende por todo el cuerpo y empieza a despertar sentimientos y emociones."
  ],
  [
    "Aquí despertamos el Fuego de la Vida. La pasión. Tu energía comienza a arder como una llama, llenando el espacio que te rodea y quemando simbólicamente los miedos, la parálisis y las limitaciones.",
    "La energía de la vida no solo entra en ti: tú mismo eres la Vida y floreces en toda su plenitud."
  ],
  [
    "En la tercera etapa, el espacio empieza a derretirse. Comienzas a sentirte unido a todo el mundo que te rodea.",
    "Ya no eres un pez en el océano: tú eres el Océano.",
    "Es un estado sorprendente: en el flujo de Tantra Reiki no solo redistribuyes la energía dentro de ti, sino que juegas con las energías de todo el espacio que te rodea."
  ],
  [
    "En la cuarta etapa comienzas a sentir la Vertical. No solo el mundo presente, sino también los mundos que están por encima de él, los Mundos de los Dioses.",
    "El flujo de energía comienza a descender de los Planos Divinos, absorbiendo las cualidades de los Dioses del Amor.",
    "En este flujo te unes a las Grandes Fuerzas del mundo, y tu danza tántrica, tu vida, recibe un apoyo adicional.",
    "Tu danza de la vida se vuelve refinada, consciente y delicada."
  ],
  [
    "En la quinta etapa descubres la Fuente de la Fuerza en tu interior.",
    "No es una corriente en la que tú te bañas: es una Corriente en la que bañas al Universo, irradiando desde dentro.",
    "Esta Luz interior no conoce obstáculos ni límites.",
    "Puede encenderse e iluminar todas las facetas de la realidad. Aprendemos a abrir esta luz interior infinita."
  ],
  [
    "En la sexta etapa entramos en un estado de Eternidad.",
    "El mundo queda inmóvil y te elevas sin fin hacia una zona de unión universal.",
    "La corriente te lleva hacia los mundos de la Bienaventuranza Eterna."
  ],
  [
    "En la séptima etapa la conciencia se llena de luz.",
    "Se activa una corriente adicional de alta frecuencia hacia la conciencia. Aumenta el nivel de consciencia.",
    "Basta con dirigir tu atención para iniciar, en el lenguaje simbólico de esta tradición, un proceso de armonía y limpieza."
  ],
  [
    "Se activa el Impulso Creativo en el nivel de los centros superiores.",
    "Ya no solo armonizas los mundos: también los creas con tu atención."
  ],
  [
    "En la novena etapa se manifiesta una plenitud especial. Unes dentro de ti distintas capas de la realidad.",
    "En esa unión comienza a aparecer un equilibrio y una armonía generales.",
    "Las últimas tres etapas recuerdan los estados de los Dioses: Brahma, Shiva y Vishnu.",
    "Las etapas 7–9 se asemejan a las etapas 4–6, pero en un nivel más alto."
  ]
];

const authorStageBlockIndices = [
  [75, 76, 77],
  [86, 87],
  [89, 90, 91],
  [99, 100, 101, 102],
  [104, 105, 106, 107],
  [121, 122, 123],
  [136, 137, 138],
  [140, 141],
  [143, 144, 145, 146],
] as const;

function originalAuthorDescription(locale: PublicLocale, levelIndex: number): string[] {
  if (locale === "es") return spanishAuthorDescriptions[levelIndex];
  return authorStageBlockIndices[levelIndex].map((sourceIndex) =>
    locale === "ru"
      ? tantraReikiArchive.blocks.ru[sourceIndex].text
      : originalRussianEnglishTranslation.blocks[sourceIndex].text
  );
}

const levelApplications: Record<PublicLocale, string[]> = {
  en: [
    "Recognise how bodily awareness, intention and consent shape the three first-level attunements.",
    "Understand the symbolic themes of energy accumulation, personal limitations and material intentions.",
    "See how attunement, the talisman and the image of luck relate to connection and intention.",
    "Read the Gods of Love and Astral Child as symbolic images of archetypes and shared experience.",
    "Distinguish the idea of receiving a flow from discovering an inner source of creative energy.",
    "Explore stillness, balance and unity as symbolic experiences rather than promised outcomes.",
    "Develop a steadier method of attention and learn to interpret practice feedback responsibly.",
    "Understand the creative impulse and the difference between a symbolic ritual and a guaranteed outcome.",
    "Connect the themes of all nine levels and understand the traditional meaning of master-level work."
  ],
  ru: [
    "Поймёте связь телесного внимания, намерения и согласия с тремя настройками первой ступени.",
    "Разберёте символические темы накопления энергии, внутренних ограничений и материальных намерений.",
    "Узнаете, как сонастройка, талисман и образ удачи связаны с контактом и намерением.",
    "Исследуете образы Богов Любви и Астрального Ребёнка как символы архетипов и совместного опыта.",
    "Различите идеи принимаемого потока и внутреннего источника творческой энергии.",
    "Разберёте символические образы покоя, устойчивости и единства без обещаний результата.",
    "Научитесь удерживать ясное внимание и осмыслять обратную связь по практике.",
    "Поймёте образ творческого импульса и отличие символического ритуала от гарантии результата.",
    "Свяжете темы всех девяти ступеней и разберётесь в традиционном смысле мастерского уровня."
  ],
  es: [
    "Comprender cómo la atención corporal, la intención y el consentimiento orientan las primeras sintonizaciones.",
    "Conocer los temas simbólicos de la acumulación de energía, los límites y las intenciones materiales.",
    "Comprender la relación de la sintonización, el talismán y la imagen de la suerte con la intención.",
    "Explorar los Dioses del Amor y el Niño Astral como símbolos de arquetipos y vínculos compartidos.",
    "Distinguir la idea de recibir un flujo de la de descubrir una fuente creativa interior.",
    "Explorar la quietud, el equilibrio y la unidad como imágenes simbólicas, no resultados garantizados.",
    "Aprender a sostener la atención y a interpretar comentarios sobre la práctica.",
    "Comprender el impulso creativo y la diferencia entre un ritual simbólico y una promesa de resultados.",
    "Integrar los temas de las nueve etapas y comprender el sentido tradicional de la maestría."
  ]
};

const ui = {
  en: { eyebrow: "The nine levels", heading: "A journey, one level at a time", subtitle: "Explore nine progressive initiations through grounded exercises, partner connection, mandalas and personal practice.", level: "Level", settings: "Traditional attunements", application: "What you will learn", details: "Explore attunements & practical exercises", original: "Andrey’s perspective", practice: "Practical assignment", previous: "Previous level", next: "Next level", overview: "Course overview", photoContext: "Real gathering photographs illustrate each level’s theme; they do not depict its specific initiation.", final: "Explore the original materials", phases: ["Foundation · levels 1–3", "Deepening · levels 4–6", "Master path · levels 7–9"], notice: "These are traditional names and symbolic practices, not promises of medical or financial outcomes." },
  ru: { eyebrow: "Девять ступеней", heading: "Одна ступень — одна глава пути", subtitle: "Девять ступеней — от телесной чувствительности и контакта до работы с архетипами, мандалами и собственной практикой.", level: "Ступень", settings: "Настройки ступени", application: "Что вы освоите", details: "Раскрыть настройки и задания", original: "Авторское описание Андрея · без сокращений", practice: "Практическое задание", previous: "Предыдущая ступень", next: "Следующая ступень", overview: "Обзор программы", photoContext: "Реальные фотографии встреч иллюстрируют темы ступеней, но не изображают конкретные посвящения.", final: "Перейти к материалам", phases: ["Основа · ступени 1–3", "Углубление · ступени 4–6", "Мастерский путь · ступени 7–9"], notice: "Названия настроек и образы относятся к традиции практики, а не являются медицинскими или финансовыми гарантиями." },
  es: { eyebrow: "Nueve etapas", heading: "Un camino, una etapa a la vez", subtitle: "Nueve etapas progresivas de práctica corporal, conexión y trabajo simbólico.", level: "Etapa", settings: "Sintonizaciones", application: "Qué aprenderás", details: "Ver sintonizaciones y ejercicios", original: "Texto original de Andrey · traducción del ruso", practice: "Práctica", previous: "Etapa anterior", next: "Siguiente etapa", overview: "Resumen del programa", photoContext: "Fotos de encuentros reales ilustran los temas; no representan iniciaciones específicas.", final: "Ver materiales originales", phases: ["Base · etapas 1–3", "Profundización · etapas 4–6", "Maestría · etapas 7–9"], notice: "Los nombres son prácticas simbólicas de una tradición, no garantías médicas o económicas." },
} as const;

export function TantraReikiJourney({locale}:{locale:PublicLocale}) {
  const c=ui[locale];
  return (
    <div className="tantra-journey">
      <div className="tantra-journey__intro">
        <p className="homeopathy-kicker">{c.eyebrow}</p>
        <h2 id="tantra-level-summary-title">{c.heading}</h2>
        <p>{c.subtitle}</p>
        <p className="tantra-journey__photo-context">{c.photoContext}</p>
        <div className="tantra-journey__phase-links">
          {[0,1,2].map((group) => <a href={"#tantra-level-" + (group * 3 + 1)} key={group}>{c.phases[group]} <span aria-hidden="true">↗</span></a>)}
        </div>
      </div>
      {stages.map((stage, i) => {
        const n=i+1;
        const copy=stage[locale];
        const phase=Math.floor(i/3);
        const photo = levelPhotos[i];
        return (
          <article className={"tantra-journey__level tantra-journey__level--phase-"+phase} id={"tantra-level-"+n} key={n} aria-labelledby={"tantra-heading-"+n}>
            <figure className="tantra-journey__photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.description} style={{ objectPosition: photo.position }} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
            </figure>
            <div className="tantra-journey__level-heading">
              <div className="tantra-journey__chapter">
                <strong className="tantra-journey__level-number">{c.level} {String(n).padStart(2,"0")} <small>/ 09</small></strong>
                <span>{c.phases[phase]}</span>
              </div>
              <h3 id={"tantra-heading-"+n}>{copy.title}</h3>
              <p className="tantra-journey__subtitle">{copy.subtitle}</p>
            </div>
            
            <div className="tantra-journey__details">
              
              <div className="tantra-journey__author-text" lang={locale}>
                <h4>{c.original}</h4>
                {originalAuthorDescription(locale, i).map((paragraph, j) => (
                  <p key={j}>{paragraph}</p>
                ))}
              </div>
              <details className="tantra-journey__extras">
                <summary><span>{c.details}</span><span className="tantra-journey__extras-indicator" aria-hidden="true">+</span></summary>
                <div className="tantra-journey__extras-body">
                  <div className="tantra-journey__application"><strong>{c.application}</strong><p>{levelApplications[locale][i]}</p></div>
                  <div className="tantra-journey__settings">
                    <h4>{c.settings}</h4>
                    <ul>{copy.att.map((att) => <li key={att}>{att}</li>)}</ul>
                  </div>
                  <div className="tantra-journey__practice">
                    <strong>{c.practice}</strong>
                    <p>{copy.practice}</p>
                  </div>
                </div>
              </details>
              <div className="tantra-journey__actions">
                {n>1 ? <a href={"#tantra-level-"+(n-1)} aria-label={c.previous+" "+(n-1)}>← {c.previous}</a> : <a href="#tantra-course-hero-title">↑ {c.overview}</a>}
                <a className="tantra-journey__next" href={n<9?"#tantra-level-"+(n+1):(locale === "en" ? "#english-guided-meditations-tantra-reiki" : "#tantra-testimonials")}>{n<9?c.next:c.final} →</a>
              </div>
            </div>
          </article>
        );
      })}
      <p className="tantra-journey__notice">{c.notice}</p>
    </div>
  );
}
