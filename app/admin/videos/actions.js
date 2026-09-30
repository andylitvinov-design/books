'use server'

import { revalidatePath } from 'next/cache'
import { books } from '@/data/library'
import { getRemedy } from '@/data/remedies'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { prepareVideoChange, videoKey, videoPagePath } from '@/lib/site-videos/model'
import { getSiteVideoStore } from '@/lib/site-videos/store'

export async function refreshSiteVideosAction() {
  if (!await requireAdminRequest()) return { ok: false, error: 'unauthorized' }
  try {
    const store = getSiteVideoStore()
    if (!store) return { ok: false, error: 'storage' }
    return { ok: true, records: await store.list() }
  } catch {
    return { ok: false, error: 'storage' }
  }
}

export async function saveSiteVideoAction(input) {
  if (!await requireAdminRequest()) return { ok: false, error: 'unauthorized' }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'validation' }

  let key
  try {
    key = videoKey(input.slot, input.locale, input.entityId || '')
    if (input.slot === 'remedy-detail' && !getRemedy(input.locale, input.entityId)) return { ok: false, error: 'destination' }
    if (input.slot === 'book-detail' && !books.some(book => book.id === input.entityId)) return { ok: false, error: 'destination' }
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false, error: 'validation' }
  } catch {
    return { ok: false, error: 'validation' }
  }

  let store, previous
  try {
    store = getSiteVideoStore()
    if (!store) return { ok: false, error: 'storage' }
    previous = await store.get(key)
  } catch {
    return { ok: false, error: 'storage' }
  }
  if ((previous?.revision ?? 0) !== input.expectedRevision) return { ok: false, error: 'conflict' }

  let record
  try {
    const change = { ...input }
    delete change.expectedRevision
    record = prepareVideoChange(previous, change)
  } catch (error) {
    return { ok: false, error: error?.code === 'approval' ? 'approval' : 'validation' }
  }

  try {
    await store.save(record, input.expectedRevision)
  } catch (error) {
    return { ok: false, error: error?.code === 'conflict' ? 'conflict' : 'storage' }
  }

  const page = videoPagePath(record.slot, record.locale, record.entityId).split(/[?#]/)[0]
  revalidatePath(page)
  // The same consultation video is deliberately reused beside both consultation entry points.
  if (record.slot === 'consultation') revalidatePath(`/${record.locale}/about`)
  revalidatePath('/admin/videos')
  return { ok: true, record }
}
