export type PersonalServiceKey = "psychohomeopathy" | "imagery-therapy" | "systemic-constellations";
export type ServicePageLocale = "en" | "ru" | "es";

export const personalServicePaths: Record<PersonalServiceKey, string> = {
  psychohomeopathy: "psychohomeopathy",
  "imagery-therapy": "imagery-therapy",
  "systemic-constellations": "systemic-constellations",
};

export const servicePageShared = {
  ru: {
    back: "Все направления работы", free: "Начать с бесплатной диагностики ситуации",
    request: "Запросить индивидуальную сессию", requestIntro: "Расскажите в двух словах о своём запросе. Я отвечу лично, уточню формат, доступное время и стоимость до подтверждения записи.",
    requestNote: "Это запрос на запись, а не оплата или автоматическое бронирование. Вы сами подтверждаете отправку сообщения в WhatsApp.",
    forWhom: "С какими вопросами приходят", how: "Как проходит работа",
    outcomes: "Что вы можете получить от встречи", faq: "Перед записью",
    start: "Хотите начать без выбора метода?", freeBody: "Начнём с бесплатного разговора о вашей ситуации и возможных следующих шагах. Он не обязывает вас покупать индивидуальную работу.",
    next: "Отправить запрос на сессию", price: "Формат, продолжительность и стоимость согласуем до записи. Оплата на этой странице не списывается.",
    practitioner: "Личная работа с Андреем Литвиновым", remote: "Торонто и онлайн", learn: "Как это работает",
    disclaimerHeading: "Важные границы",
  },
  en: {
    back: "All personal services", free: "Start with a free situation review",
    request: "Request a personal session", requestIntro: "Share a few words about what you want to explore. I'll reply personally to confirm the format, available times and price before any booking.",
    requestNote: "This is an enquiry, not a payment or automatic booking. You review and send the prepared WhatsApp message yourself.",
    forWhom: "Questions we can explore", how: "What a session looks like",
    outcomes: "What to take away", faq: "Before you book",
    start: "Want to begin without choosing a method?", freeBody: "Start with a free conversation about your situation and possible next steps. You are under no obligation to book paid work.",
    next: "Request your session", price: "Format, duration and fee are confirmed before booking. No payment is taken on this page.",
    practitioner: "Work personally with Andrey Litvinov", remote: "Toronto & online", learn: "How the work unfolds",
    disclaimerHeading: "Important boundaries",
  },
  es: {
    back: "Todos los servicios personales", free: "Empezar con una evaluación gratuita",
    request: "Solicitar una sesión individual", requestIntro: "Cuéntame brevemente qué quieres explorar. Responderé personalmente para confirmar modalidad, disponibilidad y precio antes de reservar.",
    requestNote: "Esto es una solicitud, no un pago ni una reserva automática. Tú revisas y envías el mensaje en WhatsApp.",
    forWhom: "Situaciones que podemos explorar", how: "Cómo transcurre una sesión",
    outcomes: "Qué puedes llevarte", faq: "Antes de reservar",
    start: "¿Prefieres empezar sin elegir un método?", freeBody: "Podemos empezar con una conversación gratuita sobre tu situación. No estás obligado a contratar sesiones posteriores.",
    next: "Solicitar mi sesión", price: "Acordaremos la modalidad, duración y precio antes de confirmar. No se cobra nada en esta página.",
    practitioner: "Trabajo personal con Andrey Litvinov", remote: "Toronto y en línea", learn: "Cómo trabajamos",
    disclaimerHeading: "Límites importantes",
  },
} as const;

type ServiceCopy = {
  title:string; description:string; eyebrow:string; headline:string; lead:string;
  questions:string[]; process:{title:string;text:string}[];
  takeaways:string[]; faqs:{q:string;a:string}[]; disclaimer:string; orderLabel:string;
};

export const personalServiceCopy: Record<PersonalServiceKey, Record<ServicePageLocale, ServiceCopy>> = {
  psychohomeopathy: {
    ru: {
      title:"Психогомеопатия — работа с состоянием и личным ресурсом",
      description:"Личная консультация по психогомеопатии: разговор о самочувствии, напряжении, ресурсах и образах внутреннего состояния. Без медицинских обещаний.",
      eyebrow:"01 · Психогомеопатия",
      headline:"Когда сил мало, а внутреннее напряжение мешает жить",
      lead:"Усталость, ощущение зажатости, снижение ресурса и повторяющиеся телесные переживания иногда трудно выразить словами. В моём подходе мы спокойно исследуем, как вы переживаете своё состояние, какие ситуации с ним связаны и где можно найти больше внутренней опоры. Это дополнительная рефлексивная практика, не лечение болезни.",
      questions:["Чувствую себя истощённым, мало энергии и трудно восстановиться.","Переживаю внутреннее сжатие, напряжение, связь эмоций и телесных ощущений.","Повторяются стрессовые реакции, хочется понять собственные состояния и потребности.","Ищу способ внимательнее относиться к ресурсам, границам и самочувствию."],
      process:[{title:"Уточняем состояние",text:"Вы описываете собственный опыт, ситуацию, переживания и ожидания. Никакой предварительной медицинской истории в заявке не требуется."},{title:"Исследуем личные образы",text:"Работаем с ощущениями, метафорами и символическим языком психогомеопатии как способом осмысления субъективного опыта."},{title:"Намечаем поддержку",text:"Обсуждаем возможные шаги самоподдержки и необходимость обратиться к профильному медицинскому специалисту, если есть симптомы."}],
      takeaways:["Более ясное описание того, что с вами происходит.","Понимание ситуаций, в которых истощается ваш личный ресурс.","Возможные способы наблюдения за своим состоянием и самоподдержки."],
      faqs:[{q:"Это лечение физических симптомов?",a:"Нет. Гомеопатия не имеет надёжных доказательств эффективности при лечении заболеваний. Эта консультация не устанавливает диагноз и не заменяет медицинское обследование, лечение или неотложную помощь."},{q:"Мне нужно принимать препараты?",a:"Нет. Эта страница не предлагает назначения, дозировки или изменение лекарств. Любые медицинские вопросы необходимо обсуждать с квалифицированным специалистом."},{q:"Можно сначала бесплатно?",a:"Да. Начните с бесплатной диагностики ситуации: мы проясним запрос и решим, нужна ли отдельная платная сессия."}],
      disclaimer:"Психогомеопатия — дополнительный субъективный подход, не доказанный метод лечения заболеваний. При физических симптомах обратитесь к врачу; не отменяйте назначенное лечение. Конкретный результат не гарантируется.",
      orderLabel:"Запросить сессию по психогомеопатии"
    },
    en: {
      title:"Psychohomeopathy — personal resources and wellbeing",
      description:"A personal psychohomeopathy consultation exploring lived experience, low energy, inner tension and resources. Complementary reflective work, not medical care.",
      eyebrow:"01 · Psychohomeopathy",
      headline:"When your energy is low and inner tension holds you back",
      lead:"Fatigue, a feeling of being stuck or tense, and recurring bodily experiences can be difficult to put into words. In my approach, we look calmly at how you experience these states, their personal context and possibilities for a steadier inner foundation. This is complementary reflective work, not medical treatment.",
      questions:["I feel depleted and struggle to find a sense of energy or support.","I notice tension, feeling frozen or links between emotions and bodily sensations.","Stress reactions keep recurring and I want to understand my personal patterns.","I want to explore my resources, boundaries and lived experience."],
      process:[{title:"Understand your experience",text:"We begin with what you notice, your current situation and your expectations. You do not need to send private medical details in the request."},{title:"Explore inner imagery",text:"We may use sensations, metaphors and the symbolic language of psychohomeopathy to reflect on subjective experience."},{title:"Identify supportive next steps",text:"We discuss possible personal support practices and whether medical assessment is needed for symptoms."}],
      takeaways:["A clearer language for your personal experience.","Insight into situations that drain your sense of resources.","Possible ways to observe and support your wellbeing."],
      faqs:[{q:"Can this treat physical symptoms?",a:"No. Homeopathy lacks reliable evidence of effectiveness for treating health conditions. This service does not diagnose illness or replace medical assessment, treatment or urgent care."},{q:"Do I have to take remedies?",a:"No. This page makes no prescriptions, potency or dosage recommendations and does not advise changing medications. Discuss clinical questions with a qualified professional."},{q:"Can we talk first for free?",a:"Yes. Begin with a free situation review and decide whether a separate paid session would be useful."}],
      disclaimer:"Homeopathy is not supported by reliable evidence as a treatment for medical conditions. Seek medical evaluation for physical symptoms, and do not stop prescribed care. Individual outcomes are not guaranteed.",
      orderLabel:"Request a psychohomeopathy session"
    },
    es: {
      title:"Psicohomeopatía — bienestar y recursos personales",
      description:"Consulta individual de psicohomeopatía para explorar sensaciones, tensión y recursos personales como trabajo complementario, no tratamiento médico.",
      eyebrow:"01 · Psicohomeopatía",
      headline:"Cuando te falta energía y la tensión interior te limita",
      lead:"El cansancio, la sensación de bloqueo y las experiencias corporales recurrentes no siempre son fáciles de expresar. En este enfoque exploramos cómo vives esos estados, su contexto y tus recursos personales. Es una práctica complementaria de reflexión, no un tratamiento médico.",
      questions:["Siento agotamiento y me cuesta recuperar energía.","Noto tensión, inmovilidad o relación entre emociones y sensaciones corporales.","Se repiten reacciones de estrés y quiero comprenderlas mejor.","Quiero explorar mis límites y mis recursos personales."],
      process:[{title:"Comprender tu experiencia",text:"Empezamos por tu situación y lo que sientes. No necesitas compartir datos médicos privados al solicitar la sesión."},{title:"Explorar imágenes interiores",text:"Podemos usar metáforas, sensaciones y el lenguaje simbólico de la psicohomeopatía para reflexionar."},{title:"Explorar próximos pasos",text:"Comentamos opciones de apoyo personal y cuándo es necesaria una evaluación médica."}],
      takeaways:["Más claridad para describir tu experiencia.","Comprensión de situaciones que agotan tus recursos.","Posibles formas de observación y autocuidado."],
      faqs:[{q:"¿Trata síntomas físicos?",a:"No. La homeopatía carece de evidencia fiable para tratar enfermedades. No sustituye diagnóstico, tratamiento ni atención urgente."},{q:"¿Necesito tomar remedios?",a:"No. Esta página no prescribe sustancias, dosis ni cambios de medicación."},{q:"¿Puedo empezar gratis?",a:"Sí, puedes comenzar con una evaluación gratuita de tu situación."}],
      disclaimer:"La homeopatía no cuenta con pruebas fiables de eficacia como tratamiento de enfermedades. Consulta con un profesional sanitario si tienes síntomas y no suspendas tratamientos prescritos. No hay resultados garantizados.",
      orderLabel:"Solicitar una sesión de psicohomeopatía"
    }
  },
  "imagery-therapy": {
    ru: {
      title:"Образная психотерапия — индивидуальные сессии",
      description:"Личная работа с образами бессознательного, чувствами и повторяющимися сценариями ради ясности, опоры и новых вариантов поведения.",
      eyebrow:"02 · Образная психотерапия",
      headline:"Когда грустно, одиноко или неясно, что делать дальше",
      lead:"Бывает, что вы понимаете ситуацию умом, но внутри всё равно страшно, тяжело или пусто. Через направленное воображение, символы и диалог с внутренними частями мы исследуем переживания и повторяющиеся сценарии, чтобы постепенно находить собственную опору и ясность. Темп и глубина работы согласуются с вами.",
      questions:["Грусть, одиночество, неуверенность и ощущение потери направления.","Страх оценки, трудности с проявлением себя и личными границами.","Повторяющиеся болезненные отношения и внутренние конфликты.","Понимаю проблему умом, но эмоционально ничего не меняется."],
      process:[{title:"Выбираем личный запрос",text:"Определяем, что вы хотите исследовать, чего ожидаете от встречи и какие темы пока трогать не готовы."},{title:"Работаем с внутренними образами",text:"Через бережные упражнения с воображением, ассоциациями и диалогом с частями себя рассматриваем внутреннюю динамику."},{title:"Интегрируем открытия",text:"Связываем полученные наблюдения с повседневными ситуациями и обсуждаем добровольные следующие шаги."}],
      takeaways:["Слова и образы для чувств, которые сложно выразить напрямую.","Новое понимание привычных реакций, границ и потребностей.","Идеи о том, как искать внутреннюю опору и действовать осознаннее."],
      faqs:[{q:"Нужно ли уметь визуализировать?",a:"Нет. Можно работать с ощущениями, ассоциациями, словами или символическими образами в комфортном темпе."},{q:"Это разовая встреча или курс?",a:"Можно начать с одной сессии. После неё вы решите, нужен ли индивидуальный цикл; количество и формат согласуются отдельно."},{q:"Заменяет ли это психиатрическую помощь?",a:"Нет. Образная работа на сайте не заменяет медицинскую диагностику, психиатрическое лечение и кризисную помощь."}],
      disclaimer:"Работа с образами не гарантирует устранения симптомов или определённого результата и не заменяет лицензированную медицинскую или кризисную помощь.",
      orderLabel:"Запросить сеанс образной психотерапии"
    },
    en: {
      title:"Guided imagery — individual personal sessions",
      description:"Explore unconscious images, repeating emotional patterns, inner conflict and personal boundaries through guided imagery-informed work.",
      eyebrow:"02 · Guided imagery",
      headline:"When sadness, loneliness or uncertainty keep you stuck",
      lead:"Sometimes you can explain a situation logically and still feel afraid, lost or alone. With guided imagery, symbols and exploration of inner parts, we can look at the feelings and patterns beneath the surface and work toward a clearer sense of yourself. You choose the pace and depth.",
      questions:["Sadness, loneliness, uncertainty or feeling disconnected from yourself.","Fear of judgement, trouble expressing needs and setting boundaries.","Repeating relationship patterns, inner conflict or old emotional reactions.","Understanding a difficulty intellectually without feeling any shift."],
      process:[{title:"Name the personal question",text:"We discuss what you want to explore, what you hope for and any limits or topics you prefer to leave aside."},{title:"Work with inner images",text:"Using voluntary imagery, associations or parts-oriented dialogue, we explore your personal emotional landscape."},{title:"Integrate what emerges",text:"We connect observations with everyday choices and discuss optional next steps."}],
      takeaways:["A language for feelings that have been hard to express.","Fresh perspectives on emotional patterns, boundaries and needs.","Ideas for developing inner stability and making conscious choices."],
      faqs:[{q:"What if I cannot visualize images?",a:"You do not need to be good at visualization. We can work with feelings, associations, language or symbols at a comfortable pace."},{q:"Is this a single session or a programme?",a:"Start with one session. A series can be discussed afterwards if it makes sense for your goals."},{q:"Does it replace psychiatric or clinical care?",a:"No. This service does not replace medical evaluation, psychiatric treatment, or emergency mental-health support."}],
      disclaimer:"Imagery-based personal work does not promise symptom relief or a specific result and is not a replacement for licensed medical, psychiatric or crisis care.",
      orderLabel:"Request a guided imagery session"
    },
    es: {
      title:"Imágenes guiadas — sesiones personales",
      description:"Explorar imágenes interiores, emociones, conflictos y límites mediante un trabajo personal con imaginación guiada.",
      eyebrow:"02 · Imágenes guiadas",
      headline:"Cuando la tristeza, la soledad o la incertidumbre te frenan",
      lead:"A veces entiendes la situación con la mente y sigues sintiendo miedo, vacío o confusión. Mediante imágenes, símbolos y exploración de partes interiores podemos comprender tus emociones y patrones a tu propio ritmo.",
      questions:["Tristeza, soledad y falta de orientación.","Miedo al juicio y dificultad para expresar necesidades.","Patrones dolorosos que se repiten en las relaciones.","Entender el problema intelectualmente sin notar cambios interiores."],
      process:[{title:"Definir tu pregunta",text:"Acordamos el objetivo, las expectativas y tus límites personales."},{title:"Explorar imágenes interiores",text:"Utilizamos voluntariamente imágenes, asociaciones o diálogo con partes interiores."},{title:"Integrar observaciones",text:"Relacionamos lo observado con situaciones cotidianas y próximos pasos opcionales."}],
      takeaways:["Palabras e imágenes para sentimientos difíciles.","Otra perspectiva sobre patrones y límites.","Ideas para cultivar estabilidad y claridad."],
      faqs:[{q:"¿Debo saber visualizar?",a:"No. También podemos trabajar con sentimientos, asociaciones o palabras."},{q:"¿Sesión única o curso?",a:"Puedes comenzar con una sesión y decidir después si deseas continuar."},{q:"¿Sustituye atención clínica?",a:"No. No sustituye evaluación médica, tratamiento psiquiátrico ni ayuda urgente."}],
      disclaimer:"Este trabajo no promete curar síntomas ni garantizar un resultado y no sustituye atención médica, psiquiátrica o de crisis.",
      orderLabel:"Solicitar una sesión de imágenes guiadas"
    }
  },
  "systemic-constellations": {
    ru: {
      title:"Системные расстановки и архетипическая поддержка",
      description:"Индивидуальная системная и архетипическая работа с личными, семейными и бизнес-запросами, выбором и целями.",
      eyebrow:"03 · Системные расстановки",
      headline:"Есть цель, но непонятно, почему движение застопорилось?",
      lead:"Когда решение не складывается, полезно посмотреть на ситуацию с другой точки зрения: на роли, отношения, лояльности, ограничения и возможные сценарии. На индивидуальной расстановочной сессии мы создаём символическую карту запроса и исследуем варианты действий — без обещания заранее известного результата.",
      questions:["Есть ясная цель, но я снова и снова останавливаюсь.","Непростой выбор в работе, бизнесе, партнёрстве или отношениях.","Повторяющиеся семейные и командные роли, внутренние конфликты.","Хочу по-новому увидеть ресурсы, препятствия и возможные решения."],
      process:[{title:"Формулируем запрос",text:"Определяем вопрос и границы работы: личная жизнь, семья, команда, бизнес или конкретная цель."},{title:"Строим символическую картину",text:"Используем расстановочные элементы, позиции и при необходимости архетипические образы, чтобы рассмотреть динамику ситуации."},{title:"Сверяемся с реальностью",text:"Отделяем впечатления и гипотезы от фактов; обсуждаем идеи, которые можно проверить самостоятельно."}],
      takeaways:["Более широкий взгляд на отношения, роли и повторяющиеся сценарии.","Гипотезы о возможных точках изменения, а не готовый прогноз.","Варианты следующих шагов, которые вы оцениваете самостоятельно."],
      faqs:[{q:"Расстановка покажет будущее бизнеса или отношений?",a:"Нет. Это символический исследовательский метод, а не предсказание, финансовый анализ или способ гарантировать исход."},{q:"Можно прийти одному?",a:"Да, доступен индивидуальный формат. Присутствие родственников, партнёров или команды не обязательно."},{q:"Подходит ли это для бизнес-решений?",a:"Можно исследовать роли и собственное восприятие ситуации. Финансовые, юридические и кадровые решения следует проверять на фактах с профильными специалистами."}],
      disclaimer:"Расстановки и архетипические практики — исследовательские, не доказанный способ прогнозирования или гарантированного ускорения достижения целей. Не заменяют медицину, психиатрическую помощь, финансовую или юридическую экспертизу.",
      orderLabel:"Запросить расстановочную сессию"
    },
    en: {
      title:"Systemic constellations & archetypal support",
      description:"Individual systemic and archetypal exploration of relationships, personal goals, family patterns, business roles and choices.",
      eyebrow:"03 · Systemic constellations",
      headline:"You have a goal. Why does the path forward feel blocked?",
      lead:"When a decision or goal feels stuck, it can help to look at the wider picture: roles, relationships, expectations, loyalties and possibilities. In a one-to-one constellation session we create a symbolic map of your question and explore different perspectives — without claiming to predict or guarantee outcomes.",
      questions:["I have a goal but keep finding myself at the same roadblock.","A difficult choice involving work, business, a partnership or relationships.","Recurring family or team roles and conflicts that seem hard to change.","I want to see different possibilities, constraints and next steps."],
      process:[{title:"Clarify your question",text:"We define the area of life or work you want to explore, along with your boundaries and expectations."},{title:"Map the wider system",text:"We use symbolic positions, constellation elements and optional archetypal imagery to examine patterns and roles."},{title:"Bring it back to reality",text:"We separate impressions from verified facts and identify possibilities you can assess for yourself."}],
      takeaways:["A broader view of patterns, roles and relationships.","Hypotheses about possible changes, not predictions.","Potential next steps that remain yours to evaluate and choose."],
      faqs:[{q:"Can a constellation predict my business outcome?",a:"No. This is a symbolic exploratory approach, not fortune-telling, financial forecasting or a guarantee of success."},{q:"Can I come alone?",a:"Yes, the individual format does not require your family members, partners or colleagues to attend."},{q:"Can we work with business decisions?",a:"We can explore perceptions and team roles, but financial, legal and employment decisions need evidence and qualified professional advice."}],
      disclaimer:"Constellation and archetypal work is exploratory, not a proven method for predicting results or making goals happen faster. It does not replace medical, psychiatric, financial or legal advice.",
      orderLabel:"Request a systemic constellation session"
    },
    es: {
      title:"Constelaciones sistémicas y apoyo arquetípico",
      description:"Exploración sistémica individual de relaciones, objetivos, roles familiares, decisiones y situaciones empresariales.",
      eyebrow:"03 · Constelaciones sistémicas",
      headline:"Tienes una meta, ¿pero el camino parece bloqueado?",
      lead:"Cuando una decisión no avanza, puede ayudar observar los roles, relaciones, expectativas y posibilidades. En una sesión individual creamos un mapa simbólico de tu pregunta para explorar perspectivas alternativas sin prometer resultados.",
      questions:["Tengo una meta pero encuentro obstáculos repetidos.","Debo tomar una decisión en el trabajo, negocio o relaciones.","Se repiten roles y conflictos familiares o de equipo.","Quiero explorar posibilidades y próximos pasos."],
      process:[{title:"Aclarar tu pregunta",text:"Definimos el tema y los límites de la sesión."},{title:"Representar el sistema",text:"Usamos posiciones simbólicas, elementos de constelaciones y, si deseas, imágenes arquetípicas."},{title:"Volver a la realidad",text:"Distinguimos impresiones de hechos y buscamos opciones que puedas evaluar."}],
      takeaways:["Una perspectiva más amplia sobre roles y relaciones.","Hipótesis para explorar, no predicciones.","Posibles próximos pasos que tú decides."],
      faqs:[{q:"¿Predice el futuro de mi empresa?",a:"No. No es un pronóstico financiero ni una garantía de resultados."},{q:"¿Puedo acudir solo?",a:"Sí. No es necesario que asista tu familia o equipo."},{q:"¿Puedo traer temas empresariales?",a:"Podemos explorar percepciones y roles, pero las decisiones financieras y legales requieren pruebas y asesoramiento profesional."}],
      disclaimer:"Las constelaciones y las prácticas arquetípicas son exploratorias y no garantizan resultados. No sustituyen asesoramiento médico, psiquiátrico, financiero o legal.",
      orderLabel:"Solicitar una sesión de constelaciones"
    }
  }
};

export const personalServiceImages: Record<PersonalServiceKey, string> = {
  psychohomeopathy: "/images/holistic-house/video-posters/homeopathy-en-v2.webp",
  "imagery-therapy": "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
  "systemic-constellations": "/images/holistic-house/video-posters/constellations-en-v1.webp",
};
