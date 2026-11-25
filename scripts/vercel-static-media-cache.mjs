// Deterministic public build artifacts only. Vercel's Next.js preset persists
// .next/cache/**. This is not runtime/customer storage and never a source of truth.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync, lstatSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const digest = value => createHash('sha256').update(value).digest('hex');
const MAX_BYTES = 8 * 1024 * 1024;

export function createStaticMediaCache({ root = process.cwd(), group, sources,
  enabled = process.env.VERCEL_ENV === 'production' } = {}) {
  if (!/^[a-z0-9-]+$/.test(group)) throw Error('Invalid static media cache group');
  let key;
  if (enabled) {
    try {
      const hash = createHash('sha256').update('hh-static-media-v1\0' +
        process.platform + '/' + process.arch + '/' + process.versions.node);
      for (const source of [...sources, 'scripts/vercel-static-media-cache.mjs', 'package-lock.json']) {
        hash.update('\0' + source + '\0').update(readFileSync(join(root, source)));
      }
      key = hash.digest('hex');
    } catch { /* Missing source pin: normal generation, never an unpinned hit. */ }
  }
  // Fixed slots replace old versions rather than accumulating every source revision.
  const dir = join(root, '.next/cache/hh-static-media', group);
  const stats = { hits: 0, misses: 0 };
  const slot = name => join(dir, digest(name));
  const check = (bytes, validate) => {
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_BYTES || !validate(bytes)) {
      throw Error('Invalid generated static media artifact');
    }
  };
  return {
    stats,
    get(name, validate) {
      if (key) try {
        const file = slot(name);
        const metadata = JSON.parse(readFileSync(file + '.json', 'utf8'));
        const stat = lstatSync(file);
        if (metadata.key !== key || !stat.isFile() || stat.size > MAX_BYTES || stat.size !== metadata.size) throw Error('cache miss');
        const bytes = readFileSync(file);
        check(bytes, validate);
        if (digest(bytes) !== metadata.sha256) throw Error('cache corruption');
        stats.hits++;
        return bytes;
      } catch { /* Invalid/missing entries must regenerate using the approved source. */ }
      stats.misses++;
      return null;
    },
    put(name, bytes, validate) {
      check(bytes, validate); // A generation error still blocks the build.
      if (key) {
        const file = slot(name), tmp = file + '.tmp-' + process.pid;
        try {
          mkdirSync(dir, { recursive: true });
          writeFileSync(tmp, bytes);
          renameSync(tmp, file);
          writeFileSync(tmp, JSON.stringify({ key, size: bytes.length, sha256: digest(bytes) }));
          renameSync(tmp, file + '.json');
        } catch { /* Cache is optional; keep the real generated output. */ }
        finally { try { rmSync(tmp, { force: true }); } catch {} }
      }
      return bytes;
    },
  };
}

export const isPcmWav = (bytes, rate, seconds) =>
  bytes.length === 44 + rate * seconds * 2 &&
  bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.readUInt32LE(4) === bytes.length - 8 &&
  bytes.toString('ascii', 8, 16) === 'WAVEfmt ' && bytes.readUInt32LE(16) === 16 &&
  bytes.readUInt16LE(20) === 1 && bytes.readUInt16LE(22) === 1 &&
  bytes.readUInt32LE(24) === rate && bytes.readUInt32LE(28) === rate * 2 &&
  bytes.readUInt16LE(32) === 2 && bytes.readUInt16LE(34) === 16 &&
  bytes.toString('ascii', 36, 40) === 'data' && bytes.readUInt32LE(40) === bytes.length - 44;
