// These are existing general-practice tracks, never score-based treatment plans.
export const SUPPORT_GOAL_IDS=Object.freeze(['calm_regulation','inner_support','emotional_flexibility','attention_clarity','connection_boundaries','energy_agency'])
export const validSupportGoal=value=>typeof value==='string'&&SUPPORT_GOAL_IDS.includes(value)
export function supportGoalForScale(testKey,scale) {
 if(!scale||scale.type==='trait'||scale.type==='traditional'||!scale.canChooseSkill)return null
 if(testKey.startsWith('cbi-'))return 'energy_agency'
 return ({anxiety:'calm_regulation',stress:'calm_regulation',emotional_regulation:'emotional_flexibility',mood:'emotional_flexibility',focus:'attention_clarity',clarity:'attention_clarity',sleep:'energy_agency',energy:'energy_agency',functioning:'energy_agency',relationships:'connection_boundaries',sexual_wellbeing:'connection_boundaries',embodiment:'calm_regulation',self_support:'inner_support',resource:'inner_support',meaning:'inner_support'})[scale.axis]||null
}
