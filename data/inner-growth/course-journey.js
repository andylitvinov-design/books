// 14-day learning arc for Holistic House My Course.
// These are optional educational milestones, not clinical claims or outcomes.
const bilingual = (en, ru) => Object.freeze({ en, ru })

export const COURSE_JOURNEY = Object.freeze([
  {
    day: 1, phase: 'awareness',
    heading: bilingual('Notice your starting point', 'Замечаю точку отсчёта'),
    purpose: bilingual('Observe one manageable situation, without trying to change it immediately.', 'Замечаем одну посильную ситуацию, не пытаясь немедленно её изменить.'),
    outcome: bilingual('One honest observation about today.', 'Одно честное наблюдение о сегодняшнем дне.'),
  },
  {
    day: 2, phase: 'awareness',
    heading: bilingual('Recognize the first signal', 'Узнаю первый сигнал'),
    purpose: bilingual('Look for an early signal of tension, fatigue, emotion or distraction.', 'Ищем ранний признак напряжения, усталости, эмоции или отвлечения.'),
    outcome: bilingual('A personal early-warning clue.', 'Личная подсказка о раннем сигнале.'),
  },
  {
    day: 3, phase: 'awareness',
    heading: bilingual('See the pattern', 'Вижу закономерность'),
    purpose: bilingual('Separate the situation, your reaction and the next possible choice.', 'Разделяем ситуацию, свою реакцию и следующий возможный выбор.'),
    outcome: bilingual('A simple situation → response map.', 'Простая карта «ситуация → реакция».'),
  },
  {
    day: 4, phase: 'regulation',
    heading: bilingual('Find a point of support', 'Нахожу точку опоры'),
    purpose: bilingual('Try a gentle, eyes-open way to orient yourself in the present.', 'Пробуем мягкую практику возвращения внимания к настоящему с открытыми глазами.'),
    outcome: bilingual('One comfortable grounding option.', 'Один подходящий способ заземления.'),
  },
  {
    day: 5, phase: 'regulation',
    heading: bilingual('Choose one small step', 'Выбираю маленький шаг'),
    purpose: bilingual('Turn the idea into a short action that fits your real capacity.', 'Превращаем идею в короткое действие с учётом своих реальных сил.'),
    outcome: bilingual('One achievable action or restorative pause.', 'Одно посильное действие или восстановительная пауза.'),
  },
  {
    day: 6, phase: 'regulation',
    heading: bilingual('Respond more gently', 'Отвечаю себе бережнее'),
    purpose: bilingual('Experiment with one kinder and more flexible response.', 'Пробуем один более доброжелательный и гибкий способ реакции.'),
    outcome: bilingual('A response worth trying again.', 'Способ реакции, к которому можно вернуться.'),
  },
  {
    day: 7, phase: 'review',
    heading: bilingual('Review the first week', 'Осмысляю первую неделю'),
    purpose: bilingual('Notice patterns, helpful choices and discomfort without grading yourself.', 'Замечаем закономерности, полезные решения и дискомфорт без оценок себя.'),
    outcome: bilingual('A brief week-one reflection and an optional course adjustment.', 'Краткий итог недели и возможность скорректировать темп.'),
  },
  {
    day: 8, phase: 'application',
    heading: bilingual('Bring it into ordinary life', 'Переношу навык в обычную жизнь'),
    purpose: bilingual('Try a familiar skill in a safe, low-pressure situation.', 'Пробуем знакомый навык в безопасной повседневной ситуации.'),
    outcome: bilingual('One example of a skill used outside the lesson.', 'Один пример применения навыка вне урока.'),
  },
  {
    day: 9, phase: 'application',
    heading: bilingual('Notice available resources', 'Замечаю доступные ресурсы'),
    purpose: bilingual('Recognize personal, relational or environmental sources of support.', 'Замечаем личные ресурсы, поддержку людей и возможности среды.'),
    outcome: bilingual('A short map of reachable supports.', 'Небольшая карта доступной поддержки.'),
  },
  {
    day: 10, phase: 'application',
    heading: bilingual('Pause before choosing', 'Делаю паузу перед выбором'),
    purpose: bilingual('Notice the space between an impulse and a manageable decision.', 'Замечаем пространство между первым импульсом и посильным решением.'),
    outcome: bilingual('One conscious choice, however small.', 'Один осознанный выбор, даже совсем небольшой.'),
  },
  {
    day: 11, phase: 'application',
    heading: bilingual('Repeat without perfection', 'Повторяю без требования идеала'),
    purpose: bilingual('Practise returning after distraction or an uncomfortable moment.', 'Тренируем мягкое возвращение после отвлечения или непростого момента.'),
    outcome: bilingual('A realistic way to begin again.', 'Реалистичный способ начать снова.'),
  },
  {
    day: 12, phase: 'integration',
    heading: bilingual('Create your personal toolkit', 'Собираю личный набор практик'),
    purpose: bilingual('Combine two or three acceptable steps into a short, flexible routine.', 'Соединяем два-три подходящих шага в короткую и гибкую практику.'),
    outcome: bilingual('A personal two- or three-step routine.', 'Личная последовательность из двух-трёх шагов.'),
  },
  {
    day: 13, phase: 'integration',
    heading: bilingual('Choose your own practice', 'Самостоятельно выбираю практику'),
    purpose: bilingual('Decide for yourself if, when and how to use a familiar tool.', 'Самостоятельно решаем, применять ли привычный инструмент, когда и как.'),
    outcome: bilingual('A skill you can use by choice.', 'Навык, которым можно пользоваться по своему выбору.'),
  },
  {
    day: 14, phase: 'review',
    heading: bilingual('Reflect and choose what comes next', 'Подвожу итоги и выбираю продолжение'),
    purpose: bilingual('Review your observations, useful skills and next possible step without promising a cure.', 'Осмысляем наблюдения и полезные навыки, выбираем следующий шаг без обещаний исцеления.'),
    outcome: bilingual('A personal summary and an optional new 14-day direction.', 'Личный итог и возможность выбрать новый 14-дневный цикл.'),
  },
])

export const COURSE_PHASES = Object.freeze({
  awareness: bilingual('Awareness', 'Осознавание'),
  regulation: bilingual('Gentle regulation', 'Бережная регуляция'),
  review: bilingual('Reflection', 'Подведение итогов'),
  application: bilingual('Everyday practice', 'Практика в повседневности'),
  integration: bilingual('Integration', 'Интеграция'),
})
