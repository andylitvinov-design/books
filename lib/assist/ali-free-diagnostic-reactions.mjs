/**
 * Ali Free Diagnostic · reaction and short-answer catalogue.
 *
 * Patterns classify only text supplied by the visitor, never a medical or
 * psychological state. This pure module has no provider, storage, URL, identity,
 * billing, photo-reading or CRM capabilities. The signed caller owns safety,
 * consent and the decision to submit a factual summary.
 *
 * A reaction is an interruption, not an answered diagnostic phase. Returned
 * "resume" means the existing stage question may be appended ONCE, unless
 * the reaction already contains a question.
 */
export const ALI_FREE_REACTIONS_VERSION='ali-free-reactions-v1';

const entry=(id,kind,pattern,ru,en,es,resume=true)=>Object.freeze({
  id,kind,pattern,resume,copy:Object.freeze({ru,en,es}),
});
const FAQ=Object.freeze([
 entry('bot_identity','faq',
  /(?:\b(?:are you|is this|am i talking to)\b.{0,35}\b(?:bot|ai|person|human|therapist|psychic|doctor|real)\b|(?:ты|вы|это).{0,25}(?:бот|ии|человек|психолог|врач|экстрасенс)|(?:eres|es esto).{0,25}(?:bot|ia|persona|terapeuta|vidente))/iu,
  ['Я Ali, цифровой помощник Holistic House, не врач и не психотерапевт.','Это беседа с AI-помощником Ali, не с живым специалистом.'],
  ["I'm Ali, the Holistic House digital assistant, not a doctor or therapist.","You're talking with Ali, an AI assistant, not a human practitioner."],
  ['Soy Ali, el asistente digital de Holistic House, no médico ni psicoterapeuta.','Hablas con Ali, un asistente digital, no con el profesional.']),
 entry('photo_energy','faq',
  /(?:\b(?:photo|picture|face)\s*(?:scan|reading|analysis)\b|\b(?:scan|read|analyse|analyze)\b.{0,25}\b(?:photo|picture|face|energy)\b|\b(?:check|chk)\s+my\s+energy\b|(?:диагностик|чтени|считыв|определ).{0,30}(?:по фото|по фотографии|энерг)|(?:провер|считай).{0,20}энерг|(?:leer|analizar|revisar).{0,25}(?:foto|energ[ií]a))/iu,
  ['По фото нельзя достоверно определить здоровье, «энергию» или причины событий. Для начала достаточно ваших слов.','Фото не требуется: по внешности нельзя надёжно оценить ваше состояние.'],
  ["A photo can't reliably reveal health, 'energy', or the causes of events. Your own description is enough.","A photo isn't needed; appearance doesn't reliably tell us what you're going through."],
  ['Una foto no revela de forma fiable la salud, la «energía» ni las causas de lo que ocurre. Basta con tu descripción.','No hace falta una foto: la apariencia no permite evaluar tu situación.']),
 entry('free_price','faq',
  /(?:\b(?:is (?:this|it) free|free of charge|how much (?:does it|is it|will it)|what(?:'s| is) the (?:price|cost)|does it cost)\b|(?:это|разбор|диагностика).{0,22}бесплатн|сколько стоит|нужно платить|(?:es|esto).{0,20}gratis|cu[aá]nto cuesta|hay que pagar|(?:quiero saber|qu[eé]|cu[aá]l es).{0,18}(?:precio|costo))/iu,
  ['Этот предварительный разбор бесплатный. Платная сессия — отдельное решение.','За эту беседу платить не нужно. Запись на консультацию не создаётся автоматически.'],
  ["This preliminary review is free. A paid session would be a separate choice.","There's no fee for this conversation. It doesn't book a paid session."],
  ['Esta revisión preliminar es gratuita. Una consulta de pago es aparte.','Esta conversación no tiene coste ni reserva una sesión de pago.']),
 entry('privacy','faq',
  /(?:\b(?:privacy|confidential|private|who (?:sees|can see|will see|reads|can read)|where.{0,22}(?:answers|data)|do you (?:save|store|share|record))\b|конфиденциал|кто увидит|кто читает|где хранят|куда идут (?:мои )?ответы|сохран.*данн|(?:privacidad|confidencial|qui[eé]n (?:ve|leer[aá])|d[oó]nde (?:guardan|van) mis datos))/iu,
  ['Ваши ответы остаются в защищённой беседе. Специалист увидит резюме только после вашего подтверждения.','Без отдельного согласия резюме мастеру не отправляется. Не присылайте здесь личные документы.'],
  ["Your answers stay in the protected conversation. Only the summary you approve is shared with the practitioner.","Nothing goes to the practitioner without your separate confirmation. Please don't send sensitive documents."],
  ['Tus respuestas quedan en una conversación protegida. Solo se envía al profesional el resumen que apruebes.','No se enviará nada sin tu confirmación. No compartas documentos sensibles aquí.']),
 entry('duration','faq',
  /(?:\b(?:how (?:long|many) (?:questions|minutes|steps)|how long (?:will|does) (?:this|it|the review)|will it take long)\b|сколько (?:вопросов|времени)|как долго (?:это|будет)|долго ли|cu[aá]nto (?:tiempo|dura)|cu[aá]ntas preguntas)/iu,
  ['Обычно достаточно нескольких вопросов. Можно пропустить любой и закончить раньше.','Темп выбираете вы. Длинную анкету проходить необязательно.'],
  ["It's a few short questions. You can skip any of them or finish early.","We can keep this brief and move at your pace."],
  ['Son unas preguntas breves. Puedes omitir cualquiera y terminar antes.','Podemos hacerlo con calma, sin una larga encuesta.']),
 entry('information_needed','faq',
  /(?:\b(?:what (?:information|details) (?:do|would) you (?:exactly )?need|what (?:information|details) would you exactly need|what do you need (?:from me|exactly)|what should i (?:write|tell|share))\b|(?:какую|какие|что) (?:информаци|данные|вопросы)|что (?:вам|мне) нужно (?:рассказать|написать|указать)|qu[eé] informaci[oó]n necesitas|qu[eé] (?:debo|tengo que) (?:contar|escribir))/iu,
  ['Достаточно рассказать, чего хотите, что мешает и что происходит сейчас. Остальное необязательно.','Начните с самого важного. Подробности можно добавить потом.'],
  ["Just tell me what you want, what's difficult, and what's happening now. The rest is optional.","Start with whatever feels most important; details can come later."],
  ['Basta con contar qué deseas, qué te dificulta y qué ocurre ahora. Lo demás es opcional.','Empieza por lo que más te importe. Los detalles pueden esperar.']),
 entry('what_is_diagnostic','faq',
  /(?:\b(?:what (?:is|does) (?:this|the) (?:diagnostic|diagnosis|review|assessment)|how does (?:this|the) (?:diagnostic|review|process) work|what happens (?:here|in this review))\b|что (?:это за|такое) (?:диагностика|разбор)|как (?:проходит|работает) (?:разбор|диагностика)|(?:c[oó]mo funciona|qu[eé] es) (?:la|esta)? ?(?:revisi[oó]n|evaluaci[oó]n))/iu,
  ['Мы коротко проясним ваш запрос и подготовим резюме для личного разбора. Это не медицинский диагноз.','Я уточню несколько моментов и покажу вам черновик. Только вы решаете, отправлять ли его мастеру.'],
  ["We'll clarify your situation and prepare a draft for personal review. This isn't a medical diagnosis.","I'll ask a few questions and show you a draft. You decide whether to send it."],
  ['Aclararemos tu situación y prepararemos un resumen. No es un diagnóstico médico.','Te haré algunas preguntas y te mostraré el borrador. Tú decides si enviarlo.']),
 entry('why_question','faq',
  /(?:\b(?:why (?:do you|are you) (?:need|asking|ask|want)|why this question|why is that important)\b|зачем (?:вы|ты) (?:спрашиваете|спрашиваешь)|почему (?:вы|ты) (?:спрашиваете|спрашиваешь)|зачем этот вопрос|por qu[eé] (?:preguntas|esa pregunta|necesitas saber))/iu,
  ['Этот вопрос помогает точнее передать ваш запрос. Его можно пропустить.','Мне важно не додумывать за вас. Если вопрос не подходит, пропустим.'],
  ["It helps me describe your request more accurately. You're free to skip it.","I don't want to guess what you mean. We can skip this if it doesn't fit."],
  ['Sirve para describir mejor tu solicitud. Puedes omitirlo.','Prefiero no suponer lo que piensas. Podemos saltarlo.']),
 entry('human_handoff','faq',
  /(?:\b(?:talk|speak|chat|connect)\s+(?:directly\s+)?(?:to|with)\s+(?:a\s+)?(?:human|person|real (?:person|therapist)|practitioner|andrey)\b|(?:хочу|можно|связаться).{0,35}(?:с человеком|с мастером|с андреем|к специалисту)|(?:hablar|contactar).{0,25}(?:persona|profesional|andrey))/iu,
  ['Можно подготовить краткую заявку для специалиста. Он ответит отдельно; я не могу обещать срок.','Если предпочитаете человека, можно закончить вопросы и проверить заявку для передачи.'],
  ["We can prepare a short request for the practitioner. A human will reply separately; I can't promise a timeframe.","You can finish the questions and review a request for a person to follow up."],
  ['Podemos preparar una solicitud para el profesional. Responderá aparte; no puedo prometer un plazo.','Puedes terminar las preguntas y revisar la solicitud para una persona.']),
 entry('response_time','faq',
  /(?:\b(?:when (?:will|can) (?:you|they|andrey) (?:reply|respond|contact)|how (?:soon|long) (?:until|before).{0,20}(?:answer|reply|response)|when (?:will|do) i hear back)\b|когда (?:мне|он|мастер|вы).{0,30}(?:ответ|напиш|свяж)|сколько ждать ответа|cu[aá]ndo (?:me )?(?:responder[aá]n|contactar[aá]n))/iu,
  ['Точное время ответа специалиста пока не подтверждено.','Заявка ещё не отправлена. После вашего согласия специалист сможет ответить в переписке.'],
  ["The practitioner's reply time hasn't been confirmed.","Your request hasn't been sent yet. After you approve it, a practitioner can reply in the conversation."],
  ['Aún no hay un plazo confirmado de respuesta.','La solicitud todavía no se ha enviado. Tras tu aprobación, el profesional podrá responder.']),
 entry('accuracy_guarantee','faq',
  /(?:\b(?:how accurate|is (?:this|it) accurate|can you guarantee|will (?:this|it) work|will you (?:solve|fix)|does it really work|any proof)\b|насколько (?:точно|достоверно)|(?:гарантиру|обеща).{0,25}(?:результат|поможет)|это (?:точно )?поможет|(?:qu[eé] tan preciso|puedes garantizar|funciona de verdad))/iu,
  ['Я не могу гарантировать выводы или результат. Это только предварительное прояснение вашего запроса.','Пока мы собираем ваш взгляд на ситуацию, а не устанавливаем её скрытые причины.'],
  ["I can't guarantee a result or a diagnosis. This is simply a preliminary clarification of your request.","We're recording your view of the situation, not claiming to uncover hidden causes."],
  ['No puedo garantizar un resultado ni un diagnóstico. Solo aclaramos la situación de forma preliminar.','Recogemos tu perspectiva, sin afirmar causas ocultas.']),
 entry('medical_diagnosis','faq',
  /(?:\b(?:can you diagnose|medical diagnosis|am i (?:depressed|mentally ill)|do i have (?:depression|anxiety|ptsd)|prescribe (?:medicine|medication))\b|(?:постав|определи).{0,25}диагноз|(?:у меня|это).{0,20}(?:депресси|птср|расстройств)|(?:puedes diagnosticar|tengo depresi[oó]n|diagn[oó]stico m[eé]dico))/iu,
  ['В этом чате я не ставлю диагнозы и не назначаю лечение. По вопросам здоровья нужен квалифицированный специалист.','Это предварительный разбор ситуации, не медицинская оценка.'],
  ["I can't diagnose or prescribe treatment here. Health concerns need a qualified professional.","This is a preliminary situation review, not a medical assessment."],
  ['Aquí no puedo diagnosticar ni prescribir tratamientos. Para cuestiones de salud consulta a un profesional cualificado.','Esto es una revisión preliminar, no una evaluación médica.']),
 entry('drawing','faq',
  /(?:\b(?:do i need to draw|should i draw|send (?:a|my) drawing|what (?:kind of )?drawing)\b|(?:нужно|надо|можно).{0,25}(?:рисунок|рисовать)|рисунок.{0,20}(?:отправить|нарисовать)|(?:tengo que dibujar|enviar un dibujo|qu[eé] dibujo))/iu,
  ['Рисунок «Я — цель — препятствие» необязателен. Если захотите, позже согласуем со специалистом защищённый способ передачи.','Начать можно без рисунка.'],
  ["The “Me — Goal — Obstacle” drawing is optional. A secure way to share it can be arranged later.","You can begin without a drawing."],
  ['El dibujo «Yo — Meta — Obstáculo» es opcional. Más adelante puede acordarse un modo seguro de compartirlo.','Puedes empezar sin dibujar.']),
 entry('form','faq',
  /(?:\b(?:do i need (?:a|to fill) (?:form|questionnaire)|send me a form|google form|can i just (?:talk|write))\b|(?:обязательн|нужно|надо).{0,25}(?:форм|анкет)|google.?форм|можно без анкеты|(?:necesito un formulario|tengo que rellenar|sin formulario))/iu,
  ['Длинная анкета не нужна: можно отвечать прямо здесь.','Вы можете просто написать, что важно, без отдельной формы.'],
  ["You don't need a long form. You can answer here in the conversation.","You can just write what's important to you, without another questionnaire."],
  ['No hace falta un formulario largo. Puedes responder aquí.','Puedes contar lo importante sin otra encuesta.']),
 entry('booking','faq',
  /(?:\b(?:does this book|am i booked|can i book a session|book an appointment|schedule (?:a )?session)\b|(?:уже|меня).{0,15}записал|как записаться|записать на приём|(?:ya tengo cita|reservar una sesi[oó]n|agendar una consulta))/iu,
  ['Конечно 🌿 Экспресс-сессия с Андреем — 30 минут, €50. Нажмите «🗓 Записаться к Андрею» здесь, в чате Ali.','Можно оформить заявку прямо в этом боте: нажмите «🗓 Записаться к Андрею».'],
  ['Of course 🌿 An express session with Andrey is 30 minutes, €50. Tap “🗓 Book with Andrey” in Ali’s chat.','You can request a session here in this bot: tap “🗓 Book with Andrey”.'],
  ['Claro 🌿 Una sesión exprés con Andrey dura 30 minutos y cuesta €50. Pulsa «🗓 Reservar con Andrey» aquí en el chat de Ali.','Puedes solicitar la consulta en este mismo bot: pulsa «🗓 Reservar con Andrey».'],false),
 entry('language','faq',
  /(?:\b(?:can (?:we|you) speak (?:russian|english|spanish)|do you speak (?:russian|english|spanish)|can i write in (?:russian|english|spanish))\b|можно (?:по-?русски|на русском|по-?английски)|(?:podemos hablar|hablas) (?:ruso|ingl[eé]s|espa[nñ]ol))/iu,
  ['Да, можно писать на русском или английском.','Можно продолжить на удобном языке.'],
  ["Yes, you can write in English or Russian.","We can continue in the language you're most comfortable with."],
  ['Sí, puedes escribir en español, inglés o ruso.','Podemos continuar en el idioma que prefieras.']),
 entry('next_step','faq',
  /(?:\b(?:what(?:'s| is) next|what happens next|what happens after (?:i|we) (?:finish|send)|what will i get after|what do you do with my answers)\b|что (?:будет|делать) дальше|что потом|что после (?:этого|разбора)|qu[eé] (?:pasa|sigue) despu[eé]s|cu[aá]l es el siguiente paso)/iu,
  ['Сначала покажу вам резюме для проверки. Передача специалисту — только с вашего согласия.','Когда закончим вопросы, вы сможете исправить текст и решить, отправлять ли его.'],
  ["First you'll see a draft summary. It goes to the practitioner only if you approve it.","After the questions, you can correct the text and decide whether to send it."],
  ['Primero verás un resumen para revisar. Solo se envía al profesional si lo apruebas.','Después de las preguntas podrás corregir el texto y decidir si enviarlo.']),
 entry('written_result','faq',
  /(?:\b(?:will (?:i|you) (?:get|receive|send) (?:a |the )?(?:report|results?|analysis|diagnosis)|is there a written report|what (?:report|result) do i get)\b|будет ли (?:отч[её]т|результат)|получу ли (?:отч[её]т|разбор|анализ)|что я получу|recibir[eé] un informe|qu[eé] resultado obtendr[eé])/iu,
  ['После беседы можно подготовить краткое резюме вашего запроса. Отдельный подробный отчёт здесь не обещается.','Вы увидите черновик из ваших слов и сможете решить, передавать ли его специалисту.'],
  ["You can review a short summary of your request. A separate detailed report isn't promised here.","You'll see a draft based on your words and decide whether to share it."],
  ['Podrás revisar un breve resumen de tu solicitud. No se promete un informe detallado aparte.','Verás un borrador con tus palabras y decidirás si compartirlo.']),
 entry('stop_anytime','faq',
  /(?:\b(?:can i (?:stop|leave|quit|end) (?:at any time|whenever i want)?|what if i want to stop|how (?:do i|can i) stop)\b|(?:можно|как) (?:остановить|прекратить|закончить) (?:в любой момент|разговор|беседу)?|(?:puedo parar|puedo terminar|c[oó]mo puedo parar))/iu,
  ['Да. Можно пропустить вопрос, закончить раньше или написать /stop.','Вы управляете темпом и можете остановить автоматическую беседу командой /stop.'],
  ["Yes. You can skip, finish early, or send /stop.","You control the pace. /stop ends automated processing."],
  ['Sí. Puedes omitir, terminar antes o escribir /stop.','Tú decides el ritmo. /stop detiene la conversación automática.']),
 entry('cannot_answer','faq',
  /(?:\b(?:what if i (?:can't|cannot|don'?t want to) answer|do i have to answer (?:everything|all)|can i skip (?:a |this )?question)\b|(?:могу|можно) (?:не отвечать|пропустить)|обязательно ли отвечать|если не знаю ответа|(?:puedo omitir|tengo que responder|si no s[eé] qu[eé] responder))/iu,
  ['Можно не отвечать. Нажмите «Пропустить вопрос» или скажите, что пока не знаете.','Здесь нет правильных ответов. Если вопрос не подходит, просто пропустите его.'],
  ["You don't have to answer. Choose “Skip question” or tell me you're unsure.","There are no right answers. You can simply skip anything that doesn't fit."],
  ['No tienes que responder. Pulsa «Omitir pregunta» o di que aún no lo sabes.','No hay respuestas correctas. Puedes saltar lo que no te encaje.']),
 entry('therapy_vs_review','faq',
  /(?:\b(?:is this (?:a |real )?(?:therapy|counseling|counselling|treatment)|is this a (?:psychological|medical) diagnosis|how is this different from therapy)\b|(?:это|вы).{0,22}(?:психотерапи|лечение)|чем отличается от терапии|(?:es (?:terapia|tratamiento)|es un diagn[oó]stico))/iu,
  ['Это только предварительное обсуждение запроса, не психотерапия и не лечение.','Я помогаю описать вашу ситуацию, а не провожу психологическое обследование.'],
  ["This is a preliminary conversation about your needs, not therapy or treatment.","I can help you describe your situation, not perform a clinical assessment."],
  ['Es una conversación preliminar, no psicoterapia ni tratamiento.','Te ayudo a describir tu situación, no a realizar una evaluación clínica.']),
 entry('source_testimonials','faq',
  /(?:\b(?:do you have (?:reviews|testimonials|references)|has this helped anyone|can i see (?:reviews|proof)|who else used this)\b|есть ли (?:отзывы|примеры|доказательства)|кому уже помогли|можно посмотреть отзывы|(?:hay testimonios|tienes rese[nñ]as|a qui[eé]n ayud[oó]))/iu,
  ['Я не буду выдумывать отзывы или результаты клиентов. Могу объяснить сам формат работы.','Я могу рассказать, как проходит разбор, но не буду обещать успех по чужим историям.'],
  ["I won't invent testimonials or client outcomes. I can explain how the review works.","I can describe the process, but can't promise results from someone else's experience."],
  ['No inventaré testimonios ni resultados de otras personas. Puedo explicar el proceso.','Puedo describir la revisión, sin prometer resultados basados en otros casos.']),
 entry('online_format','faq',
  /(?:\b(?:is (?:this|it) online|can (?:we|i) do this (?:online|remotely|by phone|in chat)|do i need to visit)\b|(?:можно|это).{0,20}(?:онлайн|удал[её]нно)|нужно ли приезжать|(?:es en l[ií]nea|puedo hacerlo online|tengo que ir))/iu,
  ['Эту предварительную беседу можно пройти прямо здесь в чате. Формат личной консультации обсуждается отдельно.','Для ответов в этом чате приезжать не нужно.'],
  ["You can complete this preliminary review here in chat. A personal session's format is arranged separately.","There's no need to travel to answer these questions here."],
  ['Puedes hacer esta revisión en el chat. El formato de una consulta personal se acuerda aparte.','No hace falta desplazarte para responder aquí.']),
 entry('advice_now','faq',
  /(?:\b(?:can you (?:give me advice|tell me what to do|solve (?:my|this) problem)|what (?:should|must) i do (?:now|instead)|give me a solution)\b|(?:что мне делать|дай совет|подскажи решение|реши мою проблему)|(?:qu[eé] debo hacer|dame un consejo|dame una soluci[oó]n))/iu,
  ['Могу помочь прояснить варианты, но не хочу советовать, не разобравшись в ситуации.','Пока мы уточняем ваш запрос. Готовое решение я не буду придумывать на основе пары фраз.'],
  ["I can help clarify options, but I don't want to give advice without understanding your situation.","For now we're clarifying the request. I won't invent a solution from just a couple of sentences."],
  ['Puedo ayudarte a aclarar opciones, pero no quiero aconsejarte sin comprender la situación.','Primero aclaramos la consulta. No inventaré una solución con solo unas frases.']),
]);
const COMMENTS=Object.freeze([
 entry('gratitude','comment',/^(?:thanks?(?: a lot)?|thank you(?: so much)?|спасибо(?: большое)?|благодарю|gracias(?: muchas)?)\s*[!.🙏]*$/iu,
  ['Пожалуйста.','Рад помочь.'],["You're welcome.","Glad to help."],['De nada.','Con gusto.']),
 entry('short_ack','comment',/^(?:ok(?:ay)?|got it|understood|ага|понятно|ясно|ладно|хорошо|vale|entendido|de acuerdo|claro)\s*[!.]*$/iu,
  ['Хорошо.','Продолжим в вашем темпе.'],["Okay.","We can go at your pace."],['De acuerdo.','Seguimos a tu ritmo.']),
 entry('no_share','boundary',
  /(?:\b(?:i (?:don't|do not) want to (?:share|tell|say)|too private|not comfortable sharing|rather not share|don't ask personal questions)\b|не хочу (?:рассказывать|делиться|отвечать о личном)|слишком личн|не готов[а]? делиться|(?:no quiero compartir|es privado|prefiero no contar))/iu,
  ['Не нужно рассказывать больше, чем вам комфортно. Можно пропустить вопрос или завершить здесь.','Ваши границы важнее заполненной анкеты. Можно оставить этот пункт пустым.'],
  ["You don't need to share more than you're comfortable with. You can skip or finish here.","Your boundaries matter more than filling every field. This can stay unanswered."],
  ['No tienes que contar más de lo que desees. Puedes omitir la pregunta o terminar aquí.','Tus límites importan más que completar todos los campos.'],false),
 entry('embarrassed','comment',
  /(?:\b(?:i (?:feel|am) (?:ashamed|embarrassed)|i'm ashamed|it's embarrassing)\b|мне стыдно|стыжусь|неловко рассказывать|me da verg[uü]enza|me siento avergonzad)/iu,
  ['Можно говорить только о том, чем готовы поделиться.','Спасибо, что сказали об этом. Здесь не нужно себя оправдывать.'],
  ["You can share only what feels comfortable.","Thank you for saying that. You don't need to justify yourself here."],
  ['Puedes compartir solo lo que te resulte cómodo.','Gracias por decirlo. No tienes que justificarte aquí.']),
 entry('fear_judgment','comment',
  /(?:\b(?:afraid (?:you|someone|people) will judge|fear of being judged|you(?:'re| are) judging me)\b|боюсь осуждени|меня осудят|вы меня осуждаете|temo que me juzguen|me est[aá]s juzgando)/iu,
  ['Я не буду оценивать вас. Можете отвечать настолько кратко, насколько хотите.','Понимаю, почему хочется осторожности. Никаких подробностей без вашего желания.'],
  ["I'm not here to judge you. A short answer is enough.","It's okay to be cautious. You don't have to go into personal detail."],
  ['No estoy aquí para juzgarte. Basta con una respuesta breve.','Es comprensible querer ir con cautela. No hace falta entrar en detalles.']),
 entry('sadness','comment',
  /^(?:i(?:\s+(?:feel|am)|['’]m) (?:so )?(?:sad|down|lonely)|мне грустно|мне одиноко|грустно|тоскливо|me siento triste|estoy triste|me siento sol[oa])[.!…\s]*$/iu,
  ['Слышу, что сейчас грустно. Можно начать с самого важного.','Спасибо, что сказали. Необязательно сразу находить решение.'],
  ["You said you're feeling sad. We can start with whatever matters most.","Thank you for telling me. You don't have to find a solution right away."],
  ['Dices que te sientes triste. Podemos empezar por lo que más te importe.','Gracias por decirlo. No hace falta encontrar una solución ahora.']),
 entry('fear','comment',
  /^(?:i(?:\s+(?:feel|am)|['’]m) (?:very |really )?(?:scared|afraid|nervous|anxious)|мне страшно|я боюсь|мне тревожно|боюсь|estoy asustad[oa]|tengo miedo|estoy nervios[oa])[.!…\s]*$/iu,
  ['Спасибо, что сказали. Можно двигаться медленно.','Не будем торопиться. Достаточно нескольких слов.'],
  ["Thank you for telling me. We can take it slowly.","No need to rush. A few words is enough."],
  ['Gracias por decirlo. Podemos ir poco a poco.','No hace falta apresurarse. Bastan unas palabras.']),
 entry('anger','comment',
  /^(?:i(?:\s+(?:feel|am)|['’]m) (?:so )?(?:angry|furious|frustrated)|я злюсь|я в ярости|меня всё бесит|я раздражен[а]?|estoy enfadad[oa]|estoy frustrad[oa])[!.\s]*$/iu,
  ['Слышу, что вы злитесь. Можно описать ситуацию без лишних деталей.','Спасибо, что сказали прямо.'],
  ["You said you're angry. You can describe the situation without going into detail.","Thanks for saying it plainly."],
  ['Dices que estás enfadado. Puedes contar la situación sin muchos detalles.','Gracias por decirlo con claridad.']),
 entry('overwhelm','comment',
  /(?:\b(?:i(?:\s+(?:feel|am)|['’]m) (?:overwhelmed|exhausted|burned out)|it's too much|i can't think straight)\b|я перегружен[а]?|меня переполняет|всё навалилось|не могу собраться|estoy abrumad[oa]|es demasiado para m[ií])/iu,
  ['Похоже, всего сейчас слишком много. Необязательно разбираться во всём сразу.','Можно начать с одной части ситуации.'],
  ["It sounds like a lot at once. You don't need to sort it all out now.","We can start with just one part of the situation."],
  ['Parece que son demasiadas cosas a la vez. No necesitas resolverlo todo ahora.','Podemos empezar por una sola parte de la situación.']),
 entry('uncertain_trust','comment',
  /(?:\b(?:i (?:don't|do not) trust (?:you|this)|is this a scam|sounds fake|i'?m skeptical|not sure i can trust)\b|не доверяю|я не верю(?: вам| этому| в это)?|не верю (?:вам|боту|ИИ|этому)|это обман|похоже на развод|я скептически отношусь|no conf[ií]o|parece una estafa|soy esc[eé]ptic[oa])/iu,
  ['Сомневаться нормально. Я могу объяснить, как устроена беседа, без обещаний результата.','Вам не нужно верить на слово или продолжать, если не хотите.'],
  ["It's reasonable to be skeptical. I can explain the process without promising results.","You don't have to take anything on faith or continue unless you want to."],
  ['Es razonable tener dudas. Puedo explicar el proceso sin prometer resultados.','No tienes que confiar ciegamente ni seguir si no quieres.']),
 entry('robotic','comment',
  /(?:\b(?:you(?:'re| are) (?:a )?robot|this sounds (?:robotic|scripted)|stop repeating|you keep asking|too many questions)\b|как робот|слишком шаблонно|хватит повторять|ты повторяешь|слишком много вопросов|suenas como robot|repites lo mismo|demasiadas preguntas)/iu,
  ['Спасибо, что заметили. Буду короче и не стану повторять вопрос.','Понял. Можно отвечать свободно, без формального опроса.'],
  ["Thanks for pointing that out. I'll keep this brief and avoid repeating myself.","Understood. You can answer freely; this doesn't have to feel like a form."],
  ['Gracias por decirlo. Seré más breve y evitaré repetir preguntas.','Entiendo. Puedes responder libremente, sin un cuestionario rígido.'],false),
 entry('misunderstood','comment',
  /(?:\b(?:you (?:don't|do not) understand|that's not what i meant|you got it wrong|not what i said)\b|вы меня не поняли|ты меня не понял|я не это (?:имел[а]? в виду|говорил[а]?)|неверно поняли|no me entendiste|eso no quise decir)/iu,
  ['Похоже, я понял не так. Что именно нужно поправить?','Спасибо, что уточнили. Что я упустил?'],
  ["I may have misunderstood. What should I correct?","Thanks for telling me. What did I miss?"],
  ['Puede que no te haya entendido bien. ¿Qué debo corregir?','Gracias por aclararlo. ¿Qué se me escapó?'],false),
 entry('need_time','boundary',
  /^(?:i need (?:more )?time|let me think|i(?:'ll| will) think about it|not right now|мне нужно подумать|я подумаю|не сейчас|дайте время|necesito tiempo|lo pensar[eé]|ahora no)[!.\s]*$/iu,
  ['Конечно. Можно продолжить позже, без спешки.','Хорошо. Беседу необязательно завершать сейчас.'],
  ["Of course. You can come back to this later.","That's fine. You don't have to finish today."],
  ['Claro. Puedes volver más tarde, sin prisa.','Está bien. No tienes que terminar hoy.'],false),
 entry('hopelessness','comment',
  /(?:\b(?:nothing (?:ever )?works|i've tried everything|i(?:'m| am) failing at (?:everything|life)|feel like a failure)\b|ничего не помогает|я неудачник|у меня ничего не получается|всё бесполезно|nada funciona|he probado todo|me siento un fracaso)/iu,
  ['Звучит так, будто усилий было много, а результата мало. Не буду делать выводов за вас.','Спасибо, что сказали. Можно начать с того, что сейчас тяжелее всего.'],
  ["It sounds like you've put in a lot of effort without much relief. I won't assume why.","Thanks for sharing that. We can start with what's hardest right now."],
  ['Parece que has intentado mucho sin conseguir el alivio esperado. No sacaré conclusiones por ti.','Gracias por contarlo. Podemos empezar por lo que pesa más ahora.']),
 entry('hopeful','comment',
  /^(?:i(?:\s+(?:feel|am)|['’]m) (?:hopeful|excited|optimistic)|я надеюсь|я полон надежд|хочется верить|tengo esperanza|me siento optimista)[!.\s]*$/iu,
  ['Хорошо, что вы видите возможность перемен.','Спасибо. Давайте сохраним этот ориентир.'],
  ["It's good that you can see room for change.","Thanks for saying that. We can keep that hope in view."],
  ['Es bueno que veas la posibilidad de un cambio.','Gracias. Podemos tener esa esperanza presente.']),
 entry('confused_question','comment',
  /(?:\b(?:i (?:don't|do not) understand (?:your|the|this) question|i'?m confused by the question|what do you mean by that question)\b|не понимаю (?:вопрос|что вы имеете в виду)|вопрос непонятен|непонятно,? что вы спрашиваете|no entiendo (?:la pregunta|qu[eé] me preguntas))/iu,
  ['Поясню проще: можно ответить так, как вам удобно.','Возможно, я спросил слишком сложно. Давайте сформулируем иначе.'],
  ["Let me put it more simply. You can answer in your own words.","I may have phrased that awkwardly. We can make it simpler."],
  ['Lo diré de forma más sencilla. Puedes responder con tus palabras.','Quizá lo pregunté de forma complicada. Podemos simplificarlo.']),
 entry('no_sales','boundary',
  /(?:\b(?:don't (?:sell|upsell|pitch|pressure) me|stop trying to sell|i(?:'m| am) not buying anything|no (?:more )?sales please)\b|не надо ничего продавать|не предлагайте платные услуги|не уговаривайте|без продаж|no quiero que me vendas|no me presiones para pagar)/iu,
  ['Не буду предлагать платные услуги. Можем ограничиться бесплатным разбором.','Понял. Здесь не требуется ничего покупать.'],
  ["I won't pitch paid services. We can keep this to the free review.","Understood. You don't have to buy anything here."],
  ['No te ofreceré servicios de pago. Podemos limitarnos a la revisión gratuita.','Entendido. No tienes que comprar nada aquí.'],false),
 entry('short_refusal','comment',
  /^(?:no|nope|nah|нет|неа|не хочу|no gracias)[!.\s]*$/iu,
  ['Хорошо. Можно пропустить этот вопрос.','Понял. Необязательно отвечать на каждый вопрос.'],
  ["Okay. We can skip this question.","Understood. You don't need to answer every question."],
  ['Está bien. Podemos omitir esta pregunta.','Entiendo. No tienes que responder a todo.'],false),
 entry('uncertain_help','comment',
  /(?:\b(?:not sure (?:this|it) will help|i (?:don't|do not) think this helps|this isn'?t helping me|this is not helping me|is this even useful)\b|не думаю, что это поможет|не вижу смысла|это не помогает|зачем мы это делаем|no creo que esto ayude|esto no me ayuda)/iu,
  ['Понимаю сомнение. Продолжать необязательно; можно остановиться или проверить уже сказанное.','Если вопросов достаточно, можем закончить и не углубляться.'],
  ["It's okay to question whether this helps. You can stop or review what you've already said.","We don't have to keep going if this doesn't feel useful."],
  ['Es válido dudar de que esto ayude. Puedes parar o revisar lo que ya has dicho.','No hace falta continuar si esto no te sirve.'],false),
]);
export const ALI_FREE_REACTION_COUNTS=Object.freeze({faq:FAQ.length,comment:COMMENTS.length});

/** Match only bounded, explicitly user-authored text. Keep strict priority
 * (FAQ before commentary) and never interpret rich multi-field answers.
 */
export function classifyAliFreeReaction(message,{goalLike=false}={}){
 if(typeof message!=='string'||message.length>1200)return null;
 const raw=message.trim().replace(/[’‘]/gu,"'");
 if(!raw||raw.startsWith('/')||raw.includes('\n'))return null;
 for(const candidate of FAQ){
   if(candidate.pattern.test(raw))return candidate;
 }
 // Explicit boundaries such as "I don't want to share" take priority even
 // if they contain lexical phrases like "want to".
 for(const candidate of COMMENTS)
   if(candidate.kind==='boundary'&&candidate.pattern.test(raw))return candidate;
 // A clearly stated goal or longer account is primarily an interview answer,
 // even when it also mentions emotion. Never turn feelings into a diagnosis.
 if(goalLike||raw.length>240)return null;
 for(const candidate of COMMENTS){
   if(candidate.pattern.test(raw))return candidate;
 }
 return null;
}
/** At most two verified variants per locale; avoid repeating recent copy. */
export function planAliFreeReaction({message='',locale='ru',turns=[],goalLike=false}={}){
 const found=classifyAliFreeReaction(message,{goalLike});
 if(!found)return null;
 const lang=['ru','en','es'].includes(locale)?locale:'en';
 const opts=found.copy[lang];
 const recent=(Array.isArray(turns)?turns:[])
   .filter(t=>t?.role==='assistant'&&typeof t.text==='string')
   .slice(-8).map(t=>t.text);
 const reply=opts.find(choice=>!recent.some(prior=>prior.includes(choice)))||
   // If both variants were used, choose the least recently used one,
   // instead of mechanically repeating the immediately preceding sentence.
   opts.reduce((best,choice)=>{
     const last=recent.findLastIndex(prior=>prior.includes(choice));
     const bestLast=recent.findLastIndex(prior=>prior.includes(best));
     return last<bestLast?choice:best;
   },opts[0]);
 return {id:found.id,kind:found.kind,resume:found.resume,
   reply,stageConsumed:false,modelUsed:false};
}
