import { randomUUID } from 'node:crypto'

import { getRemedy, getRemedyDirectory, isSupportedLocale } from '../../data/remedies.js'

export const prescriptionStatuses = ['draft', 'active', 'revoked', 'archived']

function requiredText(value, name) {
  const text = String(value ?? '').trim()
  if (!text) throw new Error(`${name} is required`)
  return text
}

function optionalText(value) {
  const text = String(value ?? '').trim()
  return text || undefined
}

function optionalDate(value, name) {
  const text = optionalText(value)
  if (!text) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00.000Z`))) {
    throw new Error(`${name} must be an ISO date`)
  }
  return text
}

function validateItem(value, index) {
  const remedySlug = optionalText(value?.remedySlug)
  const displayNameOverride = optionalText(value?.displayNameOverride)
  if (remedySlug && !getRemedy('en', remedySlug)) throw new Error(`Unknown canonical remedy slug: ${remedySlug}`)
  if (!remedySlug && !displayNameOverride) throw new Error(`Item ${index + 1} needs a canonical remedy or an unlinked name`)

  return {
    id: randomUUID(),
    sortOrder: index,
    remedySlug,
    displayNameOverride,
    potency: optionalText(value?.potency),
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
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('At least one remedy item is required')

  return {
    patientName: requiredText(input.patientName, 'Patient name'),
    patientDob: optionalDate(input.patientDob, 'Patient DOB'),
    dateIssued: optionalDate(input.dateIssued, 'Date issued') ?? new Date().toISOString().slice(0, 10),
    languagePreference,
    practitionerName: requiredText(input.practitionerName, 'Practitioner name'),
    practitionerRole: optionalText(input.practitionerRole),
    practitionerBackground: optionalText(input.practitionerBackground),
    practitionerContact: optionalText(input.practitionerContact),
    generalInstructions: optionalText(input.generalInstructions),
    internalNotes: optionalText(input.internalNotes),
    status,
    items: input.items.map(validateItem),
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

function clientItem(item, locale) {
  if (!item.remedySlug) {
    return {
      displayName: item.displayNameOverride,
      potency: item.potency,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      notes: item.notes,
    }
  }

  const remedy = getRemedy(locale, item.remedySlug)
  if (!remedy) throw new Error(`Canonical remedy disappeared: ${item.remedySlug}`)
  return {
    displayName: remedy.canonical_latin_name,
    remedyPath: `/${locale}/homeopathy/remedies/${item.remedySlug}`,
    potency: item.potency,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions,
    notes: item.notes,
  }
}

export function getClientPrescription(record, locale) {
  if (!record || record.status !== 'active' || !isSupportedLocale(locale)) return undefined
  return {
    patientName: record.patientName,
    patientDob: record.patientDob,
    dateIssued: record.dateIssued,
    languagePreference: record.languagePreference,
    practitionerName: record.practitionerName,
    practitionerRole: record.practitionerRole,
    practitionerBackground: record.practitionerBackground,
    practitionerContact: record.practitionerContact,
    generalInstructions: record.generalInstructions,
    updatedAt: record.updatedAt,
    items: record.items.map((item) => clientItem(item, locale)),
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
