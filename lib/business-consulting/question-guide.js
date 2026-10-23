// First-party editorial navigation. Free-text questions remain in browser memory;
// no analysis is sent to a server, LLM, tracking pixel, CRM or messenger.
export const BUSINESS_QUESTION_TOPICS = Object.freeze([
  'money','clients','start','strategy','career','opportunities','team','focus',
]);

// Concrete questions, answer choices and optional small experiments — not guarantees.
export const BUSINESS_TOPIC_GUIDE = {
  en: {
    money: {label:'Money & income',question:'What would you like to change about your income?',
      idea:'Compare the last three sources of income and choose one realistic improvement to test this week.',
      options:[
        {id:'increase',label:'Earn more',tip:'Pick one offer and check its price, demand and delivery cost before changing it.'},
        {id:'stability',label:'Make income steadier',tip:'List repeat customers and recurring expenses; choose one predictable monthly action.'},
        {id:'pricing',label:'Review my prices',tip:'Compare the time, cost and actual value of your most requested service.'},
      ]},
    clients: {label:'Clients & sales',question:'Where does attracting and keeping clients feel hardest?',
      idea:'Write down the last five real customer conversations. What single question kept coming up?',
      options:[
        {id:'reach',label:'Finding clients',tip:'Describe one specific client and one place where you could reach them.'},
        {id:'conversion',label:'Turning interest into sales',tip:'Map the step between a first enquiry and an agreed paid offer.'},
        {id:'retention',label:'Repeat customers',tip:'Ask which useful follow-up you can offer existing customers, with their consent.'},
      ]},
    start: {label:'Start a business',question:'What stage is your project at?',
      idea:'Describe the smallest version of the service you could test with a real person.',
      options:[
        {id:'idea',label:'I have an idea',tip:'Write one clear problem, the people facing it and a small way to test your idea.'},
        {id:'launch',label:'I am launching',tip:'Choose one first offer and a real measure of interest before expanding.'},
        {id:'restart',label:'I launched but got stuck',tip:'Separate what customers have confirmed from assumptions you have not tested.'},
      ]},
    strategy: {label:'Business & strategy',question:'Which strategic decision do you want to clarify?',
      idea:'Choose one decision and write three realistic options, risks and your next small test.',
      options:[
        {id:'direction',label:'Choose a direction',tip:'Compare two directions using customer demand, effort and your available resources.'},
        {id:'priorities',label:'Set priorities',tip:'Select one measurable 72-hour action and defer nonessential tasks.'},
        {id:'risk',label:'Evaluate a decision',tip:'List what you know, what you assume and what you must verify first.'},
      ]},
    career: {label:'Career & work',question:'Which change in your working life matters most?',
      idea:'Write the three strengths you can demonstrate with real work, and one next opportunity to explore.',
      options:[
        {id:'role',label:'Find a new role',tip:'Choose one type of role and compare its requirements with your recent experience.'},
        {id:'pivot',label:'Change direction',tip:'Find a low-risk way to try the new field before a major commitment.'},
        {id:'practice',label:'Grow my own practice',tip:'Define one clear service and the kind of client it is designed to help.'},
      ]},
    opportunities: {label:'New opportunities',question:'What kind of opportunity are you looking for?',
      idea:'Collect three possible directions, then choose the cheapest experiment that could teach you something.',
      options:[
        {id:'discover',label:'Find new ideas',tip:'Talk with three people about an unsolved problem instead of guessing demand.'},
        {id:'compare',label:'Choose between options',tip:'Use three criteria: real demand, time and downside risk.'},
        {id:'experiment',label:'Take a first step',tip:'Try a reversible 72-hour experiment before committing large resources.'},
      ]},
    team: {label:'Team & partners',question:'Which part of working together needs more clarity?',
      idea:'Make responsibilities visible: owner, decision maker and next action for one shared task.',
      options:[
        {id:'roles',label:'Unclear roles',tip:'Write down who decides, who executes and who checks progress.'},
        {id:'tension',label:'Partner disagreement',tip:'Distinguish agreed facts, conflicting priorities and decisions still open.'},
        {id:'people',label:'Finding the right people',tip:'Define the task and success measure before choosing a collaborator.'},
      ]},
    focus: {label:'Focus & productivity',question:'What is getting in the way of action?',
      idea:'Identify one manageable next step that can be completed in 20 minutes.',
      options:[
        {id:'overload',label:'Too many tasks',tip:'Keep only one priority for the next 24 hours and write it visibly.'},
        {id:'delay',label:'I keep postponing',tip:'Make the next step small enough to start without preparing everything first.'},
        {id:'energy',label:'Not enough energy',tip:'Review your workload and recovery; choose a sustainable pace, not a bigger promise.'},
      ]},
  },
  ru: {
    money: {label:'Деньги и доход',question:'Что вы хотите изменить в своих доходах?',
      idea:'Сравните три последних источника дохода и выберите одно улучшение для проверки на этой неделе.',
      options:[
        {id:'increase',label:'Зарабатывать больше',tip:'Выберите одну услугу и проверьте её цену, спрос и себестоимость.'},
        {id:'stability',label:'Стабилизировать доход',tip:'Выпишите повторные покупки и обязательные расходы; выберите одно регулярное действие.'},
        {id:'pricing',label:'Разобраться с ценами',tip:'Сравните затраты времени и реальную ценность своей самой востребованной услуги.'},
      ]},
    clients: {label:'Клиенты и продажи',question:'На каком этапе работы с клиентами возникают трудности?',
      idea:'Вспомните пять последних разговоров с клиентами. Какой вопрос звучал чаще всего?',
      options:[
        {id:'reach',label:'Найти клиентов',tip:'Опишите одного конкретного клиента и канал, где вы можете до него достучаться.'},
        {id:'conversion',label:'Превратить интерес в заказ',tip:'Разберите путь от первого обращения до согласованного платного предложения.'},
        {id:'retention',label:'Вернуть клиентов',tip:'Подумайте, какую полезную помощь можно предложить прежним клиентам с их согласия.'},
      ]},
    start: {label:'Запуск своего дела',question:'На каком этапе находится ваш проект?',
      idea:'Опишите самый маленький вариант услуги, который можно проверить на реальном человеке.',
      options:[
        {id:'idea',label:'Есть только идея',tip:'Запишите одну проблему, кому она мешает и как вы проверите идею.'},
        {id:'launch',label:'Уже запускаю',tip:'Выберите первое предложение и один измеримый признак интереса.'},
        {id:'restart',label:'Запустил, но застрял',tip:'Отделите подтверждённые запросы клиентов от непроверенных предположений.'},
      ]},
    strategy: {label:'Бизнес и стратегия',question:'Какое бизнес-решение сейчас важнее всего?',
      idea:'Возьмите одно решение и выпишите три варианта, риски и небольшой следующий эксперимент.',
      options:[
        {id:'direction',label:'Выбрать направление',tip:'Сравните два пути по спросу, усилиям и доступным ресурсам.'},
        {id:'priorities',label:'Расставить приоритеты',tip:'Выберите одно измеримое действие на 72 часа, остальное отложите.'},
        {id:'risk',label:'Оценить важное решение',tip:'Разделите факты, предположения и то, что необходимо проверить.'},
      ]},
    career: {label:'Карьера и работа',question:'Что вы хотите изменить в своей работе?',
      idea:'Запишите три сильные стороны, подтверждённые опытом, и одну возможность для изучения.',
      options:[
        {id:'role',label:'Найти новую работу',tip:'Выберите одну роль и сравните требования со своим опытом.'},
        {id:'pivot',label:'Сменить профессию',tip:'Найдите безопасный способ попробовать новую сферу до серьёзных обязательств.'},
        {id:'practice',label:'Развить частную практику',tip:'Сформулируйте одну услугу и конкретного клиента, которому она полезна.'},
      ]},
    opportunities: {label:'Новые возможности',question:'Какие новые возможности вы ищете?',
      idea:'Соберите три направления и выберите самый недорогой эксперимент, который даст новые данные.',
      options:[
        {id:'discover',label:'Ищу новые идеи',tip:'Поговорите с тремя людьми о нерешённой проблеме, не угадывая спрос.'},
        {id:'compare',label:'Выбираю из вариантов',tip:'Сравните спрос, необходимое время и возможные потери.'},
        {id:'experiment',label:'Хочу попробовать',tip:'Проведите обратимый эксперимент за 72 часа без крупных вложений.'},
      ]},
    team: {label:'Команда и партнёры',question:'Что нужно прояснить в совместной работе?',
      idea:'Для одной общей задачи обозначьте ответственного, принимающего решение и следующий шаг.',
      options:[
        {id:'roles',label:'Непонятные роли',tip:'Запишите, кто принимает решение, кто выполняет и кто проверяет результат.'},
        {id:'tension',label:'Разногласия с партнёром',tip:'Отделите согласованные факты от разных приоритетов и открытых решений.'},
        {id:'people',label:'Нужны люди',tip:'Сначала определите задачу и критерий успеха, потом ищите исполнителя.'},
      ]},
    focus: {label:'Фокус и продуктивность',question:'Что больше всего мешает двигаться?',
      idea:'Выберите один следующий шаг, который можно закончить за 20 минут.',
      options:[
        {id:'overload',label:'Слишком много задач',tip:'Оставьте один приоритет на сутки и выпишите его отдельно.'},
        {id:'delay',label:'Постоянно откладываю',tip:'Уменьшите следующую задачу так, чтобы её можно было начать без подготовки.'},
        {id:'energy',label:'Не хватает сил',tip:'Сопоставьте нагрузку и восстановление; выберите посильный темп.'},
      ]},
  },
  es: {
    money: {label:'Dinero e ingresos',question:'¿Qué te gustaría cambiar de tus ingresos?',
      idea:'Revisa tus tres fuentes de ingresos recientes y elige una mejora para comprobar esta semana.',
      options:[
        {id:'increase',label:'Ganar más',tip:'Elige una oferta y revisa su precio, demanda y coste real.'},
        {id:'stability',label:'Ingresos estables',tip:'Anota compras recurrentes y gastos fijos; elige una acción mensual previsible.'},
        {id:'pricing',label:'Revisar mis precios',tip:'Compara el tiempo invertido y el valor real de tu servicio más solicitado.'},
      ]},
    clients: {label:'Clientes y ventas',question:'¿En qué parte de la relación con clientes hay más dificultad?',
      idea:'Repasa cinco conversaciones recientes con clientes. ¿Qué pregunta se repitió?',
      options:[
        {id:'reach',label:'Encontrar clientes',tip:'Describe un cliente concreto y un lugar donde podrías llegar a él.'},
        {id:'conversion',label:'Convertir interés en venta',tip:'Traza el paso de la primera consulta a una oferta acordada.'},
        {id:'retention',label:'Conseguir que vuelvan',tip:'Piensa en un seguimiento útil para clientes existentes, con su permiso.'},
      ]},
    start: {label:'Iniciar un negocio',question:'¿En qué fase está tu proyecto?',
      idea:'Describe la versión más pequeña del servicio que podrías probar con una persona real.',
      options:[
        {id:'idea',label:'Tengo una idea',tip:'Define un problema, para quién es y cómo comprobarás la idea.'},
        {id:'launch',label:'Estoy lanzando',tip:'Elige una primera oferta y una señal medible de interés.'},
        {id:'restart',label:'Empecé y me atasqué',tip:'Separa lo confirmado por clientes de las suposiciones sin comprobar.'},
      ]},
    strategy: {label:'Negocio y estrategia',question:'¿Qué decisión de negocio necesitas aclarar?',
      idea:'Elige una decisión y apunta tres opciones, sus riesgos y una prueba pequeña.',
      options:[
        {id:'direction',label:'Elegir dirección',tip:'Compara dos caminos por demanda, esfuerzo y recursos disponibles.'},
        {id:'priorities',label:'Ordenar prioridades',tip:'Elige una acción medible para 72 horas y aplaza el resto.'},
        {id:'risk',label:'Evaluar una decisión',tip:'Separa hechos, suposiciones y lo que falta comprobar.'},
      ]},
    career: {label:'Carrera y trabajo',question:'¿Qué cambio laboral te interesa?',
      idea:'Escribe tres fortalezas demostrables y una oportunidad que quieras explorar.',
      options:[
        {id:'role',label:'Encontrar otro trabajo',tip:'Elige un tipo de puesto y compara sus requisitos con tu experiencia.'},
        {id:'pivot',label:'Cambiar de sector',tip:'Encuentra una prueba de bajo riesgo antes de comprometerte.'},
        {id:'practice',label:'Ampliar mi práctica',tip:'Define un servicio y el cliente concreto al que va dirigido.'},
      ]},
    opportunities: {label:'Nuevas oportunidades',question:'¿Qué tipo de oportunidad estás buscando?',
      idea:'Anota tres posibilidades y prueba primero el experimento que cueste menos.',
      options:[
        {id:'discover',label:'Buscar ideas',tip:'Habla con tres personas sobre un problema real sin adivinar la demanda.'},
        {id:'compare',label:'Comparar opciones',tip:'Contrasta demanda, tiempo necesario y posibles pérdidas.'},
        {id:'experiment',label:'Dar un primer paso',tip:'Prueba un experimento reversible de 72 horas sin grandes gastos.'},
      ]},
    team: {label:'Equipo y socios',question:'¿Qué necesita aclararse en el trabajo conjunto?',
      idea:'Define responsable, decisor y siguiente acción para una tarea compartida.',
      options:[
        {id:'roles',label:'Funciones poco claras',tip:'Apunta quién decide, quién hace y quién comprueba el avance.'},
        {id:'tension',label:'Desacuerdo con socio',tip:'Distingue hechos comunes, prioridades diferentes y decisiones pendientes.'},
        {id:'people',label:'Encontrar colaboradores',tip:'Define la tarea y el criterio de éxito antes de elegir a alguien.'},
      ]},
    focus: {label:'Enfoque y productividad',question:'¿Qué está frenando tu avance?',
      idea:'Elige un paso que puedas terminar en 20 minutos.',
      options:[
        {id:'overload',label:'Demasiadas tareas',tip:'Mantén una prioridad visible para las próximas 24 horas.'},
        {id:'delay',label:'Sigo posponiendo',tip:'Reduce el siguiente paso hasta poder empezarlo sin más preparación.'},
        {id:'energy',label:'Me falta energía',tip:'Revisa carga y descanso; elige un ritmo sostenible.'},
      ]},
  },
};

// Strong signals beat generic mentions of "business", and ties remain unresolved.
const signals = [
  {topic:'money',weight:3,pattern:/доход|денег|деньг|заработ|выручк|прибыл|цен[ыуе]|бюджет|finance|income|revenue|profit|earn|pricing|salary|dinero|ingres|precio|ganar/giu},
  {topic:'clients',weight:3,pattern:/клиент|заказчик|покупател|продаж|маркетинг|реклам|лид[ыов]|client|customer|sale|marketing|lead|clientes?|ventas?|vender/giu},
  {topic:'start',weight:3,pattern:/запуск|запустить|открыть|открываю|начать дело|стартап|создать бизнес|start a|startup|launch|begin a business|abrir|empezar|iniciar|lanzar/giu},
  {topic:'career',weight:3,pattern:/карьер|работу|работы|професси|ваканс|резюме|career|job|profession|employment|empleo|carrera|profesi[oó]n|trabajo/giu},
  {topic:'opportunities',weight:3,pattern:/возможност|нов[а-я]* направлен|нов[а-я]* иде|перспектив|opportunit|new idea|possibilit|oportunidad|nueva idea/giu},
  {topic:'team',weight:3,pattern:/команд|партнер|партнёр|сотрудник|конфликт|team|partner|employee|staff|equipo|socios|conflicto/giu},
  {topic:'focus',weight:3,pattern:/прокраст|откладыв|распыля|устал|не хватает сил|мотивац|фокус|выгора|focus|overwhelm|procrastin|burnout|energy|agotad|motivaci[oó]n|concentraci[oó]n/giu},
  {topic:'strategy',weight:3,pattern:/стратег|решени|приоритет|планирован|strategy|decision|priorit|estrateg|decisi[oó]n|prioridad/giu},
  {topic:'strategy',weight:0.4,pattern:/бизнес|делом|сво[йе] проект|business|negocio|empresa/giu},
];

export function inferBusinessTopic(question) {
  if (typeof question !== 'string' || question.trim().length < 4) return null;
  const text = question.toLowerCase().normalize('NFKC').replace(/ё/g,'е').slice(0,400);
  const scores = Object.fromEntries(BUSINESS_QUESTION_TOPICS.map(topic=>[topic,0]));
  for (const {topic,weight,pattern} of signals) {
    pattern.lastIndex = 0;
    scores[topic] += Math.min(3,(text.match(pattern)||[]).length)*weight;
  }
  const sorted = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  return sorted[0][1] === 0 || sorted[0][1] === sorted[1][1] ? null : sorted[0][0];
}
export function businessNeedForTopic(topic) {
  if (topic === 'money' || topic === 'clients' || topic === 'career') return 'income';
  if (topic === 'start' || topic === 'team' || topic === 'opportunities' || topic === 'strategy') return 'growth';
  return 'clarity';
}
