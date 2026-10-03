'use server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getPrescriptionStore } from '@/lib/prescriptions/store'
import { isClientId } from '@/lib/clients/service'
import { AssessmentError, createAssessment, updateAssessment, transitionAssessment } from '@/lib/clients/assessments'
import { assessmentErrorText } from '@/lib/clients/assessment-copy'
import { getAppConfig } from '@/lib/app/config'
import {
  issueReportGrant,
  listReportGrants,
  rotateReportGrant,
  setReportGrantStatus,
} from '@/lib/app/report-flow'
import { metadataBaseFor } from '@/data/site-metadata'
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
    const record = await transitionAssessment(store, clientId, assessmentId, revision(data), data.get('operation'))
    refresh(clientId, assessmentId)
    return { savedRevision: record.revision }
  } catch (error) { return { error: assessmentErrorText(error instanceof AssessmentError ? error.code : 'UNAVAILABLE', locale) } }
}

function deliveryError(locale) {
  return locale === 'ru'
    ? 'Не удалось изменить приватную ссылку на отчёт.'
    : 'The private report link could not be changed.'
}
function reportUrl(locale, selector, secret) {
  const origin = metadataBaseFor().origin.replace(/\/$/, '')
  return `${origin}/${locale === 'ru' ? 'ru' : 'en'}/report/${selector}#${secret}`
}
async function reportGrantContext(clientId, assessmentId) {
  const { store, client } = await ownerContext(clientId)
  if (!isClientId(assessmentId)) throw new AssessmentError('UNAVAILABLE')
  const record = await store.findClientAssessment(assessmentId)
  if (!record || record.clientId !== clientId || record.status !== 'shared')
    throw new AssessmentError('UNAVAILABLE')
  const config = getAppConfig()
  if (!config.reportsEnabled) throw new AssessmentError('UNAVAILABLE')
  return { store, client, record, config }
}
export async function issueReportLinkAction(clientId, assessmentId, _state, data) {
  let locale = 'en'
  try {
    fields(data, ['expiresInDays', 'saveAllowed'])
    const { store, client, record, config } = await reportGrantContext(clientId, assessmentId)
    locale = client.preferredLocale
    const expiresInDays = Number(data.get('expiresInDays'))
    const saveAllowed = data.get('saveAllowed') === 'on'
    const issued = await issueReportGrant(config, store, {
      sourceAssessmentId: record.id,
      locale,
      saveAllowed,
      expiresInDays,
    })
    refresh(clientId, assessmentId)
    return {
      shareUrl: reportUrl(locale, issued.selector, issued.secret),
      expiresAt: new Date(issued.expiresAt).toISOString(),
      saveAllowed: issued.saveAllowed,
    }
  } catch {
    return { error: deliveryError(locale) }
  }
}
export async function rotateReportLinkAction(clientId, assessmentId, grantId, _state, data) {
  let locale = 'en'
  try {
    fields(data, ['expiresInDays'])
    const { store, client, config } = await reportGrantContext(clientId, assessmentId)
    locale = client.preferredLocale
    const grants = await listReportGrants(config, assessmentId)
    if (!grants.some((grant) => grant.id === grantId)) throw new AssessmentError('UNAVAILABLE')
    const rotated = await rotateReportGrant(config, store, grantId, Number(data.get('expiresInDays')))
    refresh(clientId, assessmentId)
    return {
      shareUrl: reportUrl(locale, rotated.selector, rotated.secret),
      expiresAt: new Date(rotated.expiresAt).toISOString(),
      saveAllowed: rotated.saveAllowed,
    }
  } catch {
    return { error: deliveryError(locale) }
  }
}
export async function changeReportLinkStateAction(
  clientId,
  assessmentId,
  grantId,
  _state,
  data,
) {
  let locale = 'en'
  try {
    fields(data, ['operation'])
    const operation = data.get('operation')
    if (!['revoke', 'withdraw'].includes(operation)) throw new AssessmentError('VALIDATION')
    const { client, config } = await reportGrantContext(clientId, assessmentId)
    locale = client.preferredLocale
    const grants = await listReportGrants(config, assessmentId)
    if (!grants.some((grant) => grant.id === grantId)) throw new AssessmentError('UNAVAILABLE')
    await setReportGrantStatus(config, grantId, operation === 'withdraw' ? 'withdrawn' : 'revoked')
    refresh(clientId, assessmentId)
    return { saved: true }
  } catch {
    return { error: deliveryError(locale) }
  }
}
