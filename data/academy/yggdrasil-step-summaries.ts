export type YggdrasilStepSummary = {
  en: string;
  ru: string;
  source: string;
};

const SOURCE_STRUCTURE = "https://reiki-yggdrasil.com/rejki-iggdrasil/struktura.html";
const SOURCE_PROGRAM_EN = "https://psitrends.com/studies/adv/prog-taory";

export const yggdrasilStepSummaries: Record<string, YggdrasilStepSummary> = {
  "RY-L01-S01": {
    en: "The first level combines Treatment, Intuition, Protection and Work on Situation. On the original school site it is presented as the practical entry level: healing-oriented work with the Reiki Yggdrasil stream, intuitive decision-making, protection from external influence and applying the practice to a concrete life situation.",
    ru: "Первая ступень объединяет настройки «Лечение», «Интуиция», «Защита» и «Работа с ситуацией». На исходном сайте школы она описана как практический вход в систему: целительская работа с потоком, развитие интуитивного выбора, защита от внешнего воздействия и применение настроек к конкретной жизненной ситуации.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L01-S02": {
    en: "The second level is built around charging objects, cleansing people and spaces, releasing destructive connections and working with the money stream. The historical course description treats these as one practical block about clearing what interferes, creating charged objects and working more consciously with material resources.",
    ru: "Вторая ступень строится вокруг зарядки предметов, очищения человека и пространства, разрушения деструктивных связей и работы с денежным потоком. В историческом описании это единый практический блок: убрать мешающие структуры, научиться создавать заряженные предметы и осознаннее работать с материальным ресурсом.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L01-S03": {
    en: "The third level gathers eight attunements: Predestination, Emotion, Activation, Power, Sexuality, Flight, Intellect and Karma. The source page presents it as a broad social-and-personal development level concerned with direction in life, emotional balance, vitality, confidence, sexuality, learning, dream/flight practices and work with karmic patterns.",
    ru: "Третья ступень объединяет восемь настроек: «Предназначение», «Эмоция», «Активизация», «Власть», «Сексуальность», «Полёт», «Интеллект» и «Карма». На исходном сайте это широкий уровень личной и социальной проявленности: жизненный вектор, эмоциональное равновесие, энергия и уверенность, сексуальность, обучение, практики полёта/сновидения и работа с кармическими паттернами.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L01-S04": {
    en: "The fourth level is the perception-focused part of the Basic Course. Its four attunements — Clairvoyance, Previous Lives, Making Situation and Knowledge — are described on the source site as work with the ‘third eye’, symbolic perception of past and future, access to remembered skills and information, and deliberate creation of a needed situation.",
    ru: "Четвёртая ступень — блок восприятия в Базовом курсе. Четыре настройки — «Виденье», «Прошлые жизни», «Создать ситуацию» и «Знания» — на исходном сайте связаны с работой «третьего глаза», символическим восприятием прошлого и будущего, доступом к прежним навыкам и информации и созданием нужной ситуации.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L01-S05": {
    en: "The fifth level completes the Basic Course with Connection with the World and Connection with the Gods. The original school description frames it as an expansion-of-consciousness level, including connection with the Earth/world field and work with qualities represented by different pantheons; historical versions also mention Blocking and Connection with the Teacher.",
    ru: "Пятая ступень завершает Базовый курс настройками «Связь с Миром» и «Связь с Богами». На исходном сайте она описана как уровень расширения сознания, связи с полем Земли/Мира и работы с качествами различных пантеонов; в исторических версиях также упоминаются «Блокирующая частота» и «Связь с Учителем».",
    source: SOURCE_STRUCTURE,
  },

  "RY-L02-S01": {
    en: "The Healing block takes its name from the idea of becoming ‘whole’. It combines Chakras, Wu Xing, Meridians and Hypnosis: the source site describes work with subtle bodies and chakras, synchronisation with seasonal and daily rhythms through Chinese-medicine models, meridian practice, and contact with the subconscious for fixing new patterns.",
    ru: "Блок «Целительство» объясняется на исходном сайте через идею «целого, цельного» человека. Он объединяет «Чакры», «У-Син», «Меридианы» и «Гипноз»: работу с тонкими телами и чакрами, синхронизацию с сезонными и суточными ритмами через модели китайской медицины, меридианную практику и контакт с подсознанием для фиксации новых установок.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L02-S02": {
    en: "The Golden Calf block is the financial-and-social part of the Instructor Course. Its three attunements — Golden Calf, Money & Chakras and V.I.P. — are presented in the source as work with money/social egregores, receiving and attracting money on different levels of consciousness, and confidence/status in the field of business people.",
    ru: "«Золотой Телец» — финансово-социальный блок Инструкторского курса. Его три настройки — «Золотой Телец», «Деньги и чакры» и «V.I.P.» — на исходном сайте описаны как работа с денежными и социальными эгрегорами, принятием денег на разных уровнях сознания и уверенностью/статусом в поле деловых людей.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L02-S03": {
    en: "The Man & Woman block is about finding an effective pattern of interaction with a person or group. The source page links Archetypes, Tantra, Attunement and Easy Communication with choosing an appropriate behaviour model, strengthening attraction, synchronising partners and making communication feel freer and more natural.",
    ru: "Блок «Мужчина и Женщина» посвящён поиску оптимального алгоритма взаимодействия с человеком или группой. На исходном сайте «Архетипы», «Тантра», «Сонастройка» и «Лёгкое общение» связаны с подбором модели поведения, усилением притяжения, сонастройкой партнёров и более свободным, естественным общением.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L02-S04": {
    en: "Life Force connects the practitioner, in the course’s language, with the natural level of the Earth: plants, animals, totems and the feeling of vitality. The block includes Life-Flow Activation, Fetch, Fountain of Life and Love & Compassion, moving from basic replenishment toward connection with nature and a wider field of life.",
    ru: "«Жизненная сила» в терминологии курса связывает практикующего с природным уровнем Земли: растениями, животными, тотемами и ощущением жизненности. Блок включает «Активацию жизненного потока», «Fetch», «Фонтан жизни» и «Любовь и сострадание» — от наполнения ресурсом к связи с природой и более широким полем жизни.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L02-S05": {
    en: "The Sexual Energy block is explicitly described as based on Taoist and tantric techniques. Its five attunements work with cleansing the sexual sphere, activating sexual centres, transforming and raising sexual energy, and the Yoni–Lingam practice; the emphasis of the historical course is on learning to accumulate, transform and direct this life-force.",
    ru: "Блок «Сексуальная энергетика» прямо описан как основанный на даосских и тантрических техниках. Пять настроек посвящены очищению сексуальной сферы, активизации сексуальных центров, трансформации и подъёму энергии и практике «Йони–Лингам»; исторический курс делает акцент на умении накапливать, преобразовывать и направлять эту жизненную силу.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L02-S06": {
    en: "Fireball is presented as a method of moving specific energies through body and consciousness so they can be accumulated or directed outward. The step combines Energy Circles, Fireball on the Chakras and Assemblage Point, focusing on circulation, concentration of energy and shifting the state of consciousness through the chakra model.",
    ru: "«Файербол» описан как способ проводить определённые энергии через тело и сознание, накапливая их или направляя вовне. Ступень объединяет «Энергетические круги», «Файербол по чакрам» и «Точку сборки» — то есть циркуляцию, концентрацию энергии и изменение состояния сознания через чакральную модель.",
    source: SOURCE_STRUCTURE,
  },

  "RY-L03-S01": {
    en: "This step introduces work with collective spiritual fields and protective/healing archetypes. The four settings — Egregores, Exorcism, Guardian Angel and Healer — cover conscious connection with a chosen egregore, cleansing from unwanted influences, the guardian-angel channel and healing-oriented work through the hands and subtle levels.",
    ru: "Эта ступень вводит работу с коллективными духовными полями и защитно-целительскими архетипами. Четыре настройки — «Эгрегоры», «Экзорцизм», «Ангел-Хранитель» и «Хилер» — охватывают осознанное подключение к выбранному эгрегору, очищение от мешающих влияний, канал Ангела-Хранителя и целительскую работу через руки и тонкие уровни.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L03-S02": {
    en: "Egyptian Magic is organised around the traditional subtle-body vocabulary HAT, KA, BA, AB/EB, KHAIBIT, KHU, SAHU, SEKHEM and REN. In the course these settings form a map from physical embodiment and emotional motivation through attention, event structure, memory/light and integration, ending with power/process and the name as a stabilising identity structure.",
    ru: "«Египетская магия» построена вокруг традиционной модели тонких тел: ХАТ, КА, БА, ЭБ/АБ, ХАЙБИТ, ХУ, САХУ, СЕКХЕМ и РЕН. В программе эти настройки образуют последовательную карту от телесного воплощения и эмоциональной мотивации через внимание, событийность, память/светимость и интеграцию — к силе процесса и имени как структуре идентичности.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L03-S03": {
    en: "The Zodiac / Greek Magic step works with planetary and zodiac archetypes. Planets and Constellations are used as symbolic qualities, Adam Kadmon integrates them into the person’s energetic model, Geniuses correspond to zodiac signs, and Ophanim are linked in the source material with future variants and the shaping of events.",
    ru: "Ступень «Зодиак / Греческая магия» работает с планетарными и зодиакальными архетипами. «Планеты» и «Созвездия» используются как качества, «Адам Кадмон» встраивает их в энергетическую модель человека, «Гении» связаны со знаками Зодиака, а «Офонимы» в исходных материалах — с вариантами будущего и формированием событий.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L03-S04": {
    en: "Toltec Magic is centred on attention, intention and dreamwork. Its four settings — Intention, Second Attention, Wheel of Time and Gates of Dreaming — form a compact sequence from directing will and perception to working with event trajectories and lucid-dreaming / alternative-probability practices.",
    ru: "«Толтекская магия» сосредоточена на внимании, намерении и сновидческой практике. Четыре настройки — «Намерение», «Второе внимание», «Колесо времени» и «Врата сновидения» — выстраивают последовательность от управления волей и восприятием к работе с событийными траекториями и осознанными сновидениями/альтернативными вероятностями.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L03-S05": {
    en: "The Sufism step contains three settings: Teachers, Dhikr and Body of Light. The source material presents them as contact with spiritual teachers, rhythmic practice with sacred names, and a contemplative ‘light body’ practice connected with subtler states of consciousness.",
    ru: "Ступень «Суфизм» включает три настройки: «Учителя», «Зикр» и «Тело Света». В исходных материалах это обращение к духовным учителям, ритмическая практика с именами и созерцательная практика «Тела Света», связанная с более тонкими состояниями сознания.",
    source: SOURCE_STRUCTURE,
  },

  "RY-L04-S01": {
    en: "Chinese Medicine 1 introduces the course’s energetic reading of Yin and Yang, organ qualities, Qi and the climatic factors Wind, Heat, Dampness, Dryness and Cold. The final Balancing setting brings these elements together, so the step functions as the basic energetic map of the Chinese-medicine branch.",
    ru: "«Китайская медицина 1» вводит энергетическую модель Инь и Ян, качеств органов, Ци и климатических факторов — Ветра, Жара, Влажности, Сухости и Холода. Завершающая «Балансировка» связывает их в одну систему, поэтому эта ступень служит базовой картой китайско-медицинской ветви курса.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L04-S02": {
    en: "Chinese Medicine 2 moves from general Yin/Yang qualities to the traditional organ-spirit model: Shen, Hun, Po, Zhi and Yi. It then adds Animals of the Organs and Animals of the Meridians, using symbolic ‘spirit’ and animal images to work with organ and meridian functions in the course’s energetic framework.",
    ru: "«Китайская медицина 2» переходит от общих Инь/Ян качеств к традиционной модели духов органов: Шень, Хунь, По, Чжи и И. Затем добавляются «Животные органов» и «Животные меридианов» — символические образы для работы с функциями органов и меридианов в энергетической модели курса.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L04-S03": {
    en: "The I Ching / Zhou Yi step is built from Bagua, trigrams and hexagrams. The course uses them for reading the structure of change, choosing a symbolic quality for a situation, initiating a desired process, and creating Bagua/Zhou-Yi protective patterns around the work.",
    ru: "Ступень «И Цзин / Чжоу-И» построена вокруг Багуа, триграмм и гексаграмм. В программе они используются для чтения структуры перемен, выбора нужного качества для ситуации, запуска процесса изменений и построения защитных схем Багуа/Чжоу-И.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L04-S04": {
    en: "The Kundalini step combines four elements of the Indian/Tibetan-inspired branch: Kundalini, Burning the Implant, Tattva and Gods. The material links Kundalini with chakra work, Tattvas with elemental processes, and divine figures with archetypal forces associated with different centres and masculine/feminine principles.",
    ru: "Ступень «Кундалини» объединяет четыре элемента индийско-тибетской ветви: «Кундалини», «Сжигание вставки», «Татва» и «Боги». В материалах Кундалини связана с чакральной работой, Татвы — со стихиями, а божественные фигуры — с архетипическими силами разных центров и мужским/женским принципами.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L04-S05": {
    en: "Money Magic is a three-stage financial-flow practice in the historical curriculum. The sequence moves from sensitivity to money flows, to observing financial connections and movement, and then to symbolic work with increasing or changing the available financial resource.",
    ru: "«Денежная магия» — трёхступенчатая работа с финансовыми потоками в исторической программе. Последовательность идёт от чувствительности к движению денег к наблюдению финансовых связей и затем к символической работе с увеличением или изменением доступного материального ресурса.",
    source: SOURCE_PROGRAM_EN,
  },

  "RY-L05-S01": {
    en: "Major Arcana is the first Tarot/Kabbalah step. The four settings move from entering the state of an Arcana, to its ‘angel’ or consciousness, to individual glyphs, and finally to applying an Arcana to a selected chakra — a progression from whole archetype to specific symbolic components and focused use.",
    ru: "«Великие Арканы» — первая ступень ветви Таро/Каббалы. Четыре настройки идут от входа в состояние Аркана к его «Ангелу»/сознанию, затем к отдельным глифам и, наконец, к применению энергии Аркана к выбранной чакре — от целого архетипа к его элементам и точечной работе.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L05-S02": {
    en: "The Powers of the Elements step uses Fire, Earth, Water and Air as four different modes of work. In the source material Fire is linked with present energy and vision, Earth with structure and the material plane, Water with the past and tradition, and Air with the future, alternatives and event probabilities.",
    ru: "Ступень «Силы стихий» использует Огонь, Землю, Воду и Воздух как четыре разных режима работы. В исходных материалах Огонь связан с настоящим, энергией и видением; Земля — со структурой и материальным планом; Вода — с прошлым и традицией; Воздух — с будущим, вариантами и вероятностями событий.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L05-S03": {
    en: "The Tree of Sephiroth step works with Sephiroth, their Archangels and angelic Orders. It is presented as a way to study the quality and direction associated with a Sephirah, deepen that quality through its archangelic image, and then work with a corresponding order for teaching, protection or support.",
    ru: "Ступень «Дерево Сефирот» работает с Сефирами, их Архангелами и Чинами. В программе это способ изучить качество и направление конкретной Сефиры, углубить его через образ Архангела и затем обратиться к соответствующему Чину за обучением, защитой или поддержкой.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L05-S04": {
    en: "Higher Arcana uses the court hierarchy Page, Knight/Prince, Queen and King as four stages of elemental expression. The source describes them respectively as potential, more material manifestation/action, information and analysis, and authority over the process.",
    ru: "«Высшие Арканы» используют иерархию Паж — Валет/Князь — Дама — Король как четыре уровня проявления стихии. В исходном описании это соответственно потенциал, более материальное действие, информация и анализ, а затем власть/управление процессом.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L05-S05": {
    en: "Tarot Divination is the practical reading step of the Tarot branch. It combines work with card meanings and a divination practice aimed at reading the development of a situation, clarifying the client’s question and training intuitive interpretation.",
    ru: "«Предсказания в Таро» — практическая ступень чтения Таро. Она объединяет работу со значениями карт и предсказательную практику для понимания развития ситуации, уточнения запроса человека и тренировки интуитивной интерпретации.",
    source: SOURCE_STRUCTURE,
  },

  "RY-L06-S01": {
    en: "The first runic step teaches the basic grammar of the runic branch: individual Runes, Rune Groups, Rune Combinations and Runic Planning. It progresses from sensing one rune’s quality to working with groups, composing formulas and using runic symbolism to structure goals and actions.",
    ru: "Первая руническая ступень задаёт базовую «грамматику» направления: отдельные «Руны», «Группы рун», «Комбинации рун» и «Рунное планирование». Логика идёт от качества одной руны к группам, собственным формулам и использованию рунической символики для структурирования целей и действий.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L06-S02": {
    en: "The Worlds of Yggdrasil step treats the nine worlds — Hel, Svartalfheim, Muspelheim, Vanaheim, Midgard, Jotunheim, Niflheim, Alfheim and Asgard — as distinct archetypal environments. Each world is associated in the course with a different field such as ancestry, material resource, creativity, nature, society, communication, choice, imagination or divine symbolism.",
    ru: "Ступень «Миры Древа Иггдрасиль» рассматривает девять миров — Хель, Свартальхейм, Муспельхейм, Ванахейм, Мидгард, Йотунхейм, Нифельхейм, Альфхейм и Асгард — как разные архетипические пространства. В курсе каждый мир связан со своей областью: родом, материальным ресурсом, творчеством, природой, социумом, коммуникацией, выбором, воображением или божественной символикой.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L06-S03": {
    en: "Circle of Power is the applied protection-and-restoration block of the runic program. It combines runic and elemental protection, the Circle of Power itself, runic and elemental healing, Drápa ritual-poetic work and Mansöngur/connection practices — a toolkit for structuring a field, restoring resource and working with connections.",
    ru: "«Круг Силы» — прикладной защитно-восстановительный блок рунической программы. Он объединяет рунические и стихийные защиты, собственно «Круг Силы», руническое и стихийное целительство, Драпу и практики связей/Мансёк — набор инструментов для структурирования поля, восстановления ресурса и работы с контактами.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L06-S04": {
    en: "Runic Divination treats runes as keys to information. The three settings — Runes as Keys, Decoding Runes and Choosing a Path — move from opening a symbolic flow, through interpreting its instruction, to using that reading to choose a direction.",
    ru: "«Руническое предсказание» рассматривает руны как ключи к информации. Три настройки — «Руны как ключи», «Расшифровка рун» и «Выбор пути» — идут от открытия символического потока через его интерпретацию к использованию полученного чтения для выбора направления.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L06-S05": {
    en: "Runic Healing combines the runic system with the meridian model used elsewhere in the course. One setting maps runes to organs and main meridians; the second works with rune groups and extraordinary meridians, creating a bridge between the runic and Chinese-energy branches.",
    ru: "«Руническое исцеление» соединяет руническую систему с меридианной моделью курса. Одна настройка связывает руны с органами и основными меридианами, вторая — группы рун с чудесными меридианами, создавая мост между рунической и китайско-энергетической ветвями.",
    source: SOURCE_STRUCTURE,
  },

  "RY-L07-S01": {
    en: "Teleport / Astral Flight / Clairvoyance develops the course’s visionary-travel model through Astral Double, Journeys, Elements and Hyperspace. The sequence moves from forming a stable double to travelling through space/time imagery, entering elemental worlds and constructing or exploring symbolic hyperspace.",
    ru: "«Телепорт / Астральный полёт / Ясновидение» развивает модель визионерских путешествий через «Астрального двойника», «Путешествия», «Стихии» и «Гиперпространство». Последовательность идёт от формирования устойчивого двойника к путешествиям в образах пространства/времени, входу в миры стихий и работе с символическим гиперпространством.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L07-S02": {
    en: "Machine Hall is a constructed inner workspace used in the course for complex symbolic tasks. Its parts — the Hall itself, Terminals, Communication Screen, Flying Platform and Doors — organise different functions: working with programmed processes, receiving information, travel imagery and switching between states or layers of consciousness.",
    ru: "«Машинный зал» — сконструированное внутреннее рабочее пространство для сложных символических задач. Его элементы — сам Зал, Терминалы, Экран связи, Летающая платформа и Двери — разделяют разные функции: работу с программируемыми процессами, получение информации, образы путешествия и переключение между состояниями/слоями сознания.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L07-S03": {
    en: "The Ifrits step is specifically about creating differentiated energetic-information helpers, not one generic ‘ifrit’ practice. The course distinguishes protective and elemental ifrits, an information helper, guides, regulators, guardians, task helpers, universal helpers and a Guardian of the Lineage — each with a defined function.",
    ru: "Ступень «Ифриты» посвящена именно созданию разных энергоинформационных помощников, а не одной общей практике «ифрита». В программе отдельно выделены защитные и стихийные ифриты, информационный помощник, проводники, регуляторы, хранители, помощники для задач, универсальные ифриты и Хранитель Рода — у каждого своя функция.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L07-S04": {
    en: "Slavic Magic 1 combines Kresenie, Enchanted Word, Removing the Gvura and Offerings/Praises. The source material links these to untangling emotional blockages, creating verbal formulas, clearing the core of an unwanted influence and ritual relationship with gods and elemental forces of the Slavic tradition.",
    ru: "«Славянская магия 1» объединяет «Кресение», «Заговорное слово», «Снятие Гвуры» и «Требы и Славления». В исходных материалах это работа с эмоциональными блоками, создание словесных формул, очищение ядра нежелательного воздействия и ритуальные отношения с богами и стихийными силами славянской традиции.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L07-S05": {
    en: "Slavic Magic 2 is built around Vedagon, Alatyr Stone, Dead Water, Living Water, Returning the Soul and Ancestors. The sequence uses Slavic mythic images for guidance, information, cleansing, replenishment, reintegration of ‘lost’ parts and connection with the ancestral field.",
    ru: "«Славянская магия 2» строится вокруг Ведагона, Алатырь-камня, Мёртвой воды, Живой воды, «Возвращения души» и Предков. Последовательность использует славянские мифологические образы для сопровождения, информации, очищения, наполнения, реинтеграции «утраченных» частей и связи с родовым полем.",
    source: SOURCE_STRUCTURE,
  },
  "RY-L07-S06": {
    en: "The Civilisations step uses a chosen ‘civilisation’ as a symbolic development model. Its settings cover entering that model, interrupting automatic reactions after a perceived energetic hit, cultivating a civilisation’s characteristic qualities and working with its ‘siddhis’ as the strongest expression of those qualities.",
    ru: "Ступень «Цивилизации» использует выбранную «цивилизацию» как символическую модель развития. Настройки включают вход в эту модель, прерывание автоматической реакции после воспринимаемого энергетического удара, развитие характерных качеств цивилизации и работу с её «сиддхами» как максимальным выражением этих качеств.",
    source: SOURCE_STRUCTURE,
  },
};

export function yggdrasilStepSummary(stepId: string, locale: "en" | "ru" | "es") {
  const summary = yggdrasilStepSummaries[stepId];
  if (!summary) return "";
  return locale === "ru" ? summary.ru : summary.en;
}
