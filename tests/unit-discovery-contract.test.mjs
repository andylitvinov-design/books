import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('unit command preserves recursive discovery across root, nested and deep suites', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['test:unit'], 'node --test "tests/**/*.test.mjs"');
  const root = await mkdtemp(join(tmpdir(), 'hh-unit-discovery-'));
  try {
    for (const [path, name] of [['tests/root.test.mjs', 'root_discovery'], ['tests/growth/nested.test.mjs', 'nested_discovery'], ['tests/deep/more/deep.test.mjs', 'deep_discovery']]) {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), `import test from 'node:test'; test('${name}',()=>{});`);
    }
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const invoke = command => spawnSync(command, { cwd: root, env, shell: true, encoding: 'utf8', timeout: 15000 });
    const quoted = invoke('"' + process.execPath + '" --test "tests/**/*.test.mjs"');
    assert.equal(quoted.status, 0, quoted.stderr);
    for (const name of ['root_discovery', 'nested_discovery', 'deep_discovery']) assert.ok(quoted.stdout.includes(name), name);
    if (process.platform !== 'win32') {
      const unquoted = invoke('"' + process.execPath + '" --test tests/**/*.test.mjs');
      assert.equal(unquoted.status, 0, unquoted.stderr);
      assert.ok(unquoted.stdout.includes('nested_discovery'));
      assert.ok(!unquoted.stdout.includes('root_discovery'));
      assert.ok(!unquoted.stdout.includes('deep_discovery'));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
