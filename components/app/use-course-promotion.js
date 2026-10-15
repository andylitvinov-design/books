'use client'

// One authoritative billing read and one provider-owned completion token.
// Unknown billing state, failed reads and ad-free entitlements suppress offers.
import { useCallback, useEffect } from 'react'
import { canShowHousePromotion, canStartCheckout, lessonCompletionKey } from '@/lib/billing/public-plan'
import { useSubscription } from './subscription-access'

export function useCoursePromotion(accountId, { courseId, cycleId, day, lessonId } = {}) {
  const { accountId: providerAccountId, statusAccountId, status, phase, offerKey, offerScope, dismissCompletionOffer } = useSubscription()
  const key = lessonCompletionKey({ cycleId, day, lessonId })
  const dismiss = useCallback(() => { if (key) dismissCompletionOffer?.(key) }, [key, dismissCompletionOffer])
  // Exact-key dismissal is stable across status/token updates, and keeps seen
  // deduplication intact when this course/cycle presenter leaves the screen.
  useEffect(() => dismiss, [dismiss])
  const matches = Boolean(accountId && courseId && key && offerKey === key &&
    offerScope?.accountId === accountId && offerScope?.courseId === courseId && offerScope?.presentation === 'inline')
  // Current owner-bound Free eligibility is needed before the final save.
  // A completion token still owns dismissal, but cannot gate a pre-save slide.
  const show = Boolean(accountId && courseId && key && providerAccountId === accountId &&
    statusAccountId === accountId && canShowHousePromotion(status, phase))
  return { show, completionPending: matches, checking: phase === 'loading', dismiss,
    checkoutReady: show && !status.sandbox && canStartCheckout(status, phase, 'advanced') }
}
