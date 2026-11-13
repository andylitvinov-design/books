/**
 * Holistic House conversational dictionary v2. No paid model or provider.
 * Pure deterministic editorial responses: no network, storage, diagnosis,
 * booking, video export, or user profile access. Backend calls only after
 * verified origin + authentication + rate limiting + safety preflight.
 */
import {matchVideoRuleV3,videoRuleAnswerV3} from "./rule-video-v3.mjs";
import {matchSupportRuleV3,supportRuleAnswerV3} from "./rule-support-v3.mjs";
import {interpretDialogueCoherence} from "./dialogue-coherence.mjs";
import {understandConversationTurn} from "./conversation-intelligence.mjs";
import {classifyClientConcern} from "./client-complaint-mind.mjs";
export const RULE_CONVERSATION_VERSION="hh-rule-conversation-v3";
const utterances={
  "coherent_ambiguous": [
    "Я услышал оба варианта. С какого начнём: видео или медитации?",
    "I heard both options. Which should we start with: a video or a meditation?",
    "Entendí ambas opciones. ¿Por cuál empezamos: vídeo o meditación?"
  ],
  "coherent_reject_video": [
    "Понял, видео сейчас не подходит. Предпочтёте медитацию или другую задачу?",
    "Understood, video isn't the right fit. Would you prefer a meditation or another task?",
    "Entiendo que el vídeo no encaja. ¿Prefieres una meditación u otra tarea?"
  ],
  "coherent_reject_meditation": [
    "Понял, медитация сейчас не подходит. Лучше обсудить видео или другой вопрос?",
    "Understood, a meditation isn't right for now. Would a video or another question be better?",
    "Entiendo que la meditación no encaja. ¿Mejor un vídeo u otra pregunta?"
  ],
  "coherent_topic": [
    "Спасибо за уточнение: предыдущую тему не используем. Что для вас важнее в новой теме?",
    "Thanks for clarifying. We'll set aside the previous topic. What matters most in the new one?",
    "Gracias por aclararlo. Dejamos el tema anterior. ¿Qué importa más en el nuevo?"
  ],
  "hello": [
    "Я здесь 🙂 Чем помочь — с видео, медитацией или другой задачей?",
    "I'm here 🙂 Shall we explore a video, a meditation, or something else?",
    "¡Aquí estoy! 🙂 ¿Quieres hablar de un vídeo, meditación u otra cosa?"
  ],
  "thanks": [
    "Рад помочь. Если захотите продолжить, просто напишите.",
    "Glad to help. Message me whenever you're ready.",
    "Me alegra ayudar. Escríbeme cuando quieras seguir."
  ],
  "bye": [
    "Хорошо, остановимся здесь. До встречи!",
    "All right, we'll stop here. See you!",
    "De acuerdo, paramos aquí. ¡Hasta luego!"
  ],
  "restart": [
    "Начнём заново. Хотите создать видео или подобрать медитацию?",
    "Let's start fresh. Would you like a video or a meditation?",
    "Empecemos de nuevo. ¿Vídeo o meditación?"
  ],
  "yes": [
    "Отлично. Что выбираем дальше: видео, медитацию или практику?",
    "Great. A video, a meditation, or another practice?",
    "Perfecto. ¿Vídeo, meditación u otra práctica?"
  ],
  "no": [
    "Понял, не будем настаивать. Что вам больше подходит?",
    "No pressure. What would you prefer instead?",
    "Sin presión. ¿Qué prefieres en su lugar?"
  ],
  "confused": [
    "Похоже, я не совсем вас понял. Можете иначе описать желаемый результат?",
    "I may have missed your point. Could you describe the result you want?",
    "Quizá no entendí bien. ¿Qué resultado deseas?"
  ],
  "uncertain": [
    "Можно начать с простого: хочется создать видео или найти поддержку для текущего состояния?",
    "Let's start simply. Would a video or support for how you feel be more useful?",
    "Empecemos por algo sencillo. ¿Vídeo o apoyo para tu estado actual?"
  ],
  "identity": [
    "Я цифровой AI-проводник Holistic House, не человек и не психотерапевт. Могу помочь с выбором возможностей сайта.",
    "I'm Holistic House's digital guide, not a human or therapist. I can help you explore the site's options.",
    "Soy la guía digital de Holistic House, no una persona ni terapeuta. Puedo mostrarte las opciones del sitio."
  ],
  "capabilities": [
    "Помогу продумать видео, подобрать медитацию, практику, курс или тест и найти информацию об услугах. С чего начнём?",
    "I can help shape a video, explore meditations, practices, courses, tests, or services. Where shall we start?",
    "Puedo ayudarte con vídeos, meditaciones, prácticas, cursos, pruebas y servicios. ¿Por dónde empezamos?"
  ],
  "language": [
    "Можете писать по-русски, по-английски или по-испански. Я постараюсь отвечать на языке вашего сообщения.",
    "You can write in Russian, English, or Spanish. I'll try to reply in your language.",
    "Puedes escribirme en ruso, inglés o español. Intentaré responder en tu idioma."
  ],
  "price": [
    "Цена зависит от конкретной услуги. Проверьте её в карточке: сообщение в чате не оформляет оплату.",
    "The price depends on the specific service listing. Sending a chat message doesn't place a payment.",
    "El precio depende de cada servicio. Un mensaje no realiza ningún pago."
  ],
  "privacy": [
    "Личные результаты и история доступны через защищённый кабинет и отдельное согласие. Сообщение не означает разрешения делиться ими.",
    "Private results and history require protected sign-in and specific consent. A chat message doesn't authorize sharing them.",
    "Los resultados privados requieren acceso seguro y consentimiento. Un mensaje no autoriza compartirlos."
  ],
  "login": [
    "Чтобы увидеть личные заказы или результаты, войдите в кабинет. Общие вопросы можем обсудить здесь.",
    "Sign in to the cabinet for your private orders or results. We can discuss general questions here.",
    "Inicia sesión para ver pedidos y resultados privados. Podemos hablar aquí de preguntas generales."
  ],
  "human_help": [
    "Если нужен живой специалист, откройте раздел «Мастер» и выберите услугу или практика. Я не заменяю консультацию.",
    "For human support, explore the Master section. I'm not a substitute for a consultation.",
    "Para hablar con alguien, abre la sección Master. No sustituyo una consulta profesional."
  ],
  "technical": [
    "Если сообщение не отправилось или экран завис, попробуйте ещё раз. На каком шаге возникает ошибка?",
    "If the page or reply fails, try once more. Which step is causing the problem?",
    "Si la página o respuesta falla, inténtalo de nuevo. ¿En qué paso ocurre?"
  ],
  "video_definition": [
    "Видео в нашем формате объединяет цель, образы, ритм и звук как визуальную практику; это не медицинская терапия.",
    "This video format combines a goal, imagery, rhythm and sound as a visual practice—not medical treatment.",
    "Este formato combina objetivo, imágenes, ritmo y sonido como práctica visual, no como tratamiento médico."
  ],
  "video_start": [
    "С удовольствием! Для какой цели создаём видео и какое чувство оно должно оставить после просмотра?",
    "Happy to help! What's the video's purpose, and how should viewers feel afterward?",
    "¡Claro! ¿Cuál es el objetivo del vídeo y qué sensación debe dejar?"
  ],
  "video_both": [
    "Можно рассмотреть оба направления. Что сейчас ближе: смотреть образы или слушать голосовую практику?",
    "Both could help. Would you rather watch imagery or listen to guidance?",
    "Podemos explorar ambos. ¿Prefieres ver imágenes o escuchar una voz?"
  ],
  "video_story": [
    "Историю строим последовательно: тема → смысловая ось → мотив → сценарий → сцены и теги. Какую идею хотите передать?",
    "A coherent story connects topic → meaning axis → motive → script → tagged scenes. What's your core idea?",
    "Una historia conecta tema → eje de significado → motivo → guion → escenas. ¿Cuál es tu idea?"
  ],
  "video_scenes": [
    "Кадры подбираем по смыслу сцен, а не только по красоте. Какая тема и длительность ролика?",
    "Footage should match each scene's meaning, not just its beauty. What's the topic and length?",
    "Las imágenes deben corresponder al sentido de las escenas. ¿Qué tema y duración buscas?"
  ],
  "video_audio": [
    "Музыку, голос и текст на экране можно выбирать отдельно. Что предпочитаете: музыку, озвучку или тишину?",
    "Music, voice and on-screen text are separate choices. Would you prefer music, narration, or silence?",
    "Música, voz y texto se eligen por separado. ¿Qué prefieres?"
  ],
  "video_length": [
    "Длительность выбираем под цель: короткий настрой или более подробная практика. Сколько минут комфортно?",
    "Length depends on the goal: a quick reset or longer practice. How many minutes would suit you?",
    "La duración depende del objetivo. ¿Cuántos minutos te vienen bien?"
  ],
  "video_status": [
    "Статус конкретного рендеринга здесь не подтверждён. Проверьте «Мои заказы»: готово лишь после фактической генерации.",
    "I can't confirm a specific render's status here. Check My orders; completion requires actual rendering.",
    "No puedo confirmar el estado del render aquí. Consulta Mis pedidos; debe terminar la generación."
  ],
  "video_delivery": [
    "Отправка в Telegram требует готового видео и подтверждённого подключённого чата. Этим ответом файл не отправлен.",
    "Telegram delivery requires a finished video and a confirmed connected chat. I haven't sent a file here.",
    "Enviar a Telegram requiere vídeo terminado y chat conectado y confirmado. No he enviado ningún archivo."
  ],
  "video_download": [
    "Скачать можно только готовый доступный ролик. Проверьте файл в «Моих заказах».",
    "Only a finished, available video can be downloaded. Check My orders.",
    "Solo puedes descargar un vídeo terminado y disponible. Mira Mis pedidos."
  ],
  "video_topic": [
    "Понял тему видео. Какое состояние хочется передать: спокойствие, тепло, уверенность или другое?",
    "Got the video topic. Should it evoke calm, warmth, confidence, or something else?",
    "Entiendo el tema. ¿Quieres transmitir calma, cariño, confianza u otra emoción?"
  ],
  "video_context": [
    "Продолжим планировать видео. Уже есть тема или сначала найдём смысловую ось и подходящий мотив?",
    "Let's continue the video plan. Do you have a theme, or shall we choose a meaning axis and motive?",
    "Sigamos con el vídeo. ¿Tienes tema o empezamos por el eje de sentido y el motivo?"
  ],
  "meditation_context": [
    "Продолжим подбор медитации. Сейчас важнее мягко успокоиться, почувствовать опору или вернуть силы?",
    "Let's continue choosing a meditation. Is calm, grounding, or restoring energy most important?",
    "Sigamos eligiendo la meditación. ¿Buscas calma, apoyo o recuperar energía?"
  ],
  "video_emotion": [
    "Понял эмоциональное направление. Какие образы вы хотите видеть: природу, свет, воду или что-то другое?",
    "That gives us the emotional direction. Do you picture nature, light, water, or something else?",
    "Tenemos la dirección emocional. ¿Prefieres naturaleza, luz, agua u otras imágenes?"
  ],
  "meditation_emotion": [
    "Понял желаемое состояние. Уточним длительность — сколько минут вам удобно для медитации?",
    "I understand the feeling you're aiming for. How many minutes would suit your meditation?",
    "Entiendo la sensación buscada. ¿Cuántos minutos te vienen bien para meditar?"
  ],
  "video_minutes": [
    "Ориентир по длительности есть. О чём будет видео и какое настроение оно создаёт?",
    "We have a target length. What's the video about and what mood should it create?",
    "Ya tenemos la duración. ¿De qué trata el vídeo y qué emoción debe crear?"
  ],
  "meditation_start": [
    "Подберём медитацию бережно. Как вы чувствуете себя сейчас и каким хотите чувствовать себя после неё?",
    "Let's choose a meditation. How do you feel now, and how would you like to feel afterward?",
    "Busquemos una meditación. ¿Cómo te sientes y cómo te gustaría sentirte después?"
  ],
  "meditation_custom": [
    "Для личной медитации важны цель, состояние «сейчас → хочу», длительность и голос. С какой цели начнём?",
    "A personal meditation starts with a goal, current and desired state, duration, and voice. What's your priority?",
    "Una meditación personal parte de objetivo, estado actual y deseado, duración y voz. ¿Qué priorizamos?"
  ],
  "meditation_voice": [
    "Голос, музыку и тишину можно рассмотреть отдельно, если записи доступны. Какой формат вам приятнее?",
    "Depending on what's available, we can explore voice, music, or quiet. Which feels best?",
    "Según los audios disponibles, podemos explorar voz, música o silencio. ¿Qué prefieres?"
  ],
  "meditation_duration": [
    "Можно выбрать короткую или более продолжительную практику. Сколько минут у вас есть?",
    "We can explore a brief or longer practice. How many minutes do you have?",
    "Podemos elegir una práctica breve o larga. ¿Cuántos minutos tienes?"
  ],
  "meditation_listen": [
    "Чтобы слушать готовую запись, откройте библиотеку медитаций. Какую тему хотите выбрать?",
    "To play a recording, open the meditation library. What topic would you like?",
    "Para escuchar una grabación, abre la biblioteca de meditaciones. ¿Qué tema buscas?"
  ],
  "meditation_minutes": [
    "Хорошо, время обозначили. Цель — успокоиться, восстановиться или подготовиться ко сну?",
    "We have a time frame. Is your goal calm, recovery, or winding down for sleep?",
    "Ya tenemos la duración. ¿Buscas calma, recuperación o dormir?"
  ],
  "meditation_state": [
    "Понял нынешнее состояние. К какому состоянию вы хотели бы прийти после медитации?",
    "Thanks, that helps. What would you like to feel after the meditation?",
    "Gracias, eso ayuda. ¿Cómo te gustaría sentirte después de meditar?"
  ],
  "stress": [
    "Похоже, напряжение заметное. Можем подобрать мягкую поддержку. Вам важнее спокойствие или восстановление сил?",
    "That sounds tense. We can explore gentle support. Is calm or restoring energy the priority?",
    "Parece que hay tensión. ¿Priorizamos calma o recuperar energía?"
  ],
  "sleep": [
    "Для вечера может подойти мягкая практика без усилий. Вы хотите заснуть или просто расслабиться?",
    "A gentle bedtime practice might fit. Are you trying to sleep or simply unwind?",
    "Una práctica suave puede acompañarte al final del día. ¿Dormir o relajarte?"
  ],
  "tired": [
    "Когда мало сил, нет необходимости в сложной практике. Выберем короткую паузу или восстановительную медитацию?",
    "When energy is low, a small pause may be enough. A short break or restorative meditation?",
    "Con poca energía, una pausa puede ser suficiente. ¿Descanso breve o meditación?"
  ],
  "relationship": [
    "Давайте разберёмся. Сейчас важнее близость, ясность в отношениях или поддержка после конфликта?",
    "Let's explore that. Is closeness, clarity, or support after conflict more important?",
    "Veamos eso. ¿Es más importante la cercanía, claridad o apoyo tras un conflicto?"
  ],
  "confidence": [
    "Можно начать с маленького шага к опоре. В каких ситуациях вам особенно нужна уверенность?",
    "We can start with a small step toward self-support. When do you most need confidence?",
    "Podemos empezar con un paso pequeño. ¿Cuándo necesitas más confianza?"
  ],
  "work": [
    "Понял, вопрос касается работы. Важнее цель, энергия для действий или отношения с людьми?",
    "This is about work. Is the priority a goal, energy for action, or people?",
    "Entiendo que se trata del trabajo. ¿Objetivo, energía o relaciones?"
  ],
  "purpose": [
    "Найдём ориентир. Вы ещё ищете свою цель или уже знаете её, но трудно двигаться?",
    "Let's find a direction. Are you discovering your goal or struggling to pursue one?",
    "Busquemos una dirección. ¿Descubres tu meta o te cuesta avanzar hacia ella?"
  ],
  "practice": [
    "Подберём мягкую практику. Вам сейчас нужнее спокойствие, энергия или сосредоточенность?",
    "Let's choose a gentle practice. Do you need calm, energy, or focus?",
    "Elijamos una práctica suave. ¿Buscas calma, energía o concentración?"
  ],
  "ritual": [
    "Можно выбрать простой символический ритуал с добровольным участием и ясными границами. Для завершения или нового начала?",
    "We can explore a simple symbolic ritual with consent and clear boundaries. For closure or a new beginning?",
    "Podemos explorar un ritual simbólico con consentimiento y límites claros. ¿Cerrar o empezar una etapa?"
  ],
  "reiki": [
    "Рейки здесь — добровольная практика и обучение, не лечение. Хотите познакомиться с основами или выбрать курс?",
    "Here Reiki is optional practice and learning, not treatment. The basics or a course?",
    "Aquí Reiki es práctica y aprendizaje opcional, no tratamiento. ¿Bases o curso?"
  ],
  "course": [
    "Помогу выбрать учебный маршрут. Вас интересует восстановление, развитие навыков или Рейки?",
    "Let's choose a learning path. Are you interested in recovery, skills, or Reiki?",
    "Elijamos una ruta de aprendizaje. ¿Recuperación, habilidades o Reiki?"
  ],
  "test": [
    "Тесты помогают самонаблюдению, но не ставят диагноз. Что хотите исследовать — стресс, отношения, уверенность?",
    "Questionnaires support reflection but aren't diagnoses. Stress, relationships, or confidence?",
    "Los cuestionarios ayudan a reflexionar sin diagnosticar. ¿Estrés, relaciones o confianza?"
  ],
  "results": [
    "Для толкования результата нужно название теста и шкала. Какой тест обсудим? Без согласия личные баллы не читаю.",
    "Interpreting a result needs a test name and scale. Which test? I won't read private scores without consent.",
    "Para interpretar necesito el nombre y la escala. ¿Qué prueba? No leo datos privados sin permiso."
  ],
  "analysis": [
    "Для подробного разбора есть бесплатная форма анализа ситуации. Хотите сначала описать запрос здесь?",
    "There's a free written situation-review form. Would you like to outline the question here first?",
    "Hay un formulario gratuito para revisar situaciones. ¿Quieres describir primero tu caso?"
  ],
  "orders": [
    "Статусы заказов и переписка с мастерами — во вкладке «Мои заказы». Я не подтверждаю статус конкретного заказа по сообщению.",
    "Orders and practitioner messages are under My orders. I can't verify an order's status from a message alone.",
    "Los pedidos y mensajes están en Mis pedidos. No puedo verificar un estado desde un mensaje."
  ],
  "booking": [
    "Запись подтверждается через выбранного специалиста или услугу. Я могу помочь с выбором, но не создал бронирование.",
    "A booking must be confirmed through a practitioner or service. I can guide you, but haven't booked.",
    "La reserva se confirma a través del profesional o servicio. Puedo orientar, pero no he reservado nada."
  ],
  "generic": [
    "Хочу понять ваш запрос, а не угадывать. Что интереснее — конкретный ответ, видео, медитация или практика?",
    "I'd rather clarify than guess. Do you want an answer, video, meditation, or practice?",
    "Prefiero aclarar antes que adivinar. ¿Quieres una respuesta, vídeo, meditación o práctica?"
  ]
};
const cues={
 safety:/хочу умереть|покончить с собой|не хочу жить|суицид|самоубийств|kill myself|suicide|end my life|i want to die|quiero morir|suicidarme/u,
 restart:/^(?:заново|начать сначала|сначала|новый разговор|start over|restart|new conversation|empezar de nuevo)$/u,
 bye:/^(?:стоп|пока|хватит|закончим|stop|bye|goodbye|adios|hasta luego|basta)$/u,
 thanks:/^(?:спасибо|благодарю|спасибо большое|thanks|thank you|gracias|muchas gracias)$/u,
 hello:/^(?:привет|приветик|здравствуй|здравствуйте|добрый день|доброе утро|добрый вечер|ау|алло|привет ау|ау привет|ты тут|hi|hello|hello there|hi there|hey|hola|buenas)$/u,
 yes:/^(?:да|ага|угу|хорошо|ок|окей|yes|yeah|sure|ok|okay|si|vale|claro)$/u,
 no:/^(?:нет|неа|не хочу|другое|не надо|no|nope|not really|otra cosa|otro)$/u,
 confused:/не понимаю|не понял|не поняла|ты меня не понял|i dont understand|you misunderstood|no entiendo/u,
 uncertain:/не знаю что хочу|не знаю с чего|что посоветуешь|не знаю что выбрать|dont know where to start|not sure what i want|no se que quiero/u,
 identity:/кто ты|ты человек|ты бот|ты ии|как тебя зовут|who are you|are you human|are you a bot|eres humano|quien eres/u,
 language:/по русски|по английски|по испански|какие языки|speak russian|speak english|hablas ruso|idiomas/u,
 capabilities:/что умеешь|что ты можешь|как можешь помочь|what can you do|how can you help|que puedes hacer/u,
 price:/стоимост|сколько стоит|платн|бесплатн|(?:^|\s)цен[аыуе](?:\s|$)|оплат|how much|price|cost|payment|is it free|cuanto cuesta|precio|gratis/u,
 privacy:/конфиденциал|приватност|личные данные|сохраняешь переписк|data privacy|confidential|private data|privacidad|datos personales/u,
 login:/войти|вход в кабинет|авторизац|аккаунт|пароль|мой профиль|sign in|log in|login|account|my profile|iniciar sesion|cuenta/u,
 human_help:/живой.*специалист|поговорить с мастером|нужен психолог|найти терапевт|human specialist|talk to a practitioner|find a practitioner|terapeuta|profesional/u,
 technical:/ошибка|не работает|не отвечает|завис|не открывает|глюч|баг|error|broken|bug|not working|no funciona/u,
 status:/где.*(?:видео|ролик|заказ)|когда.*готов|статус.*(?:видео|заказ)|render.*(?:status|ready)|video.*(?:ready|status)|where.*(?:video|order)|donde.*(?:video|pedido)/u,
 delivery:/телеграм|telegram|whatsapp|отправ.*(?:видео|ролик)|send.*(?:video|telegram)|enviar.*(?:video|telegram)/u,
 download:/скача|загрузить файл|сохранить видео|download|save.*video|export.*video|descargar|guardar.*video/u,
 booking:/записаться на|записать на сесси|брониров|назначить встреч|book a session|book an appointment|reservar.*sesion|agendar/u,
 results:/результат.*тест|расшифр.*результат|балл|шкал|test results|my score|interpret.*score|resultado.*prueba|puntuacion|escala/u,
 analysis:/личн.*разбор|разбор ситуац|экспресс.*диагност|free analysis|situation review|analisis personal/u,
 orders:/мои заказы|(?:^|\s)заказ[аыуе]?(?:\s|$)|my orders|order status|mis pedidos|pedido/u,
 video:/видео|видеотерап|видеоряд|ролик|клип|монтаж|video|film|pelicula/u,
 meditation:/медитац|медитир|meditat|meditacion|meditar/u,
 create:/созда|сдела|сгенер|собер|хочу|помоги|подобра|придум|create|make|generate|want|help|choose|find|hacer|crear|generar|quiero/u,
 story:/сценари|сюжет|мотив|смыслов|ось смысла|эмоциональн.*стратег|иде[яию]|storyboard|script|scenario|motive|meaning axis|idea|guion|escenario|eje de sentido/u,
 scenes:/сцен|кадр|видеоряд|подбор.*клип|stock footage|scenes|shots|footage|clips|escenas/u,
 audio:/музык|звук|голос|озвуч|субтитр|текст на экране|music|sound|voice|narrat|subtitle|sin musica|voz|subtitulo/u,
 duration:/длительност|сколько минут|на сколько минут|длина ролика|minutes?|minutos?|duracion|duration|how long|length/u,
 listen:/слушать|прослуш|включить|послушать|play|listen|escuchar|reproducir/u,
 stress:/стресс|тревог|тревож|нервнича|пережива|паник|stress|anxiety|anxious|worried|ansiedad|estres/u,
 sleep:/бессон|не могу уснуть|хочу спать|перед сном|плохо сплю|sleep|insomnia|cant fall asleep|bedtime|dormir|insomnio|sueno/u,
 tired:/устал|выгора|нет сил|истощ|мало энергии|tired|exhaust|burnout|no energy|fatigue|cansad|agotad|sin energia/u,
 relationship:/отношен|любов|близост|одинок|партнер|развод|расстав|ссор|relationship|lonely|love|partner|breakup|relacion|amor|pareja|soledad/u,
 confidence:/уверенн|самооценк|стыд|смущени|confidence|self esteem|self worth|shame|autoestima|verguenza/u,
 work:/работ[аеуы]|карьер|бизнес|клиент|доход|деньг|финанс|work|career|business|job|money|income|trabajo|negocio|dinero/u,
 purpose:/смысл[а-я]*\s+жизн|призвани|цель жизни|нет цели|куда двигаться|мотивац|прокрастин|meaning of life|purpose|motivation|sentido de la vida|proposito/u,
 ritual:/ритуал|обряд|церемони|ritual|ceremony|ceremonia/u,
 reiki:/рейки|рэйки|reiki/u,
 course:/курс|академи|обучени|урок|программ.*занят|course|academy|lesson|training program|curso|academia|leccion/u,
 test:/тест|опросник|диагностик|анкета|assessment|questionnaire|quiz|prueba|cuestionario/u,
};
function normalizeRule(value){
 return String(value??"").toLocaleLowerCase().replace(/ё/g,"е").replace(/[áàä]/g,"a").replace(/[éèêë]/g,"e").replace(/[íìï]/g,"i").replace(/[óòö]/g,"o").replace(/[úùü]/g,"u").replace(/ñ/g,"n").replace(/[^a-z0-9а-я\s]/gu," ").replace(/\s+/g," ").trim().slice(0,1000);
}
function responseLanguage(message,locale="en"){
 if(/[а-яё]/iu.test(message))return "ru";
 if(/^(?:hola|buenas|gracias|quiero|necesito|me siento|no entiendo)\b/u.test(normalizeRule(message)))return "es";
 return ["ru","en","es"].includes(locale)?locale:"en";
}
function classifyRule(message="",history=[]){
 const s=normalizeRule(message),h=Array.isArray(history)?history.slice(-6):[];
 if(!s||cues.safety.test(s))return null;
 for(const id of ["restart","bye","thanks","hello"])if(cues[id].test(s))return id;
 const coherent=interpretDialogueCoherence({message,history:h});
 if(coherent.act==="ambiguous")return "coherent_ambiguous";
 if(coherent.act==="correct_topic")return "coherent_topic";
 if(coherent.act==="reject")return coherent.medium==="video"?
   "coherent_reject_video":coherent.medium==="meditation"?
   "coherent_reject_meditation":"no";
 if((coherent.act==="switch"||coherent.act==="choose")&&coherent.medium)
   return coherent.medium==="video"?"video_start":"meditation_start";
 // Carry only the most recent explicitly chosen medium over up to six turns.
 // A stop, reset or rejection breaks that context. Assistant text is not trusted.
 const previousUser=h.filter(t=>t?.role==="user"&&typeof t.text==="string")
   .map(t=>normalizeRule(t.text)).reverse();
 let medium=null;
 for(const turn of previousUser){
   if(cues.restart.test(turn)||cues.bye.test(turn)||cues.no.test(turn))break;
   if(cues.meditation.test(turn)){medium="meditation";break;}
   if(cues.video.test(turn)){medium="video";break;}
 }
 if(cues.yes.test(s))return medium==="video"?"video_context":medium==="meditation"?"meditation_context":"yes";
 if(cues.no.test(s))return "no";
 if(medium&&/^(?:\d{1,3}\s*(?:минут[ы]?|мин|minutes?|minutos?)?|about \d{1,3} minutes?)$/u.test(s))
   return medium==="video"?"video_minutes":"meditation_minutes";
 // Specific reviewed domain questions outrank broad keyword cues. The special
 // video creation wizard retains ownership when it is active in the UI.
 const expanded=matchSupportRuleV3(s)||matchVideoRuleV3(s);
 if(expanded)return expanded;
 for(const id of ["confused","uncertain","identity","language","privacy","login","technical","price"])if(cues[id].test(s))return id;
 if(cues.status.test(s))return cues.video.test(s)?"video_status":"orders";
 if(cues.delivery.test(s))return "video_delivery";
 if(cues.download.test(s))return "video_download";
 for(const id of ["booking","results","analysis","orders","human_help","capabilities"])if(cues[id].test(s))return id;
 const video=cues.video.test(s),meditation=cues.meditation.test(s);
 if(video&&meditation&&cues.create.test(s))return "video_both";
 if(video){
  if(/что такое видеотерап|what is video therapy|que es videoterapia/u.test(s))return "video_definition";
  if(cues.audio.test(s))return "video_audio";
  if(cues.duration.test(s))return "video_length";
  if(cues.story.test(s)&&/сценари|сюжет|мотив|смыслов|иде[яию]|script|scenario|motive|meaning axis|guion|idea/u.test(s))return "video_story";
  if(cues.scenes.test(s))return "video_scenes";
  return "video_start";
 }
 if(meditation){
  if(cues.listen.test(s))return "meditation_listen";
  if(cues.audio.test(s))return "meditation_voice";
  if(cues.duration.test(s))return "meditation_duration";
  if(/персональн|личн|свою|custom|personalized|my own|personalizad|propia/u.test(s))return "meditation_custom";
  return "meditation_start";
 }
 if(cues.scenes.test(s)||cues.story.test(s)&&/смыслов|мотив|сюжет|сценари|script|scenario|meaning axis|guion/u.test(s))return "video_story";
 for(const id of ["ritual","reiki","course","test","sleep","tired","stress"])if(cues[id].test(s))return id;
 if(cues.relationship.test(s))return medium==="video"&&s.length<55?"video_topic":"relationship";
 for(const id of ["confidence","work","purpose"])if(cues[id].test(s))return id;
 if(/практик|упражнен|practice|exercise|practica|ejercicio/u.test(s))return "practice";
 if(medium&&s.length<65&&/(?:спокойств|уверенн|радост|энерги|calm|confiden|peace|joy|tranquil|confianza|energia)/u.test(s))
   return medium==="video"?"video_emotion":"meditation_emotion";
 if(medium&&s.length<65&&/^(?:про |о |для |хочу |quiero |para |about |for |feel |i feel |me siento )/u.test(s))
   return medium==="video"?"video_topic":"meditation_state";
 return "generic";
}
/** @param {{message?:string,locale?:string,history?:Array<{role:"user"|"assistant",text:string}>}} [input] */
export function ruleConversationReply({message="",locale="en",history=[]}={}){
 const lang=responseLanguage(message,locale);
 // Classify explicit user corrections before the broader coherence fallback.
 const understanding=understandConversationTurn({message,locale:lang,history});
 const coherence=interpretDialogueCoherence({message,history});
 const mediumWords=/(?:\bvideo\b|\bfilm\b|\breel\b|видео|видеоролик|ролик|видеофильм|медитац\p{L}*|медитир\p{L}*|\bmeditat\p{L}*|\bmeditacion\b|\bmeditar\b|pelicula)/iu;
 const topicCorrection=coherence.act==="correct_topic"&&!mediumWords.test(message);
 const mediaCorrection=(coherence.act==="switch"||coherence.act==="choose")&&Boolean(coherence.medium);
 if(topicCorrection&&understanding.act==="correction"&&understanding.topic&&understanding.replyFallback){
  return {id:"conversation_correction",locale:lang,reply:understanding.replyFallback,
   source:"conversation-intelligence",understanding:{
    act:understanding.act,topic:understanding.topic,contextTopic:understanding.contextTopic,
    confidence:understanding.confidence,requiresClarification:understanding.requiresClarification}};
 }
 if(topicCorrection||mediaCorrection){
  const id=topicCorrection?"coherent_topic":classifyRule(message,history);
  const index=["ru","en","es"].indexOf(lang);
  const reply=supportRuleAnswerV3(id,lang)||videoRuleAnswerV3(id,lang)||
    utterances[id]?.[index]||utterances.generic[index];
  return {id,locale:lang,reply,source:"reviewed-rules"};
 }
 const complaint=classifyClientConcern({message,locale:lang,history});
 if(complaint)return {id:"complaint_"+complaint.id,locale:complaint.locale,
  reply:complaint.reply,source:"complaint-rules"};
 // Dialogue-level repairs do not issue domain commands. Keep the existing
 // video wizard, factual FAQ, catalogue and consent flows authoritative.
 if(["correction","follow_up","ambivalence","disclosure","feedback","uncertainty","rejection","affirmation","greeting","thanks","goodbye","small_talk","chat_invitation"].includes(understanding.act)&&understanding.replyFallback){
  return {id:"conversation_"+understanding.act,locale:lang,reply:understanding.replyFallback,
   source:"conversation-intelligence",understanding:{
    act:understanding.act,topic:understanding.topic,contextTopic:understanding.contextTopic,
    confidence:understanding.confidence,requiresClarification:understanding.requiresClarification}};
 }
 const id=classifyRule(message,history);
 if(id===null)return null;
 const index=["ru","en","es"].indexOf(lang);
 const reply=supportRuleAnswerV3(id,lang)||videoRuleAnswerV3(id,lang)||utterances[id]?.[index]||utterances.generic[index];
 return {id,locale:lang,reply,source:"reviewed-rules"};
}
