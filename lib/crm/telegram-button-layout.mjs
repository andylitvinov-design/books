// Shared Telegram presentation policy. Pure; no I/O, tokens, authorization or private data.
// Conservative mobile budget: at most two short textual buttons per row.
// Telegram owns the font size, padding and available viewport width.
export function telegramButtonLabelWidth(text){
  return Array.from(String(text).replace(/[\uFE0F\u200D\p{Mark}]/gu,'')).reduce(
    (n,c)=>n+(/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(c)?2:1),0)
}

export function telegramCanPairButtons(left,right){
  if(!left||!right||typeof left.text!=='string'||typeof right.text!=='string'||
    /[\r\n]/u.test(left.text+right.text))return false
  const a=telegramButtonLabelWidth(left.text),b=telegramButtonLabelWidth(right.text)
  return a>0&&b>0&&a<=12&&b<=12&&a+b<=22
}

function packButtonRow(buttons){
  // Preserve the existing five-face scale, not arbitrary multi-text rows.
  if(buttons.length===5&&buttons.map(b=>b.text).join('')==='😟😕😐🙂😄')return [buttons]
  const rows=[]
  for(let i=0;i<buttons.length;i++){
    const left=buttons[i],right=buttons[i+1]
    if(telegramCanPairButtons(left,right)){rows.push([left,right]);i++}
    else rows.push([left])
  }
  return rows
}

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
  // Keep authored groups and order. Only adjacent short choices within a
  // group may share a row; long choices always retain the full width.
  return {...markup,[key]:markup[key].flatMap(row=>packButtonRow(row.map(button=>
    key==='inline_keyboard'&&Object.hasOwn(shortLabels,button.text)?
      {...button,text:shortLabels[button.text]}:button
  )))}
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
    rows:packButtonRow(choices.map((b,i)=>numbered?{...b,text:String(i+1)}:b)),
    legend:numbered?choices.map((b,i)=>(i+1)+'. '+b.text).join('\n'):'',
  }
}
