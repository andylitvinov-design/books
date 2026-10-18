// AS-5.6 presentation-only micro-practices. 14 voluntary, low-activation,
// original RU/EN scripts. Clinical efficacy is not implied by completing them.
// Keep the source AS-5.5 exercises and their saved data version-pinned.
const GUIDES=Object.freeze([
  {
    ru:'Посмотрите на три обычные детали вокруг. Тихо скажите себе: «В эту секунду мне необязательно спешить». Побудьте в маленькой паузе 10–15 секунд. Особых ощущений добиваться не нужно.',
    en:'Look at three ordinary details around you. Quietly tell yourself, “I do not have to hurry this second.” Stay with a small pause for 10–15 seconds. You do not need to feel anything special.',
  },
  {
    ru:'Оставьте глаза открытыми. Выберите один нейтральный предмет, рассмотрите его цвет и края. Переведите взгляд на другой предмет, затем мягко вернитесь к первому.',
    en:'Keep your eyes open. Choose a neutral object and notice its colour and edges. Look at another object, then gently return your attention to the first.',
  },
  {
    ru:'Устройтесь удобно. Если приятно, заметите опору стула или пола. Немного отпустите кисти либо посмотрите на спокойную деталь вокруг. Дыхание менять не требуется.',
    en:'Get comfortable. If it feels okay, notice the support of your seat or the floor. Loosen your hands a little, or simply look at a neutral detail nearby. Keep your breathing natural.',
  },
  {
    ru:'Возьмите только вымышленный лёгкий пример: планы немного изменились. Какое мягкое чувство могло бы возникнуть? Мысленно назовите его одним словом и спокойно посмотрите на предмет рядом.',
    en:'Use only a mild fictional example: plans change slightly. What gentle feeling might appear? Name it silently in one word, then look at an ordinary object near you.',
  },
  {
    ru:'В вымышленной истории человеку пока не ответили. «Ответа ещё нет» — факт. «Меня игнорируют» — догадка. Про себя скажите: «Это возможная мысль, а не доказанный факт», затем посмотрите вокруг.',
    en:'In a fictional story, somebody has not replied yet. “No reply yet” is a fact. “I am being ignored” is a guess. Silently try: “That is a possible thought, not a proven fact,” then look around.',
  },
  {
    ru:'Никому ничего отправлять не нужно. Мысленно и спокойно произнесите: «Я могу ответить позже». Представьте короткую паузу между просьбой и вашим ответом, не вызывая неприятных воспоминаний.',
    en:'You do not need to contact anyone. Quietly rehearse: “I can reply later.” Imagine a small pause between a request and your response, without bringing up difficult memories.',
  },
  {
    ru:'Выберите из уже знакомого одну опору: нейтральный предмет, мягкую фразу или короткую паузу. Попробуйте её сейчас несколько мгновений. Если не подходит — можно просто отдохнуть.',
    en:'Choose one familiar support: a neutral object, a kind phrase, or a short pause. Try it for a few moments. If it does not fit, ordinary rest is enough.',
  },
  {
    ru:'Посмотрите вокруг и найдите одну устойчивую линию: край стола, окно или полку. На несколько секунд позвольте вниманию быть здесь, а не в следующем деле. Заметьте, доступна ли хотя бы маленькая пауза.',
    en:'Look around for a steady line: a table edge, window frame, or shelf. For a few seconds let attention rest here, rather than on the next task. Notice whether even a small pause is available.',
  },
  {
    ru:'Сначала назовите три нейтральные детали пространства. Потом выберите одну и задержите на ней взгляд на несколько секунд. По желанию снова посмотрите вокруг — в собственном темпе.',
    en:'First name three neutral details in your surroundings. Then choose one to rest your gaze on for a few seconds. If you wish, look around again at your own pace.',
  },
  {
    ru:'Посмотрите, удобно ли сидят ваши руки. Если приятно, едва заметно измените положение одной кисти. Затем сделайте паузу и решите: оставить так, вернуться или отдохнуть. Никаких усилий через боль.',
    en:'Notice whether your hands feel comfortable. If it feels fine, make one tiny adjustment to a hand. Pause and choose: keep it, change back, or rest. Do not push through pain.',
  },
  {
    ru:'Пусть будет только вымышленная история о небольшой задержке. Назовите одно возможное чувство и добавьте: «Это можно заметить без борьбы». После этого найдите глазами два обычных предмета.',
    en:'Use only a fictional story about a small delay. Name one possible feeling and add: “I can notice this without fighting it.” Then find two ordinary objects with your eyes.',
  },
  {
    ru:'Прочитайте мягкую вымышленную мысль: «Надо всё успеть сегодня». Добавьте перед ней: «У меня появилась мысль, что…». Заметьте разницу между мыслью и реальным требованием, затем вернитесь к тому, что видите.',
    en:'Read this mild fictional thought: “I must finish everything today.” Place “I am having the thought that…” in front of it. Notice the difference between a thought and a real requirement, then return to what you see.',
  },
  {
    ru:'Мысленно, без реального разговора, спокойно произнесите: «Мне нужна небольшая пауза». Повторите чуть мягче, если хочется. Обратите внимание, что выбирать темп ответа можно постепенно.',
    en:'Silently, without having a real conversation, say: “I need a short pause.” Try it a little more gently if you like. Notice that you can choose your response pace gradually.',
  },
  {
    ru:'Вспомните не трудный случай, а один полезный шаг курса: внешний предмет, мягкая пауза, доброжелательная фраза или отделение мысли от факта. Попробуйте его прямо сейчас несколько секунд. Это уже ваш маленький набор опор.',
    en:'Choose one familiar small step from the course: a neutral object, a gentle pause, a kind phrase, or separating a thought from fact. Try it for a few seconds now. This can be part of your personal support toolkit.',
  },
])
export function oporaExperienceGuide(day,locale='en'){
  if(!Number.isInteger(day)||day<1||day>14)return null
  return GUIDES[day-1][locale==='ru'?'ru':'en']
}
export function oporaExperienceGuidesValid(){
  return GUIDES.length===14&&GUIDES.every(row=>
    row.ru.length>=100&&row.en.length>=100&&row.ru!==row.en)
}
