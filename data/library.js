const alchemy = {
  sourceSeries: 'Алхимия души',
  category: 'Алхимия души',
  culture: 'Alchemy',
  mediaSeries: 'alchemy',
}

const dao = {
  sourceSeries: 'Даосская алхимия',
  category: 'Даосская традиция',
  culture: 'Dao',
  mediaSeries: 'dao',
}

const maya = {
  sourceSeries: 'Круг Пернатого Змея / mayaismagic',
  category: 'Традиция Майя',
  culture: 'Maya',
  mediaSeries: 'maya',
}

const chapter = (id, title) => ({ id, title })

export const books = [
  {
    ...alchemy,
    id: 'alchemy-homeopathy-foundations',
    title: 'Книга 01. Гомеопатия: основы и метод',
    description: 'Базовая книга из серии «Алхимия души» с вводной рамкой, принципами метода и стартовой логикой работы.',
    cover: 'post_10_01.jpg',
    summary: 'Открывает серию локальных книг по паблику «Алхимия души».',
    originalSourceFile: 'source-books/book-1-alchemy-soul/alchemy_soul_guide_homeopathy_foundations.html',
    status: 'published',
    tags: ['гомеопатия', 'основы', 'метод'],
    chapters: [
      chapter('introduction', 'Введение в метод'),
      chapter('principles', 'Принципы и возможности'),
      chapter('integration', 'Интеграция с другими подходами'),
      chapter('practice', 'Формат работы и практика метода'),
      chapter('materials', 'Дополнительные материалы'),
    ],
  },
  {
    ...alchemy,
    id: 'alchemy-homeopathy-remedies',
    title: 'Книга 02. Гомеопатические препараты и карточки',
    description: 'Практическое продолжение серии с фокусом на препараты, карточки и прикладную навигацию по материалу.',
    cover: 'post_18_01.jpg',
    summary: 'Вторая локальная книга серии «Алхимия души».',
    originalSourceFile: 'source-books/book-1-alchemy-soul/alchemy_soul_guide_homeopathy_remedies.html',
    status: 'published',
    tags: ['гомеопатия', 'препараты', 'карточки'],
    chapters: [chapter('cards', 'Классические карточки препаратов')],
  },
  {
    ...alchemy,
    id: 'alchemy-naturopathy-hormones',
    title: 'Книга 03. Натуропатия: БАДы, минералы и гормональная поддержка',
    description: 'Материал по натуропатическому блоку с акцентом на поддержку, добавки и системное сопровождение.',
    cover: 'post_259_01.jpg',
    summary: 'Третья книга локальной серии «Алхимия души».',
    originalSourceFile: 'source-books/book-1-alchemy-soul/alchemy_soul_guide_naturopathy_hormones.html',
    status: 'published',
    tags: ['натуропатия', 'минералы', 'гормоны'],
    chapters: [
      chapter('support', 'Натуропатия как линия поддержки'),
      chapter('supplements', 'Минералы и добавки'),
      chapter('hormones', 'Гормональная регуляция'),
    ],
  },
  {
    ...alchemy,
    id: 'alchemy-naturopathy-oils',
    title: 'Книга 04. Натуропатия: аромамасла, травы и натуральные носители',
    description: 'Отдельная книга по натуральным носителям, травам и аромамаслам внутри серии «Алхимия души».',
    cover: 'post_117_01.jpg',
    summary: 'Четвертая локальная книга серии.',
    originalSourceFile: 'source-books/book-1-alchemy-soul/alchemy_soul_guide_naturopathy_oils.html',
    status: 'published',
    tags: ['натуропатия', 'аромамасла', 'травы'],
    chapters: [
      chapter('oils', 'Аромамасла как инструмент'),
      chapter('herbs', 'Травы и натуральные носители'),
      chapter('examples', 'Примеры применения'),
      chapter('materials', 'Дополнительные материалы'),
    ],
  },
  {
    ...alchemy,
    id: 'alchemy-bach-foundations',
    title: 'Книга 05. Эссенции Баха: введение и практика',
    description: 'Вводная книга по эссенциям Баха с практической рамкой и структурированным началом темы.',
    cover: 'post_855_01.jpg',
    summary: 'Пятая книга локальной серии «Алхимия души».',
    originalSourceFile: 'source-books/book-1-alchemy-soul/alchemy_soul_guide_bach_foundations.html',
    status: 'published',
    tags: ['эссенции Баха', 'введение', 'практика'],
    chapters: [
      chapter('introduction', 'Введение в линию Баха'),
      chapter('application', 'Как применять и сочетать'),
      chapter('method', 'Бах в общей структуре метода'),
      chapter('observations', 'Практические наблюдения'),
      chapter('materials', 'Дополнительные материалы'),
    ],
  },
  {
    ...alchemy,
    id: 'alchemy-bach-cards',
    title: 'Книга 06. Эссенции Баха: карточки препаратов',
    description: 'Продолжение блока по эссенциям Баха с карточным и справочным материалом.',
    cover: 'post_999_01.jpg',
    summary: 'Шестая локальная книга локальной серии «Алхимия души».',
    originalSourceFile: 'source-books/book-1-alchemy-soul/alchemy_soul_guide_bach_cards.html',
    status: 'published',
    tags: ['эссенции Баха', 'карточки', 'препараты'],
    chapters: [
      chapter('basic', 'Базовые карточки'),
      chapter('balance', 'Карточки баланса и очищения'),
      chapter('crisis', 'Карточки кризиса и опоры'),
    ],
  },
  {
    ...alchemy,
    id: 'alchemy-brain-theory',
    title: 'Книга 07. Работа с мозгом: теория, модели и нейрофизиология',
    description: 'Теоретическая часть блока по работе с мозгом, моделям и нейрофизиологическим основаниям.',
    cover: 'post_897_01.jpg',
    summary: 'Седьмая локальная книга серии «Алхимия души».',
    originalSourceFile: 'source-books/book-1-alchemy-soul/alchemy_soul_guide_brain_theory.html',
    status: 'published',
    tags: ['мозг', 'теория', 'нейрофизиология'],
    chapters: [
      chapter('model', 'Общая модель мозга и подсознания'),
      chapter('inputs', 'Нейрогормональные и телесные входы'),
      chapter('materials', 'Дополнительные материалы'),
    ],
  },
  {
    ...alchemy,
    id: 'alchemy-brain-protocols',
    title: 'Книга 08. Работа с мозгом: диагностика и протоколы',
    description: 'Прикладная часть блока по работе с мозгом: диагностика, протоколы и рабочие схемы.',
    cover: 'post_294_01.jpg',
    summary: 'Восьмая локальная книга серии «Алхимия души».',
    originalSourceFile: 'source-books/book-1-alchemy-soul/alchemy_soul_guide_brain_protocols.html',
    status: 'published',
    tags: ['мозг', 'диагностика', 'протоколы'],
    chapters: [
      chapter('algorithm', 'Алгоритм и этапы восстановления'),
      chapter('matrices', 'Матрицы и диагностика'),
      chapter('protocols', 'Протоколы по центрам и вратам'),
      chapter('effects', 'Эффекты и рабочие комментарии'),
    ],
  },
  {
    ...alchemy,
    id: 'alchemy-services-workflow',
    title: 'Книга 09. Услуги, формат работы и сопровождение',
    description: 'Сводная книга по услугам проекта с описанием подхода, форматов работы, сопровождения и гарантий.',
    cover: 'post_997_01.jpg',
    summary: 'Собирает в одном месте всю рабочую рамку услуг из локальных методичек «Алхимии души».',
    originalSourceFile: 'source-books/book-1-alchemy-soul/alchemy_soul_guide_services_workflow.html',
    status: 'published',
    tags: ['услуги', 'формат работы', 'сопровождение'],
    chapters: [
      chapter('approach', 'Основа подхода'),
      chapter('process', 'Как проходит работа'),
      chapter('services', 'Форматы услуг'),
      chapter('support', 'Сопровождение и гарантии'),
      chapter('sources', 'Источники'),
    ],
  },
  {
    ...dao,
    id: 'dao-alchemy-intro',
    title: '1. Введение в даосскую алхимию',
    description: 'Стартовая книга даосской серии с вводным обзором темы и постановкой общей рамки.',
    cover: 'post_2_1.jpg',
    summary: 'Первая книга локальной серии по даосской алхимии.',
    originalSourceFile: 'source-books/book-2-dao-books/dao_alchemy_intro.html',
    status: 'published',
    tags: ['даосская алхимия', 'введение', 'дао'],
    chapters: [chapter('path', 'Карта пути')],
  },
  {
    ...dao,
    id: 'dao-tradition-temples-symbols',
    title: '2. Даосская традиция, храмы и символический мир',
    description: 'Книга о традиции, храмах и символической карте даосского мира.',
    cover: 'post_12_1.jpg',
    summary: 'Вторая локальная книга серии по даосской алхимии.',
    originalSourceFile: 'source-books/book-2-dao-books/dao_tradition_temples_symbols.html',
    status: 'published',
    tags: ['даосская традиция', 'храмы', 'символы'],
    chapters: [
      chapter('temples', 'Храмы и священные места'),
      chapter('deities', 'Божества и образы'),
      chapter('calendars', 'Календари и культурный контекст'),
      chapter('miscellaneous', 'Разное'),
    ],
  },
  {
    ...dao,
    id: 'dao-magic-basics',
    title: '3. Даосская магия: основы',
    description: 'Базовый том по даосской магии внутри локальной книжной серии проекта.',
    cover: 'post_25_1.jpg',
    summary: 'Третья локальная книга даосской серии.',
    originalSourceFile: 'source-books/book-2-dao-books/dao_magic_basics.html',
    status: 'published',
    tags: ['даосская магия', 'основы', 'практика'],
    chapters: [
      chapter('principles', 'Принципы действия'),
      chapter('inner-work', 'Настройки и внутренняя работа'),
    ],
  },
  {
    ...dao,
    id: 'dao-talismans-symbols',
    title: '4. Талисманы, иероглифы и сакральные знаки',
    description: 'Книга о талисманах, иероглифах и сакральной символике внутри даосской серии.',
    cover: 'post_21_1.jpg',
    summary: 'Четвертая локальная книга даосской серии.',
    originalSourceFile: 'source-books/book-2-dao-books/dao_talismans_symbols.html',
    status: 'published',
    tags: ['талисманы', 'иероглифы', 'знаки'],
    chapters: [
      chapter('talismans', 'Талисманы'),
      chapter('symbols', 'Иероглифы и знаки'),
    ],
  },
  {
    ...dao,
    id: 'dao-rituals-altars',
    title: '5. Ритуалы, алтари и обращения',
    description: 'Материал по ритуальной части, алтарям и обращениям в даосском контексте.',
    cover: 'post_129_1.jpg',
    summary: 'Пятая локальная книга даосской серии.',
    originalSourceFile: 'source-books/book-2-dao-books/dao_rituals_altars.html',
    status: 'published',
    tags: ['ритуалы', 'алтари', 'обращения'],
    chapters: [chapter('rituals', 'Ритуалы и обращения')],
  },
  {
    ...dao,
    id: 'dao-yijing-predictions',
    title: '6. Ицзин и даосские предсказания',
    description: 'Книга по Ицзин и теме даосских предсказаний внутри локальной даосской серии.',
    cover: 'post_80_1.jpg',
    summary: 'Шестая локальная книга даосской серии.',
    originalSourceFile: 'source-books/book-2-dao-books/dao_yijing_predictions.html',
    status: 'published',
    tags: ['ицзин', 'предсказания', 'гексаграммы'],
    chapters: [
      chapter('request', 'Гадание и запрос'),
      chapter('yijing', 'Гексаграммы и Ицзин'),
    ],
  },
  {
    ...dao,
    id: 'dao-healing-basics',
    title: '7. Даосское целительство: основы',
    description: 'Книга по основам даосского целительства и базовым принципам этой линии материалов.',
    cover: 'post_338_1.jpg',
    summary: 'Седьмая локальная книга даосской серии.',
    originalSourceFile: 'source-books/book-2-dao-books/dao_healing_basics.html',
    status: 'published',
    tags: ['целительство', 'дао', 'состояние человека'],
    chapters: [
      chapter('principles', 'Принципы целительства'),
      chapter('state', 'Состояние человека'),
    ],
  },
  {
    ...dao,
    id: 'dao-wuxing-five-elements',
    title: '8. УСИН: пять стихий и состояния',
    description: 'Книга о модели УСИН, пяти стихиях и состояниях внутри даосской серии.',
    cover: 'post_87_1.jpg',
    summary: 'Восьмая локальная книга даосской серии.',
    originalSourceFile: 'source-books/book-2-dao-books/dao_wuxing_five_elements.html',
    status: 'published',
    tags: ['усин', 'пять стихий', 'состояния'],
    chapters: [
      chapter('elements', 'Пять стихий'),
      chapter('organs', 'Органы, эмоции и коррекция'),
    ],
  },
  {
    ...dao,
    id: 'dao-wuxing-model-steps',
    title: '9. Модель ДАО УСИН и ступени развития',
    description: 'Книга про модель ДАО УСИН и ступени развития как отдельная часть даосской библиотеки.',
    cover: 'post_214_1.jpg',
    summary: 'Девятая локальная книга даосской серии.',
    originalSourceFile: 'source-books/book-2-dao-books/dao_wuxing_model_steps.html',
    status: 'published',
    tags: ['дао усин', 'модель', 'ступени развития'],
    chapters: [
      chapter('model', 'О модели'),
      chapter('background', 'Пояснения к модели'),
      chapter('storm', 'Ступень 1. Шторм'),
      chapter('snow-queen', 'Ступень 2. Снежная Королева'),
      chapter('prometheus', 'Ступень 3. Прометей'),
      chapter('fortress', 'Ступень 4. Крепость'),
      chapter('lighthouse', 'Ступень 5. Маяк / Королева в башне'),
      chapter('captain', 'Ступень 6. Капитан'),
      chapter('stream', 'Ступень 7. Ручей'),
      chapter('river', 'Ступень 8. Река'),
    ],
  },
  {
    ...dao,
    id: 'dao-practicum-cases-remedies',
    title: '10. Практикум: диагностика, кейсы, препараты',
    description: 'Практический том серии с диагностикой, кейсами и препаратами.',
    cover: 'post_65_1.jpg',
    summary: 'Десятая локальная книга даосской серии.',
    originalSourceFile: 'source-books/book-2-dao-books/dao_practicum_cases_remedies.html',
    status: 'published',
    tags: ['диагностика', 'кейсы', 'препараты'],
    chapters: [
      chapter('cases', 'Диагностика и кейсы'),
      chapter('remedies', 'Препараты и заметки'),
    ],
  },
  {
    ...maya,
    id: 'maya-egregor-gods',
    title: 'Традиция Майя и Ацтеков. Эгрегор и Боги',
    description: 'Эгрегор традиции, божественные силы, их каналы и авторские настройки в источниковой редакционной компоновке.',
    cover: 'photo_100@06-01-2025_09-34-15.jpg',
    summary: '21 источниково размеченная статья: авторская рамка традиции, боги Майя и Ацтеков, каналы и настройки.',
    originalSourceFile: 'source-books/book-3-maya-tradition/outputs/Maya_Aztec_Egregor_Gods.html',
    status: 'published',
    tags: ['Эгрегор Майя', 'Боги Майя и Ацтеков', 'Каналы Богов'],
    chapters: [
      chapter('egregor', 'I. Эгрегор Майя'),
      chapter('gods', 'II. Боги и божественные силы Майя и Ацтеков'),
    ],
  },
  {
    ...maya,
    id: 'maya-calendar',
    title: 'Энергии Календаря Майя',
    description: 'Отдельный цикл материалов о календаре, времени, периодах и энергии дней Майя.',
    cover: 'photo_54@19-10-2024_00-05-38.jpg',
    summary: '41 источниково размеченный материал календарного цикла, включая отдельные энергии дней.',
    originalSourceFile: 'source-books/book-3-maya-tradition/outputs/Maya_Calendar_Energies.html',
    status: 'published',
    tags: ['Календарь', 'время', 'энергия дней'],
    chapters: [
      chapter('calendar', 'VII. Календарь и энергия дней'),
    ],
  },
  {
    ...maya,
    id: 'maya-exorcism',
    title: 'Экзорцизм в Традиции Майя. Настройки и энергии',
    description: 'Настройки, каналы, помощники и практические авторские формы работы с энергиями Майя и Ацтеков.',
    cover: 'photo_110@06-01-2025_09-34-27.jpg',
    summary: '18 источниково размеченных материалов главы «Настройки и энергии Майя и Ацтеков».',
    originalSourceFile: 'source-books/book-3-maya-tradition/outputs/Maya_Exorcism_Settings_Energies.html',
    status: 'published',
    tags: ['Настройки', 'энергии Майя и Ацтеков', 'каналы', 'помощники'],
    chapters: [
      chapter('settings', 'III. Настройки и энергии Майя и Ацтеков'),
    ],
  },
  {
    ...maya,
    id: 'maya-mysteries',
    title: 'Мистерии Майя',
    description: 'Мифология, Шибальба, инициация, ритуал, священные места, двойники и авторские архетипические модели.',
    cover: 'photo_105@06-01-2025_09-34-25.jpg',
    summary: '42 источниково размеченные статьи о мистериях, местах, материальной культуре и авторских моделях.',
    originalSourceFile: 'source-books/book-3-maya-tradition/outputs/Maya_Mysteries.html',
    status: 'published',
    tags: ['Мифология', 'Шибальба', 'инициация', 'ритуал', 'двойники', 'авторские модели'],
    chapters: [
      chapter('mythology', 'IV. Мифология, Шибальба, инициация и ритуал'),
      chapter('places', 'V. Места, храмы и материальная культура'),
      chapter('mysteries', 'VI. Мистерии, двойники и авторские модели'),
    ],
  },
]

export function getBookById(bookId) {
  return books.find((book) => book.id === bookId)
}

export function getBooksByCategory(category) {
  return books.filter((book) => book.category === category)
}

export function getPopulatedCategories(records = books) {
  return [...new Set(records.map((book) => book.category).filter(Boolean))]
}

export function filterLibraryBooks(records = books, { category, query } = {}) {
  const normalizedQuery = query?.trim().toLocaleLowerCase() ?? ''

  return records.filter((book) => {
    const matchesCategory = !category || category === 'all' || book.category === category
    if (!matchesCategory) return false

    if (!normalizedQuery) return true

    const searchableText = [
      book.title,
      book.description,
      book.summary,
      ...book.tags,
      ...book.chapters.map((item) => item.title),
    ].join(' ').toLocaleLowerCase()

    return searchableText.includes(normalizedQuery)
  })
}

export function searchBooks(query) {
  return filterLibraryBooks(books, { query })
}
