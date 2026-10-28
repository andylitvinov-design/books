import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { applyUbuntuMirrorPreference, planUbuntuMirrorPreference } from '../scripts/prefer-ci-ubuntu-archive.mjs';

const base = 'Types: deb\nURIs: mirror+file:/etc/apt/apt-mirrors.txt\nSuites: noble noble-updates noble-backports\nComponents: main universe restricted multiverse\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n';
const security = base.replace('noble noble-updates noble-backports', 'noble-security');
const sources = `${base}\n${security}`;
const mirrors = '# Runner mirror choices\nhttp://azure.archive.ubuntu.com/ubuntu/\tpriority:1\n\nhttps://archive.ubuntu.com/ubuntu/\tpriority:2\nhttps://security.ubuntu.com/ubuntu/\tpriority:3\n';
const preferred = mirrors.replace('priority:1', 'priority:X').replace('priority:2', 'priority:1').replace('priority:X', 'priority:2');
const osRelease = 'NAME="Ubuntu"\nID=ubuntu\nVERSION_ID="24.04"\nVERSION_CODENAME=noble\n';
const plan = (source = sources, mirror = mirrors, codename = 'noble') => planUbuntuMirrorPreference(source, mirror, codename);

test('documented source shape: two priority digits only, fallbacks/comments retained, idempotent', () => {
  const result = plan();
  assert.equal(result.changed, true);
  assert.equal(result.content, preferred);
  assert.equal([...mirrors].filter((char, index) => char !== result.content[index]).length, 2);
  assert.equal(plan(sources, preferred).changed, false);
  assert.equal(plan(sources, preferred).content, preferred);
  assert.equal(plan(sources.replaceAll('\n', '\r\n'), mirrors.replaceAll('\n', '\r\n')).content, preferred.replaceAll('\n', '\r\n'));
  assert.equal(plan(sources.replaceAll('noble', 'resolute'), mirrors, 'resolute').changed, true);
  for (const uri of ['http://security.ubuntu.com/ubuntu/', 'https://security.ubuntu.com/ubuntu/']) {
    assert.equal(plan(`${base}\n${security.replace('mirror+file:/etc/apt/apt-mirrors.txt', uri)}`).changed, true);
  }
});

const sourceCounterexamples = {
  absent: '',
  missingSuites: sources.replace(/^Suites:.*\n/m, ''),
  missingComponents: sources.replace(/^Components:.*\n/m, ''),
  missingKeyring: sources.replace(/^Signed-By:.*\n/m, ''),
  differentKeyring: sources.replace('ubuntu-archive-keyring.gpg', 'other-keyring.gpg'),
  unknownField: `${sources}Unknown-Option: value\n`,
  trustedYes: `${sources}Trusted: yes\n`,
  allowInsecure: `${sources}Allow-Insecure: yes\n`,
  checkValidUntilNo: `${sources}Check-Valid-Until: no\n`,
  architectureFilter: `${sources}Architectures: arm64\n`,
  duplicateActive: `${sources}\n${base}`,
  duplicateField: sources.replace('Types: deb', 'Types: deb\nTypes: deb'),
  multipleURIs: sources.replace('URIs: mirror+file:/etc/apt/apt-mirrors.txt', 'URIs: mirror+file:/etc/apt/apt-mirrors.txt https://example.invalid/ubuntu/'),
  validPlusMalformed: `${sources}\n${base.replace('URIs:', 'URIs ')}`,
  validPlusMultiURI: `${sources}\n${base.replace('URIs: mirror+file:/etc/apt/apt-mirrors.txt', 'URIs: mirror+file:/etc/apt/apt-mirrors.txt https://example.invalid/ubuntu/')}`,
  disabled: `${sources}Enabled: no\n`,
  explicitlyEnabled: `${sources}Enabled: yes\n`,
  extraDisabled: `${sources}\n${base}Enabled: no\n`,
  commentedURI: sources.replace('URIs:', '# URIs:'),
  continuationURI: sources.replace('Suites:', ' https://example.invalid/ubuntu/\nSuites:'),
  missingSecurity: base,
  combinedUndocumented: base.replace('noble-backports', 'noble-backports noble-security'),
  wrongSuite: sources.replace('noble-updates', 'resolute-updates'),
  wrongComponents: sources.replace('main universe restricted multiverse', 'main'),
  duplicateComponent: sources.replace('main universe restricted multiverse', 'main main restricted multiverse'),
  sourcePackageType: sources.replace('Types: deb', 'Types: deb deb-src'),
  otherMirrorFile: sources.replace('apt-mirrors.txt', 'other-mirrors.txt'),
  credentialedSecurity: sources.replace(/URIs: mirror\+file:.*$/m, 'URIs: https://user:password@archive.ubuntu.com/ubuntu/'),
};
for (const [name, source] of Object.entries(sourceCounterexamples)) {
  test(`source ${name}: byte-exact unchanged`, () => {
    const result = plan(source);
    assert.equal(result.changed, false);
    assert.equal(result.content, mirrors);
  });
}
const mirrorCounterexamples = {
  absent: '',
  missing: mirrors.replace(/^https:\/\/archive.*\n/m, ''),
  duplicate: `${mirrors}https://archive.ubuntu.com/ubuntu/\tpriority:2\n`,
  newMirror: `${mirrors}https://example.invalid/ubuntu/\tpriority:3\n`,
  credentialed: mirrors.replace('https://archive.', 'https://user:password@archive.'),
  badURL: mirrors.replace('https://archive.ubuntu.com/ubuntu/', 'https://[bad/ubuntu/'),
  wrongHost: mirrors.replace('archive.ubuntu.com/ubuntu/\tpriority:2', 'archive.ubuntu.com.example.invalid/ubuntu/\tpriority:2'),
  wrongScheme: mirrors.replace('https://archive.', 'http://archive.'),
  missingTab: mirrors.replaceAll('\t', ' '),
  badPriority: mirrors.replace('priority:2', 'priority:bad'),
  unexpectedPriority: mirrors.replace('priority:2', 'priority:1'),
  filtered: mirrors.replace('priority:2', 'priority:2 arch:amd64'),
  duplicateMetadata: mirrors.replace('priority:2', 'priority:2 priority:1'),
  nul: `${mirrors}\0`,
};
for (const [name, mirror] of Object.entries(mirrorCounterexamples)) {
  test(`mirror ${name}: byte-exact unchanged`, () => {
    const result = plan(sources, mirror);
    assert.equal(result.changed, false);
    assert.equal(result.content, mirror);
  });
}

async function fixture(run) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'hh-ci-mirror-r2-'));
  const paths = Object.fromEntries(['sources', 'mirrors', 'keyring', 'osRelease'].map((name) => [name, join(directory, name)]));
  try {
    await Promise.all(Object.entries({ sources, mirrors, keyring: Buffer.from([0x99, 1, 2, 3]), osRelease })
      .map(([name, value]) => fs.writeFile(paths[name], value, { mode: 0o644 })));
    // Every production I/O operation must stay within this disposable fixture.
    const io = {};
    for (const name of ['open', 'lstat', 'rename', 'unlink']) {
      io[name] = (...args) => {
        assert.ok(args[0].startsWith(`${directory}/`) || args[0] === directory, `forbidden ${name} path`);
        if (name === 'rename') assert.ok(args[1].startsWith(`${directory}/`));
        return fs[name](...args);
      };
    }
    await run({ directory, paths, io, apply: (override = io) => applyUbuntuMirrorPreference({ paths, expectedUid: process.getuid(), trustedRoot: directory, io: override }) });
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
}
async function assertNoTemporaryFiles(directory) {
  assert.deepEqual((await fs.readdir(directory)).filter((name) => name.startsWith('.hh-apt-mirrors-')), []);
}

test('real temp-only apply: complete atomic replacement, metadata/source/keyring preservation, idempotent', async () => {
  await fixture(async ({ directory, paths, apply }) => {
    const before = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) => [name, await fs.readFile(path)])));
    await fs.chmod(paths.mirrors, 0o640);
    const old = await fs.stat(paths.mirrors);
    const result = await apply();
    const now = await fs.stat(paths.mirrors);
    assert.equal(result.changed, true);
    assert.equal(result.codename, 'noble');
    assert.equal(await fs.readFile(paths.mirrors, 'utf8'), preferred);
    assert.notEqual(old.ino, now.ino);
    for (const field of ['uid', 'gid', 'mode']) assert.equal(now[field], old[field]);
    for (const name of ['sources', 'keyring', 'osRelease']) assert.deepEqual(await fs.readFile(paths[name]), before[name]);
    assert.equal((await apply()).changed, false);
    await assertNoTemporaryFiles(directory);
  });
});

for (const file of ['sources', 'mirrors', 'keyring', 'osRelease']) {
  for (const kind of ['missing', 'symlink', 'hardlink', 'writable']) {
    test(`apply ${file} ${kind}: unchanged no-op`, async () => {
      await fixture(async ({ paths, apply, directory }) => {
        const saved = await fs.readFile(paths.mirrors);
        if (kind === 'missing') await fs.unlink(paths[file]);
        if (kind === 'symlink') {
          const target = join(directory, `${file}-target`);
          await fs.rename(paths[file], target); await fs.symlink(target, paths[file]);
        }
        if (kind === 'hardlink') await fs.link(paths[file], join(directory, `${file}-link`));
        if (kind === 'writable') await fs.chmod(paths[file], 0o666);
        assert.equal((await apply()).changed, false);
        if (kind !== 'missing' || file !== 'mirrors') assert.deepEqual(await fs.readFile(paths.mirrors), saved);
        await assertNoTemporaryFiles(directory);
      });
    });
  }
}

for (const name of Object.keys(sourceCounterexamples)) {
  test(`apply unrecognized source ${name}: no writes`, async () => {
    await fixture(async ({ paths, apply, directory }) => {
      await fs.writeFile(paths.sources, sourceCounterexamples[name]);
      const stat = await fs.stat(paths.mirrors);
      assert.equal((await apply()).changed, false);
      assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
      assert.equal((await fs.stat(paths.mirrors)).ino, stat.ino);
      await assertNoTemporaryFiles(directory);
    });
  });
}

function wrapHandle(handle, overrides) {
  return new Proxy(handle, { get(target, key) {
    if (Object.hasOwn(overrides, key)) return overrides[key];
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
}

for (const failure of ['partial-write', 'short-write-silent', 'fsync', 'rename']) {
  test(`apply ${failure} failure leaves original bytes/inode intact and cleans temp`, async () => {
    await fixture(async ({ directory, paths, io, apply }) => {
      const before = await fs.stat(paths.mirrors);
      const injected = {
        ...io,
        open: async (...args) => {
          const handle = await io.open(...args);
          if (!args[0].includes('.hh-apt-mirrors-')) return handle;
          if (failure === 'partial-write') return wrapHandle(handle, { writeFile: async (bytes) => {
            await handle.writeFile(bytes.subarray(0, Math.floor(bytes.length / 2)));
            throw new Error('injected partial temp write');
          } });
          if (failure === 'short-write-silent') return wrapHandle(handle, { writeFile: async (bytes) => { await handle.writeFile(bytes.subarray(0, Math.floor(bytes.length / 2))); } });
          if (failure === 'fsync') return wrapHandle(handle, { sync: async () => { throw new Error('injected sync failure'); } });
          return handle;
        },
        rename: failure === 'rename' ? async () => { throw new Error('injected rename failure'); } : io.rename,
      };
      await assert.rejects(apply(injected), /injected|Temporary readback mismatch/);
      assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
      assert.equal((await fs.stat(paths.mirrors)).ino, before.ino);
      await assertNoTemporaryFiles(directory);
    });
  });
}

for (const file of ['sources', 'mirrors', 'keyring', 'osRelease']) {
  test(`apply concurrent ${file} change before commit aborts without replacement`, async () => {
    await fixture(async ({ paths, io, apply, directory }) => {
      let injectedOnce = false;
      const original = await fs.readFile(paths[file]);
      const concurrent = Buffer.concat([original, Buffer.from('\n# concurrent change\n')]);
      const before = await fs.stat(paths.mirrors);
      const injected = { ...io, open: async (...args) => {
        const handle = await io.open(...args);
        if (!args[0].includes('.hh-apt-mirrors-') || injectedOnce) return handle;
        injectedOnce = true;
        return wrapHandle(handle, { sync: async () => { await fs.writeFile(paths[file], concurrent); await handle.sync(); } });
      } };
      await assert.rejects(apply(injected), /Input changed/);
      assert.deepEqual(await fs.readFile(paths[file]), concurrent);
      assert.deepEqual(await fs.readFile(paths.mirrors), file === 'mirrors' ? concurrent : Buffer.from(mirrors));
      assert.equal((await fs.stat(paths.mirrors)).ino, before.ino);
      await assertNoTemporaryFiles(directory);
    });
  });
}

test('post-commit source drift is fatal, never reported as success or silently rolled back', async () => {
  await fixture(async ({ paths, io, apply }) => {
    const injected = { ...io, rename: async (...args) => {
      await io.rename(...args);
      await fs.appendFile(paths.sources, 'Trusted: yes\n');
    } };
    await assert.rejects(apply(injected), /Input changed/);
    assert.equal(await fs.readFile(paths.mirrors, 'utf8'), preferred);
  });
});

test('wrong OS and empty keyring are no-ops', async () => {
  await fixture(async ({ paths, apply }) => {
    await fs.writeFile(paths.osRelease, osRelease.replace('24.04', '26.04'));
    assert.equal((await apply()).changed, false);
    await fs.writeFile(paths.osRelease, osRelease);
    await fs.writeFile(paths.keyring, '');
    assert.equal((await apply()).changed, false);
    assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
  });
});

for (const file of ['sources', 'mirrors', 'keyring', 'osRelease']) {
  test(`apply same-byte ${file} inode replacement before commit aborts`, async () => {
    await fixture(async ({ paths, io, apply, directory }) => {
      let injectedOnce = false;
      const original = await fs.readFile(paths[file]);
      const oldMirror = await fs.stat(paths.mirrors);
      const injected = { ...io, open: async (...args) => {
        const handle = await io.open(...args);
        if (!args[0].includes('.hh-apt-mirrors-') || injectedOnce) return handle;
        injectedOnce = true;
        return wrapHandle(handle, { sync: async () => {
          const replacement = join(directory, `${file}-replacement`);
          await fs.writeFile(replacement, original, { mode: 0o644 });
          await fs.rename(replacement, paths[file]);
          await handle.sync();
        } });
      } };
      await assert.rejects(apply(injected), /Input changed/);
      assert.deepEqual(await fs.readFile(paths[file]), original);
      assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
      if (file !== 'mirrors') assert.equal((await fs.stat(paths.mirrors)).ino, oldMirror.ino);
      await assertNoTemporaryFiles(directory);
    });
  });
}

for (const file of ['sources', 'mirrors', 'keyring', 'osRelease']) {
  test(`apply ${file} symlink ancestor: unchanged without opening the leaf`, async () => {
    await fixture(async ({ directory, paths, io, apply }) => {
      const real = join(directory, `${file}-real-parent`);
      const alias = join(directory, `${file}-alias-parent`);
      await fs.mkdir(real, { mode: 0o700 });
      const originalPath = paths[file];
      await fs.rename(originalPath, join(real, file));
      await fs.symlink(real, alias);
      paths[file] = join(alias, file);
      const injected = { ...io, open: (...args) => {
        assert.notEqual(args[0], paths[file], 'untrusted descendant must not be opened');
        return io.open(...args);
      } };
      assert.equal((await apply(injected)).changed, false);
      assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
      await assertNoTemporaryFiles(directory);
    });
  });

  test(`apply ${file} FIFO: bounded child returns unchanged, never blocks opening`, async () => {
    await fixture(async ({ directory, paths }) => {
      await fs.unlink(paths[file]);
      const made = spawnSync('mkfifo', [paths[file]], { timeout: 1000, encoding: 'utf8' });
      assert.equal(made.status, 0, made.stderr);
      const before = await fs.lstat(paths[file]);
      const moduleUrl = new URL('../scripts/prefer-ci-ubuntu-archive.mjs', import.meta.url).href;
      const code = `
        import * as fs from 'node:fs/promises';
        import { applyUbuntuMirrorPreference } from ${JSON.stringify(moduleUrl)};
        const root = ${JSON.stringify(directory)};
        const io = {};
        for (const name of ['open', 'lstat', 'rename', 'unlink']) io[name] = (...args) => {
          if (!(args[0] === root || args[0].startsWith(root + '/'))) throw Error('outside fixture');
          if (name === 'rename' && !args[1].startsWith(root + '/')) throw Error('outside fixture');
          return fs[name](...args);
        };
        const result = await applyUbuntuMirrorPreference({ paths: ${JSON.stringify(paths)},
          expectedUid: process.getuid(), trustedRoot: root, io });
        console.log(JSON.stringify(result));
      `;
      const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        timeout: 2000, killSignal: 'SIGKILL', encoding: 'utf8',
      });
      assert.equal(child.error, undefined, `FIFO apply must not time out: ${child.error?.code}`);
      assert.equal(child.status, 0, child.stderr);
      assert.equal(JSON.parse(child.stdout).changed, false);
      assert.equal((await fs.lstat(paths[file])).ino, before.ino);
      if (file !== 'mirrors') assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
      await assertNoTemporaryFiles(directory);
    });
  });

  test(`apply ${file} directory instead of file: no-op`, async () => {
    await fixture(async ({ paths, apply, directory }) => {
      await fs.unlink(paths[file]);
      await fs.mkdir(paths[file]);
      assert.equal((await apply()).changed, false);
      if (file !== 'mirrors') assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
      await assertNoTemporaryFiles(directory);
    });
  });

  test(`apply ${file} socket-type metadata: no-op before open (inert, no socket/network)`, async () => {
    await fixture(async ({ paths, io, apply, directory }) => {
      const injected = { ...io, lstat: async (...args) => {
        const stat = await io.lstat(...args);
        if (args[0] !== paths[file]) return stat;
        return new Proxy(stat, { get(target, key) {
          if (key === 'isFile' || key === 'isDirectory') return () => false;
          if (key === 'isSocket') return () => true;
          return Reflect.get(target, key, target);
        } });
      }, open: (...args) => {
        assert.notEqual(args[0], paths[file], 'nonregular leaf must not be opened');
        return io.open(...args);
      } };
      assert.equal((await apply(injected)).changed, false);
      assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
      await assertNoTemporaryFiles(directory);
    });
  });
}

test('trusted root itself must be a non-symlink non-writable directory', async () => {
  await fixture(async ({ directory, paths, io, apply }) => {
    await fs.chmod(directory, 0o777);
    assert.equal((await apply()).changed, false);
    await fs.chmod(directory, 0o700);
    const alias = join(directory, 'root-alias');
    await fs.symlink(directory, alias);
    const aliasPaths = Object.fromEntries(Object.entries(paths).map(([name]) => [name, join(alias, name)]));
    const result = await applyUbuntuMirrorPreference({ paths: aliasPaths, expectedUid: process.getuid(), trustedRoot: alias, io });
    assert.equal(result.changed, false);
    assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
    await assertNoTemporaryFiles(directory);
  });
});

test('path escaping fixture trust root is rejected before I/O', async () => {
  await fixture(async ({ directory, paths }) => {
    const deny = new Proxy({}, { get() { return () => { throw Error('unexpected I/O'); }; } });
    const result = await applyUbuntuMirrorPreference({ paths: { ...paths, sources: '/unrecognized/source' },
      expectedUid: process.getuid(), trustedRoot: directory, io: deny });
    assert.equal(result.changed, false);
  });
});

test('ancestor change before commit leaves original mirror bytes intact', async () => {
  await fixture(async ({ directory, paths, io, apply }) => {
    let once = false;
    const injected = { ...io, open: async (...args) => {
      const handle = await io.open(...args);
      if (!args[0].includes('.hh-apt-mirrors-') || once) return handle;
      once = true;
      return wrapHandle(handle, { sync: async () => { await fs.chmod(directory, 0o777); await handle.sync(); } });
    } };
    await assert.rejects(apply(injected), /Input changed/);
    assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
    await fs.chmod(directory, 0o700);
    await assertNoTemporaryFiles(directory);
  });
});

test('ancestor drift after commit is fatal before installer, not claimed race-free', async () => {
  await fixture(async ({ directory, paths, io, apply }) => {
    const injected = { ...io, rename: async (...args) => {
      await io.rename(...args);
      await fs.chmod(directory, 0o777);
    } };
    await assert.rejects(apply(injected), /Input changed/);
    assert.equal(await fs.readFile(paths.mirrors, 'utf8'), preferred);
    await fs.chmod(directory, 0o700);
    await assertNoTemporaryFiles(directory);
  });
});

test('regular-to-FIFO race between lstat and open stays nonblocking and fails closed', async () => {
  await fixture(async ({ directory, paths }) => {
    const moduleUrl = new URL('../scripts/prefer-ci-ubuntu-archive.mjs', import.meta.url).href;
    const code = `
      import * as fs from 'node:fs/promises';
      import { constants } from 'node:fs';
      import { spawnSync } from 'node:child_process';
      import { applyUbuntuMirrorPreference } from ${JSON.stringify(moduleUrl)};
      const root = ${JSON.stringify(directory)};
      const paths = ${JSON.stringify(paths)};
      let replaced = false;
      const io = {};
      for (const name of ['open', 'lstat', 'rename', 'unlink']) io[name] = async (...args) => {
        if (!(args[0] === root || args[0].startsWith(root + '/'))) throw Error('outside fixture');
        if (name === 'rename' && !args[1].startsWith(root + '/')) throw Error('outside fixture');
        if (name === 'open' && args[0] === paths.sources && !replaced) {
          replaced = true;
          if (!(args[1] & constants.O_NONBLOCK)) throw Error('missing nonblocking flag');
          await fs.unlink(paths.sources);
          const made = spawnSync('mkfifo', [paths.sources], { timeout: 1000 });
          if (made.status !== 0) throw Error('fixture FIFO creation failed');
        }
        return fs[name](...args);
      };
      try {
        await applyUbuntuMirrorPreference({ paths, expectedUid: process.getuid(), trustedRoot: root, io });
        throw Error('unexpected success');
      } catch (error) {
        if (error.message !== 'Input changed before opening') throw error;
        console.log('expected-race-rejected');
      }
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      timeout: 2000, killSignal: 'SIGKILL', encoding: 'utf8',
    });
    assert.equal(child.error, undefined, child.error?.code);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout.trim(), 'expected-race-rejected');
    assert.equal(await fs.readFile(paths.mirrors, 'utf8'), mirrors);
    await assertNoTemporaryFiles(directory);
  });
});
