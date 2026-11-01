#!/usr/bin/env node
/**
 * Safe optional bridge for an ALREADY AUTHORIZED headless Vercel API session.
 * ChatGPT agents should prefer their connected Vercel app; no new login needed.
 * Runtime owner-confirmation rules still apply; a token/issue/--apply is not consent.
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
    throw new Error('Production requires a tracking GitHub issue/PR URL; a URL is not approval.');
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

export function generateSandboxSecret(bytes = randomBytes) {
  return bytes(48).toString('base64url');
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

const UNVERIFIED_WRITE = 'Secret creation outcome is unverified. Do not retry the POST; reconcile non-secret metadata and provider audit evidence first.';

function unverifiedWrite() {
  return Object.assign(new Error(UNVERIFIED_WRITE), { code: 'SECRET_CREATE_UNVERIFIED' });
}

async function requestJson(call, url, request, message) {
  try {
    const response = await call(url, request);
    if (!response?.ok) throw new Error();
    return await response.json();
  } catch {
    // Network clients and JSON parsers can include credentials/body snippets.
    // Never retain their exception as a cause or print a response body.
    throw new Error(message);
  }
}

function completeInventory(listing) {
  if (!listing || typeof listing !== 'object' || Array.isArray(listing) ||
      !Array.isArray(listing.envs) ||
      !listing.envs.every(item => item && !Array.isArray(item) &&
        typeof item.key === 'string' && item.key.trim().length > 0)) return false;
  // The documented envs variants require pagination OR hiddenProductionEnvCount.
  // An absent marker (or omitted next) is not evidence of a complete inventory.
  const paginated = Object.hasOwn(listing, 'pagination');
  const hiddenCount = Object.hasOwn(listing, 'hiddenProductionEnvCount');
  if (!paginated && !hiddenCount) return false;
  if (hiddenCount && listing.hiddenProductionEnvCount !== 0) return false;
  if (paginated) {
    const page = listing.pagination;
    if (!page || typeof page !== 'object' || Array.isArray(page) ||
        !Number.isSafeInteger(page.count) || page.count !== listing.envs.length ||
        page.next !== null || page.prev !== null || page.cursor != null) return false;
  }
  return true;
}

function matchesSecret(item, options) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const targets = Array.isArray(item.target) ? item.target : [item.target];
  const secretType = (item.type === 'sensitive' &&
    (item.visibility === undefined || item.visibility === 'secret')) ||
    (item.type === 'encrypted' && item.visibility === 'secret');
  return typeof item.id === 'string' && item.id.trim().length > 0 &&
    item.key === options.key && secretType && item.decrypted !== true &&
    targets.length === 1 && targets[0] === options.target &&
    (item.gitBranch || null) === (options.branch || null) &&
    (item.customEnvironmentIds === undefined ||
      (Array.isArray(item.customEnvironmentIds) && item.customEnvironmentIds.length === 0));
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

  // This helper cannot establish owner consent. Its caller must enforce runtime
  // confirmation rules before secret issuance or transmission, even with --apply.
  // List metadata first: no decrypt requests. Fail closed on unknown or hidden data.
  const readUrl = new URL(WRITE_ENDPOINT);
  readUrl.searchParams.delete('upsert');
  readUrl.searchParams.set('decrypt', 'false');
  const listing = await requestJson(call, readUrl.toString(), {
    method: 'GET', headers, redirect: 'error'
  }, 'Vercel metadata preflight failed; no write attempted.');
  if (!completeInventory(listing)) {
    throw new Error('Cannot verify a complete Vercel key inventory; refusing to write.');
  }
  if (listing.envs.some(item => item?.key === options.key)) {
    throw new Error('That secret already exists; no automatic overwrite or duplicate.');
  }

  let value;
  try {
    if (options.source === 'stdin') {
      value = await readStdinSecret(deps.stdin || process.stdin);
    } else if (options.source === 'env') {
      value = env[options['from-env']];
    } else {
      value = generateSandboxSecret(deps.randomBytes);
    }
    validateSecretValue(value);
  } catch {
    throw new Error('Missing, invalid or unreadable secret input; no write attempted.');
  }
  const body = {
    key: options.key,
    value,
    type: 'sensitive',
    target: [options.target],
    comment: 'Agent-managed create; ' + (options.issue || 'preview-only sandbox')
  };
  if (options.target === 'preview') body.gitBranch = options.branch;
  let result;
  try {
    result = await requestJson(call, WRITE_ENDPOINT, {
      method: 'POST', headers, redirect: 'error', body: JSON.stringify(body)
    }, UNVERIFIED_WRITE);
  } catch {
    throw unverifiedWrite();
  } finally {
    // Never persist/re-emit the value. JS cannot guarantee string zeroization.
    value = undefined;
    body.value = undefined;
  }
  // Vercel's documented receipt allows a single object or an array. A truthy
  // empty/partial receipt is not proof. Do not read or expose any value fields.
  const receipts = Array.isArray(result?.created) ? result.created : [result?.created];
  if (!Array.isArray(result?.failed) || result.failed.length !== 0 ||
      receipts.length !== 1 || !matchesSecret(receipts[0], options)) {
    throw unverifiedWrite();
  }
  let readback;
  try {
    readback = await requestJson(call, readUrl.toString(), {
      method: 'GET', headers, redirect: 'error'
    }, UNVERIFIED_WRITE);
  } catch {
    throw unverifiedWrite();
  }
  if (!completeInventory(readback)) throw unverifiedWrite();
  const matches = readback.envs.filter(item => item.key === options.key);
  if (matches.length !== 1 || !matchesSecret(matches[0], options) ||
      matches[0].id !== receipts[0].id) {
    throw unverifiedWrite();
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
  }).catch(err => {
    // Do not print exceptions from third-party API clients or returned values.
    process.stderr.write(err?.code === 'SECRET_CREATE_UNVERIFIED'
      ? UNVERIFIED_WRITE + '\n'
      : 'Secret operation refused or failed; consult the agent-safe runbook. No secret printed.\n');
    process.exitCode = 1;
  });
}
