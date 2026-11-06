// First-party CRM Telegram home menu. No network, clinical data, or inferred consent.
export const TELEGRAM_HOME_CONSENT_VERSION='hh-tg-daily-companion-v1';
export const TELEGRAM_HOME_TIMEZONE='America/Toronto';
export const menuLocale=(value)=>['ru','en','es'].includes(value)?value:'en';
const MENU={
 ru:{
  buttons:[['💬 AI-чат','✅ Чекин'],['🧘 Медитация','🎬 Создать видео'],['📚 Мои материалы','🤝 Личный разбор'],['🌅 Каждый день','🌐 Язык']],
  welcome:'Привет! ☀️ Я помощник Holistic House. Давай пообщаемся. Что тебе сейчас больше всего нужно?\n\nВыбери кнопку внизу или напиши /menu, чтобы снова открыть панель. Личный разбор — отдельный запрос к мастеру.',
  aiConsent:'🤖 AI-помощник здесь отвечает по проверенным правилам, не является живым психотерапевтом и не читает медицинские данные. Ответы не отправляются внешней модели. Чтобы начать отдельный AI-диалог, нажми «Включить AI».',
  aiOn:'💬 AI-чат включён. Напиши, что сейчас актуально. Это пока ответы по проверенным правилам, не генеративная модель. Выйти: /ai_off. Меню: /menu.',
  aiOff:'AI-чат остановлен. Другие функции бота и подписка не изменены. /menu — главное меню.',
  checkin:'✅ Небольшой чекин. Оцени от 0 до 10, насколько сейчас хватает энергии (0 — совсем нет, 10 — очень много). Напиши одно число. Можно /menu для выхода. Чекин не является диагнозом.',
  checkinAnswer:'Спасибо! Этот ответ остаётся в переписке Telegram и не сохраняется как медицинский результат. Можно сравнить самочувствие позже или пройти тесты: https://holistichouse.vercel.app/ru/tests . /menu — меню.',
  meditation:'🧘 Подбери мягкую практику из нашей библиотеки: https://holistichouse.vercel.app/ru/holistic-support/mobile . Напиши в AI-чате, хочешь спокойствия, бодрости или сосредоточенности.',
  video:'🎬 Создать персональное видео можно в студии: https://holistichouse.vercel.app/ru/holistic-support/mandala . Отправка готового MP4 через этот бот пока требует отдельного подтверждения и не запущена.',
  materials:'📚 Открой общедоступную библиотеку: https://holistichouse.vercel.app/ru/books . Материалы твоей подписки остаются в уже полученных сообщениях; закрытые материалы бот здесь не считывает.',
  dailyConsent:'🌅 Хочешь получать каждое утро в 09:00 по времени Торонто одно короткое приветствие с меню практик? Это отдельная добровольная подписка, без рекламы, тестовых баллов и личной информации. В любое время /daily_off. Включить?',
  dailyOn:'🌅 Утреннее приветствие включено на 09:00 по времени Торонто. Отменить: /daily_off. Открыть меню: /menu.',
  dailyOff:'Ежедневное приветствие выключено. Меню и личная переписка остаются доступны: /menu.',
  dailyWelcome:'☀️ Доброе утро! Как ты сегодня? Можно сделать чекин, выбрать медитацию или просто поговорить с AI. Нажми кнопку в меню, когда захочешь. Убрать ежедневное сообщение: /daily_off.',
  language:'🌐 Выбери язык бота: /lang_ru · /lang_en · /lang_es.',
  review:'🤝 Для личного разбора я задам несколько вопросов. Начнём с твоего отдельного согласия.',
  urgent:'Если есть непосредственная опасность для жизни или здоровья, позвони в местную экстренную службу или обратись к человеку, которому доверяешь.',
  aiPromptExpired:'Пожалуйста, снова выбери AI-чат, чтобы подтвердить согласие.',
  dailyPromptExpired:'Пожалуйста, снова выбери «Каждый день», чтобы подтвердить подписку.',
 },
 en:{
  buttons:[['💬 AI chat','✅ Check-in'],['🧘 Meditation','🎬 Create video'],['📚 My materials','🤝 Personal review'],['🌅 Every morning','🌐 Language']],
  welcome:'Hello! ☀️ I’m your Holistic House guide. We can talk, check in or explore a practice. What would help today?\n\nChoose a button below or type /menu to reopen it. A personal review is a separate request to a practitioner.',
  aiConsent:'🤖 This assistant uses reviewed rules; it is not a therapist or a generative model. It does not read medical records or share your messages with external AI. Choose Enable AI to enter a separate chat.',
  aiOn:'💬 AI chat enabled. Ask what matters today. This currently uses reviewed guidance, not a generative model. Exit: /ai_off. Menu: /menu.',
  aiOff:'AI chat disabled. Your materials and other bot features stay available. /menu — home.',
  checkin:'✅ Quick check-in: from 0 to 10, how much energy do you have right now? Send one number, or /menu to exit. This is not a diagnosis.',
  checkinAnswer:'Thank you! Your answer stays in this Telegram conversation, not in a medical record. For optional questionnaires: https://holistichouse.vercel.app/en/tests . /menu — home.',
  meditation:'🧘 Find a gentle practice: https://holistichouse.vercel.app/en/holistic-support/mobile . You can discuss calm, energy or focus in AI chat.',
  video:'🎬 Video Studio: https://holistichouse.vercel.app/en/holistic-support/mandala . Private MP4 delivery through this bot is not yet enabled or confirmed.',
  materials:'📚 Public library: https://holistichouse.vercel.app/en/books . Your subscribed materials remain in earlier messages; this bot does not read private files here.',
  dailyConsent:'🌅 Receive one small daily hello at 9:00 AM Toronto time, with easy access to chat and practices? This is separate, optional and not marketing. No personal scores. Switch off any time: /daily_off. Enable?',
  dailyOn:'🌅 Daily hello enabled for 9:00 AM Toronto time. Stop: /daily_off. Menu: /menu.',
  dailyOff:'Daily greeting turned off. You can still use /menu or chat at any time.',
  dailyWelcome:'☀️ Good morning! How are you today? You can check in, choose a practice or talk with AI when ready. Stop these greetings: /daily_off.',
  language:'🌐 Choose language: /lang_ru · /lang_en · /lang_es.',
  review:'🤝 A personal review has its own questions and consent.',
  urgent:'If you are in immediate danger, contact local emergency services or someone you trust.',
  aiPromptExpired:'Please open AI chat again to consent.',
  dailyPromptExpired:'Please open the morning greeting option again to subscribe.',
 },
 es:{
  buttons:[['💬 Chat IA','✅ Registro'],['🧘 Meditación','🎬 Crear vídeo'],['📚 Mis materiales','🤝 Revisión personal'],['🌅 Cada mañana','🌐 Idioma']],
  welcome:'¡Hola! ☀️ Soy tu guía de Holistic House. Podemos conversar, hacer una pausa o explorar una práctica. ¿Qué necesitas hoy?\n\nElige una opción abajo o escribe /menu. La revisión personal es una solicitud independiente.',
  aiConsent:'🤖 Este asistente usa reglas revisadas: no es terapeuta ni modelo generativo. No lee expedientes ni comparte mensajes con IA externa. Elige Activar IA para conversar.',
  aiOn:'💬 Chat IA activado. Cuéntame tu pregunta. Por ahora responde con reglas, no con un modelo generativo. Salir: /ai_off. Menú: /menu.',
  aiOff:'Chat IA desactivado. Otros materiales y funciones siguen disponibles. /menu — inicio.',
  checkin:'✅ Registro breve: ¿cuánta energía tienes ahora, del 0 al 10? Escribe un número o /menu para salir. No es un diagnóstico.',
  checkinAnswer:'¡Gracias! La respuesta queda en este chat de Telegram, no en un registro médico. Pruebas opcionales: https://holistichouse.vercel.app/es/tests . /menu — inicio.',
  meditation:'🧘 Prácticas suaves: https://holistichouse.vercel.app/es/holistic-support/mobile . Podemos hablar de calma, energía o concentración.',
  video:'🎬 Estudio de vídeo: https://holistichouse.vercel.app/es/holistic-support/mandala . La entrega de MP4 privado por este bot aún no está activada.',
  materials:'📚 Biblioteca pública: https://holistichouse.vercel.app/es/books . Tus materiales recibidos siguen en los mensajes anteriores; no leo archivos privados aquí.',
  dailyConsent:'🌅 ¿Quieres recibir un saludo diario a las 09:00 de Toronto, con opciones de chat y prácticas? Es opcional, sin publicidad ni puntuaciones personales. Desactivar: /daily_off. ¿Activar?',
  dailyOn:'🌅 Saludo diario activado para las 09:00 de Toronto. Detener: /daily_off. Menú: /menu.',
  dailyOff:'Saludo diario desactivado. Puedes abrir /menu cuando quieras.',
  dailyWelcome:'☀️ ¡Buenos días! ¿Cómo estás? Puedes hacer un registro, escoger una práctica o hablar con la IA. Detener saludos: /daily_off.',
  language:'🌐 Elige idioma: /lang_ru · /lang_en · /lang_es.',
  review:'🤝 La revisión personal requiere preguntas y consentimiento independientes.',
  urgent:'Si estás en peligro inmediato, contacta con emergencias locales o alguien de confianza.',
  aiPromptExpired:'Vuelve a abrir el chat IA para confirmar.',
  dailyPromptExpired:'Vuelve a seleccionar el saludo diario para activar.',
 }
};
const LABELS=Object.freeze(Object.fromEntries(Object.entries(MENU).flatMap(([locale,value])=>value.buttons.flat().map((label,i)=>[label.toLocaleLowerCase(),{locale,action:['ai','checkin','meditation','video','materials','review','daily','language'][i]}]))));
const VALID_COMMAND=Object.freeze({start:'home',menu:'home',home:'home',help:'home',today:'home',ai:'ai',ai_on:'ai_on',ai_off:'ai_off',checkin:'checkin',meditation:'meditation',video:'video',materials:'materials',review:'review',master:'review',daily:'daily',daily_on:'daily_on',daily_off:'daily_off',lang_ru:'lang_ru',lang_en:'lang_en',lang_es:'lang_es'});
export function parseTelegramHomeAction(text,botUsername=''){
 const raw=String(text||'').trim();
 if(!raw||raw.length>1200)return null;
 const found=LABELS[raw.toLocaleLowerCase()];if(found)return found;
 const command=/^\/([a-z_]+)(?:@([A-Za-z0-9_]{5,32}))?$/i.exec(raw);
 if(command){
  if(command[2]&&command[2].toLowerCase()!==String(botUsername).replace(/^@/,'').toLowerCase())return null;
  return Object.hasOwn(VALID_COMMAND,command[1].toLowerCase())?{action:VALID_COMMAND[command[1].toLowerCase()],locale:null}:null;
 }
 if(/^(?:привет(?:ствую)?|здравствуй(?:те)?|ау|privet|hello|hi|hola)[!.,\s]*$/iu.test(raw))return {action:'home',locale:/[а-яё]/iu.test(raw)?'ru':/hola/i.test(raw)?'es':null};
 return null;
}
export function telegramMenuKeyboard(locale){
 const lang=menuLocale(locale);return {keyboard:MENU[lang].buttons.map(row=>row.map(text=>({text}))),resize_keyboard:true,is_persistent:true,one_time_keyboard:false,input_field_placeholder:lang==='ru'?'Напиши вопрос или выбери кнопку':lang==='es'?'Escribe o elige una opción':'Write or choose an option'};
}
export function companionMessage(locale,key){return MENU[menuLocale(locale)][key]||MENU.en.welcome;}
export function telegramCompanionConsentButtons(kind,locale){
 const lang=menuLocale(locale);
 if(kind!=='ai'&&kind!=='daily')return null;
 const labels=lang==='ru'?['✅ Включить','Не сейчас']:lang==='es'?['✅ Activar','Ahora no']:['✅ Enable','Not now'];
 return {inline_keyboard:[[{text:labels[0],callback_data:'hhhome:'+lang+':'+kind+'_on'},{text:labels[1],callback_data:'hhhome:'+lang+':home'}]]};
}
export function parseTelegramHomeCallback(data){
 const x=/^hhhome:(ru|en|es):(ai_on|daily_on|home)$/.exec(String(data||''));
 return x?{locale:x[1],action:x[2]}:null;
}
export function companionLocalDate(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:TELEGRAM_HOME_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function companionDailyDue(date=new Date()){const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:TELEGRAM_HOME_TIMEZONE,hour:'2-digit',hourCycle:'h23'}).format(date));return hour===9;}
