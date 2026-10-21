import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { FreeResourceEnquiry } from "@/components/free-resource-enquiry";
import { FreeSituationReviewForm } from "@/components/free-situation-review-form";
import { ServiceVideoShowcase } from "@/components/service-video-showcase";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./free-entry-landing.module.css";

export type FreeEntryKind = "tests" | "situation" | "dao";

const art = {
  tests: {
    hero: "/images/holistic-house/course-start-heron.webp",
    outcome: "/images/holistic-house/report-lighthouse-coast.webp",
    process: "/images/holistic-house/hero-olive-incense.webp",
  },
  situation: {
    hero: "/images/holistic-house/andy-about.png",
    outcome: "/images/holistic-house/report-lighthouse-coast.webp",
    process: "/images/holistic-house/hero-olive-incense.webp",
  },
  dao: {
    hero: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
    outcome: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
    process: "/images/holistic-house/report-lighthouse-coast.webp",
  },
} as const;

const copy = {
  en: {
    common: {
      back: "All services", free: "COMPLETELY FREE", details: "See what you receive",
      benefits: "What you will take away", process: "How it works",
      prepare: "Start with one small step", more: "Questions before you begin",
      privacy: "No payment is required. Your reply contact is saved only when you submit a request. This is not a confirmed appointment.",
      limitations: "These self-reflection approaches are educational and symbolic. They do not diagnose or treat health conditions and do not replace qualified medical or mental-health care.",
      about: "More about Andrey", model: "Read about the Wu Xing model", aboutTests: "Explore all tests",
      fullForm: "Have your question and drawing ready? Open the full free questionnaire",
      optional: "No pressure to book a paid session.",
      explore: "Explore other free services",
    },
    tests: {
      eyebrow: "SELF-DISCOVERY · A FEW MINUTES",
      title: "Understand your starting point — and what matters to you.",
      lead: "Explore a few short wellbeing and personality questionnaires. See patterns in your responses, learn what the scales mean, and decide what to explore next at your own pace.",
      value: "More clarity about your current state, without committing to a consultation.",
      bullets: ["Explore stress, relationships and personal strengths.", "Review understandable results and explanations.", "Save available results and follow changes over time with an account."],
      outcomeTitle: "From a feeling to a clearer picture",
      outcomeLead: "You do not need to know the name of a test. Start with a topic that feels important right now.",
      outcomes: [
        { title: "Your present state", text: "Reflect on stress, mood and everyday balance through structured questions." },
        { title: "Your personal patterns", text: "Explore traits, relationships and the resources you can draw on." },
        { title: "Your next step", text: "Compare what stands out and decide what is worth your attention." },
      ],
      processTitle: "A few minutes to begin",
      processLead: "The test explorer guides you through choosing a topic, answering questions and reading your results.",
      steps: [
        { title: "Choose your focus", text: "Select what you would like to understand." },
        { title: "Answer simply", text: "Respond to the questions at your own pace." },
        { title: "See your insights", text: "Read your results; sign in if you want to save and track them." },
      ],
      startTitle: "Your free tests are ready",
      startLead: "Open the test explorer. You can choose individual tests or follow the suggested selection. A Google account is used only when you choose to save results.",
      cta: "Start free tests", secondary: "How the tests work",
      photoAlt: "Quiet natural landscape with a heron", outcomeAlt: "Lighthouse on the coast", processAlt: "Soft morning light in a calm room",
      faq: [
        ["Do I need to sign in?", "You can explore available guest questionnaires without signing in. Saving personal results and monitoring progress may require Google sign-in."],
        ["Are these clinical tests?", "Some questionnaires are professional instruments and others are educational self-checks. Each has its own reliability and limitations. None of the results alone provides a diagnosis."],
        ["Can I choose more than one?", "Yes. Use the test explorer to select several questionnaires and review them together."],
      ],
    },
    situation: {
      eyebrow: "PERSONAL WRITTEN REVIEW · NO LIVE CALL",
      title: "See your situation from a fresh perspective.",
      lead: "Bring one question — about a relationship, a decision, work or your inner state. Through a short questionnaire and a hand-drawn ‘ME — GOAL — PROBLEM’ map, Andrey offers a personal written reflection.",
      value: "A thoughtful outside perspective on your question, obstacles and possible next steps.",
      bullets: ["Clarify what you want to change or understand.", "Explore the roles, tensions and resources in your situation.", "Receive personal written observations to reflect on."],
      outcomeTitle: "Space to understand your question",
      outcomeLead: "The report is personal, not an automated score or a diagnosis.",
      outcomes: [
        { title: "A clearer question", text: "Bring your goal and concern into focus." },
        { title: "A symbolic situation map", text: "Use your drawing as a starting point to notice relationships and perceived obstacles." },
        { title: "A written perspective", text: "Receive reflections and practical questions for your next step." },
      ],
      processTitle: "Three simple steps",
      processLead: "No payment, long registration or video appointment is required for the free written format.",
      steps: [
        { title: "Tell me your situation", text: "Complete a short questionnaire about your question and goal." },
        { title: "Draw three elements", text: "Sketch ME, GOAL and PROBLEM on paper and photograph it." },
        { title: "Send both to Andrey", text: "Use WhatsApp or Telegram to share your answers and drawing for a written review." },
      ],
      startTitle: "Tell me what you would like to explore",
      startLead: "Leave one contact to receive instructions. The full questionnaire remains optional below.",
      cta: "Request my free review", secondary: "See how it works",
      photoAlt: "Andrey Litvinov", outcomeAlt: "Lighthouse on the coast", processAlt: "Calm, sunlit room",
      faq: [
        ["What is included for free?", "A personal written review of your coaching questionnaire and handwritten drawing. It does not include a video call or live consultation."],
        ["Do I need artistic skills?", "No. Three simple shapes or symbols on paper are enough; the drawing is a prompt for reflection, not an art test."],
        ["Will you save my answers here?", "Only the contact you submit to request instructions is saved. The separate questionnaire stays on your device until you choose to share it."],
      ],
    },
    dao: {
      eyebrow: "DAO · FIVE ELEMENTS · SYMBOLIC RESOURCE PROFILE",
      title: "Explore your inner resources through Wu Xing.",
      lead: "Use the Five Elements as a gentle symbolic lens for your energy, balance and everyday challenges. This free, author-led reflection helps you name what supports you and what deserves attention.",
      value: "A new language for understanding your resources — not a medical assessment.",
      bullets: ["Reflect on your current balance and sources of strength.", "Explore the Five Elements as a symbolic map.", "Identify areas you would like to nurture or investigate."],
      outcomeTitle: "A wider view of your resources",
      outcomeLead: "The model offers prompts for reflection. It does not assign a clinical health score.",
      outcomes: [
        { title: "What supports you", text: "Notice where you feel steadiness, motivation and connection." },
        { title: "Where energy is stretched", text: "Describe everyday demands and patterns of strain in your own words." },
        { title: "What to explore next", text: "Consider practical questions and the qualities you want to develop." },
      ],
      processTitle: "Your profile begins with a conversation",
      processLead: "You do not need to know Daoist theory or complete a medical-style questionnaire.",
      steps: [
        { title: "Choose your area", text: "Select a resource or life area you would like to reflect on." },
        { title: "Share a few words", text: "Add a short question if you wish." },
        { title: "Request your profile", text: "Send a prepared message and agree on the next steps for the free symbolic review." },
      ],
      startTitle: "Begin your free Wu Xing profile",
      startLead: "One contact is enough. Your free profile request is sent only when you tap Send.",
      cta: "Request my free profile", secondary: "Discover the model",
      photoAlt: "Traditional East Asian mountain temple", outcomeAlt: "Soft sunrise over a landscape", processAlt: "Lighthouse overlooking the sea",
      faq: [
        ["Is this a medical diagnosis?", "No. Wu Xing is used here as an author's symbolic framework, not as a medically validated diagnostic instrument."],
        ["Do I need prior experience?", "No. You can describe your energy, priorities or everyday experiences in ordinary language."],
        ["Is the profile free?", "Yes. The initial symbolic resource review is free; a personal paid session is entirely optional and separately agreed."],
      ],
    },
  },
  ru: {
    common: {
      back: "Все услуги", free: "БЕСПЛАТНО", details: "Что вы получите",
      benefits: "В результате", process: "Как это происходит",
      prepare: "Начните с простого шага", more: "Вопросы перед началом",
      privacy: "Оплата не требуется. Контакт сохраняется после отправки заявки; это не подтверждённая запись.",
      limitations: "Эти методики предназначены для самоисследования и символической рефлексии. Они не диагностируют и не лечат заболевания и не заменяют медицинскую или психиатрическую помощь.",
      about: "Об Андрее", model: "Подробнее о модели У-Син", aboutTests: "Открыть все тесты",
      fullForm: "Уже готовы вопрос и рисунок? Откройте полную бесплатную анкету",
      optional: "Платная консультация необязательна.",
      explore: "Другие бесплатные услуги",
    },
    tests: {
      eyebrow: "САМОПОЗНАНИЕ · НЕСКОЛЬКО МИНУТ",
      title: "Лучше поймите себя и своё текущее состояние.",
      lead: "Пройдите несколько коротких тестов самочувствия и личности. Посмотрите на закономерности в ответах, получите объяснения шкал и выберите, что стоит исследовать дальше.",
      value: "Больше ясности о себе — без необходимости записываться на консультацию.",
      bullets: ["Оцените стресс, отношения и личные ресурсы.", "Получите понятные результаты и пояснения.", "При входе в кабинет сохраняйте доступные отчёты и наблюдайте динамику."],
      outcomeTitle: "От ощущения — к понятной картине",
      outcomeLead: "Не нужно заранее знать названия методик. Выберите то, что важно вам сегодня.",
      outcomes: [
        { title: "Текущее состояние", text: "Исследуйте напряжение и повседневный баланс с помощью вопросов." },
        { title: "Личные особенности", text: "Посмотрите на отношения, привычки и внутренние опоры." },
        { title: "Следующий шаг", text: "Поймите, на что вы хотели бы обратить внимание." },
      ],
      processTitle: "Начать можно за несколько минут",
      processLead: "Каталог помогает выбрать тему, пройти вопросы и разобраться в результатах.",
      steps: [
        { title: "Выберите тему", text: "Начните с вопроса, который волнует вас сейчас." },
        { title: "Ответьте на вопросы", text: "Проходите тесты в удобном темпе." },
        { title: "Получите ориентиры", text: "Посмотрите результаты; для сохранения войдите в кабинет." },
      ],
      startTitle: "Ваши бесплатные тесты готовы",
      startLead: "Откройте каталог, выберите отдельные тесты или рекомендованный набор. Google-вход нужен, когда вы решите сохранять результаты.",
      cta: "Начать бесплатные тесты", secondary: "Как это устроено",
      photoAlt: "Цапля на спокойном природном фоне", outcomeAlt: "Маяк у побережья", processAlt: "Тихая комната в утреннем свете",
      faq: [
        ["Нужно ли входить в кабинет?", "Часть тестов доступна без входа. Для сохранения результатов и наблюдения за динамикой может потребоваться вход через Google."],
        ["Это медицинская диагностика?", "Нет. В каталоге есть профессиональные опросники и обучающие самопроверки. У каждой методики свои ограничения; один результат не устанавливает диагноз."],
        ["Можно пройти несколько тестов?", "Да. В каталоге можно выбрать несколько опросников и посмотреть их вместе."],
      ],
    },
    situation: {
      eyebrow: "ЛИЧНЫЙ ПИСЬМЕННЫЙ РАЗБОР · НЕ ЗВОНОК",
      title: "Взгляните на свою ситуацию под другим углом.",
      lead: "Выберите один вопрос — об отношениях, решении, работе или внутреннем состоянии. По короткой анкете и рисунку «Я — ЦЕЛЬ — ПРОБЛЕМА» Андрей подготовит личный письменный разбор.",
      value: "Свежий взгляд на вопрос, препятствия и возможные следующие шаги.",
      bullets: ["Проясните, что хотите понять или изменить.", "Исследуйте роли, напряжения и ресурсы ситуации.", "Получите письменные наблюдения для размышления."],
      outcomeTitle: "Пространство, чтобы понять свой вопрос",
      outcomeLead: "Это личный письменный ответ, а не автоматический балл или диагноз.",
      outcomes: [
        { title: "Яснее сформулированный запрос", text: "Вы отделите желаемую цель от текущих затруднений." },
        { title: "Символическая карта", text: "Рисунок поможет исследовать связи и субъективно ощущаемые препятствия." },
        { title: "Письменные ориентиры", text: "Получите вопросы и наблюдения для дальнейшего шага." },
      ],
      processTitle: "Всего три шага",
      processLead: "Бесплатный письменный формат не требует оплаты, долгой регистрации и видеовстречи.",
      steps: [
        { title: "Опишите ситуацию", text: "Ответьте на несколько вопросов о проблеме и цели." },
        { title: "Нарисуйте три элемента", text: "Изобразите на бумаге «Я», «ЦЕЛЬ» и «ПРОБЛЕМА»." },
        { title: "Отправьте Андрею", text: "Пришлите анкету и фото рисунка в WhatsApp или Telegram." },
      ],
      startTitle: "С чего хотите начать?",
      startLead: "Оставьте один контакт для инструкций. Полная анкета — по желанию ниже.",
      cta: "Запросить бесплатный разбор", secondary: "Как проходит разбор",
      photoAlt: "Андрей Литвинов", outcomeAlt: "Маяк на побережье", processAlt: "Спокойная комната с утренним светом",
      faq: [
        ["Что именно бесплатно?", "Личный письменный разбор по коучинг-анкете и рисунку. Он не включает видеозвонок или живую консультацию."],
        ["Нужно красиво рисовать?", "Нет. Достаточно трёх простых символов или фигур на бумаге — это материал для рефлексии, а не проверка художественных навыков."],
        ["Где хранятся мои ответы?", "Контакт сохраняется после отправки заявки. Отдельная анкета остаётся на вашем устройстве до выбранной вами передачи."],
      ],
    },
    dao: {
      eyebrow: "ДАО · ПЯТЬ ЭЛЕМЕНТОВ · РЕСУРСЫ",
      title: "Исследуйте свои внутренние ресурсы через У-Син.",
      lead: "Пять элементов становятся мягкой символической картой вашего баланса, энергии и жизненных задач. Бесплатный авторский разбор помогает назвать опоры и увидеть, чему вы хотели бы уделить внимание.",
      value: "Новый язык для понимания своих ресурсов — не медицинское заключение.",
      bullets: ["Рассмотрите баланс и источники собственной силы.", "Познакомьтесь с символической моделью пяти элементов.", "Выберите качества, которые хотите развивать."],
      outcomeTitle: "Более широкий взгляд на свой ресурс",
      outcomeLead: "Модель предлагает темы для размышления, а не клинические показатели здоровья.",
      outcomes: [
        { title: "Что поддерживает", text: "Заметьте, где ощущаете устойчивость, мотивацию и связь." },
        { title: "Где не хватает ресурса", text: "Опишите нагрузки и переживаемое напряжение своими словами." },
        { title: "Куда двигаться дальше", text: "Определите вопросы и качества, которые хочется исследовать." },
      ],
      processTitle: "Профиль начинается с разговора",
      processLead: "Не нужно заранее изучать даосскую теорию или проходить медицинскую анкету.",
      steps: [
        { title: "Выберите область", text: "Что в жизни или ощущении ресурса вам интересно?" },
        { title: "Напишите пару слов", text: "При желании добавьте короткий вопрос." },
        { title: "Запросите профиль", text: "Отправьте сообщение и согласуйте дальнейший формат бесплатного разбора." },
      ],
      startTitle: "Начните свой бесплатный профиль У-Син",
      startLead: "Достаточно одного контакта: бесплатная заявка отправится только после нажатия кнопки.",
      cta: "Запросить профиль У-Син", secondary: "Подробнее о модели",
      photoAlt: "Восточноазиатский храм в горах", outcomeAlt: "Мягкий рассвет над природой", processAlt: "Маяк над морем",
      faq: [
        ["Это медицинская диагностика?", "Нет. Здесь У-Син — авторская символическая система, а не медицинский диагностический инструмент."],
        ["Нужно ли знать теорию?", "Нет. Опишите самочувствие, приоритеты или повседневные переживания обычными словами."],
        ["Профиль действительно бесплатный?", "Да, первичный символический разбор ресурсов бесплатный. Личная платная сессия — только по отдельной договорённости."],
      ],
    },
  },
  es: {
    common: {
      back: "Todos los servicios", free: "GRATIS", details: "Qué vas a recibir",
      benefits: "Qué te llevas", process: "Cómo funciona",
      prepare: "Empieza con un paso sencillo", more: "Preguntas frecuentes",
      privacy: "No necesitas pagar. El contacto se guarda solo cuando envías la solicitud; no es una reserva confirmada.",
      limitations: "Estas prácticas simbólicas y de autoobservación son educativas. No diagnostican ni tratan enfermedades y no sustituyen la atención médica o psicológica profesional.",
      about: "Sobre Andrey", model: "Conoce el modelo Wu Xing", aboutTests: "Explora todos los tests",
      fullForm: "¿Ya tienes tu pregunta y dibujo? Abre el cuestionario completo y gratuito",
      optional: "No es obligatorio contratar una sesión.",
      explore: "Otros servicios gratuitos",
    },
    tests: {
      eyebrow: "AUTOCONOCIMIENTO · POCOS MINUTOS",
      title: "Conoce mejor tu punto de partida.",
      lead: "Explora cuestionarios breves sobre bienestar y personalidad. Observa patrones, lee las explicaciones y decide qué quieres comprender a continuación, a tu ritmo.",
      value: "Más claridad sobre tu estado actual, sin compromiso de consulta.",
      bullets: ["Reflexiona sobre estrés, relaciones y fortalezas.", "Consulta resultados y explicaciones sencillas.", "Guarda los resultados disponibles y observa cambios con una cuenta."],
      outcomeTitle: "De una sensación a una imagen más clara",
      outcomeLead: "No tienes que conocer el nombre de ningún test. Empieza por una cuestión importante para ti.",
      outcomes: [
        { title: "Tu estado actual", text: "Explora estrés y equilibrio cotidiano con preguntas estructuradas." },
        { title: "Tus patrones", text: "Reflexiona sobre relaciones, hábitos y recursos interiores." },
        { title: "Tu siguiente paso", text: "Decide qué aspecto merece tu atención." },
      ],
      processTitle: "Empieza en pocos minutos",
      processLead: "El explorador te ayuda a elegir, responder y comprender los resultados.",
      steps: [
        { title: "Elige un tema", text: "Comienza por lo que te interesa ahora." },
        { title: "Responde", text: "Completa las preguntas a tu ritmo." },
        { title: "Mira tus resultados", text: "Léelos; inicia sesión para guardarlos y seguir tus cambios." },
      ],
      startTitle: "Tus tests gratuitos están listos",
      startLead: "Abre el explorador de tests y elige cuestionarios individuales o una selección recomendada. Google solo es necesario si decides guardar resultados.",
      cta: "Empezar tests gratuitos", secondary: "Cómo funcionan",
      photoAlt: "Garza en un paisaje tranquilo", outcomeAlt: "Faro junto al mar", processAlt: "Habitación iluminada por la mañana",
      faq: [
        ["¿Necesito una cuenta?", "Algunos tests están disponibles como invitado, sin iniciar sesión. Para guardar resultados y seguir cambios puede ser necesario acceder con Google."],
        ["¿Son pruebas clínicas?", "Hay instrumentos profesionales y tests educativos. Cada uno tiene sus límites; una puntuación no constituye un diagnóstico."],
        ["¿Puedo elegir varios?", "Sí. El explorador permite seleccionar varios cuestionarios."],
      ],
    },
    situation: {
      eyebrow: "REVISIÓN PERSONAL POR ESCRITO · SIN LLAMADA",
      title: "Mira tu situación desde otra perspectiva.",
      lead: "Comparte una pregunta sobre relaciones, decisiones, trabajo o tu estado interior. Con un cuestionario breve y un dibujo de «YO — META — PROBLEMA», Andrey prepara una reflexión personal por escrito.",
      value: "Una perspectiva externa sobre tu pregunta, tus obstáculos y posibles pasos.",
      bullets: ["Aclara lo que quieres comprender o cambiar.", "Explora roles, tensiones y recursos de la situación.", "Recibe observaciones personales por escrito."],
      outcomeTitle: "Espacio para comprender tu pregunta",
      outcomeLead: "No es una puntuación automática ni un diagnóstico médico.",
      outcomes: [
        { title: "Una pregunta clara", text: "Distingue tu objetivo de las dificultades actuales." },
        { title: "Un mapa simbólico", text: "Usa el dibujo para reflexionar sobre relaciones y obstáculos." },
        { title: "Una perspectiva escrita", text: "Recibe preguntas y reflexiones útiles para el siguiente paso." },
      ],
      processTitle: "Tres pasos sencillos",
      processLead: "El formato escrito gratuito no necesita pago ni videollamada.",
      steps: [
        { title: "Describe tu situación", text: "Responde sobre el problema y tu objetivo." },
        { title: "Dibuja tres elementos", text: "Representa YO, META y PROBLEMA en papel." },
        { title: "Envía ambos materiales", text: "Comparte las respuestas y la foto por WhatsApp o Telegram." },
      ],
      startTitle: "¿Qué te gustaría explorar?",
      startLead: "Deja un contacto para recibir las instrucciones. El cuestionario completo es opcional.",
      cta: "Solicitar revisión gratis", secondary: "Cómo funciona",
      photoAlt: "Andrey Litvinov", outcomeAlt: "Faro en la costa", processAlt: "Espacio tranquilo con luz matinal",
      faq: [
        ["¿Qué incluye la oferta gratuita?", "Una revisión personal por escrito del cuestionario y un dibujo a mano. No incluye videollamada ni consulta en directo."],
        ["¿Debo saber dibujar?", "No. Unos símbolos o figuras sencillos en papel son suficientes."],
        ["¿Se guardan mis respuestas?", "Solo se guarda el contacto al enviar la solicitud. El cuestionario completo permanece en tu dispositivo hasta que decidas compartirlo."],
      ],
    },
    dao: {
      eyebrow: "DAO · CINCO ELEMENTOS · RECURSOS",
      title: "Explora tus recursos interiores con Wu Xing.",
      lead: "Utiliza los Cinco Elementos como un mapa simbólico de tu equilibrio, energía y retos cotidianos. Esta reflexión gratuita te ayuda a reconocer lo que te sostiene y merece atención.",
      value: "Otro lenguaje para conocer tus recursos; no es una evaluación médica.",
      bullets: ["Reflexiona sobre equilibrio y fortalezas.", "Explora el mapa simbólico de los Cinco Elementos.", "Elige qué cualidades quieres cultivar."],
      outcomeTitle: "Una visión más amplia de tus recursos",
      outcomeLead: "Es una herramienta de reflexión, no una puntuación médica.",
      outcomes: [
        { title: "Lo que te sostiene", text: "Observa dónde sientes estabilidad, motivación y conexión." },
        { title: "Dónde falta energía", text: "Describe tus exigencias y tensiones cotidianas." },
        { title: "Qué explorar después", text: "Considera preguntas y cualidades que te gustaría desarrollar." },
      ],
      processTitle: "Todo empieza con una conversación",
      processLead: "No necesitas conocer teoría daoísta ni rellenar una evaluación clínica.",
      steps: [
        { title: "Elige un área", text: "Piensa qué aspecto de tus recursos te interesa." },
        { title: "Escribe unas palabras", text: "Añade una pregunta breve si quieres." },
        { title: "Solicita tu perfil", text: "Envía un mensaje preparado y acuerda el siguiente paso." },
      ],
      startTitle: "Comienza tu perfil Wu Xing gratuito",
      startLead: "Un contacto es suficiente. La solicitud gratuita se envía solo cuando pulsas Enviar.",
      cta: "Solicitar perfil gratuito", secondary: "Conocer el modelo",
      photoAlt: "Templo asiático tradicional en las montañas", outcomeAlt: "Paisaje al amanecer", processAlt: "Faro sobre el mar",
      faq: [
        ["¿Es un diagnóstico médico?", "No. Es un modelo simbólico del autor, no una prueba médica validada."],
        ["¿Necesito experiencia previa?", "No. Describe tus recursos o preocupaciones con tus propias palabras."],
        ["¿Es gratuito?", "Sí, la primera revisión simbólica es gratuita; cualquier sesión de pago es opcional."],
      ],
    },
  },
} as const;

export function FreeEntryLanding({ locale, kind }: { locale: PublicLocale; kind: FreeEntryKind }) {
  const t = copy[locale][kind];
  const common = copy[locale].common;
  const images = art[kind];
  const captureId = kind === "dao" ? "request-free-wu-xing" : kind === "situation" ? "request-free-review" : "start-free";
  const testsHref = "/" + locale + "/client/tests";
  const detailHref = kind === "dao" ? "/" + locale + "/wu-xing" : kind === "situation" ? "/" + locale + "/about" : testsHref;

  return (
    <main className={styles.page} lang={locale} data-free-entry-landing={kind}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={common.back}>
          <Link href={"/" + locale + "/services"} prefetch={false}><ArrowLeft size={17} aria-hidden="true" />{common.back}</Link>
          <span aria-hidden="true">/</span><span>{common.free}</span>
        </nav>

        <section className={styles.hero} aria-labelledby="free-entry-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
            <span className={styles.badge}>{common.free}</span>
            <h1 id="free-entry-title">{t.title}</h1>
            <p className={styles.lead}>{t.lead}</p>
            <p className={styles.promise}>{t.value}</p>
            <ul className={styles.bulletList}>
              {t.bullets.map((benefit) => <li key={benefit}><CheckCircle2 size={17} aria-hidden="true" />{benefit}</li>)}
            </ul>
            <div className={styles.actions}>
              {kind === "tests" ? <Link className={styles.primary} href={testsHref} prefetch={false}>{t.cta}<ArrowRight size={19} aria-hidden="true" /></Link> :
                <a className={styles.primary} href={"#" + captureId}>{t.cta}<ArrowRight size={19} aria-hidden="true" /></a>}
              <a className={styles.secondary} href="#what-you-get">{common.details}</a>
            </div>
          </div>
          <figure className={styles.heroVisual}>
            <Image src={images.hero} alt={t.photoAlt} fill priority sizes="(max-width: 800px) 100vw, 48vw" />
            <figcaption>{t.value}</figcaption>
          </figure>
        </section>

        <section className={styles.capture} id={captureId} aria-labelledby="free-capture-title">
          <div className={styles.captureIntro}>
            <p className={styles.sectionLabel}>01 / {common.prepare}</p>
            <h2 id="free-capture-title">{t.startTitle}</h2>
            <p>{t.startLead}</p>
            <div className={styles.miniPhoto}><Image src={images.outcome} alt="" fill sizes="(max-width: 800px) 100vw, 38vw" /></div>
            <p className={styles.optional}><ShieldCheck size={18} aria-hidden="true" />{common.optional}</p>
          </div>
          <div className={styles.captureForm}>
            {kind === "tests" ?
              <div className={styles.testEntry}>
                <span className={styles.badge}>{common.free}</span>
                <p className={styles.testEntryHint}>{t.outcomeLead}</p>
                <ul>{t.outcomes.map((item) => <li key={item.title}><CheckCircle2 size={17} aria-hidden="true" />{item.title}</li>)}</ul>
                <Link className={styles.primary} href={testsHref} prefetch={false}>{t.cta}<ArrowRight size={19} aria-hidden="true" /></Link>
                <small>{common.privacy}</small>
              </div> :
              <FreeResourceEnquiry locale={locale} kind={kind} />}
            {kind === "situation" ?
              <details className={styles.fullQuestionnaire}>
                <summary>{common.fullForm}</summary>
                <FreeSituationReviewForm locale={locale} />
              </details> : null}
          </div>
        </section>


        <section className={[styles.scene, styles.outcomeScene].join(" ")} id="what-you-get" aria-labelledby="free-outcomes-title">
          <div className={styles.sceneImage}>
            <Image src={images.outcome} alt={t.outcomeAlt} fill sizes="(max-width: 800px) 100vw, 44vw" />
          </div>
          <div className={styles.sceneText}>
            <p className={styles.sectionLabel}>02 / {common.benefits}</p>
            <h2 id="free-outcomes-title">{t.outcomeTitle}</h2>
            <p className={styles.sectionLead}>{t.outcomeLead}</p>
            <div className={styles.outcomeList}>
              {t.outcomes.map((item, i) => <article key={item.title}>
                <span>{String(i + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.text}</p></div>
              </article>)}
            </div>
          </div>
        </section>

        <section className={[styles.scene, styles.processScene].join(" ")} id="how-it-works" aria-labelledby="free-process-title">
          <div className={styles.sceneText}>
            <p className={styles.sectionLabel}>03 / {common.process}</p>
            <h2 id="free-process-title">{t.processTitle}</h2>
            <p className={styles.sectionLead}>{t.processLead}</p>
            <ol className={styles.steps}>
              {t.steps.map((item, i) => <li key={item.title}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div><h3>{item.title}</h3><p>{item.text}</p></div>
              </li>)}
            </ol>
          </div>
          <div className={styles.sceneImage}>
            <Image src={images.process} alt={t.processAlt} fill sizes="(max-width: 800px) 100vw, 44vw" />
          </div>
        </section>

        {kind !== "tests" ? <div className={styles.videoWrap}><ServiceVideoShowcase topic="overview" locale={locale} id="service-video" /></div> : null}
        {kind === "situation" ? <PersonalTestimonials locale={locale === "es" ? "en" : locale} variant="all" /> : null}

        <section className={styles.end} aria-labelledby="free-questions-title">
          <div>
            <p className={styles.sectionLabel}>{common.more}</p>
            <h2 id="free-questions-title">{common.more}</h2>
            <div className={styles.faq}>
              {t.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
            </div>
          </div>
          <aside className={styles.endLinks}>
            <p>{common.optional}</p>
            <Link href={detailHref} prefetch={false}>{kind === "dao" ? common.model : kind === "tests" ? common.aboutTests : common.about}<ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href={"/" + locale + "/services#free-insights"} prefetch={false}>{common.explore}<ArrowRight size={16} aria-hidden="true" /></Link>
          </aside>
        </section>
        <p className={styles.safety}><ShieldCheck size={17} aria-hidden="true" />{common.limitations}</p>
      </div>
    </main>
  );
}
