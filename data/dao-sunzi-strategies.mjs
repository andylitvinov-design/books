// Verified Chinese passages from the received text of Sunzi Bingfa (13 chapters).
// Source: https://zh.wikisource.org/wiki/孫子兵法 ; our own short EN/RU/ES translations.
// Hexagram -> passage assignments are editorial thematic matches, NOT a historical
// canonical correspondence. Never silently attribute the interpretations to Sunzi.
export const sunTzuPassages = Object.freeze({
  "a": {
    "chapter": 3,
    "original": "知可以戰與不可以戰者勝",
    "translation": {
      "ru": "Побеждает тот, кто знает, когда следует сражаться, а когда — нет.",
      "en": "Those who know when to fight and when not to fight prevail.",
      "es": "Vence quien sabe cuándo luchar y cuándo no."
    }
  },
  "b": {
    "chapter": 4,
    "original": "先為不可勝，以待敵之可勝",
    "translation": {
      "ru": "Сначала сделай себя неуязвимым и жди удобного момента.",
      "en": "First secure yourself against defeat, then await an opening.",
      "es": "Primero protégete de la derrota y espera la oportunidad."
    }
  },
  "c": {
    "chapter": 3,
    "original": "不戰而屈人之兵，善之善者也",
    "translation": {
      "ru": "Высшее мастерство — одолеть противника без сражения.",
      "en": "Supreme skill is to overcome without fighting.",
      "es": "La mayor destreza es vencer sin combatir."
    }
  },
  "d": {
    "chapter": 3,
    "original": "知彼知己，百戰不殆",
    "translation": {
      "ru": "Знай другого и себя — и не окажешься в опасности в ста битвах.",
      "en": "Know the other and yourself, and you will not be imperiled in a hundred battles.",
      "es": "Conoce al otro y a ti mismo y no correrás peligro en cien batallas."
    }
  },
  "e": {
    "chapter": 3,
    "original": "以虞待不虞者勝",
    "translation": {
      "ru": "Подготовленный побеждает неподготовленного.",
      "en": "The prepared prevail over the unprepared.",
      "es": "Quien está preparado vence a quien no lo está."
    }
  },
  "f": {
    "chapter": 3,
    "original": "上下同欲者勝",
    "translation": {
      "ru": "Побеждают те, чьи цели едины.",
      "en": "Those united in purpose prevail.",
      "es": "Vencen quienes comparten un mismo propósito."
    }
  },
  "g": {
    "chapter": 4,
    "original": "勝兵先勝而後求戰",
    "translation": {
      "ru": "Победоносное войско сначала создаёт условия победы, а потом сражается.",
      "en": "A victorious army first secures victory, then seeks battle.",
      "es": "Un ejército victorioso asegura primero la victoria y después lucha."
    }
  },
  "h": {
    "chapter": 5,
    "original": "凡戰者，以正合，以奇勝",
    "translation": {
      "ru": "Сходятся обычным способом, побеждают неожиданным.",
      "en": "Engage with the regular; prevail with the unexpected.",
      "es": "Se combate con lo ordinario; se vence con lo inesperado."
    }
  },
  "i": {
    "chapter": 5,
    "original": "善戰者，求之於勢，不責於人",
    "translation": {
      "ru": "Умелый полководец опирается на обстоятельства, а не винит людей.",
      "en": "A skilled commander works with the situation rather than blaming people.",
      "es": "Un estratega hábil aprovecha la situación en vez de culpar a otros."
    }
  },
  "j": {
    "chapter": 6,
    "original": "故善戰者，致人而不致於人",
    "translation": {
      "ru": "Умелый полководец управляет обстоятельствами, а не подчиняется им.",
      "en": "The skilled commander shapes events rather than being driven by them.",
      "es": "El estratega hábil influye en los acontecimientos en vez de dejarse arrastrar."
    }
  },
  "k": {
    "chapter": 6,
    "original": "兵無成勢，無恒形",
    "translation": {
      "ru": "У стратегии нет навсегда установленной формы.",
      "en": "Strategy has no permanently fixed form.",
      "es": "La estrategia no tiene una forma fija para siempre."
    }
  },
  "l": {
    "chapter": 6,
    "original": "避實而擊虛",
    "translation": {
      "ru": "Избегай сильного и действуй там, где открыт путь.",
      "en": "Avoid strength and act where there is an opening.",
      "es": "Evita la fuerza y actúa donde haya una oportunidad."
    }
  },
  "m": {
    "chapter": 7,
    "original": "以迂為直，以患為利",
    "translation": {
      "ru": "Обходной путь может оказаться прямым, а трудность — возможностью.",
      "en": "A detour may become the direct route, and difficulty an advantage.",
      "es": "Un rodeo puede ser el camino directo y una dificultad, una ventaja."
    }
  },
  "n": {
    "chapter": 7,
    "original": "其疾如風，其徐如林",
    "translation": {
      "ru": "Будь стремителен как ветер и спокоен как лес.",
      "en": "Be swift as the wind and unhurried as a forest.",
      "es": "Sé veloz como el viento y sereno como un bosque."
    }
  },
  "o": {
    "chapter": 7,
    "original": "不動如山",
    "translation": {
      "ru": "Будь неподвижен, как гора.",
      "en": "Remain unmoving like a mountain.",
      "es": "Permanece firme como una montaña."
    }
  },
  "p": {
    "chapter": 7,
    "original": "以靜待嘩",
    "translation": {
      "ru": "Встречай шум и смятение спокойствием.",
      "en": "Meet clamor and confusion with calm.",
      "es": "Enfrenta el ruido y la confusión con calma."
    }
  },
  "q": {
    "chapter": 8,
    "original": "無恃其不來，恃吾有以待之",
    "translation": {
      "ru": "Не надейся, что трудность не придёт; подготовься встретить её.",
      "en": "Do not rely on trouble staying away; be ready to meet it.",
      "es": "No confíes en que las dificultades no vendrán; prepárate para afrontarlas."
    }
  },
  "r": {
    "chapter": 8,
    "original": "智者之慮，必雜於利害",
    "translation": {
      "ru": "Мудрый видит и выгоды, и опасности.",
      "en": "The wise consider both benefits and dangers.",
      "es": "La persona sabia contempla ventajas y riesgos."
    }
  },
  "s": {
    "chapter": 8,
    "original": "途有所不由，軍有所不擊",
    "translation": {
      "ru": "Есть дороги, по которым не идут, и битвы, в которые не вступают.",
      "en": "Some roads should not be taken, and some battles not fought.",
      "es": "Hay caminos que no conviene tomar y batallas que no conviene librar."
    }
  },
  "t": {
    "chapter": 12,
    "original": "非利不動，非得不用，非危不戰",
    "translation": {
      "ru": "Не действуй без пользы, не трать силы без цели, не сражайся без нужды.",
      "en": "Do not act without benefit, expend force without gain, or fight without necessity.",
      "es": "No actúes sin beneficio, no gastes fuerzas sin propósito ni luches sin necesidad."
    }
  },
  "u": {
    "chapter": 12,
    "original": "合於利而動，不合於利而止",
    "translation": {
      "ru": "Двигайся, когда действие уместно; останавливайся, когда нет.",
      "en": "Move when action serves the purpose; stop when it does not.",
      "es": "Avanza cuando actuar sea útil; detente cuando no lo sea."
    }
  },
  "v": {
    "chapter": 2,
    "original": "故兵貴勝，不貴久",
    "translation": {
      "ru": "Важен результат, а не затягивание борьбы.",
      "en": "What matters is success, not prolonged struggle.",
      "es": "Lo importante es el resultado, no prolongar la lucha."
    }
  },
  "w": {
    "chapter": 1,
    "original": "夫未戰而廟算勝者，得算多也",
    "translation": {
      "ru": "Кто тщательно рассчитывает до действия, получает преимущество.",
      "en": "Careful planning before action brings an advantage.",
      "es": "Planificar cuidadosamente antes de actuar da ventaja."
    }
  },
  "x": {
    "chapter": 9,
    "original": "上雨，水沫至，欲涉者，待其定也",
    "translation": {
      "ru": "После дождя дождись, пока поток успокоится, прежде чем переходить.",
      "en": "After rain, wait for the waters to settle before crossing.",
      "es": "Tras la lluvia, espera a que las aguas se calmen antes de cruzar."
    }
  },
  "y": {
    "chapter": 11,
    "original": "圍地則謀，死地則戰",
    "translation": {
      "ru": "В тесных обстоятельствах обдумывай путь; в крайних — действуй.",
      "en": "In constrained terrain, plan; in dire straits, act.",
      "es": "En terreno cercado, planifica; en una situación extrema, actúa."
    }
  },
  "z": {
    "chapter": 10,
    "original": "知天知地，勝乃可全",
    "translation": {
      "ru": "Учитывай время и место, чтобы сохранить успех.",
      "en": "Know the timing and terrain to secure your success.",
      "es": "Conoce el momento y el terreno para asegurar el éxito."
    }
  },
  "aa": {
    "chapter": 10,
    "original": "進不求名，退不避罪",
    "translation": {
      "ru": "Не наступай ради славы и не отступай из страха осуждения.",
      "en": "Do not advance for fame or retreat for fear of blame.",
      "es": "No avances por fama ni retrocedas por miedo a las críticas."
    }
  },
  "ab": {
    "chapter": 7,
    "original": "以治待亂",
    "translation": {
      "ru": "Встречай беспорядок собственной организованностью.",
      "en": "Meet disorder with discipline.",
      "es": "Responde al desorden con organización."
    }
  },
  "ac": {
    "chapter": 7,
    "original": "圍師必闕，窮寇勿迫",
    "translation": {
      "ru": "Оставляй окружённому выход и не загоняй отчаявшегося в угол.",
      "en": "Leave an escape route and do not corner the desperate.",
      "es": "Deja una salida y no acorrales a quien está desesperado."
    }
  },
  "ad": {
    "chapter": 13,
    "original": "故明君賢將，所以動而勝人，成功出於眾者，先知也",
    "translation": {
      "ru": "Успех мудрых руководителей основан на предварительном знании.",
      "en": "Wise leaders succeed through knowledge gained beforehand.",
      "es": "Los líderes sabios triunfan gracias al conocimiento previo."
    }
  },
  "ae": {
    "chapter": 5,
    "original": "奇正相生，如循環之無端",
    "translation": {
      "ru": "Обычное и неожиданное рождают друг друга без конца.",
      "en": "The regular and the unexpected give rise to each other endlessly.",
      "es": "Lo ordinario y lo inesperado se engendran mutuamente sin fin."
    }
  },
  "af": {
    "chapter": 7,
    "original": "先知迂直之計者勝",
    "translation": {
      "ru": "Побеждает тот, кто понимает прямые и обходные пути.",
      "en": "Those who understand direct and indirect paths prevail.",
      "es": "Vence quien comprende los caminos directos e indirectos."
    }
  }
});
export const sunTzuHexagramStrategies = Object.freeze([
  {
    "number": 1,
    "quote": "g",
    "strategy": {
      "ru": "Начните созидание с ясной цели и основания, а не с демонстрации силы.",
      "en": "Begin creating with a clear purpose and solid foundations, not a show of force.",
      "es": "Empieza a crear con un propósito claro y bases firmes, no con una demostración de fuerza."
    }
  },
  {
    "number": 2,
    "quote": "o",
    "strategy": {
      "ru": "Сохраняйте устойчивость и поддерживайте других без спешки.",
      "en": "Stay grounded and support others without rushing.",
      "es": "Mantén la firmeza y apoya a los demás sin prisas."
    }
  },
  {
    "number": 3,
    "quote": "q",
    "strategy": {
      "ru": "Первые трудности требуют подготовки: укрепите опору перед продвижением.",
      "en": "Early obstacles demand preparation: strengthen your footing first.",
      "es": "Los primeros obstáculos exigen preparación: refuerza tu base antes de avanzar."
    }
  },
  {
    "number": 4,
    "quote": "ad",
    "strategy": {
      "ru": "Прежде чем решать, узнайте недостающее и попросите совета.",
      "en": "Before deciding, learn what you lack and seek counsel.",
      "es": "Antes de decidir, aprende lo que te falta y busca consejo."
    }
  },
  {
    "number": 5,
    "quote": "x",
    "strategy": {
      "ru": "Дождитесь прояснения обстоятельств и подготовьтесь к следующему шагу.",
      "en": "Wait for conditions to clear while preparing your next step.",
      "es": "Espera a que las condiciones se aclaren mientras preparas el siguiente paso."
    }
  },
  {
    "number": 6,
    "quote": "a",
    "strategy": {
      "ru": "Не превращайте спор в войну: различите, что действительно стоит защищать.",
      "en": "Do not turn disagreement into war: choose what truly needs defending.",
      "es": "No conviertas el desacuerdo en guerra: distingue lo que merece defensa."
    }
  },
  {
    "number": 7,
    "quote": "f",
    "strategy": {
      "ru": "Соберите людей вокруг общей цели прежде, чем требовать действий.",
      "en": "Build agreement around a common goal before calling for action.",
      "es": "Une a las personas en torno a un objetivo común antes de exigir acción."
    }
  },
  {
    "number": 8,
    "quote": "f",
    "strategy": {
      "ru": "Поддерживайте союзы, основанные на доверии и общем направлении.",
      "en": "Nurture alliances built on trust and shared direction.",
      "es": "Cultiva alianzas basadas en la confianza y una dirección compartida."
    }
  },
  {
    "number": 9,
    "quote": "b",
    "strategy": {
      "ru": "Укрепляйте малые достижения; не ускоряйте большой рывок.",
      "en": "Consolidate small gains; do not force a major leap.",
      "es": "Consolida pequeños avances; no fuerces un gran salto."
    }
  },
  {
    "number": 10,
    "quote": "r",
    "strategy": {
      "ru": "Ступайте осторожно: уважайте границы и оценивайте последствия.",
      "en": "Tread carefully: respect boundaries and weigh consequences.",
      "es": "Camina con cautela: respeta los límites y valora las consecuencias."
    }
  },
  {
    "number": 11,
    "quote": "u",
    "strategy": {
      "ru": "Используйте открывшееся согласие для спокойного и полезного движения.",
      "en": "Use this period of harmony for measured, useful progress.",
      "es": "Aprovecha este período de armonía para avanzar de forma serena y útil."
    }
  },
  {
    "number": 12,
    "quote": "s",
    "strategy": {
      "ru": "Когда пути закрыты, не тратьте силы на бесплодное столкновение.",
      "en": "When paths are blocked, do not waste energy on futile confrontation.",
      "es": "Cuando los caminos estén cerrados, no gastes energía en confrontaciones inútiles."
    }
  },
  {
    "number": 13,
    "quote": "f",
    "strategy": {
      "ru": "Ищите единство намерений, сохраняя самостоятельность каждого.",
      "en": "Seek shared purpose while respecting each person's independence.",
      "es": "Busca un propósito compartido respetando la independencia de cada persona."
    }
  },
  {
    "number": 14,
    "quote": "r",
    "strategy": {
      "ru": "Обращайтесь с большим ресурсом мудро, учитывая и возможности, и риски.",
      "en": "Steward abundant resources wisely, weighing opportunities and risks.",
      "es": "Administra bien los grandes recursos, valorando oportunidades y riesgos."
    }
  },
  {
    "number": 15,
    "quote": "p",
    "strategy": {
      "ru": "Проявите скромность и спокойствие; не позволяйте успеху затмить рассудок.",
      "en": "Lead with modesty and calm; do not let success cloud judgment.",
      "es": "Actúa con modestia y calma; no dejes que el éxito nuble el juicio."
    }
  },
  {
    "number": 16,
    "quote": "e",
    "strategy": {
      "ru": "Воодушевление хорошо, когда подкреплено подготовкой и дисциплиной.",
      "en": "Enthusiasm works best when backed by preparation and discipline.",
      "es": "El entusiasmo funciona mejor cuando va acompañado de preparación y disciplina."
    }
  },
  {
    "number": 17,
    "quote": "k",
    "strategy": {
      "ru": "Следуйте изменениям, не цепляясь за вчерашнюю форму.",
      "en": "Respond to change rather than clinging to yesterday's form.",
      "es": "Adáptate al cambio sin aferrarte a la forma de ayer."
    }
  },
  {
    "number": 18,
    "quote": "ab",
    "strategy": {
      "ru": "Исправляйте накопившийся беспорядок последовательно, начиная с причин.",
      "en": "Repair accumulated disorder steadily, beginning with its causes.",
      "es": "Corrige el desorden acumulado con constancia, empezando por las causas."
    }
  },
  {
    "number": 19,
    "quote": "j",
    "strategy": {
      "ru": "Используйте благоприятную близость для поддержки, а не для контроля.",
      "en": "Use favorable proximity to support, not control.",
      "es": "Aprovecha la cercanía favorable para apoyar, no para controlar."
    }
  },
  {
    "number": 20,
    "quote": "d",
    "strategy": {
      "ru": "Сначала наблюдайте ситуацию и себя, затем выбирайте действие.",
      "en": "Observe the situation and yourself before deciding how to act.",
      "es": "Observa la situación y obsérvate antes de elegir cómo actuar."
    }
  },
  {
    "number": 21,
    "quote": "aa",
    "strategy": {
      "ru": "Восстановите порядок без мести и стремления произвести впечатление.",
      "en": "Restore order without revenge or the need to impress.",
      "es": "Restablece el orden sin venganza ni necesidad de impresionar."
    }
  },
  {
    "number": 22,
    "quote": "w",
    "strategy": {
      "ru": "Красота формы должна опираться на продуманное содержание.",
      "en": "Let an attractive form rest on thoughtful substance.",
      "es": "Haz que la belleza de la forma se apoye en un contenido bien pensado."
    }
  },
  {
    "number": 23,
    "quote": "b",
    "strategy": {
      "ru": "При разрушении основы отступите и защитите то, что ещё цело.",
      "en": "When foundations crumble, withdraw and protect what remains intact.",
      "es": "Cuando se derrumben las bases, retírate y protege lo que sigue intacto."
    }
  },
  {
    "number": 24,
    "quote": "ae",
    "strategy": {
      "ru": "Возвращайтесь к главному через малые регулярные шаги.",
      "en": "Return to what matters through small, repeated steps.",
      "es": "Vuelve a lo esencial mediante pequeños pasos constantes."
    }
  },
  {
    "number": 25,
    "quote": "u",
    "strategy": {
      "ru": "Действуйте честно и просто; не создавайте хитроумных препятствий.",
      "en": "Act plainly and honestly; do not create needless complications.",
      "es": "Actúa con sencillez y honestidad; no crees complicaciones innecesarias."
    }
  },
  {
    "number": 26,
    "quote": "b",
    "strategy": {
      "ru": "Накопите знания и силы, прежде чем раскрывать весь потенциал.",
      "en": "Gather knowledge and strength before releasing your full potential.",
      "es": "Acumula conocimiento y fuerza antes de desplegar todo tu potencial."
    }
  },
  {
    "number": 27,
    "quote": "r",
    "strategy": {
      "ru": "Выбирайте то, чем питаете ум, речь и отношения.",
      "en": "Choose carefully what nourishes your mind, words, and relationships.",
      "es": "Elige con cuidado aquello que alimenta tu mente, tus palabras y relaciones."
    }
  },
  {
    "number": 28,
    "quote": "y",
    "strategy": {
      "ru": "Когда нагрузка чрезмерна, пересмотрите опоры и решительно разгрузите их.",
      "en": "Under excessive strain, reassess supports and decisively reduce the load.",
      "es": "Ante una carga excesiva, revisa los apoyos y reduce el peso con decisión."
    }
  },
  {
    "number": 29,
    "quote": "q",
    "strategy": {
      "ru": "В повторяющейся опасности полагайтесь на подготовку, а не на удачу.",
      "en": "In repeated danger, rely on preparation rather than luck.",
      "es": "Ante peligros repetidos, confía en la preparación, no en la suerte."
    }
  },
  {
    "number": 30,
    "quote": "z",
    "strategy": {
      "ru": "Дайте ясности опереться на реальные обстоятельства и подходящее время.",
      "en": "Ground your clarity in real circumstances and good timing.",
      "es": "Apoya tu claridad en las circunstancias reales y el momento oportuno."
    }
  },
  {
    "number": 31,
    "quote": "c",
    "strategy": {
      "ru": "Не принуждайте к отклику: подлинное влияние не требует борьбы.",
      "en": "Do not force a response: genuine influence needs no struggle.",
      "es": "No fuerces una respuesta: la influencia auténtica no necesita lucha."
    }
  },
  {
    "number": 32,
    "quote": "o",
    "strategy": {
      "ru": "Поддерживайте избранный курс устойчивыми действиями, без суеты.",
      "en": "Maintain your chosen course through steady action, without haste.",
      "es": "Mantén el rumbo elegido con acciones constantes y sin prisa."
    }
  },
  {
    "number": 33,
    "quote": "s",
    "strategy": {
      "ru": "Отойдите от бесперспективного противостояния, сохранив достоинство.",
      "en": "Withdraw from a fruitless confrontation while keeping your dignity.",
      "es": "Retírate de una confrontación estéril conservando tu dignidad."
    }
  },
  {
    "number": 34,
    "quote": "t",
    "strategy": {
      "ru": "Используйте большую силу лишь там, где есть ясная необходимость.",
      "en": "Use great strength only where there is a clear need.",
      "es": "Emplea tu gran fuerza solo cuando exista una necesidad clara."
    }
  },
  {
    "number": 35,
    "quote": "n",
    "strategy": {
      "ru": "Когда открыт путь, действуйте своевременно, без лишней медлительности.",
      "en": "When the path opens, act promptly without needless delay.",
      "es": "Cuando se abra el camino, actúa a tiempo sin demoras innecesarias."
    }
  },
  {
    "number": 36,
    "quote": "a",
    "strategy": {
      "ru": "Не вступайте в бесплодное противостояние. Сохраните силы и внутренний свет. Сейчас мудрость — в осторожности и выборе благоприятного момента для действия.",
      "en": "Avoid futile confrontation. Protect your strength and inner light. Wisdom now lies in caution and choosing the right moment to act.",
      "es": "Evita confrontaciones inútiles. Conserva tu fuerza y tu luz interior. La sabiduría está ahora en la cautela y en elegir el momento adecuado."
    }
  },
  {
    "number": 37,
    "quote": "f",
    "strategy": {
      "ru": "Укрепляйте согласие внутри семьи или команды до решения внешних задач.",
      "en": "Strengthen harmony in the family or team before tackling outside challenges.",
      "es": "Fortalece la armonía familiar o del equipo antes de afrontar los retos externos."
    }
  },
  {
    "number": 38,
    "quote": "ac",
    "strategy": {
      "ru": "Оставьте пространство для различий, не загоняя отношения в тупик.",
      "en": "Make room for differences instead of forcing relationships into a corner.",
      "es": "Deja espacio para las diferencias en vez de llevar las relaciones a un callejón sin salida."
    }
  },
  {
    "number": 39,
    "quote": "m",
    "strategy": {
      "ru": "Если дорога закрыта, найдите обход и попросите поддержки.",
      "en": "If the path is blocked, seek a detour and ask for help.",
      "es": "Si el camino está bloqueado, busca un rodeo y pide ayuda."
    }
  },
  {
    "number": 40,
    "quote": "v",
    "strategy": {
      "ru": "Освободившись от напряжения, завершайте конфликт, не продлевая его.",
      "en": "As tension lifts, resolve the conflict instead of prolonging it.",
      "es": "Cuando ceda la tensión, resuelve el conflicto en vez de prolongarlo."
    }
  },
  {
    "number": 41,
    "quote": "t",
    "strategy": {
      "ru": "Сократите лишнее, чтобы сохранить силы для действительно важного.",
      "en": "Reduce what is unnecessary to preserve strength for what matters.",
      "es": "Reduce lo innecesario para conservar fuerzas para lo importante."
    }
  },
  {
    "number": 42,
    "quote": "i",
    "strategy": {
      "ru": "Направьте прирост сил туда, где обстоятельства дают наибольшую пользу.",
      "en": "Direct new resources where circumstances offer the greatest benefit.",
      "es": "Dirige los nuevos recursos allí donde las circunstancias aporten más valor."
    }
  },
  {
    "number": 43,
    "quote": "aa",
    "strategy": {
      "ru": "Говорите правду решительно, но не превращайте ясность в агрессию.",
      "en": "Speak clearly and firmly without turning conviction into aggression.",
      "es": "Habla con claridad y firmeza sin convertir la convicción en agresión."
    }
  },
  {
    "number": 44,
    "quote": "r",
    "strategy": {
      "ru": "Не спешите сближаться с сильным влиянием; сначала оцените последствия.",
      "en": "Do not rush toward a powerful influence; assess its consequences first.",
      "es": "No te acerques deprisa a una influencia poderosa; evalúa antes sus consecuencias."
    }
  },
  {
    "number": 45,
    "quote": "f",
    "strategy": {
      "ru": "Соберите единомышленников вокруг общего намерения и понятных правил.",
      "en": "Unite people around a shared intention and clear principles.",
      "es": "Reúne a las personas en torno a una intención común y reglas claras."
    }
  },
  {
    "number": 46,
    "quote": "n",
    "strategy": {
      "ru": "Поднимайтесь постепенно, используя каждый подходящий момент для роста.",
      "en": "Rise gradually, making use of each suitable moment to grow.",
      "es": "Asciende gradualmente, aprovechando cada oportunidad de crecimiento."
    }
  },
  {
    "number": 47,
    "quote": "p",
    "strategy": {
      "ru": "При истощении сохраняйте спокойствие и не принимайте решений из паники.",
      "en": "When depleted, remain calm and do not decide from panic.",
      "es": "Cuando estés agotado, mantén la calma y no decidas desde el pánico."
    }
  },
  {
    "number": 48,
    "quote": "z",
    "strategy": {
      "ru": "Проверьте источник поддержки: полезный ресурс должен оставаться доступным.",
      "en": "Check your source of support: a vital resource must stay accessible.",
      "es": "Revisa tu fuente de apoyo: un recurso vital debe seguir disponible."
    }
  },
  {
    "number": 49,
    "quote": "h",
    "strategy": {
      "ru": "Перемены требуют нового подхода, а не только замены внешней формы.",
      "en": "True change calls for a new approach, not just a new appearance.",
      "es": "El cambio real exige un enfoque nuevo, no solo una apariencia distinta."
    }
  },
  {
    "number": 50,
    "quote": "i",
    "strategy": {
      "ru": "Создайте условия, в которых талант и опыт смогут приносить пользу.",
      "en": "Create conditions in which talent and experience can serve a purpose.",
      "es": "Crea condiciones donde el talento y la experiencia sean útiles."
    }
  },
  {
    "number": 51,
    "quote": "p",
    "strategy": {
      "ru": "Встретив потрясение, сначала восстановите спокойствие, затем действуйте.",
      "en": "After a shock, regain composure before you act.",
      "es": "Tras una sacudida, recupera la calma antes de actuar."
    }
  },
  {
    "number": 52,
    "quote": "o",
    "strategy": {
      "ru": "Остановитесь там, где движение стало бессмысленным; тишина тоже действие.",
      "en": "Stop where movement has lost its purpose; stillness can be an action.",
      "es": "Detente cuando el movimiento pierda sentido; la quietud también es acción."
    }
  },
  {
    "number": 53,
    "quote": "w",
    "strategy": {
      "ru": "Доверяйте постепенному развитию и укрепляйте каждый этап.",
      "en": "Trust gradual progress and strengthen each stage.",
      "es": "Confía en el progreso gradual y consolida cada etapa."
    }
  },
  {
    "number": 54,
    "quote": "d",
    "strategy": {
      "ru": "Прежде чем связывать обязательства, честно оцените позиции сторон.",
      "en": "Before making commitments, assess each party's position honestly.",
      "es": "Antes de asumir compromisos, evalúa con sinceridad la posición de cada parte."
    }
  },
  {
    "number": 55,
    "quote": "r",
    "strategy": {
      "ru": "В пору изобилия не теряйте меру и замечайте скрытые риски.",
      "en": "In a time of abundance, keep your balance and notice hidden risks.",
      "es": "En tiempos de abundancia, conserva la mesura y observa los riesgos ocultos."
    }
  },
  {
    "number": 56,
    "quote": "af",
    "strategy": {
      "ru": "В пути учитывайте чужие правила и выбирайте безопасные обходы.",
      "en": "On a journey, respect local rules and seek safe routes around obstacles.",
      "es": "Durante el viaje, respeta las reglas del lugar y busca rodeos seguros."
    }
  },
  {
    "number": 57,
    "quote": "k",
    "strategy": {
      "ru": "Проникайте мягко и последовательно; меняйте тактику по обстоятельствам.",
      "en": "Advance gently and consistently; adapt tactics to conditions.",
      "es": "Avanza con suavidad y constancia; adapta la táctica a las circunstancias."
    }
  },
  {
    "number": 58,
    "quote": "c",
    "strategy": {
      "ru": "Создавайте согласие через искреннюю беседу, а не давление.",
      "en": "Build agreement through genuine dialogue rather than pressure.",
      "es": "Construye acuerdos mediante el diálogo sincero, no con presión."
    }
  },
  {
    "number": 59,
    "quote": "f",
    "strategy": {
      "ru": "Разобщение преодолевают общим намерением и восстановлением доверия.",
      "en": "Overcome separation through shared purpose and renewed trust.",
      "es": "Supera la separación con un propósito común y confianza renovada."
    }
  },
  {
    "number": 60,
    "quote": "s",
    "strategy": {
      "ru": "Примите разумные пределы: не каждое действие стоит предпринимать.",
      "en": "Accept sensible limits: not every action is worth taking.",
      "es": "Acepta límites razonables: no toda acción merece emprenderse."
    }
  },
  {
    "number": 61,
    "quote": "d",
    "strategy": {
      "ru": "Прежде чем требовать доверия, честно узнайте себя и другого.",
      "en": "Before asking for trust, get to know yourself and the other honestly.",
      "es": "Antes de pedir confianza, conoce sinceramente al otro y a ti mismo."
    }
  },
  {
    "number": 62,
    "quote": "b",
    "strategy": {
      "ru": "Ставьте небольшие реальные задачи вместо рискованного большого прыжка.",
      "en": "Choose modest achievable steps over a risky leap.",
      "es": "Elige pasos pequeños y alcanzables en vez de un salto arriesgado."
    }
  },
  {
    "number": 63,
    "quote": "q",
    "strategy": {
      "ru": "После завершения успеха сохраняйте готовность к новым переменам.",
      "en": "After success, stay prepared for new changes.",
      "es": "Tras el éxito, mantente preparado para nuevos cambios."
    }
  },
  {
    "number": 64,
    "quote": "x",
    "strategy": {
      "ru": "Не переходите порог раньше времени: завершите подготовку и проверьте путь.",
      "en": "Do not cross too soon: finish preparing and check the path.",
      "es": "No cruces antes de tiempo: termina de prepararte y comprueba el camino."
    }
  }
]);
const byHexagram = new Map(sunTzuHexagramStrategies.map((entry)=>[entry.number,entry]));
export function getSunTzuStrategy(number,locale="ru") {
  if(!["ru","en","es"].includes(locale)) return null;
  const entry=byHexagram.get(Number(number));
  if(!entry) return null;
  const passage=sunTzuPassages[entry.quote];
  return {number:entry.number,chapter:passage.chapter,original:passage.original,quote:passage.translation[locale],strategy:entry.strategy[locale],source:"https://zh.wikisource.org/wiki/孫子兵法"};
}
