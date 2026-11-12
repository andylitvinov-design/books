// First-party CRM Telegram home menu. No network, clinical data, or inferred consent.
export const TELEGRAM_HOME_CONSENT_VERSION='hh-tg-daily-companion-v1';
export const TELEGRAM_HOME_TIMEZONE='America/Toronto';
export const menuLocale=(value)=>['ru','en','es'].includes(value)?value:'en';
// Private Telegram chat identifiers are positive decimal numbers. Keep this
// check in pure policy code so provider sends cannot silently reject every ID.
export function telegramHomeRecipientAllowed(value){
 return /^[1-9][0-9]{0,24}$/.test(String(value??''));
}
// Opt-out is never blocked by the daily conversational reply budget. Even at
// the limit, the caller must cap its persisted reply_count to the DB maximum.
export function companionReplyBudgetAllows(action,count,limit=40,currentMode=null){
 // A selected mood button may finish an ACTIVE check-in even at quota, but
 // stale/forged callbacks may not bypass the general send budget indefinitely.
 return action==='ai_off'||action==='daily_off'||
   (currentMode==='checkin'&&/^checkin_[1-5]$/.test(String(action)))||
   (Number.isInteger(count)&&count>=0&&count<limit);
}
const MENU={
 ru:{
  cabinet:'🏠 Ваш личный кабинет Holistic House хранит тесты, отчёты, практики и личные материалы. Нажмите кнопку ниже, чтобы открыть сайт.\n\nЕсли у вас уже есть кабинет Google, войдите в прежний аккаунт. Telegram можно добавить как способ входа в настройках после подтверждения личности. Одна ссылка из бота не подтверждает личность и не подписывает на рассылку.',
  buttons:[['🏠 Мой кабинет'],['💬 AI-чат','✅ Чекин'],['🧘 Медитация','🎬 Создать видео'],['📚 Мои материалы','🤝 Личный разбор'],['🌅 Каждый день','🌐 Язык']],
  welcome:"Готово, ты с нами 🙌\n\nЧто забираешь первым? Жми, пришлю прямо сюда. Можно выбрать всё!\n\nИли просто напиши свой вопрос 👇",
  registrationWelcome:"Привет! Это Holistic House 🌿\n\nНажми «✅ Начать» — покажу, что интересного у нас есть 👇",

  aiConsent:'🤖 AI-помощник здесь отвечает по проверенным правилам, не является живым психотерапевтом и не читает медицинские данные. Ответы не отправляются внешней модели. Чтобы начать отдельный AI-диалог, нажми «Включить AI».',
  aiOn:'💬 AI-чат включён. Напиши, что сейчас актуально. Это пока ответы по проверенным правилам, не генеративная модель. Выйти: /ai_off. Меню: /menu.',
  aiOff:'AI-чат остановлен. Другие функции бота и подписка не изменены. /menu — главное меню.',
  checkin:'✅ Как ты сейчас себя чувствуешь? Выбери один из пяти смайликов ниже (или напиши число от 0 до 10). Это добровольная самооценка, не диагноз; я не сохраняю её в базе.',
  checkinExpired:'Этот чекин уже завершён. Нажми «✅ Чекин», если хочешь начать заново.',
  checkinAnswer:'Спасибо! Этот ответ остаётся в переписке Telegram и не сохраняется как медицинский результат. Можно сравнить самочувствие позже или пройти тесты: https://holistichouse.vercel.app/ru/tests . /menu — меню.',
  meditation:'🧘 Подбери мягкую практику из нашей библиотеки: https://holistichouse.vercel.app/ru/holistic-support/mobile . Напиши в AI-чате, хочешь спокойствия, бодрости или сосредоточенности.',
  video:'🎬 Создать персональное видео можно в студии: https://holistichouse.vercel.app/ru/holistic-support/mandala . Отправка готового MP4 через этот бот пока требует отдельного подтверждения и не запущена.',
  materials:'📚 Открой общедоступную библиотеку: https://holistichouse.vercel.app/ru/books . Материалы твоей подписки остаются в уже полученных сообщениях; закрытые материалы бот здесь не считывает.',
  dailyConsent:'🌅 Хочешь получать каждое утро в 09:00 по времени Торонто одно короткое приветствие с меню практик? Это отдельная добровольная подписка, без рекламы, тестовых баллов и личной информации. В любое время /daily_off. Включить?',
  dailyOn:'🌅 Утреннее приветствие включено на 09:00 по времени Торонто. Отменить: /daily_off. Открыть меню: /menu.',
  dailyOff:'Ежедневное приветствие выключено. Меню и личная переписка остаются доступны: /menu.',
  dailyWelcome:'☀️ Доброе утро! Как ты сегодня? Можно сделать чекин, выбрать медитацию или просто поговорить с AI. Нажми кнопку в меню, когда захочешь. Убрать ежедневное сообщение: /daily_off.',
  language:'🌐 Выбери язык бота: /lang_ru · /lang_en.',
  review:'🤝 Для личного разбора я задам несколько вопросов. Начнём с твоего отдельного согласия.',
  urgent:'Если есть непосредственная опасность для жизни или здоровья, позвони в местную экстренную службу или обратись к человеку, которому доверяешь.',
  aiPromptExpired:'Пожалуйста, снова выбери AI-чат, чтобы подтвердить согласие.',
  dailyPromptExpired:'Пожалуйста, снова выбери «Каждый день», чтобы подтвердить подписку.',
 },
 en:{
  cabinet:'🏠 Your Holistic House Cabinet holds your tests, reports, practices and private materials. Tap the button below to open the website.\n\nAlready have a Google Cabinet? Sign in to that same account. You can link Telegram as another sign-in method in Settings after verification. This bot link does not sign you in or subscribe you to messages.',
  buttons:[['🏠 My Cabinet'],['💬 AI chat','✅ Check-in'],['🧘 Meditation','🎬 Create video'],['📚 My materials','🤝 Personal review'],['🌅 Every morning','🌐 Language']],
  welcome:"You're in! 🙌\n\nWhat would you like first? Tap below and I'll show you. You can explore everything!\n\nOr just type your question 👇",
  registrationWelcome:"Hi! This is Holistic House 🌿\n\nTap “✅ Get started” and I'll show you what's here 👇",

  aiConsent:'🤖 This assistant uses reviewed rules; it is not a therapist or a generative model. It does not read medical records or share your messages with external AI. Choose Enable AI to enter a separate chat.',
  aiOn:'💬 AI chat enabled. Ask what matters today. This currently uses reviewed guidance, not a generative model. Exit: /ai_off. Menu: /menu.',
  aiOff:'AI chat disabled. Your materials and other bot features stay available. /menu — home.',
  checkin:'✅ How do you feel right now? Choose one of the five faces below (or send 0–10). This is optional, not a diagnosis, and no score is saved in the database.',
  checkinExpired:'This check-in has ended. Choose ✅ Check-in to start again.',
  checkinAnswer:'Thank you! Your answer stays in this Telegram conversation, not in a medical record. For optional questionnaires: https://holistichouse.vercel.app/en/tests . /menu — home.',
  meditation:'🧘 Find a gentle practice: https://holistichouse.vercel.app/en/holistic-support/mobile . You can discuss calm, energy or focus in AI chat.',
  video:'🎬 Video Studio: https://holistichouse.vercel.app/en/holistic-support/mandala . Private MP4 delivery through this bot is not yet enabled or confirmed.',
  materials:'📚 Public library: https://holistichouse.vercel.app/en/books . Your subscribed materials remain in earlier messages; this bot does not read private files here.',
  dailyConsent:'🌅 Receive one small daily hello at 9:00 AM Toronto time, with easy access to chat and practices? This is separate, optional and not marketing. No personal scores. Switch off any time: /daily_off. Enable?',
  dailyOn:'🌅 Daily hello enabled for 9:00 AM Toronto time. Stop: /daily_off. Menu: /menu.',
  dailyOff:'Daily greeting turned off. You can still use /menu or chat at any time.',
  dailyWelcome:'☀️ Good morning! How are you today? You can check in, choose a practice or talk with AI when ready. Stop these greetings: /daily_off.',
  language:'🌐 Choose language: /lang_ru · /lang_en.',
  review:'🤝 A personal review has its own questions and consent.',
  urgent:'If you are in immediate danger, contact local emergency services or someone you trust.',
  aiPromptExpired:'Please open AI chat again to consent.',
  dailyPromptExpired:'Please open the morning greeting option again to subscribe.',
 },
 es:{
  cabinet:'🏠 Tu espacio de Holistic House guarda tus tests, informes, prácticas y materiales privados. Pulsa el botón para abrir el sitio.\n\n¿Ya usas Google? Entra en la misma cuenta. Puedes vincular Telegram como otra forma de acceso desde Ajustes, tras verificar tu identidad. Este enlace no inicia sesión ni suscribe a mensajes.',
  buttons:[['🏠 Mi espacio'],['💬 Chat IA','✅ Registro'],['🧘 Meditación','🎬 Crear vídeo'],['📚 Mis materiales','🤝 Revisión personal'],['🌅 Cada mañana','🌐 Idioma']],
  welcome:'¡Hola! ☀️ Soy tu guía de Holistic House. Podemos conversar, hacer una pausa o explorar una práctica. ¿Qué necesitas hoy?\n\nElige una opción abajo o escribe /menu. La revisión personal es una solicitud independiente.',
  registrationWelcome:"¡Hola! 👋 Bienvenido a Holistic House.\n\nSoy el asistente automático del proyecto. Pulsa «✅ Empezar» para ver las opciones.\n\n✅ 💬 Chat IA (con consentimiento aparte)\n✅ 🧘 Meditaciones y prácticas suaves\n✅ 🎬 Crear un vídeo personal en la web\n✅ 📚 Biblioteca y materiales\n✅ 🤝 Solicitar una revisión personal\n✅ 🌅 Saludos matutinos opcionales\n\nEste botón solo abre el menú: no verifica tu identidad ni te suscribe a publicidad. Si ya tienes un perfil web, puedes vincular Telegram por separado en los ajustes.",

  aiConsent:'🤖 Este asistente usa reglas revisadas: no es terapeuta ni modelo generativo. No lee expedientes ni comparte mensajes con IA externa. Elige Activar IA para conversar.',
  aiOn:'💬 Chat IA activado. Cuéntame tu pregunta. Por ahora responde con reglas, no con un modelo generativo. Salir: /ai_off. Menú: /menu.',
  aiOff:'Chat IA desactivado. Otros materiales y funciones siguen disponibles. /menu — inicio.',
  checkin:'✅ ¿Cómo te sientes ahora? Elige una de las cinco caras (o escribe 0–10). Es opcional, no es diagnóstico y no guardo la puntuación en la base.',
  checkinExpired:'Este registro ya terminó. Elige ✅ Registro para empezar de nuevo.',
  checkinAnswer:'¡Gracias! La respuesta queda en este chat de Telegram, no en un registro médico. Pruebas opcionales: https://holistichouse.vercel.app/es/tests . /menu — inicio.',
  meditation:'🧘 Prácticas suaves: https://holistichouse.vercel.app/es/holistic-support/mobile . Podemos hablar de calma, energía o concentración.',
  video:'🎬 Estudio de vídeo: https://holistichouse.vercel.app/es/holistic-support/mandala . La entrega de MP4 privado por este bot aún no está activada.',
  materials:'📚 Biblioteca pública: https://holistichouse.vercel.app/es/books . Tus materiales recibidos siguen en los mensajes anteriores; no leo archivos privados aquí.',
  dailyConsent:'🌅 ¿Quieres recibir un saludo diario a las 09:00 de Toronto, con opciones de chat y prácticas? Es opcional, sin publicidad ni puntuaciones personales. Desactivar: /daily_off. ¿Activar?',
  dailyOn:'🌅 Saludo diario activado para las 09:00 de Toronto. Detener: /daily_off. Menú: /menu.',
  dailyOff:'Saludo diario desactivado. Puedes abrir /menu cuando quieras.',
  dailyWelcome:'☀️ ¡Buenos días! ¿Cómo estás? Puedes hacer un registro, escoger una práctica o hablar con la IA. Detener saludos: /daily_off.',
  language:'🌐 Elige idioma: /lang_ru · /lang_en.',
  review:'🤝 La revisión personal requiere preguntas y consentimiento independientes.',
  urgent:'Si estás en peligro inmediato, contacta con emergencias locales o alguien de confianza.',
  aiPromptExpired:'Vuelve a abrir el chat IA para confirmar.',
  dailyPromptExpired:'Vuelve a seleccionar el saludo diario para activar.',
 }
};

// Inline-only RU/EN client discovery menu. The historical Spanish diagnostics
// remain supported but are never added to this new six-choice screen.
export const TELEGRAM_EXPLORE_ACTIONS=Object.freeze(['tests','stress','reiki','love','consultation','cabinet']);
export const TELEGRAM_EXPLORE_PHOTO='https://holistichouse.vercel.app/images/holistic-house/andy-about.png';
const EXPLORE={
 ru:{
  labels:['🧠 Бесплатные тесты','🌿 Антистресс-практики','🎓 Бесплатное обучение Reiki','❤️ Любовь и отношения','💬 Личная консультация','👤 Мой кабинет'],
  descriptions:['🧠 Бесплатные тесты самочувствия и личности. Выбери интересную тему.','🌿 Мягкие практики и медитации для самоподдержки.','🎓 Начни знакомство с бесплатным обучением Reiki.','❤️ Исследуй отношения, доверие и личные границы.','💬 Выбери формат консультации. Заявка — ещё не подтверждённая запись.','👤 Твои тесты, курсы и прогресс. Вход в кабинет — на сайте.'],
  paths:['/ru/tests','/ru/holistic-support/mobile','/ru/courses','/ru/explore/love','/ru/services#consultation','/ru/app'],
  open:'Открыть на сайте',back:'⬅️ Меню'
 },
 en:{
  labels:['🧠 Free self-tests','🌿 Stress relief practices','🎓 Free Reiki training','❤️ Love & relationships','💬 Personal consultation','👤 My Cabinet'],
  descriptions:['🧠 Explore free wellbeing and personality tests.','🌿 Find gentle meditations and self-support practices.','🎓 Discover free Reiki learning and the Academy.','❤️ Explore relationships, trust and boundaries.','💬 Choose a consultation format. A request is not a confirmed booking.','👤 Your tests, courses and progress. Sign in on the website.'],
  paths:['/en/tests','/en/holistic-support/mobile','/en/academy/principles-of-energywork/learn','/en/explore/love','/en/services#consultation','/en/app'],
  open:'Open on website',back:'⬅️ Menu'
 }
};
export const telegramExploreLocale=x=>x==='ru'?'ru':'en';
export function telegramExploreMenuButtons(locale){
 const lang=telegramExploreLocale(locale);
 return {inline_keyboard:EXPLORE[lang].labels.map((text,i)=>[{
  text,callback_data:'hhhome:'+lang+':'+TELEGRAM_EXPLORE_ACTIONS[i]
 }])};
}
export function telegramExploreDetailText(locale,action){
 const lang=telegramExploreLocale(locale),idx=TELEGRAM_EXPLORE_ACTIONS.indexOf(action);
 return idx<0?null:EXPLORE[lang].descriptions[idx];
}
export function telegramExploreDetailButtons(locale,action){
 const lang=telegramExploreLocale(locale),idx=TELEGRAM_EXPLORE_ACTIONS.indexOf(action);
 if(idx<0)return null;
 return {inline_keyboard:[
  [{text:EXPLORE[lang].open,url:'https://holistichouse.vercel.app'+EXPLORE[lang].paths[idx]}],
  [{text:EXPLORE[lang].back,callback_data:'hhhome:'+lang+':home'}]
 ]};
}


// A plain question after Home must offer an explicit AI consent prompt,
// not fall through to the unrelated CRM diagnostic or save its raw content.
export function telegramMenuFreeTextIntent({
 selected=null,stop=false,diagnostic=false,mode=null,rawText='',inlineAction=null,photoFileId=null
}={}){
 const raw=String(rawText||'').trim();
 return !selected&&!stop&&!diagnostic&&mode==='menu'&&!inlineAction&&!photoFileId&&
  raw.length>0&&raw.length<=1200&&!raw.startsWith('/')&&
  !/^(?:стоп|остановить(?: диалог)?|stop|parar|detener)$/iu.test(raw);
}

const LABELS=Object.freeze(Object.fromEntries(Object.entries(MENU).flatMap(([locale,value])=>value.buttons.flat().map((label,i)=>[label.toLocaleLowerCase(),{locale,action:['cabinet','ai','checkin','meditation','video','materials','review','daily','language'][i]}]))));
const VALID_COMMAND=Object.freeze({start:'home',menu:'home',home:'home',cabinet:'cabinet',help:'home',today:'home',ai:'ai',ai_on:'ai_on',ai_off:'ai_off',checkin:'checkin',meditation:'meditation',video:'video',materials:'materials',review:'review',master:'review',daily:'daily',daily_on:'daily_on',daily_off:'daily_off',lang_ru:'lang_ru',lang_en:'lang_en',lang_es:'lang_es'});
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
// Public navigation only: no personal token, bot user ID or implicit session.
export function telegramCabinetLinkButtons(locale){
 const lang=menuLocale(locale)
 const name=lang==='ru'?'🏠 Открыть мой кабинет':lang==='es'?'🏠 Abrir mi espacio':'🏠 Open my Cabinet'
 return {inline_keyboard:[[{text:name,url:'https://holistichouse.vercel.app/'+lang+'/app'}]]}
}
export function companionMessage(locale,key){return MENU[menuLocale(locale)][key]||MENU.en.welcome;}
// One first-start action is not a CAPTCHA, sign-in or messaging opt-in.
export function telegramCompanionRegistrationButtons(locale){
 const lang=menuLocale(locale);
 const labels={ru:'✅ Начать',en:'✅ Get started',es:'✅ Empezar'};
 return {inline_keyboard:[[{text:labels[lang],callback_data:'hhhome:'+lang+':home'}]]};
}
export function telegramCompanionConsentButtons(kind,locale){
 const lang=menuLocale(locale);
 if(kind!=='ai'&&kind!=='daily')return null;
 const labels=lang==='ru'?['✅ Включить','Не сейчас']:lang==='es'?['✅ Activar','Ahora no']:['✅ Enable','Not now'];
 return {inline_keyboard:[[{text:labels[0],callback_data:'hhhome:'+lang+':'+kind+'_on'},{text:labels[1],callback_data:'hhhome:'+lang+':home'}]]};
}
export function parseTelegramHomeCallback(data){
 const x=/^hhhome:(ru|en|es):(ai_on|daily_on|home|checkin_[1-5]|tests|stress|reiki|love|consultation|cabinet)$/.exec(String(data||''));
 return x&&!(x[1]==='es'&&TELEGRAM_EXPLORE_ACTIONS.includes(x[2]))?{locale:x[1],action:x[2]}:null;
}
/**
 * Exactly five fixed choices. Callback contains only a tiny value, no user ID,
 * score history or private text. Never interpreted as authorization to persist.
 */
export function telegramCompanionCheckinButtons(locale){
 const lang=menuLocale(locale);
 return {inline_keyboard:[['😟','😕','😐','🙂','😄'].map((face,index)=>({
  text:face,callback_data:'hhhome:'+lang+':checkin_'+(index+1)
 }))]};
}
export function companionCheckinReply(locale,choice){
 const lang=menuLocale(locale);
 if(!Number.isInteger(choice)||choice<1||choice>5)return companionMessage(lang,'checkinExpired');
 const replies={
  ru:['Спасибо, принято. Если сейчас тяжело, можешь поговорить со мной через «💬 AI-чат».','Спасибо, принято. Можем обсудить, что сегодня непросто.','Спасибо, принято. Если захочешь, можем просто поговорить.','Спасибо, принято. Хорошо, что ты заметил своё состояние.','Спасибо, принято. Можем обсудить, что поддержало тебя сегодня.'],
  en:['Thank you, noted. If things feel hard, you can talk through 💬 AI chat.','Thank you, noted. We can talk about what feels difficult.','Thank you, noted. We can simply talk if you like.','Thank you, noted. Thanks for checking in with yourself.','Thank you, noted. We can explore what supported you today.'],
  es:['Gracias, recibido. Si se hace difícil, puedes hablar por 💬 Chat IA.','Gracias, recibido. Podemos hablar de lo que pesa hoy.','Gracias, recibido. Podemos conversar si quieres.','Gracias, recibido. Gracias por notar cómo te sientes.','Gracias, recibido. Podemos explorar qué te ayudó hoy.']
 };
 return replies[lang][choice-1];
}
export function companionLocalDate(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:TELEGRAM_HOME_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function companionDailyDue(date=new Date()){const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:TELEGRAM_HOME_TIMEZONE,hour:'2-digit',hourCycle:'h23'}).format(date));return hour===9;}

/** pg may parse DATE columns as either native Date or ISO text; compare UTC days only. */
export function companionDatabaseDay(value){
  if(value instanceof Date)return Number.isFinite(value.getTime())?value.toISOString().slice(0,10):'';
  const day=String(value??'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day)?day:'';
}
