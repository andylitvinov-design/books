// Contextual iHelp suggestions are selected from public routes and whitelisted tab IDs.
// Never read form contents, private client records, URLs with query tokens or AI history.
const EN = {
  home:["Welcome! I can help you find the right place to start at Holistic House.",[
    ["Find a free self-check","How do I find a suitable free self-check?","Open Tests to explore the available self-checks. A questionnaire is for reflection, not a diagnosis."],
    ["Choose a practice","Help me find a gentle practice.","Browse Practice or MyTube for an existing short practice that suits your goal."],
    ["Create a personal video","How do I start making my own video?","Open Video Studio, describe your goal and preferences, then review the proposed idea before generating."]
  ]],
  video:["You're in Video Studio. I can help with the next step.",[
    ["Shape my video idea","How can I turn my goal into a video idea?","Describe what you want to feel or change, choose a topic and add your own wish. Review the suggested idea before generation."],
    ["Choose scenes","How should I choose video scenes?","Start from the proposed scenario and available scenes; adjust the visuals only when you want to."],
    ["Explain video generation","What happens when I generate a video?","Review the montage, audio and effects, then use the generation action. Wait for an actual completion notice before treating the video as ready."]
  ]],
  videoEffects:["You're on the video effects step. I can explain the available visual effects.",[
    ["Explain these effects","What do the video hypno-effects do?","Effects change the video's visual presentation. Keep them optional; check the preview and choose only effects you are comfortable with."],
    ["Choose a gentle look","How can I keep the video effects gentle?","Start with subtle intensity and fewer simultaneous effects. Watch the preview before applying them."],
    ["Generate without effects","Can I make my video without hypno-effects?","Yes. Use the separate generation-without-effects option rather than applying optional effects."]
  ]],
  videoAudio:["You're in the audio step. I can help you work with sound.",[
    ["Browse music","How can I choose music for this video?","Browse the music library, preview an available track, and check how it matches the montage."],
    ["Use my audio","How can I add my own audio?","Use the My Audio Upload option, choose your file and confirm you have rights to use it."],
    ["Balance the sound","How can I avoid overpowering the video with music?","Preview the mix at a comfortable level and adjust volume before generating."]
  ]],
  videoText:["You're in Add text. I can help with captions and affirmations.",[
    ["Add affirmations","How do I add affirmations to the montage?","Select the phrases you want to use, add them to the text timeline and review their positions."],
    ["Animate text","What text movements can I use?","Review the text animation controls for movement, size and rotation, and keep the result readable."],
    ["Arrange timing","How do I distribute text throughout my video?","Use the montage timeline to move text items and avoid overlapping the most important moments."]
  ]],
  videoSettings:["You're in video settings. Let's clarify the technical options.",[
    ["Format and duration","Where do I choose video format and duration?","Use the Settings step for aspect ratio and duration; these should not be repeated in Audio."],
    ["Quality","How should I pick video quality?","Choose an available quality suited to your screen and verify export capabilities before generating."],
    ["Check my settings","What should I check before generating?","Review format, duration, montage and audio, then confirm the final preview."]
  ]],
  videoIdeas:["You're choosing the story for your video. I can help refine it.",[
    ["Choose an idea","How do I choose the best video idea?","Check that the suggested idea matches your goal, topic and personal wish."],
    ["Refine the story","Can I make the proposed story more personal?","Add a short, concrete wish or image, and review the updated scene plan before generation."],
    ["Continue to montage","What is the next step after the idea?","Confirm the idea, then use the montage step to adjust scenes, text and sound."]
  ]],
  mytube:["You're browsing ready-made videos. What would you like to find?",[
    ["Find a video for my mood","How do I choose a ready-made video for my current goal?","Browse the available themes and preview a video before deciding whether to watch."],
    ["Create my own video","Where can I create a more personal video?","Open Video Studio to start from your goal and optional preferences."],
    ["Reflect on the effect","How can I reflect on a video after watching?","Notice how you feel before and after, and use any offered check-in voluntarily."]
  ]],
  tests:["You're in Tests. I can help you choose and understand a self-check.",[
    ["Choose a test","How do I choose a relevant self-check?","Pick the topic closest to your question and review the test description before starting."],
    ["Understand results","How should I interpret a test result?","Read the score range and its limits. A self-check result is not a clinical diagnosis."],
    ["Save a result","How can I keep a test result?","Use the available save-to-cabinet action; signing in may be needed to store private results."]
  ]],
  academy:["You're exploring learning programs. I can help choose the next lesson.",[
    ["Choose a course","How can I choose an introductory course?","Compare the published course outline and begin with the first available lesson."],
    ["Find my progress","Where do I find my learning progress?","Look for My Courses or your personal cabinet to see available saved progress."],
    ["Short practice","Can I start with something short?","Open Practice for a gentle first exercise without committing to a full course."]
  ]],
  services:["You're looking at services. I can help you understand the options.",[
    ["Choose a service","How do I compare the available personal services?","Review each service's description, format, duration and stated conditions before requesting it."],
    ["Free situation review","Where can I request a free situation review?","The free situation review has its own page and submission flow. A request is not a confirmed appointment."],
    ["Ask about a session","What should I know before booking a personal session?","Check the current price and terms on the service page; a request still needs confirmation."]
  ]],
  cabinet:["You're in your personal space. I can help you find your next step without reading private data.",[
    ["My reports","Where can I find reports saved to my cabinet?","Look in your personal reports or results section after signing in."],
    ["My courses","Where can I continue my course?","Open My Courses and choose the lesson or program you want to resume."],
    ["My requests","Where can I see my requests or messages?","Open Messages, then My Orders or Conversations as appropriate."]
  ]],
  messages:["You're in Messenger. I can help with AI chat, orders or conversations.",[
    ["Ask the AI","Can I ask a new question here?","Yes. Write your question in the composer and choose a supported reply mode if needed."],
    ["My orders","Where can I find updates on my requests?","Choose My Orders to review their actual recorded status; sending a request does not confirm delivery."],
    ["Messages from a practitioner","Where do I find a conversation with a practitioner?","Use the Conversations or Clients section. Private threads require the correct account."]
  ]],
  library:["You're exploring the library. I can help you find a topic.",[
    ["Find a subject","How do I find material on a specific subject?","Choose a section or search for a topic in the published library."],
    ["Begin learning","Where should I begin reading?","Start with an introductory item before moving to advanced material."]
  ]],
  practice:["You're in the practice area. I can help you start gently.",[
    ["Choose a practice","How do I choose a suitable short practice?","Choose an available practice based on your time and preferences, and stop if it feels uncomfortable."],
    ["Continue a course","Where do I continue a course I started?","Open My Courses in your cabinet to see saved lessons."],
    ["Discuss my goal","Can I explain my goal in my own words?","Yes. Describe your goal here and I can help you consider the available next steps."]
  ]],
  shop:["You're exploring the shop. I can help with the next step.",[
    ["How ordering works","How do I order an item or service?","Review the product or service terms and payment details before you confirm any purchase."],
    ["Find an order","Where can I find an existing order?","Check My Orders or your cabinet for confirmed records; do not assume an order was placed without a receipt."]
  ]]
};
const RU = {
  home:["Привет! Я iHelp. Помогу выбрать, с чего начать в Holistic House.",[
    ["Подобрать бесплатный тест","Как мне выбрать бесплатный тест?","Откройте раздел «Тесты», выберите интересующую тему и прочитайте описание. Тест — инструмент самонаблюдения, а не диагноз."],
    ["Найти практику","Помоги подобрать мягкую практику.","Посмотрите раздел «Практики» или MyTube и выберите доступный короткий материал под свою цель."],
    ["Создать своё видео","Как начать создание личного видео?","В видеостудии укажите цель, тему и пожелание. После этого проверьте предложенную идею перед генерацией."]
  ]],
  video:["Вы в видеостудии. Подскажу следующий шаг.",[
    ["Разработать идею","Как мне превратить свою цель в идею видео?","Опишите желаемый результат, выберите тему и добавьте своё пожелание. Затем проверьте готовую идею."],
    ["Подобрать сцены","Как подобрать сцены для моего видео?","Начните с предложенного сценария и доступных видеосцен. Изменяйте визуальные детали только по желанию."],
    ["Объяснить генерацию","Что произойдёт после нажатия генерации?","Проверьте монтаж, звук и эффекты, затем запустите генерацию. Готовность видео подтверждается отдельным результатом."]
  ]],
  videoEffects:["Вы открыли гипноэффекты. Помогу разобраться с визуальными эффектами.",[
    ["Объяснить эффекты","Что делают гипноэффекты в видеогенераторе?","Эффекты меняют визуальное восприятие ролика. Их добавление добровольно: оцените предпросмотр и выбирайте комфортный вариант."],
    ["Мягкий вариант","Как выбрать самые мягкие эффекты?","Начните с низкой интенсивности и малого числа эффектов. Проверьте предпросмотр до применения."],
    ["Без эффектов","Можно создать видео без гипноэффектов?","Да. Используйте отдельную команду генерации без эффектов вместо их применения."]
  ]],
  videoAudio:["Вы открыли Audio. Помогу выбрать и настроить звук.",[
    ["Выбрать музыку","Как выбрать музыку для моего видео?","Откройте Music Library, прослушайте треки и оцените, насколько музыка подходит монтажу."],
    ["Загрузить свой звук","Как добавить собственный аудиофайл?","Выберите My Audio Upload, загрузите файл и подтвердите право на его использование."],
    ["Настроить баланс","Как не заглушить видео музыкой?","Прослушайте сочетание звуков и скорректируйте громкость перед генерацией."]
  ]],
  videoText:["Вы открыли Add text. Помогу разместить установки и текст в монтаже.",[
    ["Добавить установки","Как добавить пять выбранных установок?","Выберите установки, добавьте их на текстовую временную шкалу и проверьте порядок."],
    ["Анимация текста","Какие движения текста доступны?","Проверьте параметры перемещения, увеличения, уменьшения и вращения, сохраняя читаемость."],
    ["Распределить по времени","Как распределить текст по времени видео?","Перемещайте текстовые блоки на временной шкале и проверяйте их появление в предпросмотре."]
  ]],
  videoSettings:["Вы в Settings видеостудии. Подскажу настройки перед генерацией.",[
    ["Формат и длительность","Где настроить формат и длительность видео?","Эти параметры относятся к Settings и не должны дублироваться в Audio."],
    ["Качество","Как выбрать качество видео?","Выберите доступное разрешение под целевой экран и проверьте возможность экспорта."],
    ["Проверка настроек","Что проверить перед генерацией?","Сверьте формат, длительность, монтаж, звук и предпросмотр."]
  ]],
  videoIdeas:["Вы на шаге идеи. Помогу сделать сценарий точнее.",[
    ["Выбрать идею","Как выбрать лучшую идею для видео?","Проверьте соответствие предложенной идеи вашей цели, теме и личному пожеланию."],
    ["Уточнить сюжет","Как сделать сюжет более личным?","Добавьте короткое конкретное пожелание или образ, затем посмотрите обновлённый план сцен."],
    ["Дальше к монтажу","Что дальше после утверждения идеи?","Подтвердите идею, после чего в монтаже можно скорректировать сцены, текст и звук."]
  ]],
  mytube:["Вы в MyTube. Помогу найти подходящее готовое видео.",[
    ["Видео под настроение","Как найти готовое видео под мою цель?","Выберите тему и посмотрите доступные ролики перед просмотром."],
    ["Своё видео","Где можно создать персональное видео?","Перейдите в видеостудию и начните с описания своей цели."],
    ["Оценить эффект","Как оценить эффект после просмотра?","Сравните ощущения до и после просмотра и при желании пройдите предложенный чекин."]
  ]],
  tests:["Вы в «Тестах». Помогу выбрать тест и разобраться с результатами.",[
    ["Подобрать тест","Как выбрать тест под мой запрос?","Выберите близкую тему и прочитайте описание теста перед началом."],
    ["Понять результаты","Как понять результат теста?","Посмотрите диапазоны шкал и ограничения методики. Результат самопроверки не является диагнозом."],
    ["Сохранить тест","Где сохранить результат теста?","Используйте сохранение в личный кабинет. Для хранения личных результатов может потребоваться вход."]
  ]],
  academy:["Вы в Академии. Помогу выбрать программу или урок.",[
    ["Выбрать курс","Как мне выбрать вводный курс?","Сравните описание и программу опубликованных курсов и начните с первого доступного урока."],
    ["Мой прогресс","Где посмотреть прогресс обучения?","Откройте «Мои курсы» или личный кабинет для просмотра сохранённого прогресса."],
    ["Короткая практика","Можно начать с короткого упражнения?","В разделе «Практики» можно выбрать доступное мягкое упражнение без обязательной записи на курс."]
  ]],
  services:["Вы в разделе услуг. Помогу сравнить возможности.",[
    ["Подобрать услугу","Как выбрать подходящую личную услугу?","Сравните описание, формат, продолжительность и условия каждой услуги."],
    ["Бесплатный разбор","Как запросить бесплатный разбор ситуации?","Для бесплатного разбора есть отдельная страница с формой. Отправка заявки ещё не означает подтверждённую запись."],
    ["Условия сессии","Что надо узнать перед личной сессией?","Проверьте цену и условия на странице услуги. Заявка требует отдельного подтверждения."]
  ]],
  cabinet:["Вы в личном кабинете. Помогу найти нужный раздел, не читая личные данные.",[
    ["Мои отчёты","Где найти сохранённые отчёты?","Посмотрите раздел личных отчётов или результатов после входа в кабинет."],
    ["Мои курсы","Как продолжить курс?","Откройте «Мои курсы» и выберите нужный урок."],
    ["Мои заявки","Где мои заявки и переписка?","Откройте «Мессенджер», затем «Мои заказы» или «Переписка»."]
  ]],
  messages:["Вы в мессенджере. Помогу с ИИ-чатом, заказами и перепиской.",[
    ["Спросить ИИ","Можно задать здесь новый вопрос?","Да. Напишите вопрос в поле ввода и при необходимости выберите доступный режим ответа."],
    ["Мои заказы","Как узнать статус моей заявки?","Перейдите на вкладку заказов и посмотрите зафиксированный статус. Подача заявки не гарантирует её подтверждения."],
    ["Переписка с мастером","Где найти сообщения от мастера?","Откройте раздел переписок. Для доступа к личным сообщениям может потребоваться вход в соответствующий аккаунт."]
  ]],
  library:["Вы в библиотеке. Помогу найти интересующий материал.",[
    ["Найти тему","Как найти материалы по определённой теме?","Выберите раздел библиотеки или воспользуйтесь поиском."],
    ["С чего начать","С какого материала лучше начать чтение?","Начните с вводной статьи, затем переходите к более сложным разделам."]
  ]],
  practice:["Вы в разделе практик. Помогу начать с комфортного шага.",[
    ["Подобрать практику","Как выбрать короткую мягкую практику?","Выберите доступную практику с учётом времени и самочувствия. При дискомфорте её можно остановить."],
    ["Продолжить обучение","Как вернуться к начатому курсу?","Зайдите в «Мои курсы», чтобы выбрать сохранённый урок."],
    ["Обсудить цель","Можно рассказать мою цель своими словами?","Конечно. Напишите цель в сообщении, и мы обсудим доступные варианты."]
  ]],
  shop:["Вы в магазине. Подскажу, как разобраться с заказом.",[
    ["Оформить заказ","Как оформить заказ на сайте?","Ознакомьтесь с условиями товара или услуги и ценой до подтверждения оплаты."],
    ["Найти покупку","Где посмотреть уже оформленный заказ?","Проверьте раздел «Мои заказы» или кабинет. Заказ не считается оформленным без подтверждения."]
  ]]
};
const ES = {
  home:["¡Hola! Soy iHelp. Puedo ayudarte a empezar en Holistic House.",[
    ["Elegir un test gratis","¿Cómo elijo un test gratuito?","Abre Tests, elige un tema y lee la descripción. Es una autoevaluación, no un diagnóstico."],
    ["Encontrar una práctica","Ayúdame a encontrar una práctica suave.","Explora Prácticas o MyTube y elige un material publicado que encaje con tu objetivo."],
    ["Crear mi vídeo","¿Cómo empiezo mi vídeo personal?","Abre el estudio, indica tu objetivo, el tema y tu deseo, y revisa la idea propuesta."]
  ]],
  video:["Estás en el estudio de vídeo. Te ayudaré con el próximo paso.",[
    ["Crear una idea","¿Cómo convierto mi objetivo en una idea de vídeo?","Describe tu objetivo, elige el tema y añade tu deseo. Revisa la propuesta antes de generar."],
    ["Elegir escenas","¿Cómo elijo las escenas del vídeo?","Empieza con el guion y las escenas disponibles; ajusta los detalles cuando quieras."],
    ["Entender la generación","¿Qué sucede al generar el vídeo?","Revisa el montaje, el audio y los efectos. El vídeo estará listo solo cuando lo confirme el resultado."]
  ]],
  videoEffects:["Estás en los efectos de vídeo. Puedo explicarte las opciones.",[
    ["Explicar efectos","¿Qué hacen los efectos visuales?","Los efectos modifican la presentación visual y son opcionales. Revisa la vista previa."],
    ["Efectos suaves","¿Cómo elijo unos efectos suaves?","Empieza con intensidad baja y pocos efectos simultáneos. Comprueba la vista previa."],
    ["Sin efectos","¿Puedo generar un vídeo sin efectos?","Sí. Usa la opción de generar sin aplicar efectos."]
  ]],
  videoAudio:["Estás en Audio. Te ayudaré a elegir sonido.",[
    ["Elegir música","¿Cómo elijo la música para mi vídeo?","Explora la biblioteca, escucha una pista y comprueba su encaje con el montaje."],
    ["Subir mi audio","¿Cómo añado mi archivo de audio?","Elige My Audio Upload, selecciona el archivo y confirma tus derechos de uso."],
    ["Mezclar sonido","¿Cómo equilibro la música?","Escucha la mezcla y ajusta el volumen antes de generar."]
  ]],
  videoText:["Estás en Añadir texto. Puedo ayudarte con frases y subtítulos.",[
    ["Añadir afirmaciones","¿Cómo añado afirmaciones al montaje?","Selecciona las frases y colócalas en la línea de tiempo del texto."],
    ["Animar texto","¿Cómo puedo animar el texto?","Revisa los controles de movimiento, tamaño y rotación y conserva una lectura clara."],
    ["Distribuir el texto","¿Cómo distribuyo el texto a lo largo del vídeo?","Mueve los bloques en la línea de tiempo y revisa la vista previa."]
  ]],
  videoSettings:["Estás en los ajustes del vídeo. Vamos a revisar las opciones.",[
    ["Formato y duración","¿Dónde cambio formato y duración?","El formato y la duración pertenecen a Settings, no a Audio."],
    ["Calidad","¿Cómo elijo la calidad?","Elige una resolución disponible y verifica la exportación."],
    ["Revisar ajustes","¿Qué debo comprobar antes de generar?","Revisa formato, duración, montaje, sonido y vista previa."]
  ]],
  videoIdeas:["Estás eligiendo la idea. Te ayudaré a definirla.",[
    ["Elegir idea","¿Cómo elijo la mejor idea para el vídeo?","Comprueba que la idea propuesta refleja tu objetivo, tema y deseo."],
    ["Personalizar historia","¿Cómo personalizo la historia?","Añade un deseo concreto y revisa la secuencia de escenas."],
    ["Ir al montaje","¿Qué viene después de la idea?","Confirma la idea y revisa escenas, texto y sonido en el montaje."]
  ]],
  mytube:["Estás en MyTube. ¿Qué vídeo te gustaría encontrar?",[
    ["Vídeo para mi objetivo","¿Cómo encuentro un vídeo disponible que encaje conmigo?","Selecciona un tema y revisa los vídeos publicados."],
    ["Crear vídeo personal","¿Dónde puedo crear un vídeo personal?","Abre el estudio de vídeo y describe tu objetivo."],
    ["Valorar el efecto","¿Cómo valoro el efecto de un vídeo?","Observa cómo te sientes antes y después y utiliza un registro voluntario si está disponible."]
  ]],
  tests:["Estás en Tests. Puedo ayudarte a elegir y entender un test.",[
    ["Elegir test","¿Cómo elijo un test para mi situación?","Selecciona el tema más cercano y lee la descripción."],
    ["Interpretar resultados","¿Cómo interpreto el resultado?","Consulta los rangos de puntuación y sus límites. No constituye un diagnóstico."],
    ["Guardar resultado","¿Cómo guardo mi resultado?","Utiliza la opción de guardar en tu cuenta cuando esté disponible."]
  ]],
  academy:["Estás explorando los cursos. Te ayudaré a empezar.",[
    ["Elegir curso","¿Cómo elijo un curso introductorio?","Compara los programas publicados y empieza por la primera lección."],
    ["Mi progreso","¿Dónde consulto mi progreso?","Abre Mis cursos o tu cuenta para ver el progreso guardado."],
    ["Práctica corta","¿Puedo empezar con una práctica breve?","En Prácticas puedes explorar un primer ejercicio sin comprometerte con un curso."]
  ]],
  services:["Estás consultando servicios. Te ayudaré a comparar.",[
    ["Elegir servicio","¿Cómo comparo los servicios personales?","Revisa la descripción, formato, duración y condiciones de cada servicio."],
    ["Revisión gratuita","¿Cómo solicito una revisión gratuita?","La revisión gratuita tiene su propia página y formulario. La solicitud no confirma una cita."],
    ["Consultar condiciones","¿Qué debo saber antes de una sesión?","Consulta el precio y las condiciones en la página del servicio."]
  ]],
  cabinet:["Estás en tu cuenta. Puedo orientarte sin leer datos privados.",[
    ["Mis informes","¿Dónde están mis informes guardados?","Busca informes o resultados en tu cuenta."],
    ["Mis cursos","¿Dónde continúo un curso?","Abre Mis cursos y selecciona la lección."],
    ["Mis solicitudes","¿Dónde están mis pedidos y mensajes?","Abre Mensajes y luego Pedidos o Conversaciones."]
  ]],
  messages:["Estás en Mensajes. Te ayudaré con IA, pedidos o conversaciones.",[
    ["Preguntar a la IA","¿Puedo hacer otra pregunta?","Sí. Escribe en el campo de chat y elige el modo de respuesta disponible."],
    ["Mis pedidos","¿Dónde compruebo mi solicitud?","Abre Mis pedidos y consulta su estado real; enviar no significa confirmar."],
    ["Conversaciones","¿Dónde leo mensajes de un profesional?","Abre Conversaciones. Los mensajes privados requieren la cuenta adecuada."]
  ]],
  library:["Estás en la biblioteca. Te ayudaré a encontrar material.",[
    ["Buscar tema","¿Cómo encuentro textos sobre un tema?","Elige una sección o busca el tema en la biblioteca publicada."],
    ["Por dónde empezar","¿Por dónde empiezo a leer?","Empieza por un material introductorio antes de pasar a otros avanzados."]
  ]],
  practice:["Estás en Prácticas. Puedo ayudarte a empezar suavemente.",[
    ["Elegir práctica","¿Qué práctica breve me conviene?","Elige una práctica publicada según tu tiempo y preferencias. Puedes detenerte si es incómoda."],
    ["Continuar curso","¿Dónde continúo el curso?","Abre Mis cursos en tu cuenta."],
    ["Explicar mi objetivo","¿Puedo explicar mi objetivo con mis palabras?","Sí. Escribe tu pregunta y veremos las opciones disponibles."]
  ]],
  shop:["Estás en la tienda. Puedo orientarte.",[
    ["Cómo comprar","¿Cómo hago un pedido?","Revisa las condiciones y el precio antes de pagar."],
    ["Dónde está mi compra","¿Dónde reviso mi pedido?","Abre Mis pedidos para consultar el estado confirmado."]
  ]]
};
const GROUPS={en:EN,ru:RU,es:ES};
const OTHER={en:"Ask another question",ru:"Задать другой вопрос",es:"Hacer otra pregunta"};

function videoTab(tab) {
  if (/^(effects|style|hypno|hypnosis|hypnoeffects)$/.test(tab)) return "videoEffects";
  if (/^(audio|music)$/.test(tab)) return "videoAudio";
  if (/^(text|add-text|caption|editor|montage)$/.test(tab)) return "videoText";
  if (/^(settings|more|format)$/.test(tab)) return "videoSettings";
  if (/^(ideas|idea|scenario|story)$/.test(tab)) return "videoIdeas";
  return "video";
}
export function getIHelpContext({pathname="/",locale="en",tab=""}={}) {
  const lang = GROUPS[locale] ? locale : "en";
  const path = typeof pathname==="string" && pathname.startsWith("/") ? pathname.split("?")[0].split("#")[0] : "/";
  const section = path.replace(/^\/(?:en|ru|es)(?=\/|$)/,"") || "/";
  const safeTab = typeof tab==="string" && /^[a-z-]{1,24}$/.test(tab) ? tab : "";
  let key = "home";
  if (/^\/(?:holistic-support\/mandala|video-studio)(?:\/|$)/.test(section)) {
    key = /[?&]mode=photo/.test(pathname) ? "video" : videoTab(safeTab);
  } else if (/^\/(?:mytube)(?:\/|$)/.test(section)) key = "mytube";
  else if (/^\/(?:tests|personality-profiles)(?:\/|$)/.test(section)) key = "tests";
  else if (/^\/(?:academy|courses)(?:\/|$)/.test(section)) key = "academy";
  else if (/^\/(?:services|masters|contact|coaching)(?:\/|$)/.test(section)) key = "services";
  else if (/^\/app\/messages(?:\/|$)/.test(section)) key = "messages";
  else if (/^\/(?:app|client|report)(?:\/|$)/.test(section)) key = "cabinet";
  else if (/^\/(?:library|books|articles|dao)(?:\/|$)/.test(section)) key = "library";
  else if (/^\/(?:practice|meditations|holistic-support|temple-support)(?:\/|$)/.test(section)) key = "practice";
  else if (/^\/(?:shop|cart|payments)(?:\/|$)/.test(section)) key = "shop";
  const [intro, options] = GROUPS[lang][key];
  return {id:key, intro, otherLabel:OTHER[lang], actions:options.map(([label,question,reply],index)=>({
    id:key+"-"+index,label,question,reply,
  }))};
}
