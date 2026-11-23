#!/usr/bin/env node
// Owner-only on a trusted computer. Never run this in public Actions or CI.
// No credentials are transmitted unless the owner explicitly runs --upload --confirm-upload.
import { randomBytes,createHash } from 'node:crypto'
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync,realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join,isAbsolute,sep } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const REPO = 'andylitvinov-design/books'
export const ENVIRONMENT = 'google-play-release'
export const PRODUCTION = 'codex/public-book-library'
export const REQUIRED_SECRETS = Object.freeze(['HH_ANDROID_KEYSTORE_B64','HH_ANDROID_KEYSTORE_PASSWORD','HH_ANDROID_KEY_ALIAS','HH_ANDROID_KEY_PASSWORD'])
export const REQUIRED_VARIABLES = Object.freeze(['HH_EXPECTED_WEBSITE_CERT_SHA256','HH_APK_QA_AGE_RECIPIENT'])
const ALIAS = 'holistic-house-website-release'
const OWNER_FILES=['holistic-house-website-release.jks','owner-credentials.json','qa-decryption-identity.txt']
const BACKUP_RECEIPT='verified-signing-backup.json'
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
  requireSafe(Boolean(deployment) && (deployment.custom_branch_policies || deployment.protected_branches),
    'DEPLOYMENT_BRANCH_RESTRICTION_MISSING')
  // Exact production branch only; protected sets and same-named tags are unsafe.
  requireSafe(deployment.custom_branch_policies === true && deployment.protected_branches === false &&
    Array.isArray(policies) && policies.length === 1 &&
    policies[0]?.name === PRODUCTION && policies[0]?.type === 'branch',
    'PRODUCTION_BRANCH_POLICY_MISMATCH')
  return true
}
export function verifyFirstReleaseRegistry(registry) {
  const android=registry?.android
  requireSafe(registry?.schemaVersion===1 && registry.appId==='com.holistichouse.app' &&
    android?.status==='not_released' && android.ownerApproved===false &&
    ['version','versionCode','downloadUrl','sha256','signingCertificateSha256','qaEvidenceUrl'].every(key=>android[key]===null),
  'RELEASE_ALREADY_EXISTS_OR_UNKNOWN')
  return true
}
function firstReleaseReady(run) {
  run('gh',['auth','status'])
  const environment=ghPath('repos/'+REPO+'/environments/'+ENVIRONMENT,run)
  const policies=ghPath('repos/'+REPO+'/environments/'+ENVIRONMENT+'/deployment-branch-policies',run)
  const branch=ghPath('repos/'+REPO+'/branches/'+PRODUCTION,run)
  policyReady(environment,policies.branch_policies,branch)
  const secrets=names(fromJson(run('gh',['secret','list','-e',ENVIRONMENT,'-R',REPO,'--json','name']),'SECRETS_LIST'))
  const vars=names(fromJson(run('gh',['variable','list','-e',ENVIRONMENT,'-R',REPO,'--json','name']),'VARIABLES_LIST'))
  requireSafe(!REQUIRED_SECRETS.some(name=>secrets.has(name)) && !REQUIRED_VARIABLES.some(name=>vars.has(name)),
    'EXISTING_KEYS_REFUSE_OVERWRITE')
  const source=ghPath('repos/'+REPO+'/contents/data/native-public-releases.json?ref='+encodeURIComponent(PRODUCTION),run)
  requireSafe(source.encoding==='base64' && typeof source.content==='string' && source.content.length<16384,'RELEASE_REGISTRY_UNAVAILABLE')
  verifyFirstReleaseRegistry(fromJson(Buffer.from(source.content,'base64').toString('utf8'),'RELEASE_REGISTRY'))
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
  firstReleaseReady(run)
  // Verify dependencies before any secret files are created.
  run('keytool',['-help'])
  run('age-keygen',['-version'])
  run('age',['--version'])
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
    v.alias === ALIAS && typeof v.password === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(v.password) &&
    SHA.test(v.certificateSha256) && RECIPIENT.test(v.ageRecipient), 'OWNER_RECORD_MISMATCH')
  return {files,record:v}
}
const names = rows => {
  requireSafe(Array.isArray(rows) && rows.every(row=>row && typeof row.name==='string' && /^[_A-Za-z][_A-Za-z0-9]{0,99}$/.test(row.name)),
    'CREDENTIAL_METADATA_UNAVAILABLE')
  return new Set(rows.map(row=>row.name.toUpperCase()))
}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
function sourceFiles(files) {
  return Object.fromEntries(OWNER_FILES.map(name=>{
    const path=join(files.dir,name)
    privateFile(path)
    requireSafe(lstatSync(path).size>0 && lstatSync(path).size<=262144,'BACKUP_SOURCE_SIZE')
    return [name,readFileSync(path)]
  }))
}
function outsideKeyDirectory(dir,archive) {
  requireSafe(typeof archive==='string' && isAbsolute(archive),'ABSOLUTE_BACKUP_PATH_REQUIRED')
  privateDirectory(dirname(archive))
  const owner=realpathSync(dir),parent=realpathSync(dirname(archive))
  requireSafe(parent!==owner && !parent.startsWith(owner+sep),'BACKUP_OUTSIDE_KEY_DIRECTORY')
}
export function backupOwnerKeys({dir=defaultDir(),archive,recipient,run=invoke}={}) {
  process.umask(0o077)
  const {files,record}=readOwnerRecord(dir)
  recipient=agePublicKey(recipient)
  requireSafe(recipient!==record.ageRecipient,'INDEPENDENT_BACKUP_RECIPIENT')
  outsideKeyDirectory(dir,archive)
  requireSafe(!existsSync(archive),'BACKUP_ALREADY_EXISTS')
  const payload={schema:'HH_ANDROID_ENCRYPTED_BACKUP_V1',appId:'com.holistichouse.app',
    certificateSha256:record.certificateSha256,recipient,
    files:Object.fromEntries(Object.entries(sourceFiles(files)).map(([name,bytes])=>[name,bytes.toString('base64')]))}
  run('age',['--encrypt','--recipient',recipient,'--output',archive],{input:JSON.stringify(payload)})
  privateFile(archive)
  requireSafe(lstatSync(archive).size>0 && lstatSync(archive).size<=1048576,'BACKUP_SIZE')
  return {archive,certificateSha256:record.certificateSha256,restoreVerificationRequired:true,remoteSecretsConfigured:false}
}
export function verifyOwnerBackup({dir=defaultDir(),archive,identity,confirmIndependent=false,run=invoke}={}) {
  requireSafe(confirmIndependent===true,'INDEPENDENT_BACKUP_CONFIRMATION_REQUIRED')
  const {files,record}=readOwnerRecord(dir)
  outsideKeyDirectory(dir,archive)
  privateFile(archive)
  requireSafe(typeof identity==='string' && isAbsolute(identity),'ABSOLUTE_BACKUP_IDENTITY_REQUIRED')
  outsideKeyDirectory(dir,identity)
  privateFile(identity)
  requireSafe(lstatSync(archive).size>0 && lstatSync(archive).size<=1048576,'BACKUP_SIZE')
  const recipient=agePublicKey(run('age-keygen',['-y',identity]))
  requireSafe(recipient!==record.ageRecipient,'INDEPENDENT_BACKUP_RECIPIENT')
  // Decrypt into memory only; no plaintext recovery archive or extracted key is written.
  const payload=fromJson(run('age',['--decrypt','--identity',identity,archive]),'BACKUP')
  const current=sourceFiles(files)
  requireSafe(payload?.schema==='HH_ANDROID_ENCRYPTED_BACKUP_V1' && payload.appId==='com.holistichouse.app' &&
    payload.certificateSha256===record.certificateSha256 && payload.recipient===recipient &&
    payload.files && Object.keys(payload.files).length===OWNER_FILES.length &&
    OWNER_FILES.every(name=>payload.files[name]===current[name].toString('base64')),'BACKUP_RESTORE_MISMATCH')
  const receipt={schema:'HH_ANDROID_VERIFIED_BACKUP_V1',certificateSha256:record.certificateSha256,
    archive:realpathSync(archive),sha256:digest(readFileSync(archive)),
    sourceHashes:Object.fromEntries(Object.entries(current).map(([name,bytes])=>[name,digest(bytes)])),
    independentlyStored:true,verifiedAt:new Date().toISOString()}
  const path=join(dir,BACKUP_RECEIPT)
  if(existsSync(path))privateFile(path)
  writeFileSync(path,JSON.stringify(receipt)+'\n',{mode:0o600,flag:existsSync(path)?'w':'wx'})
  privateFile(path)
  return {verified:true,certificateSha256:record.certificateSha256,independentStorageAttested:true,remoteSecretsConfigured:false}
}
function verifiedBackup(files,record) {
  const path=join(files.dir,BACKUP_RECEIPT)
  requireSafe(existsSync(path),'VERIFIED_BACKUP_REQUIRED')
  privateFile(path)
  const proof=fromJson(readFileSync(path,'utf8'),'BACKUP_RECEIPT')
  requireSafe(proof?.schema==='HH_ANDROID_VERIFIED_BACKUP_V1' && proof.independentlyStored===true &&
    proof.certificateSha256===record.certificateSha256 && Number.isFinite(Date.parse(proof.verifiedAt)) &&
    typeof proof.archive==='string' && isAbsolute(proof.archive) && existsSync(proof.archive),'VERIFIED_BACKUP_REQUIRED')
  outsideKeyDirectory(files.dir,proof.archive)
  privateFile(proof.archive)
  requireSafe(lstatSync(proof.archive).size<=1048576 && digest(readFileSync(proof.archive))===proof.sha256 &&
    JSON.stringify(Object.fromEntries(Object.entries(sourceFiles(files)).map(([name,bytes])=>[name,digest(bytes)])))===JSON.stringify(proof.sourceHashes),
    'VERIFIED_BACKUP_CHANGED')
}
export function uploadOwnerKeys({dir=defaultDir(),run=invoke,confirm=false}={}) {
  requireSafe(confirm === true, 'EXPLICIT_UPLOAD_CONFIRMATION_REQUIRED')
  const {files,record:v} = readOwnerRecord(dir)
  verifiedBackup(files,v)
  firstReleaseReady(run)
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
    backupRequired:false,backupVerified:true,signedApkCreated:false,githubReleasePublished:false}
}
export function verifyOwnerExecution({ci,isTTY,debug}) {
  requireSafe(ci === false && isTTY === true && debug === false, 'LOCAL_OWNER_REQUIRED')
  return true
}
function main(argv) {
  verifyOwnerExecution({ci:Boolean(process.env.CI || process.env.GITHUB_ACTIONS),
    isTTY:Boolean(process.stdin.isTTY),
    debug:Boolean(process.env.GH_DEBUG || process.env.DEBUG || process.env.GIT_TRACE || process.env.GIT_TRACE_CURL)})

  if (argv.length === 1 && argv[0] === '--prepare') {
    const result=prepareOwnerKeys()
    console.log('OWNER KEYS PREPARED; NEVER COMMIT OR SHARE THE PRIVATE DIRECTORY')
    console.log(JSON.stringify(result,null,2))
  } else if (argv.length===5 && argv[0]==='--backup' && argv[1]==='--recipient' && argv[3]==='--output') {
    console.log(JSON.stringify(backupOwnerKeys({recipient:argv[2],archive:argv[4]}),null,2))
  } else if (argv.length===6 && argv[0]==='--verify-backup' && argv[1]==='--archive' && argv[3]==='--identity' && argv[5]==='--confirm-independent-backup') {
    console.log(JSON.stringify(verifyOwnerBackup({archive:argv[2],identity:argv[4],confirmIndependent:true}),null,2))
  } else if (argv.length === 2 && argv[0] === '--upload' && argv[1] === '--confirm-upload') {
    const result=uploadOwnerKeys({confirm:true})
    console.log('PROTECTED GITHUB ENVIRONMENT CONFIGURATION COMPLETE (names only)')
    console.log(JSON.stringify(result,null,2))
  } else {
    throw new Error('Usage: --prepare | --backup --recipient age1... --output /absolute/backup.age | --verify-backup --archive /absolute/backup.age --identity /absolute/identity --confirm-independent-backup | --upload --confirm-upload')
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)) }
  catch(e) { console.error(e.message); process.exitCode=1 }
}
