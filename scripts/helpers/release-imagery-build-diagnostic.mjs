import * as nodeFs from 'node:fs';

// Read only the build in the workflow's current repository directory. Neither
// the file path nor the entrypoint may come from a request, argument or env var.
const manifestPath = '.next/app-build-manifest.json';
const entrypoint = '/[locale]/services/imagery-therapy/page';
const maxBytes = 4 * 1024 * 1024;
const maxFiles = 64;
const maxFilenameLength = 160;
const publicJavascript = [
  /^static\/chunks\/(?:webpack|main-app|[0-9]+|[0-9a-f]{8})-[0-9a-f]{16}\.js(?![\s\S])/,
  /^static\/chunks\/app\/layout-[0-9a-f]{16}\.js(?![\s\S])/,
  /^static\/chunks\/app\/\[locale\]\/services\/imagery-therapy\/page-[0-9a-f]{16}\.js(?![\s\S])/,
];
const invalid = reason => ({ status: 'invalid', reason });
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// This is evidence about one generated public entry, NOT network permission.
// An unrecognized value invalidates the whole projection, never a partial list.
export function projectReleaseImageryBuildManifest(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > maxBytes) return invalid('size');
  let manifest;
  try { manifest = JSON.parse(text); } catch { return invalid('json'); }
  if (!isObject(manifest) || Object.keys(manifest).length !== 1
    || !Object.hasOwn(manifest, 'pages') || !isObject(manifest.pages)) return invalid('shape');
  if (!Object.hasOwn(manifest.pages, entrypoint)) return { status: 'absent', reason: 'entrypoint' };
  const files = manifest.pages[entrypoint];
  if (!Array.isArray(files) || files.length === 0 || files.length > maxFiles) return invalid('files');
  if (files.some(file => typeof file !== 'string' || file.length > maxFilenameLength
    || !publicJavascript.some(pattern => pattern.test(file)))) return invalid('filename');
  if (new Set(files).size !== files.length) return invalid('duplicates');
  return { status: 'present', entrypoint, files: [...files] };
}

export function readReleaseImageryBuildDiagnostic(fs = nodeFs) {
  let fd;
  let report;
  try {
    const directory = fs.lstatSync('.next');
    if (!directory.isDirectory() || directory.isSymbolicLink()) return invalid('file-type');
    // NONBLOCK prevents an unexpected FIFO from hanging before fstat rejects it.
    fd = fs.openSync(manifestPath, nodeFs.constants.O_RDONLY | nodeFs.constants.O_NOFOLLOW | nodeFs.constants.O_NONBLOCK);
    const before = fs.fstatSync(fd);
    if (!before.isFile()) report = invalid('file-type');
    else if (!Number.isSafeInteger(before.size) || before.size < 1 || before.size > maxBytes) report = invalid('size');
    else {
      // Read at most the limit plus one byte, even if a file grows after stat.
      const buffer = Buffer.alloc(maxBytes + 1);
      let used = 0;
      while (used < buffer.length) {
        const count = fs.readSync(fd, buffer, used, buffer.length - used, null);
        if (count === 0) break;
        used += count;
      }
      const after = fs.fstatSync(fd);
      if (used > maxBytes) report = invalid('size');
      else if (used !== before.size || after.size !== before.size
        || after.mtimeMs !== before.mtimeMs || after.ino !== before.ino || after.dev !== before.dev) report = invalid('changed');
      else report = projectReleaseImageryBuildManifest(buffer.subarray(0, used).toString('utf8'));
    }
  } catch (error) {
    report = error?.code === 'ENOENT' ? { status: 'absent', reason: 'manifest' } : { status: 'unreadable' };
  } finally {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch { report = { status: 'unreadable' }; }
    }
  }
  return report;
}
