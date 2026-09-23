import { resultLocale, remedyCountLabel } from './result-actions.js'
const copy = {
  en: {
    title: 'Documents ready', newConsultation: 'New consultation', logout: 'Logout', language: 'Document language',
    payment: 'PAYMENT DOCUMENT', recommendation: 'HOMEOPATHIC RECOMMENDATION', bachRecommendation: 'BACH FLOWER ESSENCE RECOMMENDATION', mixedRecommendation: 'INTEGRATED RECOMMENDATION', receipt: 'Receipt', invoice: 'Invoice',
    open: 'Open', copy: 'Copy link', pdf: 'Download PDF', print: 'Print', copied: '✓ Copied', copying: 'Copying…',
    copiedFeedback: 'English link copied', copyError: 'Could not copy the link. Please try again.', disabled: 'Client access is disabled.',
    editPayment: 'Edit payment', editRecommendation: 'Edit recommendation', access: 'Access settings', revoke: 'Revoke client access', reactivate: 'Reactivate document',
    reactivateHelp: 'Reactivate to create a new private link. Previously revoked links remain disabled.',
  },
  ru: {
    title: 'Документы готовы', newConsultation: 'Новая консультация', logout: 'Выйти', language: 'Язык документов',
    payment: 'ПЛАТЁЖНЫЙ ДОКУМЕНТ', recommendation: 'ГОМЕОПАТИЧЕСКАЯ РЕКОМЕНДАЦИЯ', bachRecommendation: 'РЕКОМЕНДАЦИЯ ПО ЭССЕНЦИЯМ БАХА', mixedRecommendation: 'КОМПЛЕКСНАЯ РЕКОМЕНДАЦИЯ', receipt: 'Квитанция', invoice: 'Счёт',
    open: 'Открыть', copy: 'Копировать ссылку', pdf: 'Скачать PDF', print: 'Печать', copied: '✓ Скопировано', copying: 'Копирование…',
    copiedFeedback: 'Ссылка на русском скопирована', copyError: 'Не удалось скопировать ссылку. Попробуйте ещё раз.', disabled: 'Доступ клиента отключён.',
    editPayment: 'Редактировать платёж', editRecommendation: 'Редактировать рекомендацию', access: 'Настройки доступа', revoke: 'Отозвать доступ клиента', reactivate: 'Активировать документ',
    reactivateHelp: 'Активируйте документ, чтобы создать новую приватную ссылку. Ранее отозванные ссылки останутся недействительными.',
  },
}
export const resultCopy = locale => copy[resultLocale(locale)]
export function resultDocumentText(document, locale) {
  const language = resultLocale(locale), labels = resultCopy(language)
  if (document.kind === 'payment') return {
    title: labels.payment, edit: labels.editPayment,
    description: `${document.paymentStatus === 'received' ? labels.receipt : labels.invoice} · ${document.currency} ${new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(document.amount / 100)}`,
  }
  const count = document.count
  const word = count % 10 === 1 && count % 100 !== 11 ? 'препарат' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'препарата' : 'препаратов'
  const title = document.recommendationType === 'bach' ? labels.bachRecommendation : document.recommendationType === 'mixed' ? labels.mixedRecommendation : labels.recommendation
  const essenceWord = count % 10 === 1 && count % 100 !== 11 ? 'эссенция' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'эссенции' : 'эссенций'
  const description = document.recommendationType === 'bach'
    ? language === 'ru' ? `${count} ${essenceWord}` : `${count} ${count === 1 ? 'essence' : 'essences'}`
    : document.recommendationType === 'mixed'
      ? language === 'ru' ? `${count} позиций` : `${count} items`
      : language === 'ru' ? `${count} ${word}` : remedyCountLabel(count)
  return { title, edit: labels.editRecommendation, description }
}
