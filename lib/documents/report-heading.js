/**
 * One bilingual editorial report title for browser and the generated PDF.
 * Document type is authoritative; never infer a diagnosis or an outcome.
 */
export function clientReportHeading(locale = 'en', recommendationType = 'homeopathy') {
  const ru = locale === 'ru'
  if (recommendationType === 'general')
    return ru ? 'Отчёт по консультации' : 'Consultation report'
  if (recommendationType === 'bach')
    return ru ? 'Рекомендация по эссенциям Баха' : 'Bach flower essence recommendation'
  if (recommendationType === 'mixed')
    return ru ? 'Комплексная рекомендация' : 'Integrated recommendation'
  return ru ? 'Гомеопатическая рекомендация' : 'Homeopathic recommendation'
}
