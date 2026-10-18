// Versioned editorial source for the proposed Principles of Energywork AI learner.
// Educational content only. Course answers must not be persisted until owner-scoped
// private storage, consent, and migrations are separately implemented and verified.
import type { EnglishGuidedMeditation } from "./english-guided-meditations";

export const ENERGYWORK_COURSE_ID = "academy-energywork-principles";
export const ENERGYWORK_COURSE_VERSION = "2026-10-17.p0";

export type EnergyworkLocale = "en" | "ru";
export type Localized = { en: string; ru: string };
export type EnergyworkPath = "yggdrasil" | "tantra" | "kundalini";
export type EnergyworkPhase =
  | "welcome" | "flight" | "presence" | "intention"
  | "boundaries" | "paths" | "personal" | "complete";

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
  presence: l("Presence", "Присутствие"),
  intention: l("Intention", "Намерение"),
  boundaries: l("Choice & boundaries", "Выбор и границы"),
  paths: l("Three Reiki paths", "Три пути Рейки"),
  personal: l("My Reiki path", "Мой путь Рейки"),
  complete: l("My journey", "Моё путешествие"),
};

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
    body: l("Explore three Reiki traditions and the opportunity to receive an introductory Level 1 initiation in each one.", "Познакомьтесь с тремя направлениями Рейки и возможностью получить инициацию первой ступени по каждому из них.") },
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
    body: l("With eyes open or closed, if comfortable, notice the room and imagine a source of warmth or light. You may simply look around instead. Stop whenever you wish.", "С открытыми или закрытыми глазами, если комфортно, осмотритесь и представьте источник тепла или света. Можно просто замечать окружающее. Остановитесь в любой момент.") },
  { id: "flight-04", phase: "flight", kind: "reflection",
    title: l("What did you notice?", "Что вы заметили?"),
    body: l("Images and sensations can differ for everyone. 'Nothing in particular' is also a complete response.", "Образы и ощущения у всех разные. «Ничего особенного» — тоже полноценный ответ."),
    question: { type: "text", prompt: l("My observation…", "Моё наблюдение…") } },

  { id: "presence-01", phase: "presence", kind: "lesson", image: image.world,
    title: l("The foundation: presence", "Основа: присутствие"),
    body: l("Presence means bringing attention back to what is happening here and now, without trying to make a particular state happen.", "Присутствие — это возвращение внимания к тому, что происходит здесь и сейчас, без попыток вызвать особое состояние.") },
  { id: "presence-02", phase: "presence", kind: "practice", question: practiceQuestion,
    title: l("Notice three ordinary things", "Заметьте три обычные вещи"),
    body: l("Without changing your breathing, notice three sounds, colours or points of contact in your surroundings. Choose whichever feels easy.", "Не меняя дыхание, заметьте три звука, цвета или точки опоры вокруг. Выберите то, что вам комфортно.") },
  { id: "presence-03", phase: "presence", kind: "reflection",
    title: l("Your comfort today", "Ваш комфорт сегодня"),
    body: l("A voluntary personal check-in, not a health score or diagnosis. You can skip it.", "Добровольная самооценка, не показатель здоровья и не диагноз. Можно пропустить."),
    question: { type: "scale", prompt: l("How comfortable did this pause feel? 0 = not comfortable, 10 = very comfortable", "Насколько комфортной была пауза? 0 — совсем нет, 10 — очень комфортно") } },
  { id: "presence-04", phase: "presence", kind: "lesson",
    title: l("Presence is a choice", "Присутствие — это выбор"),
    body: l("There is no need to reproduce someone else's sensations. You can return to simple awareness at your own pace.", "Не нужно воспроизводить чужие ощущения. К простому наблюдению можно возвращаться в своём темпе.") },

  { id: "intention-01", phase: "intention", kind: "lesson", image: image.sun,
    title: l("What is intention?", "Что такое намерение?"),
    body: l("In these traditions, intention gives a practice direction. It is a personal purpose, not a promise that an outcome must happen.", "В этих традициях намерение задаёт направление практики. Это личная цель, а не обещание обязательного результата.") },
  { id: "intention-02", phase: "intention", kind: "lesson",
    title: l("Symbols help us reflect", "Символы помогают размышлять"),
    body: l("A tree may suggest grounding; sunlight may suggest clarity. The meaning belongs to the learner and is not a diagnostic interpretation.", "Дерево может напоминать об опоре, солнечный свет — о ясности. Смысл выбирает сам ученик; это не диагностика.") },
  { id: "intention-03", phase: "intention", kind: "reflection",
    title: l("Write your own intention", "Запишите своё намерение"),
    body: l("Keep it simple and within your influence, such as making room for a short quiet pause.", "Пусть оно будет простым и посильным, например выделить пару минут для спокойной паузы."),
    question: { type: "text", prompt: l("My intention for this course…", "Моё намерение для курса…") } },
  { id: "intention-04", phase: "intention", kind: "practice", question: practiceQuestion,
    title: l("Try your intention gently", "Мягко вспомните намерение"),
    body: l("For a few moments, notice your intention while staying aware of your surroundings. It is fine to change it later.", "На несколько мгновений вспомните своё намерение, оставаясь в контакте с окружающим. Позже его можно изменить.") },

  { id: "boundaries-01", phase: "boundaries", kind: "lesson", image: image.world,
    title: l("Choice and boundaries", "Выбор и границы"),
    body: l("In any spiritual practice, your comfort and consent matter. You never owe anyone an explanation for pausing or declining.", "В любой духовной практике важны комфорт и согласие. Вы можете сделать паузу или отказаться без объяснений.") },
  { id: "boundaries-02", phase: "boundaries", kind: "reflection",
    title: l("A practical choice", "Практическая ситуация"),
    body: l("A practice does not feel comfortable today. What could you do?", "Сегодня практика ощущается некомфортно. Что вы можете сделать?"),
    question: { type: "choice", prompt: l("Choose a response that respects your comfort", "Выберите ответ, уважающий ваш комфорт"),
      options: [
        { id: "pause", label: l("Pause or stop — that is okay", "Сделать паузу или остановиться — это нормально") },
        { id: "adapt", label: l("Choose an easier alternative", "Выбрать более простой вариант") },
        { id: "ask", label: l("Ask the teacher for clarification", "Попросить преподавателя объяснить") },
      ] } },
  { id: "boundaries-03", phase: "boundaries", kind: "practice", question: practiceQuestion,
    title: l("A moment of choice", "Момент выбора"),
    body: l("Try saying to yourself: 'I can choose the pace and the format.' You may also skip this exercise.", "Попробуйте сказать себе: «Я могу выбирать темп и формат». Это упражнение тоже можно пропустить.") },
  { id: "boundaries-04", phase: "boundaries", kind: "reflection",
    title: l("What makes practice feel safe?", "Что делает практику комфортной?"),
    body: l("Describe a simple condition or boundary that works for you.", "Опишите одно простое условие или границу, которая вам подходит."),
    question: { type: "text", prompt: l("For me, it helps when…", "Мне помогает, когда…") } },

  { id: "paths-01", phase: "paths", kind: "lesson",
    title: l("Three traditions, not one system", "Три традиции, а не одна система"),
    body: l("Yggdrasil, Tantra Reiki and Kundalini Reiki have different source materials and paths of study. Learn about each before deciding.", "Иггдрасиль, Тантра Рейки и Кундалини Рейки — разные программы со своими источниками. Познакомьтесь с каждой перед выбором.") },
  { id: "paths-02", phase: "paths", kind: "lesson", image: image.tree,
    title: l("Yggdrasil — the World Tree", "Иггдрасиль — Мировое Древо"),
    body: l("This course introduces a runic Reiki tradition through the image of Yggdrasil, the World Tree, and introductory streams.", "Здесь изучают руническую традицию Рейки через образ Иггдрасиля, Мирового Древа, и вводные потоки.") },
  { id: "paths-03", phase: "paths", kind: "lesson", image: image.tantra,
    title: l("Tantra Reiki — Spring of Life", "Тантра Рейки — Источник жизни"),
    body: l("This tradition uses spiritual language around vitality, creativity, relationship and presence. Level 1 is the Spring of Life.", "Эта традиция использует духовный язык жизненности, творчества, отношений и присутствия. Первая ступень — «Источник жизни».") },
  { id: "paths-04", phase: "paths", kind: "path-choice",
    title: l("Choose your learning path", "Выберите свой путь"),
    body: l("Choose one branch to explore now. You can view the other traditions later; this is not an initiation.", "Выберите одну ветку для изучения. С другими можно познакомиться позже; это не инициация.") },
];

const pathSlides: Record<EnergyworkPath, EnergyworkSlide[]> = {
  yggdrasil: [
    { id: "ygg-01", phase: "personal", kind: "lesson", image: image.tree,
      title: l("The roots, trunk and crown", "Корни, ствол и крона"),
      body: l("The World Tree is an image used for symbolic contemplation. What might roots, trunk and branches mean to you?", "Мировое Древо — образ для символического размышления. Что для вас могут означать корни, ствол и ветви?") },
    { id: "ygg-02", phase: "personal", kind: "video", videoKey: "reiki-yggdrasil",
      title: l("Original Reiki Yggdrasil meditation", "Оригинальная медитация Рейки Иггдрасиль"),
      body: l("English recording shared by Andrey. Participation is optional.", "Английская запись Андрея. Участие необязательно.") },
    { id: "ygg-03", phase: "personal", kind: "practice", question: practiceQuestion,
      title: l("Draw or imagine a tree", "Нарисуйте или представьте дерево"),
      body: l("On paper, draw roots, a trunk and a crown — or imagine them. Keep the drawing for yourself; image upload is not enabled in this preview.", "Нарисуйте на бумаге корни, ствол и крону — либо представьте их. Рисунок остаётся у вас; загрузка изображений пока недоступна.") },
    { id: "ygg-04", phase: "personal", kind: "reflection",
      title: l("Your World Tree reflection", "Ваш образ Мирового Древа"),
      body: l("There is no prescribed interpretation of your drawing.", "У рисунка нет обязательной трактовки."),
      question: { type: "text", prompt: l("What does your tree mean to you?", "Что ваше дерево значит лично для вас?") } },
    { id: "ygg-05", phase: "personal", kind: "lesson",
      title: l("Continue with the first-level materials", "Продолжите изучение первой ступени"),
      body: l("The introductory streams and source materials are on the separate Yggdrasil course page. A teacher-guided initiation must be arranged with Andrey.", "Вводные потоки и источники — на отдельной странице Иггдрасиля. Инициацию с преподавателем необходимо согласовать с Андреем.") },
  ],
  tantra: [
    { id: "tan-01", phase: "personal", kind: "lesson", image: image.tantra,
      title: l("The Spring of Life", "Источник жизни"),
      body: l("The first step of Tantra Reiki uses the Spring of Life as a spiritual metaphor. There is no required sensation to achieve.", "Первая ступень Тантра Рейки использует «Источник жизни» как духовный образ. Не нужно достигать какого-либо обязательного ощущения.") },
    { id: "tan-02", phase: "personal", kind: "video", videoKey: "tantra-reiki",
      title: l("Original Tantra Reiki practice", "Оригинальная практика Тантра Рейки"),
      body: l("Watch Andrey's original English practice at your chosen pace.", "Посмотрите оригинальную английскую практику Андрея в комфортном темпе.") },
    { id: "tan-03", phase: "personal", kind: "practice", question: practiceQuestion,
      title: l("Notice connection and space", "Заметьте связь и пространство"),
      body: l("Notice where you feel comfortable sitting or standing. You can practise simple awareness without any touch or physical contact.", "Заметьте, где вам удобно сидеть или стоять. Можно просто наблюдать ощущения без прикосновений и физического контакта.") },
    { id: "tan-04", phase: "personal", kind: "reflection",
      title: l("A personal observation", "Личное наблюдение"),
      body: l("Reflect on presence, connection or your own boundaries.", "Подумайте о присутствии, связи или собственных границах."),
      question: { type: "text", prompt: l("I noticed…", "Я заметил(а)…") } },
    { id: "tan-05", phase: "personal", kind: "lesson",
      title: l("Continue with Tantra Reiki Level 1", "Продолжите первую ступень Тантра Рейки"),
      body: l("Read the first-level course materials. Any initiation requires a separate teacher-led arrangement.", "Изучите материалы первой ступени. Любая инициация согласуется с преподавателем отдельно.") },
  ],
  kundalini: [
    { id: "kun-01", phase: "personal", kind: "lesson", image: image.kundalini,
      title: l("An introduction to Kundalini Reiki", "Знакомство с Кундалини Рейки"),
      body: l("This is a distinct three-level spiritual teaching. The original Paul Crick manual is available from the public course page.", "Это отдельная трёхступенчатая духовная система. Оригинальная методичка Пола Крика доступна на странице курса.") },
    { id: "kun-02", phase: "personal", kind: "video", videoKey: "kundalini-reiki",
      title: l("Original Kundalini Reiki meditation", "Оригинальная медитация Кундалини Рейки"),
      body: l("Andrey's English-language source recording. Stop or skip whenever you wish.", "Авторская английская запись Андрея. В любой момент можно остановить или пропустить.") },
    { id: "kun-03", phase: "personal", kind: "practice", question: practiceQuestion,
      title: l("A moment of grounding", "Момент опоры"),
      body: l("Notice the ground beneath your feet or the support of your chair. This is an optional everyday awareness exercise.", "Заметьте пол под ногами или опору стула. Это необязательное упражнение на повседневное внимание.") },
    { id: "kun-04", phase: "personal", kind: "reflection",
      title: l("What felt supportive?", "Что помогло почувствовать опору?"),
      body: l("Keep the observation simple. There is no special outcome expected.", "Запишите простое наблюдение. Особого результата не требуется."),
      question: { type: "text", prompt: l("For me…", "Для меня…") } },
    { id: "kun-05", phase: "personal", kind: "lesson",
      title: l("Explore the original manual", "Изучите оригинальную методичку"),
      body: l("The public Kundalini Reiki course offers the source manual and instructions to request teacher-guided Level 1.", "На публичной странице Кундалини Рейки есть исходная методичка и информация о согласовании первой ступени с преподавателем.") },
  ],
};

const endSlides: EnergyworkSlide[] = [
  { id: "end-01", phase: "complete", kind: "reflection",
    title: l("What will you carry forward?", "Что вы возьмёте с собой?"),
    body: l("Think about one small step you would like to remember. Your response in this preview is not yet saved to your account.", "Подумайте об одном небольшом шаге, который хотите запомнить. В этой предварительной версии ответ пока не сохраняется в аккаунте."),
    question: { type: "text", prompt: l("My next step…", "Мой следующий шаг…") } },
  { id: "end-02", phase: "complete", kind: "finish", image: image.world,
    title: l("Your Energywork Journey", "Ваш путь в энергетических практиках"),
    body: l("You have explored three foundations and chosen a Reiki learning path. This educational preview does not grant Level 1 initiation or certification.", "Вы познакомились с тремя основами и выбрали путь обучения Рейки. Образовательный курс не выдаёт инициацию первой ступени или сертификат.") },
];

export function energyworkSlides(path: EnergyworkPath | null): EnergyworkSlide[] {
  return [...commonSlides, ...(path ? pathSlides[path] : []), ...(path ? endSlides : [])];
}
