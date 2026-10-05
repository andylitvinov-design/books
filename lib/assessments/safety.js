export function safetySignal(definition, answers = {}) {
  if (!definition?.questions) return null
  for (const question of definition.questions) {
    const rule = question.safety
    if (!rule) continue
    const value = answers[question.id]
    if (Number.isInteger(value) && value >= Number(rule.triggerMin ?? 1))
      return { type: rule.type, questionId: question.id, value }
  }
  return null
}

export const SAFETY_COPY = {
  en: {
    title: 'Your safety matters',
    text: 'Your answer suggests you may be having thoughts about death or hurting yourself. Holistic House is not an emergency service and nobody is monitoring this response in real time.',
    urgent: 'If you may act on these thoughts or are in immediate danger, contact local emergency services now. In Canada or the United States, call or text 988.',
    support: 'If you can, stay with someone you trust and contact a qualified health professional or crisis service.',
    continue: 'I understand',
  },
  ru: {
    title: 'Ваша безопасность важна',
    text: 'Ваш ответ показывает, что у вас могут быть мысли о смерти или причинении вреда себе. Holistic House не является экстренной службой, и никто не отслеживает этот ответ в реальном времени.',
    urgent: 'Если есть риск, что вы можете действовать в соответствии с этими мыслями, или вы в непосредственной опасности, немедленно обратитесь в местную экстренную службу. В Канаде или США можно позвонить или написать 988.',
    support: 'Если возможно, оставайтесь рядом с человеком, которому доверяете, и свяжитесь с квалифицированным специалистом или кризисной службой.',
    continue: 'Понятно',
  },
}
