// Run audited Remaster v0.2.1 in a disposable feature-mode workspace.
// Public official docs metadata only; no competitor code extraction, cookies,
// browser login, providers, data mutation, or production project changes.
import { existsSync, mkdirSync, mkdtempSync, copyFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const bin = process.env.HH_REMASTER_BIN
if (!bin || !existsSync(bin)) throw Error('REMASTER_PINNED_BINARY_REQUIRED')
const workspace = mkdtempSync(join(tmpdir(), 'hh-salesbot-remaster-'))
const target = 'https://www.amocrm.ru/support/digitalpipeline/salesbot'
const run = (args) => {
  const res = spawnSync(bin, args, {
    cwd: workspace, encoding: 'utf8', timeout: 40000, maxBuffer: 512 * 1024,
    env: { ...process.env, REMASTER_NO_TELEMETRY: '1' },
  })
  if (res.error) throw res.error
  return res
}
const initialized = run(['init', target, '--mode', 'feature', '--name', 'amoCRM Salesbot'])
if (initialized.status !== 0) throw Error('REMASTER_INIT_FAILED ' + initialized.stderr.slice(0, 450))
copyFileSync(join(root, 'data/benchmarking/salesbot-remaster-features.csv'),
  join(workspace, 'remaster/features.csv'))
copyFileSync(join(root, 'data/benchmarking/salesbot-remaster-sources.csv'),
  join(workspace, 'remaster/sources.csv'))
// 30 authentic customer reviews and an authorized competitor account were NOT
// supplied; the research gate must correctly remain incomplete.
const status = run(['status', '--json'])
if (status.status !== 0) throw Error('REMASTER_STATUS_FAILED ' + status.stderr.slice(0, 400))
const state = JSON.parse(status.stdout)
if (state.state.mode !== 'feature' || state.current.stage !== 'research')
  throw Error('REMASTER_WRONG_SCOPE')
const checks = state.current.checks
const find = name => checks.find(check => check.name === name)
if (find('sources')?.status !== 'pass' || find('features')?.status !== 'pass')
  throw Error('REMASTER_EVIDENCE_SCHEMA_NOT_ACCEPTED')
if (find('reviews')?.status === 'pass' || find('pains')?.status === 'pass')
  throw Error('REMASTER_FALSE_REVIEW_EVIDENCE')
const parity = run(['parity', '--json'])
// Missing core feature parity must NOT be misrepresented as a passing gate.
if (parity.status !== 1) throw Error('REMASTER_PARITY_UNEXPECTED_EXIT_' + parity.status)
const result = JSON.parse(parity.stdout)
if (result.problems.length || result.verdict !== 'not shippable'
  || result.musts.done === result.musts.total)
  throw Error('REMASTER_PARITY_OVERCLAIM')
const report = {
  schemaVersion: 1,
  benchmark: 'amoCRM Salesbot public-doc feature study',
  target, method: 'remaster_feature_mode_pinned',
  package: '@thenavidm/remaster@0.2.1',
  environment: 'isolated_git_actions_no_competitor_login',
  evidence: 'public_docs_only',
  originalEditorInteractiveVerification: false,
  customerReviewsVerified: 0,
  stage: state.current.stage,
  gates: checks.map(({ name, status }) => ({ name, status })),
  parity: {
    score: result.parity, verdict: result.verdict,
    musts: result.musts, missing: result.missing,
  },
  notes: [
    'No competitor scripts/assets/private endpoints, owner-client records or secrets were read.',
    'Feature baseline is source-backed but not original editor browser E2E.',
    'No real outbound replies, consented leads, bookings or payments verified.',
  ],
}
const dest = join(root, 'artifacts/benchmarking')
mkdirSync(dest, { recursive: true })
writeFileSync(join(dest, 'salesbot-remaster-parity.json'), JSON.stringify(report, null, 2) + '\n')
process.stdout.write(JSON.stringify({ remaster: 'feature', sources: 4, reviews: 0,
  status: report.parity.verdict, parity: report.parity.score,
  musts: report.parity.musts, artifact: 'artifacts/benchmarking/salesbot-remaster-parity.json' }) + '\n')
