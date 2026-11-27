// Semantic criteria only. The canonical server-owned scenario supplies the
// exact delivered question, field eligibility, consent and revision. This
// registry does not issue questions, grant consent or write protocol facts.
const freeze=Object.freeze
const outer=['body_health','emotional_wellbeing','relationships','career_business','finance','personal_growth','lifestyle','meaning_purpose']
const inner=['anchor','connection','freedom','agency','love','dignity','self-realization','recognition']
const currentRating='Client explicitly reports a current 0–10 rating for the exact named axis; no desired rating or inferred value.'
const pairRating='Client explicitly reports current and desired 0–10 ratings for the exact named axis; never infer either value.'
const metric='Client explicitly reports a 0–10 self-rating for the exact measure and timepoint; not a clinical score.'
const priorPractice='What the client actually tried or noticed; no attempt, no change and discomfort are valid self-reports. Do not invent an effect.'
const choice='A specific resource or action the client personally chooses, if any; no inferred commitment or consent.'
const timing='A client-stated time or ordinary situation in which they might use the chosen action; no obligation.'
const observation='The client’s own observation, including unchanged or uncomfortable. Distinguish actual experience from a plan.'
const fallback='A client-stated realistic alternative or signal for reducing or stopping the practice.'
const need='Support or quality the client personally wants now; do not infer a diagnosis or need.'
const day1=freeze({
 situation:'Current circumstances the client wants to understand.',
 feelings:'The client’s own feeling or significant experience in relation to the situation.',
 impact:'A concrete example or self-reported impact on everyday life; no inferred cause.',
 priority:'The life area the client explicitly chooses to attend to, or explicit uncertainty.',
 needs:'The client’s stated need or desired change within that area.',
 why:'Personal significance or motivation stated by the client.',
 resources:'Support actually available or desired; no invented resource.',
 next:'A voluntary small observation or trial chosen by the client; leaving it open is valid.',
 learning:'What the client says became clearer, if anything.',
 ...Object.fromEntries(outer.map(id=>['outer_'+id,currentRating]))
})
const day2=freeze({
 review_homework:priorPractice,episode:'One specific recent situation where the client needed support.',
 feelings:'What the client noticed in themselves during that episode.',needs:need,
 limits:'Client-stated comfort boundary or limitation for this conversation.',
 optional_scale_before:metric,exception_example:'An actual similar moment that felt easier and what was different; absence of an example is valid.',
 resources:'A realistically available resource or actual source of help described by the client.',
 development_focus:'The client explicitly identifies a preferred inner meaning axis among safety/support, connection, freedom, agency, love, dignity, self-realization and recognition, or expresses genuine uncertainty; never choose from the largest rating gap automatically.',
 development_reason:'A concrete everyday-life change or personal meaning the client associates with the chosen inner development direction.',
 strengths:'A personal strength the client identifies.',selected_support:choice,
 test_status:'What actually happened: tried, planned for later, stopped, declined or conversation only. Do not conflate intention and attempt.',
 test_observation:'An actual observation after an attempted or stopped practice; no observed effect can be inferred from a future plan.',
 optional_scale_after:metric,transfer_action:choice,timing_or_condition:timing,
 helpfulness_indicator:'A client-stated indicator that the chosen action is helpful.',stop_or_fallback:fallback,
 ...Object.fromEntries(inner.map(id=>['inner_'+id,pairRating]))
})
const day3=freeze({
 changes:priorPractice,review_homework:priorPractice,priority:day1.priority,
 goal:'A specific desired outcome stated by the client; distinguish a dream, need or fear from a chosen goal.',
 why:day1.why,controllable_scope:'What part of the chosen goal the client can influence.',
 baseline:'Current starting point stated by the client, not the desired target.',
 success:'An observable client-stated sign of progress.',horizon:'A time horizon the client considers realistic.',
 options:'One or two possible actions or ways to explore; not necessarily commitments.',
 next:choice,timing,confidence:metric,obstacle:'A possible barrier identified by the client.',
 if_then:'A realistic conditional alternative if the specified obstacle occurs.',
 dream_image:'A client-originated inspiring future image, not a goal or obligation.',
 route_choice:'A direction the client says feels right, if any, after the course.'
})
const therapyCommon=freeze({stress_before:metric,stress_after:metric,skill_confidence:metric})
const ground=freeze({...therapyCommon,
 early_signal:'A personally noticed early sign of tension, if any, without diagnosis.',
 ground_anchor:'A neutral present-day anchor the client finds comfortable to notice.',
 support_need:need,resource_images:'A client-originated resource image or nonvisual anchor, if any; no invented image, symbolism or forced imagery.',
 resource_selected:'The exact resource the client chooses to retain, in their own words; no inferred permission to reuse.',
 resource_details:'Only details the client identifies as comfortable to retain; no added sensory details.',
 resource_quality:'A supportive quality the client personally associates with the resource.',
 resource_phrase:'The client’s own optional supportive phrase, not one invented by the coach.',
 ground_observation:observation,ground_when:timing
})
const calm=freeze({...therapyCommon,
 meditation_feedback:priorPractice,calm_context:'An ordinary manageable context where the client notices tension.',
 calm_steps:'A short voluntary sequence the client chooses after noticing a signal.',
 calm_fallback:fallback,calm_signal:'A current signal the client feels comfortable noticing.',
 calm_variant:'A regulation option the client personally prefers; no inferred consent to start.',
 calm_observation:observation,calm_when:timing
})
const resource=freeze({...therapyCommon,
 previous_practice_feedback:priorPractice,available_resources:'People, places or actions the client identifies as actually accessible.',
 routine_cue:timing,low_energy_option:'A small realistic option the client finds manageable with little energy or time.',
 support_threshold:'When the client would prefer support from a trusted person or professional; not a clinical risk determination.',
 resource_need:need,chosen_resource:choice,resource_observation:'The client’s experience of trying or considering the resource; distinguish attempt from consideration.',
 resource_plan:'A voluntary small if–then supportive action chosen by the client.'
})
const scopes=freeze({
 clarity_day_1:freeze({version:'hh-clarity-day-one-v5',mode:'coaching',fields:day1}),
 clarity_day_2:freeze({version:'hh-clarity-day-two-support-v1',mode:'coaching',fields:day2}),
 clarity_day_3:freeze({version:'hh-clarity-day-three-goal-v1',mode:'coaching',fields:day3}),
 anti_stress_ground:freeze({version:'hh-anti-stress-v2-s1',mode:'therapy',fields:ground}),
 anti_stress_calm:freeze({version:'hh-anti-stress-v2-s2',mode:'therapy',fields:calm}),
 anti_stress_resource:freeze({version:'hh-anti-stress-v2-s3',mode:'therapy',fields:resource})
})
// Consent, explicit skips, choices about practice/meditation permission and
// formal review decisions are deliberately outside model authority. Unknown
// versions/fields must fail closed rather than use a generic criterion.
export function scopedSupervisorFieldCriterion(fieldId,scenario,mode){
 if(!scenario||typeof scenario!=='object'||Array.isArray(scenario)||
 Object.keys(scenario).length!==2||!Object.hasOwn(scenario,'courseSessionId')||!Object.hasOwn(scenario,'version')||
 typeof scenario.courseSessionId!=='string'||!Object.hasOwn(scopes,scenario.courseSessionId))return null
 const scope=scopes[scenario.courseSessionId]
 return scope.version===scenario.version&&scope.mode===mode&&Object.hasOwn(scope.fields,fieldId)?scope.fields[fieldId]:null
}
