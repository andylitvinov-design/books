#!/usr/bin/env node
// Owner-only on a trusted computer. Never run this in public Actions or CI.
// No credentials are transmitted unless the owner explicitly runs --upload --confirm-upload.
import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const REPO = 'andylitvinov-design/books'
export const ENVIRONMENT = 'google-play-release'
export const PRODUCTION = 'codex/public-book-library'
export const REQUIRED_SECRETS = Object.freeze(['HH_ANDROID_KEYSTORE_B64','HH_ANDROID_KEYSTORE_PASSWORD','HH_ANDROID_KEY_ALIAS','HH_ANDROID_KEY_PASSWORD'])
export const REQUIRED_VARIABLES = Object.freeze(['HH_EXPECTED_WEBSITE_CERT_SHA256','HH_APK_QA_AGE_RECIPIENT'])
const ALIAS = 'holistic-house-website-release'
const SHA = /^[a-f0-9]{64}$/
const RECIPIENT = /^age1[023456789acdefghjklmnpqrstuvwxyz]{58}$/
const requireSafe = (test, key) => { if (!test) throw new Error('HH_SIGNING_SETUP_' + key) }
const defaultDir = () => join(homedir(), '.holistic-house', 'secure', 'android-release')

// Spawn without a shell or command-line passwords. Do not print command stdout/stderr:
// they may contain details of a key or an authenticated session.
export function invoke(command, args, { input, env } = {}) {
  const r = spawnSync(command, args, { input, env:env || process.env,
    encoding:'utf8', windowsHide:true, timeout:120_000, maxBuffer:1024*1024,
    shell:false })
  requireSafe(!r.error && r.status === 0, 'COMMAND_FAILED_' + command.replace(/[^a-z0-9]/ig,'_').toUpperCase())
  return r.stdout || ''
}
export function fingerprint(text) {
  const match = String(text).match(/\bSHA256:\s*([0-9a-f:]{95})\b/i)
  const value = match?.[1].replaceAll(':','').toLowerCase()
  requireSafe(SHA.test(value || ''), 'CERTIFICATE_FINGERPRINT')
  return value
}
export function policyReady(environment, policies, branch) {
  requireSafe(environment?.name === ENVIRONMENT, 'PROTECTED_ENVIRONMENT_MISSING')
  requireSafe(Array.isArray(environment.protection_rules) && environment.protection_rules.some(r =>
    r.type === 'required_reviewers' && Array.isArray(r.reviewers) && r.reviewers.length > 0),
  'REQUIRED_REVIEWER_MISSING')
  requireSafe(branch?.protected === true, 'PRODUCTION_BRANCH_NOT_PROTECTED')
  const deployment = environment.deployment_branch_policy
  requireSafe(Boolean(deployment), 'DEPLOYMENT_BRANCH_RESTRICTION_MISSING')
  if (deployment.custom_branch_policies) {
    requireSafe(Array.isArray(policies) && policies.length === 1 &&
      policies[0]?.name === PRODUCTION, 'PRODUCTION_BRANCH_POLICY_MISMATCH')
  } else {
    requireSafe(deployment.protected_branches === true, 'DEPLOYMENT_BRANCH_RESTRICTION_MISSING')
  }
  return true
}
function ownerPaths(dir) {
  return {dir,keystore:join(dir,'holistic-house-website-release.jks'),
    identity:join(dir,'qa-decryption-identity.txt'),record:join(dir,'owner-credentials.json')}
}
function privateFile(path) {
  const st = lstatSync(path)
  requireSafe(st.isFile() && !st.isSymbolicLink() && (st.mode & 0o077) === 0,
    'LOCAL_FILE_NOT_PRIVATE')
}
function privateDirectory(path) {
  const st = lstatSync(path)
  requireSafe(st.isDirectory() && !st.isSymbolicLink() && (st.mode & 0o077) === 0,
    'LOCAL_DIRECTORY_NOT_PRIVATE')
}
function agePublicKey(value) {
  const key = String(value).trim()
  requireSafe(RECIPIENT.test(key), 'AGE_RECIPIENT')
  return key
}
export function prepareOwnerKeys({ dir = defaultDir(), run = invoke } = {}) {
  process.umask(0o077)
  requireSafe(!existsSync(dir), 'KEY_ALREADY_EXISTS_REFUSE_ROTATION')
  // Verify dependencies before any secret files are created.
  run('keytool',['-help'])
  run('age-keygen',['-version'])
  const parent = dirname(dir)
  mkdirSync(parent,{recursive:true,mode:0o700})
  privateDirectory(parent)
  mkdirSync(dir,{mode:0o700})
  const file = ownerPaths(dir)
  const password = randomBytes(40).toString('base64url')
  const keyEnv = {...process.env,HH_LOCAL_SIGN_PASSWORD:password}
  run('keytool',['-genkeypair','-noprompt','-alias',ALIAS,'-keyalg','RSA',
    '-keysize','4096','-validity','3650','-storetype','JKS',
    '-dname','CN=Holistic House Website APK, O=Holistic House, C=CA',
    '-keystore',file.keystore,'-storepass:env','HH_LOCAL_SIGN_PASSWORD',
    '-keypass:env','HH_LOCAL_SIGN_PASSWORD'],{env:keyEnv})
  privateFile(file.keystore)
  const cert = fingerprint(run('keytool',['-list','-v','-alias',ALIAS,
    '-keystore',file.keystore,'-storepass:env','HH_LOCAL_SIGN_PASSWORD'],{env:keyEnv}))
  run('age-keygen',['-o',file.identity])
  chmodSync(file.identity,0o600)
  privateFile(file.identity)
  const recipient = agePublicKey(run('age-keygen',['-y',file.identity]))
  const record = {schema:'HH_ANDROID_OWNER_SIGNING_V1',appId:'com.holistichouse.app',
    alias:ALIAS,password,certificateSha256:cert,ageRecipient:recipient}
  writeFileSync(file.record,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600})
  privateFile(file.record)
  return { directory:dir,certificateSha256:cert,qaRecipient:recipient,
    backupRequired:true,remoteSecretsConfigured:false }
}
function fromJson(input,kind) {
  try { return JSON.parse(input) } catch { throw new Error('HH_SIGNING_SETUP_INVALID_'+kind) }
}
function ghPath(url,run) {
  return fromJson(run('gh',['api',url]),'GITHUB_POLICY')
}
function readOwnerRecord(dir) {
  const files = ownerPaths(dir)
  privateDirectory(dir)
  for (const file of [files.keystore,files.identity,files.record]) privateFile(file)
  const v = fromJson(readFileSync(files.record,'utf8'),'OWNER_RECORD')
  requireSafe(v.schema === 'HH_ANDROID_OWNER_SIGNING_V1' && v.appId === 'com.holistichouse.app' &&
    v.alias === ALIAS && typeof v.password === 'string' && v.password.length >= 32 &&
    SHA.test(v.certificateSha256) && RECIPIENT.test(v.ageRecipient), 'OWNER_RECORD_MISMATCH')
  return {files,record:v}
}
const names = rows => new Set(rows.map(x=>x.name))
export function uploadOwnerKeys({dir=defaultDir(),run=invoke,confirm=false}={}) {
  requireSafe(confirm === true, 'EXPLICIT_UPLOAD_CONFIRMATION_REQUIRED')
  const {files,record:v} = readOwnerRecord(dir)
  run('gh',['auth','status'])
  const env = ghPath('repos/'+REPO+'/environments/'+ENVIRONMENT,run)
  const policy=env.deployment_branch_policy
  const policies=policy?.custom_branch_policies ?
    ghPath('repos/'+REPO+'/environments/'+ENVIRONMENT+'/deployment-branch-policies',run).branch_policies : null
  const branch=ghPath('repos/'+REPO+'/branches/'+PRODUCTION,run)
  policyReady(env,policies,branch)
  const safeEnv = {...process.env,HH_LOCAL_SIGN_PASSWORD:v.password}
  const actualCert=fingerprint(run('keytool',['-list','-v','-alias',v.alias,
    '-keystore',files.keystore,'-storepass:env','HH_LOCAL_SIGN_PASSWORD'],{env:safeEnv}))
  requireSafe(actualCert === v.certificateSha256, 'LOCAL_CERTIFICATE_CHANGED')
  requireSafe(agePublicKey(run('age-keygen',['-y',files.identity])) === v.ageRecipient,
    'LOCAL_AGE_IDENTITY_CHANGED')
  const secrets=names(fromJson(run('gh',['secret','list','-e',ENVIRONMENT,'-R',REPO,
    '--json','name']),'SECRETS_LIST'))
  const vars=names(fromJson(run('gh',['variable','list','-e',ENVIRONMENT,'-R',REPO,
    '--json','name']),'VARIABLES_LIST'))
  requireSafe(!REQUIRED_SECRETS.some(name=>secrets.has(name)) &&
    !REQUIRED_VARIABLES.some(name=>vars.has(name)),
  'EXISTING_KEYS_REFUSE_OVERWRITE')
  const payload={
    HH_ANDROID_KEYSTORE_B64:readFileSync(files.keystore).toString('base64'),
    HH_ANDROID_KEYSTORE_PASSWORD:v.password,
    HH_ANDROID_KEY_ALIAS:v.alias,
    HH_ANDROID_KEY_PASSWORD:v.password
  }
  const secretText=Object.entries(payload).map(([k,val])=>k+'='+val).join('\n')+'\n'
  run('gh',['secret','set','-f','-','-e',ENVIRONMENT,'-R',REPO],{input:secretText})
  // Public identifiers only; never put signing passwords in Actions variables.
  const varText='HH_EXPECTED_WEBSITE_CERT_SHA256='+v.certificateSha256+'\n'+
    'HH_APK_QA_AGE_RECIPIENT='+v.ageRecipient+'\n'
  run('gh',['variable','set','-f','-','-e',ENVIRONMENT,'-R',REPO],{input:varText})
  const confirmed=names(fromJson(run('gh',['secret','list','-e',ENVIRONMENT,
    '-R',REPO,'--json','name']),'SECRET_READBACK'))
  const confirmedVars=names(fromJson(run('gh',['variable','list','-e',ENVIRONMENT,
    '-R',REPO,'--json','name']),'VARIABLE_READBACK'))
  requireSafe(REQUIRED_SECRETS.every(x=>confirmed.has(x)) &&
    REQUIRED_VARIABLES.every(x=>confirmedVars.has(x)), 'UPLOAD_READBACK_INCOMPLETE')
  return {environment:ENVIRONMENT,repository:REPO,productionBranch:PRODUCTION,
    uploadedSecretNames:[...REQUIRED_SECRETS],publicVariableNames:[...REQUIRED_VARIABLES],
    backupRequired:true,signedApkCreated:false,githubReleasePublished:false}
}
function main(argv) {
  if (argv.length === 1 && argv[0] === '--prepare') {
    const result=prepareOwnerKeys()
    console.log('OWNER KEYS PREPARED; NEVER COMMIT OR SHARE THE PRIVATE DIRECTORY')
    console.log(JSON.stringify(result,null,2))
  } else if (argv.length === 2 && argv[0] === '--upload' && argv[1] === '--confirm-upload') {
    const result=uploadOwnerKeys({confirm:true})
    console.log('PROTECTED GITHUB ENVIRONMENT CONFIGURATION COMPLETE (names only)')
    console.log(JSON.stringify(result,null,2))
  } else {
    throw new Error('Usage: node scripts/bootstrap-hh-apk-signing.mjs --prepare | --upload --confirm-upload')
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)) }
  catch(e) { console.error(e.message); process.exitCode=1 }
}
