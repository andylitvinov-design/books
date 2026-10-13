// Short, item-grounded guidance for original HH reflection questionnaires.
// No score bands, clinical claims, or changes to scoring are introduced here.
// Suggestions are choices; a score alone does not establish a need to intervene.
// actions[0] is the gentle primary suggestion; actions[1] is an optional alternative.
const entries = {}
function add(key, enMeaning, ruMeaning, enFirst, ruFirst, enSecond, ruSecond, enNext, ruNext) {
  if (entries[key]) throw new Error(`Duplicate HH guidance: ${key}`)
  entries[key] = Object.freeze({
    en: Object.freeze({ meaning: enMeaning, actions: Object.freeze([enFirst, enSecond]), nextStep: enNext }),
    ru: Object.freeze({ meaning: ruMeaning, actions: Object.freeze([ruFirst, ruSecond]), nextStep: ruNext }),
  })
}

add('state.problem_intensity',
  'This is how strong your main difficulty feels now, without identifying its cause.',
  'Это ощущаемая сила основной трудности сейчас. Оценка не объясняет её причину.',
  'If a difficulty is present, you could name it in one sentence and note when it eases or becomes stronger.',
  'Если трудность есть, можно описать её одним предложением и отметить, когда она ослабевает или усиливается.',
  'Choose one manageable change to the situation, such as postponing a nonessential demand or asking for practical help.',
  'Выберите одно посильное изменение ситуации: например, отложите необязательное дело или попросите практической помощи.',
  'Choose one manageable change, such as postponing a nonessential demand, and note whether the difficulty feels different afterward.',
  'Выберите посильное изменение, например отложите необязательное дело, и отметьте, изменилось ли ощущение трудности.')

add('state.resource',
  'This describes the energy and inner support you feel you can draw on right now, even if difficulties are also present.',
  'Это ощущение доступных сил и внутренней опоры сейчас. Они могут сохраняться и при наличии трудностей.',
  'You could name one source of strength available today: a person, a familiar activity or a quiet place.',
  'Можно назвать один доступный сегодня источник сил: человека, привычное занятие или спокойное место.',
  'Match the next task to your available energy by choosing a smaller version or a suitable time.',
  'Соотнесите следующее дело с силами: выберите меньший объём или более подходящее время.',
  'Use the named source of support before your next demanding activity.',
  'Обратитесь к выбранному источнику поддержки перед ближайшим трудным делом.')

add('state.tension',
  'This is your felt inner tension at this moment, rather than a lasting description of you.',
  'Это ощущаемое внутреннее напряжение в данный момент, а не постоянная характеристика вас.',
  'If tension is present, you could note what happened just before it increased.',
  'Если напряжение есть, можно отметить, что произошло перед его усилением.',
  'Try a comfortable pause: look around the room, feel the chair beneath you or reduce nearby noise.',
  'Попробуйте удобную паузу: осмотритесь, почувствуйте опору кресла или уменьшите шум вокруг.',
  'Try a comfortable pause, then decide whether continuing, slowing down or taking more space would suit you.',
  'Попробуйте удобную паузу, затем решите, что подходит: продолжить, снизить темп или побыть в стороне.')

add('state.fatigue',
  'This is how tired you feel now. The rating does not distinguish the contributions of sleep, workload, emotions or physical health.',
  'Это ощущаемая усталость сейчас. Оценка не разделяет влияние сна, нагрузки, эмоций и физического здоровья.',
  'If you feel tired, you could compare the day’s sleep, demands and breaks without assuming a single cause.',
  'Если вы устали, можно сопоставить сон, нагрузку и паузы за день, не выбирая заранее единственную причину.',
  'Make the next optional task shorter or replace it with a form of rest that usually helps you.',
  'Сократите следующее необязательное дело или замените его отдыхом, который обычно вам помогает.',
  'Choose what you will shorten or postpone today, then check how you feel after resting.',
  'Решите, что сократить или отложить сегодня, и сравните самочувствие после отдыха.')

add('state.life_impact',
  'This describes how much the current difficulty gets in the way of what you want to do, separately from how intense it feels.',
  'Это степень помех в желаемых делах из-за текущей трудности. Она отличается от силы самого переживания.',
  'If something is getting in the way, you could identify one affected activity rather than treating the whole day as lost.',
  'Если трудность мешает, можно назвать одно затронутое дело вместо оценки всего дня как неудачного.',
  'Define a workable smaller version of that activity or the specific help needed to do it.',
  'Определите посильный меньший вариант этого дела или конкретную помощь для его выполнения.',
  'Try a smaller version of the affected activity, or ask for the specific help needed to do it.',
  'Попробуйте меньший вариант затронутого дела или попросите конкретную помощь для его выполнения.')

add('weekly.mood',
  'This summarizes how emotionally okay you felt over the past week; individual days may have differed.',
  'Это общее ощущение эмоционального благополучия за неделю; отдельные дни могли заметно различаться.',
  'You could recall one easier day and one harder day, and write down what was different.',
  'Можно вспомнить один более лёгкий и один более трудный день и записать, чем они отличались.',
  'Choose one manageable activity or contact that you would like to keep in the coming week.',
  'Выберите посильное занятие или общение, которое хотите сохранить на следующей неделе.',
  'Choose one manageable activity you would like to repeat, set a time, and notice how you feel before and after it.',
  'Выберите посильное занятие, которое хочется повторить, назначьте время и отметьте состояние до и после.')

add('weekly.tension',
  'This describes anxiety or inner tension during the past week; it does not identify which situations contributed.',
  'Это тревога или внутреннее напряжение за неделю. Оценка не показывает, какие ситуации внесли вклад.',
  'If tension occurred, you could list two situations in which it rose and what helped it settle.',
  'Если напряжение возникало, можно записать две ситуации его усиления и то, что помогло успокоиться.',
  'Before a similar situation, prepare one practical support, such as extra time, a clear question or a planned pause.',
  'Перед похожей ситуацией подготовьте одну опору: запас времени, ясный вопрос или запланированную паузу.',
  'Before a similar situation, try one practical support, such as extra time or a planned pause, and note its effect.',
  'Перед похожей ситуацией попробуйте одну опору, например запас времени или плановую паузу, и отметьте эффект.')

add('weekly.load',
  'This is how heavy the week’s stress and mental demands felt, rather than a count of your tasks.',
  'Это ощущаемая тяжесть стресса и умственной нагрузки за неделю, а не количество задач.',
  'You could list the demands that took the most mental space, including unresolved decisions and caring responsibilities.',
  'Можно перечислить то, что больше всего занимало мысли, включая нерешённые вопросы и заботу о других.',
  'If the load feels excessive, choose one demand to simplify, defer or share with someone.',
  'Если нагрузки слишком много, выберите одно требование, которое можно упростить, отложить или разделить с кем-то.',
  'If the load is excessive, simplify, defer or share one demand before adding another commitment.',
  'Если нагрузка чрезмерна, упростите, отложите или разделите одно дело перед новым обязательством.')

add('weekly.recovery',
  'This is how much sleep and rest seemed to restore you during the week, not a direct measure of sleep duration.',
  'Это ощущаемое восстановление от сна и отдыха за неделю, а не непосредственное измерение длительности сна.',
  'You could compare two periods of rest, noticing which helped and the differences in activity, timing or interruptions.',
  'Можно сравнить один полезный и один малоэффективный отдых: занятие, время и отвлечения.',
  'Reserve a short period for the kind of rest that worked, with fewer interruptions where possible.',
  'Выделите немного времени на подходящий отдых и по возможности уменьшите отвлечения.',
  'Try that rest on two days and compare how restored you feel afterward.',
  'Попробуйте такой отдых в два разных дня и сравните ощущение восстановления.')

add('weekly.energy',
  'This describes the usable energy you had during the week; it does not explain why your energy varied.',
  'Это силы, доступные для дел за неделю. Оценка не объясняет причины их изменения.',
  'You could recall when energy was most available and when it dipped during a typical day.',
  'Можно вспомнить, в какое время обычного дня сил было больше, а когда наступал спад.',
  'Place one demanding task in a better-energy period and leave room to recover afterward.',
  'Поставьте одно трудное дело на время, когда сил больше, и оставьте возможность отдохнуть после.',
  'Move one demanding task to a better-energy period and compare it with your usual timing.',
  'Перенесите одно трудное дело на время большего запаса сил и сравните с привычным временем.')

add('weekly.clarity',
  'This describes how clear and focused your thinking felt across the week.',
  'Это ощущение ясности мыслей и сосредоточенности за неделю.',
  'You could identify one setting where thinking was easier and note the noise, interruptions and task size.',
  'Можно найти обстановку, в которой думалось легче, и отметить шум, отвлечения и размер задачи.',
  'For one task, write the next action on paper and work on it with unrelated tabs or materials set aside.',
  'Для одной задачи запишите ближайшее действие и уберите не относящиеся к ней вкладки или материалы.',
  'Try a short focused block and note which condition helped you stay with the task.',
  'Попробуйте короткий блок работы и отметьте, какое условие помогло удержать внимание.')

add('weekly.connection',
  'This describes feeling supported and connected during the week, rather than the number of people you know.',
  'Это ощущение поддержки и связи за неделю, а не число знакомых.',
  'You could recall a moment when you felt heard and identify what made that contact comfortable.',
  'Можно вспомнить момент, когда вас услышали, и определить, что сделало общение комфортным.',
  'If you want more connection, choose a person and a manageable form of contact, such as a short message or walk.',
  'Если хочется больше контакта, выберите человека и удобный формат: короткое сообщение или прогулку.',
  'Make one specific invitation if you want contact, or note which existing contact you want to maintain.',
  'Если хочется общения, предложите конкретную встречу; иначе отметьте, какой текущий контакт хотите сохранить.')

add('weekly.functioning',
  'This describes how manageable necessary or wanted activities were during the week.',
  'Это доступность необходимых и желаемых дел за неделю.',
  'You could compare one activity you managed with one that was difficult, noting time, energy and available help.',
  'Можно сравнить дело, которое удалось, с трудным делом: время, силы и доступную помощь.',
  'If an activity is still difficult, reduce its scope or prepare the materials and help it needs.',
  'Если дело всё ещё трудно, уменьшите его объём или подготовьте нужные материалы и помощь.',
  'Reduce one difficult activity to a workable size, try it this week, and note whether it became more manageable.',
  'Уменьшите трудное дело до посильного объёма, попробуйте на неделе и отметьте, стало ли легче.')

add('resource.energy',
  'This describes whether your available energy feels sufficient for what matters to you.',
  'Это ощущение достаточности сил для того, что вам важно.',
  'You could choose one important activity and estimate the smallest useful version you have energy for.',
  'Можно выбрать важное дело и определить минимальный полезный объём, на который хватает сил.',
  'Keep space for a familiar restorative activity instead of filling every available gap.',
  'Оставьте место для привычного восстановления, не заполняя делами каждую свободную минуту.',
  'Put the smaller task and a recovery period into today’s plan.',
  'Включите в план на сегодня небольшой вариант дела и время восстановления.')

add('resource.self_support',
  'This describes your sense of being able to treat yourself with care when something is difficult.',
  'Это ощущение способности бережно относиться к себе в трудности.',
  'If something feels difficult, you could write the respectful advice you would give someone you care about.',
  'Если что-то даётся трудно, можно записать бережный совет, который дали бы близкому человеку.',
  'Turn that advice into one practical act of care, such as lowering a demand or allowing time to recover.',
  'Превратите совет в конкретную заботу: например, уменьшите требование к себе или дайте время на восстановление.',
  'Turn the respectful advice into one act of care today, such as allowing a break, and note whether it meets your need.',
  'Превратите уважительный совет в заботу сегодня, например разрешите себе паузу, и проверьте, отвечает ли это потребности.')

add('resource.support',
  'This describes how available people or places for support feel to you.',
  'Это ощущаемая доступность людей и мест, куда можно обратиться за поддержкой.',
  'You could list one person or service for practical help and one for being heard; they may be different.',
  'Можно назвать человека или службу для практической помощи и для разговора: это могут быть разные варианты.',
  'If you need help, phrase the request specifically: what you need, when and for how long.',
  'Если помощь нужна, сформулируйте конкретную просьбу: что нужно, когда и на какое время.',
  'Save the contact you would use first, or send the specific request if you need support now.',
  'Сохраните контакт для первого обращения или отправьте конкретную просьбу, если поддержка нужна сейчас.')

add('resource.connection',
  'This describes whether your contact with other people feels meaningful to you.',
  'Это ощущение значимой для вас связи с другими людьми.',
  'You could name one conversation or shared activity that left you feeling genuinely connected.',
  'Можно назвать разговор или совместное занятие, после которого чувствовали настоящую связь.',
  'If you want contact, suggest repeating the part that mattered: shared time, listening or a common interest.',
  'Если хочется общения, предложите повторить важную часть: время вместе, разговор или общее занятие.',
  'Choose whom you would like to connect with and one specific, comfortable way to do it.',
  'Выберите, с кем хотите связаться и каким конкретным, удобным способом.')

add('resource.agency',
  'This describes feeling able to influence your next step, including when much of the situation is outside your control.',
  'Это ощущение возможности повлиять на следующий шаг, даже если многое в ситуации от вас не зависит.',
  'You could divide a current situation into what you can influence and what you cannot decide for others.',
  'Можно разделить текущую ситуацию на то, на что можете повлиять, и то, что не можете решить за других.',
  'Choose one small action within your influence, such as requesting information or setting a time to decide.',
  'Выберите небольшое доступное действие: например, запросите информацию или назначьте время для решения.',
  'Choose one small action within your influence and do it today or set a specific time for it.',
  'Выберите небольшой шаг в пределах своего влияния и выполните сегодня или назначьте конкретное время.')

add('resource.meaning',
  'This describes your current sense of purpose or direction in what you are doing.',
  'Это текущее ощущение смысла или направления в ваших занятиях.',
  'You could name one person, value or activity that makes your effort feel worthwhile.',
  'Можно назвать человека, ценность или занятие, ради которых ваши усилия имеют смысл.',
  'Connect one ordinary action this week with that priority, without needing a complete life plan.',
  'Свяжите одно обычное действие на неделе с этим приоритетом, не требуя от себя полного плана жизни.',
  'Choose the action and write when you will make room for it.',
  'Выберите действие и запишите, когда выделите для него время.')

add('resources.overall',
  'This combines energy, self-support, outside help, connection, agency and meaning. The same average can hide different strengths and needs.',
  'Здесь объединены силы, внутренняя и внешняя поддержка, связь, возможность действовать и смысл. За одинаковым средним могут стоять разные сочетания.',
  'You could read the six individual ratings and choose one area that matters to you now, regardless of its rank.',
  'Можно рассмотреть шесть отдельных оценок и выбрать важную сейчас сферу независимо от её места в списке.',
  'Identify one resource you already have that could support that area, such as a person, a skill or available time.',
  'Найдите уже доступную опору для этой сферы: человека, навык или свободное время.',
  'Use the next step from your chosen individual scale this week.',
  'На этой неделе выполните следующий шаг из выбранной отдельной шкалы.')

add('resources.monthly.self',
  'This combines feeling grounded, treating yourself kindly and knowing what you need over the past month.',
  'Это сочетание внутренней опоры, бережного отношения к себе и понимания своих потребностей за месяц.',
  'If the month included a difficult moment, you could note what you needed then.',
  'Если за месяц был трудный момент, можно отметить, что вам тогда было нужно.',
  'Choose one way to meet a similar need earlier next time, such as a break, reassurance or practical help.',
  'Выберите способ раньше заметить и удовлетворить похожую потребность: пауза, поддержка или практическая помощь.',
  'Write a short reminder of the need and the response you want to try.',
  'Запишите короткое напоминание о потребности и действии, которое хотите попробовать.')

add('resources.monthly.relationships',
  'This combines connection, feeling able to be yourself, and asking for support or setting boundaries during the month.',
  'Это сочетание связи с людьми, возможности быть собой, просить поддержку и обозначать границы за месяц.',
  'You could choose one important relationship and name what helped you feel comfortable being yourself.',
  'Можно выбрать важные отношения и назвать, что помогало оставаться собой.',
  'If something needs changing, prepare one specific request or limit for a conversation you consider safe.',
  'Если хочется изменения, подготовьте одну конкретную просьбу или границу для безопасного для вас разговора.',
  'Maintain a helpful arrangement, or name one change you would like and discuss it if a conversation feels safe.',
  'Сохраните полезную договорённость или назовите желаемое изменение и обсудите его, если разговор безопасен.')

add('resources.monthly.body',
  'This combines physical comfort, restoration from sleep or rest, and energy for daily life during the month.',
  'Это сочетание телесного комфорта, восстановления от сна и отдыха и сил на повседневные дела за месяц.',
  'You could compare days when your body felt more comfortable with days when daily activities were harder.',
  'Можно сравнить дни большего телесного комфорта с днями, когда обычные дела давались труднее.',
  'Choose one practical comfort or recovery adjustment that fits your circumstances and any existing care advice.',
  'Выберите одно посильное изменение для комфорта или отдыха с учётом обстоятельств и имеющихся рекомендаций по здоровью.',
  'Try one practical comfort adjustment this week; discuss recurring or unexplained symptoms and their impact with a healthcare professional.',
  'Попробуйте одно доступное изменение для телесного комфорта; повторяющиеся или необъяснимые симптомы и их влияние обсудите с врачом.')

add('resources.monthly.work',
  'This combines focus, manageable workload and feeling effective in your responsibilities during the month.',
  'Это сочетание сосредоточенности, посильной нагрузки и ощущения результативности в своих обязанностях за месяц.',
  'You could name one type of work that fitted your capacity and one that regularly exceeded it, if any.',
  'Можно назвать работу, соответствовавшую вашим силам, и ту, которая регулярно их превышала, если такая была.',
  'For the coming week, clarify one priority and which other task may wait when that priority needs time.',
  'На следующую неделю уточните один приоритет и дело, которое может подождать ради него.',
  'Make or discuss one concrete change to task size, timing or responsibilities.',
  'Внесите или обсудите одно конкретное изменение объёма, сроков или распределения обязанностей.')

add('resources.monthly.meaning',
  'This describes direction, connection with what matters and something you want to move toward during the past month.',
  'Это ощущение направления, связи с важным и того, к чему хочется двигаться, за прошедший месяц.',
  'You could look back at the month and select one moment that felt worth your time.',
  'Можно вспомнить прошедший месяц и выбрать момент, который казался стоящим вашего времени.',
  'Name what mattered in that moment and a modest way to give it space next month.',
  'Назовите, что было важно в этом моменте, и небольшой способ уделить этому место в следующем месяце.',
  'Schedule one activity that reflects that priority, then review whether it still feels meaningful.',
  'Запланируйте одно занятие по этому приоритету и затем проверьте, сохранился ли для вас смысл.')

add('resources.monthly.support',
  'This combines practical help, emotional support and feeling less alone with difficulties during the month.',
  'Это сочетание практической и эмоциональной помощи и ощущения, что вы не одни с трудностями, за месяц.',
  'You could list which support was actually available this month and which kind you wanted but could not access.',
  'Можно записать, какая поддержка была реально доступна за месяц и какой помощи хотелось, но получить не удалось.',
  'If there is an unmet need, identify a specific person or service suited to that kind of help.',
  'Если потребность осталась без ответа, найдите конкретного человека или службу для такой помощи.',
  'Prepare one precise request or save a verified contact for when it is needed.',
  'Подготовьте одну точную просьбу или сохраните проверенный контакт на случай необходимости.')

add('resources.monthly.overall',
  'This combines six life areas over the month. An average cannot show which area was supported or difficult.',
  'Это сводная оценка шести жизненных сфер за месяц. Среднее не показывает, где была опора, а где трудность.',
  'You could review all six areas and choose one you want to maintain and one you may want to change.',
  'Можно рассмотреть шесть сфер и выбрать одну для сохранения и одну для возможного изменения.',
  'Decide what a useful change would look like in daily life, rather than aiming only for a higher total.',
  'Опишите полезное изменение в повседневной жизни вместо цели просто поднять общий балл.',
  'Choose one action from the relevant area and set a date to review its effect.',
  'Выберите действие из подходящей сферы и назначьте день проверки результата.')

add('resources.social_battery.overall',
  'This describes energy for company, choosing contact or space, and recovering after social time.',
  'Это силы на общение, возможность выбирать контакт или дистанцию и восстанавливаться после встреч.',
  'Before a social plan, you could choose the amount and form of contact that fit your energy today.',
  'Перед встречей можно выбрать объём и формат общения под сегодняшние силы.',
  'Arrange a comfortable stopping point and some quiet time afterward if that helps you recover.',
  'Предусмотрите удобное время завершения и тишину после, если она помогает восстановиться.',
  'After the next interaction, note whether its length and recovery time suited you.',
  'После ближайшего общения отметьте, подошли ли его длительность и время отдыха.')

add('function.focus_mode.overall',
  'This describes readiness to choose, start, stay with and finish a small task despite interruptions.',
  'Это готовность выбрать, начать, удержать внимание и завершить небольшое дело, несмотря на отвлечения.',
  'You could write down one task and the visible result that would count as enough for now.',
  'Можно записать одну задачу и конкретный результат, которого пока достаточно.',
  'Set aside unrelated tabs or materials and try a short work block on only that task.',
  'Уберите лишние вкладки или материалы и попробуйте короткий блок работы только над этой задачей.',
  'Try a short work block on the named task, then record what you finished and what interrupted you.',
  'Попробуйте короткий блок работы над выбранным делом, затем запишите, что закончили и что отвлекало.')

add('state.stress_weather.overall',
  'This describes reported stress: bodily alertness, crowded thoughts, pressure to continue and spillover into relationships. More points mean more endorsed difficulty.',
  'Это отмеченные проявления стресса: напряжение тела, множество мыслей, давление продолжать и влияние на общение. Больший балл означает больше отмеченных трудностей.',
  'If stress is present, you could identify one early sign, such as bracing your body or finding small demands unusually hard.',
  'Если стресс есть, можно найти его ранний признак: например, напряжение тела или непривычную трудность мелких требований.',
  'At that sign, reduce one nonessential demand or take a quiet pause before the next interaction.',
  'При этом признаке уберите одно необязательное требование или сделайте тихую паузу перед следующим общением.',
  'At the next early sign, take a quiet pause or reduce one nonessential demand and note what changes.',
  'При ближайшем раннем признаке сделайте спокойную паузу или уменьшите необязательную нагрузку и отметьте результат.')

add('resources.recharge_decoder.overall',
  'This describes noticing and accessing forms of rest that restore you, including sleep, quiet, movement and pleasant contact.',
  'Это распознавание и доступность восстанавливающего отдыха: сна, тишины, движения и приятного общения.',
  'You could compare two familiar kinds of rest and note which leaves you with more usable energy.',
  'Можно сравнить два знакомых вида отдыха и отметить, после какого доступных сил больше.',
  'Protect a short period for the better-fitting option, temporarily setting aside obligations where possible.',
  'Выделите короткое время для подходящего варианта, по возможности отложив обязанности.',
  'Try that kind of rest today and record how your energy feels afterward.',
  'Попробуйте этот отдых сегодня и отметьте ощущение сил после него.')

add('resources.boundary_radar.overall',
  'This describes noticing limits, expressing preferences, respecting another person’s no and keeping connection after a boundary.',
  'Это распознавание границ, выражение предпочтений, уважение чужого отказа и сохранение контакта после обозначения границы.',
  'You could choose a low-risk request and notice whether you genuinely want to agree or need time to decide.',
  'Можно взять одну простую просьбу и заметить, хотите ли согласиться или нужно время на решение.',
  'Prepare a short response such as “I need time to decide” or “I can help for half an hour.”',
  'Подготовьте короткий ответ: «Мне нужно время подумать» или «Я могу помочь полчаса».',
  'In a safe conversation, try a clear limit such as “I need time to decide” and notice whether it expresses your preference.',
  'В безопасном разговоре попробуйте ясную границу, например «Мне нужно время решить», и проверьте, выражает ли она ваше предпочтение.')

add('resources.tiny_joys.overall',
  'This describes access to small pleasant moments, curiosity, relaxation, humour and warmth during the week.',
  'Это доступность небольших приятных моментов, любопытства, расслабления, юмора и тепла за неделю.',
  'You could name one ordinary moment that was pleasant or interesting, however brief.',
  'Можно назвать один обычный приятный или интересный момент, даже короткий.',
  'Make room to repeat something similar without requiring it to be useful or improve your mood.',
  'Выделите место для чего-то похожего, не требуя пользы или обязательного улучшения настроения.',
  'Choose one small experience for tomorrow and simply note how it felt.',
  'Выберите одно небольшое занятие на завтра и просто отметьте свои ощущения.')

add('resources.sleep_reset.overall',
  'This describes restorative sleep, winding down, morning energy and knowing which habits affect your rest.',
  'Это восстановление от сна, вечернее замедление, утренние силы и понимание привычек, влияющих на отдых.',
  'For a few days, you could note bedtime, waking time and how rested you feel, without trying to force sleep.',
  'Несколько дней можно отмечать время сна, подъёма и ощущение восстановления, не пытаясь заставить себя уснуть.',
  'If winding down is difficult, try one familiar quiet activity before bed and reduce an interruption you have noticed.',
  'Если трудно замедлиться, попробуйте привычное спокойное занятие перед сном и уберите одну замеченную помеху.',
  'Choose one evening habit to test for several nights and compare morning restfulness.',
  'Выберите одну вечернюю привычку на несколько ночей и сравните утреннее восстановление.')

add('state.morning_battery.overall',
  'This describes energy, physical readiness, mental clarity and a helpful routine at the start of the day.',
  'Это силы, телесная готовность, ясность мыслей и поддерживающий распорядок в начале дня.',
  'You could notice which first-morning activity supports you and which leaves you feeling rushed.',
  'Можно отметить, какое первое утреннее занятие помогает, а какое создаёт ощущение спешки.',
  'Prepare one item or decision the evening before so your morning has one fewer demand.',
  'Подготовьте одну вещь или примите одно решение вечером, чтобы утром требований стало меньше.',
  'Prepare one item or decision this evening to make tomorrow morning simpler, then note whether it helps.',
  'Подготовьте вечером одну вещь или решение, чтобы упростить завтрашнее утро, и отметьте, помогает ли это.')

add('resources.evening_landing.overall',
  'This describes leaving unfinished tasks for later, reducing stimulation and allowing the evening to become recovery time.',
  'Это возможность отложить незавершённые дела, уменьшить стимуляцию и перейти вечером к восстановлению.',
  'At the end of work, you could write tomorrow’s first action so you do not need to keep rehearsing unfinished tasks.',
  'В конце работы можно записать первое действие на завтра, чтобы не удерживать незавершённые дела в голове.',
  'Choose a clear transition into rest, such as putting work materials away or changing to a quieter activity.',
  'Выберите заметный переход к отдыху: уберите рабочие материалы или переключитесь на спокойное занятие.',
  'Put work materials away or choose a quiet activity this evening, then check whether leaving work aside becomes easier.',
  'Уберите рабочие материалы или выберите спокойное занятие вечером и проверьте, легче ли отложить работу.')

add('function.decision_fog.overall',
  'This describes difficulty choosing, revisiting decisions and moving on afterward. More points mean more endorsed difficulty.',
  'Это трудности выбора, возвраты к принятым решениям и сложность двигаться дальше. Больший балл означает больше отмеченных трудностей.',
  'If a small decision is stuck, you could write the options and the one or two criteria that actually matter.',
  'Если небольшое решение застряло, можно записать варианты и один-два действительно важных критерия.',
  'For a low-stakes, reversible choice, choose when to decide and what new information would justify revisiting it.',
  'Для обратимого решения без серьёзных последствий определите срок и новую информацию, которая оправдает пересмотр.',
  'For a low-stakes reversible choice, set a decision time, choose using your criteria and take its first practical step.',
  'Для обратимого выбора без серьёзных последствий назначьте время, решите по своим критериям и сделайте первый практический шаг.')

add('function.start_button.overall',
  'This describes being able to identify a first action, make it small enough and begin before everything feels ready.',
  'Это возможность найти первое действие, сделать его посильным и начать, не дожидаясь полной готовности.',
  'You could turn one task into a visible first move, such as opening the document and writing its working title.',
  'Можно превратить одну задачу в видимое первое действие: например, открыть документ и написать рабочее название.',
  'Allow a rough first attempt and choose a short stopping point before you begin.',
  'Разрешите себе черновую попытку и заранее выберите небольшой объём для остановки.',
  'Do the first move now, then decide whether to continue or leave a clear next action.',
  'Сделайте первый шаг сейчас, затем решите: продолжить или записать ясное следующее действие.')

add('state.screen_saturation.overall',
  'The items mix screen-related overload with relief after time offline. The total cannot separate difficulty from a helpful response to a break.',
  'Вопросы смешивают перегрузку от экранов и облегчение после времени без них. Общий балл не разделяет трудности и пользу перерыва.',
  'You could look separately at unwanted scrolling, interruptions and difficulty winding down, noting which, if any, applies to you.',
  'Можно отдельно рассмотреть листание, отвлечения и трудности вечернего отдыха и отметить, мешает ли что-то из этого вам.',
  'If one pattern bothers you, try a short screen-free pause or silence nonessential notifications for one chosen task.',
  'Если что-то мешает, попробуйте короткую паузу без экрана или уберите необязательные уведомления на время одного дела.',
  'If one screen habit bothers you, try a short screen-free pause and compare how you feel; the combined score alone cannot judge the effect.',
  'Если одна привычка с экраном мешает, попробуйте короткую паузу без него и сравните состояние; общий балл сам по себе не оценивает эффект.')

add('state.inner_critic.overall',
  'This describes harsh self-judgment, repeated criticism and tying mistakes to your worth. More points mean more endorsed self-criticism.',
  'Это жёсткая самооценка, повторяющаяся критика и связь ошибок с собственной ценностью. Больший балл означает больше отмеченной самокритики.',
  'If a critical thought appears, you could write its exact claim and separate an observable mistake from a judgment about yourself.',
  'Если появляется самокритичная мысль, можно записать её и отделить наблюдаемую ошибку от оценки себя.',
  'Replace the judgment with one factual correction or learning step, and name something you handled adequately.',
  'Замените общую оценку конкретным исправлением или уроком и назовите то, с чем справились достаточно хорошо.',
  'Replace one self-judgment with a factual correction or learning step, and use that wording when the criticism returns.',
  'Замените одно осуждение себя фактическим исправлением или шагом обучения и используйте эту фразу при возвращении критики.')

add('resources.inner_ally.overall',
  'This describes respectful self-talk, recognizing effort and responding to your needs without pretending everything is fine.',
  'Это уважительный внутренний диалог, признание усилий и отклик на потребности без необходимости делать вид, что всё хорошо.',
  'If something is difficult, you could write one respectful sentence acknowledging the challenge and your effort.',
  'Если что-то даётся трудно, можно написать уважительную фразу, признающую и проблему, и ваши усилия.',
  'Ask what you need next and choose one practical response instead of automatically pushing harder.',
  'Спросите себя, что нужно дальше, и выберите практический ответ вместо автоматического усиления давления.',
  'Choose one practical response to your current need, such as a break or asking for help, and note whether it supports you.',
  'Выберите практический ответ на нынешнюю потребность, например паузу или просьбу о помощи, и отметьте, поддерживает ли он вас.')

add('resources.meaning_compass.overall',
  'This describes knowing what matters to you and connecting everyday choices with a direction you want to pursue.',
  'Это понимание важного для вас и связь повседневных решений с желаемым направлением.',
  'You could write two things that matter to you now and distinguish them from what others expect.',
  'Можно записать две важные для вас сейчас вещи и отделить их от ожиданий других.',
  'Choose one small action that gives a named priority space in an ordinary day.',
  'Выберите небольшое действие, которое даст одному из этих приоритетов место в обычном дне.',
  'Choose one small action that serves a named priority, make time for it this week and review whether it felt worthwhile.',
  'Выберите небольшой шаг по своему приоритету, выделите время на неделе и оцените, стоило ли это усилий.')

add('resources.motivation_spark.overall',
  'This describes interest, personally meaningful reasons for effort and a workable next action, while distinguishing motivation from exhaustion.',
  'Это интерес, личный смысл усилий и посильный следующий шаг, с различением нехватки мотивации и истощения.',
  'You could choose one task and ask whether you lack interest, a clear first step or enough energy.',
  'Можно выбрать задачу и уточнить, чего не хватает: интереса, ясного первого шага или сил.',
  'Match the response to that need: connect it to a reason, make the step smaller or allow recovery first.',
  'Подберите ответ к потребности: найдите личную причину, уменьшите шаг или сначала восстановитесь.',
  'Try a response that fits the obstacle: clarify the reason, make the first step smaller or recover first; note whether starting is easier.',
  'Попробуйте ответ по препятствию: проясните смысл, уменьшите первый шаг или сначала восстановитесь; отметьте, легче ли начать.')

add('resources.change_readiness.overall',
  'This describes clarity about a desired change, a realistic first step and enough support to try it.',
  'Это ясность желаемого изменения, реалистичный первый шаг и достаточная поддержка для попытки.',
  'You could name one change you want, why it matters and what, if anything, makes starting difficult.',
  'Можно назвать желаемое изменение, его важную для вас причину и то, что мешает начать.',
  'Design a small, reversible trial and identify the support or preparation it needs.',
  'Придумайте небольшую обратимую пробу и определите необходимую поддержку или подготовку.',
  'Design a small reversible trial of the change and choose a date, or first arrange the preparation it needs.',
  'Придумайте небольшую обратимую пробу изменения и назначьте дату или сначала организуйте нужную подготовку.')

add('function.workload_weather.overall',
  'This describes whether work fits your capacity, leaves room for focus and allows priorities to be renegotiated.',
  'Это соответствие работы вашим силам, наличие времени для сосредоточения и возможности пересматривать приоритеты.',
  'You could sort today’s tasks into essential, able to wait and needing a clearer agreement.',
  'Можно разделить сегодняшние задачи на необходимые, терпящие отсрочку и требующие уточнения договорённости.',
  'If demands exceed your time, propose which task should move rather than silently adding everything.',
  'Если требований больше, чем времени, предложите перенести конкретную задачу вместо молчаливого принятия всего.',
  'Protect one work block for the main priority and confirm any changed deadline with the relevant person.',
  'Выделите один рабочий блок для главного и согласуйте изменённый срок с нужным человеком.')

add('state.body_signals.overall',
  'This describes noticing bodily cues and responding to needs for food, water, movement or rest. It does not measure illness.',
  'Это распознавание телесных сигналов и отклик на потребность в еде, воде, движении или отдыхе. Шкала не измеряет заболевание.',
  'At a natural break, you could notice a body sensation without deciding immediately what caused it.',
  'Во время обычной паузы можно отметить телесное ощущение, не решая сразу, чем оно вызвано.',
  'If there is a familiar need, choose a comfortable response such as changing posture or taking a break.',
  'Если замечаете знакомую потребность, выберите удобный ответ: смените позу или сделайте паузу.',
  'For a familiar need, try a comfortable posture change or break and note the sensation; seek medical advice for unexplained or persistent symptoms.',
  'При знакомой потребности попробуйте удобную смену позы или паузу и отметьте ощущения; необъяснимые или стойкие симптомы обсудите с врачом.')

add('resources.rest_permission.overall',
  'This describes allowing breaks before exhaustion and stopping when enough is done, without requiring rest to be earned.',
  'Это возможность отдыхать до истощения и останавливаться, когда достаточно сделано, не требуя заслужить отдых.',
  'You could choose a short break time that does not depend on finishing every task first.',
  'Можно выбрать время короткой паузы, не связывая её с завершением всех дел.',
  'Before one optional task, define what will count as enough so it has a clear stopping point.',
  'Перед одним необязательным делом определите достаточный результат и ясную точку остановки.',
  'Take the planned break today and notice how it affects your return to activity.',
  'Сделайте запланированную паузу сегодня и отметьте, как возвращаетесь к делам.')

add('resources.closeness_compass.overall',
  'This describes recognizing needs for closeness or space, keeping your preferences and receiving care without immediate repayment.',
  'Это распознавание потребности в близости или дистанции, сохранение предпочтений и принятие заботы без немедленного ответного долга.',
  'Before a conversation, you could notice whether you want company, reassurance, quiet or more space.',
  'Перед разговором можно отметить, чего хочется: общения, поддержки, тишины или большей дистанции.',
  'In a safe relationship, state one specific preference and ask what amount of contact suits the other person.',
  'В безопасных отношениях назовите одно конкретное предпочтение и спросите, какой контакт подходит другому человеку.',
  'Agree on one comfortable form of contact or space and check how it felt afterward.',
  'Договоритесь об удобной форме контакта или дистанции и затем сравните ощущения.')

add('resources.confidence_pulse.overall',
  'This describes trusting your existing skills, making ordinary decisions and recovering after mistakes.',
  'Это доверие своим навыкам, принятие обычных решений и восстановление после ошибок.',
  'You could write one recent ordinary problem you handled and the skill you used.',
  'Можно записать одну недавно решённую обычную проблему и навык, который помог.',
  'Use that skill for a small, reversible challenge, deciding in advance what help you can ask for if needed.',
  'Примените этот навык к небольшой обратимой задаче и заранее решите, какую помощь можно попросить.',
  'Use the named skill for a small reversible challenge and record what you learned, including what worked.',
  'Примените названный навык к небольшой обратимой задаче и запишите, что узнали, включая то, что получилось.')

add('resources.playfulness_pulse.overall',
  'This describes room for curiosity, humour, enjoyment and improvisation without needing a productive outcome.',
  'Это место для любопытства, юмора, удовольствия и импровизации без обязательного полезного результата.',
  'You could choose something mildly interesting to try without rating your performance, such as doodling or exploring a new song.',
  'Можно выбрать что-то немного интересное без оценки результата: например, порисовать или послушать новую песню.',
  'Allow a small change to a routine activity simply because you are curious about it.',
  'Разрешите небольшое изменение привычного занятия просто из любопытства.',
  'Spend a few minutes on the chosen experiment and note whether you would like to repeat it.',
  'Уделите выбранной пробе несколько минут и отметьте, хочется ли повторить.')

add('function.daily_rhythm.overall',
  'This describes a daily structure that supports sleep, meals, movement and transitions between work and rest.',
  'Это повседневная структура, поддерживающая сон, питание, движение и переходы между работой и отдыхом.',
  'You could identify one existing daily anchor, such as breakfast or ending work, that is reasonably predictable for you.',
  'Можно найти одну достаточно предсказуемую часть дня: например, завтрак или завершение работы.',
  'Attach one useful habit to that anchor, such as a brief posture change or preparing for the next part of the day.',
  'Свяжите с ней одну полезную привычку: краткую смену позы или подготовку к следующей части дня.',
  'Attach one small useful habit to the daily anchor and try it on three days; keep it only if it fits your schedule.',
  'Добавьте к ежедневной опоре небольшую полезную привычку и попробуйте три дня; сохраните, если подходит расписанию.')

add('state.money_pressure.overall',
  'The items combine financial worry and avoidance with practical clarity and access to help. The total does not show one direction of financial strain.',
  'Вопросы объединяют финансовую тревогу и избегание с практической ясностью и доступом к помощи. Общий балл не имеет единого направления финансового напряжения.',
  'If money is on your mind, you could separate verified facts, unanswered questions and feared possibilities on one page.',
  'Если деньги занимают мысли, можно разделить на одном листе проверенные факты, вопросы без ответа и опасения.',
  'Choose one factual question to clarify using an account statement, the relevant provider or a trusted advice service.',
  'Выберите один фактический вопрос для уточнения по выписке, у соответствующей организации или надёжной консультационной службы.',
  'Choose one unanswered factual question, set a short time to check a statement or provider, and update your notes.',
  'Выберите один вопрос о фактах, выделите время на проверку выписки или уточнение у поставщика и обновите записи.')

add('state.overthinking_loop.overall',
  'The items combine repeated, unproductive thinking with the ability of an action or pause to interrupt it. The total cannot distinguish these parts.',
  'Вопросы объединяют повторяющиеся непродуктивные мысли и возможность прервать их действием или паузой. Общий балл не разделяет эти части.',
  'If a question keeps returning, you could write whether there is any new information or a concrete answer you can obtain.',
  'Если вопрос повторяется, можно записать, появилась ли новая информация и можно ли получить конкретный ответ.',
  'Choose either one useful action to get information or a deliberate pause from the question when nothing can change now.',
  'Выберите полезное действие для получения информации или осознанную паузу, если сейчас ничего нельзя изменить.',
  'Obtain one useful piece of information if possible; otherwise try a deliberate pause and notice whether returning to another activity is easier.',
  'Если возможно, получите одно полезное сведение; иначе попробуйте осознанную паузу и отметьте, легче ли вернуться к другому занятию.')

add('resources.felt_safety.overall',
  'This describes bodily ease, noticing tension, making comfort adjustments and choosing boundaries around touch. It cannot establish whether a situation is safe.',
  'Это телесный комфорт, распознавание напряжения, возможность изменить обстановку и выбирать границы прикосновений. Шкала не устанавливает безопасность ситуации.',
  'You could identify one ordinary place or posture where you feel more at ease.',
  'Можно найти одно обычное место или положение тела, где вам спокойнее.',
  'If comfortable, notice the room and a steady support beneath you; stop if focusing on sensations is unpleasant.',
  'Если комфортно, осмотритесь и отметьте устойчивую опору под собой; остановитесь, если внимание к ощущениям неприятно.',
  'Choose one comfort adjustment you can use when needed, without staying in a situation you consider unsafe.',
  'Выберите доступное изменение для комфорта, не оставаясь ради упражнения в ситуации, которую считаете небезопасной.')

add('resources.emotion_clarity.overall',
  'This describes naming feelings, noticing mixed emotions and making room for them before choosing a response.',
  'Это распознавание и называние чувств, замечание их сочетаний и пауза перед выбором реакции.',
  'At one moment today, you could name a feeling in your own words and note whether tiredness or another feeling is also present.',
  'В один из моментов дня можно назвать чувство своими словами и отметить, есть ли рядом усталость или другое переживание.',
  'Separate “what I feel” from “what I want to do,” then choose a response that fits the situation.',
  'Разделите «что я чувствую» и «что хочу сделать», затем выберите подходящий ситуации ответ.',
  'Write one brief example with three parts: situation, feeling and chosen response.',
  'Запишите короткий пример из трёх частей: ситуация, чувство и выбранный ответ.')

add('resources.loss_adjustment.overall',
  'This describes making room for reactions to loss or change, meeting daily needs and accessing support. It does not set a timetable for grief.',
  'Это место для реакций на утрату или изменение, забота о повседневных потребностях и доступ к поддержке. Шкала не задаёт сроки горевания.',
  'If this topic fits your life, you could choose one daily need to support without requiring yourself to feel better first.',
  'Если тема относится к вашей жизни, можно выбрать одну повседневную потребность без требования сначала почувствовать себя лучше.',
  'Decide whether you want quiet, a familiar routine or someone who can listen without urging you to move on.',
  'Решите, чего хочется: тишины, привычного дела или человека, который выслушает без призывов двигаться дальше.',
  'Arrange one practical support for the daily need you named; remembrance or conversation remains optional.',
  'Организуйте одну практическую поддержку названной повседневной потребности; воспоминания и разговор остаются по желанию.')

add('resources.belonging.overall',
  'This describes feeling welcome, being yourself with others and finding contact around shared interests.',
  'Это ощущение принятия, возможность быть собой рядом с другими и находить контакт через общие интересы.',
  'You could name one person, place or group where you feel welcome without having to perform a role.',
  'Можно назвать человека, место или группу, где вам рады без необходимости исполнять роль.',
  'If you want more connection, look for one low-pressure way to take part around an interest you actually enjoy.',
  'Если хочется больше связи, найдите один необременительный способ участвовать в том, что действительно интересно.',
  'Choose one contact or activity to try, with permission to leave or take space.',
  'Выберите контакт или занятие для пробы, сохраняя возможность уйти или сделать паузу.')

add('function.conflict_repair.overall',
  'This describes pausing, expressing concerns, hearing another view and choosing whether a difficult conversation can safely continue.',
  'Это пауза, выражение своей позиции, внимание к чужой и выбор, можно ли безопасно продолжать трудный разговор.',
  'If a conversation remains unresolved, you could write what happened, its effect on you and one change you would like.',
  'Если разговор остался незавершённым, можно записать событие, его влияние на вас и одно желаемое изменение.',
  'If continuing feels safe, suggest a calmer time to speak; agree that either person can pause the discussion.',
  'Если продолжать безопасно, предложите спокойное время и договоритесь, что любой может прервать обсуждение.',
  'Prepare one factual opening sentence, or choose distance and support if resuming does not feel safe.',
  'Подготовьте одну фразу о фактах или выберите дистанцию и поддержку, если возвращаться к разговору небезопасно.')

add('resources.family_roles.overall',
  'This describes distinguishing your wishes from family expectations and choosing how much responsibility or help you can take on.',
  'Это различение своих желаний и ожиданий семьи и выбор посильной ответственности или помощи.',
  'You could name one family expectation and write what you personally want or can realistically offer.',
  'Можно назвать одно семейное ожидание и записать, чего хотите сами или что реально можете предложить.',
  'Prepare a specific limit on time, effort or responsibility while acknowledging the other person’s need.',
  'Подготовьте конкретную границу времени, сил или ответственности, признавая потребность другого человека.',
  'If a conversation is safe, name one limit on your time, effort or responsibility and discuss that limit.',
  'Если разговор безопасен, назовите одну границу времени, усилий или ответственности и обсудите её.')

add('resources.inner_imagery.overall',
  'This describes using images or metaphors to explore feelings while remaining able to return attention to your surroundings.',
  'Это использование образов или метафор для исследования чувств с возможностью возвращать внимание к обстановке.',
  'If imagery appeals to you, you could describe a welcoming place using an image, a few words or a simple sketch.',
  'Если образы вам подходят, можно описать приятное место мысленно, несколькими словами или простым рисунком.',
  'Notice what the description brings up without assigning a hidden meaning; stop and look around if it becomes uncomfortable.',
  'Отметьте отклик без поиска скрытого смысла; если станет неприятно, остановитесь и осмотритесь.',
  'Try this briefly once and keep the format, including words rather than images, only if it is useful.',
  'Один раз попробуйте ненадолго и сохраните удобный формат, включая слова вместо образов, только если он полезен.')

add('resources.values_direction.overall',
  'This describes naming priorities, noticing conflicts with obligations and choosing actions that reflect what matters to you.',
  'Это называние приоритетов, замечание противоречий с обязанностями и выбор действий в соответствии с важным для вас.',
  'You could write two current values and one recent action that expressed either of them.',
  'Можно записать две актуальные ценности и недавнее действие, которое отражало хотя бы одну.',
  'For one upcoming choice, compare the options with those values and note any real constraints.',
  'Для одного предстоящего выбора сравните варианты с этими ценностями и отметьте реальные ограничения.',
  'Choose one small action this week that fits both a priority and your available capacity.',
  'Выберите небольшой шаг на неделю, подходящий и приоритету, и вашим возможностям.')

add('resources.life_transition.overall',
  'This describes finding stability, support and a manageable next step during change, while recognizing what you can influence.',
  'Это поиск устойчивости, поддержки и посильного шага в период изменений с учётом того, на что можно повлиять.',
  'If you are in a transition, you could list what is changing and one familiar routine you can keep.',
  'Если вы переживаете переходный период, можно назвать изменения и один привычный элемент дня, который можно сохранить.',
  'Identify one practical uncertainty you can clarify now and one person or service that could help.',
  'Найдите один практический вопрос, который можно прояснить сейчас, и человека или службу для помощи.',
  'Choose one familiar routine to keep this week and one unanswered practical question about the transition to clarify.',
  'Выберите знакомую привычку, которую сохраните на неделе, и один практический вопрос о перемене для прояснения.')

add('function.speaking_up.overall',
  'This describes expressing a preference, asking for clarity, declining and requesting time before answering.',
  'Это выражение предпочтений, просьба о ясности, отказ и возможность взять время перед ответом.',
  'You could choose an ordinary, low-risk situation and write one clear sentence stating your preference or question.',
  'Можно выбрать обычную ситуацию без серьёзного риска и записать одну ясную фразу с предпочтением или вопросом.',
  'Practice the sentence aloud without adding a long justification; allow yourself to ask for time instead.',
  'Произнесите фразу без длинных оправданий; при необходимости разрешите себе попросить время.',
  'Use the sentence in a conversation you consider safe and note whether your meaning was understood.',
  'Используйте фразу в безопасном для вас разговоре и отметьте, был ли смысл понятен.')

add('function.sustainable_pace.overall',
  'This describes matching demands to energy, reducing task size and leaving room for recovery before exhaustion.',
  'Это соотнесение требований с силами, уменьшение задач и место для отдыха до истощения.',
  'You could choose the most important responsibility this week and define a smaller version for a lower-energy day.',
  'Можно выбрать главную обязанность недели и определить меньший вариант на день с небольшим запасом сил.',
  'Place recovery time after a demanding period and name an early sign that means it is time to pause.',
  'Оставьте время восстановления после нагрузки и назовите ранний признак необходимости паузы.',
  'Try the smaller version or planned pause at the next demanding period and note the effect on your energy.',
  'При ближайшей нагрузке попробуйте меньший объём или плановую паузу и отметьте влияние на силы.')

add('resources.support_seeking.overall',
  'This describes noticing when help would be useful, asking specifically, accepting support and finding alternatives after a refusal.',
  'Это распознавание нужды в помощи, конкретная просьба, принятие поддержки и поиск альтернатив после отказа.',
  'You could choose one current task that would be easier with help and state exactly what another person could do.',
  'Можно выбрать текущее дело, которое легче с помощью, и точно назвать, что другой человек мог бы сделать.',
  'Identify a suitable first contact and a backup option, allowing either person to decline.',
  'Определите подходящий первый контакт и запасной вариант, оставляя человеку право отказать.',
  'If help is wanted, make the specific request and include when it would be useful.',
  'Если помощь нужна, отправьте конкретную просьбу и укажите, когда она пригодится.')

add('state.sensory_comfort.overall',
  'This describes noticing sensory needs and adjusting noise, light, surroundings or activity for everyday comfort.',
  'Это распознавание сенсорных потребностей и изменение шума, света, обстановки или активности для повседневного комфорта.',
  'You could notice one sensory condition that supports you or tires you, such as light, sound or temperature.',
  'Можно отметить одно поддерживающее или утомляющее условие: свет, звук или температуру.',
  'Change one adjustable detail, or take a brief break in a more comfortable space if you want one.',
  'Измените одну доступную деталь или при желании сделайте короткую паузу в более удобном месте.',
  'Adjust one detail of light, noise or temperature if possible, compare comfort before and after, and keep only what helps.',
  'По возможности измените одну деталь света, шума или температуры, сравните комфорт до и после и оставьте полезное.')

add('function.goal_obstacles.overall',
  'This describes defining a goal, distinguishing practical constraints from feared outcomes and adjusting a workable plan.',
  'Это формулирование цели, различение реальных ограничений и опасений и изменение посильного плана.',
  'You could write one goal as an observable outcome and name the main practical obstacle.',
  'Можно записать одну цель как наблюдаемый результат и назвать главное практическое препятствие.',
  'Choose a small step that either tests an assumption or obtains a missing resource or piece of information.',
  'Выберите небольшой шаг для проверки предположения или получения недостающего ресурса либо информации.',
  'Take one small step to test an assumption or obtain a missing resource this week, then update the goal plan.',
  'На неделе сделайте небольшой шаг для проверки предположения или получения недостающего ресурса и уточните план цели.')

add('state.body_mind_context.overall',
  'This describes observing sensations, context, worry and daily impact separately. It does not establish a psychological or physical cause.',
  'Это раздельное наблюдение за ощущениями, обстоятельствами, тревогой и влиянием на дела. Шкала не устанавливает психологическую или телесную причину.',
  'If discomfort occurs, you could note the sensation, timing, surrounding activity and effect on an ordinary task.',
  'Если возникает дискомфорт, можно отметить ощущение, время, занятие вокруг него и влияние на обычное дело.',
  'Record how strong the sensation feels separately from how worried you are, without treating one as proof of the other.',
  'Отдельно запишите силу ощущения и тревоги о нём, не принимая одно за доказательство другого.',
  'Bring the brief record to a healthcare professional if symptoms persist, worsen or interfere with daily life.',
  'Покажите краткие записи врачу, если симптомы сохраняются, усиливаются или мешают повседневной жизни.')

add('resources.energy_drains.overall',
  'This describes recognizing what uses and restores energy, and planning accordingly. More points mean more reported awareness and flexibility, not more depletion.',
  'Это распознавание затрат и восстановления сил и соответствующее планирование. Больший балл означает больше осознанности и гибкости, а не истощения.',
  'You could name two activities that use a lot of energy and one that usually restores it.',
  'Можно назвать два занятия, которые требуют много сил, и одно, которое обычно восстанавливает.',
  'Reduce one avoidable task switch or place a demanding activity at a time when you tend to have more capacity.',
  'Уберите одно лишнее переключение между задачами или поставьте трудное дело на время большего запаса сил.',
  'Reduce one avoidable task switch or move a demanding task to a better-energy time, then compare the energy left.',
  'Уберите лишнее переключение или перенесите трудное дело на время большего запаса сил и сравните оставшуюся энергию.')

add('resources.social_ease.overall',
  'This describes curiosity, asking questions and choosing a manageable amount of contact without requiring a perfect social performance.',
  'Это любопытство к людям, вопросы и выбор посильного общения без требования вести себя идеально.',
  'You could recall one comfortable conversation and identify its format, length or shared topic.',
  'Можно вспомнить комфортный разговор и отметить его формат, длительность или общую тему.',
  'If you want contact, try a similar setting and ask one question you are genuinely curious about.',
  'Если хочется общения, выберите похожую обстановку и задайте один действительно интересный вам вопрос.',
  'If you want contact, try a similarly comfortable setting and afterwards note whether its length and format suited you.',
  'Если хочется общения, попробуйте похожую удобную обстановку и затем отметьте, подошли ли длительность и формат.')

add('resources.solitude_choice.overall',
  'This describes choosing restorative solitude and recognizing when you want connection. Neither more solitude nor more company is automatically better.',
  'Это выбор восстанавливающего уединения и распознавание желания контакта. Ни больше одиночества, ни больше общения само по себе не лучше.',
  'You could ask whether you want quiet or company right now, and notice whether being alone still feels restorative.',
  'Можно спросить себя, хочется ли сейчас тишины или компании и остаётся ли уединение восстанавливающим.',
  'Choose either a protected period alone or a specific way to contact someone, based on that answer.',
  'По ответу выберите защищённое время наедине с собой или конкретный способ связаться с человеком.',
  'Choose a manageable period of solitude or one specific contact based on your need, then check how it felt.',
  'По своей потребности выберите посильное время уединения или конкретный контакт и затем проверьте ощущения.')

add('resources.relationship_balance.overall',
  'This describes noticing reciprocity, expressing wishes, receiving care and giving support without overlooking your limits.',
  'Это распознавание взаимности, выражение желаний, принятие заботы и поддержка других с учётом собственных границ.',
  'For one relationship, you could list specific examples of support given and received without assuming they must be identical.',
  'Для одних отношений можно записать конкретные примеры данной и полученной поддержки, не требуя их полного равенства.',
  'If an arrangement feels one-sided, prepare one clear request or adjustment that would make it more workable for you.',
  'Если договорённость ощущается односторонней, подготовьте просьбу или изменение, которое сделает её для вас посильнее.',
  'If an arrangement feels one-sided and a conversation is safe, ask for one concrete adjustment and observe the response over time.',
  'Если договорённость ощущается односторонней и разговор безопасен, попросите одно конкретное изменение и наблюдайте отклик со временем.')

add('state.approval_pressure.overall',
  'This describes freedom to notice approval-seeking and keep your preferences. More points mean more reported choice, not more pressure to be liked.',
  'Это свобода замечать поиск одобрения и сохранять свои предпочтения. Больший балл означает больше выбора, а не давления нравиться.',
  'Before one low-stakes agreement, you could write what you would prefer if approval were not part of the decision.',
  'Перед одним согласием без серьёзных последствий можно записать, чего предпочли бы сами, если бы одобрение не влияло на решение.',
  'Practice a respectful response that keeps that preference, including asking for time or revising an earlier yes.',
  'Подготовьте уважительный ответ с сохранением предпочтения: просьбу о времени или пересмотр прежнего согласия.',
  'Try a respectful response that keeps your preference in a safe situation, then compare the outcome with your expectation.',
  'В безопасной ситуации попробуйте уважительный ответ с сохранением предпочтения и сравните исход с ожиданиями.')

add('function.perfectionism_pressure.overall',
  'This describes flexible standards, tolerating harmless mistakes and stopping when enough is done. More points mean more flexibility, not more perfectionism.',
  'Это гибкость требований, допущение безвредных ошибок и своевременная остановка. Больший балл означает больше гибкости, а не перфекционизма.',
  'For a low-stakes task, you could define the actual required quality and two signs that it is finished.',
  'Для задачи без серьёзных последствий можно определить нужное качество и два признака завершения.',
  'Ask for feedback on a draft or stop polishing when those signs are met, while preserving any real safety requirements.',
  'Попросите отзыв на черновик или прекратите доработку при этих признаках, сохраняя реальные требования безопасности.',
  'Try your stopping rule on one task and note whether extra polishing would have changed its usefulness.',
  'Проверьте правило остановки на одной задаче и оцените, изменила бы дополнительная доработка её полезность.')

add('resources.uncertainty_flexibility.overall',
  'This describes taking manageable steps without a guarantee and revising plans as information arrives.',
  'Это посильные шаги без гарантии результата и пересмотр планов по мере появления информации.',
  'You could separate one current uncertainty into a question you can answer now and something only time can reveal.',
  'Можно разделить текущую неопределённость на вопрос с доступным сейчас ответом и то, что прояснится со временем.',
  'Choose a small reversible step and specify what new information would make you change course.',
  'Выберите небольшой обратимый шаг и определите, при какой новой информации измените план.',
  'Choose a small reversible step with acceptable practical risks, take it, and review only information that has actually changed.',
  'Выберите небольшой обратимый шаг с приемлемыми рисками, выполните его и пересмотрите только реально изменившиеся сведения.')

add('resources.role_freedom.overall',
  'This describes seeing yourself beyond duties, keeping personal interests and choosing responses rather than following a familiar role automatically.',
  'Это восприятие себя за пределами обязанностей, собственные интересы и выбор реакций вместо автоматического следования привычной роли.',
  'You could write three things about yourself that are not job titles, duties or ways you help others.',
  'Можно записать три вещи о себе, которые не являются должностями, обязанностями или помощью другим.',
  'Choose one interest to give a little time to without needing praise or a useful result.',
  'Выберите интерес и уделите ему немного времени без необходимости получать похвалу или полезный результат.',
  'Make room this week for one interest unrelated to your duties and notice whether it gives you a valued sense of choice.',
  'Выделите на неделе время интересу вне обязанностей и отметьте, даёт ли это ценное ощущение выбора.')

add('function.work_boundaries.overall',
  'This describes clarity about responsibilities, deadlines, focus time and availability at work or in study.',
  'Это ясность обязанностей, сроков, времени сосредоточения и доступности на работе или в учёбе.',
  'Before accepting one task, you could clarify its expected result, deadline and owner.',
  'Перед принятием одной задачи можно уточнить ожидаемый результат, срок и ответственного.',
  'If priorities clash, ask which existing task should move and state the focused time the new work needs.',
  'Если приоритеты конфликтуют, уточните, какую текущую задачу перенести, и обозначьте нужное новой работе время без отвлечений.',
  'Confirm one clear agreement about the task or your availability with the relevant person.',
  'Подтвердите одну ясную договорённость о задаче или своей доступности с нужным человеком.')

add('resources.love_affection.expressing',
  'This describes expressing appreciation and warmth in ways that are genuine to you and welcome to the other person.',
  'Это выражение признательности и тепла искренним для вас и желанным для другого человека способом.',
  'You could name one specific quality or action you appreciate in someone close to you.',
  'Можно назвать конкретное качество или действие близкого человека, которое цените.',
  'Choose a comfortable way to express that appreciation, checking first if a gesture involves touch or personal space.',
  'Выберите удобный способ выразить признательность; заранее спросите, если жест затрагивает прикосновения или личное пространство.',
  'Share one specific appreciation when the setting feels suitable, without expecting a matching response.',
  'В подходящий момент выразите одну конкретную благодарность без ожидания равноценного ответа.')

add('resources.love_affection.receiving',
  'This describes noticing care, accepting a welcome gesture and naming the forms of affection that feel comfortable.',
  'Это замечание заботы, принятие желанного жеста и называние комфортных форм нежности.',
  'You could identify a form of care you welcome and one you prefer people to ask about first.',
  'Можно определить приятную вам форму заботы и ту, о которой предпочитаете сначала спросить.',
  'When a welcome gesture occurs, try acknowledging it without promising an immediate return favour.',
  'Когда принимаете желанный жест, попробуйте поблагодарить без обещания немедленной ответной услуги.',
  'Tell someone you trust one specific way you like to receive care, if you want to share it.',
  'При желании скажите человеку, которому доверяете, об одном удобном для вас способе получать заботу.')

add('resources.trust_dialogue.honesty',
  'This describes stating relationship needs, asking for clarity and expressing disagreement without blame.',
  'Это называние потребностей в отношениях, просьба о ясности и выражение несогласия без обвинений.',
  'You could write one need as a concrete request rather than an assumption about another person’s intentions.',
  'Можно сформулировать одну потребность как конкретную просьбу, а не предположение о чужих намерениях.',
  'For an unclear expectation, prepare a direct question and check that you understood the answer.',
  'Для неясного ожидания подготовьте прямой вопрос и проверьте, верно ли поняли ответ.',
  'Use one prepared request or question in a conversation you consider safe.',
  'Используйте подготовленную просьбу или вопрос в безопасном для вас разговоре.')

add('resources.trust_dialogue.discernment',
  'This describes noticing whether words and actions match, allowing trust to grow gradually and returning to unresolved concerns.',
  'Это замечание соответствия слов и действий, постепенное развитие доверия и возвращение к нерешённым вопросам.',
  'You could recall a specific promise and what happened afterward, keeping the observation separate from an explanation of motives.',
  'Можно вспомнить конкретное обещание и последующие события, отделив наблюдение от объяснения мотивов.',
  'Choose a small agreement with clear expectations instead of forcing a large leap in trust.',
  'Выберите небольшую договорённость с ясными ожиданиями вместо вынужденного резкого усиления доверия.',
  'Choose a small clear agreement and observe whether it is kept before deciding how much more to rely on it.',
  'Выберите небольшую ясную договорённость и наблюдайте её выполнение, прежде чем больше на неё полагаться.')

add('resources.emotional_intimacy.opening',
  'This describes sharing a feeling and asking for emotional support at a depth you choose.',
  'Это выражение чувства и просьба об эмоциональной поддержке на выбранной вами глубине.',
  'If you want to share, you could choose one feeling and decide what details you prefer to keep private.',
  'Если хочется поделиться, можно выбрать одно чувство и определить детали, которые оставите личными.',
  'Ask a trusted person whether they have time to listen and say whether you want listening or practical suggestions.',
  'Спросите доверенного человека, есть ли время выслушать, и уточните, нужен ли разговор или практические предложения.',
  'Share only the amount you chose and check afterward whether that level of openness suited you.',
  'Расскажите только выбранный объём и затем отметьте, подходила ли вам такая открытость.')

add('resources.emotional_intimacy.pacing',
  'This describes choosing emotional distance and respecting how much each person wants to share.',
  'Это выбор эмоциональной дистанции и уважение к объёму откровенности каждого человека.',
  'You could notice one sign that you want to slow a personal conversation or keep a topic private.',
  'Можно отметить один признак желания замедлить личный разговор или оставить тему закрытой.',
  'Prepare a phrase such as “I want to stay connected, but I do not want to discuss that today.”',
  'Подготовьте фразу: «Мне важно наше общение, но сегодня я не хочу это обсуждать».',
  'Prepare and use a phrase such as “I do not want to discuss that today”; respect the same limit from the other person.',
  'Подготовьте и используйте фразу вроде «Сегодня я не хочу это обсуждать»; уважайте такую же границу другого человека.')

add('resources.intimacy_consent.agency',
  'This describes recognizing your right to refuse, pause or change your mind. A questionnaire answer is never consent to a real interaction.',
  'Это признание права отказаться, остановиться или передумать. Ответ в анкете никогда не является согласием на реальное взаимодействие.',
  'You could identify words you can use to decline or pause touch without explaining or defending your decision.',
  'Можно выбрать слова для отказа от прикосновения или паузы без объяснения и защиты своего решения.',
  'Notice the difference between wanting an interaction and agreeing because of pressure; choose distance or trusted support if needed.',
  'Отличайте желание контакта от согласия под давлением; при необходимости выбирайте дистанцию или поддержку доверенного человека.',
  'Rehearse your stop phrase privately; you do not need to enter an interaction to practice having a choice.',
  'Потренируйте фразу остановки наедине; для этого не нужно вступать во взаимодействие.')

add('resources.intimacy_consent.mutuality',
  'This describes checking whether contact is welcome, respecting hesitation or a changed mind and allowing a slower pace.',
  'Это проверка желательности контакта, уважение колебаний и изменившегося решения и возможность более медленного темпа.',
  'If you choose touch or closeness, first ask whether that specific gesture is welcome.',
  'Если хотите прикоснуться или сблизиться, сначала спросите, желанен ли этот конкретный жест.',
  'If the person hesitates, declines or changes their mind, stop without persuasion and leave alternatives optional.',
  'Если человек колеблется, отказывается или передумал, остановитесь без убеждения и не настаивайте на альтернативе.',
  'Use a specific check-in at the next relevant interaction and follow the answer, including a request to stop.',
  'В ближайшей подходящей ситуации задайте конкретный вопрос и следуйте ответу, включая просьбу остановиться.')

add('resources.desire_dialogue.awareness',
  'This describes noticing desire, absence of desire or neutrality and separating your preferences from expectations. It does not rank desire levels.',
  'Это распознавание желания, его отсутствия или нейтральности и различение своих предпочтений и ожиданий. Шкала не ранжирует уровень желания.',
  'You could privately notice what you want, do not want or are unsure about today, without needing to act on it.',
  'Наедине можно отметить, чего хотите, не хотите или пока не знаете сегодня, без необходимости действовать.',
  'Separate your preference from messages about what you are supposed to want, allowing it to change over time.',
  'Отделите предпочтение от представлений о том, чего положено хотеть, и допускайте его изменение со временем.',
  'Name one current preference or uncertainty for yourself; sharing it remains your choice.',
  'Назовите для себя одно текущее предпочтение или сомнение; делиться им или нет, решаете вы.')

add('resources.desire_dialogue.dialogue',
  'This describes discussing comfort and boundaries while allowing different preferences without blame or an obligation to perform.',
  'Это обсуждение комфорта и границ с признанием разных предпочтений без обвинений и обязанности соответствовать.',
  'You could choose one boundary or comfort preference you would want understood before a personal conversation or interaction.',
  'Можно выбрать границу или предпочтение комфорта, которое важно прояснить до личного разговора или взаимодействия.',
  'If you want to discuss it, choose a calm time and ask about the other person’s preferences without assuming agreement.',
  'Если хотите обсудить, выберите спокойное время и спросите о чужих предпочтениях, не предполагая согласия.',
  'Prepare one clear sentence about your comfort; use it only with someone and in a setting you consider safe.',
  'Подготовьте одну ясную фразу о своём комфорте; используйте её с человеком и в обстановке, которые считаете безопасными.')

add('resources.sexual_self_kindness.kindness',
  'This describes a nonjudgmental attitude toward your sexual feelings and uncertainty, without comparing your experience with someone else’s timeline.',
  'Это безоценочное отношение к своим сексуальным чувствам и неопределённости без сравнения опыта с чужими сроками.',
  'If a comparison is upsetting, you could identify the expectation behind it and whether you actually share that expectation.',
  'Если сравнение огорчает, можно найти стоящее за ним ожидание и проверить, разделяете ли вы его.',
  'Replace a judgment about yourself with a factual statement of what you know, do not know or do not want to decide yet.',
  'Замените оценку себя фактической фразой о том, что знаете, не знаете или пока не хотите решать.',
  'Write one respectful, factual response to the upsetting comparison and keep it for when that comparison returns.',
  'Запишите уважительный ответ по фактам на неприятное сравнение и сохраните на случай его возвращения.')

add('resources.sexual_self_kindness.choice',
  'This describes choosing whether to pursue intimacy, protecting privacy and deciding what is meaningful without social pressure.',
  'Это выбор, вступать ли в близость, сохранение приватности и определение личного смысла без социального давления.',
  'You could decide which details you want to keep private and which choices you do not owe anyone an explanation for.',
  'Можно решить, какие детали хотите оставить личными и какие решения не обязаны объяснять другим.',
  'Prepare a short response to an unwanted question or expectation, such as “I prefer not to discuss that.”',
  'Подготовьте короткий ответ на нежеланный вопрос или ожидание: «Я предпочитаю это не обсуждать».',
  'Rehearse a response such as “I prefer not to discuss that” if useful; no disclosure or intimate activity is required.',
  'При желании отрепетируйте ответ вроде «Я предпочитаю это не обсуждать»; откровенность и интимная активность не требуются.')

add('resources.tantra_presence.grounding',
  'This describes noticing posture, breath and comfort while being able to bring attention back to the present. It is not a measure of spiritual attainment.',
  'Это внимание к позе, дыханию и комфорту с возможностью возвращаться к настоящему моменту. Шкала не измеряет духовные достижения.',
  'If comfortable, you could notice your posture or an ordinary sound for a brief moment without forcing your breathing.',
  'Если комфортно, можно ненадолго отметить свою позу или обычный звук, не меняя дыхание через усилие.',
  'Keep your eyes open if you prefer and return to a familiar activity if the exercise feels unpleasant.',
  'При желании оставьте глаза открытыми и вернитесь к привычному занятию, если упражнение неприятно.',
  'Try one brief moment of attention and decide whether it is useful enough to repeat.',
  'Попробуйте один краткий момент внимания и решите, полезно ли его повторять.')

add('resources.tantra_presence.choice',
  'This describes staying aware of your needs, slowing or stopping a practice, and enjoying presence without an obligation to touch.',
  'Это внимание к своим потребностям, возможность замедлить или остановить практику и быть в контакте без обязанности прикасаться.',
  'Before any practice or shared activity, you could decide what you do and do not want, including whether you want any contact.',
  'Перед практикой или совместным занятием можно решить, что хотите и не хотите, включая наличие любого контакта.',
  'Choose a stopping phrase and a comfortable alternative, such as taking space or ending the activity.',
  'Выберите фразу остановки и удобную альтернативу: дистанцию или завершение занятия.',
  'State the limit before participating, or choose not to participate if that suits you.',
  'Обозначьте границу до участия или откажитесь от участия, если это вам подходит.')

add('resources.sensual_joy.senses',
  'This describes noticing pleasant ordinary sensations and adjusting them when they become too much.',
  'Это замечание приятных обычных ощущений и возможность изменить их, если становится слишком интенсивно.',
  'You could choose one familiar pleasant sound, texture or temperature at an intensity you find comfortable.',
  'Можно выбрать знакомый приятный звук, текстуру или температуру комфортной для вас интенсивности.',
  'Notice whether you want more, less or no further sensation, and adjust rather than trying to make it stronger.',
  'Отметьте, хочется ли продолжить, уменьшить или прекратить ощущение, и измените его без требования усиливать.',
  'Try the comfortable sensory moment briefly and keep only what you genuinely enjoy.',
  'Ненадолго попробуйте комфортное ощущение и сохраняйте только то, что действительно нравится.')

add('resources.sensual_joy.playfulness',
  'This describes allowing enjoyment without earning it or needing approval, in company or alone.',
  'Это разрешение на удовольствие без необходимости заслужить его или получить одобрение, вместе с кем-то или наедине.',
  'You could choose a small enjoyable activity and decide whether you prefer to do it alone or with someone.',
  'Можно выбрать небольшое приятное занятие и решить, хочется ли делать его одному или с кем-то.',
  'Give it a little time without a performance target; changing your mind or stopping is allowed.',
  'Уделите ему немного времени без требований к результату; можно передумать или остановиться.',
  'Make room for that activity today and note what you would keep or change next time.',
  'Выделите место этому занятию сегодня и отметьте, что сохранить или изменить в следующий раз.')

export const HH_FIVE_BLOCK_ACTIONS = Object.freeze(entries)
