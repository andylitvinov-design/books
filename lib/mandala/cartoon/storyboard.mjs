/**
 * First-party 60-second cartoon planner. No network, fees, profiles or child data.
 * Returns only approved world/rig/action IDs and reviewed story templates.
 */
export const CARTOON_VERSION = 'hh-cartoon-story-v1';
export const CARTOON_LOCALES = Object.freeze(['ru', 'en', 'es']);
export const CARTOON_PRESETS = Object.freeze(['friendship', 'courage', 'calm', 'celebration']);
export const CARTOON_ACTIONS = Object.freeze(['idle', 'walk', 'blink', 'turn', 'talk', 'surprise', 'sit']);
export const CARTOON_EMOTIONS = Object.freeze(['neutral', 'happy', 'curious', 'cautious', 'calm']);
export const CARTOON_WORLDS = Object.freeze(['twilight-forest', 'starlit-meadow', 'sunny-garden']);
const BEATS = Object.freeze([
  {durationMs:8000, worldId:'twilight-forest', actionId:'idle', emotionId:'curious'},
  {durationMs:8000, worldId:'twilight-forest', actionId:'walk', emotionId:'cautious'},
  {durationMs:7000, worldId:'twilight-forest', actionId:'surprise', emotionId:'curious'},
  {durationMs:8000, worldId:'starlit-meadow', actionId:'talk', emotionId:'happy'},
  {durationMs:9000, worldId:'starlit-meadow', actionId:'walk', emotionId:'happy'},
  {durationMs:8000, worldId:'sunny-garden', actionId:'turn', emotionId:'curious'},
  {durationMs:7000, worldId:'sunny-garden', actionId:'sit', emotionId:'calm'},
  {durationMs:5000, worldId:'starlit-meadow', actionId:'blink', emotionId:'calm'},
]);
const STORIES = Object.freeze({
  ru: {
    friendship: {title:'Лисёнок и маленькая звезда', lines:[
      'Однажды лисёнок отправился по лесной тропинке.',
      'Он шёл медленно и прислушивался к шороху деревьев.',
      'Вдруг перед ним появилась крошечная светящаяся звезда.',
      '«Привет! Давай пойдём вместе», — предложила она.',
      'Лисёнок улыбнулся, и они отправились навстречу приключениям.',
      'Тропинка привела друзей в солнечный, цветущий сад.',
      'Там они присели, чтобы полюбоваться красотой вокруг.',
      'Так началась их добрая дружба.'
    ]},
    courage: {title:'Лисёнок делает первый шаг', lines:[
      'Лисёнок давно хотел увидеть, что скрывается за лесом.',
      'Но новая тропинка казалась ему непривычной и длинной.',
      'Вдруг в листве заискрилась маленькая путеводная звезда.',
      '«Можно идти по одному шагу», — мягко сказала она.',
      'Лисёнок сделал шаг, потом ещё один и выпрямил спину.',
      'Впереди открылся просторный сад, полный солнечного света.',
      'Лисёнок присел и заметил, как далеко уже прошёл.',
      'Каждое путешествие начинается с шага.'
    ]},
    calm: {title:'Спокойное путешествие лисёнка', lines:[
      'В тихом лесу лисёнок заметил, как качаются ветви.',
      'Он пошёл по мягкой тропинке, никуда не торопясь.',
      'Рядом появилась звёздочка с тёплым мягким светом.',
      '«Посмотри, как плавно движутся облака», — сказала она.',
      'Друзья шли медленно и замечали приятные мелочи.',
      'В светлом саду можно было услышать нежный ветер.',
      'Лисёнок сел в тени дерева и немного отдохнул.',
      'Пусть этот спокойный миг останется с тобой.'
    ]},
    celebration: {title:'Особенный день лисёнка', lines:[
      'В сказочном лесу наступило необыкновенное утро.',
      'Лисёнок поспешил по тропинке навстречу своему сюрпризу.',
      'Перед ним неожиданно засветилась нарядная звёздочка.',
      '«Сегодня у нас праздник!» — радостно объявила она.',
      'Они отправились вместе туда, где слышалась музыка.',
      'Солнечный сад встретил друзей цветами и сиянием.',
      'Лисёнок улыбнулся и поблагодарил своих друзей.',
      'Пусть радостных моментов будет больше.'
    ]}
  },
  en: {
    friendship: {title:'The Little Fox and the Star', lines:['One evening a little fox followed a forest path.','He walked slowly and listened to the rustling trees.','Suddenly a tiny glowing star appeared before him.','“Hello! Shall we walk together?” the star asked.','The fox smiled, and together they set off on an adventure.','The path brought the friends to a beautiful sunny garden.','They sat together to enjoy the lovely view.','And so their gentle friendship began.']},
    courage: {title:'The Little Fox Takes a Step', lines:['A little fox dreamed of exploring beyond the forest.','But the unfamiliar path seemed a little too long.','Just then a small guiding star appeared in the leaves.','“One step at a time is enough,” the star said.','The fox took one step, and then another.','Ahead, a sunlit garden opened before the travelers.','The fox sat down and noticed how far he had come.','Every new journey begins with a step.']},
    calm: {title:'A Quiet Journey', lines:['In a quiet forest, a fox watched the branches sway.','He followed a soft path without any hurry.','A warm little star floated gently beside him.','“Look at the clouds drifting by,” the star whispered.','The friends walked slowly, noticing little beautiful things.','In the sunny garden they could hear a gentle breeze.','The fox sat beneath a tree and rested for a while.','May this peaceful moment stay with you.']},
    celebration: {title:'A Special Day for the Fox', lines:['A wonderful morning came to the enchanted forest.','A little fox hurried down the path toward a surprise.','A bright and cheerful star suddenly appeared.','“Today is a celebration!” the star announced.','They followed the music together into the sunshine.','A garden welcomed the travelers with flowers and light.','The fox smiled and thanked his friends.','May your days be full of moments like this.']}
  },
  es: {
    friendship: {title:'El zorrito y la estrella', lines:['Una tarde, un zorrito siguió un sendero del bosque.','Caminaba despacio y escuchaba el murmullo de los árboles.','De pronto apareció una pequeña estrella luminosa.','«¡Hola! ¿Vamos juntos?», preguntó la estrella.','El zorrito sonrió y emprendieron una aventura juntos.','El camino los llevó a un bonito jardín soleado.','Se sentaron para contemplar los colores del paisaje.','Así comenzó una amistad muy especial.']},
    courage: {title:'El primer paso del zorrito', lines:['Un zorrito soñaba con descubrir qué había tras el bosque.','Pero el sendero desconocido parecía demasiado largo.','Entonces apareció una pequeña estrella entre las hojas.','«Puedes avanzar paso a paso», dijo la estrella.','El zorrito dio un paso, y después otro más.','Delante de ellos apareció un jardín lleno de sol.','El zorrito se sentó y vio lo lejos que había llegado.','Todo viaje nuevo comienza con un paso.']},
    calm: {title:'Un viaje tranquilo', lines:['En un bosque tranquilo, un zorrito miraba las ramas.','Caminó por el sendero suave sin ninguna prisa.','Una pequeña estrella cálida apareció a su lado.','«Mira cómo pasan las nubes», dijo suavemente.','Los amigos siguieron andando y observando el paisaje.','En el jardín soleado se oía una brisa ligera.','El zorrito se sentó bajo un árbol para descansar.','Que este momento de calma te acompañe.']},
    celebration: {title:'El día especial del zorrito', lines:['Un día extraordinario comenzó en el bosque encantado.','Un zorrito corrió por el sendero hacia una sorpresa.','De pronto apareció una estrella alegre y brillante.','«¡Hoy tenemos una fiesta!», anunció la estrella.','Los amigos siguieron la música hacia el sol.','Un jardín los recibió con flores y luz.','El zorrito sonrió y dio las gracias a sus amigos.','Que cada día tenga momentos de alegría.']}
  }
});
const RELEVANCE = {
  friendship:/друг|друж|вмест|friend|together|amistad|amig/i,
  courage:/смел|храбр|страх|боюс|первый шаг|courage|brave|fear|valent|miedo/i,
  calm:/спок|сон|отдых|тиши|медлен|relax|calm|sleep|peace|tranquil|sueño|descans/i,
  celebration:/празд|поздрав|рождени|birthday|celebrat|congrat|fiesta|cumple/i,
};
function selectPreset(text){for(const p of ['celebration','courage','calm','friendship'])if(RELEVANCE[p].test(text))return p;return 'friendship';}
function seeded(hash){let h=2166136261;for(const char of hash){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function createCartoonStoryboard({wish='',locale='ru',preset='auto',aspect='portrait',variation=0}={}){
  if(!CARTOON_LOCALES.includes(locale)||!(preset==='auto'||CARTOON_PRESETS.includes(preset))||
     !['portrait','landscape'].includes(aspect)||!Number.isInteger(variation)||variation<0||variation>10000||
     typeof wish!=='string'||Array.from(wish).length>300)throw Error('invalid_cartoon_request');
  const theme=preset==='auto'?selectPreset(wish):preset;
  const story=STORIES[locale][theme],seed=seeded([locale,theme,variation].join('|'));
  let startMs=0;
  const scenes=BEATS.map((beat,i)=>{
    const scene={shotId:`cartoon-shot-${i+1}`,index:i+1,startMs,durationMs:beat.durationMs,
      worldId:beat.worldId,characterId:'little-fox-v1',actionId:beat.actionId,
      emotionId:beat.emotionId,narration:story.lines[i],starVisible:i>=2,
      camera:{movement:i%2===0?'gentle-pan-left':'gentle-pan-right',amplitude:.018}};
    startMs+=beat.durationMs;
    return Object.freeze(scene);
  });
  return Object.freeze({version:CARTOON_VERSION,format:'illustrated-rig-2d',
    locale,preset:theme,title:story.title,aspect,seed,variation,
    fps:24,durationMs:60000,shotCount:8,characterIds:Object.freeze(['little-fox-v1']),
    noExternalClientData:true,aiVideoGenerated:false,paidProviderApproved:false,
    scenes:Object.freeze(scenes)});
}
export function validateCartoonStoryboard(plan){
  if(!plan||plan.version!==CARTOON_VERSION||!CARTOON_LOCALES.includes(plan.locale)||
     !CARTOON_PRESETS.includes(plan.preset)||!['portrait','landscape'].includes(plan.aspect)||
     plan.fps!==24||plan.durationMs!==60000||plan.shotCount!==8||!Array.isArray(plan.scenes)||
     plan.scenes.length!==8||!Number.isInteger(plan.seed)||plan.seed<0||
     plan.noExternalClientData!==true||plan.aiVideoGenerated!==false||plan.paidProviderApproved!==false)
     throw Error('invalid_cartoon_storyboard');
  let at=0;
  for(let i=0;i<plan.scenes.length;i++){
    const s=plan.scenes[i];
    if(!s||s.shotId!==`cartoon-shot-${i+1}`||s.index!==i+1||s.startMs!==at||
       s.durationMs!==BEATS[i].durationMs||!CARTOON_WORLDS.includes(s.worldId)||
       s.characterId!=='little-fox-v1'||!CARTOON_ACTIONS.includes(s.actionId)||
       !CARTOON_EMOTIONS.includes(s.emotionId)||
       typeof s.narration!=='string'||
       s.narration.length<8||s.narration.length>300||
       s.narration!==STORIES[plan.locale][plan.preset].lines[i]||
       !s.camera||!['gentle-pan-left','gentle-pan-right'].includes(s.camera.movement)||
       s.camera.amplitude!==.018||typeof s.starVisible!=='boolean')
       throw Error('invalid_cartoon_scene');
    at+=s.durationMs;
  }
  if(at!==60000)throw Error('invalid_cartoon_timeline');
  return true;
}
export function cartoonSceneAt(plan,timeMs){
  validateCartoonStoryboard(plan);
  if(!Number.isFinite(timeMs))throw Error('invalid_cartoon_time');
  const time=Math.max(0,Math.min(plan.durationMs-1,Math.floor(timeMs)));
  return plan.scenes.find(s=>time>=s.startMs&&time<s.startMs+s.durationMs);
}
