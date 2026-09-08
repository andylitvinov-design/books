import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { missingRequiredSections, readCsv, requiredSectionsIn, telegramTexts } from './remedy-source-completeness.mjs'

const projectRoot = process.cwd()
const exportRoot = process.env.TELEGRAM_PSYCHIC_ALCHEMY_EXPORT
  || '/Users/andriilitvinov/Downloads/Telegram Desktop/ChatExport_2026-09-04'
const inventory = readCsv(path.join(projectRoot, 'data/remedy-source-inventory.csv')).filter(({ candidate_status }) => candidate_status === 'confirmed')
const index = readCsv(path.join(projectRoot, 'data/telegram-psychic-alchemy-index.csv'))
const telegram = telegramTexts(exportRoot)
const baseRef = execFileSync('git', ['merge-base', 'HEAD', 'origin/codex/public-book-library'], { cwd: projectRoot, encoding: 'utf8' }).trim()

function parseFrontmatter(source) {
  const match = source.match(/^---\n[\s\S]*?\n---\n([\s\S]+)$/)
  if (!match) throw new Error('invalid canonical remedy markdown')
  return match[1].trim()
}

function sourceRecord(row) {
  return `${row.message_id}${row.date_utc_offset ? ` (${row.date_utc_offset})` : ''}`
}

function csv(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const rows = inventory.map((remedy) => {
  const sources = index.filter(({ remedy_slug, remedy_focus }) => remedy_slug === remedy.slug && (remedy_focus === 'full_card' || remedy_focus === 'supporting_post'))
  const full = sources.filter(({ remedy_focus }) => remedy_focus === 'full_card').sort((left, right) => (telegram.get(right.message_id) || '').length - (telegram.get(left.message_id) || '').length)
  const supporting = sources.filter(({ remedy_focus }) => remedy_focus === 'supporting_post')
  if (!full.length) throw new Error(`${remedy.slug} has no full-card source`)
  const primary = full[0]
  const primaryText = telegram.get(primary.message_id) || ''
  const current = parseFrontmatter(readFileSync(path.join(projectRoot, 'content/remedies/ru', `${remedy.slug}.md`), 'utf8'))
  const baseline = parseFrontmatter(execFileSync('git', ['show', `${baseRef}:content/remedies/ru/${remedy.slug}.md`], { cwd: projectRoot, encoding: 'utf8' }))
  const missingBefore = missingRequiredSections(primaryText, baseline)
  const missingAfter = missingRequiredSections(primaryText, current)
  return {
    canonical_latin_name: remedy.canonical_latin_name,
    slug: remedy.slug,
    primary_source_message: sourceRecord(primary),
    primary_source_sections: requiredSectionsIn(primaryText).join('; '),
    full_card_sources: full.map(sourceRecord).join('; '),
    supplementary_sources: supporting.map(sourceRecord).join('; '),
    manual_source_file: remedy.source_file,
    baseline_characters: baseline.length,
    primary_source_characters: primaryText.length,
    rebuilt_characters: current.length,
    truncated_before: primaryText.length > baseline.length * 1.2 ? 'yes' : 'no',
    missing_sections_before: missingBefore.join('; '),
    missing_sections_after: missingAfter.join('; '),
  }
})

const header = Object.keys(rows[0])
writeFileSync(path.join(projectRoot, 'data/remedy-source-completeness-audit.csv'), `${header.join(',')}\n${rows.map((row) => header.map((field) => csv(row[field])).join(',')).join('\n')}\n`)

const truncated = rows.filter(({ truncated_before }) => truncated_before === 'yes')
const withSupplementary = rows.filter(({ supplementary_sources }) => supplementary_sources).length
const supplementaryItems = rows.reduce((count, { supplementary_sources }) => count + (supplementary_sources ? supplementary_sources.split('; ').length : 0), 0)
const currentMissing = rows.filter(({ missing_sections_after }) => missing_sections_after)
const arsenicum = rows.find(({ slug }) => slug === 'arsenicum-album')
const report = `# Remedy source-completeness audit\n\n- Canonical remedies audited: ${rows.length}\n- Full-card Telegram primary sources: ${rows.length}\n- Previous truncated cards (primary source > 120% of previous canonical body): ${truncated.length}\n- Rebuilt RU cards: ${rows.length}\n- Remedies with supplementary materials: ${withSupplementary}\n- Supplementary items: ${supplementaryItems}\n- Current cards missing a required primary-source section: ${currentMissing.length}\n\n## Arsenicum Album regression\n\n- Primary source: ${arsenicum.primary_source_message}\n- Previous canonical body: ${arsenicum.baseline_characters} characters\n- Rebuilt canonical body: ${arsenicum.rebuilt_characters} characters\n- Required source sections restored: ${arsenicum.primary_source_sections}\n\n## Method\n\nEach card retains its existing inventory/manual reference, but the primary canonical text is the longest remedy-focused Telegram full card. Other full cards are merged only when their blocks are not already present. Supporting posts remain under the separate supplementary-materials section. The source channel reference is [Psychic Alchemy](https://t.me/arche_therapy); the export does not expose a reliable public per-message URL, so no message permalink was inferred.\n\nSee [the machine-readable audit](../data/remedy-source-completeness-audit.csv) for every card and source record.\n`
writeFileSync(path.join(projectRoot, 'docs/remedy-source-completeness-audit.md'), report)
console.log(`audited=${rows.length} truncated_before=${truncated.length} rebuilt=${rows.length} supplementary_remedies=${withSupplementary} supplementary_items=${supplementaryItems} missing_after=${currentMissing.length}`)
