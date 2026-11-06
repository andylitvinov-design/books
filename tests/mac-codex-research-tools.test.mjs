import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installer = path.join(root, 'scripts/benchmarking/mac-codex-research-tools.sh');
const sri = 'sha512-5spbVptne6xnojsUzdsRV/pMubuakCR1KofcKNTMshWK0SsiqrjY3hrdYMjBsemny22DDJeWOtvGhnsmJ885Dw==';

test('installer rewrites the physical staging path before publishing the project skill', () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'hh-remaster-path-test-'));
  try {
    const project = path.join(sandbox, 'project');
    const bin = path.join(sandbox, 'bin');
    fs.mkdirSync(bin, { recursive: true });
    execFileSync('git', ['init', project]);
    execFileSync('git', ['-C', project, 'remote', 'add', 'origin', 'https://github.com/andylitvinov-design/books.git']);
    fs.mkdirSync(path.join(project, 'scripts', 'benchmarking'), { recursive: true });
    fs.copyFileSync(installer, path.join(project, 'scripts/benchmarking/mac-codex-research-tools.sh'));
    fs.writeFileSync(path.join(bin, 'npm'), `#!/bin/sh\ncase "$1" in\n  view) printf '%s' '{"name":"@thenavidm/remaster","version":"0.2.1","license":"Apache-2.0","repository":{"url":"https://github.com/thenavidm/remaster"},"dist":{"integrity":"${sri}"},"scripts":{},"dependencies":{}}' ;;\n  exec) dest="$(pwd -P)/.agents/skills/clone"; mkdir -p "$dest"; printf '# Remaster\\nnode "%s/scripts/remaster.mjs"\\n' "$dest" > "$dest/SKILL.md" ;;\n  *) exit 1 ;;\nesac\n`);
    fs.chmodSync(path.join(bin, 'npm'), 0o755);
    execFileSync('bash', ['scripts/benchmarking/mac-codex-research-tools.sh', '--install-remaster'], {
      cwd: project,
      env: { ...process.env, HH_REMASTER_APPROVED_SHA512: sri, PATH: `${bin}:${process.env.PATH}` },
      stdio: 'pipe',
    });
    const skill = fs.readFileSync(path.join(project, '.agents/skills/clone/SKILL.md'), 'utf8');
    assert.match(skill, new RegExp(fs.realpathSync(project).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(skill, /hh-remaster\./);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
