/**
 * Complaint/Problem Mind: deterministic first response to explicit user evidence.
 * No diagnosis, I/O, model, storage, checkout or side effects. Must run after
 * the existing trusted auth/rate/safety preflight. RU/EN pilot only.
 */
export const CLIENT_COMPLAINT_VERSION="hi-complaint-problem-mind-v1";
const R=[{"id":"boundary","domain":"dialogue","source":"не (?:предлагай|советуй|надо)[^\\n]{0,50}(?:совет|упражнен|практик|услуг|курс|тест)|без (?:советов|упражнени|практик|реклам)|просто (?:слушай|выслушай)|не хочу (?:коучинг|совет|упражнен|покупать)|\\b(?:don't|do not|stop)\\s+(?:suggest|recommend|sell|push|coach)|\\b(?:no advice|no coaching|just listen|stop suggesting|no exercises)\\b","flags":"iu"},{"id":"privacy","domain":"service","source":"удал[ийте]+\\s+(?:мои|мою|всю|личн)[^\\n]{0,35}(?:данн|истори|переписк)|не (?:сохраня[йт]|использу[йт])[^\\n]{0,40}(?:данн|переписк|запис)|кто видит мои (?:тесты|данные)|утечк[аие]\\s+данн|\\b(?:delete (?:my|all) (?:data|history|messages)|stop (?:saving|storing|using) my data|data leak|my privacy was violated|who can see my results)\\b","flags":"iu"},{"id":"billing","domain":"service","source":"дважды (?:списал|снял|оплат)|двойно[ей] списан|списал[ио] (?:дважды|два раза|лишн)|сняли деньги|списали деньги|оплат[аыуе] (?:не прош|завис|ошиб)|\\b(?:charged twice|double charg|duplicate charg|payment failed|unauthorized charge|charged me without|billing error)\\b","flags":"iu"},{"id":"refund","domain":"service","source":"верн[иу]те? деньги|хочу возврат|вернуть оплату|не вернули деньги|отменить (?:заказ|подписк)|подписка не отключа|плат[её]ж не вернул|\\b(?:refund|chargeback|cancel (?:my )?(?:order|subscription)|money back|can't cancel my subscription)\\b","flags":"iu"},{"id":"price_objection","domain":"service","source":"слишком дорог|не могу себе позволить|почему так дорог|не хочу платить|это платно\\?|есть бесплатн(?:ый|ая|ое) (?:вариант|альтернатив)|\\b(?:too expensive|can't afford|cannot afford|why so expensive|free alternative|don't want to pay)\\b","flags":"iu"},{"id":"service_quality","domain":"service","source":"не доволен (?:сессией|услуг|коуч)|недоволен (?:сессией|услуг|коуч)|не понравил(?:ась|ось) (?:консультац|сессия|терап)|после сессии не стало лучше|мастер (?:нагрубил|опоздал|не пришел)|специалист (?:не пришел|не отвечает)|\\b(?:disappointed with (?:the )?(?:session|service)|practitioner didn't show|therapist was rude|session did not help|service was not as described)\\b","flags":"iu"},{"id":"voice","domain":"technical","source":"микрофон[^\\n]{0,50}(?:не работ|не включ|слом|недоступ|молчит)|(?:не работ|не включ|слом)[^\\n]{0,35}микрофон|(?:я )?говорю[^\\n]{0,60}(?:текст не|не запис|слова не|не появ)|(?:транскрипц|распознаван)[^\\n]{0,45}(?:не работ|ошиб|не появ)|\\b(?:microphone (?:is )?(?:not working|broken|won't start)|mic (?:doesn't|does not) work|speech to text (?:is )?(?:broken|not working)|speaking but no text|transcript (?:is )?missing|voice input (?:doesn't|does not) work)\\b","flags":"iu"},{"id":"audio","domain":"technical","source":"не слышу (?:голос|звук|коуч)|голос (?:не слышно|не проигрыва|молчит)|звук (?:пропал|не работает|не слышно)|\\b(?:can't hear (?:the )?(?:coach|voice|audio)|cannot hear (?:the )?(?:coach|voice)|audio (?:is )?(?:not working|silent)|no sound|voice playback failed)\\b","flags":"iu"},{"id":"video","domain":"technical","source":"видео[^\\n]{0,50}(?:не генер|не работ|завис|не откр|не сохраня|не скач|пропал|исчез|не воспроиз|ошиб)|(?:не могу|не получается)[^\\n]{0,35}(?:сохранить|скачать|открыть|воспроизвести)\\s+видео|генераци[яи][^\\n]{0,30}(?:завис|ошиб|не ид)|\\b(?:video (?:won't|doesn't|does not|is not) (?:play|render|save|open|download|generat)|render (?:is )?(?:stuck|failed)|video disappeared|can't save (?:my )?video|video generation failed)\\b","flags":"iu"},{"id":"account","domain":"technical","source":"не могу (?:войти|зайти|авторизоваться)|не пускает в (?:кабинет|профиль|аккаунт)|гугл[^.]{0,40}не (?:входит|работает)|телеграм[^.]{0,40}не (?:входит|работает)|\\b(?:can't log in|cannot log in|login (?:fails|failed|not working)|sign in (?:fails|failed)|locked out of my account)\\b","flags":"iu"},{"id":"tests","domain":"technical","source":"тест (?:не запускается|не открывается|завис|не сохраняется)|результат[ы]? теста[^\\n]{0,35}(?:не|пропал|неправил|ошиб)|балл[ыа] (?:неверн|исчез)|\\b(?:test (?:doesn't|does not) start|test won't open|test result (?:is )?(?:missing|wrong)|my score (?:is )?(?:wrong|missing)|quiz is broken)\\b","flags":"iu"},{"id":"courses","domain":"technical","source":"курс (?:не открывается|не сохраняется|завис|не загружается)|прогресс (?:не сохраняется|пропал)|урок (?:не работает|не открывается)|\\b(?:course won't (?:open|load)|course (?:is )?broken|progress (?:was )?(?:lost|not saved)|lesson won't load)\\b","flags":"iu"},{"id":"chat","domain":"technical","source":"чат (?:не работает|завис|не откр|не отвеча)|сообщени[ея][^\\n]{0,45}(?:не отправ|исчез|пропал)|(?:кнопка|клавиатура)[^\\n]{0,40}(?:не работ|закрыва)|\\b(?:chat (?:is )?(?:broken|not working|stuck)|messages? (?:won't send|disappeared)|send button (?:is )?(?:broken|not working)|keyboard hides (?:the )?reply)\\b","flags":"iu"},{"id":"repeat","domain":"dialogue","source":"повторяешь(?:ся)?|снова одно и то же|опять (?:тот же|один и тот же) вопрос|зада[её]шь один вопрос|опять спрашиваешь|как заезженная пластинка|\\b(?:keep repeating|same question again|you already asked|you are repeating|stuck in a loop)\\b","flags":"iu"},{"id":"irrelevant","domain":"dialogue","source":"ты меня не понял|вы меня не поняли|не по теме|не ответил на (?:вопрос|то)|не то (?:что|о чем) я (?:спросил|спрашивала|просил)|ты игнорируешь|не слышишь меня|\\b(?:you misunderstood|you missed my point|not what i asked|off topic|you didn't answer|you did not answer|you ignore what i said|that's not what i asked)\\b","flags":"iu"},{"id":"length","domain":"dialogue","source":"слишком (?:длинн|много текста|сложн)|короче пожалуйста|пиши короче|непонятно объясн|попроще объясн|\\b(?:too long|too wordy|too complicated|make it shorter|simpler please|explain more simply)\\b","flags":"iu"},{"id":"facts","domain":"dialogue","source":"ты (?:врешь|лж[её]шь|выдумал|придумал)|вы (?:врете|лжете|выдумали)|неправильн[аяыео] (?:цена|данн|информац)|выдуманн[ыео] (?:факт|ответ)|несуществующ[аяие] ссылк|\\b(?:you made that up|you are lying|that's not true|that is not true|wrong price|fabricated facts|you hallucinated)\\b","flags":"iu"},{"id":"tone","domain":"dialogue","source":"говоришь (?:холодно|грубо|сухо)|слишком (?:холодн|формальн|фамильярн)|обесценив[а-я]* меня|ты (?:осуждаешь|стыдишь)|меня (?:стыдят|осуждают) твои ответы|\\b(?:you sound (?:cold|robotic|rude|judgmental)|your tone sounds (?:cold|robotic|rude)|stop judging me|you are dismissive|your tone hurts|too formal)\\b","flags":"iu"},{"id":"sales","domain":"dialogue","source":"навязываешь (?:услуг|курс|тест|покупк)|перестань навязывать (?:услуг|курс|тест)|прекрати (?:продавать|рекламировать)|опять (?:рекламируешь|продаешь)|слишком много реклам|\\b(?:stop selling|stop upselling|too salesy|pushing paid services|keep advertising|sales pitch again)\\b","flags":"iu"},{"id":"language","domain":"dialogue","source":"отвечаешь не на том языке|почему (?:отвечаешь )?(?:на английском|по английски)|ответ(?:ил|ила) на английском|нужен русский ответ|wrong language|answer in russian instead|why are you speaking english|respond in english instead","flags":"iu"},{"id":"loneliness","domain":"personal","source":"мне (?:так )?одиноко|я (?:совсем )?одинок|никого нет рядом|некому поговорить|одиночество меня|i feel lonely|i am lonely|i feel isolated|i have no one to talk to","flags":"iu"},{"id":"anxiety","domain":"personal","source":"мне (?:сейчас )?тревожно|я боюсь (?:будущего|ошибиться|оценки|отказа|людей)|постоянно переживаю|не могу успокоиться|i feel anxious|i am anxious|i am scared of|i keep worrying|i feel overwhelmed by fear","flags":"iu"},{"id":"burnout","domain":"personal","source":"у меня нет сил|нет сил (?:вообще|ничего)|я выгорел|я выгорела|постоянно устал|я не справляюсь с нагрузкой|мне все надоело|i am burned out|i feel burnt out|i have no energy|i am exhausted|i can't keep up at work","flags":"iu"},{"id":"relationship","domain":"personal","source":"партнер меня не слышит|партнер меня критикует|муж меня критикует|жена меня критикует|меня бросил[аи]?|меня предал[аи]?|мы постоянно ссоримся|i feel unheard by my partner|my partner criticizes me|we keep arguing|my relationship is falling apart","flags":"iu"},{"id":"work","domain":"personal","source":"меня унижают на работе|я (?:боюсь|устал|устала) на работе|мне трудно на работе|я боюсь увольнения|мне не платят|меня не ценят на работе|my boss keeps criticizing me|i feel stuck at work|i am scared of losing my job|work is unbearable","flags":"iu"},{"id":"shame","domain":"personal","source":"мне стыдно|я чувствую вину|я недостаточно хорош|я недостаточно хороша|я боюсь осуждения|я постоянно себя сравниваю|i feel ashamed|i feel guilty|i am not good enough|i feel worthless|i am afraid of being judged","flags":"iu"},{"id":"grief","domain":"personal","source":"я потерял близкого|я потеряла близкого|умер близкий|у меня (?:умер|умерла) (?:мама|папа|друг|подруга)|мне больно после расставания|i lost someone close|someone i love died|i am grieving|grief is overwhelming|after the breakup i feel","flags":"iu"},{"id":"sleep","domain":"personal","source":"(?:я )?не могу уснуть|постоянно не высыпаюсь|ночью не сплю|плохо сплю из за (?:мысл|стресс)|i cannot sleep|i can't fall asleep|i am not sleeping|i keep waking up at night","flags":"iu"},{"id":"direction","domain":"personal","source":"я не знаю чего хочу|я не знаю с чего начать|не понимаю куда двигаться|потерял смысл|потеряла смысл|я застрял в жизни|я застряла в жизни|i don't know what i want|i feel lost in life|i have lost my sense of purpose|i don't know where to start","flags":"iu"}].map(r=>({...r,re:new RegExp(r.source,r.flags)}));
const C={
  "boundary": {
    "ru": "Понял. Без советов, упражнений и предложений услуг. Можете просто рассказывать в удобном для вас темпе.",
    "en": "Understood. No advice, exercises, or service suggestions. You can just talk at your own pace."
  },
  "privacy": {
    "ru": "Контроль над личными данными важен. Я не могу подтвердить удаление или изменение настроек из этой переписки. Проверьте настройки приватности в профиле; не присылайте сюда пароли или реквизиты.",
    "en": "You should have control over your information. I can't confirm deletion or a settings change from this chat. Check your profile's privacy settings, and don't share passwords or payment details here."
  },
  "billing": {
    "ru": "С оплатой важно разобраться по подтверждённым операциям. Я не вижу платёжную историю и не могу подтвердить списание или возврат из чата. Проверьте запись в «Моих заказах»; не отправляйте полный номер карты.",
    "en": "A billing problem needs checking against actual transactions. I can't view or confirm charges or refunds here. Check your order records, and don't send full card details in chat."
  },
  "refund": {
    "ru": "Понимаю запрос на отмену или возврат. Здесь я не могу отменить заказ или вернуть деньги; сначала проверьте заказ в защищённом кабинете и используйте доступный канал поддержки.",
    "en": "I understand that you want a cancellation or refund. I can't cancel an order or issue a refund here. Check the order in your protected account and use the available support channel."
  },
  "price_objection": {
    "ru": "Понимаю: стоимость или платный формат вам не подходит. Не буду предлагать платную услугу как единственный выход. Хотите рассмотреть только бесплатные варианты?",
    "en": "I understand that the price or paid format doesn't work for you. I won't push a paid service. Would you like to consider only free options?"
  },
  "service_quality": {
    "ru": "Спасибо, что сказали об этом. Не стану утверждать, что сессия помогла, или защищать её качество без фактов. Что именно не соответствовало вашим ожиданиям?",
    "en": "Thank you for raising this. I won't claim the session worked or defend its quality without evidence. What was different from what you expected?"
  },
  "voice": {
    "ru": "Понял: проблема связана с микрофоном или распознаванием речи. Я не вижу подтверждённой записи или расшифровки здесь, а пока можно написать текстом. На каком устройстве это происходит?",
    "en": "I understand: the microphone or speech-to-text isn't working as expected. I can't confirm an audio recording or transcript here; you can type for now. Which device are you using?"
  },
  "audio": {
    "ru": "Понял, звук или голос не воспроизводится как ожидается. Я не могу проверить аудиоустройство из переписки. Это происходит в браузере или в мобильном приложении?",
    "en": "I understand that the audio or coach voice isn't playing as expected. I can't inspect your audio device from this chat. Is this in a browser or a mobile app?"
  },
  "video": {
    "ru": "Понял, возникла проблема с видео. Я не могу подтвердить рендер, сохранение или доставку без статуса системы. На каком шаге это случилось: генерация, просмотр или сохранение?",
    "en": "I understand there's a problem with your video. I can't confirm rendering, saving, or delivery without system status. Did it happen during generation, playback, or saving?"
  },
  "account": {
    "ru": "Понял, не получается войти в аккаунт. Не отправляйте пароли или коды подтверждения в чат. Вход не проходит через Google или Telegram?",
    "en": "I understand you're having trouble signing in. Please don't share passwords or verification codes here. Is the issue with Google or Telegram sign-in?"
  },
  "tests": {
    "ru": "Понял, тест или результат работает не так, как ожидается. Я не вижу приватные баллы без разрешения. Ошибка возникает при прохождении или после завершения?",
    "en": "I understand that a test or its result isn't working as expected. I can't verify private scores without permission. Does the issue happen during the test or after completion?"
  },
  "courses": {
    "ru": "Понял, возникла проблема с курсом или сохранением прогресса. Я не могу подтвердить изменения вашего прогресса отсюда. Ошибка появляется при открытии урока или после его завершения?",
    "en": "I understand there's an issue with the course or saved progress. I can't verify changes to your progress here. Does it happen when opening or completing a lesson?"
  },
  "chat": {
    "ru": "Понял, чат ведёт себя неправильно. Не буду утверждать, что ошибка уже исправлена. Что именно происходит: не отправляется сообщение, зависает ответ или пропадает текст?",
    "en": "I understand the chat isn't behaving correctly. I won't claim it's fixed without checking. Are messages failing to send, replies freezing, or text disappearing?"
  },
  "repeat": {
    "ru": "Вы правы, повторять один вопрос вместо продвижения разговора бесполезно. Учту вашу поправку и не буду возвращаться к прежнему вопросу без необходимости.",
    "en": "You're right: repeating a question doesn't move the conversation forward. I'll respect your correction and won't return to the same question unnecessarily."
  },
  "irrelevant": {
    "ru": "Понял: я ответил не на то, что вы хотели обсудить. Не буду додумывать ваш запрос. Какая часть вашего последнего уточнения осталась без ответа?",
    "en": "I see that I answered something different from what you meant. I won't guess at your intention. Which part of your latest clarification did I miss?"
  },
  "length": {
    "ru": "Понял, ответ был слишком сложным или длинным. Дальше буду писать короче и яснее, без лишних объяснений.",
    "en": "Got it—the response was too long or complicated. I'll keep the next answer shorter and clearer."
  },
  "facts": {
    "ru": "Точность важна. Не должен выдавать непроверенные предположения за факты. Если данных нет, прямо скажу об этом и не буду выдумывать подтверждение.",
    "en": "Accuracy matters. I shouldn't present unverified guesses as facts. If information isn't available, I'll say so rather than invent confirmation."
  },
  "tone": {
    "ru": "Понял, мой тон был неподходящим. Буду отвечать уважительно и теплее, без оценок и навязчивого утешения.",
    "en": "I understand that my tone didn't work for you. I'll respond more respectfully and warmly, without judging or forcing reassurance."
  },
  "sales": {
    "ru": "Понял, рекомендации звучали как навязчивая продажа. Не буду предлагать платные услуги, если вы об этом не просите.",
    "en": "I understand that the suggestions felt like a sales pitch. I won't recommend paid services unless you ask."
  },
  "language": {
    "ru": "Понял, язык ответа был неверным. Дальше отвечу по-русски.",
    "en": "Understood—the reply was in the wrong language. I'll respond in English from here."
  },
  "loneliness": {
    "ru": "Похоже, сейчас особенно не хватает общения. Не буду торопиться с советами. Хотите просто рассказать, как проходит ваш день?",
    "en": "It sounds like you're missing connection right now. I won't rush into advice. Would you like to tell me a little about your day?"
  },
  "anxiety": {
    "ru": "Похоже, вам сейчас тревожно. Не стану предполагать причину или сразу предлагать упражнения. Вам сейчас важнее выговориться или разобраться в ситуации?",
    "en": "It sounds like you're feeling anxious. I won't assume the cause or rush into exercises. Would it help more to be heard or to think this through?"
  },
  "burnout": {
    "ru": "Слышу, насколько вы устали. Не нужно сейчас искать идеальное решение. Хотите сначала рассказать, что больше всего истощает?",
    "en": "I hear how exhausted you feel. You don't need to find a perfect solution right now. Would you like to start with what's draining you most?"
  },
  "relationship": {
    "ru": "Похоже, это болезненная ситуация в отношениях. Не стану делать выводов о другом человеке за вас. Что произошло в последнем разговоре?",
    "en": "It sounds like a painful situation in a relationship. I won't judge the other person based on a few lines. What happened in your last conversation?"
  },
  "work": {
    "ru": "Похоже, работа стала источником напряжения. Не буду сразу предлагать менять работу или покупать консультацию. Что сейчас больше всего мешает вам?",
    "en": "It sounds like work has become stressful. I won't jump to telling you to quit or book a session. What feels most difficult right now?"
  },
  "shame": {
    "ru": "Похоже, это задело ваше чувство собственного достоинства. Не стану объяснять за вас, почему так произошло. Хотите рассказать, что именно случилось?",
    "en": "It sounds like this affected how you see yourself. I won't assume why. Would you like to share what happened?"
  },
  "grief": {
    "ru": "Это похоже на тяжёлую потерю. Не буду торопить вас с выводами. Если хочется, можете немного рассказать о том, кого или что потеряли.",
    "en": "That sounds like a painful loss. I won't rush you toward explanations. If you'd like, you can tell me a little about who or what you lost."
  },
  "sleep": {
    "ru": "Похоже, со сном сейчас трудно. Я не могу определить причину по сообщению или заменить консультацию врача. Это больше про засыпание или частые пробуждения?",
    "en": "It sounds like sleep has been difficult. I can't identify a cause from chat or replace medical care. Is the problem falling asleep or waking up often?"
  },
  "direction": {
    "ru": "Похоже, сейчас не хватает ясности, в каком направлении двигаться. Не буду выбирать цель за вас. Что хотелось бы изменить в первую очередь?",
    "en": "It sounds like you're unsure which direction to take. I won't choose a goal for you. What would you most like to change first?"
  }
};
const S=/не хочу жить|хочу умереть|покончи.*с собой|суицид|самоубийств|боль в груди|не могу дышать|трудно дышать|насилие|меня бьют|избива[ею]|изнасил|уб[ьи]ют|i want to die|kill myself|suicid|chest pain|can't breathe|cannot breathe|domestic violence|sexual assault|being beaten|immediate danger/iu;
function normConcern(text){return String(text||"").toLocaleLowerCase().normalize("NFKC").replace(/ё/g,"е").replace(/\s+/gu," ").trim()}
function classifyClientConcern({message="",locale="en",history=[]}={}){
 if(locale==="es"||typeof message!=="string"||!message.trim()||message.length>3000)return null;
 const lang=/[а-яё]/iu.test(message)?"ru":locale==="ru"?"ru":"en";
 const s=normConcern(message);
 if(S.test(s)||/^(?:стоп|хватит|пока|stop|bye|goodbye|cancel|нет|no|неа)[.! ]*$/iu.test(s))return null;
 for(const row of R){if(!row.re.test(s))continue;
  const reply=C[row.id]?.[lang];if(!reply)return null;
  return {version:CLIENT_COMPLAINT_VERSION,id:row.id,domain:row.domain,locale:lang,confidence:0.96,
   reply,source:"explicit-current-user-utterance",memorySaved:false,actionExecuted:false};
 }
 return null;
}
