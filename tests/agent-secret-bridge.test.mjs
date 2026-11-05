import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Closed synthetic suite: accidental live fetch is always an immediate failure.
const realFetch = globalThis.fetch;
test.before(() => { globalThis.fetch = async () => { throw new Error('Live network forbidden in secret tests'); }; });
test.after(() => { globalThis.fetch = realFetch; });
import {
  HH_VERCEL_PROJECT_ID, HH_VERCEL_TEAM_ID,
  parseArgs, validateOptions, createSecret, readStdinSecret,
  generateSandboxSecret
} from '../scripts/agent-secret-bridge.mjs';

const issue = 'https://github.com/andylitvinov-design/books/issues/2185';
const preview = {
  command: 'create', apply: true, key: 'HH_CRM_MSG_TELEGRAM_TOKEN',
  target: 'preview', branch: 'codex/secret-agent-test',
  source: 'env', 'from-env': 'PROVIDER_ISSUED_TOKEN'
};
const production = { ...preview, target: 'production', branch: undefined, issue };
function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}
function receipt(options = preview, changes = {}) {
  return { id: 'env_synthetic_123', key: options.key, type: 'sensitive',
    target: [options.target], gitBranch: options.branch, ...changes };
}
function inventory(envs = []) {
  return { envs, hiddenProductionEnvCount: 0 };
}
function fakeApi({ entries = [], list, create, readback } = {}) {
  const calls = [];
  let written;
  const fetchImpl = async (url, request) => {
    calls.push({ url, request });
    if (request.method === 'GET') {
      if (written) return response(readback === undefined ? inventory([written]) : readback);
      return response(list === undefined ? inventory(entries) : { envs: entries, ...list });
    }
    if (request.method === 'POST') {
      const body = JSON.parse(request.body);
      written = receipt({ key: body.key, target: body.target[0], branch: body.gitBranch });
      return response(create === undefined ? { created: written, failed: [] } : create, 201);
    }
    throw new Error('Unexpected method');
  };
  return { calls, fetchImpl };
}
const absentLink = async () => { throw Object.assign(new Error('not found'), { code: 'ENOENT' }); };
const suppliedEnv = {
  VERCEL_TOKEN: 'test-only-vercel-auth',
  PROVIDER_ISSUED_TOKEN: 'top-secret-example-123'
};

test('plan is read-only and requires neither credentials nor secret input', async () => {
  const out = await createSecret({ command: 'plan', key: 'HH_SERVICE_API_KEY', target: 'development' });
  assert.equal(out.status, 'planned');
  assert.equal(out.deploymentRequired, false);
  assert.equal(out.project, HH_VERCEL_PROJECT_ID);
  assert.ok(!JSON.stringify(out).includes('TOKEN='));
});

test('CLI parser rejects unknown and repeated parameters', () => {
  const args = parseArgs(['create', '--key=HH_PROVIDER_TOKEN', '--target=production', '--apply']);
  assert.equal(args.apply, true);
  assert.throws(() => parseArgs(['plan', '--key=A', '--key=B']), /Duplicate/);
  assert.throws(() => parseArgs(['create', '--value=plaintext']), /Unsupported/);
  assert.throws(() => parseArgs(['delete']), /updates and rotations/);
});

test('key and target guardrails fail closed', () => {
  for (const key of ['NEXT_PUBLIC_SECRET', 'HH_NEXT_PUBLIC_API_KEY', 'HH_CRM_ENABLED',
                     'HH_CRM_PRODUCTION_APPROVED', 'VERCEL_TOKEN']) {
    assert.throws(() => validateOptions({ ...preview, key }));
  }
  assert.throws(() => validateOptions({ ...preview, branch: undefined }), /Preview/);
  assert.throws(() => validateOptions({ ...production, issue: undefined }), /tracking/);
  assert.throws(() => validateOptions({ ...production, branch: 'preview' }), /only allowed/);
  assert.throws(() => validateOptions({ ...production, source: 'random', 'from-env': undefined }), /restricted/);
  assert.throws(() => validateOptions({ ...preview, source: 'random', 'from-env': undefined }), /restricted/);
  assert.throws(() => validateOptions({ ...preview, source: 'env', 'from-env': undefined }));
});

test('mismatched local Vercel project refuses to write before any network request', async () => {
  const api = fakeApi();
  await assert.rejects(
    createSecret(preview, {
      fileReader: async () => JSON.stringify({
        projectId: 'prj_wrong', orgId: HH_VERCEL_TEAM_ID
      }),
      env: suppliedEnv, fetchImpl: api.fetchImpl
    }), /DIFFERENT/
  );
  assert.equal(api.calls.length, 0);
});

test('malformed local Vercel config is rejected', async () => {
  const api = fakeApi();
  await assert.rejects(
    createSecret(preview, {
      fileReader: async () => 'invalid-json',
      env: suppliedEnv, fetchImpl: api.fetchImpl
    }), /Malformed/
  );
  assert.equal(api.calls.length, 0);
});

test('the bridge does not demand a raw token from the owner', async () => {
  const api = fakeApi();
  await assert.rejects(createSecret(preview, {
    fileReader: absentLink, env: {}, fetchImpl: api.fetchImpl
  }), /connected Vercel app/);
  assert.equal(api.calls.length, 0);
});

test('fails closed when the secret key already exists in another target', async () => {
  const api = fakeApi({ entries: [{ key: preview.key, target: ['production'] }] });
  await assert.rejects(createSecret(preview, {
    fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl
  }), /already exists/);
  assert.equal(api.calls.length, 1);
});

test('refuses incomplete or unexpected metadata inventory', async () => {
  for (const list of [{ pagination: { next: 12345 } }, { envs: null }]) {
    const api = fakeApi({ list });
    await assert.rejects(createSecret(preview, {
      fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl
    }), /inventory/);
    assert.equal(api.calls.length, 1);
  }
});

test('creates a new Secret in Preview without showing or storing its value', async () => {
  const api = fakeApi();
  const result = await createSecret(preview, {
    fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl
  });
  assert.equal(result.status, 'created');
  assert.equal(result.deploymentRequired, true);
  assert.equal(api.calls.length, 3);
  assert.equal(api.calls[2].request.method, 'GET');
  assert.equal(new URL(api.calls[0].url).searchParams.get('decrypt'), 'false');
  assert.equal(new URL(api.calls[2].url).searchParams.get('decrypt'), 'false');
  assert.equal(api.calls[0].request.method, 'GET');
  assert.equal(api.calls[1].request.method, 'POST');
  assert.match(api.calls[1].url, /upsert=false/);
  assert.ok(api.calls[1].url.includes(HH_VERCEL_PROJECT_ID));
  assert.ok(api.calls[1].url.includes(HH_VERCEL_TEAM_ID));
  const body = JSON.parse(api.calls[1].request.body);
  assert.equal(body.key, preview.key);
  assert.equal(body.value, suppliedEnv.PROVIDER_ISSUED_TOKEN);
  assert.equal(body.type, 'sensitive');
  assert.deepEqual(body.target, ['preview']);
  assert.equal(body.gitBranch, preview.branch);
  assert.ok(!JSON.stringify(result).includes(suppliedEnv.PROVIDER_ISSUED_TOKEN));
  assert.ok(!JSON.stringify(result).includes(suppliedEnv.VERCEL_TOKEN));
});

test('production transport uses supplied input and tracking issue, not proof of approval/provenance', async () => {
  const api = fakeApi();
  const result = await createSecret(production, {
    fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl
  });
  assert.equal(result.environment, 'production');
  const body = JSON.parse(api.calls[1].request.body);
  assert.equal(body.gitBranch, undefined);
  assert.ok(body.comment.includes(issue));
});

test('stdin pipeline strips only a final newline and never prints the secret', async () => {
  const incoming = 'provider-secret-with-embedded-internal spaces';
  assert.equal(await readStdinSecret(Readable.from([incoming, '\n'])), incoming);
  const api = fakeApi();
  const options = { ...preview, source: 'stdin', 'from-env': undefined };
  const outcome = await createSecret(options, {
    fileReader: absentLink, env: { VERCEL_TOKEN: suppliedEnv.VERCEL_TOKEN },
    stdin: Readable.from([incoming, '\n']), fetchImpl: api.fetchImpl
  });
  assert.equal(outcome.status, 'created');
  assert.equal(JSON.parse(api.calls[1].request.body).value, incoming);
  assert.ok(!JSON.stringify(outcome).includes(incoming));
});

test('sandbox requests 48 bytes with deterministic synthetic entropy, never real key generation', async () => {
  const randomBytes = size => {
    assert.equal(size, 48);
    return Buffer.alloc(size, 7);
  };
  const first = generateSandboxSecret(randomBytes);
  assert.equal(first, Buffer.alloc(48, 7).toString('base64url'));
  assert.equal(first.length, 64);
  const api = fakeApi();
  const opts = {
    command: 'create', key: 'HH_AGENT_SANDBOX_QA_SECRET', target: 'preview',
    branch: 'codex/private-test', source: 'random', apply: true
  };
  const result = await createSecret(opts, {
    fileReader: absentLink, env: { VERCEL_TOKEN: 'testing' }, fetchImpl: api.fetchImpl, randomBytes
  });
  assert.equal(result.status, 'created');
  assert.equal(JSON.parse(api.calls[1].request.body).value.length, 64);
  assert.ok(!JSON.stringify(result).includes('value'));
});

test('failed provider write hides returned error or potentially echoed value', async () => {
  const api = fakeApi({
    create: { failed: [{ error: { message: suppliedEnv.PROVIDER_ISSUED_TOKEN } }] }
  });
  await assert.rejects(createSecret(preview, {
    fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl
  }), err => {
    assert.ok(!err.message.includes(suppliedEnv.PROVIDER_ISSUED_TOKEN));
    return err.code === 'SECRET_CREATE_UNVERIFIED' && /Do not retry/.test(err.message);
  });
});

test('a matching local project link is accepted', async () => {
  const api = fakeApi();
  const result = await createSecret(preview, {
    fileReader: async () => JSON.stringify({
      projectId: HH_VERCEL_PROJECT_ID, orgId: HH_VERCEL_TEAM_ID
    }),
    env: suppliedEnv, fetchImpl: api.fetchImpl
  });
  assert.equal(result.status, 'created');
});

test('accepts the documented one-element receipt array and string target', async () => {
  const entry = receipt(preview, { target: 'preview', type: 'encrypted', visibility: 'secret' });
  const api = fakeApi({ create: { created: [entry], failed: [] }, readback: inventory([entry]) });
  const result = await createSecret(preview, {
    fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl
  });
  assert.equal(result.status, 'created');
  assert.equal(api.calls.filter(c => c.request.method === 'POST').length, 1);
});

test('rejects empty, partial, mismatched or failed receipts without retry', async () => {
  const valid = receipt();
  const invalid = [
    null, {}, { created: valid }, { created: valid, failed: null },
    { created: valid, failed: {} }, { created: valid, failed: ['failure'] },
    ...[true, 'yes', {}, [], [valid, valid], { id: valid.id },
      { ...valid, id: '' }, { ...valid, key: 'HH_OTHER_TOKEN' },
      { ...valid, type: 'plain' }, { ...valid, type: 'encrypted' },
      { ...valid, visibility: 'config' }, { ...valid, target: [] },
      { ...valid, target: ['preview', 'production'] },
      { ...valid, target: ['production'] }, { ...valid, gitBranch: 'codex/other' },
      { ...valid, gitBranch: undefined }, { ...valid, decrypted: true },
      { ...valid, customEnvironmentIds: ['env_other'] }
    ].map(created => ({ created, failed: [] }))
  ];
  for (const create of invalid) {
    const api = fakeApi({ create });
    await assert.rejects(createSecret(preview, {
      fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl
    }), err => err.code === 'SECRET_CREATE_UNVERIFIED' && /Do not retry/.test(err.message));
    assert.equal(api.calls.filter(c => c.request.method === 'POST').length, 1);
    assert.equal(api.calls.length, 2);
  }
});

test('requires exact metadata readback; no duplicate write on missing or mismatched state', async () => {
  const valid = receipt();
  for (const readback of [
    {}, inventory(), inventory([valid, valid]), inventory([{ ...valid, id: 'different' }]),
    inventory([{ ...valid, type: 'plain' }]), inventory([{ ...valid, target: ['production'] }]),
    inventory([{ ...valid, gitBranch: 'codex/other' }]),
    { envs: [valid], hiddenProductionEnvCount: 1 },
    { envs: [valid], pagination: { next: 42 } }
  ]) {
    const api = fakeApi({ readback });
    await assert.rejects(createSecret(preview, {
      fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl
    }), err => err.code === 'SECRET_CREATE_UNVERIFIED');
    assert.equal(api.calls.filter(c => c.request.method === 'POST').length, 1);
    assert.equal(api.calls.length, 3);
  }
});

test('refuses hidden or malformed metadata before any secret input or POST', async () => {
  for (const list of [
    { hiddenProductionEnvCount: 1 }, { hiddenProductionEnvCount: '0' },
    { pagination: { next: 0 } }, { pagination: [] }, { pagination: null },
    { envs: [null] }, { envs: [{}] }
  ]) {
    const api = fakeApi({ list });
    await assert.rejects(createSecret({ ...preview, source: 'stdin', 'from-env': undefined }, {
      fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl,
      stdin: { [Symbol.asyncIterator]() { throw new Error('must not read input'); } }
    }), /inventory/);
    assert.equal(api.calls.length, 1);
  }
});

test('fetch and JSON failures are sanitized at preflight, POST and readback; never retried', async () => {
  const leaked = suppliedEnv.VERCEL_TOKEN + ' ' + suppliedEnv.PROVIDER_ISSUED_TOKEN;
  for (const phase of [0, 1, 2]) {
    for (const mode of ['fetch', 'json', 'http']) {
      let calls = 0;
      const fetchImpl = async () => {
        const at = calls++;
        if (at === phase) {
          if (mode === 'fetch') throw new Error(leaked);
          if (mode === 'json') return { ok: true, json: async () => { throw new SyntaxError(leaked); } };
          return { ok: false, status: leaked, json: async () => ({ error: leaked }) };
        }
        return response(at === 0 ? inventory() :
          at === 1 ? { created: receipt(), failed: [] } : inventory([receipt()]));
      };
      await assert.rejects(createSecret(preview, { fileReader: absentLink, env: suppliedEnv, fetchImpl }), err => {
        assert.ok(!err.stack.includes(suppliedEnv.VERCEL_TOKEN));
        assert.ok(!err.stack.includes(suppliedEnv.PROVIDER_ISSUED_TOKEN));
        assert.equal(err.cause, undefined);
        assert.equal(err.code, phase === 0 ? undefined : 'SECRET_CREATE_UNVERIFIED');
        return true;
      });
      assert.equal(calls, phase + 1);
    }
  }
});

test('a throwing input stream cannot leak its exception or trigger a write', async () => {
  const api = fakeApi();
  const stdin = { async *[Symbol.asyncIterator]() { throw new Error(suppliedEnv.PROVIDER_ISSUED_TOKEN); } };
  await assert.rejects(createSecret({ ...preview, source: 'stdin', 'from-env': undefined }, {
    fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl, stdin
  }), err => !err.stack.includes(suppliedEnv.PROVIDER_ISSUED_TOKEN) && /no write attempted/.test(err.message));
  assert.equal(api.calls.length, 1);
});

test('CLI prints only a fixed unverified-write warning, never echoed exception text', () => {
  const preload = 'data:text/javascript,' + encodeURIComponent(`
    globalThis.fetch = async (_url, request) => {
      if (request.method === 'GET') return { ok: true, json: async () => ({ envs: [], hiddenProductionEnvCount: 0 }) };
      throw new Error(process.env.VERCEL_TOKEN + process.env.PROVIDER_ISSUED_TOKEN);
    };
  `);
  const out = spawnSync(process.execPath, [
    '--import', preload, fileURLToPath(new URL('../scripts/agent-secret-bridge.mjs', import.meta.url)),
    'create', '--key=' + preview.key, '--target=preview', '--branch=' + preview.branch,
    '--source=env', '--from-env=PROVIDER_ISSUED_TOKEN', '--apply',
    '--cwd=/tmp/hh-agent-secret-test-' + process.pid + '-absent'
  ], { env: suppliedEnv, encoding: 'utf8', timeout: 5000 });
  assert.equal(out.status, 1);
  assert.equal(out.stdout, '');
  assert.match(out.stderr, /outcome is unverified.*Do not retry/);
  for (const value of Object.values(suppliedEnv)) assert.ok(!out.stderr.includes(value));
});

function incompleteInventories(envs) {
  const page = { count: envs.length, next: null, prev: null };
  return [
    { envs },
    { envs, pagination: {} },
    { envs, pagination: { count: envs.length, prev: null } },
    { envs, pagination: { count: envs.length, next: null } },
    { envs, pagination: { next: null, prev: null } },
    ...[undefined, null, -1, 0.5, '0', envs.length + 1, NaN, Infinity].map(count =>
      ({ envs, pagination: { ...page, count } })),
    { envs, pagination: { ...page, next: 42 } },
    { envs, pagination: { ...page, prev: 42 } },
    { envs, pagination: { ...page, cursor: 'another-page' } },
    { envs, hiddenProductionEnvCount: undefined },
    { envs, hiddenProductionEnvCount: 0, pagination: {} },
    { envs, hiddenProductionEnvCount: 0, pagination: { ...page, count: '0' } },
    { envs, hiddenProductionEnvCount: 1, pagination: page }
  ];
}

test('preflight requires a documented complete-inventory marker before consuming input or posting', async () => {
  for (const list of incompleteInventories([])) {
    let inputConsumed = false;
    const stdin = { async *[Symbol.asyncIterator]() {
      inputConsumed = true;
      yield suppliedEnv.PROVIDER_ISSUED_TOKEN;
    } };
    const api = fakeApi({ list });
    await assert.rejects(createSecret({ ...preview, source: 'stdin', 'from-env': undefined }, {
      fileReader: absentLink, env: suppliedEnv, stdin, fetchImpl: api.fetchImpl
    }), /complete Vercel key inventory/);
    assert.equal(inputConsumed, false);
    assert.equal(api.calls.length, 1);
    assert.equal(api.calls.filter(c => c.request.method === 'POST').length, 0);
  }
});

test('readback without a valid completeness marker stays unverified and never retries', async () => {
  for (const readback of incompleteInventories([receipt()])) {
    const api = fakeApi({ readback });
    await assert.rejects(createSecret(preview, {
      fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl
    }), err => err.code === 'SECRET_CREATE_UNVERIFIED' && /Do not retry/.test(err.message));
    assert.equal(api.calls.length, 3);
    assert.equal(api.calls.filter(c => c.request.method === 'POST').length, 1);
  }
});

test('both documented complete-inventory variants work only with explicit terminal markers', async () => {
  for (const includeHiddenCount of [false, true]) {
    const list = { envs: [], pagination: { count: 0, next: null, prev: null } };
    const readback = { envs: [receipt()], pagination: { count: 1, next: null, prev: null } };
    if (includeHiddenCount) {
      list.hiddenProductionEnvCount = 0;
      readback.hiddenProductionEnvCount = 0;
    }
    const api = fakeApi({ list, readback });
    const result = await createSecret(preview, {
      fileReader: absentLink, env: suppliedEnv, fetchImpl: api.fetchImpl
    });
    assert.equal(result.status, 'created');
    assert.equal(api.calls.length, 3);
  }
});
