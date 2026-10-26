#!/usr/bin/env node
/**
 * Safe optional bridge for an ALREADY AUTHORIZED headless Vercel API session.
 * ChatGPT agents should prefer their connected Vercel app; no new login needed.
 * Never logs tokens or values, never updates/deletes existing credentials.
 */
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const HH_VERCEL_PROJECT_ID = 'prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b';
export const HH_VERCEL_TEAM_ID = 'team_OSf690d0nxRHWVMXCElA8i95';
const MAX_BYTES = 16384;
const ALLOWED_FLAGS = new Set([
  'key', 'target', 'branch', 'source', 'from-env', 'issue', 'apply', 'cwd'
]);
const WRITE_ENDPOINT = 'https://api.vercel.com/v10/projects/' +
  HH_VERCEL_PROJECT_ID + '/env?teamId=' + HH_VERCEL_TEAM_ID +
  '&upsert=false';

export function parseArgs(args) {
  const [command, ...flags] = args;
  if (command !== 'plan' && command !== 'create') {
    throw new Error('Use plan or create; updates and rotations are deliberately unsupported.');
  }
  const options = { command, apply: false };
  for (const flag of flags) {
    if (!flag.startsWith('--')) throw new Error('Unexpected positional argument.');
    const eq = flag.indexOf('=');
    const name = eq < 0 ? flag.slice(2) : flag.slice(2, eq);
    if (!ALLOWED_FLAGS.has(name)) throw new Error('Unsupported option: --' + name);
    if (name === 'apply') {
      if (eq >= 0) throw new Error('--apply does not take a value.');
      options.apply = true;
    } else {
      if (eq < 0 || !flag.slice(eq + 1)) {
        throw new Error('Option --' + name + ' requires a value.');
      }
      if (Object.hasOwn(options, name)) throw new Error('Duplicate option: --' + name);
      options[name] = flag.slice(eq + 1);
    }
  }
  return options;
}

export function validateOptions(options) {
  const { command, key, target, branch, source, issue, apply } = options;
  if (!/^HH_[A-Z0-9_]{4,120}$/.test(key || '')) {
    throw new Error('Only HH_ server-side variable names are permitted.');
  }
  if (/^HH_(?:NEXT_PUBLIC|PUBLIC|VITE)_/.test(key) ||
      !/(?:_TOKEN|_SECRET|_KEY|_PASSWORD|_DATABASE_URL)$/.test(key)) {
    throw new Error('Refusing a client-visible variable, feature flag or non-secret key.');
  }
  if (!['production', 'preview', 'development'].includes(target)) {
    throw new Error('Specify exactly one environment: production, preview or development.');
  }
  if (target === 'preview') {
    if (!branch || !/^[A-Za-z0-9][A-Za-z0-9._/-]{1,198}$/.test(branch) ||
        branch.includes('..') || branch.includes('//')) {
      throw new Error('Preview must be limited to a safe named Git branch.');
    }
  } else if (branch) {
    throw new Error('Branch-scoped values are only allowed in Preview.');
  }
  if (target === 'production' && !/^https:\/\/github\.com\/andylitvinov-design\/books\/(?:issues|pull)\/\d+$/.test(issue || '')) {
    throw new Error('Production requires an approved tracking GitHub issue/PR URL.');
  }
  if (command === 'plan' && apply) throw new Error('plan is read-only.');
  if (command === 'create' && apply) {
    if (!['stdin', 'env', 'random'].includes(source)) {
      throw new Error('Creation requires an explicit provider secret source.');
    }
    if (source === 'env' && !/^[A-Z_][A-Z0-9_]*$/.test(options['from-env'] || '')) {
      throw new Error('The existing private input environment variable must be named.');
    }
    if (source !== 'env' && options['from-env']) {
      throw new Error('--from-env only applies to --source=env.');
    }
    if (source === 'random' &&
        (target !== 'preview' || !/^HH_AGENT_SANDBOX_[A-Z0-9_]+_SECRET$/.test(key))) {
      throw new Error('Random-only bridge creation is restricted to isolated Preview sandbox secrets.');
    }
  }
  return true;
}

export async function verifyLocalProject(cwd, fileReader = readFile) {
  const p = join(resolve(cwd), '.vercel', 'project.json');
  let contents;
  try {
    contents = await fileReader(p, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return;
    throw new Error('Unable to inspect the local Vercel project binding.');
  }
  let linked;
  try {
    linked = JSON.parse(contents);
  } catch {
    throw new Error('Malformed local Vercel project binding; refusing to write.');
  }
  if (linked.projectId !== HH_VERCEL_PROJECT_ID ||
      linked.orgId !== HH_VERCEL_TEAM_ID) {
    throw new Error('Local Vercel project binding belongs to a DIFFERENT project/team.');
  }
}

export function generateSandboxSecret() {
  return randomBytes(48).toString('base64url');
}

export async function readStdinSecret(stream) {
  if (stream.isTTY) throw new Error('Provide a secret using a protected pipe, not interactive typing.');
  let size = 0;
  const chunks = [];
  for await (const chunk of stream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_BYTES) throw new Error('Input exceeded the secret size limit.');
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
}

function validateSecretValue(value) {
  if (typeof value !== 'string' || !value.length || value.includes('\u0000') ||
      Buffer.byteLength(value) > MAX_BYTES || /^(todo|test|changeme|placeholder|example|dummy)$/i.test(value)) {
    throw new Error('Missing, invalid or placeholder secret input.');
  }
}

function publicResult(options, status) {
  return {
    status,
    project: HH_VERCEL_PROJECT_ID,
    environment: options.target,
    key: options.key,
    branch: options.branch || null,
    deploymentRequired: status === 'created'
  };
}

export async function createSecret(options, deps = {}) {
  validateOptions(options);
  if (!options.apply || options.command === 'plan') {
    return publicResult(options, 'planned');
  }
  // Never consult a different local linked project, even when API project ID is fixed.
  await verifyLocalProject(options.cwd || process.cwd(), deps.fileReader || readFile);
  const env = deps.env || process.env;
  const token = env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('No authorized Vercel API session here. Use the connected Vercel app; do not ask for a pasted token.');
  }
  const call = deps.fetchImpl || fetch;
  const headers = {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json'
  };

  // List metadata first: no decrypt requests. Fail closed on unknown or paginated data.
  const readUrl = new URL(WRITE_ENDPOINT);
  readUrl.searchParams.delete('upsert');
  readUrl.searchParams.set('limit', '100');
  const current = await call(readUrl.toString(), {
    method: 'GET', headers, redirect: 'error'
  });
  if (!current.ok) {
    throw new Error('Vercel metadata preflight failed (HTTP ' + current.status + ').');
  }
  const listing = await current.json();
  if (!Array.isArray(listing?.envs) ||
      listing?.pagination?.next || listing?.pagination?.cursor) {
    throw new Error('Cannot verify a complete Vercel key inventory; refusing to write.');
  }
  if (listing.envs.some(item => item?.key === options.key)) {
    throw new Error('That secret already exists; no automatic overwrite or duplicate.');
  }

  let value;
  if (options.source === 'stdin') {
    value = await readStdinSecret(deps.stdin || process.stdin);
  } else if (options.source === 'env') {
    value = env[options['from-env']];
  } else {
    value = generateSandboxSecret();
  }
  validateSecretValue(value);
  const body = {
    key: options.key,
    value,
    type: 'sensitive',
    target: [options.target],
    comment: 'Agent-managed create; ' + (options.issue || 'preview-only sandbox')
  };
  if (options.target === 'preview') body.gitBranch = options.branch;
  let created;
  try {
    created = await call(WRITE_ENDPOINT, {
      method: 'POST', headers, redirect: 'error', body: JSON.stringify(body)
    });
  } finally {
    // Never persist/re-emit the value. JS cannot guarantee string zeroization.
    value = undefined;
    body.value = undefined;
  }
  if (!created.ok) {
    throw new Error('Vercel rejected secret creation (HTTP ' + created.status + ').');
  }
  const result = await created.json();
  if ((Array.isArray(result?.failed) && result.failed.length) ||
      !result?.created) {
    throw new Error('Vercel did not confirm an unambiguous new Secret.');
  }
  return publicResult(options, 'created');
}

export async function cli(args = process.argv.slice(2), deps = {}) {
  const options = parseArgs(args);
  const result = await createSecret(options, deps);
  return result;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  cli().then(result => {
    process.stdout.write(JSON.stringify(result) + '\n');
  }).catch(() => {
    // Do not print exceptions from third-party API clients or returned values.
    process.stderr.write('Secret operation refused or failed; consult the agent-safe runbook. No secret printed.\n');
    process.exitCode = 1;
  });
}
