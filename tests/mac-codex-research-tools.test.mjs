import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installer = path.join(root, 'scripts/benchmarking/mac-codex-research-tools.sh');
const sri = 'sha512-5spbVptne6xnojsUzdsRV/pMubuakCR1KofcKNTMshWK0SsiqrjY3hrdYMjBsemny22DDJeWOtvGhnsmJ885Dw==';
const approvedNode = [
  "const major=Number(process.versions.node.split(\".\")[0]);process.exit(major>=18?0:1)",
  "\n    let raw=\"\"; process.stdin.setEncoding(\"utf8\");process.stdin.on(\"data\",x=>raw+=x);\n    process.stdin.on(\"end\",()=>{\n      let p;try{p=JSON.parse(raw)}catch{process.exit(2)}\n      const repo=(typeof p.repository===\"string\"?p.repository:p.repository?.url)||\"\";\n      const lifecycle=[\"preinstall\",\"install\",\"postinstall\",\"prepare\",\"prepublish\",\"prepublishOnly\"];\n      const scripts=p.scripts||{};\n      const safe=p.name===\"@thenavidm/remaster\" && p.version===\"0.2.1\" && p.license===\"Apache-2.0\" &&\n        repo.includes(\"github.com/thenavidm/remaster\") && p.dist?.integrity===process.env.HH_REMASTER_APPROVED_SHA512 &&\n        !lifecycle.some(k=>Boolean(scripts[k])) && Object.keys(p.dependencies||{}).length===0;\n      if(!safe){console.error(\"BLOCKED: release identity/SRI/dependencies/install scripts differ from independent security approval\");process.exit(2)}\n      console.log(\"PASS: exact approved SRI, pinned publisher metadata, Apache-2.0, zero dependencies, no lifecycle scripts\");\n      console.log(\"Registry integrity: \"+p.dist.integrity);\n    });",
  "\n    const fs=require(\"node:fs\");\n    const p=process.env.REMASTER_DEST+\"/SKILL.md\";\n    const value=fs.readFileSync(p,\"utf8\");\n    fs.writeFileSync(p,value.replaceAll(process.env.REMASTER_SRC,process.env.REMASTER_DEST));\n  "
];

// This is a hermetic fixture for the reviewed installer, not an OS sandbox.
// Every external install-path command is dispatched below. No registry/package
// program or user Git configuration is consulted; unknown invocations fail closed.
async function fakeCommand(context) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const name = path.basename(process.argv[1]);
  const args = process.argv.slice(2);
  const die = message => { process.stderr.write('FAKE_COMMAND_BLOCKED: ' + message + '\n'); process.exit(90); };
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const requireArgs = expected => { if (!equal(args, expected)) die(name + ' unexpected arguments'); };
  const inside = value => value === context.owned || value.startsWith(context.owned + path.sep);
  const safe = value => {
    const full = path.resolve(value);
    if (!inside(full)) die(name + ' path outside fixture');
    let ancestor = full;
    while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
    if (!inside(fs.realpathSync(ancestor))) die(name + ' symlink outside fixture');
    return full;
  };
  const audit = row => fs.appendFileSync(context.audit, JSON.stringify(row) + '\n');
  const state = () => JSON.parse(fs.readFileSync(context.state, 'utf8'));
  const save = value => fs.writeFileSync(context.state, JSON.stringify(value));
  const emit = value => process.stdout.write(String(value) + '\n');
  audit({ name, args, cwd: process.cwd(), envKeys: Object.keys(process.env).sort() });
  switch (name) {
    case 'uname':
      requireArgs(['-s']); emit(context.platform); return;
    case 'dirname':
      if (args.length !== 1) die('dirname arity');
      emit(path.dirname(args[0])); return;
    case 'basename':
      if (args.length !== 1) die('basename arity');
      emit(path.basename(args[0])); return;
    case 'git':
      if (equal(args, ['-C', context.project, 'rev-parse', '--show-toplevel'])) {
        emit(context.project); return;
      }
      if (equal(args, ['-C', context.project, 'remote', 'get-url', 'origin'])) {
        emit(context.origin); return;
      }
      if (equal(args, ['rev-parse', '--git-path', 'info/exclude']) && process.cwd() === context.project) {
        emit('.git/info/exclude'); return;
      }
      die('git invocation'); return;
    case 'node': {
      if (args.length !== 2 || args[0] !== '-e' || !context.approvedNode.includes(args[1])) die('node source not reviewed');
      if (args[1] === context.approvedNode[2]) {
        const staged = state();
        const sources = [staged.lexical, staged.physical].map(value => value + '/work/.agents/skills/clone');
        if (!staged.physical || !sources.includes(process.env.REMASTER_SRC)
            || process.env.REMASTER_DEST !== context.project + '/.agents/skills/clone') die('rewrite paths');
        safe(process.env.REMASTER_SRC); safe(process.env.REMASTER_DEST);
      }
      const result = spawnSync(context.node, args, {
        cwd: safe(process.cwd()), env: process.env,
        input: args[1] === context.approvedNode[1] ? fs.readFileSync(0) : undefined,
        encoding: 'utf8', timeout: 5000,
      });
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      if (result.error || result.signal) die('reviewed node execution failed');
      process.exit(result.status ?? 90);
      return;
    }
    case 'npm': {
      if (equal(args, ['view', '@thenavidm/remaster@0.2.1', '--json'])) {
        emit(JSON.stringify({
          name: '@thenavidm/remaster', version: '0.2.1', license: 'Apache-2.0',
          repository: { url: 'https://github.com/thenavidm/remaster' },
          dist: { integrity: context.metadataSri }, scripts: {}, dependencies: {},
        })); return;
      }
      requireArgs(['exec', '--yes', '--package=@thenavidm/remaster@0.2.1', '--', 'remaster', 'install', '--agent', 'codex', '--project']);
      const staged = state();
      if (!staged.physical || process.cwd() !== staged.physical + '/work') die('npm cwd');
      const wanted = {
        HOME: staged.lexical + '/home', PATH: context.bin, TMPDIR: staged.lexical,
        npm_config_cache: staged.lexical + '/npm-cache', npm_config_ignore_scripts: 'true',
      };
      if (!equal(Object.keys(process.env).sort(), Object.keys(wanted).sort())
          || Object.entries(wanted).some(([key, value]) => process.env[key] !== value)) die('npm environment');
      const dest = safe(process.cwd() + '/.agents/skills/clone');
      fs.mkdirSync(dest, { recursive: true });
      fs.writeFileSync(dest + '/SKILL.md', '# Remaster\nnode "' + dest + '/scripts/remaster.mjs"\n');
      // Deliberately no real remaster.mjs: an attempted vendor execution must fail.
      return;
    }
    case 'env': {
      const staged = state();
      const expected = ['-i', 'HOME=' + staged.lexical + '/home', 'PATH=' + context.bin,
        'TMPDIR=' + staged.lexical, 'npm_config_cache=' + staged.lexical + '/npm-cache',
        'npm_config_ignore_scripts=true', 'npm', 'exec', '--yes',
        '--package=@thenavidm/remaster@0.2.1', '--', 'remaster', 'install', '--agent', 'codex', '--project'];
      requireArgs(expected);
      const fresh = Object.fromEntries(args.slice(1, 6).map(entry => {
        const at = entry.indexOf('='); return [entry.slice(0, at), entry.slice(at + 1)];
      }));
      const result = spawnSync(context.node, [context.bin + '/npm', ...args.slice(7)], {
        cwd: safe(process.cwd()), env: fresh, encoding: 'utf8', timeout: 5000,
      });
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      if (result.error || result.signal) die('fake npm execution failed');
      process.exit(result.status ?? 90);
      return;
    }
    case 'mktemp': {
      requireArgs(['-d', context.tmpAlias + '/hh-remaster.XXXXXXXX']);
      if (state().lexical) die('repeated staging');
      const physical = fs.mkdtempSync(safe(context.tmpPhysical + '/hh-remaster.'));
      const lexical = context.tmpAlias + '/' + path.basename(physical);
      save({ physical, lexical }); emit(lexical); return;
    }
    case 'mkdir':
      if (args[0] !== '-p' || args.length < 2) die('mkdir arguments');
      for (const dir of args.slice(1)) fs.mkdirSync(safe(dir), { recursive: true });
      return;
    case 'grep': {
      if (args.length !== 3) die('grep arguments');
      const value = fs.readFileSync(safe(args[2]), 'utf8');
      if (args[0] === '-q' && args[1] === '^# Remaster') process.exit(/^# Remaster/m.test(value) ? 0 : 1);
      if (args[0] === '-qFx' && args[1] === '/.agents/skills/clone/') process.exit(value.split('\n').includes(args[1]) ? 0 : 1);
      die('grep pattern'); return;
    }
    case 'cp': {
      const staged = state();
      const sources = [staged.lexical, staged.physical].map(value => value + '/work/.agents/skills/clone');
      if (args.length !== 3 || args[0] !== '-R' || !sources.includes(args[1])
          || args[2] !== context.project + '/.agents/skills/clone') die('cp paths');
      fs.cpSync(safe(args[1]), safe(args[2]), { recursive: true }); return;
    }
    case 'touch':
      requireArgs([context.project + '/.git/info/exclude']);
      fs.closeSync(fs.openSync(safe(args[0]), 'a')); return;
    case 'rm': {
      const staged = state();
      requireArgs(['-rf', '--', staged.lexical]);
      fs.rmSync(safe(args[2]), { recursive: true, force: true });
      return;
    }
    default: die('unknown command ' + name);
  }
}

function fixture(t, { platform = 'Darwin', approvedSri = sri, metadataSri = sri,
  origin = 'https://github.com/andylitvinov-design/books.git' } = {}) {
  const owned = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'hh-remaster-test-')));
  t.after(() => fs.rmSync(owned, { recursive: true, force: true }));
  const project = path.join(owned, 'project');
  const bin = path.join(owned, 'bin');
  const home = path.join(owned, 'home');
  const tmpPhysical = path.join(owned, 'physical-tmp');
  const tmpAlias = path.join(owned, 'tmp-alias');
  for (const dir of [bin, home, tmpPhysical, project + '/scripts/benchmarking', project + '/.git/info']) fs.mkdirSync(dir, { recursive: true });
  fs.symlinkSync(tmpPhysical, tmpAlias, 'dir');
  fs.writeFileSync(project + '/.git/config', 'fixture git config canary\n');
  fs.writeFileSync(home + '/canary', 'fixture home canary\n');
  fs.copyFileSync(installer, project + '/scripts/benchmarking/mac-codex-research-tools.sh');
  const context = {
    owned, project, bin, home, tmpPhysical, tmpAlias, platform, metadataSri, approvedNode, origin,
    node: process.execPath, audit: owned + '/audit.jsonl', state: owned + '/state.json',
  };
  fs.writeFileSync(context.audit, '');
  fs.writeFileSync(context.state, '{}');
  const dispatcher = bin + '/dispatcher.mjs';
  fs.writeFileSync(dispatcher, '#!' + process.execPath + '\n(' + fakeCommand.toString() + ')(' + JSON.stringify(context) + ').catch(error => { console.error(error); process.exit(90); });\n');
  fs.chmodSync(dispatcher, 0o755);
  for (const name of ['uname', 'dirname', 'basename', 'git', 'node', 'npm', 'env', 'mktemp', 'mkdir', 'grep', 'cp', 'touch', 'rm']) fs.symlinkSync(dispatcher, bin + '/' + name);
  // No inherited HOME, PATH, Git config, npm config, BASH_ENV, NODE_OPTIONS,
  // auth variables or platform override can enter the copied script.
  const env = { PATH: bin, HOME: home, TMPDIR: tmpAlias, LC_ALL: 'C', HH_REMASTER_APPROVED_SHA512: approvedSri };
  const run = () => spawnSync('/bin/bash', ['scripts/benchmarking/mac-codex-research-tools.sh', '--install-remaster'], {
    cwd: project, env, encoding: 'utf8', timeout: 15000, maxBuffer: 128 * 1024,
  });
  const calls = () => fs.readFileSync(context.audit, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const checkCanaries = () => {
    assert.equal(fs.readFileSync(project + '/.git/config', 'utf8'), 'fixture git config canary\n');
    assert.equal(fs.readFileSync(home + '/canary', 'utf8'), 'fixture home canary\n');
    assert.deepEqual(fs.readdirSync(home), ['canary'], 'outer HOME is never used for install state');
    const allowed = new Set(['PATH', 'HOME', 'TMPDIR', 'LC_ALL', 'HH_REMASTER_APPROVED_SHA512',
      'PWD', 'OLDPWD', 'SHLVL', '_', 'REMASTER_SRC', 'REMASTER_DEST',
      'npm_config_cache', 'npm_config_ignore_scripts']);
    assert.deepEqual(calls().flatMap(row => row.envKeys.filter(key => !allowed.has(key))), [],
      'no inherited credential, shell hook, Node option or user Git/npm config enters the fixture');
  };
  return { ...context, env, run, calls, checkCanaries };
}

test('installer rewrites a physical staging path in a hermetic Darwin fixture', t => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  const staged = JSON.parse(fs.readFileSync(f.state, 'utf8'));
  assert.notEqual(staged.lexical, staged.physical, 'fixture must exercise a real symlink alias');
  const skill = fs.readFileSync(f.project + '/.agents/skills/clone/SKILL.md', 'utf8');
  assert.equal(skill, '# Remaster\nnode "' + f.project + '/.agents/skills/clone/scripts/remaster.mjs"\n');
  assert.ok(!skill.includes(staged.lexical) && !skill.includes(staged.physical));
  assert.equal(fs.existsSync(staged.physical), false, 'EXIT trap removes its own stage');
  assert.deepEqual(f.calls().filter(row => row.name === 'npm').map(row => row.args[0]), ['view', 'exec']);
  assert.equal(fs.readFileSync(f.project + '/.git/info/exclude', 'utf8'), '\n/.agents/skills/clone/\n');
  f.checkCanaries();
});

test('installer refuses Linux before npm or staging, without changing its real OS guard', t => {
  const f = fixture(t, { platform: 'Linux' });
  const result = f.run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /BLOCKED: --install-remaster requires macOS/);
  assert.deepEqual(f.calls().map(row => row.name), ['dirname', 'uname']);
  assert.deepEqual(JSON.parse(fs.readFileSync(f.state, 'utf8')), {});
  assert.deepEqual(fs.readdirSync(f.tmpPhysical), []);
  assert.equal(fs.existsSync(f.project + '/.agents'), false);
  f.checkCanaries();
});

test('Darwin fixture refuses a missing approval before npm or staging', t => {
  const f = fixture(t, { approvedSri: '' });
  const result = f.run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /independently reviewed npm tarball SHA-512/);
  assert.equal(f.calls().some(row => ['npm', 'mktemp', 'env'].includes(row.name)), false);
  assert.deepEqual(fs.readdirSync(f.tmpPhysical), []);
  f.checkCanaries();
});

test('Darwin fixture refuses mismatched registry metadata before fake installation', t => {
  const f = fixture(t, { metadataSri: 'sha512-' + 'A'.repeat(86) + '==' });
  const result = f.run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /release identity\/SRI\/dependencies\/install scripts differ/);
  assert.deepEqual(f.calls().filter(row => row.name === 'npm').map(row => row.args[0]), ['view']);
  assert.deepEqual(fs.readdirSync(f.tmpPhysical), []);
  f.checkCanaries();
});

test('fake command controls refuse unexpected npm, node source and outside paths', t => {
  const f = fixture(t);
  for (const [command, args] of [['npm', ['install', 'anything']], ['node', ['-e', 'process.exit(0)']], ['mkdir', ['-p', path.join(f.owned, '..', 'must-not-write')]]]) {
    const result = spawnSync(process.execPath, [f.bin + '/' + command, ...args], {
      cwd: f.project, env: f.env, encoding: 'utf8', timeout: 5000,
    });
    assert.equal(result.status, 90, command);
    assert.match(result.stderr, /FAKE_COMMAND_BLOCKED/);
  }
  const outsideAlias = f.owned + '/outside-alias';
  fs.symlinkSync(os.tmpdir(), outsideAlias, 'dir');
  const result = spawnSync(process.execPath, [f.bin + '/mkdir', '-p', outsideAlias + '/must-not-write'], {
    cwd: f.project, env: f.env, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 90);
  assert.match(result.stderr, /symlink outside fixture/);
  f.checkCanaries();
});

test('Darwin fixture preserves a conflicting skill and rejects a wrong origin before npm', t => {
  const conflict = fixture(t);
  const skill = conflict.project + '/.agents/skills/clone/SKILL.md';
  fs.mkdirSync(path.dirname(skill), { recursive: true });
  fs.writeFileSync(skill, 'unrelated skill canary\n');
  const conflictResult = conflict.run();
  assert.equal(conflictResult.status, 2);
  assert.match(conflictResult.stderr, /another skill exists/);
  assert.equal(fs.readFileSync(skill, 'utf8'), 'unrelated skill canary\n');
  assert.equal(conflict.calls().some(row => ['npm', 'mktemp'].includes(row.name)), false);
  conflict.checkCanaries();

  const wrongOrigin = fixture(t, { origin: 'https://github.com/example/not-books.git' });
  const wrongOriginResult = wrongOrigin.run();
  assert.equal(wrongOriginResult.status, 2);
  assert.match(wrongOriginResult.stderr, /wrong Git repository origin/);
  assert.equal(wrongOrigin.calls().some(row => ['npm', 'mktemp'].includes(row.name)), false);
  wrongOrigin.checkCanaries();
});

test('fixture has no fallback for missing npm or an unknown external command', t => {
  const f = fixture(t);
  fs.unlinkSync(f.bin + '/npm');
  const result = f.run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /git, node, and npm required/);
  assert.equal(f.calls().some(row => ['npm', 'mktemp'].includes(row.name)), false);
  fs.symlinkSync(f.bin + '/dispatcher.mjs', f.bin + '/not-an-approved-command');
  const unknown = spawnSync(process.execPath, [f.bin + '/not-an-approved-command'], {
    cwd: f.project, env: f.env, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(unknown.status, 90);
  assert.match(unknown.stderr, /unknown command not-an-approved-command/);
  f.checkCanaries();
});

