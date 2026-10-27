// Compose the *existing* daily ChatGPT task output for the paired owner's
// private Telegram. The source comment is validated separately by the archive
// reader. Never classify a source-only HTML report as independent model output.
const MAX_TOTAL=79000
export function composeChatgptTelegramReport(owner,{councilReview=null,focus='full'}={}){
  if(!owner||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(owner.date||'')||
    typeof owner.markdown!=='string'||owner.markdown.length<350||
    owner.markdown.length>30000||
    !/^https:\/\/github\.com\/andylitvinov-design\/ai-projects-brain\/issues\/242#issuecomment-\d+$/.test(owner.url||''))
    throw Error('UNTRUSTED_CHATGPT_DAILY_REPORT')
  if(focus==='strategy'){
    // The owner-signed daily archive is strictly validated by the reader.
    // Do not append technical scanner findings or invoke independent models.
    const markdown=[
      '# Holistic House · Большие изменения, маркетинг и SEO',
      'Дата (Торонто): '+owner.date,
      'Источник: '+owner.url,
      '',
      owner.markdown,
      '',
      'Ограничения: только проверенные публичные факты и явно названные гипотезы.',
      'Приём Bot API не означает прочтение.'
    ].join('\n')
    return {markdown,outcomes:{chatgpt:'ok',gemini:'not_run',mistral:'not_run'},
      sources:['ChatGPT strategic report Issue #242']}
  }
  const verifiedModels=(councilReview?.sources||[])
    .filter(s=>typeof s==='string'&&s.startsWith('real:')).slice(0,2)
  const attempted=Boolean(councilReview)
  const confirmed=attempted&&verifiedModels.length>0
  const providerStatus=name=>{
    const details=councilReview?.reviewStatus?.[name]
    const label=name==='gemini'?'Gemini':'Mistral'
    if(!details)
      return label+': '+String(councilReview?.outcomes?.[name]||'unavailable').slice(0,40)
    const state=String(details.status||'unavailable').slice(0,32)
    const model=String(details.model||name).slice(0,80)
    const reason=String(details.reason||'').slice(0,95)
    return label+': '+state+' · '+model+(reason?' ('+reason+')':'')
  }
  const lines=[
    '# Holistic House — ежедневный отчёт ChatGPT',
    'Дата (Торонто): '+owner.date,
    'Источник: '+owner.url,
    'Основной аудит подготовлен существующей ежедневной задачей в 12:00 Toronto.',
    'Получатель: только проверенный приватный Telegram владельца.',
    '',
    '## Итог отдельных этапов: ChatGPT / Gemini / Mistral',
    'ChatGPT: самостоятельный аудит из проверенного архива.',
    confirmed
      ?'Серверный AI Council получил подтверждённые ответы '+verifiedModels.length+'/2 независимых моделей.'
      :attempted
        ?'Серверный AI Council зафиксировал статусы Gemini/Mistral: подтверждённых ответов 0/2. Пометки skipped/disabled означают, что генерации не было.'
        :'Дополнительные Gemini/Mistral ответы НЕ подтверждены: серверный этап не запускался. Основной отчёт ChatGPT доставляется без платных API и вымышленных выводов.',
  ]
  if(attempted){
    lines.push(providerStatus('gemini'),providerStatus('mistral'))
  }
  lines.push(
    '',
    'Важно: встречающаяся в исходном аудите фраза «Gemini/Mistral не запрашивались»',
    'относится ТОЛЬКО к самостоятельному этапу ChatGPT, а не к отдельному',
    'серверному AI Council. Его реальные статусы указаны выше.',
    '',
    '## Отчёт ChatGPT (исходный самостоятельный этап)',
    owner.markdown,
    ''
  )
  if(confirmed){
    // Only actual model replies, already attributed and bounded by the
    // companion's source verifier, may appear in this supplement.
    lines.push(
      '## Полученные ответы независимых моделей',
      councilReview.markdown.slice(0,44000),
      ''
    )
  }
  lines.push(
    '',
    'Ограничения: результаты реальных клиентских тестов и личные данные не передавались.',
    'Приём файла Telegram Bot API не означает, что сообщение было прочитано.'
  )
  const markdown=lines.join('\n')
  if(markdown.length>MAX_TOTAL)throw Error('CHATGPT_TELEGRAM_REPORT_TOO_LARGE')
  return {
    markdown,
    outcomes:{
      chatgpt:'ok',
      gemini:attempted?(councilReview.outcomes?.gemini||'unavailable'):'not_run',
      mistral:attempted?(councilReview.outcomes?.mistral||'unavailable'):'not_run'
    },
    sources:['ChatGPT daily audit Issue #242',...verifiedModels].slice(0,6)
  }
}
