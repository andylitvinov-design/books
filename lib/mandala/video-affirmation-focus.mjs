// Private-profile projection: only use provenance-verified fresh directional readings.
// The full psych portrait is computed on the authenticated server; never send answers,
// scores, patient notes, diagnoses, or raw test results to the public video editor.
const THEMES = Object.freeze({
  stress:"energy",anxiety:"energy",sleep:"energy",energy:"energy",embodiment:"energy",
  mood:"energy",emotional_regulation:"energy",resource:"energy",self_support:"energy",
  clarity:"goals",focus:"goals",functioning:"money",meaning:"goals",
  relationships:"relationships",boundaries:"relationships",
});
export function videoProfileFocus(portrait) {
  const eligible = Object.entries(portrait?.axes || {}).flatMap(([axis,reading]) =>
    Object.hasOwn(THEMES,axis) && reading?.mode==="directional" &&
    reading?.rule?.goalEligible===true && typeof reading.resultId==="string" &&
    reading.resultId.length>0 && Number.isFinite(reading.percent) &&
    reading.percent>=0 && reading.percent<=100
      ? [{axis,theme:THEMES[axis],position:reading.percent}] : [])
    .sort((a,b)=>a.position-b.position || a.axis.localeCompare(b.axis));
  // Direction-adjusted within-questionnaire position orders optional reflection topics.
  // No validated cross-test score, diagnosis or severity is derived or returned.
  // Prioritize coverage of different topics, then fill up to three readings.
  const selected=[], seen=new Set();
  for(const row of eligible) {
    if(!seen.has(row.theme)) {selected.push(row.axis);seen.add(row.theme);}
    if(selected.length===3) break;
  }
  for(const row of eligible) {
    if(selected.length===3) break;
    if(!selected.includes(row.axis))selected.push(row.axis);
  }
  return {axes:selected};
}
