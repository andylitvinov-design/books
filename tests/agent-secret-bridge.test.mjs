import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
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
function fakeApi({ entries = [], list = {}, create = { created: { id: 'env_123' } } } = {}) {
  const calls = [];
  const fetchImpl = async (url, request) => {
    calls.push({ url, request });
    if (request.method === 'GET') return response({ envs: entries, ...list });
    if (request.method === 'POST') return response(create);
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
  assert.equal(api.calls.length, 2);
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

test('production creates only a provider-supplied Secret with linked issue', async () => {
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

test('random generation is strong and restricted to isolated preview sandbox', async () => {
  const first = generateSandboxSecret();
  const second = generateSandboxSecret();
  assert.ok(first.length >= 64);
  assert.notEqual(first, second);
  const api = fakeApi();
  const opts = {
    command: 'create', key: 'HH_AGENT_SANDBOX_QA_SECRET', target: 'preview',
    branch: 'codex/private-test', source: 'random', apply: true
  };
  const result = await createSecret(opts, {
    fileReader: absentLink, env: { VERCEL_TOKEN: 'testing' }, fetchImpl: api.fetchImpl
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
    return /did not confirm/.test(err.message);
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
