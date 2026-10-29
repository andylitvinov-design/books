'use server'

import { revalidatePath } from 'next/cache'
import { getAppConfig } from '@/lib/app/config'
import { requireAdminActor } from '@/lib/prescriptions/admin'
import { reviewCatalogVideo, checkVideoOembed } from '@/lib/site-videos/review-store'

function safeError(error) {
  const code = String(error?.message || '')
  if (['validation', 'conflict', 'not_found', 'oembed_unavailable'].includes(code))
    return { ok: false, error: code }
  return { ok: false, error: 'unavailable' }
}

export async function reviewCatalogVideoAction(input) {
  const actor = await requireAdminActor()
  if (!actor) return { ok: false, error: 'unauthorized' }
  try {
    const record = await reviewCatalogVideo(getAppConfig(), actor, input)
    revalidatePath('/admin/videos')
    return { ok: true, record }
  } catch (error) {
    return safeError(error)
  }
}

export async function verifyCatalogVideoAction(input) {
  const actor = await requireAdminActor()
  if (!actor) return { ok: false, error: 'unauthorized' }
  try {
    const record = await checkVideoOembed(getAppConfig(), actor, input)
    revalidatePath('/admin/videos')
    return { ok: true, record }
  } catch (error) {
    return safeError(error)
  }
}
