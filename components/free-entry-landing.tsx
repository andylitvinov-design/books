import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import { DaoTelegramHandoff } from "@/components/dao-telegram-handoff";
import { PersonalExpressEnquiry } from "@/components/personal-express-enquiry";
import { TelegramDiagnosticEntry } from "@/components/telegram-diagnostic-entry";
import { FreeSituationReviewForm } from "@/components/free-situation-review-form";
import { SiteVideoPlayer } from "@/components/site-video-player";
import { getServiceVideoMedia } from "@/data/service-video-library";
import { PersonalTestimonials, locallyArchivedVideoPosterIds, testimonialVideos } from "@/components/personal-testimonials";
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
      fullForm: "Have your question and drawing ready? Open the full free questionnaire", coachingForm: "Prefer the in-site coaching questionnaire with your own questions?",
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
      eyebrow: "FREE PERSONAL EXPRESS REVIEW · WITH ANDREY",
      title: "Free personal express review with Andrey.",
      lead: "One personal written review of your question — a life situation or your energy and wellbeing. We explore resources and a next step, not a medical diagnosis.",
      value: "One personal written express review · free · no call.",
      bullets: ["Identify the main question.", "See obstacles and available resources.", "Find a possible next step."],
      outcomeTitle: "A clearer view of your question",
      outcomeLead: "Personal observations, rather than another generic online test.",
      outcomes: [
        { title: "Your central question", text: "Separate what matters from the surrounding noise." },
        { title: "A fresh perspective", text: "Look at context, obstacles and resources together." },
        { title: "A possible next step", text: "Receive personal written observations to consider." },
      ],
      processTitle: "A private, simple way to begin",
      processLead: "The initial written express review is free; no appointment or call is needed.",
      steps: [
        { title: "Choose your focus", text: "At the bottom, select situation or energy and wellbeing." },
        { title: "Leave one contact", text: "Phone number and consent for one reply via WhatsApp or Telegram." },
        { title: "Agree a secure handoff", text: "After consent, the Telegram dialogue may ask for an optional ordinary photo and drawing. Keep medical records, test results and sensitive details in the protected website form; WhatsApp is manual contact only." },
      ],
      startTitle: "What would you like to explore?",
      startLead: "Select your focus and leave your phone. Do not share private details in the chat.",
      cta: "Request my free express review", secondary: "How it works",
      photoAlt: "Andrey Litvinov", outcomeAlt: "Lighthouse on the coast", processAlt: "Calm, sunlit room",
      faq: [
        ["What is free?", "An initial personal written express review after agreeing a secure handoff. Live consultations are separate and optional."],
        ["Do I need a drawing?", "For a situation question Andrey may suggest a simple ME–GOAL–PROBLEM drawing. Energy and wellbeing questions use different prompts."],
        ["Is this health diagnosis?", "No. This is symbolic reflection, not a medical assessment or treatment. Please consult a qualified clinician about health concerns."],
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
      fullForm: "Уже готовы вопрос и рисунок? Откройте полную бесплатную анкету", coachingForm: "Отдельная коучинг-анкета: ваши вопросы и цели →",
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
      eyebrow: "ЛИЧНАЯ ЭКСПРЕСС-ДИАГНОСТИКА · С АНДРЕЕМ",
      title: "Личная экспресс-диагностика с Андреем.",
      lead: "Один бесплатный личный письменный разбор — по ситуации либо по энергии и самочувствию. Посмотрим на суть вопроса, ресурсы и возможный следующий шаг.",
      value: "Личный письменный экспресс-разбор · бесплатно · без звонка.",
      bullets: ["Уточнить главный вопрос.", "Увидеть препятствия и ресурсы.", "Наметить следующий шаг."],
      outcomeTitle: "Понять суть своего запроса",
      outcomeLead: "Личный взгляд на вашу задачу, а не обезличенный онлайн-тест.",
      outcomes: [
        { title: "Суть вопроса", text: "Отделить главное от сопутствующих обстоятельств." },
        { title: "Новый взгляд", text: "Увидеть связи, препятствия и собственные ресурсы." },
        { title: "Следующий шаг", text: "Получить личные письменные наблюдения." },
      ],
      processTitle: "Лично, просто и конфиденциально",
      processLead: "Первичный письменный экспресс-разбор бесплатный, без записи на звонок.",
      steps: [
        { title: "Выберите тему", text: "Внизу страницы укажите: ситуация или энергия и самочувствие." },
        { title: "Оставьте контакт", text: "Телефон и согласие на один личный ответ через WhatsApp или Telegram." },
        { title: "Согласуйте безопасный обмен", text: "После согласия Telegram-бот может по желанию запросить обычное фото и рисунок. Медицинские документы, результаты тестов и чувствительные сведения передавайте только через защищённую форму сайта; WhatsApp — ручной контакт." },
      ],
      startTitle: "Что хотите исследовать?",
      startLead: "Выберите направление и оставьте телефон. Личные подробности не нужны в чате.",
      cta: "Получить бесплатный экспресс-разбор", secondary: "Как это работает",
      photoAlt: "Андрей Литвинов", outcomeAlt: "Маяк на побережье", processAlt: "Спокойная комната с утренним светом",
      faq: [
        ["Что входит в бесплатный разбор?", "Первичный личный письменный экспресс-разбор после согласованной защищённой передачи информации. Живая консультация — отдельно и по желанию."],
        ["Нужно ли рисовать?", "Для запроса по ситуации я могу предложить рисунок «Я–Цель–Проблема». Для самочувствия — другие вопросы для самоисследования."],
        ["Это медицинская диагностика?", "Нет. Это символический разбор ресурсов, не диагностика или лечение заболеваний. По здоровью обратитесь к квалифицированному врачу."],
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
      title: "Revisión personal exprés gratuita con Andrey.",
      lead: "Una sola revisión escrita personal sobre tu situación o tu energía y bienestar. Exploramos recursos y un próximo paso, sin diagnóstico médico.",
      value: "Revisión personal escrita · gratis · sin llamada.",
      bullets: ["Define tu pregunta.", "Observa recursos y dificultades.", "Explora un posible próximo paso."],
      outcomeTitle: "Comprende mejor tu pregunta",
      outcomeLead: "Una mirada personal y no otro test genérico.",
      outcomes: [
        { title: "Tu pregunta central", text: "Distingue lo principal de los detalles secundarios." },
        { title: "Una nueva perspectiva", text: "Explora conexiones, retos y recursos." },
        { title: "Un paso posible", text: "Recibe observaciones escritas para reflexionar." },
      ],
      processTitle: "Personal, sencillo y privado",
      processLead: "La primera revisión escrita es gratuita, sin cita o videollamada.",
      steps: [
        { title: "Elige tu tema", text: "Al final selecciona situación o energía y bienestar." },
        { title: "Deja tu contacto", text: "Tu teléfono y el consentimiento para una respuesta por mensajería." },
        { title: "Acuerda un envío seguro", text: "Tras dar tu consentimiento, Telegram puede pedir una foto normal y un dibujo opcionales. Envía expedientes médicos, pruebas y datos sensibles solo por el formulario protegido; WhatsApp es contacto manual." },
      ],
      startTitle: "¿Qué deseas explorar?",
      startLead: "Elige el tema y deja tu teléfono, sin datos personales por chat.",
      cta: "Solicitar revisión exprés gratis", secondary: "Cómo funciona",
      photoAlt: "Andrey Litvinov", outcomeAlt: "Faro junto al mar", processAlt: "Espacio tranquilo con luz matinal",
      faq: [
        ["¿Qué incluye?", "Una primera revisión personal escrita tras acordar el intercambio seguro. Una consulta en directo es opcional y aparte."],
        ["¿Tengo que dibujar?", "Para una situación puedo proponer YO–META–PROBLEMA. Para bienestar se utilizan otras preguntas reflexivas."],
        ["¿Es un diagnóstico médico?", "No. Es una reflexión simbólica, no diagnostica ni trata enfermedades. Consulta a profesionales sanitarios."],
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
  en: { lead: "Your question · a fresh perspective · a next step.", reviews: "See the full client video archive · 12 videos" },
  ru: { lead: "Ваш вопрос · новый взгляд · следующий шаг.", reviews: "Все видеоотзывы клиентов · 12 видео" },
  es: { lead: "Tu pregunta · otra perspectiva · un paso más.", reviews: "Todos los testimonios · 12 vídeos" },
} as const;

const situationVideoStory = {
  en: {
    eyebrow: "VIDEO · MEET ANDREY",
    title: "How a personal express review works",
    lead: "I look at one question you bring — a life situation, work, relationships or everyday wellbeing. Together with your short description, I consider what seems difficult, which resources may help and what you might explore next.",
    takeaway: "You receive personal written observations, not an automated test, appointment or medical diagnosis.",
    recording: "The existing recording introduces how I choose an approach. It is a general introduction, not yet a video made specifically about this free review.",
    audio: "Andrey's introduction · English audio",
    storiesEyebrow: "REAL CLIENT VIDEOS",
    storiesTitle: "Three real experiences with my work",
    storiesLead: "Original videos about other personal sessions and approaches. They are not reviews of this exact free service.",
    enAudio: "English audio", ruAudio: "Russian audio",
    storiesNote: "These are individual experiences, not guaranteed or typical results, and not medical evidence.",
  },
  ru: {
    eyebrow: "ВИДЕО · ЗНАКОМСТВО С АНДРЕЕМ",
    title: "Что такое личная экспресс-диагностика",
    lead: "Я лично рассматриваю один ваш вопрос — ситуацию, работу, отношения, энергию или повседневное самочувствие. С помощью короткого описания мы уточняем основную сложность, возможные ресурсы и направление следующего шага.",
    takeaway: "Вы получаете личный письменный взгляд, а не автоматический тест, запись на приём или медицинский диагноз.",
    recording: "В доступном видео я рассказываю, как выбираю подход к работе. Это общее знакомство, отдельное видео именно об этой диагностике ещё не записано.",
    audio: "Видео Андрея · русский язык",
    storiesEyebrow: "НАСТОЯЩИЕ ВИДЕООТЗЫВЫ",
    storiesTitle: "Три истории о работе со мной",
    storiesLead: "Реальные отзывы о разных личных сессиях и подходах, не обещания результата этой бесплатной услуги.",
    enAudio: "Аудио на английском", ruAudio: "Аудио на русском",
    storiesNote: "Опыт каждого индивидуален; результаты не гарантированы, отзывы не доказывают лечебного эффекта.",
  },
  es: {
    eyebrow: "VÍDEO · CONOCE A ANDREY",
    title: "¿En qué consiste la revisión personal exprés?",
    lead: "Analizo personalmente una pregunta que quieras compartir: una situación, el trabajo, las relaciones o tu bienestar cotidiano. A partir de una breve descripción, exploramos el reto central, los recursos y un posible siguiente paso.",
    takeaway: "Recibirás observaciones personales por escrito, no una prueba automática, una cita ni un diagnóstico médico.",
    recording: "Este vídeo existente presenta mi enfoque de alquimia psíquica. Es una introducción general, no un vídeo específico sobre la revisión exprés gratuita.",
    audio: "Presentación de Andrey · audio en español",
    storiesEyebrow: "TESTIMONIOS REALES EN VÍDEO",
    storiesTitle: "Tres experiencias reales de clientes",
    storiesLead: "Vídeos sobre otros formatos de trabajo personal, no sobre este servicio gratuito. El audio original es en inglés; los títulos están traducidos.",
    enAudio: "Audio original en inglés", ruAudio: "Audio original en ruso",
    storiesNote: "Son experiencias personales, no resultados típicos o garantizados ni evidencia de eficacia médica.",
  },
} as const;

const situationApproach = {
  en: {
    label: "PERSONAL METHOD", title: "One review, adapted to your question",
    lead: "I listen to your question and use reflective tools when helpful. The focus changes the questions, not the service.",
    items: [
      { title: "If it is about a situation", text: "We clarify your goal, obstacles and resources. A simple ME–GOAL–PROBLEM sketch or symbolic constellation can help explore patterns." },
      { title: "If it is about energy and health", text: "We reflect on everyday energy and resources; Wu Xing (Five Elements) may offer a symbolic map, never a medical diagnosis or treatment." },
    ],
    safety: "Please keep personal details out of messengers. Medical concerns belong with qualified healthcare professionals.",
  },
  ru: {
    label: "ЛИЧНЫЙ МЕТОД", title: "Один разбор — с учётом вашего вопроса",
    lead: "Я изучаю запрос лично, при необходимости используя коучинговые и символические инструменты. Это одна услуга, а не два тарифа.",
    items: [
      { title: "Если речь о ситуации", text: "Уточняем цель, препятствия, связи и ресурсы. При необходимости используем рисунок «Я–Цель–Проблема» или символическую расстановку." },
      { title: "Если речь об энергии и здоровье", text: "Исследуем самочувствие, повседневные ресурсы и баланс. При необходимости — символическую модель У-Син (Пять стихий), без медицинской диагностики и лечения." },
    ],
    safety: "Не передавайте личные подробности в мессенджерах. По вопросам здоровья консультируйтесь с квалифицированным врачом.",
  },
  es: {
    label: "MÉTODO PERSONAL", title: "Una revisión adaptada a tu pregunta",
    lead: "Escucho tu consulta y utilizo herramientas reflexivas cuando ayudan. El tema cambia las preguntas, no el servicio.",
    items: [
      { title: "Cuando se trata de una situación", text: "Exploramos la meta, los obstáculos y los recursos. Un dibujo YO–META–PROBLEMA o una constelación simbólica puede ayudar." },
      { title: "Cuando se trata de energía y salud", text: "Reflexionamos sobre bienestar y recursos; Wu Xing (Cinco Elementos) es un mapa simbólico, nunca un diagnóstico ni tratamiento." },
    ],
    safety: "No compartas datos privados por mensajería. Para cuestiones médicas consulta profesionales sanitarios.",
  },
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
  const featuredReviewVideos = kind !== "situation" ? [] : locale === "ru"
    ? [testimonialVideos.ru[4], testimonialVideos.ru[1], testimonialVideos.ru[3]]
    : testimonialVideos[locale].slice(0, 3);

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
                <a className={styles.primary} href={kind === "situation" ? "#request-free-review" : kind === "dao" ? "#dao-free-start" : "#" + captureId}>{t.cta}<ArrowRight size={19} aria-hidden="true" /></a>}
              <a className={styles.secondary} href="#what-you-get">{kind === "dao" ? t.secondary : common.details}</a>
            </div>
            {kind === "dao" ? <p className={styles.daoSafety}><ShieldCheck size={15} aria-hidden="true" />{t.value}</p> : null}
          </div>
          <figure className={styles.heroVisual}>
            <Image src={images.hero} alt={t.photoAlt} fill priority sizes="(max-width: 800px) 100vw, 48vw" />
            {kind !== "dao" ? <figcaption>{t.value}</figcaption> : null}
          </figure>
        </section>

        {kind === "dao" ? <div id="dao-free-start" data-dao-instagram-entry>
          <DaoTelegramHandoff locale={locale} />
          <CompactLeadCapture
            locale={locale}
            id={captureId}
            serviceTitle={serviceTitles.dao}
            title={final.title}
            lead={final.lead}
            disclaimer={common.limitations}
          />
        </div> : null}

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
          </section>
        ) : null}

        {kind === "situation" ? <TelegramDiagnosticEntry locale={locale} /> : null}

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
                <div className={styles.reviewPreviewGrid}>
                  {featuredReviewVideos.map((item) => (
                    <article className={styles.reviewPreviewCard} key={item.id} data-testimonial-video-id={item.id}>
                      <p className={styles.reviewAudioLabel}>
                        {item.language === "ru" ? situationVideoStory[locale].ruAudio : situationVideoStory[locale].enAudio}
                      </p>
                      <SiteVideoPlayer video={{ youtubeId: item.id, title: item.title, language: item.language }}
                        locale={locale} compact
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
                  <p className={styles.reviewPrivacy}><ShieldCheck size={16} aria-hidden="true" />{common.limitations}</p>
                </div>
                <div className={styles.reviewProcessPhoto}><Image src={images.process} alt={t.processAlt} fill sizes="(max-width: 720px) 100vw, 40vw" /></div>
              </section>
              <details className={styles.reviewStories} data-review-stories>
                <summary>{situationFirstScreen[locale].reviews}<ArrowRight size={18} aria-hidden="true" /></summary>
                <PersonalTestimonials locale={locale} variant="all" />
              </details>
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
          <section className={styles.testDirect} data-benchmark-free-test-next-step aria-labelledby="free-tests-direct-title">
            <div className={styles.testDirectCopy}>
              <p className={styles.testDirectKicker}>{common.free}</p>
              <h2 id="free-tests-direct-title">{freeTestDirectCopy[locale].title}</h2>
              <p>{freeTestDirectCopy[locale].lead}</p>
            </div>
            <Link className={styles.primary} href={testsHref} prefetch={false}
              data-benchmark-free-test-open>{t.cta}<ArrowRight size={19} aria-hidden="true" /></Link>
          </section>
        ) : null}

        {kind === "tests" ? <CompactLeadCapture
          locale={locale}
          id={captureId}
          serviceTitle={serviceTitles.tests}
          title={final.title}
          lead={final.lead}
          disclaimer={common.limitations}
        /> : null}
      </div>
    </main>
  );
}
