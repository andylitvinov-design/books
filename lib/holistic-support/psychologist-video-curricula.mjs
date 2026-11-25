/**
 * Psychologist Mind / 8-video educational course planner.
 * Curated source-inspired, original lesson structures, not cloned protocols.
 * No recording, video render, licensed treatment, content publication or TTS.
 * Run only after trusted Psychologist Mind safety / consent preflight.
 */
export const COURSE_EVIDENCE_REFERENCES = Object.freeze({
  nice_depression:"https://www.nice.org.uk/guidance/ng222/chapter/recommendations",
  nice_anxiety:"https://www.nice.org.uk/guidance/cg113/chapter/recommendations",
  who_stress:"https://www.who.int/publications/i/item/9789240003927",
});
const LAB = (en,ru,es)=>Object.freeze({en,ru,es});
const skill=(id,label,steps,practiceGoal,source,imagery=false)=>Object.freeze({
  id,label:LAB(...label),steps:Object.freeze({en:Object.freeze(steps[0]),ru:Object.freeze(steps[1]),es:Object.freeze(steps[2])}),
  practiceGoal,source:COURSE_EVIDENCE_REFERENCES[source],requiresImageryConsent:imagery,
  clinicalProtocol:false,optional:true,
});
export const PSYCHOLOGY_VIDEO_SKILLS=Object.freeze({
  goal_contract:skill("goal_contract",["Choose a manageable goal","Выбор посильной цели","Elegir un objetivo alcanzable"],[
    ["Describe a small change you would value.","Choose one sign that would show progress.","Allow yourself to revise the goal."],
    ["Назовите небольшое желаемое изменение.","Выберите один признак продвижения.","При необходимости пересмотрите цель."],
    ["Nombra un cambio pequeño y valioso.","Elige una señal de avance.","Puedes revisar tu objetivo."]
  ],"collaborative_goal","nice_depression"),
  present_orientation:skill("present_orientation",["Orient in the present","Ориентация в настоящем","Orientación al presente"],[
    ["Look around and notice three neutral things.","Feel support from the chair or floor, if comfortable.","Choose where to put your attention next."],
    ["Посмотрите вокруг и отметьте три нейтральных предмета.","При желании ощутите опору под ногами или спиной.","Выберите, куда направить внимание дальше."],
    ["Observa tres cosas neutras a tu alrededor.","Si te resulta cómodo, nota el apoyo bajo tu cuerpo.","Elige hacia dónde dirigir tu atención."]
  ],"grounding","who_stress"),
  resource_inventory:skill("resource_inventory",["Notice existing supports","Замечать доступную поддержку","Reconocer recursos"],[
    ["List two things or people that help, even slightly.","Choose one that is available this week.","Make a small plan to use it."],
    ["Назовите две вещи или людей, которые немного поддерживают.","Выберите одну доступную на этой неделе опору.","Продумайте небольшой шаг к ней."],
    ["Nombra dos apoyos, aunque sean pequeños.","Elige uno disponible esta semana.","Planifica un paso pequeño."]
  ],"resources","who_stress"),
  map_trigger_response:skill("map_trigger_response",["Map a reaction","Карта реакции","Mapa de reacciones"],[
    ["Recall a manageable recent situation, not the most painful.","Name one thought, feeling and action.","Notice what helped or made things harder."],
    ["Возьмите недавнюю посильную ситуацию, не самую тяжёлую.","Отметьте мысль, чувство и действие.","Заметьте, что помогло, а что усложнило ситуацию."],
    ["Elige una situación reciente manejable.","Nombra un pensamiento, emoción y acción.","Observa qué ayudó y qué dificultó."]
  ],"pattern_awareness","nice_anxiety"),
  values_clarification:skill("values_clarification",["Find a direction","Уточнение ценностей","Clarificar valores"],[
    ["Choose an area of life that matters to you.","Name one quality you want to bring to it.","Pick one small action expressing that quality."],
    ["Выберите значимую область жизни.","Назовите качество, которое хотите в ней проявлять.","Найдите маленькое действие в его направлении."],
    ["Elige un ámbito de vida importante.","Nombra una cualidad que deseas expresar.","Escoge una acción pequeña coherente."]
  ],"values","who_stress"),
  thought_reflection:skill("thought_reflection",["Observe a thought","Наблюдение мысли","Observar un pensamiento"],[
    ["Notice a familiar self-critical thought.","Ask whether it is a fact, prediction or interpretation.","Find a more balanced way to describe the situation."],
    ["Заметьте знакомую самокритичную мысль.","Различите факт, прогноз и интерпретацию.","Попробуйте более сбалансированную формулировку."],
    ["Detecta un pensamiento autocrítico frecuente.","Distingue hecho, predicción e interpretación.","Prueba una formulación más equilibrada."]
  ],"cognitive_skills","nice_depression"),
  self_compassion:skill("self_compassion",["Practice a kind response","Бережный ответ себе","Respuesta amable hacia uno mismo"],[
    ["Notice the tone you use with yourself.","Imagine what you would say to a friend in this situation.","Choose one kinder, believable phrase."],
    ["Заметьте, каким тоном говорите с собой.","Представьте, что сказали бы другу в похожей ситуации.","Выберите одну бережную и правдоподобную фразу."],
    ["Observa cómo te hablas.","Piensa qué dirías a una amistad en esa situación.","Elige una frase amable y creíble."]
  ],"kindness","who_stress"),
  boundary_rehearsal:skill("boundary_rehearsal",["Rehearse a boundary","Репетиция границы","Ensayar un límite"],[
    ["Choose a low-stakes interaction.","Try an 'I' statement with a simple request.","Plan when and whether to use it safely."],
    ["Выберите несложный разговор.","Составьте Я-высказывание с простой просьбой.","Решите, безопасно ли и когда его применить."],
    ["Elige una conversación de poca intensidad.","Formula una petición sencilla en primera persona.","Decide si es seguro practicarla."]
  ],"communication","nice_depression"),
  small_behavior_experiment:skill("small_behavior_experiment",["Try a small change","Маленький эксперимент","Pequeño experimento"],[
    ["Choose a reversible, low-risk action.","Predict what might happen without assuming certainty.","Try it when safe and reflect on what you noticed."],
    ["Выберите обратимое действие с малым риском.","Предположите исход без уверенности в результате.","При возможности попробуйте и отметьте наблюдения."],
    ["Elige una acción reversible y de bajo riesgo.","Anticipa qué podría pasar, sin darlo por seguro.","Pruébala si es seguro y observa el resultado."]
  ],"behavioral_learning","nice_depression"),
  mindful_choice:skill("mindful_choice",["Pause and choose","Пауза и выбор","Pausa y elección"],[
    ["Notice a thought or feeling without needing to change it.","Name two available next steps.","Choose the smallest step that fits your values."],
    ["Заметьте мысль или чувство, не пытаясь его исправить.","Назовите два возможных следующих действия.","Выберите маленький шаг в соответствии с ценностями."],
    ["Observa una emoción sin tener que cambiarla.","Nombra dos pasos posibles.","Elige el más pequeño acorde a tus valores."]
  ],"choice","who_stress"),
  resource_imagery:skill("resource_imagery",["Optional supportive image","Необязательный ресурсный образ","Imagen de apoyo opcional"],[
    ["If you wish, imagine an ordinary comfortable place.","Notice one gentle detail, or keep your eyes open.","Return attention to your surroundings whenever you choose."],
    ["Если хочется, представьте простое комфортное место.","Заметьте одну приятную деталь или оставьте глаза открытыми.","В любой момент верните внимание в комнату."],
    ["Si quieres, imagina un lugar cotidiano agradable.","Observa un detalle suave o mantén los ojos abiertos.","Vuelve al entorno cuando lo desees."]
  ],"resourcing","who_stress",true),
  progress_review:skill("progress_review",["Review and continue","Итоги и продолжение","Revisión y continuación"],[
    ["Review your original goal without judging yourself.","Name what helped, what did not and what remains open.","Choose a next step or request human support."],
    ["Вернитесь к начальной цели без оценок себя.","Отметьте полезное, сложное и то, что остаётся открытым.","Выберите следующий шаг или поддержку специалиста."],
    ["Revisa tu objetivo inicial sin juzgarte.","Observa qué ayudó y qué quedó pendiente.","Elige el siguiente paso o apoyo humano."]
  ],"reflection","nice_depression"),
});
const SEQ=(...ids)=>Object.freeze(ids);
const recipe=(id,labels,focus,methods,model,source)=>Object.freeze({
  id,title:LAB(...labels),eligibleFoci:Object.freeze(focus),methodPriority:SEQ(...methods),
  teachingModel:model,source:COURSE_EVIDENCE_REFERENCES[source],
  intendedUse:"psychoeducation_and_self_help_skills_not_therapy",
});
export const PSYCHOLOGY_VIDEO_COURSES=Object.freeze({
  stress_foundations:recipe("stress_foundations",["Everyday stress: 8 steps","Стресс: 8 шагов устойчивости","Estrés cotidiano: 8 pasos"],
    ["stress"],["goal_contract","present_orientation","map_trigger_response","resource_inventory","thought_reflection","small_behavior_experiment","mindful_choice","progress_review"],"cbt_plus_who_skills","who_stress"),
  anxiety_cbt:recipe("anxiety_cbt",["Anxiety coping skills","Навыки при тревожности","Herramientas ante la ansiedad"],
    ["stress"],["goal_contract","present_orientation","map_trigger_response","thought_reflection","small_behavior_experiment","mindful_choice","resource_inventory","progress_review"],"cbt_educational","nice_anxiety"),
  relationship_skills:recipe("relationship_skills",["Relationships and boundaries","Отношения и границы","Relaciones y límites"],
    ["relationships"],["goal_contract","resource_inventory","map_trigger_response","boundary_rehearsal","self_compassion","small_behavior_experiment","mindful_choice","progress_review"],"interpersonal_skills","nice_depression"),
  self_worth:recipe("self_worth",["Self-worth and inner kindness","Самооценка и бережность","Autoestima y amabilidad"],
    ["self_worth"],["goal_contract","self_compassion","map_trigger_response","resource_imagery","thought_reflection","values_clarification","small_behavior_experiment","progress_review"],"cbt_compassion_skills","who_stress"),
  meaning_and_values:recipe("meaning_and_values",["Values and direction","Ценности и направление","Valores y dirección"],
    ["meaning"],["goal_contract","values_clarification","resource_inventory","mindful_choice","map_trigger_response","small_behavior_experiment","mindful_choice","progress_review"],"act_informed_skills","who_stress"),
  imagery_resources:recipe("imagery_resources",["Gentle imagery and resources","Мягкие образы и опора","Imágenes suaves y recursos"],
    ["stress","self_worth"],["goal_contract","resource_inventory","present_orientation","resource_imagery","self_compassion","small_behavior_experiment","mindful_choice","progress_review"],"original_resource_imagery_not_KIP_therapy","who_stress"),
});
const lang = x=>["en","ru","es"].includes(x)?x:"en";
const COPY=Object.freeze({
  ru:{ intro:"Сегодня мы уделим внимание посильному шагу. Вы можете не делать упражнение или остановиться.",
    skill:"Попробуйте один небольшой навык, без требования получить определённый результат.",
    reflect:"Что вы заметили? Что было полезно, нейтрально или некомфортно?",
    end:"Выберите небольшой, необязательный шаг до следующей встречи.",
    before:"Как вы себя чувствуете до занятия? Отвечать необязательно.",
    after:"Что изменилось после упражнения, если что-то изменилось?"},
  en:{ intro:"Today we will try one manageable step. You can skip or stop at any time.",
    skill:"Try one small skill without needing any particular outcome.",
    reflect:"What did you notice? What was helpful, neutral or uncomfortable?",
    end:"Choose one small optional step before the next session.",
    before:"How are you feeling before the session? You may skip.",
    after:"What changed, if anything, after the exercise?"},
  es:{ intro:"Hoy probaremos un paso manejable. Puedes omitirlo o parar en cualquier momento.",
    skill:"Prueba una habilidad sencilla sin exigirte ningún resultado.",
    reflect:"¿Qué notaste? ¿Qué fue útil, neutral o incómodo?",
    end:"Elige un paso pequeño y opcional antes de la próxima sesión.",
    before:"¿Cómo te sientes antes de comenzar? Puedes omitirlo.",
    after:"¿Qué cambió, si cambió algo, después del ejercicio?"},
});
const fallbackByFocus=Object.freeze({
  stress:"stress_foundations",relationships:"relationship_skills",
  self_worth:"self_worth",meaning:"meaning_and_values",
});
/**
 * Deterministic pathway choice: explicit compatible preference first, then
 * clearly stated anxiety-related request, then a broad focus default.
 * The same decision is used by both conversation/program and video planning.
 */
export function selectPsychologyVideoCourse({focus,courseId=null,rawUtterance="",imageryEnabled=false}={}) {
  const requested=typeof courseId==="string"?PSYCHOLOGY_VIDEO_COURSES[courseId]:null;
  if(requested?.eligibleFoci.includes(focus) &&
    (courseId!=="imagery_resources"||imageryEnabled===true)) {
    return {id:courseId,origin:"explicit_compatible_choice"};
  }
  const raw=typeof rawUtterance==="string"?rawUtterance.slice(0,2500):"";
  if(focus==="stress"&&/тревог|тревож|паническ|anxiety|anxious|ansiedad|panico|pánico/iu.test(raw)) {
    return {id:"anxiety_cbt",origin:"request_topic_detected"};
  }
  return {id:fallbackByFocus[focus]||null,origin:"default_for_focus"};
}
export function listPsychologyVideoCourseOptions({focus=null,locale="ru",imageryEnabled=false}={}) {
  const l=lang(locale);
  return Object.values(PSYCHOLOGY_VIDEO_COURSES)
    .filter(r=>(!focus||r.eligibleFoci.includes(focus))&&(r.id!=="imagery_resources"||imageryEnabled))
    .map(r=>({id:r.id,title:r.title[l],teachingModel:r.teachingModel,
      eligibleFoci:[...r.eligibleFoci],reference:r.source,requiresClinicalReviewBeforeRelease:true}));
}
/** No course generation is allowed for non-ready/clinical review states. */
export function makePsychologyVideoCourse(program,{courseId=null,locale="ru",imageryConsent=false,selectionOrigin=null}={}) {
  const l=lang(locale);
  const base={version:"psychologist-video-course-v1",status:program?.status??"safety_check_required",
    courseId:null,title:null,lessons:[],published:false,rendered:false,
    requiresClinicalAndEditorialReview:true,mediaAssetsVerified:false};
  if(program?.status!=="ready" || !Array.isArray(program.sessions) ||
    program.sessions.length!==8 || program.mode!=="self_guided")
    return base;
  const allowImagery=imageryConsent===true &&
    program.sessions.some(s=>s.methodIds.includes("resource_imagery"));
  const selected=typeof courseId==="string" && PSYCHOLOGY_VIDEO_COURSES[courseId]?.eligibleFoci.includes(program.focus) &&
    (courseId!=="imagery_resources"||allowImagery)
      ? courseId : fallbackByFocus[program.focus];
  if(!selected) return {...base,status:"human_review_required"};
  const recipe=PSYCHOLOGY_VIDEO_COURSES[selected];
  const titles=recipe.title;
  const lessonCount=program.sessions.length;
  const lessons=program.sessions.map((session,i)=>{
    const safeIds=session.methodIds.filter(id=>Object.hasOwn(PSYCHOLOGY_VIDEO_SKILLS,id) &&
      (!PSYCHOLOGY_VIDEO_SKILLS[id].requiresImageryConsent||allowImagery));
    const preferred=recipe.methodPriority[i];
    const chosen=safeIds.includes(preferred)?preferred:safeIds[0]||null;
    const item=chosen?PSYCHOLOGY_VIDEO_SKILLS[chosen]:null;
    const steps=item?item.steps[l]:[];
    const durationSeconds=720;
    const segments=[
      {id:"welcome",seconds:60,narration:COPY[l].intro,onScreen:session.title},
      {id:"orientation",seconds:90,narration:COPY[l].before,onScreen:COPY[l].before},
      {id:"skill_instruction",seconds:150,narration:item?item.label[l]+". "+steps.join(" "):COPY[l].skill,
        onScreen:item?item.label[l]:session.title},
      {id:"optional_practice",seconds:270,narration:item?COPY[l].skill+" "+steps.join(" "):COPY[l].skill,
        onScreen:COPY[l].skill,requiresOptIn:true,allowSilenceAndSkip:true},
      {id:"reflection",seconds:100,narration:COPY[l].reflect,onScreen:COPY[l].after,
        requiresUserResponse:false},
      {id:"closure",seconds:50,narration:COPY[l].end,onScreen:COPY[l].end},
    ];
    return {number:i+1,sessionId:session.id,title:session.title,
      learningObjective:session.objectiveCode,selectedSkillId:chosen,
      practicalSteps:[...steps],primaryApproach:program.primaryApproach,
      skillEvidenceSource:item?.source??null,
      plannedVideoSeconds:durationSeconds,segments,transferExercise:steps.at(-1)||COPY[l].end,
      assessment:{t0:"optional_checkin",t1:"optional_checkin",noClaimsOfEfficacy:true},
      needsSafetyRecheck:true,canStopOrSkip:true,needsManualPublication:true,
      videoAssetId:null,videoPlayable:false,audioAssetId:null,
      visualizationNotes:{style:"calm_mobile_first",captions:true,reducedMotion:true,visualsNotClinicalClaims:true}};
  });
  if(lessons.length!==lessonCount) return base;
  return {...base,status:"draft_ready",courseId:selected,title:titles[l],
    focus:program.focus,teachingModel:recipe.teachingModel,evidenceSource:recipe.source,
    selectionRationale:selectionOrigin ||
      (courseId===selected?"client_selected_compatible_format":"safe_default_for_confirmed_focus"),
    lessons,published:false,rendered:false,requiresClinicalAndEditorialReview:true,
    mediaAssetsVerified:false};
}
