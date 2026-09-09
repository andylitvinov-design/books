import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const inventoryPath = path.join(projectRoot, 'data', 'remedy-source-inventory.csv')
const ruDirectory = path.join(projectRoot, 'content', 'remedies', 'ru')
const enDirectory = path.join(projectRoot, 'content', 'remedies', 'en')

function parseCsvLine(line) {
  const cells = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      cells.push(value)
      value = ''
    } else {
      value += character
    }
  }

  cells.push(value)
  return cells
}

function readConfirmedInventory() {
  const [headerLine, ...lines] = readFileSync(inventoryPath, 'utf8').trim().split('\n')
  const header = parseCsvLine(headerLine)
  return lines
    .map((line) => Object.fromEntries(header.map((column, index) => [column, parseCsvLine(line)[index] ?? ''])))
    .filter(({ candidate_status: status }) => status === 'confirmed')
}

function escapeFrontmatter(value) {
  return String(value).replace(/\n/g, ' ').trim()
}

function markdown(metadata, description) {
  return `---\n${Object.entries(metadata)
    .map(([key, value]) => {
      const escaped = escapeFrontmatter(value)
      return escaped ? `${key}: ${escaped}` : `${key}:`
    })
    .join('\n')}\n---\n\n${description}\n`
}

// These are verbatim, non-prescriptive author-description fragments selected from
// the inventory-cited primary HTML. They deliberately exclude dose, potency,
// regimen, and selection instructions.
const sourceDescriptions = {
  'natrum-muriaticum': 'По сути, это виврация простой соли. Соль имеет эффект ссушивания. Этот препарат хорошо помогает, когда человек "иссыхается изнутри". Эффективен при чувствах cплина, грусти, ненужности, покинутости.',
  'ignatia-amara': 'Интересно, что именно эти энергии помогают, когда внутренняя боль накапливается и не может быть выражена. Этот препарат полезен для сильных женщин, которые держат в себе боль и горе. Он помогает перепрожить утраты и обиды.',
  cantharis: 'А с точки зрения психотерапии, оно хорошо устраняет "внутренний зуд", нервозность, нетерпеливость. Добавляет внутреннего спокойствия и достоинства.',
  opium: 'Он отлично работает для повышения мощности и активности сознания!',
  sulphur: 'Имеет интересный эффект. Он стабилизирует, когда все кипит внутри. Особенно мысли. Полезен, когда внутри и снаружи хаос, беспорядок. Когда хочется большего, а это не получается. Когда человек живет в голове, в мыслях, тревогах.',
  'baryta-carbonica': 'Препарат оказался очень эффективен для проработки ранних травм детства.',
  'urtica-urens': 'Архетип: Огненный Страж, Чувствительный Борец.',
  'ferrum-phosphoricum': 'Расстановка показала причина: страх контроля, ответственности. Важно укрепить внутреннее ядро, но стандартные препараты не давали должного эффекта. Активность была не высокая.',
  lachesis: 'Препарат для ярких, огненных женщин, которые часто экспрессивны и иногда готовы испепелить все вокруг своими эмоциями.',
  gelsemium: 'GELSEMIUM Препарат, ценный в ситуации слабости, страха, физического и эмоционального истощения.',
  pulsatilla: 'PULSATILLA Препарат, который подходят нежным, искренним людям, у которых душа ищет любви, заботы, поддержки. СИМВОЛ Нежный, мягкий, хрупкий цветок, колышущийся ветром, ищущий солнечного тепла.',
  'rhus-toxicodendron': 'RHUS TOXICODENDRON Помогает активировать силы, движение, снять скованность и при этом обрести гибкость и расслабленность.',
  'arsenicum-album': 'Обычно это говорит о том, что психика пока недостаточно справляется. Необходимость удерживать жизнь под контролем занимает уйму личного ресурса. И препарат помогает решить эту ситуацию.',
  'calcarea-carbonica': 'Он помогает клиентам мягко сделать шаг вперед в период страхов и ограничений.',
  'kalium-sulphuricum': 'Это тот препарат, который помогает выйти из "болота" жизни, старых ненужных связей и ограничений. Пепарат подходит в ситуациях, когда вы чувствуете себя ограниченными, изолированными, с недостатком тепла и любви, и у вас нет сил что-то изменить в жизни.',
  'coffea-cruda': 'Препарат, который стабилизирует нервное возбуждение ума, чувств. А с другой стороны он добавляет активности, если ее не хватает.',
  'avena-sativa': 'Это еще один препарат, который меня увлек. Работая с клиентами мне понравилось, какую он дает стремительность двигаться вперед. Он несет увлеченность, интерес, желание что-то созидать. В нем сладкая сила пробуждающегося ростка.',
  'kalium-phosphoricum': 'Отлично показал себя этот препарат в ситуациях, когда все пропало, хочется спрятаться и не взаимодействовать с миром. Препарат дает ощущение своей личной силы, гордости, самоуверенности.',
  'antimonium-crudum': 'Интересный препарат, катализатор в Алхимии. Он способствует очищению металлов и духовному очищению. Его представляют как волк, который охраняет золото (просветление).',
  'argentum-nitricum': 'Это ценный препарат, который мы применяем на средних стадиях терапии. Он актуален, когда у вас уже есть определенная уверенность в себе, но вы теряетесь перед лицом особых, ответственных событий.',
  causticum: 'CAUSTICUM Еще один глубокий препарат, который возвращает чувство правды и достоинства, даже если вас не ценят и кажется, что весь мир против вас. Препарат помогает выстоять в агрессивной среде и укрепить Силу Духа, Силу Личности.',
  mezereum: 'MEZEREUM (Вольчье лыко, кустарник). Препарат обожженного сердца.',
  'lac-humanum': 'Очень особый препарат. Препарат актуален в ситуациях, когда внутри человека зияет дыра непринадлежности.',
  'lac-asinum': 'Недавно я начал работать ослиным молоком. Этот чудный препарат возвращает открытость к жизни! Он выводит из чувства жертвы и бессилия.',
  'kali-carbonicum': 'Это препарат, который добавляет социальной смелости.',
  'cenchris-contortrix': 'Этот препарат - как пробуждение вулкана. Он запускает внутри огненную энергию, которая наполняет, напитывает',
  testosteronum: 'Начинаю работать с препаратом гомеопатии на основе тестостерона - Testosteronum.',
  oophorinum: 'Он дает состояние особой внутренней полноты, гармонии, достатка. Все благополучно, все есть, все спокойно. Это близко к образу 3го аркана Таро.',
  'bach-vine': 'Имеет довольно яркий эффект. Подходит для сильных, волевых людей, которые все контролируют, но при этом их жизненная сила, энергия начинает сжиматься и таять. Опыт показывает, препарат дает вздох облегчения.',
  'bach-crab-apple': 'Препарат BACH CRAB APPLE Имеет мягкий, очищающий и очень гармонизирующий эффект. Подходит людям, которые переживают чувство внутренней нечистоты, стыда или смущения, ощущают, что «со мной что-то не так».',
  'bach-oak': 'Имеет глубокий стабилизирующий и поддерживающий эффект. Подходит людям сильным, ответственным и выносливым, которые привыкли нести нагрузку и не останавливаться, даже когда силы уже на исходе.',
  'bach-hornbeam': 'СУТЬ Это энергия граба. Лёгкое, живое дерево с очень плотной и прочной древесиной. Снаружи — мягкость и гибкость. Внутри — собранность и сила.',
  'bach-wild-oat': 'СУТЬ Это энергия дикого овса. Он растёт свободно, без правил, без строгих линий. СМЫСЛ Это та энергия, которая позволяет сделать первый шаг, начать действововать.',
  'bach-elm': 'СУТЬ Это энергия вяза. Сильное, зрелое дерево, которое держит пространство и выдерживает большие нагрузки. Это энергия ответственности, масштаба и опоры.',
  'rock-rose': 'СУТЬ Это энергия скального цветка. Маленькое растение, которое растёт в суровых условиях — на камнях, под солнцем и ветром. Хрупкое снаружи, но внутри — чистая сила жизни и мгновенная мобилизация.',
  'star-of-bethlehem': 'СУТЬ Препарат мягко собирает и гармонизирует внутреннее состояние. Это энергия утешения, восстановления и исцеления после шока.',
  'bach-sweet-chestnut': 'По опыту данный препарат несёт состояние некого просветления, возвышается вибраций человека. СУТЬ Это энергия сладкого каштана. Дерево, которое проходит через сильное внутреннее напряжение и раскрывается после него.',
  'bach-cerato': 'СУТЬ Это энергия церато — растения с тонкими, устремлёнными вверх цветами. Оно тянется к свету, но при этом как будто не до конца удерживает свою ось.',
}

// Direct English translations of the Russian source fragments above. No English
// materia medica was consulted or introduced.
const translations = {
  'natrum-muriaticum': 'In essence, this is the vibration of ordinary salt. Salt has a drying effect. This remedy is described as helping when a person is “drying up inside,” amid feelings of melancholy, sadness, uselessness, or abandonment.',
  'ignatia-amara': 'It is interesting that these very energies help when inner pain accumulates and cannot be expressed. This remedy is described as useful for strong women who hold pain and grief inside; it helps them live through losses and resentments again.',
  cantharis: 'From a psychotherapeutic point of view, it is described as easing an “inner itch,” nervousness, and impatience, and as adding inner calm and dignity.',
  opium: 'It is described as working very well to increase the strength and activity of consciousness.',
  sulphur: 'It is described as having an interesting effect: it stabilizes a person when everything is boiling inside, especially thoughts. It is presented for inner and outer chaos, disorder, frustrated longing, and life lived in the head, thoughts, and anxieties.',
  'baryta-carbonica': 'The remedy is described as very effective for working through early childhood trauma.',
  'urtica-urens': 'Archetype: the Fiery Guardian, the Sensitive Fighter.',
  'ferrum-phosphoricum': 'The constellation showed a cause: fear of control and responsibility. It was important to strengthen the inner core, yet the standard remedies did not give the desired effect and activity remained low.',
  lachesis: 'A remedy for vivid, fiery women who are often expressive and at times ready to burn everything around them with their emotions.',
  gelsemium: 'GELSEMIUM is described as a remedy of value in situations of weakness, fear, and physical and emotional exhaustion.',
  pulsatilla: 'PULSATILLA is described for gentle, sincere people whose soul seeks love, care, and support. Its symbol is a tender, soft, fragile flower swaying in the wind and seeking the warmth of the sun.',
  'rhus-toxicodendron': 'RHUS TOXICODENDRON is described as helping activate strength and movement, release stiffness, and at the same time find flexibility and relaxation.',
  'arsenicum-album': 'Usually this is said to mean that the psyche is not coping enough yet. The need to hold life under control consumes a great deal of personal resource, and the remedy is described as helping resolve this situation.',
  'calcarea-carbonica': 'It is described as helping clients gently take a step forward during periods of fears and limitations.',
  'kalium-sulphuricum': 'This remedy is described as helping one leave the “swamp” of life, old unnecessary ties, and limitations. It is presented for feeling constrained, isolated, short of warmth and love, and without strength to change life.',
  'coffea-cruda': 'A remedy described as stabilizing nervous excitation of the mind and feelings, while on the other hand adding activity when it is lacking.',
  'avena-sativa': 'This is another remedy that fascinated the author. In work with clients, the author liked the forward momentum it gives: engagement, interest, and the desire to create. It carries the sweet force of an awakening sprout.',
  'kalium-phosphoricum': 'This remedy showed itself very well in situations when everything feels lost and one wants to hide and not interact with the world. It is described as giving a sense of personal strength, pride, and self-confidence.',
  'antimonium-crudum': 'An interesting remedy and a catalyst in Alchemy. It is described as supporting the purification of metals and spiritual cleansing, represented as a wolf guarding gold (enlightenment).',
  'argentum-nitricum': 'This is described as a valuable remedy used at middle stages of therapy. It is presented for when a person already has some self-confidence yet feels lost before special, responsible events.',
  causticum: 'CAUSTICUM is described as another deep remedy that returns a sense of truth and dignity, even when one is not valued and the whole world seems against them. It is presented as helping one withstand an aggressive environment and strengthen the Spirit and the Personality.',
  mezereum: 'MEZEREUM (spurge laurel, a shrub): the remedy of a burned heart.',
  'lac-humanum': 'A very special remedy. It is described as relevant when a person has a gaping inner hole of not belonging.',
  'lac-asinum': 'The author recently began working with donkey milk. This remarkable remedy is described as returning openness to life and leading out of feelings of victimhood and powerlessness.',
  'kali-carbonicum': 'This is described as a remedy that adds social courage.',
  'cenchris-contortrix': 'This remedy is like the awakening of a volcano: it starts a fiery energy inside that fills and nourishes.',
  testosteronum: 'The author begins working with a homeopathic remedy based on testosterone: Testosteronum.',
  oophorinum: 'It is described as giving a state of special inner fullness, harmony, and abundance: everything is well, everything is present, everything is calm. This is close to the image of the third Tarot arcana.',
  'bach-vine': 'It is described as having a vivid effect and suiting strong-willed people who control everything while their life force and energy begin to contract and fade. Experience is said to give a breath of relief.',
  'bach-crab-apple': 'BACH CRAB APPLE is described as having a gentle, cleansing, and very harmonizing effect. It is presented for people experiencing a feeling of inner impurity, shame, or embarrassment, who feel that “there is something wrong with me.”',
  'bach-oak': 'It is described as having a deep stabilizing and supportive effect. It is presented for strong, responsible, resilient people who are used to carrying a load and not stopping even when their strength is running out.',
  'bach-hornbeam': 'ESSENCE: this is the energy of hornbeam, a light, living tree with very dense, strong wood. On the outside there is softness and flexibility; inside there is composure and strength.',
  'bach-wild-oat': 'ESSENCE: this is the energy of wild oat. It grows freely, without rules or strict lines. MEANING: this is the energy that allows one to take the first step and begin to act.',
  'bach-elm': 'ESSENCE: this is the energy of elm, a strong, mature tree that holds space and withstands great loads. It is the energy of responsibility, scale, and support.',
  'rock-rose': 'ESSENCE: this is the energy of a rock flower, a small plant that grows in harsh conditions—on stones, beneath sun and wind. Fragile on the outside, yet inside there is pure life force and instant mobilization.',
  'star-of-bethlehem': 'ESSENCE: the remedy gently gathers and harmonizes the inner state. It is the energy of consolation, recovery, and healing after shock.',
  'bach-sweet-chestnut': 'In the author’s experience, this remedy carries a state of a certain enlightenment and raises a person’s vibrations. ESSENCE: this is the energy of sweet chestnut, a tree that passes through strong inner tension and opens after it.',
  'bach-cerato': 'ESSENCE: this is the energy of cerato, a plant with delicate flowers reaching upward. It stretches toward the light, yet seems not to hold its axis completely.',
}

const inventory = readConfirmedInventory()
if (inventory.length !== 38) throw new Error(`expected 38 confirmed remedies, received ${inventory.length}`)

mkdirSync(ruDirectory, { recursive: true })
mkdirSync(enDirectory, { recursive: true })

for (const remedy of inventory) {
  const description = sourceDescriptions[remedy.slug]
  const translation = translations[remedy.slug]
  if (!description || !translation) throw new Error(`missing source fragment or translation for ${remedy.slug}`)

  const baseMetadata = {
    slug: remedy.slug,
    canonical_latin_name: remedy.canonical_latin_name,
    russian_common_name: remedy.russian_common_name,
    aliases: remedy.aliases_abbreviations,
    source_file: remedy.source_file,
    source_heading: remedy.source_section_heading,
    source_author: 'Andrii Litvinov',
    source_status: 'primary-source-excerpt',
    related_slugs: '',
  }

  writeFileSync(
    path.join(ruDirectory, `${remedy.slug}.md`),
    markdown({ locale: 'ru', ...baseMetadata, translation_provenance: 'original-ru-source', en_source_exists: 'no' }, description),
  )
  writeFileSync(
    path.join(enDirectory, `${remedy.slug}.md`),
    markdown(
      {
        locale: 'en',
        ...baseMetadata,
        translation_provenance: 'translated-from-ru',
        translation_source: `content/remedies/ru/${remedy.slug}.md`,
        en_source_exists: 'no',
      },
      translation,
    ),
  )
}

console.log(`generated ru=${inventory.length} en=${inventory.length}`)
