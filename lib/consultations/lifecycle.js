export async function changeConsultationDocumentStatus(store, consultationId, documentId, status) {
  if (!store || !['active', 'revoked'].includes(status)) throw new Error('Unavailable')
  const recommendation = await store.findById(consultationId)
  const payment = recommendation?.paymentDocumentId ? await store.findById(recommendation.paymentDocumentId) : undefined
  if (!recommendation || recommendation.kind === 'payment' || payment?.kind !== 'payment' || ![recommendation.id, payment.id].includes(documentId)) throw new Error('Unavailable')
  const document = documentId === recommendation.id ? recommendation : payment
  // A stale reactivation must never rotate credentials already issued by another tab.
  if (document.status === status) return
  const next = { ...document, status, updatedAt: new Date().toISOString() }
  delete next.access
  await store.saveConsultationPair({
    recommendation: documentId === recommendation.id ? next : recommendation,
    payment: documentId === payment.id ? next : payment,
  }, { previousRecommendation: recommendation, previousPayment: payment })
}
