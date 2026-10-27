#!/usr/bin/env node
/**
 * Source-only reproducible reviewer ledger.
 * Does NOT read accounts, private responses, health data, DB, consent records,
 * storage or providers. This is a taxonomy coverage audit, NOT validation.
 *
 * node scripts/audit-profile-construct-links.mjs --verify
 * node scripts/audit-profile-construct-links.mjs --json
 * node scripts/audit-profile-construct-links.mjs --csv > profile-axes-review.csv
 */
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import {
  PROFILE_FOCUS_AREAS, PROFILE_AREA_AXES, PROFILE_RESEARCH_AXES,
  buildProfileScaleGroups, profileAreasWithTests,
} from '../lib/profile/profile-scale-selection.js'

const getAllAreas = () => [...new Set(Object.values(PROFILE_FOCUS_AREAS).flat())]
const isScored = item => item.selectable === true && item.startable === true &&
  item.rightsStatus === 'cleared' && item.scaleGuide?.measurementAxes?.length > 0
const isGuest = item => isScored(item) && item.guestEligible === true &&
  item.starterEligible !== false && item.free === true && item.explicitOptIn !== true
const toSource = entry => ({
  key: entry.key, title: entry.title, topics: entry.topics, testKind: entry.testKind,
  axes: entry.scaleGuide?.measurementAxes || [], minutes: entry.durationMinutes,
  questions: entry.questionCount, scales: (entry.scaleGuide?.scales || []).filter(scale =>
    scale && typeof scale.key === 'string' && typeof scale.axis === 'string' &&
    entry.scaleGuide.measurementAxes.includes(scale.axis)),
})

export function auditProfileConstructLinks() {
  const all = buildExplorerEntries({ locale: 'en', audience: 'account' })
  const candidates = all.filter(isScored).map(toSource)
  const guestCatalogue = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const publicTests = guestCatalogue.filter(isGuest).map(toSource)
  const areas = getAllAreas()
  const accountGroups = buildProfileScaleGroups(candidates, areas, PROFILE_AREA_AXES)
  const guestGroups = buildProfileScaleGroups(publicTests, areas, PROFILE_AREA_AXES)
  const covered = new Set(accountGroups.flatMap(group => group.scales.map(scale => scale.testKey)))
  const guestCovered = new Set(guestGroups.flatMap(group => group.scales.map(scale => scale.testKey)))
  const unlinked = candidates.filter(item => !covered.has(item.key)).map(item => item.key)
  const guestUnlinked = publicTests.filter(item => !guestCovered.has(item.key)).map(item => item.key)
  const emptyGuestTopics = areas.filter(area =>
    !guestGroups.some(group => group.area === area && group.scales.length > 0))
  const emptyResearchFacets = areas.flatMap(area => (PROFILE_RESEARCH_AXES[area] || [])
    .filter(spec => !accountGroups.find(group => group.area === area)
      ?.researchAxes.some(axis => axis.id === area + '::' + spec.id))
    .map(spec => area + '::' + spec.id))
  const sourceLinks = accountGroups.flatMap(group => group.scales.map(scale => {
    const entry = all.find(item => item.key === scale.testKey)
    return Object.freeze({
      scope: 'account', key: scale.testKey, version: entry?.catalog?.version || '',
      instrumentLocale: entry?.catalog?.instrumentLocale || '',
      testKind: entry?.testKind || '', topic: group.area,
      facet: scale.researchAxisId, scorerAxis: scale.axis,
      dimension: scale.key, rightsStatus: entry?.rightsStatus || '',
      psychometricReview: entry?.key?.startsWith('hh-')
        ? 'independent_validation_pending' : 'evidence_assessment_method_specific',
    })
  }))
  const guestLinks = guestGroups.flatMap(group => group.scales.map(scale => Object.freeze({
    scope: 'guest', key: scale.testKey, topic: group.area,
    facet: scale.researchAxisId, scorerAxis: scale.axis, dimension: scale.key,
  })))
  const referenceRows = all.filter(entry => !isScored(entry)).map(entry => Object.freeze({
    scope: 'reference_only', key: entry.key, version: entry.catalog?.version || '',
    testKind: entry.testKind, category: entry.category, authoredTopics: entry.topics,
    reason: !entry.startable ? 'not_startable' :
      entry.rightsStatus !== 'cleared' ? 'rights_not_cleared' : 'no_scored_measurement_axis',
  }))
  const methodKeys = new Set(all.map(entry => entry.key))
  const original = all.filter(entry => entry.source === 'product' &&
    entry.key.startsWith('hh-') && entry.startable === true)
  const result = {
    purpose: 'source-only taxonomy/construct-link audit; not psychometric validation',
    counts: Object.freeze({
      catalogue: all.length, uniqueMethods: methodKeys.size,
      scoredAccount: candidates.length, scoredGuest: publicTests.length,
      authorMethodsAwaitingIndependentReview: original.length,
      researchFacets: Object.values(PROFILE_RESEARCH_AXES).flat().length,
      profiles: Object.keys(PROFILE_FOCUS_AREAS).length, topics: areas.length,
      accountSourceLinks: sourceLinks.length, guestSourceLinks: guestLinks.length,
      referenceOnly: referenceRows.length,
    }),
    unlinked: Object.freeze(unlinked),
    guestUnlinked: Object.freeze(guestUnlinked),
    emptyGuestTopics: Object.freeze(emptyGuestTopics),
    emptyResearchFacets: Object.freeze(emptyResearchFacets),
    guestTopics: Object.freeze(areas.filter(area =>
      guestGroups.some(group => group.area === area && group.scales.length > 0))),
    sourceLinks: Object.freeze(sourceLinks),
    guestLinks: Object.freeze(guestLinks),
    referenceRows: Object.freeze(referenceRows),
  }
  return Object.freeze(result)
}

const quoteCsv = value => {
  const raw = Array.isArray(value) ? value.join(';') : String(value ?? '')
  const safe = /^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw
  return '"' + safe.replace(/"/g, '""').replace(/[\r\n]+/g, ' ') + '"'
}
export function profileAxisCsv(report) {
  const columns = ['scope','key','version','instrumentLocale','testKind','topic',
    'facet','scorerAxis','dimension','rightsStatus','psychometricReview','category',
    'authoredTopics','reason']
  const rows = [...report.sourceLinks,...report.guestLinks,...report.referenceRows]
  return [columns.join(','),...rows.map(row =>
    columns.map(column => quoteCsv(row[column])).join(','))].join('\n') + '\n'
}

// Importing this module in tests does not print anything or mutate files.
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const report = auditProfileConstructLinks()
  if (process.argv.includes('--verify')) {
    const bad = report.unlinked.length || report.guestUnlinked.length ||
      report.counts.uniqueMethods !== report.counts.catalogue ||
      report.counts.researchFacets !== 32 ||
      report.counts.profiles !== 4
    console.log(JSON.stringify({
      counts: report.counts, unlinked: report.unlinked, guestUnlinked: report.guestUnlinked,
      emptyGuestTopics: report.emptyGuestTopics, emptyResearchFacets: report.emptyResearchFacets,
    }, null, 2))
    if (bad) process.exitCode = 1
  } else if (process.argv.includes('--csv')) process.stdout.write(profileAxisCsv(report))
  else if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(report, null, 2) + '\n')
  else console.log(JSON.stringify(report.counts, null, 2))
}
