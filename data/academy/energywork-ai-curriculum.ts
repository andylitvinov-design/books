// Versioned editorial source for the proposed Principles of Energywork AI learner.
// Educational content only. Course answers must not be persisted until owner-scoped
// private storage, consent, and migrations are separately implemented and verified.
import type { EnglishGuidedMeditation } from "./english-guided-meditations";
import { yggdrasilTextTestimonials } from "./yggdrasil-testimonials";

export const ENERGYWORK_COURSE_ID = "academy-energywork-principles";
export const ENERGYWORK_COURSE_VERSION = "2026-10-19.p2";

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
export type EnergyworkTestimonial = {
  id: string;
  quote: Localized;
  attribution: Localized;
  sourcePath: string;
};
export type EnergyworkSlide = {
  id: string;
  phase: EnergyworkPhase;
  kind: "welcome" | "lesson" | "video" | "practice" | "reflection" | "voices" | "milestone" | "path-choice" | "finish";
  testimonials?: EnergyworkTestimonial[];
  title: Localized;
  body: Localized;
  image?: string;
  videoKey?: EnglishGuidedMeditation["key"];
  question?: EnergyworkQuestion;
};
const l = (en: string, ru: string): Localized => ({ en, ru });
const image = {
  world: "/academy/reiki-yggdrasil/source/program-overview.jpg",
  sun: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  tree: "/academy/reiki-yggdrasil/source/basic-program.jpg",
  tantra: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
  kundalini: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
};


/** Published Reiki Yggdrasil feedback reused from the original testimonial archive. */
const yggdrasilVoices: EnergyworkTestimonial[] = yggdrasilTextTestimonials.map((entry) => ({
  id: entry.id,
  quote: { en: entry.quote.en, ru: entry.quote.ru.replace(/^«|»$/g, "") },
  attribution: l("Reiki Yggdrasil learner · published course feedback", "Участник Рейки Иггдрасиль · отзыв об обучении"),
  sourcePath: "reiki/yggdrasil",
}));

// Verbatim brief extracts from archived Tantra Reiki testimonials and their
// existing EN translation: tantra-reiki-full.generated.json / tantra-reiki-ru-en.generated.json.
// Course reviews are NOT presented as reactions to this exact meditation recording.
const tantraVoices: EnergyworkTestimonial[] = [
  {
    id: "margaret",
    quote: l("It was also a shift in perception and it felt like flowing energy as I went on my day.",
      "Я заметила изменение восприятия и ощущение потока, которое сохранялось в течение дня."),
    attribution: l("Margaret · published Tantra Reiki learner review", "Маргарет · опубликованный отзыв о Тантра Рейки"),
    sourcePath: "reiki/tantra-reiki",
  },
  {
    id: "olga",
    quote: l("A soft and gentle flow that dissolves some tensions and blocks while working with the situation.",
      "Мягкий и бережный поток который растворяет какие-то напряжения и блоки, в работе с ситуацией."),
    attribution: l("Olga · published Tantra Reiki learner review", "Ольга · опубликованный отзыв о Тантра Рейки"),
    sourcePath: "reiki/tantra-reiki",
  },
  {
    id: "litten",
    quote: l("I feel the heat in the palms of my hands.", "Я ощущаю тепло в ладонях."),
    attribution: l("Litten · published Tantra Reiki learner review", "Литтен · опубликованный отзыв о Тантра Рейки"),
    sourcePath: "reiki/tantra-reiki",
  },
  {
    id: "tantra-level-1",
    quote: l("Outside, I delight in the wind and the sun. A state of unconditional Love!",
      "На улице кайфую От ветра) Солнца) Состояние Безусловной Любви!"),
    attribution: l("Tantra Reiki Level 1 learner · published anonymous review", "Участница Тантра Рейки 1-й ступени · отзыв без подписи"),
    sourcePath: "reiki/tantra-reiki",
  },
];

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

// A written meditation reflection follows each practice. Seven short study
// questions in Tantra Reiki are optional while learning, but required for
// an optional personal-initiation review alongside the other lesson answers.
export const energyworkInitiationRequirements: ReadonlyArray<{
  lesson: EnergyworkPhase;
  reportId: string;
  questionId: string;
  questionIds: readonly string[];
}> = [
  { lesson: "flight", reportId: "flight-04", questionId: "flight-05", questionIds: ["flight-05"] },
  { lesson: "tantra", reportId: "tan-04", questionId: "tan-06", questionIds: ["tan-06", "tan-study-02", "tan-study-03", "tan-study-04", "tan-study-05", "tan-study-06", "tan-study-07"] },
  { lesson: "kundalini", reportId: "kun-04", questionId: "kun-06", questionIds: ["kun-06"] },
  { lesson: "yggdrasil", reportId: "ygg-04", questionId: "ygg-06", questionIds: ["ygg-06"] },
  { lesson: "initiation", reportId: "end-01", questionId: "init-01", questionIds: ["init-01"] },
];

export const energyworkPathChoices: Array<{
  id: EnergyworkPath;
  title: Localized;
  description: Localized;
  image: string;
  studyPath: string;
  freePath: string;
}> = [
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
  {
    id: "yggdrasil", title: l("Reiki Yggdrasil", "Рейки Иггдрасиль"),
    description: l("Runes, the World Tree and the four introductory streams.", "Руны, Мировое Древо и четыре вводных потока."),
    image: image.tree, studyPath: "reiki/yggdrasil", freePath: "reiki/yggdrasil/free-initiation",
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

// Unlike the other short practice check-ins, the Sun exercise invites a
// voluntary description in the learner's own words. No sensation is required.
const sunPracticeQuestion: EnergyworkQuestion = {
  type: "text",
  prompt: l(
    "Without the meditation, could you tune in to the Sun and feel its warmth and light within and around you?",
    "Удалось ли вам без медитации настроиться на Солнце и почувствовать его тепло и свет внутри себя и вокруг?"
  ),
};

const commonSlides: EnergyworkSlide[] = [
  { id: "welcome-01", phase: "welcome", kind: "welcome", image: image.world,
    title: l("Reiki Practitioner — your first step", "Практик Рейки — начало пути"),
    body: l("One course, five lessons in sequence: Flight to the Sun and three Reiki systems.", "Один курс из пяти последовательных уроков: «Полёт к Солнцу» и три системы Рейки.") },
  { id: "welcome-02", phase: "welcome", kind: "reflection",
    title: l("How familiar are you with Reiki?", "Насколько вы знакомы с Рейки?"),
    body: l("Not a test — just choose your experience.",
      "Это не тест — просто выберите свой опыт."),
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
    body: l("Listen to Andrey’s recording, or skip it if you prefer.", "Послушайте запись Андрея или пропустите её, если хотите.") },
  { id: "flight-05", phase: "flight", kind: "reflection",
    title: l("What did the Sun mean to you?", "Что для вас означает Солнце?"),
    body: l("Write one thought about the Sun as a symbol.", "Запишите одну мысль об образе Солнца."),
    question: { type: "text", prompt: l("Your thought…", "Ваша мысль…") } },
  { id: "flight-voices", phase: "flight", kind: "voices", videoKey: "flight-to-sun", image: image.sun,
    title: l("What do other viewers say?", "Что пишут другие?"),
    body: l("Explore comments on the original video, then share your own experience.", "Посмотрите комментарии к видео и поделитесь своим опытом.") },
  { id: "flight-04", phase: "flight", kind: "reflection",
    title: l("Your meditation feedback", "Ваш отзыв о медитации"),
    body: l("Your experience matters. Share what stood out during the meditation in your own words.", "Ваш опыт важен. Расскажите своими словами, что особенно запомнилось во время медитации."),
    question: { type: "text", prompt: l("Tell us about your experience.", "Поделитесь своим опытом.") } },
  { id: "flight-03", phase: "flight", kind: "practice", question: sunPracticeQuestion,
    title: l("A gentle pause", "Небольшая пауза"),
    body: l("Without replaying the meditation, take a moment to sense the Sun’s warmth and light within and around you.",
      "Без медитации попробуйте почувствовать тепло и свет Солнца внутри себя и вокруг.") },
  { id: "flight-done", phase: "flight", kind: "milestone", image: image.sun,
    title: l("Lesson 1 complete — well done!", "Первый урок пройден — отлично!"),
    body: l("You've taken your first step. Next, discover Tantra Reiki.", "Первый шаг сделан. Впереди — знакомство с Тантра Рейки.") },

  { id: "presence-01", phase: "tantra", kind: "lesson", image: image.world,
    title: l("After Tantra Reiki: the foundation of presence", "После Тантра Рейки: основа присутствия"),
    body: l("After exploring Tantra Reiki, practise simple presence: return attention to the room without trying to create a particular state.", "После знакомства с Тантра Рейки попробуйте простое присутствие: мягко верните внимание к окружающему, не пытаясь вызвать особое состояние.") },
  { id: "presence-04", phase: "tantra", kind: "lesson",
    title: l("Presence is a choice", "Присутствие — это выбор"),
    body: l("There is no need to reproduce someone else's sensations. You can return to simple awareness at your own pace.", "Не нужно воспроизводить чужие ощущения. К простому наблюдению можно возвращаться в своём темпе.") },
  { id: "tan-done", phase: "tantra", kind: "milestone", image: image.tantra,
    title: l("Second lesson completed!", "Второй урок пройден!"),
    body: l("Keep going through all five lessons to prepare for a personal initiation with Andrey and explore joining our Reiki and energywork community.", "Пройдите остальные уроки, чтобы подготовиться к личной инициации у Андрея и присоединению к сообществу практиков Рейки и энергопрактик.") },

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
    body: l("After each meditation, add a short review to continue. You may return to the separate lesson questions later; all five are needed before personal initiation review.", "После каждой медитации оставьте короткий отзыв для продолжения. К отдельным вопросам уроков можно вернуться позже — все пять понадобятся перед рассмотрением личной инициации.") },
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
    { id: "ygg-voices", phase: "yggdrasil", kind: "voices", videoKey: "reiki-yggdrasil", image: image.tree,
      title: l("Voices from Reiki Yggdrasil", "Отзывы о Рейки Иггдрасиль"),
      body: l("Published learner experiences from the course, not this exact recording.", "Отзывы учеников о курсе, а не об этой конкретной записи."),
      testimonials: yggdrasilVoices },
    { id: "ygg-04", phase: "yggdrasil", kind: "reflection",
      title: l("Your meditation feedback", "Ваш отзыв о медитации"),
      body: l("Your experience matters. Share what stood out during the meditation in your own words.", "Ваш опыт важен. Расскажите своими словами, что особенно запомнилось во время медитации."),
      question: { type: "text", prompt: l("Tell us about your experience.", "Поделитесь своим опытом.") } },
    { id: "ygg-05", phase: "yggdrasil", kind: "lesson",
      title: l("Continue with the first-level materials", "Продолжите изучение первой ступени"),
      body: l("The introductory streams and source materials are on the separate Yggdrasil course page. A teacher-guided initiation must be arranged with Andrey.", "Вводные потоки и источники — на отдельной странице Иггдрасиля. Инициацию с преподавателем необходимо согласовать с Андреем.") },
    { id: "ygg-06", phase: "yggdrasil", kind: "reflection",
      title: l("What is the World Tree used for?", "Для чего нужен образ Мирового Древа?"),
      body: l("Describe how a symbol can support reflection without being a diagnosis or a promised outcome.", "Расскажите, как символ помогает размышлять, не являясь диагнозом или обещанием результата."),
      question: { type: "text", prompt: l("My answer about Reiki Yggdrasil…", "Мой ответ о Рейки Иггдрасиль…") } },
    { id: "ygg-done", phase: "yggdrasil", kind: "milestone", image: image.tree,
      title: l("Fourth lesson completed!", "Четвёртый урок пройден!"),
      body: l("One lesson remains. Complete it to prepare for a personal initiation with Andrey and explore joining our Reiki and energywork community.", "Остался один урок! Завершите его, чтобы подготовиться к личной инициации у Андрея и присоединению к сообществу практиков Рейки.") },
  ],
  tantra: [
    { id: "tan-01", phase: "tantra", kind: "lesson", image: image.tantra,
      title: l("The Spring of Life", "Источник жизни"),
      body: l("The first step of Tantra Reiki uses the Spring of Life as a spiritual metaphor. There is no required sensation to achieve.", "Первая ступень Тантра Рейки использует «Источник жизни» как духовный образ. Не нужно достигать какого-либо обязательного ощущения.") },
    { id: "tan-02", phase: "tantra", kind: "video", videoKey: "tantra-reiki",
      title: l("Original Tantra Reiki practice", "Оригинальная практика Тантра Рейки"),
      body: l("Watch Andrey's original English practice at your chosen pace.", "Посмотрите оригинальную английскую практику Андрея в комфортном темпе.") },
    { id: "tan-voices", phase: "tantra", kind: "voices", videoKey: "tantra-reiki", image: image.tantra,
      title: l("Voices from Tantra Reiki", "Отзывы о Тантра Рейки"),
      body: l("Published learner experiences from the course, not this exact recording.", "Отзывы учеников о курсе, а не об этой конкретной записи."),
      testimonials: tantraVoices },
    { id: "tan-04", phase: "tantra", kind: "reflection",
      title: l("Your meditation feedback", "Ваш отзыв о медитации"),
      body: l("Your experience matters. Share what stood out during the meditation in your own words.", "Ваш опыт важен. Расскажите своими словами, что особенно запомнилось во время медитации."),
      question: { type: "text", prompt: l("Tell us about your experience.", "Поделитесь своим опытом.") } },
    { id: "tan-05", phase: "tantra", kind: "lesson", image: image.tantra,
      title: l("Discover Tantra Reiki", "Познакомьтесь с Тантра Рейки"),
      body: l("Read Andrey's guide to the tradition, its nine levels and practices. Seven short study questions follow.", "Прочитайте описание Тантра Рейки, девяти ступеней и практик Андрея. Затем ответьте на семь коротких вопросов.") },
    { id: "tan-06", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 1 of 7 · Origins of Tantra Reiki", "Вопрос 1 из 7 · Происхождение Тантра Рейки"),
      body: l("Use the Tantra Reiki guide and answer briefly in your own words.", "Ответьте своими словами, опираясь на описание Тантра Рейки."),
      question: { type: "text", prompt: l("Who created the Tantra Reiki system, and what is the source of its energy?", "Кто создал систему Тантра Рейки и каков источник её энергии?") } },
    { id: "tan-study-02", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 2 of 7 · Purpose of the flow", "Вопрос 2 из 7 · Назначение потока"),
      body: l("Use the Tantra Reiki guide and answer briefly in your own words.", "Ответьте своими словами, опираясь на описание Тантра Рейки."),
      question: { type: "text", prompt: l("What is the main purpose of the Tantra Reiki flow? Why is it needed, and what does it offer a person?", "Какова главная цель потока Тантра Рейки? Для чего он нужен и что даёт человеку?") } },
    { id: "tan-study-03", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 3 of 7 · How Tantra Reiki is used", "Вопрос 3 из 7 · Применение Тантра Рейки"),
      body: l("Use the Tantra Reiki guide and answer briefly in your own words.", "Ответьте своими словами, опираясь на описание Тантра Рейки."),
      question: { type: "text", prompt: l("For what purposes can Tantra Reiki be used?", "Для каких целей можно использовать Тантра Рейки?") } },
    { id: "tan-study-04", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 4 of 7 · Tradition and foundations", "Вопрос 4 из 7 · Традиция и основы"),
      body: l("Use the Tantra Reiki guide and answer briefly in your own words.", "Ответьте своими словами, опираясь на описание Тантра Рейки."),
      question: { type: "text", prompt: l("Which culture and tradition form the foundation of Tantra Reiki?", "Какая культура и традиция лежат в основе Тантра Рейки?") } },
    { id: "tan-study-05", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 5 of 7 · The nine levels", "Вопрос 5 из 7 · Девять ступеней"),
      body: l("Use the Tantra Reiki guide and answer briefly in your own words.", "Ответьте своими словами, опираясь на описание Тантра Рейки."),
      question: { type: "text", prompt: l("How are Levels 1–3, 4–6 and 7–9 connected?", "Как связаны ступени 1–3, 4–6 и 7–9?") } },
    { id: "tan-study-06", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 6 of 7 · Mandalas and artifacts", "Вопрос 6 из 7 · Мандалы и артефакты"),
      body: l("Use the Tantra Reiki guide and answer briefly in your own words.", "Ответьте своими словами, опираясь на описание Тантра Рейки."),
      question: { type: "text", prompt: l("At which levels do students learn to create mandalas and work with artifacts?", "На каких ступенях ученики учатся создавать мандалы и работать с артефактами?") } },
    { id: "tan-study-07", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 7 of 7 · The master level", "Вопрос 7 из 7 · Ступень мастера"),
      body: l("Use the Tantra Reiki guide and answer briefly in your own words.", "Ответьте своими словами, опираясь на описание Тантра Рейки."),
      question: { type: "text", prompt: l("After which level can someone become a Tantra Reiki Master and teach and initiate others?", "После какой ступени можно стать мастером Тантра Рейки, обучать и инициировать других?") } },
    { id: "tan-03", phase: "tantra", kind: "practice", question: practiceQuestion,
      title: l("Notice connection and space", "Заметьте связь и пространство"),
      body: l("Notice where you feel comfortable sitting or standing. You can practise simple awareness without any touch or physical contact.", "Заметьте, где вам удобно сидеть или стоять. Можно просто наблюдать ощущения без прикосновений и физического контакта.") },
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
    { id: "kun-voices", phase: "kundalini", kind: "voices", videoKey: "kundalini-reiki", image: image.kundalini,
      title: l("What do other viewers say?", "Что пишут другие?"),
      body: l("Explore comments on the original video, then share your own experience.", "Посмотрите комментарии к видео и поделитесь своим опытом.") },
    { id: "kun-04", phase: "kundalini", kind: "reflection",
      title: l("Your meditation feedback", "Ваш отзыв о медитации"),
      body: l("Your experience matters. Share what stood out during the meditation in your own words.", "Ваш опыт важен. Расскажите своими словами, что особенно запомнилось во время медитации."),
      question: { type: "text", prompt: l("Tell us about your experience.", "Поделитесь своим опытом.") } },
    { id: "kun-05", phase: "kundalini", kind: "lesson",
      title: l("Explore the original manual", "Изучите оригинальную методичку"),
      body: l("The public Kundalini Reiki course offers the source manual and instructions to request teacher-guided Level 1.", "На публичной странице Кундалини Рейки есть исходная методичка и информация о согласовании первой ступени с преподавателем.") },
    { id: "kun-06", phase: "kundalini", kind: "reflection",
      title: l("A question about Kundalini Reiki", "Вопрос по Кундалини Рейки"),
      body: l("How is noticing support and grounding different from needing a particular energy sensation?", "Чем ощущение опоры и заземления отличается от требования почувствовать особую энергию?"),
      question: { type: "text", prompt: l("My answer about Kundalini Reiki…", "Мой ответ о Кундалини Рейки…") } },
    { id: "kun-done", phase: "kundalini", kind: "milestone", image: image.kundalini,
      title: l("Third lesson completed!", "Третий урок пройден!"),
      body: l("Keep going through all five lessons to prepare for a personal initiation with Andrey and explore joining our Reiki and energywork community.", "Пройдите остальные уроки, чтобы подготовиться к личной инициации у Андрея и присоединению к сообществу практиков Рейки и энергопрактик.") },
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
    title: l("My personal initiation letter", "Моё письмо перед инициацией"),
    body: l("Tell Andrey what you learned and why you would like a personal Reiki initiation.", "Напишите Андрею, что вы узнали и почему хотите пройти личную инициацию Рейки."),
    question: { type: "text", prompt: l("Why would I like to receive a personal initiation?", "Почему я хочу пройти личную инициацию?") } },
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
    ...pathSlides.tantra.slice(0, 2),
    commonSlides.find((slide) => slide.id === "presence-01")!,
    ...pathSlides.tantra.slice(2),
    ...commonSlides.filter((slide) => slide.phase === "tantra" && slide.id !== "presence-01"),
    ...pathSlides.kundalini,
    ...pathSlides.yggdrasil,
    ...commonSlides.filter((slide) => slide.phase === "initiation" && slide.id !== "paths-04"),
    ...initiationSlides,
    endSlides[0]!,
    commonSlides.find((slide) => slide.id === "paths-04")!,
    endSlides[1]!,
  ];
}
