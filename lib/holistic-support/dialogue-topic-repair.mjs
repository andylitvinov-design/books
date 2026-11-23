/** Explicit, short topic continuity; no inference, external actions or persistent state. */
export function repairDialogueTopic({message="",locale="en",history=[]}={}){
 const norm=v=>String(v??"").normalize("NFKC").toLowerCase().replace(/ё/g,"е").replace(/[’']/g,"").replace(/[¡¿]/g,"").replace(/[.!?,;:]+$/g,"").replace(/\s+/g," ").trim();
 const t=norm(message),lang=["ru","en","es"].includes(locale)?locale:"en";
 const rows=Array.isArray(history)?history.slice(-12).filter(r=>r&&["user","assistant"].includes(r.role)&&typeof r.text==="string"):[];
 const reset=/^(?:стоп|хватит|закончим|новая тема|другая тема|сменим тему|сменить тему|не (?:про|о|об) |stop|cancel|new topic|change topic|not about |otro tema|cambiar de tema|no sobre )/u;
 const media=/^(?:(?:хочу|создай|сделай|подбери|i want|create|make|quiero|crea)\s+)?(?:видео|ролик|медитаци[яю]|video|meditation|meditación)(?:\s|$)/u;
 const repeat=/^(?:(?:ну |но |так )?(?:я )?(?:же |ж )?(?:уже )?(?:сказал[аи]?|говорил[аи]?|ответил[аи]?|написал[аи]?)(?: (?:же|ж|уже|вам|тебе|это)){0,4}|(?:я )?уже (?:об этом |это )?(?:говорил[аи]?|сказал[аи]?)|ты (?:же )?опять спрашиваешь|вы опять спрашиваете|i (?:already (?:said|told you|answered|wrote)(?: (?:that|it|you))?|(?:said|told you|answered) (?:that )?already)|you already asked(?: me)?|ya (?:te |le )?(?:lo )?(?:dije|respondí|respondí eso)|ya lo he dicho)$/u;
 const topicPatterns=[
 ["money",/^(?:(?:про|о|об|about|sobre)\s+)?(?:деньги|денег|финансы|финансах|деньгах|заработок|доход|доходы|money|finances|income|dinero|finanzas|ingresos)$/u],
 ["work",/^(?:(?:про|о|about|sobre)\s+)?(?:работа|работе|работу|карьера|карьере|бизнес|бизнесе|work|career|business|trabajo|negocio)$/u],
 ["relationships",/^(?:(?:про|о|about|sobre)\s+)?(?:отношения|отношениях|любовь|любви|близость|relationships|love|relaciones|amor)$/u],
 ["energy",/^(?:(?:про|о|about|sobre)\s+)?(?:энергия|энергии|стресс|стрессе|усталость|energy|stress|energía|estres|estrés)$/u],
 ["goals",/^(?:(?:про|о|about|sobre)\s+)?(?:цель|цели|целях|goals?|metas?)$/u],
 ["meaning",/^(?:(?:про|о|about|sobre)\s+)?(?:смысл|смысле|meaning|purpose|sentido)$/u]];
 const topicOf=s=>topicPatterns.find(([,p])=>p.test(s))?.[0]??null;
 const userRows=rows.filter(r=>r.role==="user").map(r=>norm(r.text));
 let previousTopic=null, mediaActive=false;
 for(const u of [...userRows].reverse()){
  if(reset.test(u))break;
  if(media.test(u)){mediaActive=true;break;}
  const topic=topicOf(u);
  if(topic){previousTopic=topic;break;}
 }
 if(mediaActive)return null;
 const noQuestions=userRows.some(s=>/^(?:без вопросов|не задавай(?:те)? (?:мне )?вопрос[ыов]*|no questions|dont ask (?:me )?questions|sin preguntas)$/u.test(s));
 const copy={
 ru:{money:["Что сейчас важнее в теме денег: увеличить доход, разобраться с расходами или почувствовать больше финансовой стабильности?","Что именно хочется изменить в вашей финансовой ситуации?","Можно начать с того, каким был бы для вас приемлемый финансовый результат."],work:["Что в ситуации с работой хочется изменить в первую очередь?"],relationships:["Что в отношениях сейчас хотелось бы изменить?"],energy:["В какие моменты вам особенно не хватает сил или спокойствия?"],goals:["Какого результата вы сейчас хотели бы достичь?"],meaning:["Что именно в этой теме сейчас требует ясности?"],ack:"Извините, вы уже назвали тему. ",labels:{money:"Деньги",work:"Работа",relationships:"Отношения",energy:"Энергия и стресс",goals:"Цели",meaning:"Смысл"},income:"Какой именно результат по доходу вы хотите получить?",expense:"Какие расходы сейчас больше всего влияют на вашу финансовую ситуацию?",stability:"Что для вас означала бы финансовая стабильность?",listen:"Можем остаться на этой теме без дополнительных вопросов."},
 en:{money:["What matters most about money right now: increasing income, managing expenses, or feeling more financially secure?","What would you most like to change about your financial situation?","We can start by defining what an acceptable financial outcome would look like for you."],work:["What would you most like to change about work?"],relationships:["What would you like to change in your relationships?"],energy:["When do you most notice a lack of energy or calm?"],goals:["What outcome would you like to achieve?"],meaning:["What part of this topic needs more clarity?"],ack:"Sorry, you already named the topic. ",labels:{money:"Money",work:"Work",relationships:"Relationships",energy:"Energy and stress",goals:"Goals",meaning:"Meaning"},income:"What income outcome would you like to achieve?",expense:"Which expenses are affecting your financial situation most?",stability:"What would financial stability mean for you?",listen:"We can stay with this topic without further questions."},
 es:{money:["¿Qué te importa más del dinero ahora: aumentar ingresos, gestionar gastos o tener mayor estabilidad financiera?","¿Qué te gustaría cambiar de tu situación financiera?","Podemos empezar por definir qué resultado financiero sería aceptable para ti."],work:["¿Qué te gustaría cambiar primero en el trabajo?"],relationships:["¿Qué te gustaría cambiar en tus relaciones?"],energy:["¿Cuándo notas más la falta de energía o calma?"],goals:["¿Qué resultado te gustaría conseguir?"],meaning:["¿Qué parte de este tema necesita más claridad?"],ack:"Perdón, ya mencionaste el tema. ",labels:{money:"Dinero",work:"Trabajo",relationships:"Relaciones",energy:"Energía y estrés",goals:"Metas",meaning:"Sentido"},income:"¿Qué resultado de ingresos quieres conseguir?",expense:"¿Qué gastos afectan más a tu situación financiera?",stability:"¿Qué significaría para ti la estabilidad financiera?",listen:"Podemos seguir con este tema sin más preguntas."}};
 const c=copy[lang],latest=rows.filter(r=>r.role==="assistant").at(-1)?.text??"";
 const asked=q=>rows.some(r=>r.role==="assistant"&&norm(r.text).includes(norm(q)));
 const isRepair=repeat.test(t);
 const explicit=topicOf(t);
 let topic=isRepair?previousTopic:explicit==="money"?"money":null;
 let detail=null;
 if(!isRepair&&previousTopic==="money"&&norm(latest).includes(norm(c.money[0]))){
  if(/^(?:доход[ыа]?|увеличить доход|заработок|income|increase income|ingresos|aumentar ingresos)$/u.test(t))detail="income";
  if(/^(?:расход[ыа]?|расходы|expenses|manage expenses|gastos|gestionar gastos)$/u.test(t))detail="expense";
  if(/^(?:стабильность|финансовая стабильность|security|stability|financial stability|estabilidad(?: financiera)?)$/u.test(t))detail="stability";
  if(detail)topic="money";
 }
 if(!topic)return null;
 const prefix=isRepair?c.ack+c.labels[topic]+". ":"";
 const next=noQuestions?c.listen:detail&&!asked(c[detail])?c[detail]:c[topic].find(q=>!asked(q))??c.listen;
 return {id:isRepair?"topic_repair":detail?"money_detail":"money_topic",reply:prefix+next,topic,locale:lang,source:"reviewed-rules"};
}
