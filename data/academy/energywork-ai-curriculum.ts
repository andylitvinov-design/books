// Versioned editorial source for the proposed Principles of Energywork AI learner.
// Educational content only. Course answers must not be persisted until owner-scoped
// private storage, consent, and migrations are separately implemented and verified.
import type { EnglishGuidedMeditation } from "./english-guided-meditations";

export const ENERGYWORK_COURSE_ID = "academy-energywork-principles";
export const ENERGYWORK_COURSE_VERSION = "2026-10-18.p1";

export type EnergyworkLocale = "en" | "ru";
export type Localized = { en: string; ru: string };
export type EnergyworkPath = "yggdrasil" | "tantra" | "kundalini";
export type EnergyworkPhase =
  | "welcome" | "flight" | "tantra" | "kundalini"
  | "yggdrasil" | "initiation" | "complete";

export type EnergyworkQuestion = {
  type: "text" | "choice" | "scale";
  prompt: Localized;
  help?: Localized;
  options?: Array<{ id: string; label: Localized }>;
};
export type EnergyworkSlide = {
  id: string;
  phase: EnergyworkPhase;
  kind: "welcome" | "lesson" | "video" | "practice" | "reflection" | "path-choice" | "finish";
  title: Localized;
  body: Localized;
  image?: string;
  videoKey?: EnglishGuidedMeditation["key"];
  question?: EnergyworkQuestion;
};
const l = (en: string, ru: string): Localized => ({ en, ru });
const image = {
  world: "/academy/reiki-yggdrasil/source/program-overview.jpg",
  sun: "/academy/reiki-yggdrasil/source/toltec-tradition.jpg",
  tree: "/academy/reiki-yggdrasil/source/basic-program.jpg",
  tantra: "/library/maya-mysteries/media/post-217-1.jpg",
  kundalini: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
};

export const energyworkPhases: Record<EnergyworkPhase, Localized> = {
  welcome: l("Your beginning", "Начало пути"),
  flight: l("Flight to the Sun", "Полёт к Солнцу"),
  tantra: l("Tantra Reiki", "Тантра Рейки"),
  kundalini: l("Kundalini Reiki", "Кундалини Рейки"),
  yggdrasil: l("Reiki Yggdrasil", "Рейки Иггдрасиль"),
  initiation: l("Personal Reiki Initiation", "Личная Рейки-инициация"),
  complete: l("Your learning journal", "Ваш учебный дневник"),
};

// All three traditions belong to ONE course, in this order — no learning-path selection.
export const energyworkLessons: Array<{ phase: EnergyworkPhase; firstSlideId: string; title: Localized }> = [
  { phase: "flight", firstSlideId: "flight-01", title: energyworkPhases.flight },
  { phase: "tantra", firstSlideId: "tan-01", title: energyworkPhases.tantra },
  { phase: "kundalini", firstSlideId: "kun-01", title: energyworkPhases.kundalini },
  { phase: "yggdrasil", firstSlideId: "ygg-01", title: energyworkPhases.yggdrasil },
  { phase: "initiation", firstSlideId: "paths-01", title: energyworkPhases.initiation },
];

// These observations and course answers are optional for study progress,
// but required before a learner can request review for a PERSONAL initiation.
export const energyworkInitiationRequirements = [
  { lesson: "flight", reportId: "flight-04", questionId: "flight-05" },
  { lesson: "tantra", reportId: "tan-04", questionId: "tan-06" },
  { lesson: "kundalini", reportId: "kun-04", questionId: "kun-06" },
  { lesson: "yggdrasil", reportId: "ygg-04", questionId: "ygg-06" },
  { lesson: "initiation", reportId: "end-01", questionId: "init-01" },
] as const;

export const energyworkPathChoices: Array<{
  id: EnergyworkPath;
  title: Localized;
  description: Localized;
  image: string;
  studyPath: string;
  freePath: string;
}> = [
  {
    id: "yggdrasil", title: l("Reiki Yggdrasil", "Рейки Иггдрасиль"),
    description: l("Runes, the World Tree and the four introductory streams.", "Руны, Мировое Древо и четыре вводных потока."),
    image: image.tree, studyPath: "reiki/yggdrasil", freePath: "reiki/yggdrasil/free-initiation",
  },
  {
    id: "tantra", title: l("Tantra Reiki", "Тантра Рейки"),
    description: l("Presence, connection and Spring of Life as a spiritual symbol.", "Присутствие, связь и «Источник жизни» как духовный символ."),
    image: image.tantra, studyPath: "reiki/tantra-reiki", freePath: "reiki/tantra-reiki/free-initiation",
  },
  {
    id: "kundalini", title: l("Kundalini Reiki", "Кундалини Рейки"),
    description: l("Grounding and the original three-level teaching.", "Опора и оригинальная трёхступенчатая система."),
    image: image.kundalini, studyPath: "reiki/kundalini-reiki", freePath: "reiki/kundalini-reiki/free-initiation",
  },
];

const practiceQuestion: EnergyworkQuestion = {
  type: "choice",
  prompt: l("How did you use this practice?", "Как прошла эта практика?"),
  help: l("Any response is fine; no result is required.", "Любой ответ подходит, специального результата не требуется."),
  options: [
    { id: "tried", label: l("I tried it in a way that suited me", "Я попробовал(а) в комфортном варианте") },
    { id: "skipped", label: l("I chose to skip it today", "Сегодня я решил(а) пропустить") },
  ],
};

const commonSlides: EnergyworkSlide[] = [
  { id: "welcome-01", phase: "welcome", kind: "welcome", image: image.world,
    title: l("Reiki Practitioner — your first step", "Практик Рейки — начало пути"),
    body: l("One course, five lessons in sequence: Flight to the Sun, Tantra Reiki, Kundalini Reiki, Reiki Yggdrasil and preparing for a personal initiation.", "Один курс из пяти последовательных уроков: Полёт к Солнцу, Тантра Рейки, Кундалини Рейки, Рейки Иггдрасиль и подготовка к личной инициации.") },
  { id: "welcome-02", phase: "welcome", kind: "reflection",
    title: l("How familiar are you with Reiki?", "Насколько вы знакомы с Рейки?"),
    body: l("A quick introduction, not a test. Choose the experience that best describes you.",
      "Это короткое знакомство, а не тест. Выберите вариант, который лучше всего описывает ваш опыт."),
    question: { type: "choice", prompt: l("My experience so far", "Мой опыт"), options: [
      { id: "beginner", label: l("I'm new to Reiki", "Пока не знаком(а) с Рейки") },
      { id: "energywork", label: l("I have energy-work experience, but not Reiki", "Есть опыт энергетических практик, но не Рейки") },
      { id: "reiki-1-2", label: l("I have Reiki Level 1 or 2", "У меня уже есть 1-я или 2-я ступень Рейки") },
      { id: "master", label: l("I'm a Reiki Master", "Я мастер Рейки") },
    ] } },

  { id: "flight-01", phase: "flight", kind: "lesson", image: image.sun,
    title: l("A symbolic flight", "Символический полёт"),
    body: l("Flight to the Sun is Andrey's guided imagery practice. The sun is used as a symbol for attention and imagination, not as a physical or medical claim.", "«Полёт к Солнцу» — авторская практика с образами. Солнце здесь — символ внимания и воображения, не медицинское утверждение.") },
  { id: "flight-02", phase: "flight", kind: "video", videoKey: "flight-to-sun",
    title: l("Watch Flight to the Sun", "Посмотрите «Полёт к Солнцу»"),
    body: l("Original English recording. You may listen, use the text alternative or move on. Never force an uncomfortable experience.", "Оригинальная английская запись. Можно прослушать, прочитать альтернативу или продолжить. Не нужно принуждать себя к неприятным ощущениям.") },
  { id: "flight-03", phase: "flight", kind: "practice", question: practiceQuestion,
    title: l("A gentle pause", "Небольшая пауза"),
    body: l("After the meditation, pause for a moment. Notice any imagined warmth or light, or simply the contact with your chair. No warmth needs to appear. You may stop at any time.", "После медитации сделайте мягкую паузу. Обратите внимание на образ тепла или света либо просто на опору стула. Тепло не обязательно должно ощущаться. Можно остановиться в любой момент.") },
  { id: "flight-04", phase: "flight", kind: "reflection",
    title: l("What did you notice?", "Что вы заметили?"),
    body: l("Record what you noticed after the meditation. 'Nothing in particular' is a valid observation. You may leave this blank and continue, but a report is needed before requesting a personal initiation.", "Запишите, что заметили после медитации. «Ничего особенного» — полноценное наблюдение. Можно пропустить и продолжить, но для заявки на личную инициацию отчёт понадобится."),
    question: { type: "text", prompt: l("My observation after the meditation…", "Мои наблюдения после медитации…") } },
  { id: "flight-05", phase: "flight", kind: "reflection",
    title: l("What did the Sun symbol mean?", "Что означает образ Солнца?"),
    body: l("There is no right feeling to achieve. Describe the difference between a symbolic image and a required physical result.", "Здесь не требуется определённое ощущение. Расскажите, чем символический образ отличается от обязательного физического результата."),
    question: { type: "text", prompt: l("My answer to the lesson question…", "Мой ответ на вопрос урока…") } },

  { id: "presence-01", phase: "tantra", kind: "lesson", image: image.world,
    title: l("After Tantra Reiki: the foundation of presence", "После Тантра Рейки: основа присутствия"),
    body: l("After exploring Tantra Reiki, practise simple presence: return attention to the room without trying to create a particular state.", "После знакомства с Тантра Рейки попробуйте простое присутствие: мягко верните внимание к окружающему, не пытаясь вызвать особое состояние.") },
  { id: "presence-02", phase: "tantra", kind: "practice", question: practiceQuestion,
    title: l("Notice three ordinary things", "Заметьте три обычные вещи"),
    body: l("Without changing your breathing, notice three sounds, colours or points of contact in your surroundings. Choose whichever feels easy.", "Не меняя дыхание, заметьте три звука, цвета или точки опоры вокруг. Выберите то, что вам комфортно.") },
  { id: "presence-03", phase: "tantra", kind: "reflection",
    title: l("Your comfort today", "Ваш комфорт сегодня"),
    body: l("A voluntary personal check-in, not a health score or diagnosis. You can skip it.", "Добровольная самооценка, не показатель здоровья и не диагноз. Можно пропустить."),
    question: { type: "scale", prompt: l("How comfortable did this pause feel? 0 = not comfortable, 10 = very comfortable", "Насколько комфортной была пауза? 0 — совсем нет, 10 — очень комфортно") } },
  { id: "presence-04", phase: "tantra", kind: "lesson",
    title: l("Presence is a choice", "Присутствие — это выбор"),
    body: l("There is no need to reproduce someone else's sensations. You can return to simple awareness at your own pace.", "Не нужно воспроизводить чужие ощущения. К простому наблюдению можно возвращаться в своём темпе.") },

  { id: "intention-01", phase: "initiation", kind: "lesson", image: image.sun,
    title: l("What is intention?", "Что такое намерение?"),
    body: l("In these traditions, intention gives a practice direction. It is a personal purpose, not a promise that an outcome must happen.", "В этих традициях намерение задаёт направление практики. Это личная цель, а не обещание обязательного результата.") },
  { id: "intention-02", phase: "initiation", kind: "lesson",
    title: l("Symbols help us reflect", "Символы помогают размышлять"),
    body: l("A tree may suggest grounding; sunlight may suggest clarity. The meaning belongs to the learner and is not a diagnostic interpretation.", "Дерево может напоминать об опоре, солнечный свет — о ясности. Смысл выбирает сам ученик; это не диагностика.") },
  { id: "intention-03", phase: "initiation", kind: "reflection",
    title: l("Write your own intention", "Запишите своё намерение"),
    body: l("Keep it simple and within your influence, such as making room for a short quiet pause.", "Пусть оно будет простым и посильным, например выделить пару минут для спокойной паузы."),
    question: { type: "text", prompt: l("My intention for this course…", "Моё намерение для курса…") } },
  { id: "intention-04", phase: "initiation", kind: "practice", question: practiceQuestion,
    title: l("Try your intention gently", "Мягко вспомните намерение"),
    body: l("For a few moments, notice your intention while staying aware of your surroundings. It is fine to change it later.", "На несколько мгновений вспомните своё намерение, оставаясь в контакте с окружающим. Позже его можно изменить.") },

  { id: "boundaries-01", phase: "initiation", kind: "lesson", image: image.world,
    title: l("Choice and boundaries", "Выбор и границы"),
    body: l("In any spiritual practice, your comfort and consent matter. You never owe anyone an explanation for pausing or declining.", "В любой духовной практике важны комфорт и согласие. Вы можете сделать паузу или отказаться без объяснений.") },
  { id: "boundaries-02", phase: "initiation", kind: "reflection",
    title: l("A practical choice", "Практическая ситуация"),
    body: l("A practice does not feel comfortable today. What could you do?", "Сегодня практика ощущается некомфортно. Что вы можете сделать?"),
    question: { type: "choice", prompt: l("Choose a response that respects your comfort", "Выберите ответ, уважающий ваш комфорт"),
      options: [
        { id: "pause", label: l("Pause or stop — that is okay", "Сделать паузу или остановиться — это нормально") },
        { id: "adapt", label: l("Choose an easier alternative", "Выбрать более простой вариант") },
        { id: "ask", label: l("Ask the teacher for clarification", "Попросить преподавателя объяснить") },
      ] } },
  { id: "boundaries-03", phase: "initiation", kind: "practice", question: practiceQuestion,
    title: l("A moment of choice", "Момент выбора"),
    body: l("Try saying to yourself: 'I can choose the pace and the format.' You may also skip this exercise.", "Попробуйте сказать себе: «Я могу выбирать темп и формат». Это упражнение тоже можно пропустить.") },
  { id: "boundaries-04", phase: "initiation", kind: "reflection",
    title: l("What makes practice feel safe?", "Что делает практику комфортной?"),
    body: l("Describe a simple condition or boundary that works for you.", "Опишите одно простое условие или границу, которая вам подходит."),
    question: { type: "text", prompt: l("For me, it helps when…", "Мне помогает, когда…") } },

  { id: "paths-01", phase: "initiation", kind: "lesson",
    title: l("Personal initiation: what comes next?", "Личная инициация: что дальше?"),
    body: l("You have learned about all three Reiki systems within one course. Personal Level 1 initiation is a separate, teacher-led process that requires your informed choice and Andrey's confirmation.", "Вы познакомились со всеми тремя системами в одном курсе. Личная инициация первой ступени — отдельный процесс с преподавателем: нужен ваш осознанный выбор и подтверждение Андрея.") },
  { id: "paths-02", phase: "initiation", kind: "lesson", image: image.tree,
    title: l("What your learning journal needs", "Что нужно для учебного дневника"),
    body: l("Before requesting a personal initiation, record your observations after each meditation and answer the lesson questions. You can skip either while studying and return later.", "Для заявки на личную инициацию запишите наблюдения после каждой медитации и ответы на вопросы уроков. Во время обучения всё это можно пропускать и возвращаться позже.") },
  { id: "paths-03", phase: "initiation", kind: "lesson", image: image.tantra,
    title: l("One course, several initiation options", "Один курс — несколько вариантов инициации"),
    body: l("You may discuss initiation in any of the three traditions, one at a time. Completion of this educational course does not mean an initiation has taken place.", "Вы можете обсудить инициацию в любой из трёх традиций, по очереди. Прохождение учебного курса само по себе не означает получения инициации.") },
  { id: "paths-04", phase: "initiation", kind: "lesson",
    title: l("Prepare your personal initiation request", "Подготовьте заявку на личную инициацию"),
    body: l("Review the five lesson reports and answers. They stay private unless you choose to share them with the teacher. A request only starts a discussion; it never grants initiation automatically.", "Проверьте отчёты и ответы по пяти урокам. Они остаются приватными, пока вы сами не решите показать их преподавателю. Заявка лишь начинает обсуждение, а не предоставляет инициацию автоматически.") },
];

const pathSlides: Record<EnergyworkPath, EnergyworkSlide[]> = {
  yggdrasil: [
    { id: "ygg-01", phase: "yggdrasil", kind: "lesson", image: image.tree,
      title: l("The roots, trunk and crown", "Корни, ствол и крона"),
      body: l("The World Tree is an image used for symbolic contemplation. What might roots, trunk and branches mean to you?", "Мировое Древо — образ для символического размышления. Что для вас могут означать корни, ствол и ветви?") },
    { id: "ygg-02", phase: "yggdrasil", kind: "video", videoKey: "reiki-yggdrasil",
      title: l("Original Reiki Yggdrasil meditation", "Оригинальная медитация Рейки Иггдрасиль"),
      body: l("English recording shared by Andrey. Participation is optional.", "Английская запись Андрея. Участие необязательно.") },
    { id: "ygg-03", phase: "yggdrasil", kind: "practice", question: practiceQuestion,
      title: l("Draw or imagine a tree", "Нарисуйте или представьте дерево"),
      body: l("On paper, draw roots, a trunk and a crown — or imagine them. Keep the drawing for yourself; image upload is not enabled in this preview.", "Нарисуйте на бумаге корни, ствол и крону — либо представьте их. Рисунок остаётся у вас; загрузка изображений пока недоступна.") },
    { id: "ygg-04", phase: "yggdrasil", kind: "reflection",
      title: l("Your World Tree reflection", "Ваш образ Мирового Древа"),
      body: l("There is no prescribed interpretation of your drawing.", "У рисунка нет обязательной трактовки."),
      question: { type: "text", prompt: l("What does your tree mean to you?", "Что ваше дерево значит лично для вас?") } },
    { id: "ygg-05", phase: "yggdrasil", kind: "lesson",
      title: l("Continue with the first-level materials", "Продолжите изучение первой ступени"),
      body: l("The introductory streams and source materials are on the separate Yggdrasil course page. A teacher-guided initiation must be arranged with Andrey.", "Вводные потоки и источники — на отдельной странице Иггдрасиля. Инициацию с преподавателем необходимо согласовать с Андреем.") },
    { id: "ygg-06", phase: "yggdrasil", kind: "reflection",
      title: l("What is the World Tree used for?", "Для чего нужен образ Мирового Древа?"),
      body: l("Describe how a symbol can support reflection without being a diagnosis or a promised outcome.", "Расскажите, как символ помогает размышлять, не являясь диагнозом или обещанием результата."),
      question: { type: "text", prompt: l("My answer about Reiki Yggdrasil…", "Мой ответ о Рейки Иггдрасиль…") } },
  ],
  tantra: [
    { id: "tan-01", phase: "tantra", kind: "lesson", image: image.tantra,
      title: l("The Spring of Life", "Источник жизни"),
      body: l("The first step of Tantra Reiki uses the Spring of Life as a spiritual metaphor. There is no required sensation to achieve.", "Первая ступень Тантра Рейки использует «Источник жизни» как духовный образ. Не нужно достигать какого-либо обязательного ощущения.") },
    { id: "tan-02", phase: "tantra", kind: "video", videoKey: "tantra-reiki",
      title: l("Original Tantra Reiki practice", "Оригинальная практика Тантра Рейки"),
      body: l("Watch Andrey's original English practice at your chosen pace.", "Посмотрите оригинальную английскую практику Андрея в комфортном темпе.") },
    { id: "tan-03", phase: "tantra", kind: "practice", question: practiceQuestion,
      title: l("Notice connection and space", "Заметьте связь и пространство"),
      body: l("Notice where you feel comfortable sitting or standing. You can practise simple awareness without any touch or physical contact.", "Заметьте, где вам удобно сидеть или стоять. Можно просто наблюдать ощущения без прикосновений и физического контакта.") },
    { id: "tan-04", phase: "tantra", kind: "reflection",
      title: l("A personal observation", "Личное наблюдение"),
      body: l("Reflect on presence, connection or your own boundaries.", "Подумайте о присутствии, связи или собственных границах."),
      question: { type: "text", prompt: l("I noticed…", "Я заметил(а)…") } },
    { id: "tan-05", phase: "tantra", kind: "lesson",
      title: l("Continue with Tantra Reiki Level 1", "Продолжите первую ступень Тантра Рейки"),
      body: l("Read the first-level course materials. Any initiation requires a separate teacher-led arrangement.", "Изучите материалы первой ступени. Любая инициация согласуется с преподавателем отдельно.") },
    { id: "tan-06", phase: "tantra", kind: "reflection",
      title: l("A question about Tantra Reiki", "Вопрос по Тантра Рейки"),
      body: l("What does the Spring of Life symbolize for you? There is no single correct interpretation.", "Что лично для вас символизирует «Источник жизни»? Единственно правильной трактовки нет."),
      question: { type: "text", prompt: l("My answer about Tantra Reiki…", "Мой ответ о Тантра Рейки…") } },
  ],
  kundalini: [
    { id: "kun-01", phase: "kundalini", kind: "lesson", image: image.kundalini,
      title: l("An introduction to Kundalini Reiki", "Знакомство с Кундалини Рейки"),
      body: l("This is a distinct three-level spiritual teaching. The original Paul Crick manual is available from the public course page.", "Это отдельная трёхступенчатая духовная система. Оригинальная методичка Пола Крика доступна на странице курса.") },
    { id: "kun-02", phase: "kundalini", kind: "video", videoKey: "kundalini-reiki",
      title: l("Original Kundalini Reiki meditation", "Оригинальная медитация Кундалини Рейки"),
      body: l("Andrey's English-language source recording. Stop or skip whenever you wish.", "Авторская английская запись Андрея. В любой момент можно остановить или пропустить.") },
    { id: "kun-03", phase: "kundalini", kind: "practice", question: practiceQuestion,
      title: l("A moment of grounding", "Момент опоры"),
      body: l("Notice the ground beneath your feet or the support of your chair. This is an optional everyday awareness exercise.", "Заметьте пол под ногами или опору стула. Это необязательное упражнение на повседневное внимание.") },
    { id: "kun-04", phase: "kundalini", kind: "reflection",
      title: l("What felt supportive?", "Что помогло почувствовать опору?"),
      body: l("Keep the observation simple. There is no special outcome expected.", "Запишите простое наблюдение. Особого результата не требуется."),
      question: { type: "text", prompt: l("For me…", "Для меня…") } },
    { id: "kun-05", phase: "kundalini", kind: "lesson",
      title: l("Explore the original manual", "Изучите оригинальную методичку"),
      body: l("The public Kundalini Reiki course offers the source manual and instructions to request teacher-guided Level 1.", "На публичной странице Кундалини Рейки есть исходная методичка и информация о согласовании первой ступени с преподавателем.") },
    { id: "kun-06", phase: "kundalini", kind: "reflection",
      title: l("A question about Kundalini Reiki", "Вопрос по Кундалини Рейки"),
      body: l("How is noticing support and grounding different from needing a particular energy sensation?", "Чем ощущение опоры и заземления отличается от требования почувствовать особую энергию?"),
      question: { type: "text", prompt: l("My answer about Kundalini Reiki…", "Мой ответ о Кундалини Рейки…") } },
  ],
};

const initiationSlides: EnergyworkSlide[] = [
  { id: "init-01", phase: "initiation", kind: "reflection",
    title: l("What is a personal initiation?", "Что такое личная инициация?"),
    body: l("Describe why course completion and teacher-led initiation are different. This is the fifth lesson's question.", "Объясните, почему прохождение курса и инициация с преподавателем — разные вещи. Это вопрос пятого урока."),
    question: { type: "text", prompt: l("My answer about personal initiation…", "Мой ответ о личной инициации…") } },
  { id: "init-02", phase: "initiation", kind: "reflection",
    title: l("Questions for the teacher", "Вопросы преподавателю"),
    body: l("Write anything you would like to clarify with Andrey. This note is private until you deliberately share it.", "Запишите, что вы хотели бы уточнить у Андрея. Эта запись приватна, пока вы сами не решите ею поделиться."),
    question: { type: "text", prompt: l("I would like to ask…", "Я хочу спросить…") } },
];

const endSlides: EnergyworkSlide[] = [
  { id: "end-01", phase: "complete", kind: "reflection",
    title: l("My final learning report", "Мой итоговый отчёт"),
    body: l("Write what you have learned and what you would like to explore further. This can be completed later, but it is needed before requesting review for a personal initiation.", "Запишите, что вы узнали и что хотите изучить дальше. Это можно сделать позже, но перед заявкой на личную инициацию нужен итоговый отчёт."),
    question: { type: "text", prompt: l("My final report after the course…", "Мой итоговый отчёт после курса…") } },
  { id: "end-02", phase: "complete", kind: "finish", image: image.world,
    title: l("Your five Reiki lessons", "Ваши пять уроков Рейки"),
    body: l("You have explored Flight to the Sun, Tantra Reiki, Kundalini Reiki, Reiki Yggdrasil and personal initiation preparation. This course does not grant Level 1 initiation or certification.", "Вы прошли «Полёт к Солнцу», Тантра Рейки, Кундалини Рейки, Рейки Иггдрасиль и подготовку к личной инициации. Учебный курс сам по себе не предоставляет инициацию первой ступени или сертификат.") },
];

// Keep the legacy argument solely for callers restoring an old private progress row.
// It no longer controls the curriculum. All students study every system in sequence.
export function energyworkSlides(_legacyPath: EnergyworkPath | null = null): EnergyworkSlide[] {
  return [
    ...commonSlides.filter((slide) => slide.phase === "welcome"),
    ...commonSlides.filter((slide) => slide.phase === "flight"),
    ...pathSlides.tantra,
    ...commonSlides.filter((slide) => slide.phase === "tantra"),
    ...pathSlides.kundalini,
    ...pathSlides.yggdrasil,
    ...commonSlides.filter((slide) => slide.phase === "initiation"),
    ...initiationSlides,
    ...endSlides,
  ];
}
