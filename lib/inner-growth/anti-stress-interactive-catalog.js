// ОПОРА AS-1.9: reviewed editorial interaction plan, not automatic therapy.
// The first lesson is implemented in the player; days 2–14 are design passports
// awaiting per-day implementation and usability/safety QA.
export const INTERACTIVE_METHODS = Object.freeze({
  feeling_choice: {format:'state_cards',label:['How I feel','Как я сейчас'],skill:'notice',rule:'Choice or skip; do not diagnose'},
  focus_from_tests: {format:'verified_scale_cards',label:['Choose my focus','Выбор фокуса по тестам'],skill:'choose',rule:'Only compatible user-owned scores'},
  thought_dialogue: {format:'agree_unsure_disagree',label:['Reflect on an aphorism','Диалог с афоризмом'],skill:'reflect',rule:'Disagreement is valid'},
  visual_scan: {format:'picture_region_and_detail',label:['Visual orientation','Зрительная ориентировка'],skill:'ground',rule:'Eyes open; image is not a psychological test'},
  guided_steps: {format:'optional_audio_text_stepper',label:['Guided attention','Пошаговая практика внимания'],skill:'practice',rule:'Text equal to audio, stop anytime'},
  creative_words: {format:'word_association_three_tokens',label:['Three associations','Три свободные ассоциации'],skill:'reflect',rule:'No interpretation and no private text analytics'},
  anchor_card: {format:'resource_card_builder',label:['My neutral anchor','Карточка нейтральной опоры'],skill:'support',rule:'Only actually chosen items'},
  retrieval_try: {format:'self_try_or_hint',label:['Try it myself','Самостоятельная проба с подсказкой'],skill:'retrieve',rule:'Not an exam; hint or decline allowed'},
  gentle_transition: {format:'finish_at_own_pace',label:['Gentle finish','Мягкий выход из практики'],skill:'choose',rule:'Stop/rest are valid'},
  comfort_adjust: {format:'comfort_then_adapt',label:['Keep, simplify, or replace','Оставить, упростить, заменить'],skill:'adapt',rule:'Only confirmed changes'},
  if_then_card: {format:'conditional_support_plan',label:['If–then support card','Карточка «когда — могу»'],skill:'transfer',rule:'Plan does not mean done'},
  switch_attention: {format:'two_object_switch',label:['Switch between two details','Переключение внимания между объектами'],skill:'ground',rule:'No speed score or forced attention'},
  signal_story: {format:'safe_ordinary_scenario',label:['Recognize an early sign','Ранний сигнал в бытовом сюжете'],skill:'notice',rule:'No trauma recall; one signal or unsure'},
  stress_branch: {format:'stress_vs_fatigue_choice',label:['Different load, different support','Развилка «спешка или усталость»'],skill:'choose',rule:'Do not diagnose a nervous-system state'},
  body_opt_in: {format:'gentle_movement_or_external_anchor',label:['Optional small body movement','Микродвижение или внешний ориентир'],skill:'practice',rule:'No pain, no forced breathing/body focus'},
  pace_picker: {format:'short_or_long_at_user_pace',label:['Choose practice duration','Своя длительность практики'],skill:'adapt',rule:'No forced timers; rest is okay'},
  support_map: {format:'place_person_rest_resource_map',label:['Map accessible support','Карта реальных опор'],skill:'support',rule:'No personal contacts or invented resources'},
  restorative_scene: {format:'visual_image_or_plain_words',label:['Supportive future scene','Ресурсная сцена или слова'],skill:'support',rule:'No age regression or involuntary imagery'},
  fact_guess: {format:'fact_vs_assumption_sort',label:['Fact or assumption?','Факт или предположение?'],skill:'unhook',rule:'Ordinary fictional example only'},
  gentle_choice: {format:'thought_fact_or_visual_branch',label:['Choose a response to a thought','Три пути обращения с мыслью'],skill:'choose',rule:'No forced positive reframe'},
  phrase_builder: {format:'boundary_sentence_pieces',label:['A respectful boundary','Конструктор бережной границы'],skill:'rehearse',rule:'No requirement to send or confront'},
  help_request: {format:'anonymous_support_request_builder',label:['A realistic request','Конструктор просьбы о помощи'],skill:'rehearse',rule:'No names or numbers collected'},
  situation_match: {format:'match_support_to_scenario',label:['Which resource fits?','Подбор опоры к ситуации'],skill:'retrieve',rule:'Hints and opt-out allowed; no grading'},
  toolkit_builder: {format:'signal_anchor_fallback_cards',label:['My OPORA toolkit','Личная карта ОПОРА'],skill:'integrate',rule:'Only chosen and previously practised resources'},
  reality_check: {format:'honest_experience_choice',label:['What did I notice?','Что я действительно заметил(а)?'],skill:'reflect',rule:'Neutral/negative responses accepted'},
})

const curriculum = [
 {day:1,skill:'S1',title:['I am here, and I can choose','Я здесь, и могу выбирать'],methods:['visual_scan','guided_steps','creative_words','anchor_card','retrieval_try'],response:['Notices an ordinary detail and may choose a neutral anchor','Замечает обычную деталь и при желании выбирает нейтральную опору'],measure:'visualZone + noticed + practiceAttempt + independent (self-report)',fallback:'Looking around with eyes open, reading or stopping',stage:'implemented'},
 {day:2,skill:'S1',title:['I can return my attention','Я могу возвращать внимание'],methods:['switch_attention','retrieval_try','reality_check'],response:['Tries shifting between two neutral details, with or without hints','Пробует переключить внимание между двумя нейтральными деталями — с подсказкой или без'],measure:'chosen first/second object and self-reported hint status',fallback:'Stay with a single object or skip',stage:'planned'},
 {day:3,skill:'S2',title:['My early overload sign','Мой ранний сигнал перегрузки'],methods:['signal_story','visual_scan','anchor_card'],response:['May recognize one early sign in an ordinary, safe example','Может узнать один ранний сигнал перегрузки на безопасном бытовом примере'],measure:'signal choice or unsure; no diagnosis',fallback:'Select “not sure” or orient externally',stage:'planned'},
 {day:4,skill:'S2',title:['Too much pressure or too little energy?','Слишком много давления или мало сил?'],methods:['stress_branch','support_map','if_then_card'],response:['Matches a gentle support option to a selected everyday scenario','Соотносит мягкую поддержку с выбранной обычной ситуацией'],measure:'fictional scenario + support choice; no inference about real health',fallback:'Choose rest or neither',stage:'planned'},
 {day:5,skill:'S3',title:['A gentle pause for body and attention','Мягкая пауза для тела и внимания'],methods:['body_opt_in','guided_steps','gentle_transition'],response:['Tries one small comfortable movement, external anchor or rest','Пробует одно мягкое движение, внешний ориентир или отдых'],measure:'preferred action + attempted/declined',fallback:'Read or observe a neutral object without movement',stage:'planned'},
 {day:6,skill:'S3',title:['I can adjust effort and rest','Я могу соразмерять нагрузку и отдых'],methods:['pace_picker','comfort_adjust','if_then_card'],response:['Learns to choose, shorten or end a practice','Пробует выбирать, сокращать или заканчивать практику'],measure:'duration preference and self-reported stop/adjustment',fallback:'Immediate short version or rest',stage:'planned'},
 {day:7,skill:'S4',title:['Real support and one manageable demand','Реальные опоры и одно посильное требование'],methods:['support_map','comfort_adjust','anchor_card'],response:['Identifies an actually accessible practical or human support route','Называет действительно доступный практический ресурс или путь помощи'],measure:'resource categories and confirmed keep/simplify/replace',fallback:'Rest, no available support or no answer',stage:'planned'},
 {day:8,skill:'S4',title:['Resource image and real recovery','Ресурсный образ и настоящее восстановление'],methods:['restorative_scene','creative_words','gentle_transition'],response:['Chooses an image, words or a real neutral object without coercion','Выбирает образ, слова или внешний предмет без принуждения'],measure:'preferred modality + resource type',fallback:'Plain words, external orientation, no visualization',stage:'planned'},
 {day:9,skill:'S5',title:['An anxious thought is not a fact','Тревожная мысль не равна факту'],methods:['gentle_choice','fact_guess','visual_scan'],response:['Distinguishes an everyday thought from a known fact or opts for grounding','Отличает бытовую мысль от факта либо выбирает ориентирование'],measure:'branch choice and optional example answer',fallback:'External detail or skip without discussing thoughts',stage:'planned'},
 {day:10,skill:'S5',title:['Fact, guess and one manageable step','Факт, предположение и посильный шаг'],methods:['fact_guess','gentle_choice','if_then_card'],response:['Labels a fictional known fact and a guess; may choose a small possible next step','Различает факт и догадку в вымышленном примере, выбирает возможный шаг'],measure:'fact/guess grouping, plan not real-world action',fallback:'Only view neutral example or rest',stage:'planned'},
 {day:11,skill:'S6',title:['A boundary without confrontation','Граница без конфликта'],methods:['phrase_builder','retrieval_try','reality_check'],response:['Selects a believable respectful pause or boundary phrase','Выбирает реалистичную уважительную фразу паузы или границы'],measure:'phrase category + rehearsal level',fallback:'Read only; no sending or confrontation',stage:'planned'},
 {day:12,skill:'S6',title:['Human and practical help','Люди и практическая помощь'],methods:['help_request','support_map','comfort_adjust'],response:['Chooses a realistic anonymous support route or acknowledges none is available','Выбирает реалистичный вид помощи или признаёт её отсутствие'],measure:'help source type + request kind; no contacts',fallback:'Rest or neutral information about help',stage:'planned'},
 {day:13,skill:'S7',title:['Which known support fits today?','Какая знакомая опора подходит сейчас?'],methods:['situation_match','retrieval_try','if_then_card'],response:['Tries matching a familiar resource to a neutral situation, with optional hints','Подбирает знакомую опору к бытовой ситуации с подсказкой либо без'],measure:'matched type + hint used; no pass/fail',fallback:'Rest, hint or decline',stage:'planned'},
 {day:14,skill:'S7',title:['My practical OPORA map','Моя практическая карта ОПОРА'],methods:['toolkit_builder','situation_match','comfort_adjust'],response:['Assembles an honest personal card with available supports and a backup','Собирает личную карточку реальных опор и запасного варианта'],measure:'chosen resources + optional retrieval; course retest is separate',fallback:'Minimal one-anchor card, skip or human help',stage:'planned'},
].map(row=>Object.freeze({...row,methods:Object.freeze(row.methods)}))
export const ANTISTRESS_INTERACTIVE_CURRICULUM = Object.freeze(curriculum)
export function antistressInteractiveDay(day,locale='en') {
  const item=ANTISTRESS_INTERACTIVE_CURRICULUM.find(row=>row.day===day)
  if(!item)return null
  const i=locale==='ru'?1:0
  return {day,skill:item.skill,title:item.title[i],methods:item.methods,
    methodLabels:item.methods.map(id=>INTERACTIVE_METHODS[id]?.label[i]||id),
    expectedResponse:item.response[i],observable:item.measure,
    fallback:item.fallback,status:item.stage}
}
export function interactiveCurriculumValid(){
  const ids=new Set()
  return ANTISTRESS_INTERACTIVE_CURRICULUM.length===14 &&
    ANTISTRESS_INTERACTIVE_CURRICULUM.every((row,i)=>{
      if(row.day!==i+1||row.skill!=='S'+(Math.floor(i/2)+1)||ids.has(row.day))return false
      ids.add(row.day)
      return row.methods.length>=3 && row.methods.every(id=>Boolean(INTERACTIVE_METHODS[id])) &&
        row.response.every(t=>t.length>20)
    })
}
