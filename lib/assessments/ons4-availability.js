// Display/availability overlay only. Never edit or register the immutable ONS4 v1 form here.
// OGL permits content reuse, not certification of this site's administration mode.
// https://www.ons.gov.uk/help/terms-conditions
// https://analysisfunction.civilservice.gov.uk/policy-store/personal-well-being/
export const ONS4_KEY = 'ons-personal-wellbeing-4'
export const ONS4_SOURCE_URL = 'https://www.ons.gov.uk/peoplepopulationandcommunity/wellbeing/methodologies/personalwellbeingsurveyuserguide'
export const ONS4_LICENCE_URL = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'
export const ONS4_ATTRIBUTION = 'Source: Office for National Statistics. Contains public sector information licensed under the Open Government Licence v3.0. ' + ONS4_LICENCE_URL
export const ONS4_REFERENCE_NOTICE = Object.freeze({
  en: 'Reference only; not available to start. This version is not registered for launch, and its online administration mode remains under review.',
  ru: 'Только справочная карточка, без запуска. Эта версия не зарегистрирована для запуска; способ онлайн-прохождения ещё требует проверки.',
  es: 'Solo referencia; no se puede iniciar. Esta versión no está registrada para su lanzamiento y el modo de administración en línea sigue en revisión.',
})

export function withOns4ReferenceAvailability(item) {
  if (item?.key !== ONS4_KEY || item.version !== 'v1' || item.instrumentLocale !== 'en') return item
  return {
    ...item,
    startable: false,
    guestEligible: false,
    starterEligible: false,
    explicitOptIn: true,
    registrationRequired: true,
    availability: 'reference-only',
    sourceUrl: ONS4_SOURCE_URL,
    description: Object.fromEntries(['en', 'ru', 'es'].map(locale => [locale,
      [item.description?.[locale] || item.description?.en, ONS4_REFERENCE_NOTICE[locale]].filter(Boolean).join(' ')])),
  }
}
