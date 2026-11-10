/** Offline conversational FAQ for the Video Director. Never mutates project state. */
const clean=x=>String(x??"").normalize("NFKC").toLocaleLowerCase()
  .replace(/ё/g,"е").replace(/^[¿¡\s]+|[?.!,;\s]+$/gu,"").replace(/\s+/gu," ").slice(0,800);
const question=/^(?:(?:а|ну|подскажите|подскажи|скажите|please|y)\s+)?(?:почему|зачем|как|что|какие|какой|какая|какое|каково|кому|работает ли|(?:на\s+)?сколько|где|когда|можно(?:\s+ли)?|могу ли|есть ли|будет ли|how|what|why|which|where|when|can i|can you|can it|could i|is it|are there|do you|will it|how many|how much|por qu[eé]|c[oó]mo|qu[eé]|cu[aá]l|cu[aá]ntos?|d[oó]nde|cu[aá]ndo|puedo|puedes|se puede|hay)(?=\s|$)/iu;
const imperative=/^(?:хочу|сделай|создай|добавь|выбери|поменяй|измени|i want|make|create|add|change|quiero|haz|crea|a[nñ]ade)(?=\s|$)/iu;
const topics=[
 ["cost",/(?:платн|бесплатн|цен[аыу]|стоимост|подписк|тариф|paid|free\b|price|cost|charg\p{L}*|subscription|gratis|precio|cuesta|pagar)/iu],
 ["privacy",/(?:приватн|конфиденц|данн|куда отправ|(?:как|где)\s+хран\p{L}*|сохраняют.*(?:меня|текст|данн)|privacy|private|personal data|data stored|saved data|privacidad|datos|guardan)/iu],
 ["ai",/(?:искусственн|нейросет|внешн.*ии|ai\b|artificial intelligence|language model|inteligencia artificial|modelo ia|\bia\b)/iu],
 ["footage",/(?:реальн.*кадр|с нуля|генерир.*кадр|готов.*клип|кадр|real footage|footage|from scratch|available scenes|metraje|escenas.*reales|desde cero)/iu],
 ["photo",/(?:фото|изображен|картин|photo|picture|image|foto|imagen)/iu],
 ["voice",/(?:голос|озвуч|диктор|аудиогид|voice|narrat|voiceover|speech|voz|locuci[oó]n)/iu],
 ["phrases",/(?:фраз|аффирмац|субтитр|надпис|текст на экране|caption|affirmation|subtitle|on.screen text|frase|afirmac|subt[ií]tul|texto en pantalla)/iu],
 ["music",/(?:музык|звук|трек|мелод|soundtrack|music|audio|sound|m[uú]sica|sonido)/iu],
 ["format",/(?:формат|вертикал|горизонтал|квадрат|сторис|инстаграм|рилс|tiktok|instagram|portrait|landscape|square|aspect|format|orientaci[oó]n|vertical|horizontal)/iu],
 ["duration",/(?:длительност|длин[аы]|времени|секунд|минут|хронометраж|долго|длит\p{L}*|duration|length|seconds?|minutes?|time|how long|duraci[oó]n|segundos?|minutos?|dura)/iu],
 ["preview",/(?:просмотр|скач|сохран(?:ить|ю|и)|экспорт|готов|результат|preview|download|export|watch|result|ready|where.*video|vista previa|descarg|exportar)/iu],
 ["current",/(?:уже выбрал|уже выбрано|мы выбрали|настройки сейчас|what.*selected|current settings|qu[eé].*elegid|configuraci[oó]n actual)/iu],
 ["options",/(?:вариант|выбор|выбрать|доступн|предлож|рекоменд|порекоменду|options?|choices?|available|recommend|suggest|opciones?|recomiend|disponible)/iu],
 ["steps",/(?:что дальше|как (?:это )?работ|сколько.*шаг|на каком этапе|как начать|how .*work|how .*start|what .*next|which step|next step|c[oó]mo funciona|qu[eé] sigue|pasos)/iu]
];
const copy={
 ru:{
 cost:"Здесь можно бесплатно собрать видео из доступных разрешённых материалов. Платная генерация не включается автоматически.",
 privacy:"Этот чат распознаёт ответы локально. Передача текста внешней модели требует отдельного согласия; фотографии и записи голоса через анализатор реплик не отправляются.",
 ai:"Основной диалог работает без внешней модели. Дополнительный AI необязателен, требует согласия и подтверждённого бесплатного доступа. Он не запускает создание вместо вас.",
 footage:"120 сюжетов — это концепции, а не 120 точно отснятых фильмов. Для экспорта используем проверенные кадры, а недоступные сцены заменяем только с предупреждением.",
 photo:"Нажмите кнопку фотографии рядом с полем сообщения, чтобы добавить своё изображение.",
 voice:"Голос и аудиогид настраиваются в отдельном аудиомодуле. Музыка и голос — разные дорожки.",
 phrases:"Вы можете выбрать готовые фразы, изменить их тон и обращение, написать свою короткую фразу или отключить надписи.",
 music:"Можно выбрать музыку или полностью убрать её. Это не отключает автоматически голос или текст.",
 format:"Поддерживаются вертикальный 9:16, горизонтальный 16:9 и квадратный 1:1. Для сторис обычно подходит 9:16.",
 duration:"Можно выбрать 10, 15, 20, 30 или 60 секунд. Другую длительность я уточню, а не подменю самостоятельно.",
 preview:"После проверки и подтверждения сценария запускается сборка. Открыть видео можно, когда она действительно завершится.",
 options:"Сейчас можно выбрать: {options}. Напишите номер, название или «выбери сам».",
 current:"Сейчас выбрано: {summary}. Можно изменить одну настройку, сохранив остальные.",
 why:"Предложенный вариант связан с выбранной темой «{topic}» и текущим каталогом. Его можно заменить.",
 steps:"Мы на этапе «{stage}». Дальше: сценарий, идея, слова поддержки, настройки и подтверждение перед созданием.",
 unknown:"Могу объяснить сюжет, формат, музыку, голос, текст, длительность и создание. Что именно хотите узнать?"
 },
 en:{
 cost:"You can assemble a film from approved sources without paid AI generation. Paid services are not started automatically.",
 privacy:"This chat interprets replies locally. Sharing text with external AI requires separate consent; photos and voice files are not sent through this reply parser.",
 ai:"Core dialogue runs locally. External AI is optional, requires consent and confirmed free access, and cannot render for you.",
 footage:"The 120 stories are concepts, not 120 exact filmed videos. Exports use verified sources, and substitutes are clearly disclosed.",
 photo:"Use the photo button beside the chat input to add an image.",
 voice:"Voice and audio guides are configured separately from music in the audio editor.",
 phrases:"Choose prepared phrases, change tone or speaker, write a short phrase, or hide captions.",
 music:"Music can be chosen or muted separately from narration and captions.",
 format:"Available formats: vertical 9:16, landscape 16:9, and square 1:1. Vertical often suits stories.",
 duration:"Choose 10, 15, 20, 30 or 60 seconds. Unsupported durations require clarification.",
 preview:"Review and confirm the proposed plan before rendering. Open the result once it actually finishes.",
 options:"Available choices: {options}. Say a number, label or 'choose for me'.",
 current:"Current choices: {summary}. You can change one setting while preserving the rest.",
 why:"This suggestion follows the selected topic '{topic}' and available footage. You can change it.",
 steps:"Current step: '{stage}'. The next steps lead through story, idea, phrases, settings and confirmation before rendering.",
 unknown:"I can explain story choices, format, music, voice, captions, duration and rendering. What would you like to know?"
 },
 es:{
 cost:"Puedes montar un vídeo con fuentes autorizadas sin activar IA de pago automáticamente.",
 privacy:"El chat interpreta respuestas localmente. Enviar texto a una IA externa requiere consentimiento; el analizador no envía fotos ni grabaciones.",
 ai:"La conversación funciona localmente. La IA externa es opcional, requiere consentimiento y acceso gratuito confirmado, y no crea el vídeo sin tu permiso.",
 footage:"Los 120 guiones son conceptos, no 120 vídeos ya filmados. La exportación usa fuentes verificadas y marca las alternativas.",
 photo:"Usa el botón de foto junto al campo de texto.",
 voice:"La voz y la audioguía se configuran por separado de la música.",
 phrases:"Elige frases preparadas, cambia su tono, escribe una frase breve o quita el texto.",
 music:"Puedes elegir o silenciar la música sin afectar automáticamente la voz ni los subtítulos.",
 format:"Formatos: vertical 9:16, horizontal 16:9 y cuadrado 1:1.",
 duration:"Duraciones: 10, 15, 20, 30 o 60 segundos. Las demás necesitan confirmación.",
 preview:"Primero revisa y confirma el guion. El resultado se abre cuando termina el montaje.",
 options:"Opciones disponibles: {options}. Di el número, el nombre o «elige por mí».",
 current:"Opciones actuales: {summary}. Puedes cambiar un ajuste y conservar los demás.",
 why:"La propuesta se basa en el tema '{topic}' y el material disponible. Puedes cambiarla.",
 steps:"Etapa actual: '{stage}'. Después vienen guion, idea, frases, ajustes y confirmación.",
 unknown:"Puedo explicar los guiones, formatos, música, voz, frases, duración y creación. ¿Qué deseas saber?"
 }};
export function classifyVideoChatQuestion(raw){
 const s=clean(raw);
 if(!s||s.length>270||imperative.test(s))return null;
 const shortYesNo=/^(?:это|нужн\p{L}*|платно|бесплатно|is|are|do|does|es|usa[sn]|mis|se)(?=\s|$)/iu.test(s)&&
  /[?？]/u.test(String(raw));
 if(!question.test(s)&&!shortYesNo)return null;
 if(/^(?:почему|зачем|why|por qu[eé])(?=\s|$)/iu.test(s))return "why";
 if(/(?:сколько (?:это )?стоит|во сколько обойд|потребуются деньги|cu[aá]nto cuesta|how much (?:does it )?cost)/iu.test(s))return "cost";
 for(const [kind,rx] of topics)if(rx.test(s))return kind;
 return "unknown";
}
export function answerVideoChatQuestion(kind,{locale="ru",stage="category",options=[],selected={}}={}){
 const t=copy[locale]||copy.ru;
 if(kind==="options"){
  const labels=Array.isArray(options)?options.filter(x=>typeof x==="string"&&x.length<110).slice(0,6):[];
  return labels.length?t.options.replace("{options}",labels.map((v,i)=>String(i+1)+". "+v).join("; ")):t.unknown;
 }
 if(kind==="current"){
  const summary=[selected.category,selected.topic,selected.story,
    selected.duration?String(selected.duration)+" s":null,selected.aspect,selected.music].filter(Boolean).join(", ");
  return summary?t.current.replace("{summary}",summary):t.unknown;
 }
 if(kind==="why")return selected.topic?t.why.replace("{topic}",String(selected.topic).slice(0,96)):t.unknown;
 if(kind==="steps")return t.steps.replace("{stage}",stage);
 return t[kind]||t.unknown;
}
