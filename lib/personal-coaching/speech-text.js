// Pure helpers for the optional Web Speech input on coaching slides.
// Interim words are NEVER saved: only final words are handed to an editable textarea.
export const COACHING_ANSWER_LIMIT=800

export function speechResultSegments(results,previousFinal=''){
  const entries=Array.from(results||[])
  const final=entries.filter(item=>item?.isFinal)
    .map(item=>String(item?.[0]?.transcript||'')).join(' ').trim()
  const interim=entries.filter(item=>!item?.isFinal)
    .map(item=>String(item?.[0]?.transcript||'')).join(' ').trim()
  // Some browsers dispatch the same final result multiple times. Never append a duplicate.
  const delta=final&&final!==previousFinal&&final.startsWith(previousFinal)
    ?final.slice(previousFinal.length).trim():''
  return {final,delta,interim}
}

export function appendSpokenAnswer(previous,spoken,maxLength=COACHING_ANSWER_LIMIT){
  const old=String(previous||'').trimEnd()
  const incoming=String(spoken||'').trim()
  const limit=Number.isSafeInteger(maxLength)&&maxLength>0?maxLength:COACHING_ANSWER_LIMIT
  return (old+(old&&incoming?' ':'')+incoming).slice(0,limit)
}
