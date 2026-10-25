import type { PublicLocale } from "@/lib/public-locales";
import psiMasterMedia from "./psimaster-media.generated.json";

/**
 * Egyptian Priesthood · Osiris is an educational adaptation of the seven
 * original source videos from PsiMaster, not a transcript or a certification.
 * Introductory ideas come from the separately preserved "High Wisdom of the
 * Egyptian Gods" course. Each day's reflective exercise is clearly editorial.
 */
export const EGYPT_COURSE_ID = "academy-egyptian-priesthood-osiris";
export const EGYPT_COURSE_VERSION = "2026-10-23.v1";
export const EGYPT_LOCAL_PROGRESS_KEY = "hh-public-egypt-priesthood-v1";

export type EgyptText = Record<PublicLocale, string>;
export type EgyptScreenKind = "welcome" | "intro" | "idea" | "video" | "practice" | "reflection" | "transfer" | "milestone" | "complete";
export type EgyptScreen = {
  id: string;
  day: number;
  kind: EgyptScreenKind;
  title: EgyptText;
  body: EgyptText;
  question?: EgyptText;
  videoId?: string;
  videoTitle?: EgyptText;
  image?: string;
};

export const egyptText = (en: string, ru: string, es: string): EgyptText => ({ en, ru, es });

export const egyptVideoSources = [
  { label: "PsiMaster · Жречество Египта, Осирис", url: "https://psimaster.net/service?shs_term_node_tid_depth=12472" },
  { label: "PsiMaster · Высокая мудрость Египетских богов", url: "https://psimaster.net/service?shs_term_node_tid_depth=12455" },
] as const;

type SourceVideo = { logicalId: string; videoId: string; order: number; lessonTitle: string; lessonTitleEn?: string };
export const osirisOriginalVideos = (psiMasterMedia as SourceVideo[])
  .filter((item) => item.logicalId === "videos/egypt-osiris")
  .sort((a, b) => a.order - b.order)
  .map((item) => ({
    id: item.videoId,
    order: item.order,
    title: egyptText(item.lessonTitleEn || item.lessonTitle, item.lessonTitle, item.lessonTitleEn || item.lessonTitle),
  }));

const art = [
  "/academy/reiki-yggdrasil/source/temple-studies.png",
  "/academy/reiki-yggdrasil/source/program-overview.jpg",
  "/academy/reiki-yggdrasil/source/school-introduction.jpg",
] as const;

export const egyptLessonTopics: Array<{
  id: string;
  title: EgyptText;
  idea: EgyptText;
  exercise: EgyptText;
  reflection: EgyptText;
  transfer: EgyptText;
  milestone: EgyptText;
}> = [
  {
    id: "threshold",
    title: egyptText("Meeting Osiris", "Встреча с Осирисом", "Encuentro con Osiris"),
    idea: egyptText(
      "In the archived programme Osiris begins the Egyptian cycle: the image of ending an old stage and beginning anew.",
      "В архивной программе Осирис открывает египетский цикл: образ завершения прежнего этапа и начала нового.",
      "En el programa histórico Osiris inicia el ciclo egipcio: una imagen de cierre y renovación."
    ),
    exercise: egyptText("Notice one transition in your life. Name it without judging whether it is good or bad.",
      "Заметьте одну перемену в своей жизни. Назовите её, не оценивая как хорошую или плохую.",
      "Observa un cambio en tu vida. Nómbralo sin juzgarlo."),
    reflection: egyptText("What are you ready to leave behind, and what deserves to continue?",
      "Что вы готовы оставить позади, а что важно сохранить?",
      "¿Qué estás listo para dejar atrás y qué merece continuar?"),
    transfer: egyptText("Write one small step that honours both the past and the future.",
      "Запишите один небольшой шаг, который признаёт прошлое и открывает путь дальше.",
      "Anota un paso pequeño que respete el pasado y abra el futuro."),
    milestone: egyptText("You have named your starting point.", "Вы обозначили точку начала.", "Has definido tu punto de partida."),
  },
  {
    id: "ka",
    title: egyptText("Ka · a symbol to contemplate", "Ка · образ для исследования", "Ka · símbolo para explorar"),
    idea: egyptText("Ka is one of the terms named in Andrey's Osiris curriculum. Here we use it as a cue to notice the support of ordinary routines, without redefining the historical concept.",
      "Ка — один из терминов в программе Андрея об Осирисе. Здесь это повод заметить опору в обычных действиях, не подменяя исторический смысл символа.",
      "Ka aparece en el programa sobre Osiris. Aquí sirve para observar el apoyo cotidiano sin redefinir su significado histórico."),
    exercise: egyptText("Feel your feet on the ground and identify one reliable support in your day.",
      "Почувствуйте опору под ногами и найдите одну надёжную поддержку в сегодняшнем дне.",
      "Siente el apoyo bajo los pies e identifica un recurso cotidiano."),
    reflection: egyptText("What helps you remain grounded when your plans change?",
      "Что помогает вам оставаться в опоре, когда планы меняются?",
      "¿Qué te ayuda a conservar estabilidad ante los cambios?"),
    transfer: egyptText("Choose one simple routine you want to keep tomorrow.",
      "Выберите один простой ритуал повседневности, который хочется сохранить завтра.",
      "Elige una rutina sencilla para mañana."),
    milestone: egyptText("You have noticed a source of support.", "Вы заметили источник опоры.", "Has reconocido un apoyo."),
  },
  {
    id: "ba",
    title: egyptText("Ba · the language of images", "Ба · язык образов", "Ba · el lenguaje de las imágenes"),
    idea: egyptText("Ba appears alongside Ka, Ib and Khaibit in the historical text. Rather than claiming a supernatural effect, explore what an image evokes for you.",
      "Ба назван рядом с Ка, Иб и Хайбит в архивном тексте. Вместо обещания необычного эффекта исследуем, какие ассоциации вызывает образ.",
      "Ba aparece junto con Ka, Ib y Khaibit. Explora las asociaciones del símbolo sin atribuirle efectos sobrenaturales."),
    exercise: egyptText("Imagine a calm symbolic scene. Notice a colour, a movement or a word, then return attention to the room.",
      "Представьте спокойную символическую сцену. Заметьте цвет, движение или слово — и верните внимание в комнату.",
      "Imagina una escena simbólica tranquila, nota un color o movimiento y vuelve al presente."),
    reflection: egyptText("Which image stood out, and what personal meaning did you give it?",
      "Какой образ запомнился и какой личный смысл вы в нём увидели?",
      "¿Qué imagen destacó y qué sentido personal le diste?"),
    transfer: egyptText("Sketch or name your image in one sentence, without treating it as a prediction.",
      "Коротко зарисуйте или назовите образ, не принимая его за предсказание.",
      "Dibuja o nombra la imagen sin interpretarla como predicción."),
    milestone: egyptText("You practised observing without interpreting too quickly.", "Вы потренировали наблюдение без поспешных выводов.", "Has practicado observar sin concluir demasiado pronto."),
  },
  {
    id: "ib",
    title: egyptText("Ib · what matters", "Иб · что для вас важно", "Ib · lo que importa"),
    idea: egyptText("The archived source names Ib in the Osiris cycle. This screen uses a personal value question, not a historical definition or a diagnostic exercise.",
      "Архивный источник упоминает Иб в цикле Осириса. Здесь — вопрос о личных ценностях, не историческое определение и не диагностика.",
      "El archivo menciona Ib. Aquí exploramos los valores personales, no un diagnóstico ni una definición histórica."),
    exercise: egyptText("Name one value you want to respect during a difficult choice.",
      "Назовите одну ценность, которую хотите сохранить в сложном выборе.",
      "Nombra un valor que quieras respetar al decidir."),
    reflection: egyptText("When did this value guide a real decision in your life?",
      "Когда эта ценность уже помогала вам сделать реальный выбор?",
      "¿Cuándo te ayudó este valor a tomar una decisión?"),
    transfer: egyptText("Find a small action consistent with that value.",
      "Найдите небольшое действие, согласованное с этой ценностью.",
      "Encuentra un pequeño acto coherente con ese valor."),
    milestone: egyptText("You have clarified one personal value.", "Вы прояснили одну личную ценность.", "Has aclarado un valor personal."),
  },
  {
    id: "khaibit",
    title: egyptText("Khaibit · facing what is overlooked", "Хайбит · увидеть незамеченное", "Khaibit · ver lo que se omite"),
    idea: egyptText("Khaibit is part of the historical Osiris vocabulary. The modern reflection is simple: a complex story can contain both comfortable and uncomfortable parts.",
      "Хайбит присутствует в историческом словаре Осириса. Современная рефлексия проста: в сложной истории есть и удобные, и неудобные стороны.",
      "Khaibit forma parte del vocabulario histórico. Una historia compleja puede tener lados cómodos e incómodos."),
    exercise: egyptText("Notice one detail of a situation you usually avoid; keep it small and safe.",
      "Заметьте одну деталь ситуации, которую обычно обходите стороной. Выберите небольшой и безопасный пример.",
      "Observa un detalle que sueles evitar, de forma breve y segura."),
    reflection: egyptText("What changes when you acknowledge this detail without blaming yourself?",
      "Что меняется, когда вы признаёте эту деталь без самокритики?",
      "¿Qué cambia al reconocerlo sin culparte?"),
    transfer: egyptText("Write one compassionate sentence about the full picture.",
      "Напишите одну доброжелательную фразу о ситуации целиком.",
      "Escribe una frase amable sobre la situación completa."),
    milestone: egyptText("You made room for a more complete picture.", "Вы увидели более полную картину.", "Has abierto espacio a una visión más completa."),
  },
  {
    id: "maat",
    title: egyptText("From Osiris toward Ma'at", "От Осириса к Маат", "De Osiris hacia Maat"),
    idea: egyptText("The wider Egyptian programme follows Osiris with Ma'at: order, balance and inner reference points. This is a bridge to another module, not a claim about the content of today's video.",
      "В более широкой египетской программе за Осирисом следует Маат: порядок, равновесие, внутренние ориентиры. Это мост к следующему модулю, а не пересказ сегодняшнего видео.",
      "El programa amplio continúa de Osiris a Maat: orden, equilibrio y criterio. Es un puente al siguiente módulo, no un resumen del vídeo."),
    exercise: egyptText("Separate one fact, one assumption and one important value about your question.",
      "В своём вопросе отделите один факт, одно предположение и одну важную ценность.",
      "Distingue un hecho, una suposición y un valor sobre tu pregunta."),
    reflection: egyptText("Which part of your situation becomes clearer after this separation?",
      "Что в вашей ситуации проясняется, когда вы это разделили?",
      "¿Qué se aclara al separar estos elementos?"),
    transfer: egyptText("Choose a measured action based on what you know, not on a prediction.",
      "Выберите соразмерное действие на основе того, что знаете, а не предсказаний.",
      "Elige un acto proporcionado basado en hechos, no en predicciones."),
    milestone: egyptText("You have found a clearer reference point.", "Вы нашли более ясный ориентир.", "Has encontrado un criterio más claro."),
  },
  {
    id: "return",
    title: egyptText("Integration · return to life", "Интеграция · вернуться в жизнь", "Integración · volver a la vida"),
    idea: egyptText("The Osiris series ends here. An educational insight becomes useful when you can express it in a small, real-world choice.",
      "Здесь завершается видеоряд Осириса. Осмысление становится полезным, когда его можно выразить в небольшом реальном действии.",
      "Aquí termina la serie de Osiris. La reflexión cobra valor al convertirse en una elección real y pequeña."),
    exercise: egyptText("Recall one image, one feeling and one grounded observation from the previous days.",
      "Вспомните один образ, одно переживание и одно реальное наблюдение из предыдущих дней.",
      "Recuerda una imagen, una emoción y una observación concreta de estos días."),
    reflection: egyptText("What did you learn about your way of meeting change? What still needs attention?",
      "Что вы узнали о своём способе встречать перемены? Что ещё требует внимания?",
      "¿Qué aprendiste de tu forma de afrontar cambios y qué queda por explorar?"),
    transfer: egyptText("Write one small next action. The other Egyptian modules remain optional further reading.",
      "Запишите один небольшой следующий шаг. Остальные египетские модули — отдельное продолжение для желающих.",
      "Escribe tu próximo paso. Los demás módulos egipcios son una continuación opcional."),
    milestone: egyptText("You have finished the seven-video Osiris learning sequence.", "Вы завершили учебный цикл из семи видео Осириса.", "Has completado las siete videolecciones de Osiris."),
  },
];

export const egyptFurtherModules: Array<{ id: string; title: EgyptText; idea: EgyptText }> = [
  { id: "maat", title: egyptText("Ma'at", "Маат", "Maat"), idea: egyptText("Balance and inner reference points", "Порядок и внутренние ориентиры", "Equilibrio y referencias interiores") },
  { id: "horus", title: egyptText("Horus", "Гор", "Horus"), idea: egyptText("Action and new beginnings", "Действие и новые начинания", "Acción y nuevos comienzos") },
  { id: "isis", title: egyptText("Isis", "Исида", "Isis"), idea: egyptText("Strategy and creative solutions", "Стратегия и нестандартные решения", "Estrategia y soluciones creativas") },
  { id: "hathor-tefnut", title: egyptText("Hathor and Tefnut", "Хатхор и Тефнут", "Hathor y Tefnut"), idea: egyptText("Care, support, restoration", "Забота и поддержка", "Cuidado y apoyo") },
  { id: "thoth", title: egyptText("Thoth", "Тот", "Thot"), idea: egyptText("Knowledge, writing, symbols", "Знание, письмо, символы", "Conocimiento, escritura, símbolos") },
  { id: "amun-min", title: egyptText("Amun-Ra and Min-Ra", "Амун-Ра и Мин-Ра", "Amón-Ra y Min-Ra"), idea: egyptText("Scale and unfamiliar possibilities", "Масштаб и новые горизонты", "Amplitud y nuevas posibilidades") },
];

export function egyptPriesthoodScreens(): EgyptScreen[] {
  const screens: EgyptScreen[] = [{
    id: "egypt-welcome",
    day: 0,
    kind: "welcome",
    title: egyptText("Egyptian Priesthood · the Osiris path", "Египетское жречество · путь Осириса", "Sacerdocio egipcio · el camino de Osiris"),
    body: egyptText("Seven original Russian-language videos, short reflections and gentle practical steps. Explore one idea per screen, as in Reiki Practitioner.",
      "Семь оригинальных русскоязычных видео, короткие вопросы и бережные практики. По одной мысли на экран — как в курсе «Практик Рейки».",
      "Siete vídeos originales en ruso, breves reflexiones y prácticas suaves, una idea por pantalla."),
    image: art[0],
  }];
  for (const topic of egyptLessonTopics) {
    const day = egyptLessonTopics.indexOf(topic) + 1;
    const video = osirisOriginalVideos.find((item) => item.order === day);
    if (!video) continue;
    const root = "osiris-" + String(day).padStart(2, "0");
    const image = art[(day - 1) % art.length];
    screens.push(
      { id: root + "-intro", day, kind: "intro", title: topic.title,
        body: egyptText("A short original film, a symbolic idea and your own safe observations. You can revisit each step.",
          "Сегодня: авторское видео, один символический образ и собственные наблюдения. К любому пройденному шагу можно вернуться.",
          "Hoy: un vídeo original, una idea simbólica y tus propias observaciones."), videoId: video.id, videoTitle: video.title, image },
      { id: root + "-idea", day, kind: "idea", title: egyptText("One idea to explore", "Одна мысль для исследования", "Una idea para explorar"),
        body: topic.idea, image },
      { id: root + "-video", day, kind: "video", title: egyptText("Original lesson · day " + day, "Авторское видео · день " + day, "Vídeo original · día " + day),
        body: egyptText("Watch Andrey's original recording. The supporting reflection screens are an editorial study guide, not a word-for-word transcription of the film.",
          "Посмотрите оригинальную запись Андрея. Соседние вопросы — редакционный учебный маршрут, а не дословная расшифровка видео.",
          "Mira el vídeo original de Andrey. Las preguntas son una guía editorial, no una transcripción."),
        videoId: video.id, videoTitle: video.title },
      { id: root + "-practice", day, kind: "practice", title: egyptText("A gentle minute of practice", "Минута мягкой практики", "Un minuto de práctica suave"),
        body: topic.exercise, image },
      { id: root + "-reflection", day, kind: "reflection", title: egyptText("Notice your own answer", "Заметьте свой ответ", "Observa tu respuesta"),
        body: egyptText("Write at least 50 characters. This reflection stays on this screen only; we do not send it to a server or an external messenger.",
          "Напишите не меньше 50 символов. Ответ остаётся на экране; мы не отправляем его на сервер или в мессенджеры.",
          "Escribe al menos 50 caracteres. Tu respuesta no se envía al servidor ni a mensajeros."),
        question: topic.reflection, image },
      { id: root + "-transfer", day, kind: "transfer", title: egyptText("One step in real life", "Один шаг в жизни", "Un paso en la vida"),
        body: topic.transfer, image },
      { id: root + "-done", day, kind: "milestone", title: egyptText("Day " + day + " complete", "День " + day + " завершён", "Día " + day + " completado"),
        body: topic.milestone, image },
    );
  }
  screens.push({
    id: "egypt-complete", day: 8, kind: "complete",
    title: egyptText("Your Osiris cycle is complete", "Ваш цикл Осириса завершён", "Has terminado el ciclo de Osiris"),
    body: egyptText("You explored seven original films and a guided reflection route. The wider Egyptian pantheon is a separate historical study programme, not additional undocumented videos.",
      "Вы познакомились с семью оригинальными видео и учебным маршрутом для осмысления. Остальные боги Египта — отдельная историческая программа, не дополнительные выдуманные видеозанятия.",
      "Has recorrido siete vídeos originales y una guía de reflexión. Los demás dioses son un programa histórico aparte."),
    image: art[0],
  });
  return screens;
}
