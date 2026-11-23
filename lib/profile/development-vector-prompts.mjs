/** Optional reflective prompts for the existing owner-controlled guided vectors.
 * These ask for subjective now/desired ratings, not diagnoses or test outcomes.
 */
const T=(en,ru,es)=>Object.freeze({en,ru,es})
export const VECTOR_REFLECTION_PROMPTS=Object.freeze({
 inner:Object.freeze({
  anchor:T('How safe and steady do you feel in everyday life?','Насколько вы ощущаете опору, устойчивость и безопасность в повседневной жизни?','¿Cuánta seguridad y estabilidad sientes en tu vida diaria?'),
  connection:T('How connected and supported do you feel by others?','Насколько вы чувствуете связь с другими людьми и их поддержку?','¿Cuánta conexión y apoyo sientes de otras personas?'),
  freedom:T('How freely can you be yourself and make your own choices?','Насколько свободно вы можете быть собой и делать собственный выбор?','¿Qué libertad tienes para ser tú y tomar tus propias decisiones?'),
  agency:T('How capable do you feel of acting on what matters to you?','Насколько вы ощущаете силу действовать и достигать важного для себя?','¿Qué capacidad sientes para actuar en lo que te importa?'),
  love:T('How much love can you give and receive in your life?','Насколько вам удаётся любить и чувствовать себя любимым?','¿Cuánto amor puedes dar y recibir en tu vida?'),
  dignity:T('How much self-respect and self-worth do you experience?','Насколько вы чувствуете уважение и ценность самого себя?','¿Cuánto respeto y valor personal sientes?'),
  'self-realization':T('How fully are you using and developing your abilities?','Насколько полно вы раскрываете и развиваете свои способности?','¿Hasta qué punto desarrollas tus capacidades?'),
  recognition:T('How seen, heard and appreciated do you feel?','Насколько вы чувствуете, что вас замечают, слышат и ценят?','¿Hasta qué punto sientes que te escuchan, ven y valoran?')
 }),
 outer:Object.freeze({
  body_health:T('How satisfied are you with your energy, rest and physical wellbeing?','Насколько вы довольны энергией, отдыхом и физическим самочувствием?','¿Qué satisfacción tienes con tu energía, descanso y bienestar físico?'),
  emotional_wellbeing:T('How satisfied are you with your emotional balance and recovery from stress?','Насколько вы довольны эмоциональным состоянием и восстановлением после стресса?','¿Qué satisfacción tienes con tu equilibrio emocional y recuperación del estrés?'),
  relationships:T('How satisfied are you with family, friendships and close relationships?','Насколько вас устраивают семья, дружба и близкие отношения?','¿Qué satisfacción tienes con tu familia, amistades y relaciones cercanas?'),
  career_business:T('How satisfied are you with your work, career and opportunities?','Насколько вы довольны работой, карьерой и возможностями развития?','¿Qué satisfacción tienes con tu trabajo, carrera y oportunidades?'),
  finance:T('How well does your financial situation support the life you want?','Насколько финансовая ситуация позволяет вам жить так, как хотелось бы?','¿Cuánto te ayuda tu situación económica a vivir como deseas?'),
  personal_growth:T('How satisfied are you with your learning and personal development?','Насколько вы довольны своим обучением и личностным развитием?','¿Qué satisfacción tienes con tu aprendizaje y desarrollo personal?'),
  lifestyle:T('How well does your everyday lifestyle suit your needs and wishes?','Насколько повседневный образ жизни соответствует вашим потребностям и желаниям?','¿Cuánto se adapta tu estilo de vida a tus necesidades y deseos?'),
  meaning_purpose:T('How clear and meaningful is the direction of your life?','Насколько ясным и осмысленным кажется вам направление вашей жизни?','¿Cuánto sentido y claridad tiene la dirección de tu vida?')
 })
})
export function promptForDevelopmentVector(track,id,locale='en'){
 return VECTOR_REFLECTION_PROMPTS[track]?.[id]?.[['en','ru','es'].includes(locale)?locale:'en']||''
}
