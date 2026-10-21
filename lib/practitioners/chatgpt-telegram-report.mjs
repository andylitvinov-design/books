// Compose the *existing* daily ChatGPT task output for the paired owner's
// private Telegram. The source comment is validated separately by the archive
// reader. Never classify a source-only HTML report as independent model output.
const MAX_TOTAL=79000
export function composeChatgptTelegramReport(owner,{councilReview=null}={}){
  if(!owner||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(owner.date||'')||
    typeof owner.markdown!=='string'||owner.markdown.length<350||
    owner.markdown.length>30000||
    !/^https:\/\/github\.com\/andylitvinov-design\/ai-projects-brain\/issues\/242#issuecomment-\d+$/.test(owner.url||''))
    throw Error('UNTRUSTED_CHATGPT_DAILY_REPORT')
  const verifiedModels=(councilReview?.sources||[])
    .filter(s=>typeof s==='string'&&s.startsWith('real:')).slice(0,2)
  const confirmed=councilReview&&verifiedModels.length>0
  const lines=[
    '# Holistic House — ежедневный отчёт ChatGPT',
    'Дата (Торонто): '+owner.date,
    'Источник: '+owner.url,
    'Основной аудит подготовлен существующей ежедневной задачей в 12:00 Toronto.',
    'Получатель: только проверенный приватный Telegram владельца.',
    '',
    '## Отчёт ChatGPT',
    owner.markdown,
    '',
    '## Статус дополнительных независимых моделей',
    confirmed
      ?'Ниже независимые ответы только реально полученных и проверенных моделей; исходный HTML-архив не является ответом модели.'
      :'Дополнительные Gemini/Mistral ответы НЕ подтверждены. Основной отчёт ChatGPT доставляется без платных API и без вымышленных модельных выводов.',
    ''
  ]
  if(confirmed){
    // The complete owner ChatGPT report always takes priority. A bounded
    // companion supplement never risks the Telegram sendDocument size limit.
    lines.push(councilReview.markdown.slice(0,44000))
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
      gemini:confirmed?(councilReview.outcomes?.gemini||'unavailable'):'not_run',
      mistral:confirmed?(councilReview.outcomes?.mistral||'unavailable'):'not_run'
    },
    sources:['ChatGPT daily audit Issue #242',...verifiedModels].slice(0,6)
  }
}
