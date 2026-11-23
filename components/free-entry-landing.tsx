import Image from "next/image";
import { StaticPortrait } from "@/components/static-portrait";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import { PersonalExpressEnquiry } from "@/components/personal-express-enquiry";
import { TelegramDiagnosticEntry } from "@/components/telegram-diagnostic-entry";
import { FreeSituationReviewForm } from "@/components/free-situation-review-form";
import { SiteVideoPlayer } from "@/components/site-video-player";
import { DeferredYoutubeReview } from "@/components/deferred-youtube-review";
import { getServiceVideoMedia } from "@/data/service-video-library";
import { locallyArchivedVideoPosterIds, testimonialVideos } from "@/components/personal-testimonials";
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
      privacy: "Explore tests without an account. Google sign-in is only needed if you choose to save available results.",
      limitations: "These self-reflection approaches are educational and symbolic. They do not diagnose or treat health conditions and do not replace qualified medical or mental-health care.",
      about: "More about Andrey", model: "Read about the Wu Xing model", aboutTests: "Explore all tests",
      fullForm: "Would you rather write everything down? Open the private questionnaire", coachingForm: "Prefer to write your question on the website?",
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
      eyebrow: "FREE PERSONAL REVIEW · WITH ANDREY",
      title: "Tell me what's on your mind.",
      lead: "A difficult decision, a relationship, or a situation that keeps repeating? Tell me about one question. I'll read it myself and reply in writing, free of charge.",
      value: "One question. A personal written reply. No fee, no call.",
      bullets: ["Tell me what's happening.", "I'll look at what may be getting in the way.", "We'll see where you might begin."],
      outcomeTitle: "What you'll hear back from me",
      outcomeLead: "We can start with one question. Here's what I'll look for.",
      outcomes: [
        { title: "What stands out", text: "I'll try to put my finger on the part of your story that needs the most attention." },
        { title: "What else may be going on", text: "I'll share any patterns or overlooked details that seem worth considering." },
        { title: "Where to begin", text: "I'll suggest a question to sit with or a small next step you can try." },
      ],
      processTitle: "Here's how to start",
      processLead: "You don't need to tell your whole story at once. One question is enough to begin.",
      steps: [
        { title: "Get in touch", text: "Open Telegram or WhatsApp and send a short message asking for a free review." },
        { title: "Tell me the subject", text: "Is it about something happening in your life, or about how you've been feeling day to day? We'll take it from there." },
        { title: "Share details privately", text: "If I need more context or a drawing, we'll arrange a secure way to share it. Please don't send medical records or other sensitive information in chat." },
      ],
      startTitle: "Shall we start with your question?",
      startLead: "Choose a messenger to make contact. You can share the details securely afterwards.",
      cta: "Ask for my free review", secondary: "What happens next",
      photoAlt: "Andrey Litvinov", outcomeAlt: "Lighthouse on the coast", processAlt: "Calm, sunlit room",
      faq: [
        ["Is it really free?", "Yes. I'll look at one question and send you a personal written reply. A live session is separate, and there's no obligation to book one."],
        ["How do I begin?", "Choose Telegram or WhatsApp and send me a short message. Opening the chat alone doesn't send your question."],
        ["What will I get back?", "I'll share what stands out to me and suggest one small place to start. It's a personal reflection, not an automatic test."],
        ["Will I need to draw anything?", "Sometimes I suggest a simple ME–GOAL–PROBLEM drawing and a few questions. I'll explain the steps if they're useful for your situation."],
        ["What about my privacy?", "Please don't send medical records or other sensitive documents in a messenger chat. We can arrange a protected questionnaire if needed."],
        ["Is this a medical diagnosis or a free call?", "Neither. It's a free written review, not diagnosis or treatment. A live consultation is optional and separate."],
      ],
    },
    dao: {
      eyebrow: "WU XING · YOUR RESOURCE MAP",
      title: "Discover what gives you strength.",
      lead: "A free personal reflection using the Five Elements — no prior knowledge needed.",
      value: "A symbolic guide for reflection — not a medical test.",
      bullets: ["Your strengths", "What needs care", "Your next step"],
      outcomeTitle: "What could your profile show?",
      outcomeLead: "Illustrative example — not your personal result.",
      outcomes: [
        { title: "Wood · initiative", text: "You enjoy starting things and finding direction." },
        { title: "Water · recovery", text: "A little more quiet time may help you recharge." },
        { title: "One small step", text: "Make space for a pause before your next decision." },
      ],
      processTitle: "Three small steps",
      processLead: "Choose a focus, leave a contact and agree how the personal reflection will work.",
      steps: [
        { title: "Choose a focus", text: "Pick one area you want to explore." },
        { title: "Leave a contact", text: "Confirm how Andrey can reply." },
        { title: "Agree the next step", text: "Receive instructions for your symbolic review." },
      ],
      startTitle: "Request your free profile",
      startLead: "One contact is enough. Your free profile request is sent only when you tap Send.",
      cta: "Get my free profile", secondary: "See an example",
      photoAlt: "Traditional East Asian mountain temple", outcomeAlt: "Soft sunrise over a landscape", processAlt: "Lighthouse overlooking the sea",
      faq: [
        ["What is free?", "The initial personal symbolic resource review is free. Any paid session is separate and optional."],
        ["Do I need an account?", "No. Choose a topic and a contact method, then confirm your request."],
        ["Is this a medical test?", "No. Wu Xing is used here for symbolic self-reflection, not diagnosis or treatment."],
      ],
    },
  },
  ru: {
    common: {
      back: "Все услуги", free: "БЕСПЛАТНО", details: "Что вы получите",
      benefits: "В результате", process: "Как это происходит",
      prepare: "Начните с простого шага", more: "Вопросы перед началом",
      privacy: "Изучайте тесты без регистрации. Google-вход может понадобиться только для сохранения результатов.",
      limitations: "Эти методики предназначены для самоисследования и символической рефлексии. Они не диагностируют и не лечат заболевания и не заменяют медицинскую или психиатрическую помощь.",
      about: "Об Андрее", model: "Подробнее о модели У-Син", aboutTests: "Открыть все тесты",
      fullForm: "Удобнее написать всё на сайте? Откройте личную анкету", coachingForm: "Хочу записать свой вопрос в анкете на сайте",
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
      eyebrow: "БЕСПЛАТНЫЙ ЛИЧНЫЙ РАЗБОР · С АНДРЕЕМ",
      title: "Давайте разберём ваш вопрос.",
      lead: "Не получается принять решение? Снова повторяется трудная ситуация? Расскажите мне об одном вопросе. Я сам прочитаю ваше сообщение и отвечу письменно — бесплатно.",
      value: "Один вопрос. Мой письменный ответ. Без оплаты и созвона.",
      bullets: ["Расскажите, что происходит.", "Я посмотрю, что может мешать.", "Попробуем найти, с чего начать."],
      outcomeTitle: "Что я напишу вам в ответ",
      outcomeLead: "Я внимательно прочитаю вашу историю и поделюсь тем, что замечу.",
      outcomes: [
        { title: "На что стоит обратить внимание", text: "Попробую выделить самое важное в вашем рассказе." },
        { title: "Что может оставаться незамеченным", text: "Поделюсь своими наблюдениями о привычных реакциях, связях и возможных причинах затруднения." },
        { title: "С чего можно начать", text: "Предложу вопрос для размышления или небольшой шаг, который можно попробовать." },
      ],
      processTitle: "Как получить мой разбор",
      processLead: "Не нужно сразу рассказывать всю историю жизни. Для начала достаточно одного вопроса.",
      steps: [
        { title: "Напишите мне", text: "Откройте Telegram или WhatsApp и отправьте короткое сообщение о бесплатном разборе." },
        { title: "Уточним тему", text: "Это может быть жизненная ситуация или вопрос о вашем повседневном самочувствии. Дальше я подскажу, что нужно." },
        { title: "Подробности — отдельно", text: "Если понадобится рисунок или дополнительные сведения, договоримся, как передать их через защищённую форму. Медицинские документы и личные данные в чат присылать не нужно." },
      ],
      startTitle: "С какого вопроса начнём?",
      startLead: "Для начала выберите мессенджер. Подробности можно будет передать приватно.",
      cta: "Получить бесплатный разбор", secondary: "Как это устроено",
      photoAlt: "Андрей Литвинов", outcomeAlt: "Маяк на побережье", processAlt: "Спокойная комната с утренним светом",
      faq: [
        ["Это действительно бесплатно?", "Да. Я лично рассмотрю один вопрос и отвечу письменно. Живая сессия — отдельная услуга, записываться на неё необязательно."],
        ["Как начать?", "Выберите Telegram или WhatsApp и отправьте короткое сообщение. Сам переход по ссылке ещё ничего не отправляет."],
        ["Что я получу в ответ?", "Поделюсь тем, что заметил в вашей ситуации, и предложу один небольшой шаг. Это личный разбор, а не автоматический тест."],
        ["Нужно ли рисовать?", "Иногда прошу ответить на несколько вопросов и сделать рисунок «Я — Цель — Проблема». Если он нужен, объясню, как его передать."],
        ["Что с конфиденциальностью?", "Медицинские документы и другие чувствительные сведения не присылайте в мессенджер. При необходимости договоримся о защищённой анкете."],
        ["Это медицинская диагностика или бесплатный созвон?", "Нет. Я отвечаю письменно, не ставлю диагнозов и не назначаю лечение. Живая консультация — отдельно, только по желанию."],
      ],
    },
    dao: {
      eyebrow: "У-СИН · КАРТА ВАШИХ РЕСУРСОВ",
      title: "Узнайте, что даёт вам внутреннюю опору.",
      lead: "Бесплатный личный разбор по символической модели «Пять элементов» — знать даосскую теорию не нужно.",
      value: "Символическая модель для самоисследования, а не медицинский тест.",
      bullets: ["Ваши опоры", "Что требует заботы", "Следующий шаг"],
      outcomeTitle: "Как может выглядеть результат?",
      outcomeLead: "Условный пример — не ваш персональный профиль.",
      outcomes: [
        { title: "Дерево · инициатива", text: "Вам нравится начинать новое и находить направление." },
        { title: "Вода · восстановление", text: "Возможно, стоит чаще выделять время для отдыха." },
        { title: "Один небольшой шаг", text: "Сделайте паузу перед следующим важным решением." },
      ],
      processTitle: "Три простых шага",
      processLead: "Выберите тему, оставьте контакт и согласуйте следующий шаг.",
      steps: [
        { title: "Выберите тему", text: "Что вам хочется исследовать?" },
        { title: "Оставьте контакт", text: "Подтвердите удобный способ ответа." },
        { title: "Согласуйте следующий шаг", text: "Получите инструкцию для разбора." },
      ],
      startTitle: "Запросить бесплатный профиль",
      startLead: "Достаточно одного контакта: бесплатная заявка отправится только после нажатия кнопки.",
      cta: "Получить бесплатный профиль", secondary: "Посмотреть пример",
      photoAlt: "Восточный горный храм", outcomeAlt: "Мягкий свет рассвета", processAlt: "Маяк над морем",
      faq: [
        ["Что бесплатно?", "Первичный личный символический разбор ресурсов. Платная сессия — отдельно и только по желанию."],
        ["Нужен аккаунт?", "Нет. Выберите тему и контакт, затем подтвердите отправку заявки."],
        ["Это медицинский тест?", "Нет. У-Син применяется здесь для символического самоисследования, не для диагностики или лечения."],
      ],
    },
  },
  es: {
    common: {
      back: "Todos los servicios", free: "GRATIS", details: "Qué vas a recibir",
      benefits: "Qué te llevas", process: "Cómo funciona",
      prepare: "Empieza con un paso sencillo", more: "Preguntas frecuentes",
      privacy: "Explora las pruebas sin crear una cuenta. Google solo puede ser necesario para guardar resultados.",
      limitations: "Estas prácticas simbólicas y de autoobservación son educativas. No diagnostican ni tratan enfermedades y no sustituyen la atención médica o psicológica profesional.",
      about: "Sobre Andrey", model: "Conoce el modelo Wu Xing", aboutTests: "Explora todos los tests",
      fullForm: "¿Ya tienes tu pregunta y dibujo? Abre el cuestionario completo y gratuito", coachingForm: "¿Prefieres un formulario personal de coaching con tus propias preguntas?",
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
      eyebrow: "REVISIÓN PERSONAL EXPRÉS · CON ANDREY",
      title: "Cuéntame qué te preocupa.",
      lead: "¿Tienes una decisión difícil o una situación que se repite? Cuéntame una pregunta concreta. La leeré yo mismo y te responderé por escrito, gratis.",
      value: "Revisión personal escrita · gratis · sin cita o videollamada.",
      bullets: ["Define tu pregunta.", "Observa recursos y dificultades.", "Explora un posible próximo paso."],
      outcomeTitle: "Comprende mejor tu pregunta",
      outcomeLead: "Leeré tu mensaje y te compartiré lo que observe.",
      outcomes: [
        { title: "Tu pregunta central", text: "Distingue lo principal de los detalles secundarios." },
        { title: "Una nueva perspectiva", text: "Explora conexiones, retos y recursos." },
        { title: "Un paso posible", text: "Recibe observaciones escritas para reflexionar." },
      ],
      processTitle: "Así empezamos",
      processLead: "Una pregunta basta para empezar, sin cita o videollamada. Te responderé por escrito.",
      steps: [
        { title: "Elige tu tema", text: "Abre Telegram o WhatsApp y envíame un mensaje breve." },
        { title: "Deja tu contacto", text: "Te haré una o dos preguntas para entender tu situación." },
        { title: "Acuerda un envío seguro", text: "Tras dar tu consentimiento, Telegram puede pedir una foto y un dibujo opcionales. Envía expedientes médicos, pruebas y datos sensibles solo por el formulario protegido." },
      ],
      startTitle: "¿Qué deseas explorar?",
      startLead: "Elige el tema y deja tu teléfono, sin datos personales por chat.",
      cta: "Solicitar revisión exprés gratis", secondary: "Cómo funciona",
      photoAlt: "Andrey Litvinov", outcomeAlt: "Faro junto al mar", processAlt: "Espacio tranquilo con luz matinal",
      faq: [
        ["¿De verdad es gratis?", "Sí. Leeré tu pregunta personalmente y te responderé por escrito. Una consulta en directo es opcional y aparte."],
        ["¿Cómo empiezo?", "Elige Telegram o WhatsApp y envíame un mensaje breve. Abrir el enlace no envía nada por sí solo."],
        ["¿Qué recibiré?", "Te compartiré lo que observe y te sugeriré un primer paso. Es una reflexión personal, no un test automático."],
        ["¿Tengo que hacer un dibujo?", "A veces propongo unas preguntas y un dibujo YO–META–PROBLEMA. Si hace falta, te explicaré cómo compartirlo."],
        ["¿Qué ocurre con mis datos privados?", "No envíes informes médicos ni otros documentos sensibles por chat. Si hace falta, acordaremos un formulario protegido."],
        ["¿Es un diagnóstico médico o una videollamada gratis?", "No. Es una respuesta escrita, no un diagnóstico ni tratamiento. Una consulta en directo se reserva por separado."],
      ],
    },
    dao: {
      eyebrow: "WU XING · TU MAPA DE RECURSOS",
      title: "Descubre qué te da fuerza.",
      lead: "Una reflexión personal gratuita basada en los Cinco Elementos. No necesitas conocimientos previos.",
      value: "Un modelo simbólico de reflexión, no una prueba médica.",
      bullets: ["Tus fortalezas", "Lo que cuidar", "Próximo paso"],
      outcomeTitle: "¿Qué podría mostrar tu perfil?",
      outcomeLead: "Ejemplo ilustrativo; no es tu resultado personal.",
      outcomes: [
        { title: "Madera · iniciativa", text: "Disfrutas empezando proyectos y buscando dirección." },
        { title: "Agua · descanso", text: "Quizá necesites más tiempo tranquilo para recargar energías." },
        { title: "Un pequeño paso", text: "Haz una pausa antes de tu próxima decisión." },
      ],
      processTitle: "Tres pasos sencillos",
      processLead: "Elige un tema, deja tu contacto y acuerda el siguiente paso.",
      steps: [
        { title: "Elige un tema", text: "Selecciona lo que deseas explorar." },
        { title: "Deja tu contacto", text: "Confirma cómo puede responder Andrey." },
        { title: "Acuerda el siguiente paso", text: "Recibe las instrucciones para la reflexión." },
      ],
      startTitle: "Solicita tu perfil gratuito",
      startLead: "Un contacto es suficiente. La solicitud gratuita se envía solo cuando pulsas Enviar.",
      cta: "Obtener mi perfil gratis", secondary: "Ver un ejemplo",
      photoAlt: "Templo tradicional en las montañas", outcomeAlt: "Amanecer suave", processAlt: "Faro frente al mar",
      faq: [
        ["¿Qué es gratuito?", "La primera revisión personal y simbólica de recursos. Una sesión de pago es opcional y aparte."],
        ["¿Necesito una cuenta?", "No. Elige un tema y un medio de contacto; después confirma la solicitud."],
        ["¿Es una prueba médica?", "No. Wu Xing se usa aquí para la reflexión simbólica, no para diagnosticar ni tratar."],
      ],
    },
  },
} as const;

const finalCopy = {
  en: {
    tests: { title: "Not sure which test to take?", lead: "Leave a contact. We’ll suggest a simple starting point." },
    situation: { title: "Get your free written review", lead: "Leave a contact. Andrey will explain the next step." },
    dao: { title: "Get your free Wu Xing profile", lead: "Leave a contact. Andrey will explain how to begin." },
  },
  ru: {
    tests: { title: "Не знаете, какой тест выбрать?", lead: "Оставьте контакт — подскажем, с чего начать." },
    situation: { title: "Получите бесплатный письменный разбор", lead: "Оставьте контакт — Андрей подскажет следующий шаг." },
    dao: { title: "Получите бесплатный профиль У-Син", lead: "Оставьте контакт — Андрей объяснит, как начать." },
  },
  es: {
    tests: { title: "¿No sabes qué prueba elegir?", lead: "Deja tu contacto y te orientaremos para empezar." },
    situation: { title: "Recibe tu revisión gratuita por escrito", lead: "Deja un contacto y Andrey te explicará el siguiente paso." },
    dao: { title: "Solicita tu perfil Wu Xing gratuito", lead: "Deja un contacto y Andrey te dirá cómo empezar." },
  },
} as const;

const freeTestDirectCopy = {
  en: {
    title: "Ready to explore? Start a free test now.",
    lead: "The test explorer is open without a contact request. Only leave a contact below if you want Andrey's personal help choosing a next step.",
  },
  ru: {
    title: "Готовы попробовать? Откройте бесплатный тест.",
    lead: "Каталог тестов доступен без заявки. Оставьте контакт ниже, только если хотите личную подсказку Андрея по следующему шагу.",
  },
  es: {
    title: "¿Listo para empezar? Haz una prueba gratuita.",
    lead: "Puedes entrar al catálogo sin dejar tus datos. Deja tu contacto abajo solo si quieres ayuda personal de Andrey para elegir el siguiente paso.",
  },
} as const;

const situationFirstScreen = {
  en: { lead: "I’m Andrey. Tell me what’s troubling you — I’ll read your question myself and send a written reply, free of charge.", reviews: "More client videos · English audio" },
  ru: { lead: "Меня зовут Андрей. Расскажите, что вас волнует — я прочитаю ваш вопрос и бесплатно отвечу письменно.", reviews: "Ещё отзывы клиентов · на русском" },
  es: { lead: "Soy Andrey. Cuéntame qué te preocupa. Te responderé personalmente por escrito.", reviews: "Más testimonios · audio original en inglés" },
} as const;

const situationVideoStory = {
en: {
    eyebrow: "A SHORT INTRODUCTION",
    title: "How I approach a personal question",
    lead: "I start by reading what you've written, not by trying to fit you into a category. Sometimes the important thing is a decision you can't make. Sometimes it's a recurring feeling or a situation that keeps repeating. I'll look for what needs a closer look and respond in writing.",
    takeaway: "The reply comes from me, not an automatic quiz. It isn't a diagnosis or a live appointment.",
    recording: "This video is an introduction to my broader work. It wasn't recorded specifically for the free written review.",
    audio: "Introduction by Andrey · English",
    storiesEyebrow: "CLIENTS SPEAK FOR THEMSELVES",
    storiesTitle: "Hear about their experience",
    storiesLead: "These videos are about other sessions and ways of working with me, not about this particular free review.",
    enAudio: "English audio", ruAudio: "Russian audio",
    storiesNote: "Each person describes their own experience. Yours may be different; no outcome is promised.",
  },
ru: {
    eyebrow: "КОРОТКОЕ ЗНАКОМСТВО",
    title: "Как я работаю с личным вопросом",
    lead: "Сначала я читаю то, что вы написали, и стараюсь понять, где именно возникла трудность. Иногда за одним вопросом стоит непринятое решение. Иногда — переживание, которое повторяется из раза в раз. Я поделюсь тем, что замечу, и предложу, куда можно посмотреть дальше.",
    takeaway: "Это мой личный письменный ответ, а не результат автоматического теста. Он не заменяет очную консультацию или медицинское обследование.",
    recording: "В этом видео я рассказываю о своей работе в целом. Отдельное видео именно о бесплатном разборе пока не записано.",
    audio: "Андрей рассказывает о работе · на русском",
    storiesEyebrow: "КЛИЕНТЫ РАССКАЗЫВАЮТ САМИ",
    storiesTitle: "Послушайте их истории",
    storiesLead: "Это отзывы о других занятиях и сессиях со мной, а не об этом бесплатном разборе.",
    enAudio: "Аудио на английском", ruAudio: "Аудио на русском",
    storiesNote: "Каждый человек рассказывает только о своём опыте. Он может отличаться от вашего, и обещать такой же результат было бы неправильно.",
  },
  es: {
    eyebrow: "VÍDEO · CONOCE A ANDREY",
    title: "Cómo trabajo con una pregunta personal",
    lead: "Primero leo lo que me cuentas. A veces importa una decisión pendiente; otras, una situación que se repite.",
    takeaway: "Recibirás observaciones personales por escrito, no una prueba automática, una cita ni un diagnóstico médico.",
    recording: "Este vídeo existente presenta mi enfoque de alquimia psíquica. Es una introducción general, no un vídeo específico sobre la revisión exprés gratuita.",
    audio: "Presentación de Andrey · audio en español",
    storiesEyebrow: "TESTIMONIOS REALES EN VÍDEO",
    storiesTitle: "Experiencias de clientes en vídeo",
    storiesLead: "Testimonios de otras sesiones, no de esta revisión gratuita. Los títulos están en español; el audio original es en inglés o ruso.",
    enAudio: "Audio original en inglés", ruAudio: "Audio original en ruso",
    storiesNote: "Son experiencias personales, no resultados típicos o garantizados ni evidencia de eficacia médica.",
  },
} as const;


const translatedOtherLanguageReviewTitles = {
  ru: [
    "Бизнес-расстановки — отзыв", "Бизнес-консультирование — отзыв",
    "Клэр — отзыв", "Опыт совместной работы",
    "Психическая алхимия — отзыв", "Семейные расстановки — отзыв",
  ],
  en: [
    "Anton Korchinsky — client review", "Yuri Goncharenko — client review",
    "Business constellations — review", "Tatyana Razumovskaya — business consultation review",
    "Express assessment — review", "Elena Bakhtina — client review",
  ],
  es: [
    "Anton Korchinsky — testimonio", "Yuri Goncharenko — testimonio",
    "Constelaciones empresariales — testimonio", "Tatyana Razumovskaya — consulta de negocios",
    "Evaluación exprés — testimonio", "Elena Bakhtina — testimonio",
  ],
} as const;

const situationApproach = {
en: {
    label: "MY APPROACH", title: "The questions depend on what you bring",
    lead: "I don't use the same set of questions for everyone. It depends on what you're trying to understand.",
    items: [
      { title: "If something in life feels stuck", text: "We can look at what you want, what keeps happening and what makes change difficult. Sometimes I'll suggest a simple ME–GOAL–PROBLEM drawing." },
      { title: "If you've been feeling drained", text: "I may ask about your daily rhythm and what affects your energy. Sometimes I use the Five Elements as a symbolic way of exploring a situation, never as a medical test." },
    ],
    safety: "Please keep private details and medical records out of Telegram and WhatsApp. For medical questions, consult a qualified healthcare professional.",
  },
ru: {
    label: "КАК Я РАБОТАЮ", title: "Всё зависит от вашего вопроса",
    lead: "Я не задаю всем один и тот же набор вопросов. Сначала важно понять, с чем вы пришли.",
    items: [
      { title: "Если вы застряли в какой-то ситуации", text: "Посмотрим, чего вы хотите, что повторяется и что мешает изменениям. Иногда я предлагаю простой рисунок «Я — Цель — Проблема»." },
      { title: "Если стало меньше сил", text: "Могу спросить о том, как проходит ваш день и что влияет на самочувствие. Иногда использую модель Пяти стихий как образный способ посмотреть на ситуацию, но не для медицинской диагностики." },
    ],
    safety: "Не присылайте личные документы и медицинские сведения в Telegram или WhatsApp. С вопросами о здоровье обращайтесь к квалифицированному врачу.",
  },
  es: {
    label: "MÉTODO PERSONAL", title: "Una revisión adaptada a tu pregunta",
    lead: "Primero quiero entender qué te pasa. Después decido qué preguntas pueden ayudarte.",
    items: [
      { title: "Cuando se trata de una situación", text: "Exploramos la meta, los obstáculos y los recursos. Un dibujo YO–META–PROBLEMA o una constelación simbólica puede ayudar." },
      { title: "Cuando se trata de energía y salud", text: "Reflexionamos sobre bienestar y recursos; Wu Xing (Cinco Elementos) es un mapa simbólico, nunca un diagnóstico ni tratamiento." },
    ],
    safety: "No compartas datos privados por mensajería. Para cuestiones médicas consulta profesionales sanitarios.",
  },
} as const;

const situationSafety = {
  en: "This is a personal reflection on your question, not medical or mental-health diagnosis or treatment. For healthcare concerns, please speak with a qualified professional.",
  ru: "Это личный разбор вопроса, а не медицинская или психиатрическая диагностика и не лечение. По вопросам здоровья обращайтесь к профильному специалисту.",
  es: "Estas herramientas son simbólicas, no constituyen diagnóstico ni tratamiento médico y no sustituyen la atención profesional.",
} as const;

const serviceTitles = {
  tests: "Free test starting-point guidance",
  situation: "Free written Situation Review",
  dao: "Free symbolic Wu Xing Resource Profile",
} as const;

export function FreeEntryLanding({ locale, kind }: { locale: PublicLocale; kind: FreeEntryKind }) {
  const t = copy[locale][kind];
  const common = copy[locale].common;
  const images = art[kind];
  const captureId = kind === "dao" ? "request-free-wu-xing" : kind === "situation" ? "request-free-review" : "start-free";
  const testsHref = "/" + locale + "/client/tests";
  const final = finalCopy[locale][kind];
  // Existing approved, already-published introductions only. Dedicated express-review
  // scripts remain drafts; no HeyGen render, upload or publication is implied.
  const situationVideo = kind !== "situation" ? null : locale === "es" ? {
    video: {
      youtubeId: "",
      heygenId: "2c251709aba74fd96ae8be43257a080b",
      language: "es" as const,
      title: "Mi enfoque de la alquimia psíquica",
      durationSeconds: 31,
    },
    poster: "/images/holistic-house/video-posters/psychic-alchemy-es-v1.webp",
  } : getServiceVideoMedia("overview", locale);
  // All twelve genuine source recordings appear once, page-language titles first.
  // Keep original audio and poster identity; playback starts only after a user's tap.
  const originalLanguageReviews = locale === "ru"
    ? [testimonialVideos.ru[4], ...testimonialVideos.ru.slice(0, 4), testimonialVideos.ru[5]]
    : testimonialVideos[locale];
  const otherLanguageReviews = locale === "ru"
    ? testimonialVideos.en.map((item, i) => ({ ...item, title: translatedOtherLanguageReviewTitles.ru[i] ?? item.title }))
    : testimonialVideos.ru.map((item, i) => ({ ...item, title: translatedOtherLanguageReviewTitles[locale][i] ?? item.title }));
  const reviewVideos = kind === "situation" ? [...originalLanguageReviews, ...otherLanguageReviews] : [];

  return (
    <main className={styles.page} lang={locale} data-free-entry-landing={kind}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={common.back}>
          <Link href={"/" + locale + "/services"} prefetch={false}><ArrowLeft size={17} aria-hidden="true" />{common.back}</Link>
          <span aria-hidden="true">/</span><span>{kind === "situation" ? (locale === "ru" ? "Диагностика" : locale === "es" ? "Diagnóstico" : "Diagnosis") : common.free}</span>
        </nav>

        <section className={[styles.hero, kind === "dao" ? styles.daoHero : "", kind === "situation" ? styles.situationHero : ""].filter(Boolean).join(" ")} aria-labelledby="free-entry-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
            <span className={styles.badge}>{kind === "situation" ? (locale === "ru" ? "ЛИЧНО · БЕСПЛАТНО" : locale === "es" ? "PERSONAL · GRATIS" : "PERSONAL · FREE") : common.free}</span>
            <h1 id="free-entry-title">{t.title}</h1>
            <p className={styles.lead}>{t.lead}</p>
            {kind === "situation" ? <p className={styles.shortLead}>{situationFirstScreen[locale].lead}</p> : null}
            {kind === "situation" ? null : kind === "dao" ?
              <ul className={styles.daoBenefits} aria-label={locale === "ru" ? "Что вы получите" : locale === "es" ? "Qué recibirás" : "What you get"}>
                {t.bullets.map((benefit) => <li key={benefit}><CheckCircle2 size={17} aria-hidden="true" /><span>{benefit}</span></li>)}
              </ul> :
              <>
                <p className={styles.promise}>{t.value}</p>
                <ul className={styles.bulletList}>
                  {t.bullets.map((benefit) => <li key={benefit}><CheckCircle2 size={17} aria-hidden="true" />{benefit}</li>)}
                </ul>
              </>}
            <div className={styles.actions}>
              {kind === "tests" ? <Link className={styles.primary} href={testsHref} prefetch={false}>{t.cta}<ArrowRight size={19} aria-hidden="true" /></Link> :
                <a className={styles.primary} href={kind === "situation" ? "#request-free-review" : "#" + captureId}>{t.cta}<ArrowRight size={19} aria-hidden="true" /></a>}
              <a className={styles.secondary} href="#what-you-get">{kind === "dao" ? t.secondary : common.details}</a>
            </div>
            {kind === "dao" ? <p className={styles.daoSafety}><ShieldCheck size={15} aria-hidden="true" />{t.value}</p> : null}
          </div>
          <figure className={styles.heroVisual}>
            {kind === "situation"
              ? <StaticPortrait src="/images/holistic-house/andy-about.png" alt={t.photoAlt} fill priority sizes="(max-width: 800px) 100vw, 48vw" />
              : <Image src={images.hero} alt={t.photoAlt} fill priority sizes="(max-width: 800px) 100vw, 48vw" />}
            {kind !== "dao" ? <figcaption>{t.value}</figcaption> : null}
          </figure>
        </section>

        {situationVideo ? (
          <section className={styles.reviewIntro} id="meet-andrey" aria-labelledby="free-review-intro-title" data-free-review-video-story>
            <div className={styles.reviewIntroCopy}>
              <p className={styles.sectionLabel}>{situationVideoStory[locale].eyebrow}</p>
              <h2 id="free-review-intro-title">{situationVideoStory[locale].title}</h2>
              <p className={styles.reviewIntroLead}>{situationVideoStory[locale].lead}</p>
              <p className={styles.reviewIntroTakeaway}><CheckCircle2 size={19} aria-hidden="true" />{situationVideoStory[locale].takeaway}</p>
              <a className={styles.reviewCta} href="#request-free-review">{t.cta}<ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <div className={styles.reviewIntroMedia} data-free-review-intro-video data-intro-audio-language={locale}>
              <SiteVideoPlayer video={situationVideo.video} locale={locale} compact minimal fallbackPoster={situationVideo.poster} />
              <p className={styles.reviewIntroAudio}>{situationVideoStory[locale].audio}</p>
              <p className={styles.reviewIntroSourceNote}>{situationVideoStory[locale].recording}</p>
            </div>
            <div className={styles.reviewContact}>
              {kind === "situation" ? <TelegramDiagnosticEntry locale={locale} /> : null}
            </div>
          </section>
        ) : null}

        {kind === "situation" ? (
          <PersonalExpressEnquiry locale={locale} intro={
            <>
              <section className={styles.reviewOutcome} id="what-you-get" aria-labelledby="free-outcomes-title">
                <div className={styles.reviewOutcomePhoto}><Image src={images.outcome} alt={t.outcomeAlt} fill sizes="(max-width: 720px) 100vw, 40vw" /></div>
                <div className={styles.reviewOutcomeCopy}>
                  <p className={styles.sectionLabel}>01 / {common.benefits}</p>
                  <h2 id="free-outcomes-title">{t.outcomeTitle}</h2>
                  <p className={styles.sectionLead}>{t.outcomeLead}</p>
                  <div className={styles.reviewBenefitsList}>
                    {t.outcomes.map((item, index) => <article key={item.title}>
                      <span aria-hidden="true">0{index + 1}</span>
                      <div><h3>{item.title}</h3><p>{item.text}</p></div>
                    </article>)}
                  </div>
                  <a className={styles.reviewCta} href="#request-free-review">{t.cta}<ArrowRight size={17} aria-hidden="true" /></a>
                </div>
              </section>
              <section className={styles.reviewApproach} id="how-i-review" aria-labelledby="express-method-title">
                <div className={styles.reviewApproachCopy}>
                  <p className={styles.sectionLabel}>02 / {situationApproach[locale].label}</p>
                  <h2 id="express-method-title">{situationApproach[locale].title}</h2>
                  <p className={styles.sectionLead}>{situationApproach[locale].lead}</p>
                  <div className={styles.approachList}>
                    {situationApproach[locale].items.map((item, index) => (
                      <article key={item.title}>
                        <span aria-hidden="true">0{index + 1}</span>
                        <div><h3>{item.title}</h3><p>{item.text}</p></div>
                      </article>
                    ))}
                  </div>
                  <p className={styles.reviewPrivacy}><ShieldCheck size={16} aria-hidden="true" />{situationApproach[locale].safety}</p>
                </div>
                <div className={styles.reviewApproachPhoto}>
                  <Image src={images.hero} alt={t.photoAlt} fill sizes="(max-width: 720px) 100vw, 40vw" />
                </div>
              </section>
              <section className={styles.reviewSocialProof} aria-labelledby="free-review-stories-title"
                id="free-review-stories" data-featured-free-review-testimonials>
                <header className={styles.reviewSocialProofHeader}>
                  <p className={styles.sectionLabel}>{situationVideoStory[locale].storiesEyebrow}</p>
                  <h2 id="free-review-stories-title">{situationVideoStory[locale].storiesTitle}</h2>
                  <p>{situationVideoStory[locale].storiesLead}</p>
                </header>
                <p className={styles.reviewCount}>
                  {locale === "ru" ? `Все ${reviewVideos.length} видеоотзывов — сначала на русском, затем на английском`
                    : locale === "es" ? `Los ${reviewVideos.length} vídeos — audio original en inglés y ruso`
                    : `All ${reviewVideos.length} videos — English audio first, then Russian`}
                </p>
                <div className={styles.reviewPreviewGrid} role="region" aria-label={situationVideoStory[locale].storiesTitle}
                  data-review-list-direction="vertical" data-review-count={reviewVideos.length}>
                  {reviewVideos.map((item, index) => (
                    <article className={styles.reviewPreviewCard} key={item.id} data-testimonial-video-id={item.id}>
                      <p className={styles.reviewAudioLabel}>
                        <span>{String(index + 1).padStart(2, "0")} / {reviewVideos.length}</span>
                        <span>{item.language === "ru" ? situationVideoStory[locale].ruAudio : situationVideoStory[locale].enAudio}</span>
                      </p>
                      <DeferredYoutubeReview video={{ youtubeId: item.id, title: item.title, language: item.language }}
                        locale={locale} textLanguage={locale} compact
                        fallbackPoster={locallyArchivedVideoPosterIds.has(item.id)
                          ? "/images/holistic-house/testimonial-posters/" + item.id + ".webp"
                          : undefined} />
                    </article>
                  ))}
                </div>
                <p className={styles.reviewStoryDisclaimer}>{situationVideoStory[locale].storiesNote}</p>
              </section>
              <section className={styles.reviewProcess} id="how-it-works" aria-labelledby="free-process-title">
                <div className={styles.reviewProcessCopy}>
                  <p className={styles.sectionLabel}>03 / {common.process}</p>
                  <h2 id="free-process-title">{t.processTitle}</h2>
                  <p className={styles.sectionLead}>{t.processLead}</p>
                  <ol className={styles.reviewSteps}>
                    {t.steps.map((step, index) => <li key={step.title}>
                      <span aria-hidden="true">{index + 1}</span>
                      <div><strong>{step.title}</strong><p>{step.text}</p></div>
                    </li>)}
                  </ol>
                  <p className={styles.reviewPrivacy}><ShieldCheck size={16} aria-hidden="true" />{situationSafety[locale]}</p>
                </div>
                <div className={styles.reviewProcessPhoto}><Image src={images.process} alt={t.processAlt} fill sizes="(max-width: 720px) 100vw, 40vw" /></div>
              </section>
            </>
          } enableWizard={process.env.HH_FREE_EXPRESS_V2_ENABLED === "true"}>
            <div className={styles.coachingLink}>
              <Link href={"/" + locale + "/coaching/intake"} prefetch={false} data-source="coaching-questionnaire">
                {common.coachingForm}<ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <details className={styles.fullQuestionnaire} data-optional-written-review>
              <summary>{common.fullForm}</summary>
              <FreeSituationReviewForm locale={locale} />
            </details>
          </PersonalExpressEnquiry>
        ) : null}


        {kind === "situation" ? (
          <section className={styles.reviewFaq} id="free-review-faq" data-free-review-faq
            aria-labelledby="free-review-faq-heading">
            <header className={styles.reviewFaqHeader}>
              <div className={styles.reviewFaqIntro}>
                <p className={styles.sectionLabel}>{locale === "ru" ? "ВОПРОСЫ И ОТВЕТЫ" : locale === "es" ? "PREGUNTAS FRECUENTES" : "YOUR QUESTIONS"}</p>
                <h2 id="free-review-faq-heading">{locale === "ru" ? "Остались вопросы?" : locale === "es" ? "¿Tienes alguna duda?" : "A few things you may be wondering"}</h2>
                <p>{locale === "ru" ? "Коротко о бесплатном разборе — до того, как вы напишете." :
                  locale === "es" ? "Lo esencial antes de enviarme tu pregunta." :
                  "A few simple answers before you write to me."}</p>
              </div>
              <div className={styles.reviewFaqPhoto}>
                <Image src={images.process} alt={t.processAlt} fill sizes="(max-width: 720px) 100vw, 260px" />
              </div>
            </header>
            <div className={styles.reviewFaqList}>
              {t.faq.map(([question, answer]) => (
                <details key={question} className={styles.reviewFaqItem}>
                  <summary><span>{question}</span><span className={styles.reviewFaqPlus} aria-hidden="true">+</span></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
            <a className={styles.reviewFaqCta} href="#request-free-review">
              {t.cta}<ArrowRight size={18} aria-hidden="true" />
            </a>
          </section>
        ) : null}

        {kind !== "situation" ? <section className={[styles.scene, styles.outcomeScene, kind === "dao" ? styles.daoOutcomeScene : ""].filter(Boolean).join(" ")} id="what-you-get" aria-labelledby="free-outcomes-title">
          <div className={styles.sceneImage}>
            <Image src={images.outcome} alt={t.outcomeAlt} fill sizes="(max-width: 800px) 100vw, 44vw" />
          </div>
          <div className={styles.sceneText}>
            <p className={styles.sectionLabel}>01 / {common.benefits}</p>
            <h2 id="free-outcomes-title">{t.outcomeTitle}</h2>
            <p className={styles.sectionLead}>{t.outcomeLead}</p>
            <div className={[styles.outcomeList, kind === "dao" ? styles.daoOutcomeList : ""].filter(Boolean).join(" ")}>
              {t.outcomes.map((item, i) => <article key={item.title}>
                <span>{String(i + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.text}</p></div>
              </article>)}
            </div>
          </div>
        </section> : null}

        {kind === "tests" ? <section className={[styles.scene, styles.processScene].join(" ")} id="how-it-works" aria-labelledby="free-process-title">
          <div className={styles.sceneText}>
            <p className={styles.sectionLabel}>02 / {common.process}</p>
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
        </section> : null}

        {kind === "tests" ? (
          <section className={styles.faq} data-public-tests-faq aria-labelledby="free-tests-faq-title">
            <h2 id="free-tests-faq-title">{locale === "ru" ? "Вопросы перед началом" : locale === "es" ? "Preguntas frecuentes" : "Questions before you begin"}</h2>
            {t.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
          </section>
        ) : null}

        {kind === "tests" ? (
          <section className={styles.testDirect} data-benchmark-free-test-next-step aria-labelledby="free-tests-direct-title">
            <div className={styles.testDirectCopy}>
              <p className={styles.testDirectKicker}>{common.free}</p>
              <h2 id="free-tests-direct-title">{freeTestDirectCopy[locale].title}</h2>
              <p>{freeTestDirectCopy[locale].lead}</p>
              <Link className={styles.testReviewLink} href={"/" + locale + "/services/free-situation-review"} prefetch={false}>
                {locale === "ru" ? "Бесплатный личный письменный разбор" : locale === "es" ? "Revisión personal gratuita por escrito" : "Free personal written review"}
              </Link>
            </div>
            <Link className={styles.primary} href={testsHref} prefetch={false}
              data-benchmark-free-test-open>{t.cta}<ArrowRight size={19} aria-hidden="true" /></Link>
          </section>
        ) : null}

        {kind !== "situation" ? <CompactLeadCapture
          locale={locale}
          id={captureId}
          serviceTitle={serviceTitles[kind]}
          title={final.title}
          lead={final.lead}
          disclaimer={common.limitations}
        /> : null}
      </div>
    </main>
  );
}
