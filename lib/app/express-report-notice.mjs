// Never put test results, diagnoses, a specific report ID, or bearer links in
// external messaging. This generic URL always requires the client's own login.
const ROOT='https://holistichouse.vercel.app'
export function expressReportCabinetUrl(locale='en'){
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  return ROOT+'/'+lang+'/app/reports'
}
export function expressReportNeutralNotice(locale='en'){
  const lang=['en','ru','es'].includes(locale)?locale:'en'
  const text={
    en:'Holistic House: a private report is ready in your account.',
    ru:'Holistic House: в вашем личном кабинете доступен новый отчёт.',
    es:'Holistic House: tienes un informe nuevo en tu cuenta privada.',
  }
  return text[lang]+'\n'+expressReportCabinetUrl(lang)
}
