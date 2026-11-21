export type PersonalServiceKey = "psychohomeopathy" | "imagery-therapy" | "systemic-constellations" | "business-consulting";
export type ServicePageLocale = "en" | "ru" | "es";

export const personalServicePaths: Record<PersonalServiceKey, string> = {
  psychohomeopathy: "psychohomeopathy",
  "imagery-therapy": "imagery-therapy",
  "systemic-constellations": "systemic-constellations",
  "business-consulting": "business-consulting",
};

export const servicePageShared = {
  ru: {
    back: "Все направления работы", free: "Начать с бесплатной диагностики ситуации",
    request: "Запросить индивидуальную сессию", requestIntro: "Расскажите в двух словах о своём запросе. Я отвечу лично, уточню формат, доступное время и стоимость до подтверждения записи.",
    requestNote: "Это запрос на запись, а не оплата или автоматическое бронирование. Вы сами подтверждаете отправку сообщения в WhatsApp.",
    forWhom: "С какими вопросами приходят", how: "Как проходит работа",
    outcomes: "Что вы можете получить от встречи", faq: "Перед записью",
    start: "Хотите начать без выбора метода?", freeBody: "Сначала можно бесплатно заполнить коучинг-форму, отправить рисунок от руки и получить письменный отчёт. Платная сессия необязательна.",
    next: "Отправить запрос на сессию", price: "30 минут — €50; 60 минут — €100. Время подтвердим лично. Оплата на этой странице не списывается.",
    practitioner: "Личная работа с Андреем Литвиновым", remote: "Торонто и онлайн", learn: "Как это работает",
    disclaimerHeading: "Важные границы",
  },
  en: {
    back: "All personal services", free: "Start with a free situation review",
    request: "Request a personal session", requestIntro: "Share a few words about what you want to explore. I'll reply personally to confirm the format, available times and price before any booking.",
    requestNote: "This is an enquiry, not a payment or automatic booking. You review and send the prepared WhatsApp message yourself.",
    forWhom: "Questions we can explore", how: "What a session looks like",
    outcomes: "What to take away", faq: "Before you book",
    start: "Want to begin without choosing a method?", freeBody: "Start with a free coaching form and handwritten drawing. I'll send a written report; a paid live session is entirely optional.",
    next: "Request your session", price: "30 minutes — €50; 60 minutes — €100. Availability is confirmed personally. No payment is taken on this page.",
    practitioner: "Work personally with Andrey Litvinov", remote: "Toronto & online", learn: "How the work unfolds",
    disclaimerHeading: "Important boundaries",
  },
  es: {
    back: "Todos los servicios personales", free: "Empezar con una evaluación gratuita",
    request: "Solicitar una sesión individual", requestIntro: "Cuéntame brevemente qué quieres explorar. Responderé personalmente para confirmar modalidad, disponibilidad y precio antes de reservar.",
    requestNote: "Esto es una solicitud, no un pago ni una reserva automática. Tú revisas y envías el mensaje en WhatsApp.",
    forWhom: "Situaciones que podemos explorar", how: "Cómo transcurre una sesión",
    outcomes: "Qué puedes llevarte", faq: "Antes de reservar",
    start: "¿Prefieres empezar sin elegir un método?", freeBody: "Empieza con un formulario gratuito de coaching y dibujo a mano; recibirás un informe escrito. Una sesión de pago es opcional.",
    next: "Solicitar mi sesión", price: "30 minutos — €50; 60 minutos — €100. Confirmaremos el horario personalmente. No se cobra nada en esta página.",
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
      faqs:[{q:"Can this treat physical symptoms?",a:"No. Homeopathy lacks reliable evidence of effectiveness for treating health conditions. This service does not diagnose illness or replace medical assessment, treatment or urgent care."},{q:"Do I have to take remedies?",a:"No. This page makes no prescriptions, potency or dosage recommendations and does not advise changing medications. Discuss clinical questions with a qualified professional."},{q:"Is the first live session free?",a:"No. Live sessions cost €50 for 30 minutes or €100 for 60 minutes. The separate free option is a coaching questionnaire and hand-drawn situation assessment with a written report."}],
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
      title:"Индивидуальные системные расстановки в Торонто и онлайн",
      description:"Индивидуальные расстановки в Торонто и онлайн: семья, отношения, работа и бизнес. Запросите сессию €50/30 мин или €100/60 мин.",
      eyebrow:"03 · Системные расстановки · Торонто и онлайн",
      headline:"Есть цель, но непонятно, почему движение застопорилось?",
      lead:"Когда решение не складывается, полезно посмотреть на ситуацию с другой точки зрения: на роли, отношения, лояльности, ограничения и возможные сценарии. На индивидуальной расстановочной сессии мы создаём символическую карту запроса и исследуем варианты действий — без обещания заранее известного результата.",
      questions:["Есть ясная цель, но я снова и снова останавливаюсь.","Непростой выбор в работе, бизнесе, партнёрстве или отношениях.","Повторяющиеся семейные и командные роли, внутренние конфликты.","Хочу по-новому увидеть ресурсы, препятствия и возможные решения."],
      process:[{title:"Формулируем запрос",text:"Определяем вопрос и границы работы: личная жизнь, семья, команда, бизнес или конкретная цель."},{title:"Строим символическую картину",text:"Используем расстановочные элементы, позиции и при необходимости архетипические образы, чтобы рассмотреть динамику ситуации."},{title:"Сверяемся с реальностью",text:"Отделяем впечатления и гипотезы от фактов; обсуждаем идеи, которые можно проверить самостоятельно."}],
      takeaways:["Более широкий взгляд на отношения, роли и повторяющиеся сценарии.","Гипотезы о возможных точках изменения, а не готовый прогноз.","Варианты следующих шагов, которые вы оцениваете самостоятельно."],
      faqs:[{q:"Расстановка покажет будущее бизнеса или отношений?",a:"Нет. Это символический исследовательский метод, а не предсказание, финансовый анализ или способ гарантировать исход."},{q:"Можно прийти одному?",a:"Да, доступен индивидуальный формат. Присутствие родственников, партнёров или команды не обязательно."},{q:"Можно ли провести сессию в Торонто или онлайн?",a:"Оба формата обсуждаются лично. Отправка запроса не подтверждает бронь и не списывает оплату; время и формат согласуются до записи."},{q:"Бесплатный разбор — это бесплатная сессия?",a:"Нет. Бесплатный вариант — письменный разбор коучинг-анкеты и рисунка. Индивидуальная живая сессия стоит €50 за 30 минут или €100 за 60 минут; заявку можно подать без обязательств."},{q:"Подходит ли это для бизнес-решений?",a:"Можно исследовать роли и собственное восприятие ситуации. Финансовые, юридические и кадровые решения следует проверять на фактах с профильными специалистами."}],
      disclaimer:"Расстановки и архетипические практики — исследовательские, не доказанный способ прогнозирования или гарантированного ускорения достижения целей. Не заменяют медицину, психиатрическую помощь, финансовую или юридическую экспертизу.",
      orderLabel:"Запросить расстановочную сессию"
    },
    en: {
      title:"Individual Systemic Constellations in Toronto & Online",
      description:"Explore family, relationship and business patterns in a personal constellation session in Toronto or online. Enquire about €50/30 min or €100/60 min.",
      eyebrow:"03 · Systemic constellations · Toronto & online",
      headline:"You have a goal. Why does the path forward feel blocked?",
      lead:"When a decision or goal feels stuck, it can help to look at the wider picture: roles, relationships, expectations, loyalties and possibilities. In a one-to-one constellation session we create a symbolic map of your question and explore different perspectives — without claiming to predict or guarantee outcomes.",
      questions:["I have a goal but keep finding myself at the same roadblock.","A difficult choice involving work, business, a partnership or relationships.","Recurring family or team roles and conflicts that seem hard to change.","I want to see different possibilities, constraints and next steps."],
      process:[{title:"Clarify your question",text:"We define the area of life or work you want to explore, along with your boundaries and expectations."},{title:"Map the wider system",text:"We use symbolic positions, constellation elements and optional archetypal imagery to examine patterns and roles."},{title:"Bring it back to reality",text:"We separate impressions from verified facts and identify possibilities you can assess for yourself."}],
      takeaways:["A broader view of patterns, roles and relationships.","Hypotheses about possible changes, not predictions.","Potential next steps that remain yours to evaluate and choose."],
      faqs:[{q:"Can a constellation predict my business outcome?",a:"No. This is a symbolic exploratory approach, not fortune-telling, financial forecasting or a guarantee of success."},{q:"Can I come alone?",a:"Yes, the individual format does not require your family members, partners or colleagues to attend."},{q:"Are sessions offered in Toronto or online?",a:"Both formats can be discussed personally. An enquiry does not confirm a booking or charge you; time and format are agreed before a session."},{q:"Is the free situation review a free live session?",a:"No. The free route is a written review of a coaching questionnaire and hand-drawn map. Live one-to-one sessions cost €50 for 30 minutes or €100 for 60 minutes, with no commitment from sending an enquiry."},{q:"Can we work with business decisions?",a:"We can explore perceptions and team roles, but financial, legal and employment decisions need evidence and qualified professional advice."}],
      disclaimer:"Constellation and archetypal work is exploratory, not a proven method for predicting results or making goals happen faster. It does not replace medical, psychiatric, financial or legal advice.",
      orderLabel:"Request a systemic constellation session"
    },
    es: {
      title:"Constelaciones sistémicas individuales en Toronto y online",
      description:"Constelaciones individuales en Toronto y online: relaciones, familia, decisiones y trabajo. Solicita 30 min €50 o 60 min €100.",
      eyebrow:"03 · Constelaciones sistémicas · Toronto y online",
      headline:"Tienes una meta, ¿pero el camino parece bloqueado?",
      lead:"Cuando una decisión no avanza, puede ayudar observar los roles, relaciones, expectativas y posibilidades. En una sesión individual creamos un mapa simbólico de tu pregunta para explorar perspectivas alternativas sin prometer resultados.",
      questions:["Tengo una meta pero encuentro obstáculos repetidos.","Debo tomar una decisión en el trabajo, negocio o relaciones.","Se repiten roles y conflictos familiares o de equipo.","Quiero explorar posibilidades y próximos pasos."],
      process:[{title:"Aclarar tu pregunta",text:"Definimos el tema y los límites de la sesión."},{title:"Representar el sistema",text:"Usamos posiciones simbólicas, elementos de constelaciones y, si deseas, imágenes arquetípicas."},{title:"Volver a la realidad",text:"Distinguimos impresiones de hechos y buscamos opciones que puedas evaluar."}],
      takeaways:["Una perspectiva más amplia sobre roles y relaciones.","Hipótesis para explorar, no predicciones.","Posibles próximos pasos que tú decides."],
      faqs:[{q:"¿Predice el futuro de mi empresa?",a:"No. No es un pronóstico financiero ni una garantía de resultados."},{q:"¿Puedo acudir solo?",a:"Sí. No es necesario que asista tu familia o equipo."},{q:"¿Las sesiones son en Toronto o en línea?",a:"Puedes consultar ambas modalidades. Enviar una solicitud no confirma una reserva ni genera cobros; acordamos la hora y el formato primero."},{q:"¿La evaluación gratuita incluye una sesión en vivo?",a:"No. La opción gratuita es un análisis por escrito del cuestionario y un dibujo. Las sesiones individuales en vivo cuestan €50 por 30 minutos o €100 por 60 minutos; solicitar información no te obliga a reservar."},{q:"¿Puedo traer temas empresariales?",a:"Podemos explorar percepciones y roles, pero las decisiones financieras y legales requieren pruebas y asesoramiento profesional."}],
      disclaimer:"Las constelaciones y las prácticas arquetípicas son exploratorias y no garantizan resultados. No sustituyen asesoramiento médico, psiquiátrico, financiero o legal.",
      orderLabel:"Solicitar una sesión de constelaciones"
    }
  },
  "business-consulting": {
    "ru": {
      "title": "Бизнес-консалтинг, бизнес-расстановки и активация цели",
      "description": "Индивидуальная бизнес-сессия: системная карта, бизнес-расстановка, активация цели и план конкретных действий на 14 дней.",
      "eyebrow": "04 · Бизнес и цели",
      "headline": "У бизнеса есть цель. Как найти точку движения?",
      "lead": "Когда задача ясна, но решение буксует, полезно увидеть более широкую картину: роли владельца, команды, партнёров, клиентов, продукта и денег. Объединяем реальную бизнес-задачу с символической бизнес-расстановкой, практикой активации цели и планом действий. Получаем рабочие гипотезы, а не предсказания и гарантии.",
      "questions": [
        "Есть цель роста, но трудно выбрать следующий шаг.",
        "В партнёрстве или команде возникли противоречия и повторяющиеся затруднения.",
        "Продажи, позиционирование или деньги вызывают ощущение застоя.",
        "Стою перед запуском проекта, сменой направления или важным выбором.",
        "Знаю, чего хочу, но сомневаюсь, откладываю действие или теряю уверенность."
      ],
      "process": [
        {
          "title": "01 · Проясняем цель",
          "text": "Выбираем одну бизнес-задачу, фиксируем исходное положение, ограничения и измеримый критерий продвижения."
        },
        {
          "title": "02 · Строим бизнес-расстановку",
          "text": "С помощью символических позиций исследуем собственника, команду, клиентов, продукт, деньги и цель. Отмечаем роли, конфликты и ресурсы как гипотезы, не как установленные факты."
        },
        {
          "title": "03 · Активируем цель",
          "text": "В добровольной образной практике представляем желаемый результат, замечаем внутреннюю готовность, сомнения и ресурсы. Связываем образ с реальным управленческим решением."
        },
        {
          "title": "04 · Переходим к действию",
          "text": "Отделяем впечатления от бизнес-фактов, выбираем один шаг на ближайшие 72 часа, ещё 2–3 действия и показатель, который проверим за 14 дней."
        }
      ],
      "takeaways": [
        "Чёткая приоритетная цель и критерий её достижения.",
        "Карта бизнес-системы, ресурсов и гипотез для проверки.",
        "Решение и первый конкретный шаг в течение 72 часов.",
        "План на 14 дней с одним понятным показателем прогресса."
      ],
      "faqs": [
        {
          "q": "Что значит «активация цели»?",
          "a": "Это добровольная визуализация и коучинговая работа: конкретизировать желаемое, исследовать готовность и выбрать следующий шаг. Она не «притягивает деньги» и не гарантирует результат."
        },
        {
          "q": "Нужно ли звать партнёров или команду?",
          "a": "Нет. Индивидуальная сессия исследует ваше восприятие системы, а не скрытые мотивы отсутствующих людей."
        },
        {
          "q": "Это финансовый или стратегический аудит?",
          "a": "Нет. Мы помогаем структурировать запрос и решения, но не подменяем анализ финансов, права, кадров или рынка профильными специалистами."
        },
        {
          "q": "Стоимость и длительность?",
          "a": "Основная сессия: 60 минут, €100. Экспресс-формат для прояснения цели: 30 минут, €50. Время и формат подтверждаем до записи; оплата на странице не списывается."
        }
      ],
      "disclaimer": "Бизнес-расстановки и воображение — субъективные методы исследования, не доказанная диагностика организации и не способ гарантировать доход. Это не финансовая, юридическая или инвестиционная консультация. Решения и проверка фактов остаются за владельцем бизнеса.",
      "orderLabel": "Запросить бизнес-сессию и активацию цели"
    },
    "en": {
      "title": "Business consulting, constellations & goal activation",
      "description": "One-to-one business consulting with a symbolic constellation, goal-activation exercise and a focused 14-day action plan.",
      "eyebrow": "04 · Business & goals",
      "headline": "Your business has a goal. What could move it forward?",
      "lead": "When a business decision feels stuck, we examine the wider picture: your role, team, partners, customers, product and money. A symbolic business constellation and an optional goal-activation visualization help generate perspectives and turn one goal into a testable decision. This is a structured reflection, not a promise of commercial results.",
      "questions": [
        "I have a growth goal but cannot choose my next step.",
        "Partnership or team roles create recurring difficulties.",
        "Sales, pricing or positioning feel stuck.",
        "I face a launch, pivot or important business choice.",
        "I know what I want but postpone acting or doubt myself as a founder."
      ],
      "process": [
        {
          "title": "01 · Define the goal",
          "text": "Choose one business question, establish the baseline and define a measurable sign of progress."
        },
        {
          "title": "02 · Map the business system",
          "text": "Use symbolic positions for the owner, team, customers, offer, money and goal. Explore roles, tensions and resources as hypotheses, not facts."
        },
        {
          "title": "03 · Activate the goal",
          "text": "Optional guided imagery explores the desired outcome, your readiness, doubts and strengths. Connect the image to a real decision."
        },
        {
          "title": "04 · Translate it into action",
          "text": "Reality-check insights, select an action within 72 hours, two or three further steps and one measure to review over 14 days."
        }
      ],
      "takeaways": [
        "One clearly framed priority goal with a success criterion.",
        "A business-system map and hypotheses worth testing.",
        "A first decision and action within 72 hours.",
        "A lightweight 14-day plan with a metric for progress."
      ],
      "faqs": [
        {
          "q": "What is goal activation?",
          "a": "It is a voluntary imagery and coaching exercise to clarify the desired outcome, notice motivations and select an action. It cannot manifest revenue or guarantee success."
        },
        {
          "q": "Does my team need to attend?",
          "a": "No. One-to-one work explores your experience of the system; it cannot uncover absent people's thoughts or motives."
        },
        {
          "q": "Is this financial or management advice?",
          "a": "It supports reflection and decision-making, not a financial audit, investment recommendation, legal opinion or substitute for evidence-based specialist advice."
        },
        {
          "q": "What is the duration and fee?",
          "a": "A 60-minute session is €100; a 30-minute goal-clarity express session is €50. We confirm the time and format before booking. No payment is taken here."
        }
      ],
      "disclaimer": "Business constellations and guided imagery are subjective reflective tools, not validated organizational diagnostics or guaranteed ways to grow revenue. This session does not replace financial, legal, employment or investment expertise. You remain responsible for checking facts and decisions.",
      "orderLabel": "Request business consulting & goal activation"
    },
    "es": {
      "title": "Consultoría de negocios, constelaciones y activación de metas",
      "description": "Sesión individual de consultoría empresarial con mapa sistémico, constelación, activación de metas y plan de acción de 14 días.",
      "eyebrow": "04 · Negocios y objetivos",
      "headline": "Tu negocio tiene una meta. ¿Cuál es el siguiente paso?",
      "lead": "Cuando una decisión se estanca, exploramos los roles del propietario, equipo, socios, clientes, producto y dinero. Un mapa simbólico y una práctica voluntaria de activación de metas ayudan a elegir una decisión y comprobarla en la realidad. Son perspectivas nuevas, no promesas de crecimiento.",
      "questions": [
        "Tengo una meta de crecimiento, pero no sé cuál es el siguiente paso.",
        "Los roles del equipo o la relación con socios generan dificultades.",
        "Ventas, precios o posicionamiento parecen bloqueados.",
        "Estoy ante un lanzamiento o una decisión importante.",
        "Sé lo que quiero, pero sigo aplazando la acción."
      ],
      "process": [
        {
          "title": "01 · Definir la meta",
          "text": "Elegimos una pregunta, el punto de partida y un indicador concreto de avance."
        },
        {
          "title": "02 · Mapear el negocio",
          "text": "Representamos simbólicamente al propietario, equipo, clientes, producto, dinero y meta. Las impresiones son hipótesis, no hechos."
        },
        {
          "title": "03 · Activar la meta",
          "text": "Con una visualización opcional exploramos el resultado deseado, la motivación y los recursos, y lo conectamos con una decisión real."
        },
        {
          "title": "04 · Pasar a la acción",
          "text": "Contrastamos ideas con datos y elegimos una acción en 72 horas, 2–3 pasos y un indicador para revisar en 14 días."
        }
      ],
      "takeaways": [
        "Una meta clara con un criterio de éxito.",
        "Un mapa de roles, recursos e hipótesis contrastables.",
        "Una primera decisión y acción en 72 horas.",
        "Un plan de 14 días y una medida de progreso."
      ],
      "faqs": [
        {
          "q": "¿Qué significa activar una meta?",
          "a": "Es una visualización voluntaria y una práctica de coaching para concretar el resultado y elegir una acción. No atrae ingresos mágicamente ni garantiza éxito."
        },
        {
          "q": "¿Necesito reunir a mi equipo?",
          "a": "No. Exploramos tu perspectiva, no pensamientos ocultos de otras personas."
        },
        {
          "q": "¿Sustituye una auditoría empresarial?",
          "a": "No. Las decisiones financieras, jurídicas y de personal requieren datos y asesoramiento especializado."
        },
        {
          "q": "¿Cuánto dura y cuesta?",
          "a": "60 minutos: €100. Formato exprés de 30 minutos: €50. Confirmamos modalidad y disponibilidad antes de reservar; no se cobra aquí."
        }
      ],
      "disclaimer": "Las constelaciones empresariales y la visualización son métodos subjetivos de reflexión, no diagnósticos empresariales validados ni garantías de ingresos. No sustituyen asesoría financiera, jurídica o profesional.",
      "orderLabel": "Solicitar consultoría y activación de metas"
    }
  }
};

export const personalServiceImages: Record<PersonalServiceKey, string> = {
  psychohomeopathy: "/images/holistic-house/video-posters/homeopathy-en-v2.webp",
  "imagery-therapy": "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
  "systemic-constellations": "/images/holistic-house/video-posters/constellations-en-v1.webp",
  "business-consulting": "/images/holistic-house/video-posters/constellations-en-v1.webp",
};
