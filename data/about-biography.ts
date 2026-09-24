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
      description: "A personal introduction to Andy: his path through depth psychology, bodywork, archetypes, temple studies, and Reiki traditions.",
    },
    eyebrow: "Let me introduce myself",
    photoAlt: "Andy at an antique writing desk in a library",
    intro: [
      "Let me introduce myself.",
      "I’m Andy, a Jungian-oriented specialist and facilitator of archetypal practices.",
      "Raised in Ukraine but living for 20 years worldwide.",
    ],
    sections: [
      {
        heading: "Experience",
        items: [
          "24 years of facilitating group and personal growth programs, since 2002.",
          "22 years of experience facilitating transpersonal temple-based practices since 2004. Master Teacher of Tantra Reiki, Kundalini Reiki, and Runic Reiki.",
          "15 years of experience facilitating Family and Business Constellations, since 2011.",
        ],
      },
      {
        heading: "Specializations / Studies",
        items: [
          "1. Dreams Alive Psychotherapy — Healing tensions and Inner Child traumas through unconscious imagery.",
          "2. Body-oriented Psychotherapy — Healing early Inner Child traumas through conscious touch.",
          "3. Temple Therapy — Activating business and personal goals through system constellations and temple archetypes.",
          "4. Taoist Alchemy — Working with psychosomatics and hard, complex symptoms through remedies and Psychic Homeopathy.",
        ],
      },
      {
        heading: "Tantric Workshops",
        paragraphs: [
          "I did tantric workshops since 2004 in different schools and traditions worldwide, for 20 years. But the most fascinating and transformative for me, I would say, was the ISTA school approach.",
          "Though my primary interest is psychotherapy.",
        ],
      },
      {
        heading: "Psychotherapy & Guided Imagery",
        paragraphs: [
          "My principal education in this field lies in Guided Affective Imagery (Hanscarl Leuner).",
          "It is a method that creates a bridge between Jungian depth psychology and Freudian psychoanalysis.",
        ],
      },
      {
        heading: "Body-oriented Psychotherapy",
        paragraphs: [
          "As for the bodywork, my education was based on the European School of Body Psychotherapy and the Bodynamic Analysis approach.",
          "These schools beautifully connect the traumas of childhood with the body areas.",
        ],
      },
      {
        heading: "Temple Studies",
        paragraphs: [
          "But I would say one of the biggest influences for me was the Temple Studies.",
          "Initiations into the Greek Temple Mysteries.",
          "Mysteries of Dionysus, Demeter, and others.",
          "Egyptian Temple magic and mysteries.",
          "That is the experience that not only gives you the knowledge, but the sense of the field, archetypes, transpersonal flow.",
          "That I was studying and teaching worldwide for 20 years.",
        ],
      },
      {
        heading: "Reiki Initiations",
        paragraphs: [
          "And a starting point for feeling the flow for me was the series of Reiki Initiations, and among them the Tantra Reiki School, which is said to be coming from Osho’s Tradition.",
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
      description: "Личный рассказ Andy о пути в глубинной психологии, телесной работе, архетипах, храмовых традициях и Reiki.",
    },
    eyebrow: "Я хочу представиться",
    photoAlt: "Andy за старинным письменным столом в библиотеке",
    intro: [
      "Я хочу представиться.",
      "Меня зовут Andy; я специалист юнгианского направления и ведущий архетипических практик.",
      "Я вырос в Украине, но уже 20 лет живу в разных странах мира.",
    ],
    sections: [
      {
        heading: "Опыт",
        items: [
          "24 года веду групповые программы и программы личностного роста — с 2002 года.",
          "22 года веду трансперсональные практики, основанные на храмовых традициях, — с 2004 года. Мастер-учитель Tantra Reiki, Kundalini Reiki и Runic Reiki.",
          "15 лет работаю с семейными и бизнес-расстановками — с 2011 года.",
        ],
      },
      {
        heading: "Специализации / обучение",
        items: [
          "1. Психотерапия Dreams Alive — работа с напряжениями и травмами Внутреннего ребёнка через бессознательные образы.",
          "2. Телесно-ориентированная психотерапия — работа с ранними травмами Внутреннего ребёнка через осознанное прикосновение.",
          "3. Храмовая терапия — активация деловых и личных целей через системные расстановки и храмовые архетипы.",
          "4. Даосская алхимия — работа с психосоматикой и тяжёлыми, сложными симптомами с помощью средств и Psychic Homeopathy.",
        ],
      },
      {
        heading: "Тантрические воркшопы",
        paragraphs: [
          "С 2004 года, на протяжении 20 лет, я проходил тантрические воркшопы разных школ и традиций по всему миру. Но самым захватывающим и преобразующим для меня, я бы сказал, стал подход школы ISTA.",
          "Хотя мой главный интерес — психотерапия.",
        ],
      },
      {
        heading: "Психотерапия и Guided Affective Imagery",
        paragraphs: [
          "Моё основное образование в этой области связано с Guided Affective Imagery (Hanscarl Leuner).",
          "Это метод, создающий мост между юнгианской глубинной психологией и фрейдистским психоанализом.",
        ],
      },
      {
        heading: "Телесно-ориентированная психотерапия",
        paragraphs: [
          "Что касается телесной работы, моё обучение основывалось на European School of Body Psychotherapy и подходе Bodynamic Analysis.",
          "Эти школы прекрасно связывают травмы детства с областями тела.",
        ],
      },
      {
        heading: "Изучение храмовых традиций",
        paragraphs: [
          "Но я бы сказал, что одним из самых сильных влияний для меня стало изучение храмовых традиций.",
          "Посвящения в греческие храмовые мистерии.",
          "Мистерии Диониса, Деметры и других.",
          "Египетская храмовая магия и мистерии.",
          "Это опыт, который даёт не только знание, но и ощущение поля, архетипов, трансперсонального потока.",
          "Именно это я изучал и преподавал по всему миру 20 лет.",
        ],
      },
      {
        heading: "Посвящения Reiki",
        paragraphs: [
          "А отправной точкой, с которой я начал ощущать этот поток, для меня стала серия посвящений Reiki, и среди них школа Tantra Reiki, которая, как говорят, происходит из традиции Osho.",
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
