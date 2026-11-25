// Fixed, first-party continuation. The query identifies the program, not a user or entitlement.
export const clarityLocale=locale=>['en','ru','es'].includes(locale)?locale:'en'
export const clarityDaybookPath=locale=>'/'+clarityLocale(locale)+'/app/daybook?program=clarity'
export function clarityOnboardingPath(locale){
 const lang=clarityLocale(locale)
 return '/'+(lang==='es'?'en':lang)+'/app/portrait?afterSignIn=clarity&clarityLocale='+lang
}
export const CLARITY_FREE_REFLECTION_TAG='clarity-week-1'
// A journal entry is a voluntary self-report, never payment or access authority.
export function savedClarityReflection(entries=[]){
 return entries.find(entry=>entry?.kind==='note'&&entry?.goalId===null&&entry?.revision>0&&entry?.tags?.includes(CLARITY_FREE_REFLECTION_TAG)&&typeof entry.text==='string'&&entry.text.trim())||null
}
export const CLARITY_SYLLABUS={
 en:[['Discover yourself','Understand your current situation, wishes and needs.'],['Understand what is happening','Explore facts, feelings, needs and available support.'],['Restore energy and support','Identify gentle practices and resources for your wellbeing.'],['Choose your next direction','Review changes and define one achievable next step.']],
 ru:[['Познать себя','Исследуйте текущее состояние, желания и потребности.'],['Понять, что происходит','Разберите факты, чувства, потребности и доступную поддержку.'],['Восстановить силы и опору','Найдите бережные практики и ресурсы для своего состояния.'],['Выбрать направление','Оцените изменения и определите один реалистичный следующий шаг.']],
 es:[['Conócete','Explora tu situación actual, deseos y necesidades.'],['Comprende lo que ocurre','Explora hechos, emociones, necesidades y apoyo disponible.'],['Recupera energía y apoyo','Identifica prácticas suaves y recursos para tu bienestar.'],['Elige tu próximo rumbo','Revisa los cambios y define un siguiente paso alcanzable.']]
}
