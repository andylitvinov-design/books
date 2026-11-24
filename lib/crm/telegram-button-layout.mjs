// Shared Telegram presentation policy. Pure; no I/O, tokens, authorization or private data.
export function telegramReadableKeyboard(markup){
  if(!markup)return markup
  const key=Array.isArray(markup.inline_keyboard)?'inline_keyboard':
    Array.isArray(markup.keyboard)?'keyboard':null
  if(!key)return markup
  // Keep typed reply-keyboard commands and every action payload unchanged.
  const shortLabels={
    '✅ Start booking':'✅ Book now',
    '🌿 Ease stress & restore energy':'🌿 Stress & energy',
    '❤️ Improve relationships & esteem':'❤️ Relationships & esteem',
    '✨ Get money & self-growth ideas':'✨ Money & self-growth',
    '🌿 Снять стресс и вернуть энергию':'🌿 Стресс и энергия',
    'Enviar para revisión personal':'Enviar a revisión personal',
    '💬 Discuss a business request':'💬 Discuss business',
    '🎓 Explore Academy courses':'🎓 Academy courses',
  }
  // Owner-approved invariant: exactly one choice per row, without exceptions.
  return {...markup,[key]:markup[key].flatMap(row=>row.map(button=>[
    key==='inline_keyboard'&&Object.hasOwn(shortLabels,button.text)?
      {...button,text:shortLabels[button.text]}:button
  ]))}
}

export function telegramReadablePayload(payload){
  return payload?.reply_markup?
    {...payload,reply_markup:telegramReadableKeyboard(payload.reply_markup)}:payload
}

export function telegramReadableChoices(choices){
  // Telegram cannot wrap inline labels reliably. Keep source wording intact
  // in the message when a choice is too long for a conservative mobile label.
  const numbered=choices.some(b=>Array.from(b.text).length>26||/[\r\n]/u.test(b.text))
  return {
    rows:choices.map((b,i)=>[numbered?{...b,text:String(i+1)}:b]),
    legend:numbered?choices.map((b,i)=>(i+1)+'. '+b.text).join('\n'):'',
  }
}
