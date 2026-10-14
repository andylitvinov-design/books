/**
 * One bilingual editorial report title for browser and the generated PDF.
 * Document type is authoritative; never infer a diagnosis or an outcome.
 */
export function clientReportHeading(locale = 'en', recommendationType = 'homeopathy') {
  const ru = locale === 'ru'
  if (recommendationType === 'bach')
    return ru ? 'Рекомендация по эссенциям Баха' : 'Bach flower recommendation'
  if (recommendationType === 'mixed')
    return ru ? 'Индивидуальные рекомендации' : 'Personal recommendations'
  return ru ? 'Гомеопатическая рекомендация' : 'Homeopathic recommendation'
}
