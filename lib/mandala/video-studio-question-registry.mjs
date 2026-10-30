/**
 * One stable source of Video Studio v1.5 questions. This module deliberately
 * contains no React state and no provider calls: guest intent stays local.
 */
const frozen = value => Object.freeze(value);
const text = (en, ru, es) => frozen({en, ru, es});
const option = (id, en, ru, es) => frozen({id, labels: text(en, ru, es)});
const choices = (a, b, c) => frozen([a, b, c]);
const question = (id, group, priorityTier, labels, options, conditions = []) => frozen({
  id, group, priorityTier, order: Number(id.match(/\d+/)?.[0] || 0), labels,
  options, customAllowed: true, conditions: frozen(conditions), scope: group === 'pro' ? 'scene' : 'global',
  capabilityRequirements: frozen([]), privacyClass: 'creative_local',
});

const q = (id, group, tier, en, ru, es, values, conditions) => question(id, group, tier,
  text(en, ru, es), choices(...values.map(([key, a, b, c]) => option(key, a, b, c))), conditions);

const subjectMissing = ['subject_missing'];
const actionMissing = ['action_missing'];
const environmentMissing = ['environment_missing'];
const voiceEnabled = ['voice_enabled'];
const musicEnabled = ['music_enabled'];
const sceneSelected = ['scene_selected'];

const BASE_QUESTION_REGISTRY = frozen([
  q('PERSONAL_03','personalization',2,'What is your personal story about?','О чём будет ваша личная история?','¿De qué trata tu historia personal?', [['journey','My journey','О моём путешествии','Mi viaje'],['goal','My goal','О моей цели','Mi objetivo'],['new_image','A new image','О новом образе','Una nueva imagen']]),
  q('PERSONAL_04','personalization',3,'Which mood would you like?','Какое настроение вы хотели бы получить?','¿Qué estado de ánimo te gustaría?', [['calm','Calm','Спокойствие','Calma'],['inspiration','Inspiration','Вдохновение','Inspiración'],['confidence','Confidence','Уверенность','Confianza']]),
  q('PERSONAL_05','personalization',1,'Who is the main character?','Кто будет главным героем?','¿Quién es el personaje principal?', [['self','Me','Я сам(а)','Yo'],['other','Another character','Другой герой','Otro personaje'],['none','No character','Без персонажа','Sin personaje']]),
  q('PERSONAL_06','personalization',1,'What form does the character take?','В каком образе будет герой?','¿Qué forma tiene el personaje?', [['human','Human','Человек','Humano'],['animal','Animal or bird','Животное или птица','Animal o ave'],['mythical','Mythical creature','Сказочное существо','Criatura fantástica']], ['character_present','appearance_missing']),
  q('PERSONAL_07','personalization',2,'Who exactly is the character?','Кем именно будет герой?','¿Quién es exactamente el personaje?', [['wolf','Wolf','Волк','Lobo'],['eagle','Eagle','Орёл','Águila'],['dolphin','Dolphin','Дельфин','Delfín']], ['animal_selected','subject_missing']),
  q('PERSONAL_09','personalization',4,'How recognisable should the character be?','Насколько узнаваемым должен быть ваш образ?','¿Qué tan reconocible debe ser el personaje?', [['none','No likeness','Без сходства','Sin parecido'],['symbolic','A little symbolic resemblance','Слегка похожим','Parecido simbólico'],['photo','Recognisable from my photo','Максимально похожим по фото','Reconocible por mi foto']], ['self_selected','external_likeness_capable']),
  q('PERSONAL_12','personalization',1,'What does the character do?','Что делает ваш герой?','¿Qué hace el personaje?', [['journey','Travels','Путешествует','Viaja'],['discovers','Discovers something','Что-то открывает','Descubre algo'],['transforms','Transforms','Превращается','Se transforma']], actionMissing),
  q('PERSONAL_13','personalization',1,'Where would you like to be?','Где вы хотите оказаться?','¿Dónde te gustaría estar?', [['forest','In a forest','В лесу','En un bosque'],['sea','By the sea','У моря','Junto al mar'],['mountains','In the mountains','В горах','En las montañas']], environmentMissing),
  q('PERSONAL_14','personalization',4,'Add your own words?','Добавить ваши собственные слова?','¿Añadir tus propias palabras?', [['none','No personal words','Без личных слов','Sin palabras personales'],['line','One line','Одну фразу','Una frase'],['message','A short message','Небольшое обращение','Un mensaje breve']], ['voice_or_text_enabled']),
  q('PERSONAL_15','personalization',1,'What should we avoid?','Чего лучше избегать?','¿Qué prefieres evitar?', [['fear','Scary imagery','Страшных образов','Imágenes inquietantes'],['sharp_sound','Sharp sounds','Резких звуков','Sonidos bruscos'],['flashes','Bright flashes','Ярких вспышек','Destellos brillantes']]),
  q('BASIC_01','principal',2,'What kind of video is it?','Какой ролик вы хотите?','¿Qué tipo de vídeo quieres?', [['story','A story','Историю','Una historia'],['explainer','An explainer or promotion','Объяснение или рекламу','Una explicación o promoción'],['meditation','A meditation','Медитацию','Una meditación']]),
  q('BASIC_02','principal',3,'Where will you use the video?','Где вы будете использовать видео?','¿Dónde usarás el vídeo?', [['self','For myself','Для себя','Para mí'],['site','On a site or YouTube','На сайте или YouTube','En un sitio o YouTube'],['social','Shorts or Reels','В Shorts или Reels','Shorts o Reels']]),
  q('BASIC_03','principal',2,'How should it look?','Как будет выглядеть видео?','¿Cómo debe verse el vídeo?', [['realistic','Realistic','Реалистично','Realista'],['animated','Animated','Как анимация','Como animación'],['artistic','Fairy-tale and artistic','Сказочно и художественно','Artístico y de fantasía']]),
  q('BASIC_04','principal',3,'What overall mood fits?','Какое общее настроение вам ближе?','¿Qué ánimo general prefieres?', [['calm','Calm','Спокойное','Tranquilo'],['inspiring','Inspiring','Вдохновляющее','Inspirador'],['energetic','Energetic','Энергичное','Enérgico']]),
  q('BASIC_05','principal',2,'How long should it be?','Какой длины нужен ролик?','¿Qué duración necesita?', [['15','15 seconds','15 секунд','15 segundos'],['30','30 seconds','30 секунд','30 segundos'],['60','60 seconds','60 секунд','60 segundos']]),
  q('BASIC_06','principal',3,'Which frame fits?','Какой экран нужен?','¿Qué formato de pantalla necesitas?', [['landscape','Landscape','Горизонтальный','Horizontal'],['portrait','Vertical','Вертикальный','Vertical'],['square','Square','Квадратный','Cuadrado']]),
  q('BASIC_08','principal',4,'Do you need a voice?','Нужен ли голос?','¿Necesitas voz?', [['none','No voice','Без голоса','Sin voz'],['female','Female narrator','Женский диктор','Narradora'],['male','Male narrator','Мужской диктор','Narrador']]),
  q('BASIC_09','principal',4,'Which music fits?','Какая музыка подойдёт?','¿Qué música encaja?', [['none','No music','Без музыки','Sin música'],['calm','Calm','Спокойная','Tranquila'],['energetic','Energetic','Энергичная','Enérgica']]),
  q('BASIC_10','principal',4,'Show text on screen?','Показывать текст на экране?','¿Mostrar texto en pantalla?', [['none','No text','Без текста','Sin texto'],['phrases','Short phrases','Короткие фразы','Frases breves'],['subtitles','Subtitles','Субтитры','Subtítulos']]),
  q('ADV_02','advanced',4,'How does the story develop?','Как развивается ваша история?','¿Cómo se desarrolla la historia?', [['journey','As a journey','Как путешествие','Como viaje'],['resolution','From problem to resolution','От проблемы к решению','Del problema a la solución'],['images','Through beautiful images','Через красивые образы','A través de imágenes']]),
  q('ADV_06','advanced',3,'Where does it take place?','Где происходит действие?','¿Dónde ocurre la acción?', [['nature','In nature','На природе','En la naturaleza'],['city','In a city','В городе','En una ciudad'],['fantasy','In a fantasy world','В фантазийном мире','En un mundo fantástico']], environmentMissing),
  q('ADV_07','advanced',2,'What happens on screen?','Что будет происходить?','¿Qué ocurrirá en pantalla?', [['moves','The character moves','Герой движется','El personaje se mueve'],['world','The world changes','Мир меняется','El mundo cambia'],['meet','Characters meet','Герои встречаются','Los personajes se encuentran']], actionMissing),
  q('ADV_08','advanced',4,'What light would you like?','Какой свет вы хотите?','¿Qué luz deseas?', [['morning','Soft morning','Мягкий утренний','Mañana suave'],['sunset','Golden sunset','Золотой закат','Atardecer dorado'],['evening','Mysterious evening','Вечерний загадочный','Noche misteriosa']]),
  q('ADV_09','advanced',4,'Which colours do you like?','Какие цвета вам нравятся?','¿Qué colores te gustan?', [['warm','Warm','Тёплые','Cálidos'],['cool','Cool','Прохладные','Fríos'],['natural','Natural','Естественные','Naturales']]),
  q('ADV_12','advanced',4,'How should the camera move?','Как движется камера?','¿Cómo se mueve la cámara?', [['still','Still','Неподвижно','Sin movimiento'],['push','Gently closer','Плавно приближается','Se acerca suavemente'],['follow','Follows the character','Следует за героем','Sigue al personaje']]),
  q('ADV_14','advanced',4,'What pace should it have?','Какой темп видео выбрать?','¿Qué ritmo debe tener?', [['slow','Slow','Медленный','Lento'],['medium','Moderate','Умеренный','Moderado'],['fast','Fast','Быстрый','Rápido']]),
  q('ADV_15','advanced',5,'How should scenes transition?','Как переходить между сценами?','¿Cómo transitan las escenas?', [['cut','Invisible','Незаметно','Imperceptible'],['dissolve','Soft and smooth','Мягко и плавно','Suave y fluido'],['expressive','Expressive','Выразительно','Expresivo']]),
  q('ADV_17','advanced',5,'How should the voice sound?','Как должен звучать голос?','¿Cómo debe sonar la voz?', [['friendly','Friendly','По-дружески','Cercana'],['calm','Calm','Спокойно','Tranquila'],['energetic','Energetic','Энергично','Enérgica']], voiceEnabled),
]);

const PRO_IDS = ['PRO_01','PRO_02','PRO_09','PRO_10','PRO_13','PRO_16','PRO_18','PRO_19','PRO_20','PRO_25','PRO_26','PRO_28','PRO_32'];
const EXTRA_IDS = ['EXTRA_01','EXTRA_02','EXTRA_03','EXTRA_04','EXTRA_05','EXTRA_07'];
const advancedIds = ['ADV_01','ADV_05'];

const DEEP_COPY = Object.freeze({
  ADV_01:['How should the video begin?','Как начать видео?','¿Cómo debe empezar el vídeo?',[['beauty','A beautiful shot','С красивого кадра','Con una imagen bella'],['action','Straight into action','Сразу с действия','Directamente con acción'],['question','A question for the viewer','С вопроса зрителю','Con una pregunta al espectador']]],
  ADV_05:['How does the mood change?','Как меняется настроение?','¿Cómo cambia el ánimo?',[['calmer','It becomes calmer','Становится спокойнее','Se vuelve más tranquilo'],['stronger','It gradually grows','Постепенно усиливается','Aumenta gradualmente'],['steady','It stays even','Остаётся ровным','Se mantiene estable']]],
  PRO_01:['What should this shot convey?','Что должен передать этот кадр?','¿Qué debe transmitir este plano?',[['place','Show the place','Показать место','Mostrar el lugar'],['action','Show the action','Показать действие','Mostrar la acción'],['emotion','Convey emotion','Передать эмоцию','Transmitir emoción']]],
  PRO_02:['How should the film be structured?','Как построить фильм?','¿Cómo estructurar la película?',[['three','Three parts','Три части','Tres partes'],['journey','A hero journey','Путешествие героя','Viaje del héroe'],['montage','A montage of images','Монтаж образов','Montaje de imágenes']]],
  PRO_09:['How close should the subject be?','Насколько близко показать объект?','¿Qué tan cerca mostrar el objeto?',[['wide','From far away','Издалека','De lejos'],['medium','Medium shot','По пояс','Plano medio'],['close','Close-up','Крупным планом','Primer plano']]],
  PRO_10:['From which angle?','Откуда смотреть на героя?','¿Desde qué ángulo mirar?',[['eye','At eye level','На уровне глаз','A la altura de los ojos'],['high','From above','Сверху','Desde arriba'],['low','From below','Снизу','Desde abajo']]],
  PRO_13:['How should the background look?','Как показать задний план?','¿Cómo mostrar el fondo?',[['sharp','Everything sharp','Всё чётко','Todo nítido'],['soft','Slightly blurred','Слегка размыто','Ligeramente desenfocado'],['blur','Strongly blurred','Сильно размыто','Muy desenfocado']]],
  PRO_16:['Where should the camera move?','Куда должна двигаться камера?','¿Hacia dónde debe moverse la cámara?',[['toward','Towards the subject','К объекту','Hacia el objeto'],['follow','Behind the character','За героем','Tras el personaje'],['around','Around the character','Вокруг героя','Alrededor del personaje']]],
  PRO_18:['At what speed should the action appear?','С какой скоростью показать действие?','¿A qué velocidad mostrar la acción?',[['normal','Normal speed','В обычном темпе','Velocidad normal'],['slow','Slow motion','Замедленно','Cámara lenta'],['fast','Accelerated','Ускоренно','Acelerado']]],
  PRO_19:['Which side should the light come from?','С какой стороны будет свет?','¿De qué lado viene la luz?',[['front','From the front','Спереди','De frente'],['side','From the side','Сбоку','De lado'],['back','From behind','Сзади','Desde atrás']]],
  PRO_20:['How contrasty should the light be?','Насколько контрастным сделать свет?','¿Qué contraste debe tener la luz?',[['soft','Soft','Мягко','Suave'],['natural','Natural','Естественно','Natural'],['dramatic','Dramatic','Драматично','Dramático']]],
  PRO_25:['How should colour change through the film?','Как меняется цвет фильма?','¿Cómo cambia el color de la película?',[['one','One palette','Одна палитра','Una paleta'],['warmer','It becomes warmer','Становится теплее','Se vuelve más cálido'],['contrast','Contrasting scenes','Контрастные сцены','Escenas contrastadas']]],
  PRO_26:['Which image effect fits?','Какой эффект изображения выбрать?','¿Qué efecto visual elegir?',[['clean','Clean video','Чистое видео','Vídeo limpio'],['cinema','Soft cinema','Мягкое кино','Cine suave'],['grain','Film grain','Плёночное зерно','Grano de película']]],
  PRO_28:['Which references should guide the shot?','На какие кадры ориентироваться?','¿Qué referencias guían el plano?',[['photo','A character photo','На фото героя','Foto del personaje'],['first','The first frame','На первый кадр','El primer fotograma'],['both','Beginning and ending','На начало и конец','Inicio y final']]],
  PRO_32:['Which extra sounds are needed?','Какие дополнительные звуки нужны?','¿Qué sonidos adicionales se necesitan?',[['place','Sounds of the place','Звуки места','Sonidos del lugar'],['action','Sounds of action','Звуки действий','Sonidos de la acción'],['music','Music only','Только музыка','Solo música']]],
  EXTRA_01:['How should transformation appear?','Как показать превращение?','¿Cómo mostrar la transformación?',[['none','No transformation','Без превращения','Sin transformación'],['gentle','Gentle','Плавно','Suave'],['vivid','Vivid and noticeable','Ярко и заметно','Viva y visible']]],
  EXTRA_02:['Which mandala should appear?','Какую мандалу создать?','¿Qué mandala crear?',[['circles','Soft circles','Мягкие круги','Círculos suaves'],['geometry','Geometric patterns','Геометрические узоры','Patrones geométricos'],['glow','Luminous forms','Светящиеся формы','Formas luminosas']]],
  EXTRA_03:['How should a photo move?','Как оживить фотографию?','¿Cómo animar una foto?',[['gentle','Gentle motion','Лёгкое движение','Movimiento ligero'],['camera','Camera movement','Движение камеры','Movimiento de cámara'],['subject','Character movement','Движение героя','Movimiento del personaje']]],
  EXTRA_04:['How should the video repeat?','Как сделать повтор видео?','¿Cómo repetir el vídeo?',[['none','No repeat','Без повтора','Sin repetición'],['loop','Smooth loop','Плавная петля','Bucle suave'],['cycle','Long cycle','Длинный цикл','Ciclo largo']]],
  EXTRA_05:['Which light effects should be added?','Какие световые эффекты добавить?','¿Qué efectos de luz añadir?',[['none','No effects','Без эффектов','Sin efectos'],['glow','Soft glow','Мягкое свечение','Brillo suave'],['particles','Light particles','Лёгкие частицы','Partículas ligeras']]],
  EXTRA_07:['How should video relate to music?','Как связать видео с музыкой?','¿Cómo vincular vídeo y música?',[['soft','Very gently','Очень мягко','Muy suavemente'],['beat','To the beat','По ритму','Al ritmo'],['accent','On strong accents','На сильных акцентах','En acentos fuertes']]],
});
const deepQuestion = (id, group) => {
  const [en, ru, es, values] = DEEP_COPY[id];
  return q(id, group, 6, en, ru, es, values, group === 'pro' ? sceneSelected : group === 'extra' ? ['extra_selected'] : []);
};

export const QUESTION_REGISTRY = frozen([
  ...BASE_QUESTION_REGISTRY,
  ...advancedIds.map(id => deepQuestion(id, 'advanced')),
  ...PRO_IDS.map(id => deepQuestion(id, 'pro')),
  ...EXTRA_IDS.map(id => deepQuestion(id, 'extra')),
]);

const has = (value, expression) => expression.test(value);
const SUBJECT_TOKEN = /eagle|wolf|dolphin|phoenix|bird|ор(?:е|ё)?л\p{L}*|волк\p{L}*|дельфин\p{L}*|феникс\p{L}*|águila|lobo|delfín/giu;
const SUBJECT_NEGATION = /(?:^|[\s,;])(?:без|не\s+хочу|избегать|no|without|avoid|don['’]t\s+want|do\s+not\s+want|sin|no\s+quiero)\s+(?:(?:an?|the|этот|этого|эту)\s+)?$/iu;
const SUBJECT_BY_ID = frozen({
  eagle: /eagle|ор(?:е|ё)?л\p{L}*|águila/giu,
  wolf: /wolf|волк\p{L}*|lobo/giu,
  dolphin: /dolphin|дельфин\p{L}*|delfín/giu,
});
function hasPositiveSubject(value) {
  return Array.from(value.matchAll(SUBJECT_TOKEN)).some(match => !SUBJECT_NEGATION.test(value.slice(Math.max(0, match.index - 34), match.index)));
}
function subjectIsExplicitlyExcluded(value, subjectId) {
  const pattern = SUBJECT_BY_ID[subjectId];
  return Boolean(pattern) && Array.from(value.matchAll(pattern)).some(match => SUBJECT_NEGATION.test(value.slice(Math.max(0, match.index - 34), match.index)));
}
export function inferBriefFacts(intentText = '') {
  const value = String(intentText).toLowerCase();
  return frozen({
    subject: hasPositiveSubject(value),
    action: has(value, /fly|flies|travel|transform|glide|лет|путешеств|превращ|vuela|viaja|transforma/) || false,
    environment: has(value, /mountain|forest|sea|ocean|valley|гор|лес|мор|океан|montaña|bosque|mar/) || false,
  });
}

export function questionsForDraft({intentText = '', answers = {}, limit = 3} = {}) {
  const facts = inferBriefFacts(intentText);
  const answered = new Set(Object.keys(answers).filter(id => answers[id]?.confirmed || answers[id]?.customText || answers[id]?.selectedOptionId));
  const selected = id => answers[id]?.confirmed ? answers[id].selectedOptionId : null;
  if (subjectIsExplicitlyExcluded(String(intentText).toLowerCase(), selected('PERSONAL_07'))) answered.delete('PERSONAL_07');
  const characterPresent = ['self', 'other'].includes(selected('PERSONAL_05'));
  const animalSelected = selected('PERSONAL_06') === 'animal';
  const candidates = QUESTION_REGISTRY.filter(question => !answered.has(question.id)).filter(question => {
    // Once the person chose an animal or bird, its identity is the next
    // decision that materially changes the visible plan. Do not bury it
    // behind generic action/environment questions.
    if (animalSelected && !facts.subject) return question.id === 'PERSONAL_07';
    if (question.id === 'PERSONAL_05') return !facts.subject;
    if (question.id === 'PERSONAL_06') return characterPresent && !facts.subject;
    if (question.id === 'PERSONAL_07') return animalSelected && !facts.subject;
    if (question.id === 'PERSONAL_12') return !facts.action;
    if (question.id === 'PERSONAL_13') return !facts.environment;
    if (['PERSONAL_09','PERSONAL_14','ADV_17'].includes(question.id)) return false;
    return question.priorityTier <= 3;
  });
  const firstScreenLimit = String(intentText).trim() ? Math.min(limit, 2) : limit;
  return frozen(candidates.sort((a, b) => a.priorityTier - b.priorityTier || a.order - b.order).slice(0, Math.max(0, firstScreenLimit)));
}

/**
 * Deeper controls are only discoverable after the user deliberately enters
 * the relevant context.  This keeps the five categories compact instead of
 * turning the 49-item registry into a mandatory questionnaire.
 */
export function questionsForGroup({intentText = '', answers = {}, group, sceneSelected = false, extraSelected = false, limit = 4} = {}) {
  const facts = inferBriefFacts(intentText);
  const answered = new Set(Object.keys(answers).filter(id => answers[id]?.confirmed || answers[id]?.customText || answers[id]?.selectedOptionId));
  const visible = QUESTION_REGISTRY.filter(question => question.group === group && !answered.has(question.id)).filter(question => {
    if (question.conditions.includes('subject_missing')) return !facts.subject;
    if (question.conditions.includes('action_missing')) return !facts.action;
    if (question.conditions.includes('environment_missing')) return !facts.environment;
    if (question.conditions.includes('scene_selected')) return sceneSelected;
    if (question.conditions.includes('extra_selected')) return extraSelected;
    // Capability-dependent controls must not imply that likeness, voice or
    // provider features are active in the local-only studio.
    if (question.conditions.some(condition => ['external_likeness_capable', 'voice_enabled', 'voice_or_text_enabled', 'music_enabled'].includes(condition))) return false;
    return true;
  });
  return frozen(visible.sort((a, b) => a.priorityTier - b.priorityTier || a.order - b.order).slice(0, Math.max(0, limit)));
}

/**
 * Only explicit option IDs can affect the local storyboard.  Custom text is
 * intentionally not mapped here: it remains local until a later approved
 * art-only compiler can classify it safely.
 */
export function projectFieldsFromAnswers(answers = {}) {
  const selected = id => answers[id]?.confirmed ? answers[id].selectedOptionId : null;
  const subjectChoice = ['eagle', 'wolf', 'dolphin'].includes(selected('PERSONAL_07')) ? selected('PERSONAL_07') : null;
  const actionMap = {journey: 'journey', transforms: 'metamorphosis'};
  const actionChoice = actionMap[selected('PERSONAL_12')] || null;
  const styleMap = {realistic: 'nature', animated: 'dream', artistic: 'warm'};
  const styleId = styleMap[selected('BASIC_03')] || null;
  const duration = Number(selected('BASIC_05'));
  const durationSeconds = [15, 30, 60].includes(duration) ? duration : null;
  const aspect = ['landscape', 'portrait', 'square'].includes(selected('BASIC_06')) ? selected('BASIC_06') : null;
  return frozen({subjectChoice, actionChoice, styleId, durationSeconds, aspect});
}
