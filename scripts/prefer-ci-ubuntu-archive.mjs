import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUCTION_PATHS = Object.freeze({
  sources: '/etc/apt/sources.list.d/ubuntu.sources',
  mirrors: '/etc/apt/apt-mirrors.txt',
  keyring: '/usr/share/keyrings/ubuntu-archive-keyring.gpg',
  osRelease: '/usr/lib/os-release',
});
const MIRROR_URI = `mirror+file:${PRODUCTION_PATHS.mirrors}`;
const MIRROR_URLS = [
  'http://azure.archive.ubuntu.com/ubuntu/',
  'https://archive.ubuntu.com/ubuntu/',
  'https://security.ubuntu.com/ubuntu/',
];
const SOURCE_FIELDS = ['components', 'signed-by', 'suites', 'types', 'uris'];

function utf8(bytes) {
  const text = bytes.toString('utf8');
  return Buffer.from(text).equals(bytes) ? text : null;
}

function supportedCodename(bytes) {
  const text = utf8(bytes);
  if (text === null) return null;
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Z_]+)=(?:"([^"\r\n]*)"|([^"\s]*))$/.exec(line);
    if (!match || values.has(match[1])) return null;
    values.set(match[1], match[2] ?? match[3]);
  }
  if (values.get('ID') !== 'ubuntu') return null;
  const codename = { '24.04': 'noble', '26.04': 'resolute' }[values.get('VERSION_ID')];
  return codename && values.get('VERSION_CODENAME') === codename ? codename : null;
}

function recognizedSources(text, codename) {
  if (!['noble', 'resolute'].includes(codename)) return false;
  const stanzas = [];
  for (const paragraph of text.split(/\r?\n[ \t]*\r?\n/)) {
    const lines = paragraph.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('#'));
    if (!lines.length) continue;
    const fields = new Map();
    for (const line of lines) {
      // Continuations, disabled entries and every extra option are unsupported.
      const field = /^([A-Za-z-]+):[ \t]*(\S(?:.*\S)?)?[ \t]*$/.exec(line);
      if (!field || !field[2] || fields.has(field[1].toLowerCase())) return false;
      fields.set(field[1].toLowerCase(), field[2]);
    }
    if ([...fields.keys()].sort().join('|') !== SOURCE_FIELDS.join('|')) return false;
    if (fields.get('types') !== 'deb' || fields.get('signed-by') !== PRODUCTION_PATHS.keyring) return false;
    const components = fields.get('components').split(/[ \t]+/).sort();
    if (components.join(' ') !== 'main multiverse restricted universe') return false;
    stanzas.push(fields);
  }
  // Documented cloud-init base + security shape only. Not claimed to be a
  // measured hosted-runner snapshot; every other layout is an unchanged no-op.
  if (stanzas.length !== 2) return false;
  const [base, security] = stanzas;
  return base.get('uris') === MIRROR_URI &&
    base.get('suites') === `${codename} ${codename}-updates ${codename}-backports` &&
    [MIRROR_URI, 'http://security.ubuntu.com/ubuntu/', 'https://security.ubuntu.com/ubuntu/'].includes(security.get('uris')) &&
    security.get('suites') === `${codename}-security`;
}

export function planUbuntuMirrorPreference(sources, mirrors, codename) {
  const unchanged = (reason) => ({ changed: false, reason, content: mirrors });
  if (!recognizedSources(sources, codename)) return unchanged('unrecognized-source-layout');
  const lines = mirrors.split(/(?<=\n)/);
  const entries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.startsWith('#')) continue;
    const match = /^(https?:\/\/[^\s]+)(\t+)priority:([123])([ \t]*)(\r?\n)?$/.exec(line);
    if (!match) return unchanged('unrecognized-mirror-layout');
    // Exact allowlisted byte strings exclude credentials, ports and new URIs.
    entries.push({ index, url: match[1], priority: match[3] });
  }
  if (entries.length !== 3 || !entries.every((entry, index) => entry.url === MIRROR_URLS[index])) {
    return unchanged('unrecognized-mirror-set');
  }
  const priorities = entries.map((entry) => entry.priority).join('');
  if (priorities === '213') return unchanged('already-prefers-existing-archive');
  if (priorities !== '123') return unchanged('unrecognized-priorities');
  lines[entries[0].index] = lines[entries[0].index].replace('priority:1', 'priority:2');
  lines[entries[1].index] = lines[entries[1].index].replace('priority:2', 'priority:1');
  return { changed: true, reason: 'preferred-existing-archive-preserved-fallbacks', content: lines.join('') };
}

const IDENTITY_FIELDS = ['dev', 'ino', 'nlink', 'uid', 'gid', 'mode', 'size', 'mtimeNs', 'ctimeNs'];
function sameStat(left, right, fields = IDENTITY_FIELDS) {
  return fields.every((field) => left[field] === right[field]);
}
function safeStat(stat, uid, directory = false) {
  return (directory ? stat.isDirectory() : stat.isFile() && stat.nlink === 1n) &&
    stat.uid === BigInt(uid) && (Number(stat.mode) & 0o7022) === 0;
}
async function snapshot(path, io, uid, directory = false) {
  let handle;
  try {
    const namedBefore = await io.lstat(path, { bigint: true });
    if (!safeStat(namedBefore, uid, directory)) return null;
    handle = await io.open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | (directory ? constants.O_DIRECTORY : 0));
    const before = await handle.stat({ bigint: true });
    if (!safeStat(before, uid, directory) || !sameStat(namedBefore, before)) throw new Error('Input changed before opening');
    const bytes = directory ? Buffer.alloc(0) : await handle.readFile();
    const after = await handle.stat({ bigint: true });
    const named = await io.lstat(path, { bigint: true });
    if (!sameStat(before, after) || !sameStat(after, named) || !safeStat(named, uid, directory)) {
      throw new Error('Input changed while reading');
    }
    return { bytes, stat: after };
  } catch (error) {
    if (['ENOENT', 'ELOOP', 'ENOTDIR'].includes(error.code)) return null;
    throw error;
  } finally {
    await handle?.close();
  }
}
async function assertStable(path, old, io, uid, directory = false) {
  const current = await snapshot(path, io, uid, directory);
  const fields = directory ? ['dev', 'ino', 'uid', 'gid', 'mode'] : IDENTITY_FIELDS;
  if (!current || !sameStat(old.stat, current.stat, fields) || !old.bytes.equals(current.bytes)) {
    throw new Error('Input changed before or during commit');
  }
}

// Derive only the bounded ancestors of four fixed production paths. This is
// not a filesystem scan. A separate fixture root is available only to imports.
function ancestorPaths(paths, trustedRoot) {
  if (!isAbsolute(trustedRoot) || resolve(trustedRoot) !== trustedRoot) return null;
  const result = new Set([trustedRoot]);
  for (const name of ['sources', 'mirrors', 'keyring', 'osRelease']) {
    const path = paths[name];
    if (typeof path !== 'string' || !isAbsolute(path) || resolve(path) !== path) return null;
    const suffix = relative(trustedRoot, dirname(path));
    if (isAbsolute(suffix) || suffix === '..' || suffix.startsWith(`..${sep}`)) return null;
    const components = suffix ? suffix.split(sep) : [];
    if (components.length > 8) return null;
    let current = trustedRoot;
    for (const component of components) {
      current = join(current, component);
      result.add(current);
    }
  }
  if (result.size > 16) return null;
  return [...result].sort((a, b) => a.length - b.length || a.localeCompare(b));
}

// The exported function permits temp-fixture tests. Production CLI has fixed
// paths, fixed expectedUid=0 and no environment/argument path override.
export async function applyUbuntuMirrorPreference({ paths, expectedUid, trustedRoot = '/', io = fs }) {
  const unchanged = (reason) => ({ changed: false, reason });
  const ancestors = ancestorPaths(paths, trustedRoot);
  if (!ancestors) return unchanged('unrecognized-input-paths');
  const directories = new Map();
  for (const path of ancestors) {
    const current = await snapshot(path, io, expectedUid, true);
    if (!current) return unchanged('unrecognized-ancestor-directory');
    directories.set(path, current);
  }
  const inputs = {};
  for (const name of ['sources', 'mirrors', 'keyring', 'osRelease']) {
    inputs[name] = await snapshot(paths[name], io, expectedUid);
    if (!inputs[name]) return unchanged(`unrecognized-${name}-file`);
  }
  for (const [path, old] of directories) await assertStable(path, old, io, expectedUid, true);
  if (!inputs.keyring.bytes.length) return unchanged('empty-existing-keyring');
  const codename = supportedCodename(inputs.osRelease.bytes);
  const sourceText = utf8(inputs.sources.bytes);
  const mirrorText = utf8(inputs.mirrors.bytes);
  if (!codename || sourceText === null || mirrorText === null) return unchanged('unrecognized-platform-or-encoding');
  const plan = planUbuntuMirrorPreference(sourceText, mirrorText, codename);
  if (!plan.changed) return unchanged(plan.reason);
  const bytes = Buffer.from(plan.content);
  if (bytes.length !== inputs.mirrors.bytes.length ||
      bytes.reduce((sum, byte, index) => sum + (byte !== inputs.mirrors.bytes[index] ? 1 : 0), 0) !== 2) {
    throw new Error('Unexpected mirror modification');
  }
  const directoryPath = dirname(paths.mirrors);
  const temporaryPath = join(directoryPath, `.hh-apt-mirrors-${randomUUID()}.tmp`);
  let temporary;
  let committed = false;
  try {
    temporary = await io.open(temporaryPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    await temporary.writeFile(bytes);
    await temporary.chown(Number(inputs.mirrors.stat.uid), Number(inputs.mirrors.stat.gid));
    await temporary.chmod(Number(inputs.mirrors.stat.mode) & 0o777);
    await temporary.sync();
    await temporary.close();
    temporary = null;
    const ready = await snapshot(temporaryPath, io, expectedUid);
    if (!ready || !ready.bytes.equals(bytes) ||
        !sameStat(ready.stat, inputs.mirrors.stat, ['uid', 'gid', 'mode'])) throw new Error('Temporary readback mismatch');
    // Recheck every input's bytes and identity immediately before the atomic
    // rename. No multi-file transaction against a non-cooperating root writer
    // is possible; post-commit drift is fatal before installation can proceed.
    for (const name of ['sources', 'keyring', 'osRelease', 'mirrors']) {
      await assertStable(paths[name], inputs[name], io, expectedUid);
    }
    for (const [path, old] of directories) await assertStable(path, old, io, expectedUid, true);
    await io.rename(temporaryPath, paths.mirrors);
    committed = true;
    const result = await snapshot(paths.mirrors, io, expectedUid);
    if (!result || !result.bytes.equals(bytes) ||
        !sameStat(result.stat, inputs.mirrors.stat, ['uid', 'gid', 'mode'])) throw new Error('Committed readback mismatch');
    for (const name of ['sources', 'keyring', 'osRelease']) await assertStable(paths[name], inputs[name], io, expectedUid);
    for (const [path, old] of directories) await assertStable(path, old, io, expectedUid, true);
    return {
      changed: true,
      reason: plan.reason,
      codename,
      unchangedSourcesSha256: createHash('sha256').update(inputs.sources.bytes).digest('hex'),
      unchangedKeyringSha256: createHash('sha256').update(inputs.keyring.bytes).digest('hex'),
      unchangedOsReleaseSha256: createHash('sha256').update(inputs.osRelease.bytes).digest('hex'),
    };
  } finally {
    await temporary?.close();
    if (!committed) await io.unlink(temporaryPath).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--apply') throw new Error('Expected --apply');
  const receipt = await applyUbuntuMirrorPreference({ paths: PRODUCTION_PATHS, expectedUid: 0, trustedRoot: '/' });
  console.log(`CI_UBUNTU_MIRROR ${JSON.stringify(receipt)}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(`CI_UBUNTU_MIRROR fatal ${error.code ?? error.message}`);
    process.exitCode = 1;
  });
}
