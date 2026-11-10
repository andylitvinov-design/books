#!/usr/bin/env node
/**
 * Offline reference-to-own-product feature readiness lab.
 * This never contacts Canva, uses Canva MCP, downloads assets or reverse engineers
 * external code. Paths only indicate an existing own-source file, NOT working UX.
 * Optional --remaster runs pinned Remaster in an isolated temporary directory
 * with doc-citation metadata, without browser navigation or competitor access.
 */
import {readFileSync, existsSync, realpathSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve, sep, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const own = fileURLToPath(import.meta.url);
const root = resolve(dirname(own), '../..');
const manifestPath = join(dirname(own), 'reference.json');
const REPORT = 'artifacts/benchmarking/video-studio-feature-lab.json';
const FIRST_PARTY = 'https://holistichouse.vercel.app/ru';
const PRIORITY = new Set(['P0', 'P1', 'P2']);
const invalid = message => { throw new Error('VIDEO_FEATURE_LAB_INVALID: ' + message); };

export function validateReference(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.sourceEvidence !== 'OFFICIAL_HELP_PAGES_ONLY' ||
    manifest.competitorServiceAccess !== 'NOT_PERFORMED' || !Array.isArray(manifest.referenceDocs) ||
    !Array.isArray(manifest.features) || manifest.features.length < 1 || manifest.features.length > 30)
    invalid('manifest scope');
  const sources = new Set();
  for (const doc of manifest.referenceDocs) {
    const url = new URL(doc.url);
    if (!/^S\d+$/.test(doc.id) || url.protocol !== 'https:' || url.hostname !== 'www.canva.com' ||
      !url.pathname.startsWith('/help/') || url.username || url.password || url.search || url.hash || sources.has(doc.id))
      invalid('source metadata');
    sources.add(doc.id);
  }
  const seen = new Set();
  for (const row of manifest.features) {
    if (!/^F\d+$/.test(row.id) || seen.has(row.id) || !PRIORITY.has(row.priority) ||
      typeof row.name !== 'string' || row.name.length < 12 || !sources.has(row.source) ||
      typeof row.next !== 'string' || row.next.length < 24 || !Array.isArray(row.hhFiles) ||
      row.hhFiles.length < 1 || row.hhFiles.length > 4) invalid('feature row');
    seen.add(row.id);
    for (const path of row.hhFiles) {
      if (typeof path !== 'string' || !/^(components|lib|scripts|app)\/[a-zA-Z0-9_./-]+$/.test(path) ||
        path.split('/').includes('..') || path.split('/').includes('.') || path.includes('//')) invalid('own source path');
    }
  }
  return manifest;
}

export function inspectOwnCode(manifest, base = root) {
  validateReference(manifest);
  const safeRoot = realpathSync(base);
  const rows = manifest.features.map(feature => {
    const locations = feature.hhFiles.map(path => {
      const pathname = resolve(safeRoot, path);
      const rel = relative(safeRoot, pathname);
      const inside = rel && rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel);
      if (!inside) invalid('path escaped project');
      let present = false;
      if (existsSync(pathname)) {
        const target = realpathSync(pathname);
        const targetRel = relative(safeRoot, target);
        present = targetRel && targetRel !== '..' && !targetRel.startsWith('..' + sep) &&
          !isAbsolute(targetRel) && statSync(target).isFile();
      }
      return {path, ownCodeFilePresent: Boolean(present)};
    });
    return {
      id: feature.id, feature: feature.name, priority: feature.priority, source: feature.source,
      locations, filesPresent: locations.filter(item => item.ownCodeFilePresent).length,
      filesExpected: locations.length, implementationVerified: false, browserVerified: false,
      exportedVideoVerified: false, next: feature.next,
    };
  });
  return {
    schemaVersion: 1, product: 'Holistic House Video Studio', evidence: 'PUBLISHED_DOCS_PLUS_OWN_FILE_PRESENCE',
    competitorServiceAccess: 'NOT_PERFORMED', competitorCodeCopied: false,
    remasterBrowserNavigation: false, productionReady: false, rows,
  };
}

function csv(values) {
  return values.map(row => row.map(value => '"' + String(value).replaceAll('"', '""').replaceAll('\r', ' ').replaceAll('\n', ' ') + '"').join(',')).join('\n') + '\n';
}
function remasterCall(bin, args, cwd) {
  const process = spawnSync(bin, args, {
    cwd, encoding: 'utf8', timeout: 45_000, maxBuffer: 512 * 1024,
    env: {...processEnv(), REMASTER_NO_TELEMETRY: '1'},
  });
  if (process.error) throw process.error;
  return process;
}
function processEnv() {
  // Keep CLI execution and install in a separate, unprivileged, clean CI job.
  // No credentials are passed by this script from data, files or CLI options.
  return {PATH: globalThis.process.env.PATH, HOME: globalThis.process.env.HOME, TMPDIR: globalThis.process.env.TMPDIR || '/tmp'};
}
export function runPinnedRemaster(manifest, inventory, bin) {
  if (!bin || !isAbsolute(bin) || !existsSync(bin) || !statSync(bin).isFile())
    invalid('HH_REMASTER_BIN absolute verified executable path is required');
  const temp = mkdtempSync(join(tmpdir(), 'hh-video-feature-docs-'));
  try {
    const init = remasterCall(bin, ['init', FIRST_PARTY, '--mode', 'feature', '--name', 'Holistic House video feature planning'], temp);
    if (init.status !== 0) invalid('Remaster feature init: ' + init.stderr.slice(0, 180));
    const dest = join(temp, 'remaster');
    if (!existsSync(dest)) invalid('Remaster workspace missing');
    writeFileSync(join(dest, 'sources.csv'), csv([
      ['id','kind','url','title','read_at','notes'],
      ...manifest.referenceDocs.map(source => [source.id, 'official_doc', source.url, source.title, '2026-10-31', 'Published Help Center text only; no editor or API access']),
    ]));
    writeFileSync(join(dest, 'features.csv'), csv([
      ['id','feature','area','priority','original','clone','source','notes'],
      ...manifest.features.map(row => [row.id, row.name, 'video', row.priority === 'P0' ? 'must' : 'should',
        'yes', 'no', row.source, 'Documentation-only pattern; existing own source paths are NOT verified feature parity']),
    ]));
    const status = remasterCall(bin, ['status', '--json'], temp);
    if (status.status !== 0) invalid('Remaster status failed');
    const parsed = JSON.parse(status.stdout);
    if (parsed.state?.mode !== 'feature' || parsed.current?.stage !== 'research')
      invalid('Remaster unexpected stage or mode');
    const gate = parsed.current?.checks || [];
    if (gate.find(x => x.name === 'sources')?.status !== 'pass' ||
        gate.find(x => x.name === 'features')?.status !== 'pass')
      invalid('Remaster doc citations or feature schema rejected');
    const parity = remasterCall(bin, ['parity', '--json'], temp);
    if (parity.status !== 1) invalid('Remaster parity must fail before independent feature build and browser E2E');
    const result = JSON.parse(parity.stdout);
    if (result.verdict !== 'not shippable' || result.musts?.done !== 0)
      invalid('Remaster incorrectly accepted unimplemented feature parity');
    return {...inventory, remaster: {version: '0.2.1', mode: parsed.state.mode,
      stage: parsed.current.stage, sourceCheck: 'pass', featureCheck: 'pass',
      verdict: result.verdict, musts: result.musts, explicitlyNotValidated: ['competitor editor','HH live video export']}};
  } finally { rmSync(temp, {recursive: true, force: true}); }
}

export const readManifest = () => validateReference(JSON.parse(readFileSync(manifestPath, 'utf8')));
function main() {
  const args = globalThis.process.argv.slice(2);
  if (args.some(arg => !['--json', '--remaster', '--help'].includes(arg))) invalid('args');
  if (args.includes('--help')) {
    console.log('Usage: node tools/video-feature-lab/run.mjs [--json|--remaster]');
    console.log('No competitor access. --remaster requires independently pinned HH_REMASTER_BIN.');
    return;
  }
  const manifest = readManifest();
  const inventory = inspectOwnCode(manifest);
  const result = args.includes('--remaster')
    ? runPinnedRemaster(manifest, inventory, globalThis.process.env.HH_REMASTER_BIN)
    : inventory;
  if (args.includes('--remaster')) {
    const file = resolve(root, REPORT);
    mkdirSync(dirname(file), {recursive: true});
    writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
  }
  if (args.includes('--json') || args.includes('--remaster'))
    console.log(JSON.stringify(result, null, 2));
  else {
    console.log('HH video feature lab · PUBLIC HELP DOCUMENTATION + OWN SOURCE PATHS ONLY');
    for (const row of result.rows)
      console.log(`${row.priority} ${row.id}: ${row.filesPresent}/${row.filesExpected} own source paths; NOT E2E VERIFIED · ${row.feature}`);
    console.log('Ready for production: NO. Next: own-site smoke, real MP4 export verification; no Canva scanning.');
  }
}
if (globalThis.process.argv[1] && resolve(globalThis.process.argv[1]) === own) {
  try { main(); } catch (error) { console.error(error.message || String(error)); globalThis.process.exitCode = 1; }
}
