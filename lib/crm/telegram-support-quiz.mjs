// First-party Telegram entry to the same four-topic Support quiz as the website.
// Only fixed option indices travel in callbacks. No PII, diagnosis, consent or CRM write.
export const TELEGRAM_SUPPORT_TOPICS=Object.freeze([
  'stress_energy','relationships_esteem','money_growth','business_support'
]);
const QUIZ=Object.freeze({
  en:{
    topics:['🌿 Ease stress & restore energy','❤️ Improve relationships & esteem',
      '✨ Get money & self-growth ideas','💼 Get business support'],
    needs:[
      ['Stress and tension','Low energy or fatigue','Overwhelm or worry','Everyday wellbeing'],
      ['Intimacy and partnership','Family relationships','Confidence and self-esteem','Boundaries and conflict'],
      ['Personal income ideas','Work and career direction','Self-growth ideas','Clarity and next steps'],
      ['Strategy and decisions','Clients and marketing','Team and partnerships','Growth or transition']
    ],
    formats:['Personal session','Course or practice','Videos & meditations','Help me choose'],
    businessFormats:['Business consultation','Written situation review','Talk to a specialist','Help me choose'],
    budgets:['Free','Up to €50','Up to €100',"Let's discuss"],
    questions:['What would you like support with?','Which part matters most?',
      'How would you like to begin?','Where would you like to start?',
      'How would you like Ali to help?'],
    modes:['🤝 Find practical support','🧭 Explore my goal','💬 A gentle conversation'],
    back:'← Back',home:'Main menu',
    start:'Of course 🌿 Just a few quick choices. You can also write your question at any time.',
    next:'Thanks 🌿 We can explore this at your pace.',
    consent:'With your consent, OpenRouter may process replies. The practitioner receives only a request you approve.',
    ask:'What would you like to change or understand first?',
    unavailable:'Your choices are clear. You can view matching support options on the website; live AI chat is not available right now.',
  },
  ru:{
    topics:['🌿 Снять стресс и вернуть энергию','❤️ Отношения и самооценка',
      '✨ Деньги и личный рост','💼 Поддержка бизнеса'],
    needs:[
      ['Стресс и напряжение','Усталость и мало сил','Перегрузка и тревога','Самочувствие и баланс'],
      ['Пара и близость','Семья и близкие','Уверенность в себе','Границы и конфликты'],
      ['Личный доход и деньги','Работа и карьера','Личное развитие','Ясность и следующий шаг'],
      ['Стратегия и решения','Клиенты и продвижение','Команда и партнёрство','Рост или перемены']
    ],
    formats:['Личная сессия','Курс или практика','Видео и медитации','Помогите выбрать'],
    businessFormats:['Бизнес-консультация','Письменный разбор','Обсудить со специалистом','Помогите выбрать'],
    budgets:['Бесплатно','До €50','До €100','Готов обсудить'],
    questions:['В какой теме нужна поддержка?','Что сейчас важнее всего?',
      'Как удобнее начать?','С чего хочется начать?',
      'Как вам удобнее общаться с Ali?'],
    modes:['🤝 Подобрать поддержку','🧭 Разобраться с целью','💬 Бережно поговорить'],
    back:'← Назад',home:'Главное меню',
    start:'Конечно 🌿 Давай сначала немного проясним запрос. Можно и просто написать своими словами.',
    next:'Спасибо 🌿 Можем спокойно обсудить это.',
    consent:'С вашего согласия ответы может обработать OpenRouter. Мастеру передам только одобренную вами заявку.',
    ask:'Что вам хотелось бы понять или изменить в первую очередь?',
    unavailable:'Ваш выбор понятен. Пока AI-диалог недоступен, можно посмотреть подходящие варианты поддержки на сайте.',
  }
});
export function telegramSupportLocale(value){return value==='ru'?'ru':'en';}
export function telegramSupportSelection(digits){
  if(typeof digits!=='string'||!/^[0-3]{4}[0-2]?$/.test(digits))return null;
  const [topic,need,format,budget,mode=0]=[...digits].map(Number);
  return {digits,topic:TELEGRAM_SUPPORT_TOPICS[topic],topicIndex:topic,
    needIndex:need,formatIndex:format,budgetIndex:budget,modeIndex:mode,
    chatMode:['secretary','coach','talk'][mode]};
}
export function parseTelegramSupportCallback(data){
  const m=/^hhsq:(ru|en):([0-3]{1,4}[0-2]?)$/.exec(String(data||''));
  return m?{locale:m[1],digits:m[2],action:'support'+m[2]}:null;
}
export function telegramSupportQuizText(locale,digits=''){
  if(typeof digits!=='string'||!/^[0-3]{0,4}$/.test(digits))return null;
  const t=QUIZ[telegramSupportLocale(locale)];
  const step=digits.length;
  return (step===0?t.start+'\n\n':'')+t.questions[step];
}
export function telegramSupportQuizButtons(locale,digits=''){
  if(typeof digits!=='string'||!/^[0-3]{0,4}$/.test(digits))return null;
  const lang=telegramSupportLocale(locale),t=QUIZ[lang],step=digits.length;
  const topic=Number(digits[0]||'0');
  const options=step===0?t.topics:step===1?t.needs[topic]:
    step===2?(topic===3?t.businessFormats:t.formats):
    step===3?t.budgets:t.modes;
  const rows=options.map((label,i)=>[{text:label,
    callback_data:'hhsq:'+lang+':'+digits+String(i)}]);
  const previous=step===0?'hhhome:'+lang+':home':
    step===1?'hhhome:'+lang+':support':
    'hhsq:'+lang+':'+digits.slice(0,-1);
  rows.push([{text:step===0?t.home:t.back,callback_data:previous}]);
  return {inline_keyboard:rows};
}
export function telegramSupportQuizMarkupAllowed(value){
  const first=value?.inline_keyboard?.[0]?.[0]?.callback_data;
  const parsed=parseTelegramSupportCallback(first);
  if(!parsed)return false;
  const prefix=parsed.digits.slice(0,-1);
  return JSON.stringify(value)===
    JSON.stringify(telegramSupportQuizButtons(parsed.locale,prefix));
}
export function telegramSupportStartCommand(locale,digits){
  return digits?.length===5&&telegramSupportSelection(digits)
    ?'/start hhsupport_'+telegramSupportLocale(locale)+'_'+digits:null;
}
export function telegramSupportStartSelection(text){
  const m=/^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhsupport_(ru|en)_([0-3]{4}[0-2]?)$/i.exec(String(text||'').trim());
  return m?{locale:m[1].toLowerCase(),selection:telegramSupportSelection(m[2])}:null;
}
export function telegramSupportNeedTitle(locale,digits){
  const s=telegramSupportSelection(digits);
  return s?QUIZ[telegramSupportLocale(locale)].needs[s.topicIndex][s.needIndex]:null;
}
export function telegramSupportSummary(locale,digits){
  const s=telegramSupportSelection(digits);
  if(!s)return null;
  const t=QUIZ[telegramSupportLocale(locale)];
  return [t.topics[s.topicIndex],t.needs[s.topicIndex][s.needIndex],
    (s.topicIndex===3?t.businessFormats:t.formats)[s.formatIndex],
    t.budgets[s.budgetIndex],t.modes[s.modeIndex]].join(' · ');
}
export function telegramSupportIntro(locale,digits){
  const s=telegramSupportSelection(digits);
  if(!s)return null;
  const lang=telegramSupportLocale(locale),t=QUIZ[lang];
  const need=t.needs[s.topicIndex][s.needIndex];
  if(s.modeIndex===0)return lang==='ru'
    ?'Привет! 🌿 Я Ali. Вы выбрали «'+need+'». Давайте найдём удобный первый шаг.'
    :'Hi! 🌿 I’m Ali. You chose “'+need+'”. Let’s find a comfortable next step.';
  return t.next+' '+need+'. '+t.modes[s.modeIndex]+'.\n\n'+t.consent;
}
export function telegramSupportFirstQuestion(locale,digits){
  const s=telegramSupportSelection(digits);
  if(!s)return null;
  const lang=telegramSupportLocale(locale),t=QUIZ[lang];
  if(s.modeIndex!==0)return t.ask;
  const need=t.needs[s.topicIndex][s.needIndex];
  return lang==='ru'?'Что хотелось бы изменить в теме «'+need+'»?':
    'What would you like to change around “'+need+'”?';
}
export function telegramSupportUnavailable(locale,digits){
  const t=QUIZ[telegramSupportLocale(locale)];
  return t.unavailable+'\n\n'+telegramSupportSummary(locale,digits)+'\n\nhttps://holistichouse.vercel.app/'+telegramSupportLocale(locale)+'/services';
}
