export type BiographySection = {
  heading: string
  paragraphs?: readonly string[]
  items?: readonly string[]
}

type AboutContent = {
  meta: { title: string; description: string }
  eyebrow: string
  photoAlt: string
  intro: readonly string[]
  sections: readonly BiographySection[]
  explore: { heading: string; links: readonly { label: string; href: string }[] }
  cabinet: { heading: string; body: string; prompt: string; action: string; href: string }
}

export const aboutBiography: Record<"en" | "ru", AboutContent> = {
  en: {
    meta: {
      title: "About Andy — Holistic House",
      description: "A personal introduction to Andy: his path through depth-oriented personal work, body awareness, archetypes, temple studies, and Reiki traditions.",
    },
    eyebrow: "Let me introduce myself",
    photoAlt: "Andy at an antique writing desk in a library",
    intro: [
      "Let me introduce myself.",
      "I’m Andy. I facilitate personal and group practices shaped by archetypes, imagery, body awareness, and temple traditions.",
      "Raised in Ukraine but living internationally.",
    ],
    sections: [
      {
        heading: "Experience",
        items: [
          "24 years of facilitating group and personal growth work, since 2002.",
          "22 years of exploring and facilitating transpersonal, temple-based practices since 2004, including Tantra Reiki, Kundalini Reiki, and Runic Reiki traditions.",
          "15 years of experience with Family and Business Constellations, since 2011.",
        ],
      },
      {
        heading: "Specializations / Studies",
        items: [
          "1. Dreams Alive / Guided Imagery Work — Exploring tensions and Inner Child experiences through imagery and unconscious material.",
          "2. Body-oriented Work — Exploring early developmental and Inner Child patterns through body awareness and conscious, consent-based touch.",
          "3. Archetypal Temple Work — Exploring personal and business goals through systemic constellations and temple archetypes.",
          "4. Taoist Alchemy — Exploring mind-body experiences through traditional energetic and symbolic models, including my educational framework of Psychic Homeopathy.",
        ],
      },
      {
        heading: "Tantric Workshops",
        paragraphs: [
          "Since 2004, I have taken part in tantric workshops across different schools and traditions worldwide. Among the approaches I experienced over the years, the ISTA approach was one of the most fascinating and transformative for me.",
          "Though my primary interest is depth-oriented personal work.",
        ],
      },
      {
        heading: "Guided Imagery",
        paragraphs: [
          "A central part of my studies has been Guided Affective Imagery (Hanscarl Leuner).",
          "This approach creates a bridge between Jungian depth traditions and Freudian psychoanalytic approaches.",
        ],
      },
      {
        heading: "Body-oriented Work",
        paragraphs: [
          "As for bodywork, my studies were influenced by European body-oriented approaches and the Bodynamic Analysis approach.",
          "These approaches explore connections between early developmental experiences and patterns held in the body.",
        ],
      },
      {
        heading: "Temple Studies",
        paragraphs: [
          "One of the biggest influences for me has been the study of temple traditions.",
          "This includes Greek Temple Mysteries, the mysteries of Dionysus and Demeter, and Egyptian temple traditions.",
          "These studies have deepened my understanding of archetypes and transpersonal flow, which I have explored and shared internationally for 20 years.",
        ],
      },
      {
        heading: "Reiki Initiations",
        paragraphs: [
          "A starting point for learning to feel this flow for me was a series of Reiki initiations, including Tantra Reiki, a lineage described within its tradition as connected to Osho-inspired teachings.",
        ],
      },
    ],
    explore: {
      heading: "Explore my work",
      links: [
        { label: "Book", href: "https://designrr.page/?id=377444&token=639498968&h=5264" },
        { label: "Remedies", href: "/en/homeopathy" },
        { label: "Services", href: "/en/services" },
      ],
    },
    cabinet: {
      heading: "Client Cabinet",
      body: "Your personal Cabinet is available through the private link provided to you.",
      prompt: "Need your link?",
      action: "Contact Andy",
      href: "https://t.me/AndyTherapist",
    },
  },
  ru: {
    meta: {
      title: "Обо мне — Andy и Holistic House",
      description: "Личный рассказ Andy о пути в глубинной личной работе, осознавании тела, архетипах, храмовых традициях и Reiki.",
    },
    eyebrow: "Я хочу представиться",
    photoAlt: "Andy за старинным письменным столом в библиотеке",
    intro: [
      "Я хочу представиться.",
      "Меня зовут Andy. Я веду личные и групповые практики, в которых соединяются архетипы, работа с образами, осознавание тела и храмовые традиции.",
      "Я вырос в Украине, а затем жил в разных странах мира.",
    ],
    sections: [
      {
        heading: "Опыт",
        items: [
          "24 года веду групповую и личную работу, связанную с личностным ростом, — с 2002 года.",
          "22 года исследую и веду трансперсональные практики, основанные на храмовых традициях, — с 2004 года; среди них традиции Tantra Reiki, Kundalini Reiki и Runic Reiki.",
          "15 лет знаком с семейными и бизнес-расстановками — с 2011 года.",
        ],
      },
      {
        heading: "Специализации / обучение",
        items: [
          "1. Dreams Alive / работа с направленными образами — исследование внутренних напряжений и опыта внутреннего ребёнка через образы и бессознательный материал.",
          "2. Телесно-ориентированная работа — исследование ранних паттернов развития и опыта внутреннего ребёнка через осознавание тела и осознанное прикосновение с согласия.",
          "3. Архетипическая храмовая работа — исследование личных и бизнес-целей через системные расстановки и храмовые архетипы.",
          "4. Даосская алхимия — исследование связи внутреннего опыта и телесных ощущений через традиционные энергетические и символические модели, включая мою образовательную концепцию Psychic Homeopathy.",
        ],
      },
      {
        heading: "Тантрические воркшопы",
        paragraphs: [
          "С 2004 года я участвовал в тантрических воркшопах разных школ и традиций по всему миру. Среди подходов, с которыми я познакомился за эти годы, подход ISTA оказался для меня одним из самых увлекательных и преобразующих.",
          "При этом мой главный интерес — глубинная личная работа.",
        ],
      },
      {
        heading: "Guided Affective Imagery",
        paragraphs: [
          "Одна из центральных частей моего обучения — Guided Affective Imagery (Hanscarl Leuner).",
          "Этот подход создаёт мост между юнгианской глубинной традицией и фрейдистскими психоаналитическими подходами.",
        ],
      },
      {
        heading: "Телесно-ориентированная работа",
        paragraphs: [
          "В телесной работе на меня повлияли европейские телесно-ориентированные подходы и подход Bodynamic Analysis.",
          "Эти подходы исследуют связи между ранним опытом развития и паттернами, которые удерживаются в теле.",
        ],
      },
      {
        heading: "Изучение храмовых традиций",
        paragraphs: [
          "Одним из самых сильных влияний для меня стало изучение храмовых традиций.",
          "Сюда входят греческие храмовые мистерии, мистерии Диониса и Деметры, а также египетские храмовые традиции.",
          "Эти исследования углубили моё понимание архетипов и трансперсонального потока, которые я изучаю и которыми делюсь в разных странах уже 20 лет.",
        ],
      },
      {
        heading: "Посвящения Reiki",
        paragraphs: [
          "Отправной точкой, с которой я начал учиться чувствовать этот поток, стала серия посвящений Reiki, включая Tantra Reiki — линию, которую в её традиции описывают как связанную с учениями, вдохновлёнными Osho.",
        ],
      },
    ],
    explore: {
      heading: "Исследуйте мою работу",
      links: [
        { label: "Книга", href: "https://designrr.page/?id=367554&token=1057485987&h=4958" },
        { label: "Препараты", href: "/ru/homeopathy" },
        { label: "Услуги", href: "/ru/services" },
      ],
    },
    cabinet: {
      heading: "Кабинет клиента",
      body: "Ваш личный кабинет доступен по индивидуальной ссылке, которую вы получили от Andy.",
      prompt: "Нужна ссылка?",
      action: "Связаться с Andy",
      href: "https://t.me/AndyTherapist",
    },
  },
}
