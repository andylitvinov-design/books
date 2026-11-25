// OPORA Anti-Stress SKILLS-5.0, 2026-10-17.
// A NEW, version-pinned 14-day educational course: seven skills introduced in
// week 1 and practised with greater independence in week 2.
// V3 and earlier six-phase routes remain immutable for existing cycles.
export const COURSE_ANTISTRESS_SKILLS_V5 = 'hh-antistress-skills-v5-20261017'
export const OPORA_SKILL_SLIDE_MODEL = 'opora-seven-skills-compact-v1'
export const OPORA_LESSON_MINUTES = Object.freeze({target:[8,12],practice:[5,7]})
const local=(ru,en)=>Object.freeze({ru,en})
export const OPORA_SEVEN_SKILLS = Object.freeze([
  {id:'S1',title:local('Осознанность — замечать стресс вовремя','Awareness — notice stress early'),
    result:local('Назвать один ранний сигнал и выбрать посильную реакцию.','Name an early sign and choose a manageable response.'),
    scales:['weekly.load','weekly.tension','weekly.clarity'],
    basic:{
      title:local('Замечаю первые сигналы','Notice my first stress signals'),
      idea:local('Сигнал напряжения — подсказка, а не доказательство опасности.','A stress signal is information, not proof of danger.'),
      practice:local('1. Оглядитесь и назовите три обычные детали вокруг. 2. Вспомните нейтральный или вымышленный напряжённый день. Отметьте один ранний сигнал: торопливость, сжатые плечи, рассеянное внимание или усталость. 3. Выберите один доступный ответ: пауза, стакан воды, отдых или уменьшение задачи. Повторите цепочку «ситуация — сигнал — поддержка» два раза на безопасном примере. Если вспоминать неприятно, оставайтесь с тем, что видите вокруг.','1. Look around and name three ordinary details. 2. Consider a fictional or comfortably familiar busy day. Notice one early signal: hurry, tense shoulders, scattered attention or tiredness. 3. Choose a realistic response: a pause, water, rest or a smaller task. Repeat the situation → signal → support pattern twice using a safe example. If personal recall feels unpleasant, stay with the room around you.'),
      transfer:local('В ближайшем обычном деле замечу один ранний сигнал. Можно только составить план.','During an ordinary task I may notice one early signal; planning alone is fine.')},
    advanced:{
      title:local('Распознаю стресс до перегрузки','Catch stress before overload'),
      idea:local('Чем раньше я замечаю нагрузку, тем больше у меня вариантов.','Noticing pressure sooner can leave more options.'),
      practice:local('1. Выберите безопасную повседневную ситуацию: сообщения, очередь или много небольших дел. 2. Назовите свой возможный первый сигнал; можно выбрать только учебный пример. 3. Представьте два ответа — автоматический и более бережный. 4. Дважды отрепетируйте «замечаю → называю → выбираю малый шаг», второй раз без подсказки или с подсказкой по желанию. Закончите, посмотрев на предмет вокруг.','1. Choose an ordinary low-pressure example: messages, a queue or many small tasks. 2. Name a possible first sign; a fictional sign is enough. 3. Compare an automatic response with a gentler option. 4. Rehearse notice → name → choose a small step twice, with or without a hint. Finish by looking at an ordinary object nearby.'),
      transfer:local('Когда замечу свой сигнал, попробую уменьшить одно требование или сделать паузу.','When a sign appears, I may lower one demand or pause.')}},
  {id:'S2',title:local('Заземление — возвращаться в настоящее','Grounding — return to the present'),
    result:local('Переключать внимание на нейтральную внешнюю опору.','Return attention to a neutral external anchor.'),
    scales:['weekly.tension','weekly.clarity','resource.agency'],
    basic:{
      title:local('У меня есть опора здесь и сейчас','A present-moment anchor'),
      idea:local('Заземление — не приказ расслабиться, а способ заметить настоящее.','Grounding is not an order to relax; it is a way to notice the present.'),
      practice:local('1. Не меняя дыхание, выберите один цвет вокруг. 2. Найдите два обычных предмета и мысленно назовите их форму. 3. Почувствуйте внешнюю опору стула или посмотрите на устойчивую линию, если внимание к телу неприятно. 4. Переведите взгляд между двумя предметами три раза, в удобном темпе. Можно оставить глаза открытыми, отдыхать или завершить упражнение.','1. Without changing your breathing, find one colour. 2. Notice two ordinary objects and name their shapes. 3. Notice support from the chair, or simply look at a steady line if body awareness is unpleasant. 4. Move attention between two objects three times at your own pace. You may keep your eyes open, rest or stop.'),
      transfer:local('Выберу свой нейтральный предмет для короткой паузы.','I will choose a neutral object as a pause cue.')},
    advanced:{
      title:local('Возвращаюсь к опоре при волнении','Grounding during everyday pressure'),
      idea:local('Я могу вернуться к конкретной детали, не споря с волнением.','I can return to a specific detail without arguing with worry.'),
      practice:local('1. Выберите воображаемое небольшое волнение, например ожидание ответа. 2. Назовите три видимых детали пространства. 3. Переключитесь на один спокойный цвет или предмет и понаблюдайте за ним. 4. Ещё раз повторите ориентировку уже с меньшим количеством подсказок, если это комфортно. 5. Отметьте, удалось ли выбрать точку внимания; снижение тревоги не требуется.','1. Think of a fictional, mild everyday uncertainty, such as waiting for a reply. 2. Name three details you see. 3. Rest attention on one neutral colour or object. 4. Repeat with fewer hints if comfortable. 5. Notice whether choosing an anchor was possible; you do not need to feel less anxious.'),
      transfer:local('В момент повседневной спешки могу вернуться к выбранному предмету.','During ordinary hurry, I may return to the chosen object.')}},
  {id:'S3',title:local('Телесная регуляция — управлять напряжением','Body regulation — adjust tension'),
    result:local('Подбирать мягкое движение, внешний ориентир или отдых.','Choose a gentle movement, external cue or rest.'),
    scales:['weekly.tension','weekly.recovery','weekly.energy'],
    basic:{
      title:local('Мягко снижаю нагрузку','Make room for a gentle pause'),
      idea:local('Регулировать нагрузку — значит выбирать степень усилия.','Regulation can start with choosing how much effort is manageable.'),
      practice:local('1. Выберите удобное положение сидя или стоя. 2. Если приятно, медленно измените положение плеч или рук на несколько сантиметров; при дискомфорте просто смотрите на предмет. 3. Сделайте короткую паузу, сохраняя естественное дыхание. 4. Сравните: что сейчас лучше — движение, внешняя опора или отдых? Повторите выбранный мягкий вариант, не стараясь добиться особого ощущения.','1. Sit or stand comfortably. 2. If pleasant, move your shoulders or hands slightly; if not, simply look at an object. 3. Pause while breathing naturally. 4. Decide what fits better: movement, an external anchor or rest. Repeat the gentle option without trying to force a particular feeling.'),
      transfer:local('Подберу короткую паузу между обычными делами.','I may choose a short pause between tasks.')},
    advanced:{
      title:local('Выбираю поддержку под состояние','Match support to my energy'),
      idea:local('Перегрузка и усталость могут требовать разной поддержки.','Overload and low energy may call for different supports.'),
      practice:local('1. Сравните два вымышленных случая: слишком много требований и недостаток сил. 2. Для первого подберите уменьшение задачи или ориентировку; для второго отдых, удобное положение или помощь. 3. Выберите свой вариант на сегодня без диагностики состояния. 4. Попробуйте его 30–60 секунд или мысленно отрепетируйте. 5. Остановитесь, если он не подходит, и найдите запасной способ.','1. Compare two fictional situations: too many demands and low energy. 2. For the first choose fewer demands or orientation; for the second rest, comfort or help. 3. Pick an option without diagnosing your state. 4. Try it for 30–60 seconds or rehearse it mentally. 5. Stop if it does not fit and choose a backup.'),
      transfer:local('При нагрузке попробую короткую опору; при усталости — отдых.','For overload I may use a brief anchor; for tiredness, rest.')}},
  {id:'S4',title:local('Эмоциональная устойчивость — выдерживать чувства','Emotional steadiness — make room for feelings'),
    result:local('Назвать чувство и выбрать щадящую поддержку.','Name an emotion and choose gentle support.'),
    scales:['weekly.mood','weekly.tension','resource.self_support'],
    basic:{
      title:local('Я умею называть чувства','Name a feeling without pressure'),
      idea:local('Эмоцию можно замечать, не усиливая и не подавляя её.','A feeling can be noticed without amplifying or suppressing it.'),
      practice:local('1. Выберите мягкий вымышленный пример: разочарование, неловкость или нетерпение. 2. Назовите одну возможную эмоцию. 3. Подберите нейтральную фразу: «Я замечаю это чувство; мне не нужно сейчас ничего доказывать». 4. Поверните внимание к предмету в комнате. 5. Повторите переход «назвал чувство → выбрал опору» с подсказкой. Не нужно погружаться в сильные переживания.','1. Choose a gentle fictional situation: disappointment, awkwardness or impatience. 2. Name one possible emotion. 3. Try a neutral phrase: “I notice this feeling; I do not need to prove anything.” 4. Return attention to an ordinary object. 5. Rehearse name the feeling → choose an anchor. You do not need to enter intense emotions.'),
      transfer:local('При знакомом чувстве могу сначала назвать его, а затем выбрать паузу.','With a familiar feeling, I can name it and choose a pause.')},
    advanced:{
      title:local('Остаюсь устойчивым рядом с чувствами','Stay steady alongside feelings'),
      idea:local('Я вправе дозировать контакт с эмоциями и выбирать помощь.','I can choose how much emotional contact feels manageable.'),
      practice:local('1. Выберите незначительную повседневную эмоцию или вымышленную историю. 2. Назовите эмоцию одним словом и оцените, комфортно ли продолжать. 3. На несколько мгновений отметьте одновременно эмоцию и две внешние детали. 4. Выберите поддержку: доброжелательную фразу, отдых, движение или помощь. 5. Повторите без подсказки, только если хочется. При усилении дискомфорта вернитесь к внешней ориентировке.','1. Choose a mild everyday feeling or fictional example. 2. Name the emotion and decide whether to continue. 3. Briefly notice the emotion alongside two external details. 4. Choose kindness, rest, movement or help. 5. Repeat with fewer hints only if you wish. If uncomfortable, return to the surroundings.'),
      transfer:local('В эмоционально непростой, но безопасной ситуации выберу опору, а не борьбу с собой.','In a manageable situation, I may choose support rather than fighting my feelings.')}},
  {id:'S5',title:local('Ментальная свобода — выходить из тревожных мыслей','Mental flexibility — unhook from worry'),
    result:local('Отделять мысль от факта и выбирать следующий шаг.','Separate a thought from a fact and choose a next step.'),
    scales:['weekly.clarity','weekly.tension','resource.agency'],
    basic:{
      title:local('Мысль — не всегда факт','A thought is not always a fact'),
      idea:local('Мне не нужно верить каждой тревожной мысли.','I do not need to believe every worrying thought.'),
      practice:local('1. Возьмите безопасный вымышленный пример: «Мне не ответили — значит, я не важен». 2. Назовите наблюдаемый факт: «Ответа пока нет». 3. Назовите предположение: «Меня не ценят». 4. Попробуйте фразу «Я замечаю мысль, что…». 5. Посмотрите на обычный предмет и выберите маленькое действие: подождать, заняться своим делом или уточнить позже.','1. Take a fictional example: “They have not replied, so I do not matter.” 2. Name the observable fact: “No reply yet.” 3. Name the assumption: “They do not value me.” 4. Say “I notice the thought that…” 5. Look at an ordinary object and choose a small action: wait, continue your day or check later.'),
      transfer:local('Замечу одну тревожную мысль как мысль, а не команду.','I may notice one worrying thought as a thought, not a command.')},
    advanced:{
      title:local('Выбираю действие вместо тревожной спирали','Choose action instead of a worry spiral'),
      idea:local('Можно выбрать действие по ценностям даже при неопределённости.','I can choose a valued action even with uncertainty.'),
      practice:local('1. Выберите простой вымышленный сценарий с неизвестным результатом. 2. Запишите мысленно факт, тревожное предположение и то, чего вам действительно хочется сохранить — уважение, заботу или ясность. 3. Скажите «У меня появилась мысль…». 4. Выберите один небольшой безопасный шаг, соответствующий ценности. 5. Повторите на другом обычном примере с подсказкой или без; не убеждайте себя в ложном позитиве.','1. Choose a fictional, low-stakes uncertainty. 2. Separate the fact, the worrying guess and what you value: respect, care or clarity. 3. Say “I am having the thought that…” 4. Choose a small safe action that fits your value. 5. Try a second ordinary example, with hints or without; no forced positive thinking.'),
      transfer:local('Если мысль зацикливается, отделю факт от догадки и выберу маленький шаг.','If worry loops, I may separate fact from guess and take a small step.')}},
  {id:'S6',title:local('Границы и поддержка — создавать опору','Boundaries and support — ask and protect'),
    result:local('Сформулировать уважительную границу или просьбу.','Rehearse a respectful boundary or support request.'),
    scales:['weekly.connection','weekly.functioning','resource.support'],
    basic:{
      title:local('Могу сказать «мне нужна пауза»','Ask for space and help'),
      idea:local('Граница может быть короткой и доброжелательной.','A boundary may be both brief and kind.'),
      practice:local('1. Возьмите вымышленную обычную просьбу о дополнительной задаче. 2. Выберите фразу границы: «Сейчас не могу; вернусь к этому позже» или «Мне нужна пауза». 3. Попробуйте произнести её про себя, написать на бумаге или только прочитать. 4. Назовите один тип безопасной помощи: информация, участие в задаче или короткий разговор. 5. Решите, какой вариант реалистичен, без обязательного контакта с кем-либо.','1. Imagine an ordinary request for another task. 2. Choose a boundary: “I cannot do that now; I will return later” or “I need a pause.” 3. Rehearse silently, on paper or by reading. 4. Name one kind of support: information, help with a task or a short talk. 5. Choose what feels realistic, without needing to contact anyone.'),
      transfer:local('Подготовлю одну безопасную фразу границы или просьбы о помощи.','I may prepare one safe boundary or help request.')},
    advanced:{
      title:local('Применяю границу в общении','Rehearse a boundary in context'),
      idea:local('Просьба и граница — доступные варианты, а не обязательства.','Asking and setting limits are options, not obligations.'),
      practice:local('1. Выберите нейтральный учебный диалог о времени, отдыхе или помощи. 2. Составьте границу из трёх частей: уважение — ограничение — возможный вариант. 3. Составьте короткую просьбу: «Помоги, пожалуйста, с одним делом». 4. Проиграйте варианты мысленно без настоящей конфронтации. 5. Найдите запасной безопасный вариант, если другой человек не откликнется.','1. Use a fictional conversation about time, rest or help. 2. Build a boundary from respect → limit → possible alternative. 3. Build a short request for help with one task. 4. Rehearse silently, without real confrontation. 5. Choose a safe backup if the other person cannot help.'),
      transfer:local('В подходящем безопасном общении попробую короткую границу или просьбу.','In suitable safe contact, I may try one brief limit or request.')}},
  {id:'S7',title:local('Самостоятельность и восстановление — возвращаться к жизни','Self-direction and recovery — return to life'),
    result:local('Собрать и применить личную цепочку самоподдержки.','Build and use a personal support sequence.'),
    scales:['weekly.recovery','weekly.functioning','weekly.energy'],
    basic:{
      title:local('Собираю свой антистресс-набор','Build my recovery toolkit'),
      idea:local('Один небольшой устойчивый шаг лучше жёсткого идеального плана.','A small realistic step is better than a rigid ideal plan.'),
      practice:local('1. Вспомните пять предыдущих навыков или выберите один новый из карточек. 2. Составьте простую цепочку: «замечаю сигнал → выбираю опору → уменьшаю нагрузку или прошу помощи». 3. Подберите короткий ресурс на 30 секунд и запасной способ, например отдых. 4. Репетируйте цепочку на вымышленной обычной задаче. 5. Отметьте, что действительно пробовали, а что пока только планируете.','1. Review earlier skills or choose one helpful card. 2. Build: notice a sign → choose an anchor → reduce a demand or ask for help. 3. Choose a 30-second option and a backup such as rest. 4. Rehearse using a fictional ordinary task. 5. Mark what you actually tried and what remains a plan.'),
      transfer:local('Выберу удобное место и время для короткого восстановления.','I may choose a practical time and place for a short recovery pause.')},
    advanced:{
      title:local('Мой самостоятельный план ОПОРА','My independent OPORA plan'),
      idea:local('Я могу выбирать из семи навыков, а не применять их все сразу.','I can choose among seven skills without needing to do all seven.'),
      practice:local('1. Выберите одну обычную ситуацию, в которой вам бывает трудно, или безопасный вымышленный пример. 2. Назовите ранний сигнал, чувство и возможную тревожную мысль. 3. Выберите одну внешнюю или телесную опору. 4. Добавьте одну границу, просьбу о помощи или возможность отдыха. 5. Составьте карточку «если сигнал — то опора — затем маленький шаг — при необходимости запасной вариант». 6. Репетируйте без подсказки или оставьте подсказку. Это учебная попытка, не экзамен.','1. Choose an ordinary low-stakes difficulty or fictional example. 2. Name an early sign, feeling and possible worry thought. 3. Choose one external or body-based anchor. 4. Add a boundary, request for help or rest. 5. Create an if → support → small step → backup card. 6. Rehearse with or without a hint. This is practice, not an exam.'),
      transfer:local('Сохраню только действительно доступные способы и запасной план.','I may keep only supports that are genuinely available, plus a backup.')}},
].map(row=>Object.freeze(row))
)

export function oporaSkillForDay(day,locale='en') {
  if(!Number.isInteger(day)||day<1||day>14)return null
  const skill=OPORA_SEVEN_SKILLS[(day-1)%7],advanced=day>7,stage=skill[advanced?'advanced':'basic'],lang=locale==='ru'?'ru':'en'
  return {day,week:advanced?2:1,skillId:skill.id,skill:skill.title[lang],
    title:stage.title[lang],teaching:stage.idea[lang],guide:stage.practice[lang],
    action:advanced?(lang==='ru'?'Отметьте, что получилось повторить: с подсказкой, самостоятельно, частично или пока не пробовали.':'Mark what you rehearsed: with a hint, independently, partly or not today.'):(lang==='ru'?'Отметьте одну реально попробованную часть упражнения или право отказаться.':'Mark one part you actually tried, or your choice not to try.'),transfer:stage.transfer[lang],
    reflection:advanced
      ? (lang==='ru'?'Что удалось попробовать самостоятельно или с подсказкой? Что захотелось заменить?':'What did you try independently or with a hint, and what would you change?')
      : (lang==='ru'?'Удалось ли попробовать хотя бы часть практики? Что подошло?':'Were you able to try part of the practice? What suited you?'),
    quote:stage.idea[lang],
    neutral:lang==='ru'?'Можно наблюдать внешние предметы, отдыхать или остановиться. Не нужно менять дыхание, вспоминать травму или чувствовать себя лучше.':'You may notice ordinary objects, rest or stop. No breath control, trauma recall or improvement is required.',
    outcome:skill.result[lang],scales:[...skill.scales],probe:null,
    durationSeconds:540,practiceSeconds:330,slideModel:OPORA_SKILL_SLIDE_MODEL,
    practiceMode:advanced?'independent_or_hint':'guided_optional',
    length:'standard'}
}

export function oporaSkillCards(locale='en') {
  const lang=locale==='ru'?'ru':'en'
  return OPORA_SEVEN_SKILLS.map((skill,index)=>({
    id:skill.id,title:skill.title[lang],days:[index+1,index+8],
    result:skill.result[lang],levels:['introduction','deeper_application'],
  }))
}
export function oporaSkillPassportValid(){
  return OPORA_SEVEN_SKILLS.length===7 && OPORA_SEVEN_SKILLS.every((s,i)=>
    s.id==='S'+(i+1) && s.scales.length>=2 && ['basic','advanced'].every(level=>
      ['ru','en'].every(lang=>['title','idea','practice','transfer'].every(f=>
        typeof s[level][f][lang]==='string'&&s[level][f][lang].length>20)))) &&
    Array.from({length:14},(_,i)=>oporaSkillForDay(i+1,'ru')).every((l,i)=>
      l.skillId==='S'+(i%7+1) && l.week===(i<7?1:2))
}
