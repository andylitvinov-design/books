import { deepFreeze } from '../../lib/assessments/contracts.js'

// Faithful question/remedy mapping from andylitvinov-design/report/src/data/mockData.js.
// All 115 author questions are retained; the original source's mock scores are not.
// The 0–5 scale makes the original peak bonuses at 4 and 5 reachable.
export const BACH_QUESTION_BANK = deepFreeze([
  {
    "id": "situation-1",
    "section": "situation",
    "remedy": "Pine",
    "theme": "вина, самоукор",
    "ru": "Я чувствую себя виноватой(ым). Меня терзают угрызения совести.",
    "en": "I feel guilty and troubled by remorse."
  },
  {
    "id": "situation-2",
    "section": "situation",
    "remedy": "Cerato",
    "theme": "недоверие к себе",
    "ru": "Я чувствую себя неуверенно. Я сомневаюсь вправе ли я судить и ориентируюсь на чужое мнение.",
    "en": "I doubt my judgment and rely on other people's opinions."
  },
  {
    "id": "situation-3",
    "section": "situation",
    "remedy": "Holly",
    "theme": "гнев, ревность",
    "ru": "Я чувствую себя задетой(ым), гневной(ым), подозрительной(ым), ревнивой(ым), мстительной(ым).",
    "en": "I feel hurt, angry, suspicious, jealous or vengeful."
  },
  {
    "id": "situation-4",
    "section": "situation",
    "remedy": "Clematis",
    "theme": "уход из реальности",
    "ru": "Я чувствую себя не особенно тронутой(ым) ситуацией, так как постоянно витаю мыслями где-то в другом месте.",
    "en": "I feel detached because my thoughts are elsewhere."
  },
  {
    "id": "situation-5",
    "section": "situation",
    "remedy": "Crab Apple",
    "theme": "брезгливость, очищение",
    "ru": "Я чувствую себя раздраженной(ым) отсутствием порядка, грязной(ым), мне противно, мне необходима чистота.",
    "en": "Disorder or dirt irritates me; I urgently want things clean."
  },
  {
    "id": "situation-6",
    "section": "situation",
    "remedy": "Willow",
    "theme": "обида, жертва",
    "ru": "Я чувствую себя брошенной(ым) на произвол судьбы, несправедливо обиженной(ым) ею.",
    "en": "I feel abandoned and unfairly treated by life."
  },
  {
    "id": "situation-7",
    "section": "situation",
    "remedy": "Vine",
    "theme": "давление, контроль",
    "ru": "Я чувствую себя вынужденной(ым) навязать свою волю.",
    "en": "I feel driven to impose my will on others."
  },
  {
    "id": "situation-8",
    "section": "situation",
    "remedy": "Walnut",
    "theme": "переход, устойчивость",
    "ru": "Я чувствую себя недостаточно стойкой(им). Я боюсь изменить самой(му) себе. Я хочу приняться за дело.",
    "en": "I fear losing myself through change and struggle to begin."
  },
  {
    "id": "situation-9",
    "section": "situation",
    "remedy": "Mustard",
    "theme": "меланхолия",
    "ru": "Я чувствую себя меланхоличной(ым), грустной(ым), в депрессии, не зная, почему.",
    "en": "I feel sad or low without knowing why."
  },
  {
    "id": "situation-10",
    "section": "situation",
    "remedy": "Larch",
    "theme": "неуверенность",
    "ru": "Я чувствую себя неполноценной(ым), слабой(ым), менее способной(ым), чем другие люди.",
    "en": "I feel inferior, weak or less capable than others."
  },
  {
    "id": "situation-11",
    "section": "situation",
    "remedy": "Oak",
    "theme": "долг, не сдаваться",
    "ru": "Я чувствую себя изможденным бойцом на посту, которому нельзя сдаваться.",
    "en": "I keep fighting on despite feeling exhausted."
  },
  {
    "id": "situation-12",
    "section": "situation",
    "remedy": "Mimulus",
    "theme": "конкретный страх",
    "ru": "Я чувствую себя напуганной(ым). Я боюсь конкретного человека или конкретного события.",
    "en": "I am afraid of a particular person or situation."
  },
  {
    "id": "situation-13",
    "section": "situation",
    "remedy": "Centaury",
    "theme": "слабые границы",
    "ru": "Я чувствую себя слишком мягкой(им), слишком добросердечной(ым), я не могу сказать «нет».",
    "en": "I am so accommodating that I struggle to say no."
  },
  {
    "id": "situation-14",
    "section": "situation",
    "remedy": "Honeysuckle",
    "theme": "прошлое",
    "ru": "Я чувствую себя унылой(ым). Я не могу избавиться от прошлого: события или отношения.",
    "en": "I remain caught up in a past event or relationship."
  },
  {
    "id": "situation-15",
    "section": "situation",
    "remedy": "Elm",
    "theme": "перегруз ответственности",
    "ru": "Я чувствую себя перегруженной(ым) своей ответственностью. Я просто не могу все это сделать!",
    "en": "I feel overwhelmed by responsibilities that seem impossible to meet."
  },
  {
    "id": "situation-16",
    "section": "situation",
    "remedy": "Water Violet",
    "theme": "отстраненность",
    "ru": "Я чувствую себя не принимающей(им) участие. Я отстранилась от всего этого.",
    "en": "I feel detached and uninvolved with what is happening."
  },
  {
    "id": "situation-17",
    "section": "situation",
    "remedy": "Scleranthus",
    "theme": "нерешительность",
    "ru": "Я чувствую себя нерешительной(ым), раздробленной(ым), сомневающейся(имся). Действительно ли это то, чего я хочу?",
    "en": "I waver and question whether this is what I want."
  },
  {
    "id": "situation-18",
    "section": "situation",
    "remedy": "Impatiens",
    "theme": "нетерпение",
    "ru": "Я чувствую себя нетерпеливой(ым). Все мне кажется слишком медленно происходящим.",
    "en": "I feel impatient because everything seems too slow."
  },
  {
    "id": "situation-19",
    "section": "situation",
    "remedy": "Heather",
    "theme": "потребность во внимании",
    "ru": "Я чувствую себя духовно нуждающейся(имся), мне необходимы участие и поддержка.",
    "en": "I long for attention, care and emotional support."
  },
  {
    "id": "situation-20",
    "section": "situation",
    "remedy": "Agrimony",
    "theme": "маска, скрытая боль",
    "ru": "Я чувствую себя клоуном, делающим хорошую мину при плохой игре.",
    "en": "I hide my pain behind a cheerful face."
  },
  {
    "id": "situation-21",
    "section": "situation",
    "remedy": "Olive",
    "theme": "истощение",
    "ru": "Я чувствую себя уставшей(им), хочу покоя.",
    "en": "I feel tired and want some peace and rest."
  },
  {
    "id": "situation-22",
    "section": "situation",
    "remedy": "Chestnut Bud",
    "theme": "повтор ошибок",
    "ru": "Я чувствую себя озадаченной(ым), так как постоянно совершаю одни и те же ошибки.",
    "en": "I keep making the same mistakes and feel confused."
  },
  {
    "id": "situation-23",
    "section": "situation",
    "remedy": "White Chestnut",
    "theme": "мысли, внутренний шум",
    "ru": "Я чувствую себя измученной(ым) нежеланными мыслями и внутренними диалогами, от которых не могу избавиться.",
    "en": "Unwanted thoughts and inner arguments wear me down."
  },
  {
    "id": "situation-24",
    "section": "situation",
    "remedy": "Sweet Chestnut",
    "theme": "безвыходность",
    "ru": "Я чувствую себя зажатой(ым) в тиски, отчаявшейся(имся), не знаю, что делать дальше.",
    "en": "I feel trapped, desperate and unsure what to do next."
  },
  {
    "id": "situation-25",
    "section": "situation",
    "remedy": "Vervain",
    "theme": "чрезмерное рвение",
    "ru": "Я чувствую себя занятой(ым) на сто пятьдесят процентов.",
    "en": "I take on too much and work beyond my limits."
  },
  {
    "id": "situation-26",
    "section": "situation",
    "remedy": "Star of Bethlehem",
    "theme": "шок, удар",
    "ru": "Я чувствую себя полностью шокированной(ым), я никак не могу справиться с этим ударом судьбы.",
    "en": "I feel shocked and unable to process a painful event."
  },
  {
    "id": "situation-27",
    "section": "situation",
    "remedy": "Rock Rose",
    "theme": "паника, острый страх",
    "ru": "Я чувствую себя выбитой(ым) из равновесия.",
    "en": "I feel thrown off balance by what is happening."
  },
  {
    "id": "situation-28",
    "section": "situation",
    "remedy": "Olive",
    "theme": "глубокое истощение",
    "ru": "Я чувствую себя обессиленной(ым), измученной(ым), истощенной(ым).",
    "en": "I feel drained, worn out and completely exhausted."
  },
  {
    "id": "situation-29",
    "section": "situation",
    "remedy": "Rock Water",
    "theme": "жесткость к себе",
    "ru": "Я чувствую себя рекордсменом, вынужденным постоянно тренироваться, ничего себе не позволять.",
    "en": "I push myself relentlessly and allow myself no breaks."
  },
  {
    "id": "situation-30",
    "section": "situation",
    "remedy": "Gorse",
    "theme": "безнадежность",
    "ru": "Я чувствую себя лишенной(ым) надежды, покоренной(ым) судьбе.",
    "en": "I feel hopeless and resigned to what life brings."
  },
  {
    "id": "situation-31",
    "section": "situation",
    "remedy": "Aspen",
    "theme": "неясная тревога",
    "ru": "Я чувствую себя подверженной(ым) угрозе, меня одолевают страхи, с которыми я не могу справиться.",
    "en": "I feel threatened by fears I cannot explain or manage."
  },
  {
    "id": "situation-32",
    "section": "situation",
    "remedy": "Chicory",
    "theme": "ожидание признания",
    "ru": "Я чувствую себя недостаточно оценимой(ым) или любимой(ым), раненой(ым), разочарованной(ым), так как я ожидала большего признания или благодарности.",
    "en": "I feel hurt and unappreciated when others do not acknowledge me."
  },
  {
    "id": "situation-33",
    "section": "situation",
    "remedy": "Red Chestnut",
    "theme": "тревога за других",
    "ru": "Я чувствую себя так сильно погруженной(ым) в положение других людей, что практически не воспринимаю свои собственные чувства и страхи.",
    "en": "I am so concerned about others that I lose touch with my feelings."
  },
  {
    "id": "situation-34",
    "section": "situation",
    "remedy": "Gentian",
    "theme": "скепсис, уныние",
    "ru": "Я чувствую себя обескураженной(ым), настроенной(ым) скептически и пессимистически.",
    "en": "I feel discouraged, skeptical and pessimistic."
  },
  {
    "id": "situation-35",
    "section": "situation",
    "remedy": "Cherry Plum",
    "theme": "страх потерять контроль",
    "ru": "Я чувствую себя как на бочке с порохом. Я больше не могу владеть собой.",
    "en": "I feel on the verge of losing control of myself."
  },
  {
    "id": "situation-36",
    "section": "situation",
    "remedy": "Beech",
    "theme": "критичность",
    "ru": "Я чувствую себя нервной(ым), слишком критичной(ым) или, наоборот, некритичной(ым), терпимой(ым).",
    "en": "I feel tense and overly critical, or unsure when to set limits."
  },
  {
    "id": "situation-37",
    "section": "situation",
    "remedy": "Hornbeam",
    "theme": "усталость перед началом",
    "ru": "Я чувствую себя внутренне вялой, лишенной(ым) энергии. У меня недостаточно сил, чтобы выполнить мое задание.",
    "en": "I feel sluggish and lack energy to tackle my tasks."
  },
  {
    "id": "situation-38",
    "section": "situation",
    "remedy": "Rock Rose",
    "theme": "паника",
    "ru": "Я чувствую себя в панике.",
    "en": "I feel panicked."
  },
  {
    "id": "character-1",
    "section": "character",
    "remedy": "Elm",
    "theme": "перегруз обязательствами",
    "ru": "Мне мешает моя обязательность: я боюсь, что всё это доставит мне слишком много хлопот.",
    "en": "My sense of duty often makes obligations feel burdensome."
  },
  {
    "id": "character-2",
    "section": "character",
    "remedy": "Larch",
    "theme": "неуверенность в себе",
    "ru": "Мне мешает моя недооценка самой себя: я просто не доверяю самой(ому) себе.",
    "en": "I underestimate myself and do not trust my own abilities."
  },
  {
    "id": "character-3",
    "section": "character",
    "remedy": "Agrimony",
    "theme": "избегание конфликта",
    "ru": "Мне мешает моя слишком сильная потребность в гармонии: я не хочу некрасивых дискуссий и споров.",
    "en": "My need for harmony makes me avoid difficult conversations."
  },
  {
    "id": "character-4",
    "section": "character",
    "remedy": "Olive",
    "theme": "истощение",
    "ru": "Мне мешает мой недостаток силы: я полностью выложился(ась), это слишком много для меня.",
    "en": "I become depleted because I give more than I can."
  },
  {
    "id": "character-5",
    "section": "character",
    "remedy": "Aspen",
    "theme": "предчувствия",
    "ru": "Мне мешает мое повышенное «чутье»: когда я думаю о чем-либо, у меня появляются плохие предчувствия.",
    "en": "I expect something bad to happen when I consider the future."
  },
  {
    "id": "character-6",
    "section": "character",
    "remedy": "Beech",
    "theme": "критика, самокритика",
    "ru": "Мне мешает моя непростительная склонность к критике и самокритике: многое мешает мне, но я не могу перепрыгнуть через свою голову.",
    "en": "I am highly critical of myself or others."
  },
  {
    "id": "character-7",
    "section": "character",
    "remedy": "Centaury",
    "theme": "слабая воля",
    "ru": "Мне мешает моя слабая воля: я просто не могу сказать «нет».",
    "en": "I have difficulty saying no."
  },
  {
    "id": "character-8",
    "section": "character",
    "remedy": "Honeysuckle",
    "theme": "прошлое",
    "ru": "Мне мешает моя сильная зависимость от прошлого: я просто не могу забыть то, что было раньше.",
    "en": "I cannot let go of the past."
  },
  {
    "id": "character-9",
    "section": "character",
    "remedy": "Hornbeam",
    "theme": "инерция",
    "ru": "Мне мешает недостаток внутренней энергии: когда я думаю о какой-либо проблеме, она предстает передо мной в виде огромной серой горы.",
    "en": "Even small problems feel like a heavy mountain before I start."
  },
  {
    "id": "character-10",
    "section": "character",
    "remedy": "Cherry Plum",
    "theme": "страх потерять контроль",
    "ru": "Мне мешает страх перед моими собственными чувствами: если я отпущу себя, я больше не смогу себя контролировать.",
    "en": "I fear that expressing feelings would make me lose control."
  },
  {
    "id": "character-11",
    "section": "character",
    "remedy": "Holly",
    "theme": "ревность, агрессия",
    "ru": "Мне мешает моя подозрительность, моя ничем не обоснованная ревность: я быстро становлюсь агрессивным(ой).",
    "en": "I become suspicious, jealous or aggressive easily."
  },
  {
    "id": "character-12",
    "section": "character",
    "remedy": "Scleranthus",
    "theme": "нерешительность",
    "ru": "Мне мешает моя внутренняя нерешительность: я не знаю, хочу ли я этого в действительности.",
    "en": "I doubt whether I truly want what I am pursuing."
  },
  {
    "id": "character-13",
    "section": "character",
    "remedy": "Pine",
    "theme": "вина",
    "ru": "Мне мешают мои постоянные угрызения совести: я знаю, что снова буду себя упрекать.",
    "en": "I repeatedly blame myself afterward."
  },
  {
    "id": "character-14",
    "section": "character",
    "remedy": "Star of Bethlehem",
    "theme": "ранимость",
    "ru": "Мне мешает моя душевная ранимость: у меня просто не хватает сил справиться с определенными обстоятельствами.",
    "en": "I feel too emotionally vulnerable to face certain circumstances."
  },
  {
    "id": "character-15",
    "section": "character",
    "remedy": "Scleranthus",
    "theme": "колебания",
    "ru": "Мне мешает моя постоянная нерешительность: сначала мне кажется, что лучше всего подходит одно решение, потом — другое.",
    "en": "I keep switching between decisions and cannot choose."
  },
  {
    "id": "character-16",
    "section": "character",
    "remedy": "Oak",
    "theme": "долг",
    "ru": "Мне мешает мое избыточное чувство долга: я обязан(а) довести всё до конца.",
    "en": "My sense of duty makes me keep going regardless of cost."
  },
  {
    "id": "character-17",
    "section": "character",
    "remedy": "Vervain",
    "theme": "чрезмерное рвение",
    "ru": "Мне мешает мой напор, мое рвение: я знаю, что снова буду выкладываться на сто пятьдесят процентов и даже действовать другим на нервы.",
    "en": "I overexert myself and sometimes overwhelm others with my intensity."
  },
  {
    "id": "character-18",
    "section": "character",
    "remedy": "Willow",
    "theme": "обида, справедливость",
    "ru": "Мне мешает мое сильное чувство справедливости: я не могу просто так это оставить.",
    "en": "My sense of injustice makes it hard to let things go."
  },
  {
    "id": "character-19",
    "section": "character",
    "remedy": "Cerato",
    "theme": "поиск подтверждения",
    "ru": "Мне мешает мое внутреннее чувство неуверенности: я снова и снова спрашиваю других людей, чтобы увериться в чем-либо.",
    "en": "I keep asking others to confirm that I am right."
  },
  {
    "id": "character-20",
    "section": "character",
    "remedy": "Rock Rose",
    "theme": "паника",
    "ru": "Мне мешает моя склонность моментально впадать в панику: когда я думаю об этом, моя голова пустеет.",
    "en": "I panic quickly and my mind goes blank."
  },
  {
    "id": "character-21",
    "section": "character",
    "remedy": "Rock Water",
    "theme": "самодисциплина",
    "ru": "Мне мешает моя склонность к строгой дисциплине: я слишком строг(а) к самой(ому) себе, слишком много от себя требую.",
    "en": "I impose strict discipline and very high demands on myself."
  },
  {
    "id": "character-22",
    "section": "character",
    "remedy": "Vine",
    "theme": "навязывание воли",
    "ru": "Мне мешает мое честолюбие: я должна(ен) всегда навязывать свою волю.",
    "en": "My ambition makes me try to impose my will."
  },
  {
    "id": "character-23",
    "section": "character",
    "remedy": "Crab Apple",
    "theme": "порядок, чистота",
    "ru": "Мне мешают моя педантичность, мое стремление к чистоте: даже самые маленькие мелочи должны быть в порядке, иначе я нервничаю.",
    "en": "I become anxious if every detail is not perfectly in order."
  },
  {
    "id": "character-24",
    "section": "character",
    "remedy": "Gorse",
    "theme": "безнадежность",
    "ru": "Мне мешает мое чувство безнадежности: я думаю, что больше нет никакого смысла.",
    "en": "I feel hopeless and see little purpose ahead."
  },
  {
    "id": "character-25",
    "section": "character",
    "remedy": "Water Violet",
    "theme": "уход в себя",
    "ru": "Мне мешает моя углубленность внутрь себя: я просто не воспринимаю других людей.",
    "en": "I withdraw inward and have trouble noticing others."
  },
  {
    "id": "character-26",
    "section": "character",
    "remedy": "Clematis",
    "theme": "неприятие реальности",
    "ru": "Мне мешает мой недостаточный интерес к реальным ситуациям, так как я поглощен(а) мыслями об абсолютно других вещах.",
    "en": "I drift into thoughts far removed from what is happening."
  },
  {
    "id": "character-27",
    "section": "character",
    "remedy": "Impatiens",
    "theme": "нетерпение",
    "ru": "Мне мешает моя нетерпеливость: я просто не могу ждать ни минуты.",
    "en": "I find even a short wait extremely difficult."
  },
  {
    "id": "character-28",
    "section": "character",
    "remedy": "Red Chestnut",
    "theme": "сострадание, слияние",
    "ru": "Мне мешает мое слишком сильное сострадание: я точно знаю, что чувствует другой человек, и не могу оградить себя от этого.",
    "en": "I absorb other people's feelings and struggle to keep boundaries."
  },
  {
    "id": "character-29",
    "section": "character",
    "remedy": "Mustard",
    "theme": "меланхолия",
    "ru": "Мне мешает мой меланхоличный настрой: иногда он меня даже парализует.",
    "en": "Low mood can leave me unable to act."
  },
  {
    "id": "character-30",
    "section": "character",
    "remedy": "Wild Rose",
    "theme": "апатия",
    "ru": "Мне мешает мое практически апатичное безучастие: мне всё безразлично, я отгородился(ась) от всего этого.",
    "en": "I often feel apathetic and disengaged."
  },
  {
    "id": "character-31",
    "section": "character",
    "remedy": "Water Violet",
    "theme": "изоляция",
    "ru": "Мне мешает моя «склонность к отступлению»: мне тяжело работать с другими людьми.",
    "en": "I tend to retreat and find teamwork difficult."
  },
  {
    "id": "character-32",
    "section": "character",
    "remedy": "White Chestnut",
    "theme": "карусель мыслей",
    "ru": "Мне мешает продолжительная карусель мыслей: я не могу сконцентрироваться на самом важном.",
    "en": "Repetitive thoughts make it hard to focus."
  },
  {
    "id": "character-33",
    "section": "character",
    "remedy": "Walnut",
    "theme": "неустойчивость",
    "ru": "Мне мешает моя неустойчивость: в моих планах меня должна всегда поддерживать третья сторона, я не верю самой(ому) себе.",
    "en": "I rely on others to support my plans because I distrust myself."
  },
  {
    "id": "character-34",
    "section": "character",
    "remedy": "Chestnut Bud",
    "theme": "повтор ошибок",
    "ru": "Мне мешает моя невнимательность: я постоянно допускаю одни и те же ошибки.",
    "en": "I keep repeating mistakes because I miss important details."
  },
  {
    "id": "character-35",
    "section": "character",
    "remedy": "Gentian",
    "theme": "скепсис",
    "ru": "Мне мешает мой скептический настрой: собственно говоря, я уже не жду, что что-либо получится.",
    "en": "I assume things will not work out."
  },
  {
    "id": "character-36",
    "section": "character",
    "remedy": "Elm",
    "theme": "ответственность",
    "ru": "Мне мешает мое слишком сильное чувство ответственности.",
    "en": "I carry excessive responsibility."
  },
  {
    "id": "character-37",
    "section": "character",
    "remedy": "Chicory",
    "theme": "ожидание благодарности",
    "ru": "Мне мешает моя позиция ожидания: я вмешиваюсь не в свое дело и жду за это благодарности.",
    "en": "I expect gratitude for intervening in other people's affairs."
  },
  {
    "id": "character-38",
    "section": "character",
    "remedy": "Wild Rose",
    "theme": "пассивность",
    "ru": "Мне мешает моя склонность пускать дело на самотек и потом не находить выхода из сложившейся ситуации.",
    "en": "I let events drift until I feel stuck."
  },
  {
    "id": "character-39",
    "section": "character",
    "remedy": "Willow",
    "theme": "озлобленность",
    "ru": "Мне мешает моя озлобленность: я чувствую себя бессильной жертвой обстоятельств.",
    "en": "I feel bitter and powerless in the face of circumstances."
  },
  {
    "id": "control-1",
    "section": "control",
    "remedy": "Mimulus",
    "theme": "конкретный страх",
    "ru": "Боязливость, страх",
    "en": "Fear or timidity."
  },
  {
    "id": "control-2",
    "section": "control",
    "remedy": "Larch",
    "theme": "самооценка",
    "ru": "Заниженная самооценка или комплекс неполноценности",
    "en": "Low self-esteem or feelings of inferiority."
  },
  {
    "id": "control-3",
    "section": "control",
    "remedy": "Agrimony",
    "theme": "маска гармонии",
    "ru": "Поиск гармонии",
    "en": "Seeking harmony at almost any cost."
  },
  {
    "id": "control-4",
    "section": "control",
    "remedy": "Olive",
    "theme": "истощение",
    "ru": "Недостаток силы / истощение",
    "en": "Lack of energy or exhaustion."
  },
  {
    "id": "control-5",
    "section": "control",
    "remedy": "Aspen",
    "theme": "неясная тревога",
    "ru": "Необъяснимое чувство страха",
    "en": "Fear without a clear explanation."
  },
  {
    "id": "control-6",
    "section": "control",
    "remedy": "Beech",
    "theme": "терпимость",
    "ru": "Проблема с терпимостью",
    "en": "Trouble with tolerance or criticism."
  },
  {
    "id": "control-7",
    "section": "control",
    "remedy": "Centaury",
    "theme": "слабая воля",
    "ru": "Добросердечие и слабая воля",
    "en": "Kindness combined with difficulty setting boundaries."
  },
  {
    "id": "control-8",
    "section": "control",
    "remedy": "Honeysuckle",
    "theme": "прошлое",
    "ru": "Направленность в прошлое",
    "en": "Being focused on the past."
  },
  {
    "id": "control-9",
    "section": "control",
    "remedy": "Hornbeam",
    "theme": "вялость, перегруз",
    "ru": "Чувство перегруженности, внутренняя вялость",
    "en": "Feeling overloaded and internally sluggish."
  },
  {
    "id": "control-10",
    "section": "control",
    "remedy": "Cherry Plum",
    "theme": "давление чувств",
    "ru": "Давление чувств",
    "en": "Emotions building up under pressure."
  },
  {
    "id": "control-11",
    "section": "control",
    "remedy": "Holly",
    "theme": "недоверие, ярость",
    "ru": "Отрицательные чувства: недоверие, зависть, ярость",
    "en": "Distrust, envy or anger."
  },
  {
    "id": "control-12",
    "section": "control",
    "remedy": "Wild Oat",
    "theme": "выбор пути",
    "ru": "Неуверенность в выборе жизненного пути",
    "en": "Uncertainty about the direction of my life."
  },
  {
    "id": "control-13",
    "section": "control",
    "remedy": "Pine",
    "theme": "вина",
    "ru": "Угрызения совести",
    "en": "Guilt or remorse."
  },
  {
    "id": "control-14",
    "section": "control",
    "remedy": "Star of Bethlehem",
    "theme": "ранимость",
    "ru": "Внутренняя ранимость",
    "en": "Emotional sensitivity or vulnerability."
  },
  {
    "id": "control-15",
    "section": "control",
    "remedy": "Scleranthus",
    "theme": "нерешительность",
    "ru": "Нерешительность",
    "en": "Indecision."
  },
  {
    "id": "control-16",
    "section": "control",
    "remedy": "Oak",
    "theme": "достижение любой ценой",
    "ru": "Достижение цели любой ценой",
    "en": "Pursuing a goal at any cost."
  },
  {
    "id": "control-17",
    "section": "control",
    "remedy": "Vervain",
    "theme": "рвение",
    "ru": "Чрезмерное рвение",
    "en": "Excessive zeal or intensity."
  },
  {
    "id": "control-18",
    "section": "control",
    "remedy": "Cerato",
    "theme": "неуверенность",
    "ru": "Внутренняя неуверенность",
    "en": "Doubting my own judgment."
  },
  {
    "id": "control-19",
    "section": "control",
    "remedy": "Rock Rose",
    "theme": "паника",
    "ru": "Внутренняя паника",
    "en": "Sudden internal panic."
  },
  {
    "id": "control-20",
    "section": "control",
    "remedy": "Rock Water",
    "theme": "самодисциплина",
    "ru": "Чрезмерная самодисциплина",
    "en": "Excessive self-discipline."
  },
  {
    "id": "control-21",
    "section": "control",
    "remedy": "Heather",
    "theme": "эгоцентричность",
    "ru": "Эгоистический настрой",
    "en": "Being overly focused on myself."
  },
  {
    "id": "control-22",
    "section": "control",
    "remedy": "Crab Apple",
    "theme": "чистота, брезгливость",
    "ru": "Чрезмерная чистоплотность, брезгливость",
    "en": "Excessive concern about cleanliness or imperfections."
  },
  {
    "id": "control-23",
    "section": "control",
    "remedy": "Gentian",
    "theme": "уныние",
    "ru": "Унылые перспективы",
    "en": "Pessimism about the future."
  },
  {
    "id": "control-24",
    "section": "control",
    "remedy": "Water Violet",
    "theme": "уход в себя",
    "ru": "Углубленность внутрь себя, уход в себя",
    "en": "Withdrawing into myself."
  },
  {
    "id": "control-25",
    "section": "control",
    "remedy": "Clematis",
    "theme": "неприятие реальности",
    "ru": "Неприятие реальности",
    "en": "Avoiding the realities of the present."
  },
  {
    "id": "control-26",
    "section": "control",
    "remedy": "Impatiens",
    "theme": "нетерпение",
    "ru": "Нетерпеливость",
    "en": "Impatience."
  },
  {
    "id": "control-27",
    "section": "control",
    "remedy": "Red Chestnut",
    "theme": "сострадание",
    "ru": "Чрезмерное сострадание",
    "en": "Excessive concern for others."
  },
  {
    "id": "control-28",
    "section": "control",
    "remedy": "Mustard",
    "theme": "меланхолия",
    "ru": "Парализующая меланхолия",
    "en": "Low mood that feels paralyzing."
  },
  {
    "id": "control-29",
    "section": "control",
    "remedy": "Wild Rose",
    "theme": "апатия",
    "ru": "Внутренняя апатия",
    "en": "Inner apathy or indifference."
  },
  {
    "id": "control-30",
    "section": "control",
    "remedy": "Water Violet",
    "theme": "изоляция",
    "ru": "Изоляция, склонность к отступлению",
    "en": "Tendency to isolate or withdraw."
  },
  {
    "id": "control-31",
    "section": "control",
    "remedy": "White Chestnut",
    "theme": "мысли",
    "ru": "Мысленный мусор",
    "en": "Unwanted recurring thoughts."
  },
  {
    "id": "control-32",
    "section": "control",
    "remedy": "Walnut",
    "theme": "неустойчивость",
    "ru": "Неустойчивость",
    "en": "Feeling unstable or without inner grounding."
  },
  {
    "id": "control-33",
    "section": "control",
    "remedy": "Chestnut Bud",
    "theme": "повтор ошибок",
    "ru": "Автоматические ошибки",
    "en": "Making the same mistakes automatically."
  },
  {
    "id": "control-34",
    "section": "control",
    "remedy": "Aspen",
    "theme": "ожидание плохого",
    "ru": "Ожидание чего-то плохого",
    "en": "Expecting something bad to happen."
  },
  {
    "id": "control-35",
    "section": "control",
    "remedy": "Elm",
    "theme": "ответственность",
    "ru": "Чрезмерное чувство ответственности",
    "en": "Excessive sense of responsibility."
  },
  {
    "id": "control-36",
    "section": "control",
    "remedy": "Vine",
    "theme": "претензии, маневры",
    "ru": "Повышенные претензии, стремление к тактическим маневрам",
    "en": "Being demanding or trying to manipulate situations."
  },
  {
    "id": "control-37",
    "section": "control",
    "remedy": "Sweet Chestnut",
    "theme": "безвыходность",
    "ru": "Чувство безвыходности в экстремальных ситуациях",
    "en": "Feeling there is no way out in extreme situations."
  },
  {
    "id": "control-38",
    "section": "control",
    "remedy": "Willow",
    "theme": "озлобленность",
    "ru": "Озлобленность",
    "en": "Bitterness or resentment."
  }
])
export const BACH_REMEDY_NAMES = deepFreeze(["Agrimony","Aspen","Beech","Centaury","Cerato","Cherry Plum","Chestnut Bud","Chicory","Clematis","Crab Apple","Elm","Gentian","Gorse","Heather","Holly","Honeysuckle","Hornbeam","Impatiens","Larch","Mimulus","Mustard","Oak","Olive","Pine","Red Chestnut","Rock Rose","Rock Water","Scleranthus","Star of Bethlehem","Sweet Chestnut","Vervain","Vine","Walnut","Water Violet","White Chestnut","Wild Oat","Wild Rose","Willow"])

const definition = (locale, id, contentHash) => ({
  id,
  key: 'hh-bach-flower',
  version: 'v1',
  instrumentLocale: locale,
  translationVersion: 'hh-author-source-' + locale + '-v1',
  timeframe: 'right-now',
  scoringKey: 'bach-remedies',
  scoringVersion: 'v1',
  resultVersion: 'v1',
  title: locale === 'ru' ? 'Цветочные эссенции Баха · самоанализ' : 'Bach Flower Emotional Self-Reflection',
  source: {
    title: 'Andrey Litvinov — original Bach questionnaire (My Alchemist / report)',
    status: 'author-owned-non-validated-self-reflection',
    citation: 'https://github.com/andylitvinov-design/report/blob/main/src/data/mockData.js',
    reviewedAt: '2026-10-11',
  },
  answerScale: { min: 0, max: 5 },
  responseAnchors: locale === 'ru'
    ? ['Не про меня', 'Едва заметно', 'Иногда', 'Выражено', 'Очень сильно', 'Максимально']
    : ['Not at all', 'A little', 'Sometimes', 'Strongly', 'Very strongly', 'Extremely'],
  questions: BACH_QUESTION_BANK.map(({id,section,ru,en}) => ({
    id,
    text: locale === 'ru' ? ru : en,
    required: true,
    section,
    direction: 'non-normative',
  })),
  optionalContext: [],
  suggestedRepeatDays: 14,
  contentHash,
})

export const BACH_FLOWER_EN_V1 = deepFreeze(definition(
  'en', 'e89664f9-1b9d-43a9-8ade-d0b1effc0512',
  'sha256:9df0414210456a9c0223a118a97e8cfdd40488d8e90496b5de74db046ef4ea7d',
))
export const BACH_FLOWER_RU_V1 = deepFreeze(definition(
  'ru', '0c8af245-93b4-4db7-a5bf-d180bbfbb632',
  'sha256:2a60d7f2bbda2b203bf96baf41176f29750525e78c1971956811c029cb1f2a4c',
))
