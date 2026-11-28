// Public editorial spelling hints only. Never derive this from client history.
const glossaries=Object.freeze({
 ru:'Коучинг, психотерапия, психосоматика, системные расстановки, архетип, эмоциональная регуляция, телесная осознанность, когнитивный диссонанс, гомеопатия, Рейки, бизнес-стратегия, медитация.',
 en:'Coaching, psychotherapy, psychosomatic, systemic constellations, archetype, emotional regulation, somatic awareness, cognitive dissonance, homeopathy, Reiki, business strategy, meditation.',
 es:'Coaching, psicoterapia, psicosomática, constelaciones sistémicas, arquetipo, regulación emocional, conciencia corporal, disonancia cognitiva, homeopatía, Reiki, estrategia empresarial, meditación.'
})
// Only the optional speech-review lane, not Basic dictation, Video Studio or Ali.
// The clip filename is a routing convention (not an authorization boundary).
// The caller must still pass the existing server-side auth, consent and quota gates.
export function coachSpeechReviewGlossary({purpose,textOnly,filename,language,enabled}={}){
 if(enabled!==true||purpose!=='my_coach'||textOnly!==true||filename!=='coach-review.wav')return ''
 return Object.hasOwn(glossaries,language)?glossaries[language]:''
}
