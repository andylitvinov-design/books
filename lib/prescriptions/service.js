import { randomUUID } from 'node:crypto'
import { resolveRecommendationRemedy } from '../remedies/registry.js'

import { getRemedy, getRemedyDirectory, isSupportedLocale } from '../../data/remedies.js'

export const prescriptionStatuses = ['draft', 'active', 'revoked', 'archived']
export const recommendationTypes = ['homeopathy', 'bach', 'mixed']

export function inferRecommendationType(items = [], fallback = 'homeopathy') {
  const fallbackType = recommendationTypes.includes(fallback) ? fallback : 'homeopathy'
  const types = new Set(items.map((item) => item?.itemType).filter((type) => type === 'homeopathy' || type === 'bach'))
  if (types.has('homeopathy') && types.has('bach')) return 'mixed'
  if (types.has('bach')) return 'bach'
  if (types.has('homeopathy')) return 'homeopathy'
  return fallbackType
}

function requiredText(value, name) {
  const text = String(value ?? '').trim()
  if (!text) throw new Error(`${name} is required`)
  return text
}

function optionalText(value) {
  const text = String(value ?? '').trim()
  return text || undefined
}

function optionalDoseCount(value, name) {
  const text = optionalText(value)
  if (!text) return undefined
  if (!/^\d{1,2}$/.test(text)) throw new Error(`${name} must be a whole number from 1 to 99`)
  const number = Number(text)
  if (number < 1 || number > 99) throw new Error(`${name} must be a whole number from 1 to 99`)
  return String(number)
}

function optionalDate(value, name) {
  const text = optionalText(value)
  if (!text) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00.000Z`))) {
    throw new Error(`${name} must be an ISO date`)
  }
  return text
}

function bachName(value, index) {
  const name = String(value?.displayNameOverride ?? value?.displayName ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ')
  if (!name || name.length > 200 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error(`Item ${index + 1} needs an essence name of 1–200 characters`)
  return name
}

function validateItem(value, index, recommendationType) {
  const itemType = recommendationType === 'mixed'
    ? value?.itemType
    : recommendationType === 'bach' ? 'bach' : 'homeopathy'
  if (!['homeopathy', 'bach'].includes(itemType)) throw new Error(`Item ${index + 1} needs a valid recommendation type`)
  const remedy = itemType === 'bach'
    ? { remedySlug: null, displayNameOverride: bachName(value, index), displayName: bachName(value, index), sourceStatus: 'custom' }
    : resolveRecommendationRemedy(value, index)
  return {
    id: randomUUID(),
    sortOrder: index,
    itemType,
    ...remedy,
    potency: itemType === 'homeopathy' ? optionalText(value?.potency) : undefined,
    purpose: optionalText(value?.purpose),
    sequence: optionalText(value?.sequence),
    granules: itemType === 'homeopathy' ? optionalDoseCount(value?.granules, 'Granules') : undefined,
    timesPerDay: itemType === 'homeopathy' ? optionalDoseCount(value?.timesPerDay, 'Times per day') : undefined,
    dosage: optionalText(value?.dosage),
    frequency: optionalText(value?.frequency),
    duration: optionalText(value?.duration),
    instructions: optionalText(value?.instructions),
    notes: optionalText(value?.notes),
  }
}

export function validatePrescriptionInput(input) {
  const status = input.status ?? 'draft'
  if (!prescriptionStatuses.includes(status)) throw new Error('Invalid prescription status')
  const languagePreference = input.languagePreference ?? 'bilingual'
  if (!['ru', 'en', 'bilingual'].includes(languagePreference)) throw new Error('Invalid language preference')
  if (input.recommendationType && !recommendationTypes.includes(input.recommendationType)) throw new Error('Invalid recommendation type')
  const recommendationType = inferRecommendationType(input.items, input.recommendationType ?? 'homeopathy')
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('At least one remedy item is required')

  return {
    patientName: requiredText(input.patientName, 'Patient name'),
    patientDob: optionalDate(input.patientDob, 'Patient DOB'),
    dateIssued: optionalDate(input.dateIssued, 'Date issued') ?? new Date().toISOString().slice(0, 10),
    languagePreference,
    recommendationType,
    practitionerName: requiredText(input.practitionerName, 'Practitioner name'),
    practitionerRole: optionalText(input.practitionerRole),
    practitionerBackground: optionalText(input.practitionerBackground),
    practitionerContact: optionalText(input.practitionerContact),
    generalInstructions: optionalText(input.generalInstructions),
    recommendationNumber: optionalText(input.recommendationNumber),
    followUp: optionalText(input.followUp),
    internalNotes: optionalText(input.internalNotes),
    status,
    items: input.items.map((item, index) => validateItem(item, index, recommendationType)),
  }
}

export function createPrescription(input, now = new Date().toISOString()) {
  return {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...validatePrescriptionInput(input),
  }
}

export function updatePrescription(existing, input, now = new Date().toISOString()) {
  const validated = validatePrescriptionInput(input)
  const updated = {
    ...existing,
    ...validated,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now,
  }
  delete updated.publicId
  if (existing.status !== 'active' || validated.status !== 'active') delete updated.access
  return updated
}

function clientItem(item, locale, recommendationType) {
  if (!item.remedySlug) {
    return {
      displayName: item.displayNameOverride,
      itemType: item.itemType ?? (recommendationType === 'bach' ? 'bach' : 'homeopathy'),
      potency: item.potency,
      granules: item.granules,
      timesPerDay: item.timesPerDay,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      purpose: item.purpose,
      sequence: item.sequence,
    }
  }

  const remedy = getRemedy(locale, item.remedySlug)
  if (!remedy) throw new Error(`Canonical remedy disappeared: ${item.remedySlug}`)
  return {
    displayName: remedy.canonical_latin_name,
    itemType: item.itemType ?? 'homeopathy',
    remedyPath: `/${locale}/homeopathy/remedies/${item.remedySlug}`,
    potency: item.potency,
    granules: item.granules,
    timesPerDay: item.timesPerDay,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions,
    purpose: item.purpose,
    sequence: item.sequence,
  }
}

export function getClientPrescription(record, locale) {
  if (!record || record.kind === 'payment' || record.status !== 'active' || !isSupportedLocale(locale)) return undefined
  return {
    patientName: record.patientName,
    patientDob: record.patientDob,
    dateIssued: record.dateIssued,
    languagePreference: record.languagePreference,
    recommendationType: record.recommendationType,
    practitionerName: record.practitionerName,
    practitionerRole: record.practitionerRole,
    practitionerBackground: record.practitionerBackground,
    practitionerContact: record.practitionerContact,
    generalInstructions: record.generalInstructions,
    recommendationNumber: record.recommendationNumber,
    followUp: record.followUp,
    updatedAt: record.updatedAt,
    items: record.items.map((item) => clientItem(item, locale, record.recommendationType)),
  }
}

export function getPrescriptionRemedyOptions() {
  return getRemedyDirectory('en').map(({ slug }) => {
    const en = getRemedy('en', slug)
    const ru = getRemedy('ru', slug)
    return {
      slug,
      label: `${en.canonical_latin_name} — ${ru.russian_common_name ?? en.russian_common_name ?? ''}`,
      importNames: [slug.replaceAll('-', ' '), en.canonical_latin_name, en.russian_common_name, ru.russian_common_name, ...String(en.aliases ?? '').split(/[;,]/), ...String(ru.aliases ?? '').split(/[;,]/)].filter(Boolean),
      searchText: [slug, en.canonical_latin_name, en.russian_common_name, en.aliases, ru.russian_common_name, ru.aliases].filter(Boolean).join(' ').toLowerCase(),
    }
  })
}
