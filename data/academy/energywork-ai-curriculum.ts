// Versioned editorial source for the proposed Principles of Energywork AI learner.
// Educational content only. Course answers must not be persisted until owner-scoped
// private storage, consent, and migrations are separately implemented and verified.
import type { EnglishGuidedMeditation } from "./english-guided-meditations";
import { yggdrasilTextTestimonials } from "./yggdrasil-testimonials";
import { yggdrasilPreparationQuestions } from "./yggdrasil-preparation-questions";

export const ENERGYWORK_COURSE_ID = "academy-energywork-principles";
export const ENERGYWORK_COURSE_VERSION = "2026-10-19.p9";

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
  // Only verified public reviews have a source page. Screenshot-only examples do not.
  sourcePath?: string;
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
  // A second independently saved answer can share one visual slide.
  secondaryQuestion?: { id: string; prompt: Localized };
};
const l = (en: string, ru: string): Localized => ({ en, ru });
const image = {
  world: "/academy/reiki-yggdrasil/source/program-overview.jpg",
  sun: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  tree: "/academy/reiki-yggdrasil/source/basic-program.jpg",
  tantra: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
  kundalini: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
};


// Four anonymized reflections transcribed from the course author's screenshots.
// These are supplied examples, not independently verified YouTube comments.
// Keep each complete reflection available in the existing scrollable review carousel.
export const sunVoices: EnergyworkTestimonial[] = [
  {
    id: "sun-example-01",
    quote: l("Yes, I managed to play with the Sun, as an energy flow and a song. I connected with an inner spark, called to the Sun, rode the light and danced with it. There was a pulse and flow until I was surrounded by the Sun. Then it became play — energy shifting in the cells and opening. I used sexual energy as a grounding point in the physical world, in resonance with the frequency of light codes. For me, it felt more like an ignition switch for something already within all of us: to ground and rise at the same time.", "Да, мне удалось поиграть с Солнцем — словно с потоком энергии и песней. Я почувствовал(а) связь с внутренней искрой, позвал(а) Солнце, словно оседлал(а) свет и танцевал(а) с ним. Были пульсация и поток, пока Солнце не окружило меня. Затем всё превратилось в игру: словно энергия двигалась в клетках и что-то раскрывалось. Сексуальная энергия стала для меня точкой заземления в физическом мире, в резонансе с частотой световых кодов. Это было похоже на включение того, что уже есть в каждом из нас: одновременно заземляться и подниматься."),
    attribution: l("Anonymous reflection · supplied example", "Анонимный отзыв · предоставленный пример"),
  },
  {
    id: "sun-example-02",
    quote: l("Yes, I was able to fly out. First it was bright, then it turned dark like night, but I could still see the light — almost like an eclipse.", "Да, мне удалось взлететь. Сначала было светло, потом стало темно, словно ночью, но свет всё ещё был виден — почти как во время затмения."),
    attribution: l("Anonymous reflection · supplied example", "Анонимный отзыв · предоставленный пример"),
  },
  {
    id: "sun-example-03",
    quote: l("I did. The Sun’s energy seemed to flow directly into a glowing sun in my chest. It felt as though it nourished a wound I imagined or sensed in my chest.", "Да. Казалось, что солнечный поток направляется прямо к светящемуся Солнцу в моей груди. Было ощущение, будто он питает рану, которую я представлял(а) или чувствовал(а) внутри груди."),
    attribution: l("Anonymous reflection · supplied example", "Анонимный отзыв · предоставленный пример"),
  },
  {
    id: "sun-example-04",
    quote: l("Every time I come into contact with the energy of the Sun, the first wave brings goosebumps. The energy seems to roll along my body as if awakening it, followed by a wave of emotions depending on how my body feels. I was tired, and aggression arose, but I chose to use this energy for myself. It felt as if I had drunk many cups of coffee — my body was shaking. When I accepted this state, the energy calmed down.", "Каждый раз, когда я соприкасаюсь с энергией Солнца, первая волна вызывает мурашки. Кажется, энергия проходит по телу, пробуждая его, а затем, в зависимости от физического состояния, приходит волна эмоций. Я устал(а), поэтому появилась агрессия, но я решил(а) использовать эту энергию для себя. Было ощущение, будто я выпил(а) много чашек кофе: тело дрожало. Когда я принял(а) это состояние, энергия успокоилась."),
    attribution: l("Anonymous reflection · supplied example", "Анонимный отзыв · предоставленный пример"),
  },
];

/** Published Reiki Yggdrasil feedback reused from the original testimonial archive. */
const yggdrasilVoices: EnergyworkTestimonial[] = yggdrasilTextTestimonials.map((entry) => ({
  id: entry.id,
  quote: { en: entry.quote.en, ru: entry.quote.ru.replace(/^«|»$/g, "") },
  attribution: l("Reiki Yggdrasil learner · published course feedback", "Участник Рейки Иггдрасиль · отзыв об обучении"),
  sourcePath: "reiki/yggdrasil",
}));

// Full archived learner reports, not isolated promotional excerpts.
// EN: tantra-reiki-full.generated.json + tantra-reiki-ru-en.generated.json;
// RU: original Russian source where available, faithful translations for Margaret and Litten.
// These are subjective reports about the course, not the exact meditation recording.
export const tantraVoices: EnergyworkTestimonial[] = [
  {
    id: "margaret",
    quote: l("The first time I followed the steps the video, I felt a powerful energy coming in with the Tantric flow. It was immediately noticable when it was invited in. It was also a shift in perception and it felt like flowing energy as I went on my day - I was in the flow. Loving and flowing movements that were in deeper connection with myself. Mundane tasks (like laundry) seemed effortless and that previously seemed irritating. It didn't seem to matter what I was doing because of the soft and loving energy flowing. This distinct continuity of pleasurable energy continued throughout for the rest of the day", "Когда я впервые выполнила шаги из видео, я почувствовала мощный поток энергии Тантра Рейки. Он был заметен сразу, как только я его пригласила. Изменилось и моё восприятие: ощущение потока сопровождало меня весь день — я была в потоке. Движения стали мягкими, любящими, я чувствовала более глубокую связь с собой. Обычные дела (например, стирка), которые раньше раздражали, давались словно без усилий. Казалось, уже не так важно, что именно я делаю: меня сопровождала мягкая, любящая энергия. Это приятное ощущение непрерывного потока сохранялось до конца дня."),
    attribution: l("Margaret · published Tantra Reiki learner review", "Маргарет · опубликованный отзыв о Тантра Рейки"),
    sourcePath: "reiki/tantra-reiki",
  },
  {
    id: "olga",
    quote: l("Trans flow. You enter an altered state and you can stick to it. A soft and gentle flow that dissolves some tensions and blocks while working with the situation. Activation of sexual energy - I felt energy pulsations, a gentle awakening of energy in the lower centers. The attraction is not quite understood, the feeling is in upper chakras. Anahata, vishuddha. Like opening, expanding and at the same time blooming.", "Трансовый поток. Входишь в измененное состояние и можно на этом залипать.\n\nМягкий и бережный поток который растворяет какие-то напряжения и блоки, в работе с ситуацией.\n\nАктивизация сексуальной энергии - ощутила энергетические пульсации, мягкое пробуждение энергии в нижних центрах.\n\nПривлекательность не совсем поняла, ощущения вверху. Агахана, вишудха. Как раскрытие, расширение и в то же время"),
    attribution: l("Olga · published Tantra Reiki learner review", "Ольга · опубликованный отзыв о Тантра Рейки"),
    sourcePath: "reiki/tantra-reiki",
  },
  {
    id: "litten",
    quote: l("I felt really dizzy I heard the blood flow flushing in my ears like sound of water fall In My two palms pointing up I felt like pillars coming upwards .... they meet in big energy above First they were flames 🔥 A strong light from a night sky 🌌... In thé attunement I couldn’t get through to one of us, It was blocked by a branch with strong cover. On the other hand, during the Tantra flow to Andy the pillars from my hands were like light beams reaching up up up..... After the attunement, I send to my daughter.... I feel the heat in the palms of my hands. The flow meets in a triangle above me .... A space that represents the person I’m sending to. My daughter is a gentle being and truly the flow was adjusted to exactly how much she could take in one time.\n\nWill still practice with attuned partner", "У меня сильно кружилась голова. Я слышала шум крови в ушах — словно водопад. Из обеих ладоней, обращённых вверх, будто поднимались столбы энергии… Они соединились высоко надо мной. Сначала это были языки пламени 🔥, затем — сильный свет ночного неба 🌌. Во время инициации мне не удалось достучаться до одного из нас: как будто мешала ветка с плотным покровом. Зато во время потока Тантра Рейки, направленного Энди, столбы из моих рук были словно лучи света, уходящие всё выше. После инициации я посылала энергию дочери. Я ощущала тепло в ладонях. Потоки соединились в треугольник надо мной — пространство, представляющее того, кому я посылаю энергию. Моя дочь — очень нежное существо, и поток, как мне показалось, подстроился ровно под то, сколько она могла принять за один раз. Я ещё буду практиковать с партнёром, прошедшим инициацию."),
    attribution: l("Litten · published Tantra Reiki learner review", "Литтен · опубликованный отзыв о Тантра Рейки"),
    sourcePath: "reiki/tantra-reiki",
  },
  {
    id: "tantra-level-1",
    quote: l("I feel relaxed :) rested :) I look at myself in the mirror and admire myself :) Outside, I delight in the wind and the sun. A state of unconditional Love!\n\nThank you, Andrey! As beautiful as always :)", "Состояние розслабленое) отдохнувшая) смотрю на себя в зеркало и любуюсь )) На улице кайфую От ветра) Солнца) Состояние Безусловной Любви!\n\nБлагодарю Андрей! Как всегда красиво )"),
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

// A written meditation reflection follows each practice. Five short study
// questions in Tantra Reiki require a brief written answer before advancing.
// The personal-initiation review also checks all five lesson journals.
export const energyworkInitiationRequirements: ReadonlyArray<{
  lesson: EnergyworkPhase;
  reportId: string;
  questionId: string;
  questionIds: readonly string[];
}> = [
  { lesson: "flight", reportId: "flight-04", questionId: "flight-05", questionIds: ["flight-05"] },
  { lesson: "tantra", reportId: "tan-04", questionId: "tan-study-04", questionIds: ["tan-study-04", "tan-06", "tan-study-06", "tan-study-07", "tan-study-02"] },
  { lesson: "kundalini", reportId: "kun-04", questionId: "kun-study-v2-01", questionIds: ["kun-study-v2-01", "kun-study-v2-02", "kun-study-v2-03", "kun-study-v2-04", "kun-study-v2-05", "kun-study-v2-06", "kun-study-v2-07", "kun-study-v2-08", "kun-study-v2-09"] },
  { lesson: "yggdrasil", reportId: "ygg-04", questionId: "ygg-study-v2-01", questionIds: ["ygg-study-v2-01", "ygg-study-v2-02", "ygg-study-v2-03", "ygg-study-v2-04", "ygg-study-v2-05", "ygg-study-v2-06", "ygg-study-v2-07"] },
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

// Two optional check-ins without a required sensation or performance goal.
const sunPracticeQuestion: EnergyworkQuestion = {
  type: "choice",
  prompt: l("What did you notice?", "Что вы почувствовали?"),
  options: [
    { id: "felt-light", label: l("I could feel the light and warmth", "Я почувствовал(а) свет и тепло") },
    { id: "more-practice", label: l("I need more practice", "Мне нужно ещё попрактиковаться") },
  ],
};
const tantraPracticeQuestion: EnergyworkQuestion = {
  type: "choice",
  prompt: l("How did it feel?", "Как прошла практика?"),
  options: [
    { id: "connected", label: l("I could feel connection", "Я почувствовал(а) связь") },
    { id: "more-practice", label: l("I need more practice", "Мне нужно ещё попрактиковаться") },
  ],
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
  { id: "flight-03", phase: "flight", kind: "practice", question: sunPracticeQuestion,
    title: l("A gentle pause", "Небольшая пауза"),
    body: l("For one minute, notice the Sun’s light and warmth within and around you.",
      "Одну минуту замечайте свет и тепло Солнца внутри себя и вокруг.") },
  { id: "flight-voices", phase: "flight", kind: "voices", videoKey: "flight-to-sun", image: image.sun,
    title: l("How others described their journey to the Sun", "Как другие описывают свой полёт к Солнцу"),
    body: l("Four anonymous examples of personal reflections. Your own experience may be different.", "Четыре анонимных примера личных впечатлений. Ваш опыт может быть другим."),
    testimonials: sunVoices },
  { id: "flight-05", phase: "flight", kind: "reflection",
    title: l("What did the Sun mean to you?", "Что для вас означает Солнце?"),
    body: l("Write one thought about the Sun as a symbol.", "Запишите одну мысль об образе Солнца."),
    question: { type: "text", prompt: l("Your thought…", "Ваша мысль…") } },
  { id: "flight-04", phase: "flight", kind: "reflection",
    title: l("Your meditation feedback", "Ваш отзыв о медитации"),
    body: l("Did you manage to fly up to the Sun during the Sun meditation?", "Удалось ли вам подняться к Солнцу во время медитации «Полёт к Солнцу»?"),
    question: { type: "text", prompt: l("Describe please how was the Sun energy flow?", "Опишите, пожалуйста, каким был поток солнечной энергии.") } },
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
      title: l("A one-minute tree image", "Минута с образом дерева"),
      body: l("For one minute, imagine or draw a tree with roots, a trunk and a crown.", "Одну минуту представляйте или рисуйте дерево с корнями, стволом и кроной.") },
    { id: "ygg-voices", phase: "yggdrasil", kind: "voices", videoKey: "reiki-yggdrasil", image: image.tree,
      title: l("Voices from Reiki Yggdrasil", "Отзывы о Рейки Иггдрасиль"),
      body: l("Published learner experiences from the course, not this exact recording.", "Отзывы учеников о курсе, а не об этой конкретной записи."),
      testimonials: yggdrasilVoices },
    { id: "ygg-04", phase: "yggdrasil", kind: "reflection",
      title: l("Your meditation feedback", "Ваш отзыв о медитации"),
      body: l("Your experience matters. Share what stood out during the meditation in your own words.", "Ваш опыт важен. Расскажите своими словами, что особенно запомнилось во время медитации."),
      question: { type: "text", prompt: l("Tell us about your experience.", "Поделитесь своим опытом.") } },
    { id: "ygg-05", phase: "yggdrasil", kind: "lesson",
      title: l("Explore the Reiki Yggdrasil guide", "Изучите материалы Рейки Иггдрасиль"),
      body: l("Read the World Tree story and the five-level Basic Course guide. Seven short study questions follow.", "Прочитайте историю Мирового Древа и описание пяти ступеней курса. Затем ответьте на семь коротких вопросов.") },
    { id: "ygg-study-v2-01", phase: "yggdrasil", kind: "reflection", image: image.tree,
      title: l("Question 1 of 7 · Reiki and Runes", "Вопрос 1 из 7 · Рейки и руны"),
      body: l("Read the course materials and answer in your own words.", "Прочитайте материалы курса и ответьте своими словами."),
      question: { type: "text", prompt: l(yggdrasilPreparationQuestions.en[0], yggdrasilPreparationQuestions.ru[0]) } },
    { id: "ygg-study-v2-02", phase: "yggdrasil", kind: "reflection", image: image.tree,
      title: l("Question 2 of 7 · Tradition and Usui Reiki", "Вопрос 2 из 7 · Традиция и Усуи Рейки"),
      body: l("Read the course materials and answer in your own words.", "Прочитайте материалы курса и ответьте своими словами."),
      question: { type: "text", prompt: l(yggdrasilPreparationQuestions.en[1], yggdrasilPreparationQuestions.ru[1]) } },
    { id: "ygg-study-v2-03", phase: "yggdrasil", kind: "reflection", image: image.tree,
      title: l("Question 3 of 7 · The World Tree", "Вопрос 3 из 7 · Мировое Древо"),
      body: l("Read the course materials and answer in your own words.", "Прочитайте материалы курса и ответьте своими словами."),
      question: { type: "text", prompt: l(yggdrasilPreparationQuestions.en[2], yggdrasilPreparationQuestions.ru[2]) } },
    { id: "ygg-study-v2-04", phase: "yggdrasil", kind: "reflection", image: image.tree,
      title: l("Question 4 of 7 · Healing Stream", "Вопрос 4 из 7 · Поток «Целительство»"),
      body: l("Read the course materials and answer in your own words.", "Прочитайте материалы курса и ответьте своими словами."),
      question: { type: "text", prompt: l(yggdrasilPreparationQuestions.en[3], yggdrasilPreparationQuestions.ru[3]) } },
    { id: "ygg-study-v2-05", phase: "yggdrasil", kind: "reflection", image: image.tree,
      title: l("Question 5 of 7 · Protection Stream", "Вопрос 5 из 7 · Поток «Защита»"),
      body: l("Read the course materials and answer in your own words.", "Прочитайте материалы курса и ответьте своими словами."),
      question: { type: "text", prompt: l(yggdrasilPreparationQuestions.en[4], yggdrasilPreparationQuestions.ru[4]) } },
    { id: "ygg-study-v2-06", phase: "yggdrasil", kind: "reflection", image: image.tree,
      title: l("Question 6 of 7 · Money Stream Activation", "Вопрос 6 из 7 · Активация денежного потока"),
      body: l("Read the course materials and answer in your own words.", "Прочитайте материалы курса и ответьте своими словами."),
      question: { type: "text", prompt: l(yggdrasilPreparationQuestions.en[5], yggdrasilPreparationQuestions.ru[5]) } },
    { id: "ygg-study-v2-07", phase: "yggdrasil", kind: "reflection", image: image.tree,
      title: l("Question 7 of 7 · Pantheons and Deities", "Вопрос 7 из 7 · Пантеоны и божества"),
      body: l("Read the course materials and answer in your own words.", "Прочитайте материалы курса и ответьте своими словами."),
      question: { type: "text", prompt: l(yggdrasilPreparationQuestions.en[6], yggdrasilPreparationQuestions.ru[6]) } },
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
      body: l("Read Andrey's guide to the tradition, its nine levels and practices. Five short study questions follow.", "Прочитайте описание Тантра Рейки, девяти ступеней и практик Андрея. Затем ответьте на пять коротких вопросов.") },
    { id: "tan-study-04", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 1 of 5 · Tradition and foundations", "Вопрос 1 из 5 · Традиция и основы"),
      body: l("Write one to three short sentences in your own words.", "Ответьте своими словами в одном–трёх предложениях."),
      question: { type: "text", prompt: l("Which culture and tradition form the foundation of Tantra Reiki?", "Какая культура и традиция лежат в основе Тантра Рейки?") } },
    { id: "tan-06", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 2 of 5 · Origins of Tantra Reiki", "Вопрос 2 из 5 · Происхождение Тантра Рейки"),
      body: l("Write one to three short sentences in your own words.", "Ответьте своими словами в одном–трёх предложениях."),
      question: { type: "text", prompt: l("Who created the Tantra Reiki system, and what is the source of its energy?", "Кто создал систему Тантра Рейки и каков источник её энергии?") } },
    { id: "tan-study-06", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 3 of 5 · Mandalas and artifacts", "Вопрос 3 из 5 · Мандалы и артефакты"),
      body: l("Write one to three short sentences in your own words.", "Ответьте своими словами в одном–трёх предложениях."),
      question: { type: "text", prompt: l("At which levels do students learn to create mandalas and work with artifacts?", "На каких ступенях ученики учатся создавать мандалы и работать с артефактами?") } },
    { id: "tan-study-07", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 4 of 5 · The master level", "Вопрос 4 из 5 · Ступень мастера"),
      body: l("Write one to three short sentences in your own words.", "Ответьте своими словами в одном–трёх предложениях."),
      question: { type: "text", prompt: l("After which level can someone become a Tantra Reiki Master and teach and initiate others?", "После какой ступени можно стать мастером Тантра Рейки, обучать и инициировать других?") } },
    { id: "tan-study-02", phase: "tantra", kind: "reflection", image: image.tantra,
      title: l("Question 5 of 5 · Purpose and use", "Вопрос 5 из 5 · Цель и применение"),
      body: l("Combine the purpose and possible uses in one short answer.", "Объедините цель и возможное применение в одном коротком ответе."),
      question: { type: "text", prompt: l("What is the main purpose of the Tantra Reiki flow, what does it offer a person, and for what purposes can it be used?", "Какова главная цель потока Тантра Рейки, что он даёт человеку и для каких целей его можно использовать?") } },
    { id: "tan-03", phase: "tantra", kind: "practice", question: tantraPracticeQuestion,
      title: l("Notice connection and space", "Заметьте связь и пространство"),
      body: l("For one minute, notice your sense of connection and space, without touch.", "Одну минуту замечайте связь с собой и пространством без прикосновений.") },
  ],
  kundalini: [
    { id: "kun-01", phase: "kundalini", kind: "lesson", image: image.kundalini,
      title: l("An introduction to Kundalini Reiki", "Знакомство с Кундалини Рейки"),
      body: l("This is a distinct three-level spiritual teaching. The original Paul Crick manual is available from the public course page.", "Это отдельная трёхступенчатая духовная система. Оригинальная методичка Пола Крика доступна на странице курса.") },
    { id: "kun-02", phase: "kundalini", kind: "video", videoKey: "kundalini-reiki",
      title: l("Original Kundalini Reiki meditation", "Оригинальная медитация Кундалини Рейки"),
      body: l("Andrey's English-language source recording. Stop or skip whenever you wish.", "Авторская английская запись Андрея. В любой момент можно остановить или пропустить.") },
    { id: "kun-03", phase: "kundalini", kind: "practice", question: practiceQuestion,
      title: l("A one-minute grounding pause", "Минута ощущения опоры"),
      body: l("For one minute, notice the support of the floor or your chair.", "Одну минуту замечайте опору пола или стула.") },
    { id: "kun-voices", phase: "kundalini", kind: "voices", videoKey: "kundalini-reiki", image: image.kundalini,
      title: l("What do other viewers say?", "Что пишут другие?"),
      body: l("Explore comments on the original video, then share your own experience.", "Посмотрите комментарии к видео и поделитесь своим опытом.") },
    { id: "kun-04", phase: "kundalini", kind: "reflection",
      title: l("Your meditation feedback", "Ваш отзыв о медитации"),
      body: l("Your experience matters. Share what stood out during the meditation in your own words.", "Ваш опыт важен. Расскажите своими словами, что особенно запомнилось во время медитации."),
      question: { type: "text", prompt: l("Tell us about your experience.", "Поделитесь своим опытом.") } },
    { id: "kun-05", phase: "kundalini", kind: "lesson",
      title: l("Explore the original manual", "Изучите оригинальную методичку"),
      body: l("Read Paul Crick’s manual and explore nine curious questions about the three levels.", "Прочитайте методичку Пола Крика и ответьте на девять любопытных вопросов о трёх ступенях.") },
    { id: "kun-study-v2-01", phase: "kundalini", kind: "reflection", image: image.kundalini,
      title: l("Question 1 of 9 · The river's source", "Вопрос 1 из 9 · Исток реки"),
      body: l("Imagine the traditional energy path as a river.", "Представьте традиционный энергетический путь как реку."),
      question: { type: "text", prompt: l("If Kundalini were a river, where would it begin its journey through your body?", "Если бы энергия Кундалини была рекой, откуда начиналось бы её путешествие по вашему телу?"), options: [{ id: "root", label: l("At the base of my spine", "У основания позвоночника") }, { id: "heart", label: l("In the heart", "В области сердца") }, { id: "head", label: l("At the top of my head", "На макушке") }], help: l("The manual describes the root chakra as the entrance of Kundalini energy.", "В методичке корневая чакра описана как вход энергии Кундалини.") } },
    { id: "kun-study-v2-02", phase: "kundalini", kind: "reflection", image: image.kundalini,
      title: l("Question 2 of 9 · The inner fire", "Вопрос 2 из 9 · Внутренний огонь"),
      body: l("Explore the imagery behind this name.", "Исследуйте образ, скрытый в этом названии."),
      question: { type: "text", prompt: l("Why is Kundalini called the “inner fire”?", "Почему Кундалини называют «внутренним огнём»?"), options: [{ id: "symbol", label: l("It symbolizes an ascending energy", "Это образ восходящей энергии") }, { id: "heat", label: l("It means actual flames or heat", "Это буквально пламя или жар") }, { id: "light", label: l("It refers only to sunlight", "Речь только о солнечном свете") }], help: l("“Kundalini fire” is a metaphor used in the tradition, not a literal flame.", "«Огонь Кундалини» — образ в рамках традиции, а не буквальное пламя.") } },
    { id: "kun-study-v2-03", phase: "kundalini", kind: "reflection", image: image.kundalini,
      title: l("Question 3 of 9 · Control or flow?", "Вопрос 3 из 9 · Контроль или поток?"),
      body: l("What approach does the original manual suggest?", "Какой подход предлагает оригинальная методичка?"),
      question: { type: "text", prompt: l("What matters more in Reiki: controlling the energy or letting it flow freely?", "Что важнее в Reiki: управлять энергией или позволить ей свободно течь?"), options: [{ id: "flow", label: l("Relax and let it flow", "Расслабиться и позволить потоку идти") }, { id: "control", label: l("Control each movement", "Контролировать каждое движение") }, { id: "force", label: l("Try to make the feeling stronger", "Стараться усилить ощущения") }], help: l("Paul Crick's instructions emphasize intention and relaxed attention.", "В инструкции Пола Крика важны намерение и спокойное внимание.") } },
    { id: "kun-study-v2-04", phase: "kundalini", kind: "reflection", image: image.kundalini,
      title: l("Question 4 of 9 · A little secret", "Вопрос 4 из 9 · Маленький секрет"),
      body: l("Choose what starts a traditional Reiki practice.", "Выберите, с чего начинается практика Рейки по традиции."),
      question: { type: "text", prompt: l("What's Reiki's little secret: hand movements, concentration, or intention?", "В чём маленький секрет Reiki: в особенных движениях рук, концентрации или силе намерения?"), options: [{ id: "intention", label: l("A clear intention", "Ясное намерение") }, { id: "hands", label: l("Special hand movements", "Особые движения рук") }, { id: "focus", label: l("Intense concentration", "Сильная концентрация") }], help: l("In this manual, intention is central; complex rituals are not required.", "В этой методичке главное — намерение, а сложные ритуалы не нужны.") } },
    { id: "kun-study-v2-05", phase: "kundalini", kind: "reflection", image: image.kundalini,
      title: l("Question 5 of 9 · A gift from your palms", "Вопрос 5 из 9 · Дар ваших ладоней"),
      body: l("There is no wrong answer — choose what feels meaningful.", "Здесь нет неправильного ответа — выберите близкое вам."),
      question: { type: "text", prompt: l("If your palms could share one quality, would you choose warmth, calm, love, or strength?", "Если бы ваши ладони передавали одно качество, что бы вы выбрали: тепло, спокойствие, любовь или силу?"), options: [{ id: "warmth", label: l("Warmth", "Тепло") }, { id: "calm", label: l("Calm", "Спокойствие") }, { id: "love", label: l("Love", "Любовь") }, { id: "strength", label: l("Strength", "Силу") }] } },
    { id: "kun-study-v2-06", phase: "kundalini", kind: "reflection", image: image.kundalini,
      title: l("Question 6 of 9 · A moment of care", "Вопрос 6 из 9 · Момент заботы"),
      body: l("Notice what needs your gentle attention today.", "Заметьте, чему сегодня хочется уделить внимание."),
      question: { type: "text", prompt: l("If you could focus on one part of your body, where would you offer the most care?", "Если бы вы направили внимание в любую часть тела, какое место больше всего нуждается в заботе?"), options: [{ id: "shoulders", label: l("My shoulders and neck", "Плечам и шее") }, { id: "chest", label: l("My chest and heart area", "Груди и области сердца") }, { id: "back", label: l("My back", "Спине") }, { id: "other", label: l("Another place", "Другому месту") }] } },
    { id: "kun-study-v2-07", phase: "kundalini", kind: "reflection", image: image.kundalini,
      title: l("Question 7 of 9 · Beyond distance", "Вопрос 7 из 9 · Вне расстояния"),
      body: l("What does the traditional Kundalini Reiki manual describe?", "Что об этом говорится в методичке Кундалини Рейки?"),
      question: { type: "text", prompt: l("Can Reiki be shared over a distance?", "Можно ли передавать Reiki на расстоянии?"), options: [{ id: "yes", label: l("Yes, by intention and visualization", "Да, через намерение и визуализацию") }, { id: "touch", label: l("Only through physical touch", "Только через прикосновение") }, { id: "unsure", label: l("I'm not sure yet", "Пока не знаю") }], help: l("The manual describes remote Reiki as a spiritual practice; this is not proof of remote medical effects.", "Методичка описывает дистанционную Рейки как духовную практику, а не доказанный лечебный метод.") } },
    { id: "kun-study-v2-08", phase: "kundalini", kind: "reflection", image: image.kundalini,
      title: l("Question 8 of 9 · The next level", "Вопрос 8 из 9 · Следующая ступень"),
      body: l("One new practice is introduced at the second level.", "На второй ступени появляется новая практика."),
      question: { type: "text", prompt: l("What changes at Kundalini Reiki Level 2?", "Что меняется на втором уровне Kundalini Reiki?"), options: [{ id: "meditation", label: l("Kundalini Reiki Meditation", "Медитация Kundalini Reiki") }, { id: "master", label: l("Teaching and passing on attunements", "Обучение и передача инициаций") }, { id: "same", label: l("Nothing new is introduced", "Ничего нового не появляется") }], help: l("Level 2 introduces Kundalini Reiki Meditation and further traditional energy imagery.", "Вторая ступень вводит медитацию Kundalini Reiki и дальнейшую работу с образом энергии.") } },
    { id: "kun-study-v2-09", phase: "kundalini", kind: "reflection", image: image.kundalini,
      title: l("Question 9 of 9 · Meditation or Master?", "Вопрос 9 из 9 · Медитация или мастерство?"),
      body: l("Discover what comes after Level 2 meditation.", "Узнайте, что следует после медитации второй ступени."),
      question: { type: "text", prompt: l("How do Kundalini Reiki Levels 2 and 3 differ?", "Чем отличается практика второго и третьего уровней?"), options: [{ id: "master", label: l("Level 2: meditation; Level 3: Master and attunements", "2-я: медитация; 3-я: мастерство и инициации") }, { id: "same", label: l("They offer exactly the same practices", "На них изучают одно и то же") }, { id: "reverse", label: l("Level 2: Master; Level 3: only meditation", "2-я: мастерство; 3-я: только медитация") }], help: l("In the manual, Level 3 covers the Master stage, attunements and additional symbolic practices.", "В методичке третья ступень посвящена уровню мастера, инициациям и дополнительным практикам.") } },
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
    title: l("Choose your personal Reiki initiation", "Выберите личную Рейки-инициацию"),
    body: l("Choose one Level 1 initiation as a free gift. You may also request the other two by donation. Tell Andrey about yourself, your preferred time and why this matters to you.", "Выберите одну инициацию первой ступени в подарок. Две другие можно запросить за добровольный донейшн. Расскажите Андрею о себе, удобном времени и своей мотивации."),
    question: { type: "text", prompt: l("My personal initiation request and motivation", "Моя заявка и мотивация на личную инициацию") } },
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
    pathSlides.tantra.find((slide) => slide.id === "tan-03")!,
    ...pathSlides.tantra.slice(2).filter((slide) => slide.id !== "tan-03"),
    commonSlides.find((slide) => slide.id === "presence-01")!,
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
