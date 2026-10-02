'use server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { isClientId } from '@/lib/clients/service'
import { AssessmentError, createAssessment, updateAssessment, transitionAssessment } from '@/lib/clients/assessments'
import { assessmentErrorText } from '@/lib/clients/assessment-copy'
async function ownerContext(clientId) {
  if (!await requireAdminRequest() || !isClientId(clientId)) throw new AssessmentError('UNAVAILABLE')
  const h = await headers()
  let origin
  try { origin = new URL(h.get('origin')) } catch { throw new AssessmentError('UNAVAILABLE') }
  if (origin.host !== h.get('host') || origin.protocol !== 'https:' || h.get('sec-fetch-site') === 'cross-site') throw new AssessmentError('UNAVAILABLE')
  const store = getPrescriptionStore()
  const client = await store?.findClientById(clientId)
  if (!client || client.status !== 'active' || !store.findClientAssessment) throw new AssessmentError('UNAVAILABLE')
  return { store, client }
}
function fields(data, allowed, multiple = []) {
  let size = 0
  const counts = new Map()
  for (const [key, value] of data.entries()) {
    if (key.startsWith('$ACTION_')) continue
    if (!allowed.includes(key) || typeof value !== 'string') throw new AssessmentError('VALIDATION')
    size += Buffer.byteLength(key) + Buffer.byteLength(value)
    counts.set(key, (counts.get(key) ?? 0) + 1)
    if (size > 65536 || (!multiple.includes(key) && counts.get(key) > 1)) throw new AssessmentError('VALIDATION')
  }
}
function revision(data) {
  const value = data.get('expectedRevision')
  if (typeof value !== 'string' || !/^[1-9]\d{0,8}$/.test(value)) throw new AssessmentError('VALIDATION')
  return Number(value)
}
function refresh(clientId, assessmentId) {
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath(`/admin/clients/${clientId}/assessments/${assessmentId}/edit`)
}
export async function saveAssessmentAction(clientId, assessmentId, _state, data) {
  let result, locale = 'en'
  try {
    const { store, client } = await ownerContext(clientId)
    locale = client.preferredLocale
    const contentFields = ['kind', 'title', 'occurredOn', 'language', 'sourceName', 'sourceVersion', 'description', 'originalResult', 'practitionerComment']
    fields(data, [...contentFields, 'relatedDocumentIds', assessmentId ? 'expectedRevision' : 'requestId'], ['relatedDocumentIds'])
    const input = Object.fromEntries(contentFields.map(key => [key, data.get(key)]))
    input.relatedDocumentIds = data.getAll('relatedDocumentIds')
    result = assessmentId
      ? await updateAssessment(store, clientId, assessmentId, revision(data), input)
      : await createAssessment(store, clientId, input, data.get('requestId'))
    refresh(clientId, result.id)
  } catch (error) { return { error: assessmentErrorText(error instanceof AssessmentError ? error.code : 'UNAVAILABLE', locale) } }
  redirect(`/admin/clients/${clientId}/assessments/${result.id}/edit`)
}
export async function changeAssessmentStateAction(clientId, assessmentId, _state, data) {
  let locale = 'en'
  try {
    const { store, client } = await ownerContext(clientId)
    locale = client.preferredLocale
    fields(data, ['operation', 'expectedRevision'])
    await transitionAssessment(store, clientId, assessmentId, revision(data), data.get('operation'))
    refresh(clientId, assessmentId)
  } catch (error) { return { error: assessmentErrorText(error instanceof AssessmentError ? error.code : 'UNAVAILABLE', locale) } }
  redirect(`/admin/clients/${clientId}/assessments/${assessmentId}/edit`)
}
