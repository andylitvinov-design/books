// OPORA NAV-2.0 route-specific, voluntary educational interactions.
// Runtime data only: no scoring, diagnosis, persistence, networking or completion gates.
// The caller keeps worksheet drafts local; only an explicit user action may copy
// selected text into the existing encrypted reflection. AS2 is intentionally absent.
import { fiveLevelLessonRow } from './antistress-module-lessons-v2.js'

const text = (ru, en) => Object.freeze({ ru, en })
const choice = (id, ru, en) => Object.freeze({ id, label: text(ru, en) })
const fields = (...pairs) => Object.freeze(pairs.map(([ru, en]) => text(ru, en)))
const day = (kind, choices, fieldLabels, nextStep, review, reviewFields, reviewChoices, scene = null) =>
  Object.freeze({ kind, choices: Object.freeze(choices), fields: fieldLabels, nextStep,
    review, reviewFields, reviewChoices: Object.freeze(reviewChoices), scene })

const ROUTES = Object.freeze({
  AS1: Object.freeze([
    day('photo_choice', [
      choice('ordinary_object', 'Один обычный предмет на фотографии', 'One ordinary object in the photo'),
      choice('visible_edge', 'Только край выбранного предмета', 'Just the edge of that object'),
      choice('not_today', 'Не сегодня', 'Not today'),
    ], fields(['Предмет, если выбран', 'Object, if chosen'], ['Одна видимая деталь', 'One visible detail']),
    text('При желании отметьте предмет и одну внешнюю деталь. Можно сразу закрыть практику.', 'If you wish, note the object and one visible detail. You may finish immediately.'),
    text('Какой вариант вы хотели бы оставить доступным: посмотреть на деталь или закончить? Изменение чувств не требуется.', 'Which option would you like to keep available: noticing a detail or finishing? Feelings do not need to change.'),
    fields(['Удобный вариант', 'A workable option'], ['Когда можно остановиться', 'When I may stop']), [
      choice('detail', 'Оставить одну деталь', 'Keep one detail'),
      choice('finish', 'Оставить право закончить сразу', 'Keep permission to finish immediately'),
    ]),
    day('distance_choice', [
      choice('read_only', 'Просто читать', 'Just read'),
      choice('look_ten', 'Посмотреть на предмет до десяти секунд', 'Notice an object for up to ten seconds'),
      choice('rest', 'Отдыхать без наблюдения', 'Rest without observing'),
    ], fields(['Формат сейчас', 'My format now'], ['На что можно переключиться', 'An alternative format']),
    text('Выберите формат без обязательства выдержать время. Можно перейти от наблюдения к чтению или отдыху.', 'Choose a format without committing to a duration. You may switch from looking to reading or rest.'),
    text('Оставьте себе один способ уменьшить участие, если исходный формат перестанет подходить.', 'Keep one way to reduce participation if the original format stops fitting.'),
    fields(['Что можно сократить', 'What I can shorten'], ['Более лёгкая замена', 'An easier alternative']), [
      choice('shorten', 'Смотреть меньше десяти секунд', 'Look for less than ten seconds'),
      choice('reading', 'Перейти только к чтению', 'Switch to reading only'),
    ]),
    day('early_signal_support', [
      choice('reread_reduce', 'Повторное чтение ярлыка → убрать часть книг', 'Rereading the label → set some books aside'),
      choice('reread_pause', 'Повторное чтение ярлыка → сделать паузу', 'Rereading the label → take a pause'),
      choice('unsure', 'Пока не выбирать сигнал', 'Leave the signal undecided'),
    ], fields(['Первый наблюдаемый сигнал', 'First observable sign'], ['Мягкое уменьшение нагрузки', 'A gentle reduction in demands']),
    text('Сначала найдите раннюю деталь истории, затем подберите поддержку. Проверять собственную выносливость не нужно.', 'First find an early detail in the story, then pair it with support. There is no need to test your own endurance.'),
    text('Можно оставить только связь между повторным чтением и уменьшением дела, без объяснения причин состояния героя.', 'You may keep just the link between rereading and reducing the task, without explaining the character’s state.'),
    fields(['Деталь из истории', 'A detail from the story'], ['Что можно сделать меньше', 'What could be made smaller']), [
      choice('smaller_stack', 'Оставить одну книгу', 'Keep just one book'),
      choice('pause_sorting', 'Отложить сортировку', 'Pause the sorting'),
    ], text('Учебная история: Саша раскладывает книги. Сначала перечитывает один ярлык несколько раз, затем начинает спешить. Сортировку можно отложить.', 'Fictional story: Sasha is sorting books. First they reread one label several times, then start rushing. The sorting can wait.')),
    day('demand_energy_match', [
      choice('demands_reduce', 'Много дел → отложить одно', 'Many tasks → postpone one'),
      choice('energy_rest', 'Мало сил → отдых', 'Little energy → rest'),
      choice('practical_help', 'Попросить помощи с одной частью', 'Ask for help with one part'),
    ], fields(['Где много требований', 'Where demands are high'], ['Поддержка при многих делах', 'Support for many tasks'], ['Где мало сил', 'Where energy is low'], ['Поддержка при усталости', 'Support for tiredness']),
    text('Рассмотрите две сцены отдельно. Поддержка может различаться; это не определение типа нервной системы.', 'Consider the two scenes separately. Different support may fit each; this does not classify a nervous system.'),
    text('Проверьте только реалистичность поддержки: можно ли уменьшить список в первой сцене и оставить место отдыху во второй?', 'Check only whether the support is realistic: could the first list shrink and could the second scene include rest?'),
    fields(['Что можно убрать из списка', 'What can leave the list'], ['Как освободить место для отдыха', 'How to make room for rest']), [
      choice('defer_one', 'Перенести одно необязательное дело', 'Delay one optional task'),
      choice('rest_first', 'Оставить отдых первым шагом', 'Keep rest as the first step'),
    ], text('Две вымышленные сцены: у Даны одновременно три необязательных домашних дела. У Льва одно небольшое дело, но после обычного дня почти нет сил.', 'Two fictional scenes: Dana has three optional household tasks at once. Lev has one small task but little energy after an ordinary day.')),
    day('external_line_colour', [
      choice('straight_line', 'Найти одну ровную линию', 'Find one straight line'),
      choice('calm_colour', 'Выбрать один спокойный цвет', 'Choose one calm colour'),
      choice('room_only', 'Остаться с общим видом комнаты', 'Stay with the room as a whole'),
    ], fields(['Линия или цвет', 'Line or colour'], ['Где находится ориентир', 'Where the anchor is']),
    text('Заметьте только внешний признак. Не нужно переводить внимание к дыханию или ощущениям тела.', 'Notice only a visible feature. You do not need to shift to breathing or body sensations.'),
    text('Какой внешний ориентир было бы легко найти снова без поиска особого ощущения?', 'Which external anchor would be easy to find again without seeking a particular feeling?'),
    fields(['Знакомый внешний ориентир', 'A familiar external anchor'], ['Другой видимый вариант', 'Another visible option']), [
      choice('line_again', 'Снова выбрать ту же линию', 'Use the same line again'),
      choice('colour_instead', 'Заменить линию цветом', 'Use a colour instead of a line'),
    ]),
    day('orienting_duration', [
      choice('ten', 'До десяти секунд', 'Up to ten seconds'),
      choice('thirty', 'До тридцати секунд', 'Up to thirty seconds'),
      choice('sixty', 'До шестидесяти секунд', 'Up to sixty seconds'),
      choice('untimed_rest', 'Отдых без таймера', 'Rest without a timer'),
    ], fields(['Выбранная длительность или отдых', 'Chosen duration or rest'], ['Нейтральный ориентир', 'A neutral anchor'], ['Как закончить раньше', 'How to stop early']),
    text('Выберите верхнюю границу времени, а не обязательную норму. Можно завершить раньше или не начинать.', 'Choose an upper time limit, not a required amount. You may finish earlier or not begin.'),
    text('Как сохранить возможность укоротить паузу или убрать таймер при следующем выборе?', 'How could you keep the option to shorten the pause or remove the timer next time?'),
    fields(['Более короткий вариант', 'A shorter option'], ['Вариант без таймера', 'An untimed option']), [
      choice('shorter', 'В следующий раз короче', 'A shorter option next time'),
      choice('no_timer', 'Оставить отдых без отсчёта', 'Keep rest without a countdown'),
    ]),
    day('available_resource', [
      choice('water', 'Вода, если она доступна', 'Water, if available'),
      choice('place_object', 'Удобное место или обычный предмет', 'A comfortable place or ordinary object'),
      choice('pause_person', 'Реальная пауза или доступный человек', 'An actual pause or available person'),
      choice('nothing_yet', 'Пока ничего', 'Nothing yet'),
    ], fields(['Действительно доступный ресурс', 'A genuinely available support'], ['Что делает его доступным сейчас', 'What makes it available now']),
    text('Запишите только то, что действительно есть. Имена, адреса и контакты не нужны.', 'Name only something that is actually available. Names, addresses and contact details are unnecessary.'),
    text('Можно отличить доступный сейчас ресурс от желаемого и оставить пустое место, если поддержки пока нет.', 'You may distinguish present support from something only wished for, and leave a blank if none is available.'),
    fields(['Что доступно сейчас', 'What is available now'], ['Что пока недоступно, если полезно отметить', 'What is not available yet, if useful']), [
      choice('use_present', 'Оставить один реальный ресурс', 'Keep one actual support'),
      choice('leave_open', 'Оставить поиск открытым', 'Leave the search open'),
    ]),
    day('image_or_object', [
      choice('familiar_place', 'Знакомое спокойное место, если приятно', 'A familiar calm place, if comfortable'),
      choice('ordinary_object', 'Обычный предмет и два качества', 'An ordinary object and two qualities'),
      choice('photo_detail', 'Картинка и две видимые детали', 'A picture and two visible details'),
    ], fields(['Место, предмет или картинка', 'Place, object or picture'], ['Первое видимое качество', 'First visible quality'], ['Второе видимое качество', 'Second visible quality']),
    text('Если образ не подходит, выберите предмет или картинку. Цвет и форма достаточны; скрытый смысл искать не нужно.', 'If imagery does not fit, choose an object or picture. Colour and shape are enough; do not search for hidden meaning.'),
    text('Оставьте тот способ, который не требует усилия воображения. Описывать личные воспоминания не нужно.', 'Keep a mode that does not require effortful imagery. There is no need to describe personal memories.'),
    fields(['Подходящий способ', 'A suitable mode'], ['Внешняя замена образу', 'An external alternative to imagery']), [
      choice('visible_object', 'Оставить видимый предмет', 'Keep a visible object'),
      choice('two_details', 'Оставить только две детали картинки', 'Keep just two picture details'),
    ]),
    day('story_pause_point', [
      choice('rereading_pause', 'Пауза при повторном чтении строки', 'Pause when rereading the line'),
      choice('before_next', 'Пауза перед следующей частью списка', 'Pause before the next part of the list'),
      choice('set_aside', 'Сразу отложить необязательный список', 'Set the optional list aside now'),
    ], fields(['Что произошло в истории', 'What happened in the story'], ['Момент для паузы', 'A possible pause point'], ['Нейтральное завершение', 'A neutral way to finish']),
    text('Найдите один момент, когда пауза уже допустима. Не нужно ждать сильной реакции или вспоминать свои тяжёлые события.', 'Find one moment when a pause is already allowed. There is no need to wait for a strong response or recall distressing events.'),
    text('Можно оставить паузу до следующего действия, не объясняя и не исправляя реакцию героя.', 'You may keep a pause before the next action without explaining or fixing the character’s response.'),
    fields(['Ранний момент для остановки', 'An early stopping point'], ['Что может подождать', 'What can wait']), [
      choice('early_pause', 'Пауза при первой заметной трудности', 'Pause at the first noticeable difficulty'),
      choice('no_solution', 'Оставить список без решения', 'Leave the list unresolved'),
    ], text('Вымышленная сцена: Мира составляет список покупок, перечитывает одну строку и начинает торопиться. Список нужен только завтра.', 'Fictional scene: Mira is making a shopping list, rereads one line and starts hurrying. The list is only needed tomorrow.')),
    day('fact_assumption_cards', [
      choice('known_later', 'Факт: человек написал «посмотрю позже»', 'Fact: the person wrote “I will look later”'),
      choice('guess_dislike', 'Предположение: ему не нравится мой список', 'Assumption: they dislike my list'),
      choice('reason_unknown', 'Причина задержки неизвестна', 'The reason for the delay is unknown'),
    ], fields(['Карточка: точно известно', 'Card: what is known'], ['Карточка: предположение', 'Card: what is assumed']),
    text('Разнесите содержание сообщения и догадку по двум полям. Объяснять задержку или искать решение необязательно.', 'Put the message content and the guess in separate fields. Explaining the delay or solving it is optional.'),
    text('Можно сохранить только различие между словами сообщения и догадкой о причине.', 'You may keep only the distinction between the words in the message and a guess about the reason.'),
    fields(['Слова сообщения', 'Words in the message'], ['Что остаётся неизвестным', 'What remains unknown']), [
      choice('known_words', 'Вернуться к словам «посмотрю позже»', 'Return to the words “I will look later”'),
      choice('leave_unknown', 'Не придумывать причину', 'Leave the reason unknown'),
    ], text('Вымышленная переписка о списке покупок: «Спасибо, посмотрю позже». Карточка А: «Человек написал, что посмотрит позже». Карточка Б: «Ему не нравится мой список».', 'Fictional exchange about a shopping list: “Thanks, I will look later.” Card A: “The person said they will look later.” Card B: “They dislike my list.”')),
    day('time_boundary_phrase', [
      choice('need_time', 'Мне нужно время', 'I need time'),
      choice('reply_later', 'Я отвечу позже', 'I can reply later'),
      choice('not_today', 'Сегодня не могу', 'Not today'),
    ], fields(['Выбранная фраза', 'Chosen phrase'], ['Своя версия, если хочется', 'My own version, if wanted']),
    text('Можно выбрать готовую фразу или коротко переписать её. Произносить, объяснять или отправлять ничего не требуется.', 'Choose a ready phrase or reword it briefly. You do not need to say it, explain it or send it.'),
    text('Как сохранить фразу короткой и уважительной, не добавляя обещания, которое не хочется давать?', 'How could the phrase stay brief and respectful without adding a promise you do not want to make?'),
    fields(['Короткая версия', 'A shorter version'], ['Граница времени', 'The time boundary']), [
      choice('time_only', 'Оставить «Мне нужно время»', 'Keep “I need time”'),
      choice('today_limit', 'Оставить «Сегодня не могу»', 'Keep “Not today”'),
    ]),
    day('fictional_support_route', [
      choice('trusted_person', 'К близкому человеку за разговором', 'A trusted person for a conversation'),
      choice('professional', 'К специалисту за подходящей поддержкой', 'A professional for suitable support'),
      choice('local_service', 'К местной службе за доступными вариантами', 'A local service for available options'),
      choice('uncertain', 'Пока неясно, какая помощь доступна', 'Available help is not clear yet'),
    ], fields(['Вид помощи для героя', 'A type of help for the character'], ['Реалистичный путь к ней', 'A realistic way to access it']),
    text('Выберите вид помощи, соответствующий запросу героя. Контакты и личные сведения записывать не нужно.', 'Choose a type of support matching the character’s request. Do not record contacts or personal details.'),
    text('Отметьте, какая поддержка находится за пределами курса и что о её доступности пока неизвестно.', 'Notice which support is outside the course and what remains unknown about access.'),
    fields(['Поддержка вне курса', 'Support beyond the course'], ['Что нужно уточнить без контактов', 'What would need checking, without contacts']), [
      choice('conversation', 'Короткий разговор с доступным человеком', 'A short conversation with someone available'),
      choice('access_options', 'Узнать варианты профессиональной помощи', 'Learn about professional support options'),
    ], text('Учебный пример: после нескольких насыщенных дней Никита хочет поговорить с человеком. Можно представить доступного близкого, специалиста или местную службу; реальные имена не нужны.', 'Fictional example: after several busy days, Nikita would like to speak with someone. Consider an available trusted person, professional or local service; real names are unnecessary.')),
    day('primary_backup_support', [
      choice('anchor_rest', 'Основной: внешний ориентир; запасной: отдых', 'Main: external anchor; backup: rest'),
      choice('rest_help', 'Основной: отдых; запасной: доступная помощь', 'Main: rest; backup: available help'),
      choice('own_pair', 'Своя пара уже знакомых способов', 'My own pair of familiar options'),
      choice('open_plan', 'Пока оставить план открытым', 'Leave the plan open for now'),
    ], fields(['Один основной знакомый способ', 'One familiar main option'], ['Один запасной способ', 'One backup option']),
    text('Выбирайте из уже рассмотренных способов. Неподходящий способ можно убрать, не заменяя его сразу.', 'Choose from options already encountered. You may remove an unsuitable option without replacing it immediately.'),
    text('Что можно оставить запасным, если основной способ в какой-то день недоступен?', 'What could remain as a backup if the main option is unavailable one day?'),
    fields(['Когда основной способ недоступен', 'When the main option is unavailable'], ['Допустимый запасной выбор', 'An acceptable backup']), [
      choice('rest_backup', 'Оставить отдых запасным', 'Keep rest as a backup'),
      choice('blank_backup', 'Пока не заполнять запасной вариант', 'Leave the backup blank for now'),
    ]),
    day('gentle_return_map', [
      choice('sign_pause_rest', 'Ранний сигнал → нейтральная пауза → отдых', 'Early sign → neutral pause → rest'),
      choice('sign_pause_help', 'Ранний сигнал → нейтральная пауза → помощь', 'Early sign → neutral pause → help'),
      choice('partial_map', 'Оставить только доступную часть карты', 'Keep only the available part of the map'),
    ], fields(['Ранний сигнал', 'Early sign'], ['Нейтральная пауза', 'Neutral pause'], ['Отдых или доступная помощь', 'Rest or available help']),
    text('Соедините до трёх коротких пунктов. Карта может оставаться неполной, а чувства — прежними.', 'Connect up to three short entries. The map may stay incomplete and feelings may stay the same.'),
    text('Проверьте, есть ли в карте возможность закончить и действительно доступный путь к отдыху или помощи.', 'Check whether the map leaves room to stop and a genuinely available route to rest or help.'),
    fields(['Самая доступная часть карты', 'The most available part of the map'], ['Что пока оставить пустым', 'What to leave blank for now']), [
      choice('rest_endpoint', 'Закончить карту отдыхом', 'End the map with rest'),
      choice('help_endpoint', 'Закончить карту доступной помощью', 'End with an available support option'),
    ]),
  ]),
  AS3: Object.freeze([
    day('three_landmarks', [
      choice('photo_three', 'Три обычных ориентира на фотографии', 'Three ordinary landmarks in the photo'),
      choice('room_match', 'При желании найти три похожих предмета рядом', 'Optionally find three similar objects nearby'),
      choice('photo_only', 'Остаться только с фотографией', 'Stay with the photo only'),
    ], fields(['Первый ориентир', 'First landmark'], ['Второй ориентир', 'Second landmark'], ['Третий ориентир', 'Third landmark'], ['Похожий предмет рядом, по желанию', 'A similar nearby object, if wanted']),
    text('Выберите до трёх видимых деталей. Сопоставление с комнатой необязательно; можно остановиться после одной.', 'Choose up to three visible details. Matching them to the room is optional; you may stop after one.'),
    text('Какой ориентир проще заметить снова: на фотографии или в реальном окружении?', 'Which landmark is easier to notice again: one in the photo or one in your surroundings?'),
    fields(['Ориентир, к которому можно вернуться', 'A landmark to return to'], ['Где его легко найти', 'Where it is easy to find']), [
      choice('photo_anchor', 'Оставить деталь фотографии', 'Keep a photo detail'),
      choice('room_anchor', 'Оставить обычный предмет рядом', 'Keep an ordinary nearby object'),
    ]),
    day('continue_simplify_stop', [
      choice('continue', 'Продолжить в текущем формате', 'Continue in this format'),
      choice('simplify', 'Упростить до одного небольшого шага', 'Simplify to one small step'),
      choice('stop', 'Остановиться', 'Stop'),
    ], fields(['Формат сегодня', 'Today’s format'], ['Что можно упростить', 'What can be simplified'], ['Как закончить', 'How to finish']),
    text('Рассмотрите все три варианта как допустимые. Отметьте один на сегодня, не обещая продолжать завтра.', 'Treat all three options as valid. Choose one for today without promising to continue tomorrow.'),
    text('Какую замену вы оставили бы себе, если решение «продолжить» перестанет подходить?', 'Which alternative would you keep if continuing no longer fits?'),
    fields(['Более лёгкий формат', 'An easier format'], ['Допустимое завершение', 'An acceptable ending']), [
      choice('one_step', 'Только один небольшой шаг', 'Just one small step'),
      choice('stop_now', 'Завершить без дополнительного шага', 'Finish without another step'),
    ]),
    day('signal_and_context', [
      choice('lose_place', 'Теряется место в списке при уведомлениях', 'Losing the place in a list when notifications arrive'),
      choice('switch_tasks', 'Частое переключение между списком и сообщениями', 'Repeatedly switching between the list and messages'),
      choice('unsure', 'Пока не выбирать признак', 'Leave the sign undecided'),
    ], fields(['Один ранний сигнал', 'One early sign'], ['Ситуация, где он появился', 'The situation where it appeared']),
    text('Свяжите одну наблюдаемую деталь с обычной ситуацией из примера. Личный тяжёлый опыт не нужен.', 'Link one observable detail to the ordinary situation in the example. No distressing personal experience is needed.'),
    text('Можно сохранить описание события и признака без вывода о личности или причине реакции.', 'You may keep a description of the event and sign without conclusions about personality or causes.'),
    fields(['Нейтральное описание ситуации', 'A neutral situation description'], ['Нейтральное описание признака', 'A neutral sign description']), [
      choice('list_context', 'Контекст: список и новые уведомления', 'Context: a list and new notifications'),
      choice('observable_sign', 'Признак: потеря места в списке', 'Sign: losing the place in the list'),
    ], text('Вымышленный пример: Ира составляет список для пикника. При нескольких новых уведомлениях она чаще переключается между окнами и теряет место в списке.', 'Fictional example: Ira is making a picnic list. Several new notifications arrive; she switches windows more often and loses her place in the list.')),
    day('task_size_versions', [
      choice('small', 'Малая версия: убрать один предмет', 'Small version: put away one item'),
      choice('ordinary', 'Обычная версия: разобрать одну полку', 'Ordinary version: organise one shelf'),
      choice('too_much_reduce', 'Весь шкаф сейчас слишком много → уменьшить', 'The whole cupboard is too much now → reduce it'),
      choice('rest', 'Выбрать отдых вместо дела', 'Choose rest instead'),
    ], fields(['Маленькая версия', 'Small version'], ['Обычная версия', 'Ordinary version'], ['Слишком большая версия', 'Too-much version'], ['Посильный выбор или отдых', 'A manageable choice or rest']),
    text('Разведите три версии одного дела. Выбор меньшей версии не требует сначала пробовать большую.', 'Separate three versions of the same task. Choosing the smaller one does not require trying the larger one first.'),
    text('Что можно убрать из дела, чтобы оставить только посильный объём или отдых?', 'What could be removed from the task to keep only a manageable amount or rest?'),
    fields(['Что убрать из задачи', 'What to remove from the task'], ['На чём можно остановиться', 'Where it is okay to stop']), [
      choice('one_item', 'Закончить после одного предмета', 'Finish after one item'),
      choice('rest_instead', 'Не начинать и отдохнуть', 'Do not begin; rest instead'),
    ], text('Учебное дело: разобрать шкаф. Можно убрать один предмет, разобрать одну полку или пытаться разобрать весь шкаф сразу. Масштаб выбирает сам участник.', 'Fictional task: organise a cupboard. Possible versions are putting away one item, organising one shelf or attempting the whole cupboard at once. The participant chooses the scale.')),
    day('chair_or_colours', [
      choice('chair', 'Коротко заметить опору стула, если удобно', 'Briefly notice the chair, if comfortable'),
      choice('two_colours', 'Назвать два цвета в комнате', 'Name two colours in the room'),
      choice('external_only', 'Остаться только с внешним наблюдением', 'Use external observation only'),
    ], fields(['Выбранный способ', 'Chosen mode'], ['Опора стула или первый цвет', 'Chair support or first colour'], ['Второй цвет, если выбран внешний вариант', 'Second colour, if using the external option']),
    text('Только при желании заметьте стул; равноценный вариант — два цвета. При неудобстве смените способ или закончите.', 'Notice the chair only if wanted; two colours are an equally valid option. Switch or finish if uncomfortable.'),
    text('Какую внешнюю альтернативу можно оставить на день, когда внимание к телу не подходит?', 'Which external alternative could you keep for a day when body attention does not fit?'),
    fields(['Первый доступный цвет', 'First available colour'], ['Второй доступный цвет', 'Second available colour']), [
      choice('colours_only', 'Два цвета без внимания к телу', 'Two colours without body attention'),
      choice('chair_optional', 'Опора стула остаётся необязательной', 'Chair support stays optional'),
    ]),
    day('breath_anchor_rest', [
      choice('natural_breaths', 'До пяти естественных вдохов без изменения дыхания', 'Up to five natural breaths without changing breathing'),
      choice('external_anchor', 'Коротко посмотреть на внешний ориентир', 'Briefly notice an external anchor'),
      choice('rest', 'Отдых без упражнения', 'Rest without an exercise'),
    ], fields(['Способ практики', 'Practice mode'], ['Подходящая длительность', 'A suitable duration'], ['Как закончить раньше', 'How to stop earlier']),
    text('Не углубляйте, не задерживайте и не ускоряйте дыхание. Можно выбрать внешний ориентир или закончить до пятого вдоха.', 'Do not deepen, hold or speed up breathing. You may choose an external anchor or finish before the fifth breath.'),
    text('Оставьте способ уменьшить длительность или перейти к внешнему наблюдению без требования завершить счёт.', 'Keep a way to shorten the duration or switch to external observation without needing to finish counting.'),
    fields(['Более короткая версия', 'A shorter version'], ['Внешняя альтернатива', 'An external alternative']), [
      choice('fewer_breaths', 'Не продолжать до пяти вдохов', 'Stop before five breaths'),
      choice('look_instead', 'Вместо дыхания посмотреть на предмет', 'Notice an object instead of breathing'),
    ]),
    day('now_later_resources', [
      choice('now', 'Карточка «доступно сейчас»', 'An “available now” card'),
      choice('later', 'Карточка «возможно позже»', 'A “possibly available later” card'),
      choice('blank', 'Оставить недоступную часть пустой', 'Leave an unavailable part blank'),
    ], fields(['Поддержка сейчас', 'Support now'], ['Поддержка позже', 'Support later'], ['Что делает вариант реальным', 'What makes the option realistic']),
    text('Запишите реальные возможности в двух подписанных полях. Не нужно придумывать ресурс ради заполнения поля.', 'Write real possibilities in the two labeled fields. Do not invent a resource to fill a field.'),
    text('Проверьте, не попал ли будущий или недоступный ресурс в карточку «сейчас». Пустая карточка допустима.', 'Check whether a future or unavailable resource has slipped into the “now” card. An empty card is allowed.'),
    fields(['Что действительно доступно сейчас', 'What is genuinely available now'], ['Что зависит от условий позже', 'What depends on later conditions']), [
      choice('move_later', 'Перенести условный ресурс в «позже»', 'Move conditional support to “later”'),
      choice('keep_blank', 'Оставить карточку пустой', 'Leave a card blank'),
    ]),
    day('five_associations_word', [
      choice('colour_words', 'До пяти слов о цветах и формах', 'Up to five words about colours and shapes'),
      choice('gentle_words', 'До пяти простых ассоциаций к иллюстрации', 'Up to five simple associations with the illustration'),
      choice('one_word', 'Только одно слово-напоминание', 'Just one reminder word'),
    ], fields(['Ассоциации 1–2, по желанию', 'Associations 1–2, if wanted'], ['Ассоциации 3–5, по желанию', 'Associations 3–5, if wanted'], ['Одно слово-напоминание', 'One reminder word']),
    text('Посмотрите на нейтральную иллюстрацию. Можно записать меньше пяти слов и выбрать одно без толкования его значения.', 'Look at a neutral illustration. You may write fewer than five words and choose one without interpreting its meaning.'),
    text('Какое слово можно оставить простым напоминанием о видимой детали, без вывода о себе?', 'Which word could remain a simple reminder of a visible detail, without a conclusion about yourself?'),
    fields(['Выбранное слово', 'Chosen word'], ['Видимая деталь, с которой оно связано', 'The visible detail it relates to']), [
      choice('visible_word', 'Оставить слово о видимой детали', 'Keep a word about a visible detail'),
      choice('no_interpretation', 'Оставить ассоциации без объяснения', 'Leave associations uninterpreted'),
    ]),
    day('event_thought_reaction', [
      choice('event_request', 'Событие: просьба посмотреть список', 'Event: a request to look at a list'),
      choice('thought_now', 'Мысль: «Нужно ответить прямо сейчас»', 'Thought: “I have to answer right now”'),
      choice('pause_before_typing', 'Пауза перед торопливым ответом', 'Pause before a rushed reply'),
    ], fields(['Событие', 'Event'], ['Возникшая мысль', 'Thought'], ['Привычный ответ', 'Familiar response'], ['Место для паузы', 'A place for a pause']),
    text('Разделите слова собеседника, мысль героя и действие. Затем отметьте возможную паузу между мыслью и ответом.', 'Separate the other person’s words, the character’s thought and their action. Then locate a possible pause between thought and reply.'),
    text('Где пауза добавляет выбор, не требуя убрать возникшую мысль?', 'Where does a pause add a choice without requiring the thought to disappear?'),
    fields(['Мысль, которую можно заметить', 'A thought that can be noticed'], ['Возможная пауза перед действием', 'A possible pause before action']), [
      choice('before_reply', 'Пауза до набора ответа', 'Pause before typing'),
      choice('read_again', 'Спокойно перечитать саму просьбу', 'Read the actual request again'),
    ], text('Учебный диалог: «Посмотри, пожалуйста, список, когда будет время». Оля думает: «Нужно ответить прямо сейчас» и начинает торопливо печатать.', 'Fictional dialogue: “Please look at the list when you have time.” Olya thinks, “I have to answer right now,” and starts typing hurriedly.')),
    day('neutral_explanation', [
      choice('fact_no_reply', 'Факт: ответа пока нет', 'Fact: there is no reply yet'),
      choice('guess_displeased', 'Догадка: человеку не понравилось предложение', 'Inference: the person disliked the suggestion'),
      choice('possible_busy', 'Возможно, человек занят; причина неизвестна', 'They may be busy; the reason is unknown'),
    ], fields(['Факт из сообщения', 'Fact from the message'], ['Догадка', 'Inference'], ['Возможное нейтральное объяснение', 'A possible neutral explanation']),
    text('Сначала отделите факт от догадки. Нейтральное объяснение оставьте возможностью, а не новым доказанным фактом.', 'First separate fact from inference. Keep the neutral explanation as a possibility, not a newly proven fact.'),
    text('Какие слова помогают сохранить неопределённость: «возможно» или «пока не знаю»?', 'Which wording preserves uncertainty: “possibly” or “I do not know yet”?'),
    fields(['Нейтральная возможность', 'A neutral possibility'], ['Что пока неизвестно', 'What remains unknown']), [
      choice('possibly_busy', 'Возможно, человек занят', 'Possibly the person is busy'),
      choice('unknown_reason', 'Пока не знаю причину', 'I do not know the reason yet'),
    ], text('Вымышленная переписка: Сэм отправил предложение о времени прогулки. Через полчаса ответа нет. В истории не сообщается, почему.', 'Fictional exchange: Sam sent a suggested time for a walk. Half an hour later there is no reply. The story gives no reason.')),
    day('think_boundary_draft', [
      choice('need_think', 'Мне нужно подумать', 'I need to think about it'),
      choice('think_later', 'Я подумаю и отвечу, когда смогу', 'I will think and reply when I can'),
      choice('own_words', 'Записать свою короткую версию', 'Write my own short version'),
    ], fields(['Фраза из примера', 'Phrase from the example'], ['Моя версия, по желанию', 'My version, if wanted']),
    text('Выберите готовую фразу или замените слова своими. Репетиция голосом и реальный ответ не нужны.', 'Choose a ready phrase or use your own words. Speaking aloud and replying in real life are unnecessary.'),
    text('Оставьте формулировку, которая даёт время на выбор и не создаёт обязательства согласиться.', 'Keep wording that allows time to choose without creating an obligation to agree.'),
    fields(['Что даёт время подумать', 'What allows time to think'], ['Короткая версия без обещания', 'A short version without a promise']), [
      choice('think_only', 'Оставить «Мне нужно подумать»', 'Keep “I need to think about it”'),
      choice('own_brief', 'Оставить свою короткую фразу', 'Keep my own brief phrase'),
    ], text('Безопасный вымышленный пример: знакомый предлагает вместе выбрать книгу на выходных. Ответ не срочный, и можно сначала подумать.', 'Safe fictional scene: an acquaintance suggests choosing a book together at the weekend. The reply is not urgent, so there is time to think.')),
    day('human_support_request', [
      choice('short_talk', 'Попросить о коротком разговоре', 'Ask for a short conversation'),
      choice('one_task', 'Попросить помочь с одним делом', 'Ask for help with one task'),
      choice('professional', 'Выбрать профессиональную поддержку', 'Choose professional support'),
      choice('none_available', 'Пока нет доступного варианта', 'No available option yet'),
    ], fields(['Один вид человеческой поддержки', 'One form of human support'], ['Необязательная фраза просьбы', 'An optional request phrase']),
    text('Можно записать вид помощи без имени человека. Черновик просьбы не отправляется и может остаться пустым.', 'You may name a type of help without naming a person. The draft request is not sent and may stay blank.'),
    text('Достаточно ли конкретна просьба и можно ли оставить её без отправки?', 'Is the request specific enough, and can you leave it unsent?'),
    fields(['Небольшая конкретная просьба', 'A small specific request'], ['Что пока можно не делать', 'What can remain undone for now']), [
      choice('talk_draft', 'Черновик просьбы о разговоре', 'A draft request for a conversation'),
      choice('task_draft', 'Черновик просьбы об одном деле', 'A draft request for one task'),
    ]),
    day('two_context_toolkit', [
      choice('busy_pause', 'Много обычных дел → знакомая пауза', 'Many routine tasks → a familiar pause'),
      choice('tired_rest', 'Мало сил → допустимый отдых', 'Little energy → acceptable rest'),
      choice('anchor_backup', 'Запасной вариант → внешний ориентир', 'Backup → an external anchor'),
      choice('own_options', 'Свои знакомые допустимые способы', 'My own familiar acceptable options'),
    ], fields(['Первая обычная ситуация', 'First everyday situation'], ['Первый знакомый способ', 'First familiar technique'], ['Вторая ситуация и второй способ', 'Second situation and second technique'], ['Один запасной вариант', 'One backup']),
    text('Сопоставьте два знакомых способа с разными обычными ситуациями. Добавляйте запасной только если он действительно подходит.', 'Match two familiar techniques to different ordinary situations. Add a backup only if it genuinely fits.'),
    text('Какой способ подходит конкретной ситуации и чем его можно заменить без требования справиться самостоятельно?', 'Which technique fits its situation, and what could replace it without requiring you to cope alone?'),
    fields(['Связь ситуации и способа', 'The situation–technique link'], ['Реалистичная замена', 'A realistic alternative']), [
      choice('different_uses', 'Оставить разные способы для разных ситуаций', 'Keep different techniques for different situations'),
      choice('backup_rest', 'Оставить отдых запасным', 'Keep rest as a backup'),
    ]),
    day('tried_options_balance_map', [
      choice('tried_anchor', 'Включить реально опробованный внешний ориентир', 'Include an external anchor actually tried'),
      choice('tried_pause', 'Включить реально опробованную паузу', 'Include a pause actually tried'),
      choice('leave_untried', 'Не включать пока не опробованные способы', 'Leave out options not yet tried'),
    ], fields(['Сигнал', 'Signal'], ['Опробованная пауза', 'A pause actually tried'], ['Опробованная поддержка', 'Support actually tried'], ['Возможный выбор', 'A possible choice']),
    text('Соедините сигнал, паузу, поддержку и выбор. Используйте только действительно опробованные варианты; пустое звено допустимо.', 'Connect signal, pause, support and choice. Use only options actually tried; a blank link is acceptable.'),
    text('Что в карте основано на реальном опыте, а что лучше пока оставить незаполненным?', 'Which part of the map comes from actual experience, and which part is better left blank for now?'),
    fields(['Действительно опробованный вариант', 'An option actually tried'], ['Часть карты, оставленная открытой', 'A part of the map left open']), [
      choice('keep_tried', 'Оставить реально опробованный способ', 'Keep an option actually tried'),
      choice('remove_untried', 'Убрать пока не опробованный способ', 'Remove an option not yet tried'),
    ]),
  ]),
  AS4: Object.freeze([
    day('object_shape_colour', [
      choice('object', 'Предмет на изображении комнаты', 'An object in the room image'),
      choice('shape', 'Простая видимая форма', 'A simple visible shape'),
      choice('colour', 'Один цвет', 'One colour'),
    ], fields(['Предмет', 'Object'], ['Форма', 'Shape'], ['Цвет', 'Colour'], ['Удобный ориентир', 'A workable anchor']),
    text('Найдите до трёх внешних признаков вокруг себя или на фотографии. Выберите удобный ориентир, не добиваясь особой концентрации.', 'Find up to three visible features around you or in the photo. Choose an easy anchor without forcing concentration.'),
    text('Какая категория проще для повторного выбора: предмет, форма или цвет?', 'Which category is easier to use again: object, shape or colour?'),
    fields(['Удобная категория', 'An easy category'], ['Один пример вокруг или на фото', 'One example nearby or in the photo']), [
      choice('object_again', 'Вернуться к предмету', 'Return to the object'),
      choice('shape_colour', 'Оставить форму или цвет', 'Keep a shape or colour'),
    ]),
    day('adapt_learning_plan', [
      choice('begin', 'Начать с одной строки', 'Begin with one line'),
      choice('adapt', 'Продолжить только чтением', 'Continue by reading only'),
      choice('stop', 'Остановить занятие', 'Stop the session'),
    ], fields(['Предпочтительный вариант', 'Preferred option'], ['Что можно изменить в плане', 'What can change in the plan']),
    text('Выберите вариант для героя и при желании оставьте его как собственную подсказку. Менять решение можно сразу.', 'Choose an option for the character and, if wanted, keep it as a reminder for yourself. You may change the choice immediately.'),
    text('Какой вариант сохраняет право изменить план без необходимости сначала закончить задание?', 'Which option preserves permission to change plans without finishing the task first?'),
    fields(['Предпочтительная подсказка', 'A preferred reminder'], ['Запасной формат', 'An alternative format']), [
      choice('reading_only', 'Оставить только чтение', 'Keep reading only'),
      choice('stop_permission', 'Оставить право остановиться', 'Keep permission to stop'),
    ], text('Учебная сцена: Вера открыла небольшое занятие с текстом и картинкой. Она может начать, только прочитать текст или закрыть занятие.', 'Learning scene: Vera opened a short lesson with text and a picture. She can begin, just read the text or close the lesson.')),
    day('everyday_early_signs', [
      choice('tabs', 'Переключение между вкладками всё чаще', 'Switching between tabs more often'),
      choice('rereading', 'Повторное чтение одной строки', 'Rereading the same line'),
      choice('rushing', 'Спешка при обычном несрочном деле', 'Rushing through an ordinary non-urgent task'),
    ], fields(['Выбранная бытовая ситуация', 'Chosen everyday situation'], ['Первый заметный признак', 'First noticeable sign'], ['Что можно уменьшить заранее', 'What could be reduced early']),
    text('Выберите одну сцену и один наблюдаемый ранний признак. Не нужно дожидаться сильной перегрузки или оценивать её в баллах.', 'Choose one scene and one observable early sign. Do not wait for severe overload or rate it with a score.'),
    text('Как оставить описание раннего признака достаточно конкретным, чтобы не превращать его в ярлык?', 'How can the early sign stay specific without turning into a label?'),
    fields(['Наблюдаемая деталь', 'An observable detail'], ['Ранняя возможность уменьшить нагрузку', 'An early chance to reduce demands']), [
      choice('one_tab', 'Оставить одну вкладку', 'Keep one tab open'),
      choice('pause_line', 'Сделать паузу после строки', 'Pause after the line'),
    ], text('Три вымышленные сцены: при выборе рецепта человек всё чаще меняет вкладки; при составлении списка перечитывает строку; при раскладывании бумаги начинает спешить, хотя спешка не нужна.', 'Three fictional scenes: while choosing a recipe, someone switches tabs more often; while making a list, they reread a line; while sorting paper, they begin rushing even though it is not urgent.')),
    day('microbreak_placement', [
      choice('before', 'Микро-пауза перед обычным делом', 'A micro-break before a routine task'),
      choice('after', 'Микро-пауза после дела', 'A micro-break after a task'),
      choice('between', 'Микро-пауза между двумя делами', 'A micro-break between two tasks'),
    ], fields(['Обычное дело', 'A routine task'], ['Перед, после или между', 'Before, after or between'], ['Необязательная микро-пауза', 'An optional micro-break']),
    text('Выберите естественное место для короткого отдыха. План можно не выполнять и изменить без объяснения.', 'Choose a natural place for a short rest. You may leave the plan untried or change it without explanation.'),
    text('В каком месте пауза реально помещается в обычный день, без обязательного расписания?', 'Where could the break realistically fit in an ordinary day without a compulsory schedule?'),
    fields(['Удобный переход между делами', 'A convenient transition between tasks'], ['Что упростить, если пауза не помещается', 'What to simplify if there is no room for a break']), [
      choice('before_start', 'До начала следующего дела', 'Before starting the next task'),
      choice('between_tasks', 'В переходе между делами', 'During the transition between tasks'),
    ]),
    day('shoulders_floor_room', [
      choice('shoulders', 'Если удобно, немного опустить плечи', 'If comfortable, let the shoulders lower a little'),
      choice('floor', 'Если удобно, заметить поверхность под стопами', 'If comfortable, notice the surface under the feet'),
      choice('look_around', 'Просто посмотреть вокруг', 'Simply look around'),
    ], fields(['Добровольный способ', 'A voluntary option'], ['Внешняя альтернатива', 'An external alternative']),
    text('Не заставляйте себя двигаться или усиливать ощущения. При неудобстве сразу выберите внешнее наблюдение или остановку.', 'Do not force movement or intensify sensations. If uncomfortable, choose external observation or stop.'),
    text('Какой способ оставляет достаточно свободы не двигаться и не наблюдать тело?', 'Which option leaves enough freedom not to move or observe the body?'),
    fields(['Что можно не делать', 'What I do not need to do'], ['Видимая деталь вместо телесной практики', 'A visible detail instead of body practice']), [
      choice('external_only', 'В этот раз только окружающее', 'Only the surroundings this time'),
      choice('movement_optional', 'Оставить движение необязательным', 'Keep movement optional'),
    ]),
    day('short_long_compare', [
      choice('short', 'Короткая версия: одна деталь на несколько секунд', 'Short version: one detail for a few seconds'),
      choice('long', 'Длиннее: до тридцати секунд с той же деталью', 'Longer version: up to thirty seconds with the same detail'),
      choice('not_now', 'Не сейчас', 'Not now'),
    ], fields(['Короткая версия', 'Short version'], ['Более длинная версия', 'Longer version'], ['Выбор сегодня', 'Today’s choice']),
    text('Сравните версии одной практики: смотреть на обычную деталь. Пробовать обе не требуется; в длинной версии тоже можно закончить сразу.', 'Compare versions of the same practice: looking at an ordinary detail. You need not try both; the longer version may also end immediately.'),
    text('Что можно уменьшить в выбранной версии, если её длительность перестанет подходить?', 'What could be reduced if the chosen duration stops fitting?'),
    fields(['Минимальная удобная версия', 'The smallest workable version'], ['Когда можно закончить', 'When I may finish']), [
      choice('few_seconds', 'Оставить несколько секунд', 'Keep just a few seconds'),
      choice('no_practice', 'Оставить «не сейчас»', 'Keep “not now”'),
    ]),
    day('three_real_resources', [
      choice('rest_object', 'Отдых или доступный предмет', 'Rest or an available object'),
      choice('contact', 'Доступный человеческий контакт', 'Available human contact'),
      choice('music_walk', 'Музыка или прогулка, если подходят', 'Music or a walk, if suitable'),
      choice('own_resource', 'Свой реальный ресурс', 'My own realistic support'),
    ], fields(['Первый реальный ресурс', 'First realistic support'], ['Второй реальный ресурс', 'Second realistic support'], ['Третий реальный ресурс', 'Third realistic support']),
    text('Выберите до трёх доступных вариантов. Можно оставить меньше; прогулка, музыка и общение не обязательны.', 'Choose up to three available options. Fewer are fine; walking, music and conversation are not required.'),
    text('Какие варианты действительно доступны, а какой пока лучше убрать из списка?', 'Which options are genuinely available, and which would be better removed for now?'),
    fields(['Самый доступный ресурс', 'The most available support'], ['Ресурс, который пока можно исключить', 'A support that can be left out for now']), [
      choice('available_first', 'Оставить самый доступный первым', 'Put the most available option first'),
      choice('fewer_resources', 'Оставить меньше трёх ресурсов', 'Keep fewer than three supports'),
    ]),
    day('place_or_five_words', [
      choice('calm_place', 'Спокойное место до минуты, если приятно', 'A calm place for up to a minute, if enjoyable'),
      choice('photo_words', 'До пяти слов о приятной фотографии', 'Up to five words about a pleasant photo'),
      choice('visible_detail', 'Только одна видимая деталь без воображения', 'Just one visible detail without imagery'),
    ], fields(['Место или фотография', 'Place or photograph'], ['Слова 1–2, по желанию', 'Words 1–2, if wanted'], ['Слова 3–5, по желанию', 'Words 3–5, if wanted']),
    text('Образ можно закончить раньше минуты. Для фотографии достаточно внешних качеств, без интерпретации ассоциаций.', 'Imagery may end before a minute. Visible qualities are enough for the photo; associations do not need interpretation.'),
    text('Какую внешнюю замену оставить, если воображение в другой день не подойдёт?', 'Which external alternative could remain available if imagery does not fit on another day?'),
    fields(['Слово о видимой детали', 'A word about a visible detail'], ['Внешняя замена образу', 'An external alternative to imagery']), [
      choice('photo_instead', 'Вернуться к фотографии', 'Return to the photograph'),
      choice('one_word', 'Оставить одно описательное слово', 'Keep one descriptive word'),
    ]),
    day('reply_or_pause_compare', [
      choice('immediate', 'Сразу согласиться на необязательное дело', 'Agree to the optional task immediately'),
      choice('brief_pause', 'Сначала сделать короткую паузу', 'Take a brief pause first'),
      choice('consider_time', 'После паузы проверить своё время', 'After pausing, check available time'),
    ], fields(['Немедленный ответ', 'Immediate response'], ['Ответ с паузой', 'Response with a pause'], ['В чём разница для выбора', 'What differs for choice']),
    text('Сравните два ответа без оценки «правильно» или «неправильно». Пауза может дать время проверить возможность, не обещая изменить чувства.', 'Compare the two responses without grading either. A pause may allow time to check availability without promising a change in feelings.'),
    text('Какую дополнительную информацию можно заметить за паузу, прежде чем соглашаться?', 'What additional information could be noticed during a pause before agreeing?'),
    fields(['Что стоит проверить', 'What could be checked'], ['Короткая фраза для паузы', 'A short pause phrase']), [
      choice('check_capacity', 'Проверить время и объём дела', 'Check time and task size'),
      choice('pause_phrase', 'Сказать в черновике «Сначала посмотрю»', 'Draft “Let me check first”'),
    ], text('Безопасный учебный диалог: «Поможешь сегодня выбрать фотографии для альбома?» Герой может сразу сказать «да» или сначала сделать паузу и посмотреть свои планы.', 'Safe fictional dialogue: “Could you help choose album photos today?” The character may say yes immediately or pause and check their plans first.')),
    day('facts_explanations_steps', [
      choice('fact_changed', 'Факт: встречу предлагают перенести на 16:00', 'Fact: a move to 4 p.m. has been proposed'),
      choice('possible_schedule', 'Возможность: у человека изменились планы', 'Possibility: the person’s plans changed'),
      choice('neutral_check', 'Нейтральный шаг: проверить своё расписание', 'Neutral step: check my own schedule'),
    ], fields(['Факты', 'Facts'], ['Возможные объяснения', 'Possible explanations'], ['Следующие нейтральные шаги', 'Neutral next steps'], ['Один выбранный вариант', 'One chosen option']),
    text('Запишите примеры в трёх подписанных полях. Возможное объяснение не становится фактом; следующий шаг можно только наметить.', 'Write the examples in the three labeled fields. A possible explanation does not become a fact; the next step may remain a plan.'),
    text('Можно ли выбрать нейтральный шаг, пока причина переноса остаётся неизвестной?', 'Could you choose a neutral next step while the reason for the change remains unknown?'),
    fields(['Что пока неизвестно', 'What remains unknown'], ['Шаг без необходимости знать причину', 'A step that does not require knowing the reason']), [
      choice('check_schedule', 'Проверить, подходит ли время', 'Check whether the time fits'),
      choice('draft_question', 'Набросать спокойный уточняющий вопрос', 'Draft a calm clarifying question'),
    ], text('Вымышленное сообщение: «Можем встретиться в 16:00 вместо 15:00?» Карточки: «Предложено 16:00», «Возможно, изменились планы», «Проверить своё расписание». Причина не указана.', 'Fictional message: “Could we meet at 4 p.m. instead of 3 p.m.?” Cards: “4 p.m. was proposed,” “Their plans may have changed,” and “Check my schedule.” No reason is given.')),
    day('time_workload_boundary', [
      choice('time_limit', 'Сегодня у меня есть десять минут', 'I have ten minutes available today'),
      choice('one_part', 'Могу помочь только с одной частью', 'I can help with one part only'),
      choice('not_available', 'Сегодня не смогу взять дополнительное дело', 'I cannot take on an extra task today'),
    ], fields(['Что ограничиваю: время или нагрузку', 'What I am limiting: time or workload'], ['Короткая уважительная фраза', 'A short respectful phrase'], ['Своя более точная версия, по желанию', 'A more accurate version, if wanted']),
    text('Выберите только правдивое для вас ограничение или используйте учебную фразу. Черновик остаётся личным; отправлять его не нужно.', 'Choose a limit that is true for you or use a practice phrase. The draft stays private; it does not need to be sent.'),
    text('Проверьте, обозначена ли конкретная граница без лишнего оправдания и неподтверждённого обещания.', 'Check whether the draft states a clear limit without unnecessary justification or an unconfirmed promise.'),
    fields(['Конкретное ограничение', 'The specific limit'], ['Короткая окончательная формулировка', 'A short final wording']), [
      choice('limit_time', 'Оставить границу времени', 'Keep a time boundary'),
      choice('limit_scope', 'Оставить границу объёма дела', 'Keep a task-size boundary'),
    ]),
    day('help_or_delay_draft', [
      choice('help_part', 'Поможешь выбрать одну фотографию?', 'Could you help choose one photo?'),
      choice('delay_task', 'Можно вернуться к альбому завтра?', 'Could we return to the album tomorrow?'),
      choice('smaller_request', 'Давай сегодня выберем только одну страницу', 'Could we choose just one page today?'),
    ], fields(['Что нужно герою: помощь или перенос', 'What the character needs: help or a delay'], ['Необязательный черновик просьбы', 'An optional draft request']),
    text('Выберите просьбу, которая уменьшает нагрузку в этой сцене. Ничего отправлять или делать в реальности не требуется.', 'Choose a request that reduces demands in this scene. Nothing needs to be sent or acted on in real life.'),
    text('Какая просьба оставляет другому человеку возможность ответить, а герою — не завершать всё сегодня?', 'Which request leaves the other person room to answer and the character room not to finish everything today?'),
    fields(['Небольшая просьба о помощи', 'A small request for help'], ['Вариант переноса', 'A delay option']), [
      choice('one_photo_help', 'Просьба об одной фотографии', 'A request about one photo'),
      choice('tomorrow_option', 'Предложение вернуться завтра', 'An option to return tomorrow'),
    ], text('Вымышленная ситуация: Дима с другом готовит необязательный фотоальбом и устал выбирать снимки. Альбом не нужен сегодня; можно попросить о помощи или перенести дело.', 'Fictional situation: Dima and a friend are making an optional photo album, and Dima is tired of choosing pictures. The album is not needed today; asking for help or delaying is possible.')),
    day('optional_everyday_trial', [
      choice('between_tasks', 'Пауза между двумя небольшими делами', 'A pause between two small tasks'),
      choice('routine_reply', 'Время подумать перед обычным ответом', 'Time to think before a routine reply'),
      choice('plan_only', 'Только план, без выполнения', 'A plan only, without trying it'),
    ], fields(['Одна небольшая безопасная ситуация', 'One small safe situation'], ['Знакомый навык для неё', 'A familiar skill for it'], ['План или добровольная проба', 'Plan or optional trial']),
    text('Выберите обычную ситуацию без повышенного риска. Достаточно наметить знакомый навык; проверять себя действием не нужно.', 'Choose an ordinary low-risk situation. Planning a familiar skill is enough; there is no need to test yourself by acting.'),
    text('Остаётся ли проба добровольной, и как можно упростить её до одного плана?', 'Does the trial remain voluntary, and how could it be reduced to planning only?'),
    fields(['Что остаётся добровольным', 'What remains voluntary'], ['План без выполнения', 'A plan without carrying it out']), [
      choice('keep_plan', 'Оставить только план', 'Keep the plan only'),
      choice('smaller_scene', 'Выбрать ещё меньшую ситуацию', 'Choose an even smaller situation'),
    ]),
    day('resilience_five_link_map', [
      choice('pause_resource', 'После сигнала добавить паузу и реальный ресурс', 'After the sign, add a pause and a real support'),
      choice('choice_backup', 'Добавить посильный выбор и план Б', 'Add a manageable choice and a backup'),
      choice('partial', 'Оставить только подходящие звенья', 'Keep only the links that fit'),
    ], fields(['Сигнал', 'Signal'], ['Пауза', 'Pause'], ['Ресурс', 'Support'], ['Выбор', 'Choice'], ['План Б', 'Backup']),
    text('Соберите пять коротких звеньев для небольшой обычной нагрузки. Неподходящие части можно оставить пустыми.', 'Build five short links for a small routine demand. Unsuitable parts may stay blank.'),
    text('Что в плане Б доступно, если первый ресурс или выбранное действие не подходят?', 'What in the backup remains available if the first support or chosen action does not fit?'),
    fields(['Недоступный вариант, который можно заменить', 'An unavailable option that can be replaced'], ['Доступный план Б', 'An available backup']), [
      choice('rest_backup', 'В плане Б оставить отдых', 'Keep rest in the backup'),
      choice('help_backup', 'В плане Б оставить доступную помощь', 'Keep available help in the backup'),
    ]),
  ]),
  AS5: Object.freeze([
    day('manageable_day_qualities', [
      choice('objects', 'Обычные доступные предметы', 'Ordinary available objects'),
      choice('relationships', 'Подходящий контакт с людьми', 'A suitable amount of contact'),
      choice('conditions', 'Условия с местом для паузы', 'Conditions with room for a pause'),
    ], fields(['Первая примета обычного посильного дня', 'First quality of an ordinary manageable day'], ['Вторая примета', 'Second quality'], ['Третья примета', 'Third quality']),
    text('Назовите до трёх конкретных примет, а не идеальное настроение. Можно оставить одну или ни одной.', 'Name up to three concrete qualities rather than an ideal mood. One or none is acceptable.'),
    text('Какая примета реалистична даже в неидеальный день?', 'Which quality is realistic even on an imperfect day?'),
    fields(['Одна реалистичная примета', 'One realistic quality'], ['Что не обязано быть идеальным', 'What does not have to be perfect']), [
      choice('one_condition', 'Оставить одно доступное условие', 'Keep one available condition'),
      choice('ordinary_object', 'Оставить обычный предмет-напоминание', 'Keep an ordinary reminder object'),
    ]),
    day('do_delay_cancel', [
      choice('do_one', 'Сейчас разобрать один снимок', 'Sort one photo now'),
      choice('delay', 'Отложить разбор снимков', 'Delay sorting the photos'),
      choice('cancel', 'Отменить необязательный разбор', 'Cancel the optional sorting'),
    ], fields(['Необязательное дело', 'An optional task'], ['Выполнить, отложить или отменить', 'Do, delay or cancel'], ['Нейтральная фраза о выборе', 'A neutral phrase about the choice']),
    text('Рассмотрите все три решения без самообвинения. Отмена необязательного дела не требует замены другим делом.', 'Consider all three choices without self-blame. Cancelling an optional task does not require replacing it with another task.'),
    text('Как описать решение простыми словами, без оценки себя?', 'How could the choice be described simply without judging yourself?'),
    fields(['Мой выбор в учебной сцене', 'My choice in the fictional scene'], ['Фраза без самооценки', 'Wording without self-judgment']), [
      choice('later_neutral', 'Сегодня оставлю это на потом', 'I will leave this for later today'),
      choice('cancel_neutral', 'Этот необязательный разбор можно отменить', 'This optional sorting can be cancelled'),
    ], text('Учебная сцена: на вечер запланирован необязательный разбор фотографий. Срока нет. Можно разобрать один снимок, перенести дело или отказаться от него.', 'Fictional scene: optional photo sorting was planned for the evening. There is no deadline. One photo can be sorted, the task postponed or the plan dropped.')),
    day('two_early_signs', [
      choice('reread', 'Перечитываю одну строку несколько раз', 'Rereading one line several times'),
      choice('switching', 'Чаще переключаюсь между небольшими делами', 'Switching between small tasks more often'),
      choice('fictional_only', 'Оставить оба сигнала вымышленному герою', 'Keep both signs in a fictional example'),
    ], fields(['Первая обычная ситуация и ранний сигнал', 'First ordinary situation and early sign'], ['Вторая обычная ситуация и ранний сигнал', 'Second ordinary situation and early sign']),
    text('Назовите до двух наблюдаемых признаков из обычных или вымышленных сцен. Предсказывать будущее состояние не нужно.', 'Name up to two observable signs from ordinary or fictional scenes. You do not need to predict a future state.'),
    text('Можно ли описать оба сигнала наблюдаемыми словами, без диагноза и без возвращения к тяжёлому опыту?', 'Can both signs be described in observable words, without diagnosis or returning to distressing experiences?'),
    fields(['Первый признак простыми словами', 'First sign in plain words'], ['Второй признак простыми словами', 'Second sign in plain words']), [
      choice('reading_sign', 'Оставить пример с перечитыванием', 'Keep the rereading example'),
      choice('switching_sign', 'Оставить пример с переключением', 'Keep the switching example'),
    ], text('Можно взять вымышленные сцены: Ася перечитывает строку списка во время обычных сборов; Рома всё чаще переключается между двумя несрочными домашними делами.', 'You may use fictional scenes: Asya rereads a list item while getting ready; Roma switches more often between two non-urgent household tasks.')),
    day('rest_before_busy_day', [
      choice('quiet_before', 'Короткий тихий промежуток до дел', 'A short quiet interval before tasks'),
      choice('reduce_extra', 'Убрать одно необязательное дело ради отдыха', 'Remove one optional task to make room for rest'),
      choice('backup_shorter', 'Запасной вариант: более короткий отдых', 'Backup: a shorter rest'),
    ], fields(['Реальная возможность отдыха заранее', 'A realistic rest opportunity beforehand'], ['Условие, от которого зависит план', 'A condition the plan depends on'], ['Запасной вариант при изменениях', 'A backup if plans change']),
    text('Планируйте только доступный отдых перед насыщенным днём. Если свободного промежутка нет, можно отметить это без вины.', 'Plan only rest that is realistically available before a busy day. If there is no free interval, you may note that without blame.'),
    text('Какой меньший вариант остаётся возможным, если первый план изменится?', 'Which smaller option remains possible if the first plan changes?'),
    fields(['Что может измениться', 'What may change'], ['Доступная замена отдыху по плану', 'An available alternative to the planned rest']), [
      choice('shorter_rest', 'Оставить более короткий промежуток', 'Keep a shorter interval'),
      choice('reduce_optional', 'Убрать необязательное дело', 'Remove an optional task'),
    ]),
    day('thirty_second_sensory_choice', [
      choice('colour', 'До тридцати секунд замечать один цвет', 'Notice one colour for up to thirty seconds'),
      choice('outline', 'До тридцати секунд смотреть на контур предмета', 'Notice an object’s outline for up to thirty seconds'),
      choice('ordinary_sound', 'Замечать нейтральный звук, если удобно', 'Notice an ordinary sound, if comfortable'),
      choice('not_today', 'Сегодня не подходит', 'Not suitable today'),
    ], fields(['Нейтральный сенсорный ориентир', 'A neutral sensory anchor'], ['Подходит ли сегодня', 'Whether it suits today'], ['Как закончить раньше', 'How to finish earlier']),
    text('Выберите один нейтральный внешний признак. Тридцать секунд — верхняя граница; закрывать глаза и менять дыхание не нужно.', 'Choose one neutral external feature. Thirty seconds is an upper limit; there is no need to close your eyes or change breathing.'),
    text('Оставьте честный выбор о пригодности практики сегодня, даже если это «не подходит».', 'Keep an honest choice about whether the practice fits today, including “not suitable.”'),
    fields(['Что было допустимо или не подошло', 'What was workable or did not fit'], ['Другой внешний вариант, по желанию', 'Another external option, if wanted']), [
      choice('visual_instead', 'Вместо звука выбрать видимую деталь', 'Choose a visible detail instead of sound'),
      choice('no_retry', 'Не повторять сегодня', 'Do not retry today'),
    ]),
    day('three_ways_slow_down', [
      choice('pause_list', 'Сделать паузу в списке', 'Pause the list'),
      choice('smaller_list', 'Оставить в списке одну нужную часть', 'Keep one needed part of the list'),
      choice('later', 'Вернуться к списку позже', 'Return to the list later'),
    ], fields(['Первый допустимый способ замедлиться', 'First acceptable way to slow down'], ['Второй способ', 'Second way'], ['Третий способ', 'Third way'], ['Самый естественный вариант', 'The easiest option']),
    text('Рассмотрите паузу, уменьшение и перенос. Выберите наиболее естественный вариант; оправдывать отдых не требуется.', 'Consider pausing, reducing and postponing. Choose the easiest option; rest does not need justification.'),
    text('Как сформулировать выбранное замедление без требования сначала закончить всё дело?', 'How could the chosen slowdown be stated without requiring the whole task to be finished first?'),
    fields(['Выбранное замедление', 'Chosen way to slow down'], ['Что может остаться незавершённым', 'What may remain unfinished']), [
      choice('pause_unfinished', 'Остановиться с незавершённым списком', 'Pause with the list unfinished'),
      choice('smaller_scope', 'Оставить только нужную часть', 'Keep only the needed part'),
    ], text('Нейтральная вымышленная сцена: Лена составляет необязательный список книг для чтения и замечает спешку. Список можно прервать, сократить или продолжить в другой день.', 'Neutral fictional scene: Lena is making an optional reading list and notices herself hurrying. The list can be paused, shortened or continued another day.')),
    day('daily_human_backup', [
      choice('daily', 'Повседневный доступный ресурс', 'An available everyday support'),
      choice('human', 'Реальная человеческая поддержка', 'Real human support'),
      choice('backup', 'Доступный запасной вариант', 'An available backup'),
      choice('blank_category', 'Оставить категорию пустой', 'Leave a category blank'),
    ], fields(['Повседневный ресурс', 'Everyday support'], ['Человеческая поддержка, без имён', 'Human support, without names'], ['Запасной вариант', 'Backup support']),
    text('Заполняйте только категории с реальными возможностями. Не записывайте контакты и не придумывайте отсутствующую поддержку.', 'Fill only categories with real possibilities. Do not record contact details or invent unavailable support.'),
    text('Какая категория уже наполнена реальной возможностью, а какая может пока остаться пустой?', 'Which category already contains a real possibility, and which may stay blank for now?'),
    fields(['Доступная категория и ресурс', 'An available category and support'], ['Категория, оставленная открытой', 'A category left open']), [
      choice('real_backup', 'Оставить реально доступный резерв', 'Keep a genuinely available backup'),
      choice('honest_blank', 'Сохранить честное пустое место', 'Keep an honest blank'),
    ]),
    day('recovery_associations_object', [
      choice('picture_words', 'До пяти ассоциаций к спокойной картинке', 'Up to five associations with a calm picture'),
      choice('rest_object', 'Обычный предмет, напоминающий об отдыхе', 'An ordinary object that reminds me of rest'),
      choice('one_detail', 'Одна видимая деталь вместо ассоциаций', 'One visible detail instead of associations'),
    ], fields(['Картинка или предмет', 'Picture or object'], ['Ассоциации 1–2, по желанию', 'Associations 1–2, if wanted'], ['Ассоциации 3–5, по желанию', 'Associations 3–5, if wanted']),
    text('Можно записать меньше пяти слов или выбрать предмет. Ассоциации не оцениваются и не раскрывают скрытый смысл.', 'You may write fewer than five words or choose an object. Associations are not graded and do not reveal hidden meaning.'),
    text('Какое простое напоминание об отдыхе можно оставить без необходимости создавать образ?', 'Which simple rest reminder could remain without needing to create a mental image?'),
    fields(['Предмет или одно слово', 'An object or one word'], ['Где напоминание доступно', 'Where the reminder is available']), [
      choice('object_reminder', 'Оставить предмет-напоминание', 'Keep a reminder object'),
      choice('word_reminder', 'Оставить одно слово из описания', 'Keep one descriptive word'),
    ]),
    day('thought_two_responses', [
      choice('thought_must', 'Мысль: «Нужно всё решить сразу»', 'Thought: “I must settle everything now”'),
      choice('response_pause', 'Первый ответ: взять время подумать', 'First response: take time to think'),
      choice('response_smaller', 'Второй ответ: предложить одну маленькую часть', 'Second response: suggest one small part'),
    ], fields(['Привычная мысль героя', 'The character’s familiar thought'], ['Первый нефорсированный ответ', 'First unforced response'], ['Второй нефорсированный ответ', 'Second unforced response']),
    text('Отделите мысль от требования действовать. Можно оставить два возможных ответа без выбора одного из них.', 'Separate the thought from a requirement to act. You may keep two possible responses without choosing between them.'),
    text('Какой ответ сохраняет время, а какой уменьшает объём? Оба могут остаться только вариантами.', 'Which response preserves time, and which reduces scope? Both may remain possibilities only.'),
    fields(['Ответ, дающий время', 'A response that allows time'], ['Ответ, уменьшающий объём', 'A response that reduces scope']), [
      choice('time_response', 'Мне нужно немного подумать', 'I need a little time to think'),
      choice('small_response', 'Могу пока выбрать одну часть', 'I can choose one part for now'),
    ], text('Вымышленный бытовой пример: друг предлагает выбрать маршрут прогулки и место для чая. Костя думает: «Нужно всё решить сразу». Решение может подождать.', 'Fictional everyday example: a friend suggests choosing a walking route and a place for tea. Kostya thinks, “I must settle everything now.” The decision can wait.')),
    day('fact_interpretation_values', [
      choice('fact_invitation', 'Факт: предложено встретиться завтра', 'Fact: meeting tomorrow was proposed'),
      choice('guess_must', 'Предположение: нужно обязательно согласиться', 'Interpretation: I must agree'),
      choice('value_rest', 'Если важен отдых: предложить другое время', 'If rest matters: suggest another time'),
      choice('value_contact', 'Если важен контакт: рассмотреть короткую встречу', 'If connection matters: consider a short meeting'),
    ], fields(['Факт', 'Fact'], ['Предположение', 'Interpretation'], ['Важная для меня ценность, по желанию', 'A value that matters to me, if wanted'], ['Подходящий ценности вариант', 'An option consistent with that value']),
    text('Разделите факт и интерпретацию. Ценность выбираете вы; ни отдых, ни контакт не являются обязательным ответом.', 'Separate fact from interpretation. You choose the value; neither rest nor connection is a required answer.'),
    text('Подходит ли выбранный вариант вашей ценности и реальным возможностям, без обязанности действовать?', 'Does the chosen option fit your value and real possibilities without an obligation to act?'),
    fields(['Выбранная ценность', 'Chosen value'], ['Реалистичный необязательный вариант', 'A realistic optional response']), [
      choice('another_time', 'Предложить другое время как вариант', 'Keep suggesting another time as an option'),
      choice('short_meeting', 'Рассмотреть короткую встречу как вариант', 'Keep a short meeting as an option'),
    ], text('Условная ситуация: знакомый написал «Хочешь завтра прогуляться?» Это приглашение без обязательства. Герой думает: «Если откажусь, обязательно обижу человека», но это не известно.', 'Fictional situation: an acquaintance wrote, “Would you like a walk tomorrow?” It is an invitation without obligation. The character thinks, “If I decline, I will definitely upset them,” but this is not known.')),
    day('time_contact_rest_boundary', [
      choice('time', 'На сегодня у меня есть немного времени', 'I have a little time available today'),
      choice('contact', 'Сегодня я не готов(а) к разговору', 'I am not available for a conversation today'),
      choice('rest', 'Сейчас мне нужно время для отдыха', 'I need time to rest now'),
    ], fields(['Граница: время, контакт или отдых', 'Boundary: time, contact or rest'], ['Моя короткая фраза', 'My short phrase']),
    text('Выберите одну область и напишите правдивую короткую фразу. Её можно не произносить и никому не отправлять.', 'Choose one area and draft a truthful short phrase. You do not need to say it or send it to anyone.'),
    text('Оставьте ту часть формулировки, которая ясно обозначает границу без лишнего обещания.', 'Keep the part of the wording that clearly states the boundary without an extra promise.'),
    fields(['Суть моей границы', 'The core of my boundary'], ['Фраза, которую можно оставить личной', 'A phrase that may stay private']), [
      choice('rest_phrase', 'Оставить фразу о времени для отдыха', 'Keep the phrase about time for rest'),
      choice('contact_phrase', 'Оставить фразу о доступности для разговора', 'Keep the phrase about availability to talk'),
    ]),
    day('actual_human_resource', [
      choice('available_person', 'Действительно доступный человек, без имени', 'A genuinely available person, without a name'),
      choice('professional_resource', 'Реально доступный профессиональный ресурс', 'An actually available professional resource'),
      choice('check_access', 'Сначала нужно уточнить доступность', 'Access needs checking first'),
      choice('none', 'Пока не знаю доступного варианта', 'I do not know an available option yet'),
    ], fields(['Вид человека или профессионального ресурса', 'Type of person or professional resource'], ['Какая помощь может быть доступна', 'What help may be available'], ['Что о доступности уже известно', 'What is already known about access']),
    text('Укажите роль или вид поддержки вместо имени и контактов. Обращаться сейчас не требуется; неизвестную доступность не считайте подтверждённой.', 'Use a role or type of support rather than names or contacts. No contact is required now; do not treat unknown access as confirmed.'),
    text('Что действительно известно о доступности помощи и что пока остаётся вопросом?', 'What is genuinely known about access to support, and what remains a question?'),
    fields(['Подтверждённая возможность', 'A confirmed possibility'], ['Что пока нужно уточнить', 'What still needs checking']), [
      choice('known_access', 'Оставить только известную доступность', 'Keep only access that is known'),
      choice('open_question', 'Оставить вопрос о доступности открытым', 'Leave the access question open'),
    ]),
    day('ordinary_day_rhythm', [
      choice('task_pause', 'Небольшая задача → пауза', 'A small task → a pause'),
      choice('pleasant_space', 'Приятное занятие → свободный промежуток', 'A pleasant activity → some open time'),
      choice('shorter_day', 'Сократить план до доступных частей', 'Reduce the plan to available parts'),
    ], fields(['Обычная задача', 'An ordinary task'], ['Пауза', 'A pause'], ['Небольшое приятное занятие', 'A small pleasant activity'], ['Резерв на непредвиденное', 'Space for the unexpected']),
    text('Соберите пример дня, не расписание обязательств. Резерв можно оставить пустым временем; приятное занятие не обязано менять настроение.', 'Build an example day, not a compulsory schedule. The buffer may be unfilled time; a pleasant activity does not need to change your mood.'),
    text('Что можно убрать или перенести, чтобы непредвиденное дело не заняло всё место для отдыха?', 'What could be removed or delayed so an unexpected task does not take all the room for rest?'),
    fields(['Необязательная часть, которую можно перенести', 'An optional part that can move'], ['Место, оставленное для паузы', 'Room left for a pause']), [
      choice('keep_buffer', 'Сохранить незаполненный промежуток', 'Keep some unfilled time'),
      choice('move_task', 'Перенести необязательную задачу', 'Move an optional task'),
    ]),
    day('maintenance_five_link_map', [
      choice('signal_resource', 'Ранний сигнал → реальный ресурс', 'Early sign → a real support'),
      choice('boundary_help', 'Короткая граница → доступная помощь', 'A short boundary → available help'),
      choice('backup', 'Запасной вариант при изменениях', 'A backup if circumstances change'),
      choice('keep_fitting', 'Оставить только подходящие звенья', 'Keep only the links that fit'),
    ], fields(['Ранний сигнал', 'Early sign'], ['Ресурс', 'Support'], ['Граница', 'Boundary'], ['Помощь', 'Help'], ['Запасной вариант', 'Backup']),
    text('Соберите карту профилактики из реально доступного. Каждое звено можно изменить или оставить пустым; выполнять всё не требуется.', 'Build a prevention map from what is genuinely available. Any link may be changed or left blank; completing every step is not required.'),
    text('Как сохранить план гибким, если ресурс недоступен или граница требует другой формулировки?', 'How could the plan stay flexible if a support becomes unavailable or a boundary needs different wording?'),
    fields(['Звено, которое можно пересмотреть', 'A link that can be revised'], ['Доступный запасной вариант', 'An available backup']), [
      choice('revise_boundary', 'Пересмотреть формулировку границы', 'Revise the boundary wording'),
      choice('swap_resource', 'Заменить ресурс или оставить пустое место', 'Replace a support or leave a blank'),
    ]),
  ]),
})

const SKILLS = Object.freeze([
  text('Ориентация и право выбора', 'Orientation and choice'),
  text('Ранние признаки перегрузки', 'Early signs of overload'),
  text('Мягкая регуляция и дозировка', 'Gentle regulation and pacing'),
  text('Доступные ресурсы', 'Realistic sources of support'),
  text('Гибкость мышления', 'Flexible thinking'),
  text('Границы и человеческая поддержка', 'Boundaries and human support'),
  text('Самостоятельное применение и личный план', 'Everyday transfer and personal plan'),
])
const SKIP = choice('skip', 'Пропустить или отдохнуть', 'Skip or rest')
const optionalDraft = text(
  'Все поля необязательны. Можно оставить черновик пустым, отдохнуть или закончить. Черновик остаётся локальным; перенос в существующую зашифрованную рефлексию — только по вашему отдельному выбору.',
  'Every field is optional. You may leave the draft blank, rest or finish. The draft stays local; copying it into the existing encrypted reflection requires your explicit choice.',
)

/** Current five-level routes only. Unknown modules, AS2 and invalid days return null. */
export function routeInteractionPlan(moduleId, dayNumber, locale = 'en') {
  if (typeof moduleId !== 'string' || !Object.prototype.hasOwnProperty.call(ROUTES, moduleId)) return null
  const row = fiveLevelLessonRow(moduleId, dayNumber)
  const source = row && ROUTES[moduleId][dayNumber - 1]
  if (!source) return null
  const lang = locale === 'ru' ? 'ru' : 'en'
  const title = row[lang === 'ru' ? 0 : 1]
  const practice = row[lang === 'ru' ? 2 : 3]
  const prompt = source.scene ? `${practice}\n\n${source.scene[lang]}` : practice
  const prefix = `${moduleId.toLowerCase()}d${String(dayNumber).padStart(2, '0')}_`
  const localOptions = items => [...items, SKIP].map(item => ({
    id: item.id === 'skip' || item.id === 'rest' ? item.id : `${prefix}${item.id}`,
    label: item.label[lang],
  }))
  const options = localOptions(source.choices)
  const stage = Math.ceil(dayNumber / 2)
  return {
    schema: 'opora-nav2-interactions-1',
    methodActivity: {
      day: dayNumber,
      kind: source.kind,
      skillId: `S${stage}`,
      skill: SKILLS[stage - 1][lang],
      title,
      prompt,
      choices: options.map(({ id, label }) => ({ value: id, label })),
      safeText: lang === 'ru'
        ? 'Учебная практика без оценки, диагноза и обращения к тяжёлым воспоминаниям. Можно читать, выбрать внешний ориентир, отдохнуть или пропустить. Изменение чувств не требуется.'
        : 'An educational practice without grading, diagnosis or revisiting distressing memories. You may read, choose an external anchor, rest or skip. Feelings do not need to change.',
      actionText: optionalDraft[lang],
    },
    practiceLab: {
      main: {
        method: source.kind,
        title,
        instruction: prompt,
        steps: [source.nextStep[lang], optionalDraft[lang]],
        options,
        format: 'worksheet',
        fields: source.fields.map(field => field[lang]),
      },
      reflect: {
        method: `${source.kind}_review`,
        title: lang === 'ru' ? `${title}: необязательный разбор` : `${title}: optional review`,
        instruction: source.review[lang],
        steps: [
          lang === 'ru'
            ? `Возможные варианты для разбора: ${source.reviewChoices.map(item => item.label.ru).join('; ')}. Можно выбрать свой вариант или не разбирать практику.`
            : `Possible options to consider: ${source.reviewChoices.map(item => item.label.en).join('; ')}. You may choose your own option or leave the review undone.`,
          optionalDraft[lang],
        ],
        options: localOptions([
          choice('independent', `Рассмотрел(а) «${title}» без дополнительной подсказки`, `Considered “${title}” without an additional hint`),
          choice('hint', 'При разборе использовал(а) дополнительную подсказку', 'Used an additional hint while reviewing this choice'),
          choice('defer', 'Оставил(а) этот разбор на потом', 'Left this review for another time'),
        ]),
        format: 'worksheet',
        fields: source.reviewFields.map(field => field[lang]),
      },
    },
  }
}
