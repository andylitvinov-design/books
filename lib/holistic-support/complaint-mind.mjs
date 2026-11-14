/**
 * Complaint & Problem Mind v1. No I/O, diagnosis, persistent state, booking or payments.
 * Requires upstream auth/safety/consent gates for an authenticated API response.
 */
import {reviewPracticeBoundary} from "./practice-boundary.mjs";
export const COMPLAINT_MIND_VERSION="hh-complaint-problem-ru-en-v2";
const norm=s=>String(s??"").toLocaleLowerCase().normalize("NFKC").replace(/ё/g,"е").replace(/[’']/g,"").replace(/\s+/gu," ").trim();
const danger=/не хочу (?:больше )?жить|хочу умереть|покончить с собой|суицид|самоубийств|боль в груди|не могу дышать|трудно дышать|меня бьют|домашн.{0,15}насили|мне стало хуже|после (?:упражнения|медитации|практики).{0,40}хуже|i want to die|i dont want to live|kill myself|suicid|chest pain|cant breathe|cannot breathe|domestic violence|i feel worse|after (?:the )?(?:exercise|meditation|practice).{0,40}worse/u;
const stop=/^(?:стоп|хватит|закончим|до свидания|stop|enough|goodbye|bye)[.! ]*$/u;
const direct=/\b(?:create|generate|write|make|book|choose|download)\b|создай|сгенерируй|напиши|сделай|подбери|скачай|запиши меня/u;
/** Narrow categories: an unrecognized turn belongs to the existing dialogue brain. */
const rules=[
["no_advice","boundary",/не (?:хочу|нужны) совет|без советов|не предлагай.{0,18}упражнен|не (?:советуй|предлагай) (?:мне )?(?:практик|медитац)|просто (?:послушай|выслушай)|dont (?:give|want) (?:me )?advice|(?:dont|do not|please dont|please do not) (?:suggest|offer|recommend) (?:me )?(?:any )?(?:exercises?|practices?|meditations?)|stop suggesting (?:exercises?|practices?)|no advice|just listen|stop coaching me/u],
["no_paid","boundary",/не хочу платн|без платных|не предлагай.{0,20}платн|не надо платн|no paid services|dont (?:want|offer) paid|stop selling to me/u],
["price_objection","service",/слишком дорог|не могу себе позволить|почему так дорог|too expensive|cant afford|cannot afford|why so expensive/u],
["privacy","service",/вы (?:сохранили|опубликовали|передали|раскрыли) мои (?:данные|сообщения|результаты)|чужие результаты|без моего согласия|нарушени.{0,12}(?:приватн|конфиденциал)|you (?:shared|published|stored|leaked) my (?:data|messages|results)|without my consent|privacy breach|someone elses results|(?:удалите|удалить|удали) мои (?:данные|сообщения|переписку)|delete my (?:data|history|messages)/u],
["billing","service",/дважды списал|двойно.{0,12}списан|списали деньги|хочу возврат|верните деньги|платеж не прошел|оплата не прошла|подписка не отключается|double charg|charged twice|refund|payment failed|unauthorized charge|cancel my subscription/u],
["audio","technical",/не слышу (?:голос|звук|запись)|нет звука|звук (?:пропал|не работает|не слышно)|no sound|no audio|cant hear (?:the )?(?:voice|coach|audio)|audio (?:is )?(?:silent|not working)/u],
["voice","technical",/(?:микрофон|распознаван|транскрип|запись голоса|диктовк).{0,50}(?:не работает|не включ|не появ|не запис|не распозна|обрыв)|(?:говорю|сказал|сказала).{0,55}(?:текст не|слова не|не фиксир)|microphone (?:isnt|doesnt|not) work|voice (?:isnt|doesnt|not) work|speaking but (?:no text|nothing appears)|transcript (?:missing|not showing)|speech isnt transcribed/u],
["tests","technical",/тест (?:не запускается|не открывается|завис)|результат(?:ы)? теста (?:пропал|не сохранил|исчез)|test (?:wont open|doesnt start)|quiz is broken|test result (?:is )?(?:missing|wrong)/u],
["courses","technical",/(?:курс|урок|прогресс).{0,22}(?:не сохраняется|не открывается|не загружается|пропал|завис)|course (?:wont (?:load|open)|progress (?:is )?(?:lost|missing))|course progress (?:disappeared|was lost)|lesson wont (?:open|load)/u],
["media","technical",/(?:видео|видеоролик|медитация|курс|тест).{0,50}(?:не (?:работ|откр|сохран|публик|отправ|проигрыв|генерир)|завис|пропал)|(?:video|meditation|course|test).{0,45}(?:not working|wont (?:play|save|open|generate)|is missing|disappeared)|cant (?:save|play|open|generate) (?:my )?video/u],
["login","technical",/не могу войти|не получается войти|не работает вход|не вижу профиль|пропали данные профиля|cant (?:log in|sign in|access my account)|login (?:failed|not working)|profile data (?:missing|disappeared)/u],
["technical","technical",/чат (?:завис|не отвечает|не работает|не открывается)|сайт не открывается|сообщени.{0,22}не (?:отправ|приход|появ)|кнопка.{0,28}не работает|ответ пропал|клавиатура закрыва|chat (?:froze|freezes|is broken|isnt working|wont open)|site wont open|message wont send|button (?:isnt|doesnt) work|reply disappeared/u],
["trust","dialogue",/ты (?:врешь|обманываешь|выдумал|придумал)|вы (?:врете|обманываете|выдумали|придумали)|недостоверн.{0,12}ответ|откуда ты это взял|you (?:lied|made that up|invented)|youre lying|false information|hallucinat/u],
["sales","dialogue",/навязыва.{0,20}(?:курс|услуг|тест|покупк)|только (?:продаешь|продаете)|хватит рекламир|stop (?:pushing|promoting|advertising)|keep selling|youre just selling|too salesy/u],
["language","dialogue",/вы отвечаете не на (?:русском|английском)|ты отвечаешь не на (?:русском|английском)|вы отвечаете по-английски вместо русского|не тот язык ответа|wrong language|keep replying in (?:the )?wrong language|you answered in (?:the )?wrong language/u],
["unheard","dialogue",/ты меня не (?:слышишь|понимаешь|понял)|вы меня не (?:слышите|понимаете|поняли)|не ответил.{0,22}вопрос|не по теме|не то что я (?:спросил|спрашивал)|опять повторяешь|you (?:dont understand|didnt understand|misunderstood|ignored my question|missed my question)|not what i asked|same question again|вы задаете один и тот же вопрос|ты задаешь один и тот же вопрос|опять один и тот же вопрос|опять задаешь тот же вопрос|you keep repeating|you already asked|keep repeating/u],
["style","dialogue",/слишком (?:длинн|кратк|холодно|сухо|сложно|формально)|пиши (?:короче|проще)|ответь короче|много лишнего текста|too (?:long|short|cold|formal|complicated)|make it shorter|be (?:shorter|simpler)|too much text/u],
["human","boundary",/не хочу (?:общаться|говорить) с (?:ботом|ии)|нужен (?:живой|настоящий) (?:человек|специалист|психолог)|хочу поговорить с человеком|i dont want (?:an? )?(?:ai|bot)|need a human|want (?:a |to talk to a )?real person/u],
["service","service",/недовол[ье]н.{0,30}(?:сесси|консультац|услуг|мастер)|(?:сессия|консультация|услуга).{0,25}(?:не помогла|разочаров|не понрав)|ожидал.{0,12}другого результата|disappointed with (?:the )?(?:session|service|coach)|session didnt help|not happy with (?:the )?(?:service|session)|мастер (?:не пришел|опоздал|нагрубил)|practitioner didnt show/u],
["sleep","personal",/^(?:я плохо сплю|не могу уснуть|плохо сплю|не сплю по ночам|i cant sleep|im unable to sleep|i have trouble sleeping)/u],
["loneliness","personal",/^(?:мне (?:очень )?одиноко|я (?:чувствую себя )?одинок|никому нет до меня дела|i (?:feel|am) (?:very )?lonely|i feel alone|i have nobody to talk to)/u],
["shame","personal",/^(?:мне стыдно|я (?:очень )?стыжусь|я боюсь осуждения|боюсь (?:осуждения|оценки)|чувствую себя виноват|i feel ashamed|im ashamed|i feel guilty|im scared of being judged)/u],
["anxiety","personal",/^(?:мне (?:очень )?тревожно|я (?:очень )?боюсь|меня пугает|мне страшно|постоянно переживаю|im anxious|i feel anxious|im afraid|i am afraid|im scared|i feel scared)/u],
["exhaustion","personal",/^(?:у меня нет сил|я (?:очень |постоянно )?устал|меня все вымотало|я выгорел|я выгорела|im exhausted|i have no energy|im burned out|i feel burned out)/u],
["relationships","personal",/^(?:мы (?:постоянно )?ссоримся|партнер меня не слышит|муж меня не понимает|жена меня не понимает|меня постоянно критикуют|my partner (?:doesnt understand|doesnt listen)|we keep fighting|my family keeps criticizing me)/u],
["work","personal",/^(?:у меня нет клиентов|я боюсь менять работу|я застрял на работе|я застряла на работе|не справляюсь с дедлайнами|i cant find clients|im stuck at work|im afraid to change jobs|i keep missing deadlines)/u],
["direction","personal",/^(?:я не могу принять решение|не могу принять решение|не знаю чего хочу|не понимаю чего хочу|потерял смысл|потеряла смысл|не знаю с чего начать|i dont know what i want|i feel lost|i cant decide|i dont know where to start)/u],
["grief","personal",/^(?:я потерял.{0,15}(?:близкого|друга|родителя)|у меня умер.{0,16}(?:мама|папа|друг|близкий)|i lost someone close|my (?:mother|father|friend|partner) died|im grieving)/u]
];
const replies={
price_objection:["Понимаю, стоимость может быть препятствием. Не буду навязывать покупку или обещать скидку. Хотите рассмотреть доступные бесплатные варианты?","I understand that cost may be a concern. I will not push a purchase or promise a discount. Would you like to explore available free options?"],
audio:["Похоже, звук не воспроизводится. Я не могу подтвердить, что запись или голос загрузились. На каком устройстве это происходит?","It sounds like audio playback is failing. I cannot confirm that the recording or voice loaded. Which device are you using?"],
tests:["Понял: тест или его результат работает неправильно. Я не буду угадывать баллы или данные. На каком шаге возникает проблема?","I understand a test or result is not working correctly. I will not guess scores or personal data. At what step does the problem appear?"],
courses:["Понял: возникла проблема с уроком или сохранением прогресса. Я не могу подтвердить, что он сохранён. Что именно не открывается или не сохраняется?","I understand a lesson or course-progress issue. I cannot confirm progress was saved. What exactly fails to open or save?"],
language:["Вы правы, ответ должен соответствовать выбранному языку. Не буду утверждать, что настройки сайта уже изменены. Продолжу отвечать на языке этого диалога.","You are right that the reply should follow the selected language. I cannot claim the site's settings changed. I will continue in this conversation's language."],
sleep:["Вы говорите о трудностях со сном. Не буду делать медицинские выводы или предлагать упражнения без запроса. Хотите рассказать, что именно мешает уснуть?","You are describing difficulty sleeping. I will not diagnose or suggest exercises you did not ask for. Would you like to share what is making sleep difficult?"],
no_advice:["Хорошо. Без советов, упражнений и предложений услуг. Можете просто рассказывать — я буду следить за тем, что важно вам.","Understood. No advice, exercises or service suggestions. You can simply talk, and I will follow what matters to you."],
no_paid:["Понял. Не буду предлагать платные варианты. Можем продолжить без покупки.","Understood. I will not suggest paid options. We can continue without a purchase."],
privacy:["Это серьёзный вопрос приватности. Я не могу проверить доступ или удаление данных по одному сообщению. Пожалуйста, используйте защищённый канал поддержки и не присылайте сюда чужие данные.","This is a serious privacy concern. I cannot verify access or deletion from a chat message. Please use a secure support channel and do not share anyone else's data here."],
billing:["Вопрос оплаты нужно проверить. Я не вижу транзакции и не могу оформить возврат из чата. Посмотрите подтверждения в «Моих заказах» и используйте защищённый канал поддержки; не присылайте реквизиты карты.","This payment concern needs checking. I cannot view transactions or issue a refund from this chat. Check your orders and use a secure support channel; please do not send card details."],
voice:["Понял: запись или распознавание речи работает неправильно. Я не могу подтвердить сохранение ваших слов. Пока можно написать текстом. На каком устройстве это происходит?","I understand that speech recording or transcription is failing. I cannot confirm your words were saved. You can type for now. Which device are you using?"],
media:["Понял: возникла проблема с материалом. Я не могу подтвердить генерацию или сохранение по сообщению. Где именно сбой — создание, просмотр или сохранение?","I understand there is a problem with the material. I cannot confirm generation or saving from a chat message. Did it fail during creation, playback or saving?"],
login:["Доступ к профилю не сработал. Не присылайте пароль или код входа. Где возникает ошибка — Google, Telegram или открытие профиля?","Access to your profile failed. Please do not send passwords or sign-in codes. Does it happen with Google, Telegram or when opening your profile?"],
technical:["Понял, это похоже на технический сбой. Не буду утверждать, что он уже исправлен. Что именно не работает — кнопка, отправка или открытие страницы?","This sounds like a technical problem. I cannot claim it has been fixed. Is it a button, sending a message or opening a page?"],
trust:["Я не должен выдавать предположения за факты. Не буду настаивать на непроверенном утверждении. Что именно нужно перепроверить?","I should not present guesses as facts. I will not defend an unverified claim. Which statement should we recheck?"],
sales:["Понял. Перестану предлагать покупки и услуги. Можем просто поговорить о вашем запросе.","Understood. I will stop suggesting purchases or services. We can simply talk about what matters to you."],
unheard:["Я неверно понял ваш запрос. Не буду повторять тот же вопрос или предлагать услуги. Что именно я упустил?","I missed what you were asking. I will not repeat the question or pitch services. What did I miss?"],
style:["Понял. Буду отвечать проще и короче, без лишних вступлений. Какую часть ответа уточнить?","Understood. I will keep replies simpler and shorter. Which part should I clarify?"],
human:["Понял, вам нужен живой специалист. Я не заменяю человека и не оформлял запись. Могу помочь найти подходящий способ обращения.","Understood. You want a real person. I do not replace a practitioner and have not booked anyone. I can help you find a way to contact one."],
service:["Понимаю: услуга не оправдала ожиданий. Не буду придумывать причины или обещать результат. Что именно не устроило — формат, общение или содержание?","I understand the service did not meet expectations. I will not invent a cause or promise an outcome. Was the issue the format, communication or content?"],
loneliness:["Вы говорите об одиночестве. Не буду торопиться с советами или предлагать курс. Хотите просто рассказать, как проходит ваш день?","You are describing loneliness. I will not rush into advice or suggest a course. Would you like to tell me about your day?"],
shame:["Тема стыда или оценки для вас болезненна. Не буду додумывать причины. Хотите рассказать, что произошло?","Shame or fear of judgment sounds painful for you. I will not guess the cause. Would you like to share what happened?"],
anxiety:["Похоже, вам тревожно или страшно. Не буду гадать о причинах. Вам сейчас важнее выговориться или вместе разобрать ситуацию?","You sound anxious or afraid. I will not assume the cause. Would you rather be heard or explore the situation together?"],
exhaustion:["Вы описываете сильную усталость. Не буду требовать новых усилий или советовать упражнения. Хотите рассказать, что больше всего истощает?","You are describing exhaustion. I will not push exercises or extra effort. Would you like to share what feels most draining?"],
relationships:["Похоже, в отношениях тяжело. Не буду выбирать виновного. Что произошло в последнем разговоре?","This relationship sounds difficult right now. I will not assign blame. What happened in your last conversation?"],
work:["Похоже, рабочая ситуация напряжённая. Не буду предлагать платный курс вместо ответа. Какой результат сейчас важнее всего?","This work situation sounds stressful. I will not pitch a paid course instead of listening. What outcome matters most right now?"],
direction:["Пока может не быть ясного решения. Не буду выбирать за вас. Какой вопрос хочется прояснить первым?","You do not need a complete answer yet. I will not decide for you. Which part would you like to clarify first?"],
grief:["Очень тяжело переживать потерю. Не буду объяснять причины или навязывать упражнения. Если хотите, можете рассказать о том, что сейчас особенно трудно.","Losing someone can be very hard. I will not invent explanations or push techniques. If you wish, you can share what feels hardest right now."]
};
function classify(text) {return danger.test(text)||stop.test(text)?null:rules.find(r=>r[2].test(text))||null;}
/** Return null rather than hijacking unrecognized or urgent requests. */
export function resolveComplaintTurn({message="",locale="en",history=[]}={}) {
 if(!["ru","en"].includes(locale)||typeof message!=="string"||!message.trim()||message.length>3000)return null;
 // An explicit stop/worsening must never be reinterpreted as ordinary anxiety.
 if(reviewPracticeBoundary(message,locale))return null;
 const text=norm(message);
 let hit=classify(text);
 if(!hit&&/^(?:опять|все еще|это не помогло|still broken|still not working|same problem|it didnt help)[.! ]*$/u.test(text)){
  const prior=Array.isArray(history)?history.slice(-6).reverse().find(t=>t?.role==="user"&&typeof t.text==="string"):null;
  if(prior)hit=classify(norm(prior.text));
 }
 if(!hit||(hit[1]==="personal"&&direct.test(text)))return null;
 const [kind,category]=hit;
 return {version:COMPLAINT_MIND_VERSION,id:"complaint_"+kind,kind,category,locale,
  reply:replies[kind][locale==="ru"?0:1],status:"clarify",source:"complaint-mind",
  modelUsed:false,memorySaved:false,actionExecuted:false,confidence:"high",evidence:"explicit_user_text"};
}
