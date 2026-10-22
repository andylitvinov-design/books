import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
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
      privacy: "Explore tests without an account. Google sign-in is only needed if you choose to save available results.",
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
      eyebrow: "У-СИН · КАРТА ВАШИХ РЕСУРСОВ",
      title: "Узнайте, что даёт вам внутреннюю опору.",
      lead: "Бесплатный личный разбор по Пяти элементам — знать даосскую теорию не нужно.",
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

  return (
    <main className={styles.page} lang={locale} data-free-entry-landing={kind}>
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label={common.back}>
          <Link href={"/" + locale + "/services"} prefetch={false}><ArrowLeft size={17} aria-hidden="true" />{common.back}</Link>
          <span aria-hidden="true">/</span><span>{common.free}</span>
        </nav>

        <section className={[styles.hero, kind === "dao" ? styles.daoHero : ""].filter(Boolean).join(" ")} aria-labelledby="free-entry-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
            <span className={styles.badge}>{common.free}</span>
            <h1 id="free-entry-title">{t.title}</h1>
            <p className={styles.lead}>{t.lead}</p>
            {kind === "dao" ?
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
                <a className={styles.primary} href={"#" + captureId}>{t.cta}<ArrowRight size={19} aria-hidden="true" /></a>}
              <a className={styles.secondary} href="#what-you-get">{kind === "dao" ? t.secondary : common.details}</a>
            </div>
            {kind === "dao" ? <p className={styles.daoSafety}><ShieldCheck size={15} aria-hidden="true" />{t.value}</p> : null}
          </div>
          <figure className={styles.heroVisual}>
            <Image src={images.hero} alt={t.photoAlt} fill priority sizes="(max-width: 800px) 100vw, 48vw" />
            {kind !== "dao" ? <figcaption>{t.value}</figcaption> : null}
          </figure>
        </section>

        <section className={[styles.scene, styles.outcomeScene, kind === "dao" ? styles.daoOutcomeScene : ""].filter(Boolean).join(" ")} id="what-you-get" aria-labelledby="free-outcomes-title">
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
        </section>

        {kind !== "dao" ? <section className={[styles.scene, styles.processScene].join(" ")} id="how-it-works" aria-labelledby="free-process-title">
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

        {kind === "situation" ? (
          <details className={styles.fullQuestionnaire} data-optional-written-review>
            <summary>{common.fullForm}</summary>
            <FreeSituationReviewForm locale={locale} />
          </details>
        ) : null}

        {kind === "situation" ? <div className={styles.videoWrap}><ServiceVideoShowcase topic="overview" locale={locale} id="service-video" /></div> : null}
        {kind === "situation" ? <PersonalTestimonials locale={locale === "es" ? "en" : locale} variant="all" /> : null}

        <CompactLeadCapture
          locale={locale}
          id={captureId}
          serviceTitle={serviceTitles[kind]}
          title={final.title}
          lead={final.lead}
          disclaimer={common.limitations}
        />
      </div>
    </main>
  );
}
