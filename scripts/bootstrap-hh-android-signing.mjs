#!/usr/bin/env node
// OWNER-LOCAL first-time setup for signed Android APKs distributed from Holistic House.
// No key, password, private age identity or client data may enter Git, logs or chats.
import {randomBytes,X509Certificate} from 'node:crypto'
import {existsSync,lstatSync,mkdirSync,chmodSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const REPO='andylitvinov-design/books',BRANCH='codex/public-book-library'
const ENV='google-play-release',APP='com.holistichouse.app'
const secrets=['HH_ANDROID_KEYSTORE_B64','HH_ANDROID_KEYSTORE_PASSWORD',
  'HH_ANDROID_KEY_ALIAS','HH_ANDROID_KEY_PASSWORD']
const variables=['HH_EXPECTED_WEBSITE_CERT_SHA256','HH_APK_QA_AGE_RECIPIENT']
const fail=code=>{throw Error('HH_ANDROID_BOOTSTRAP_'+code)}

export function verifyProtectedFirstRelease({environment,branches,existingSecrets,existingVariables,registry}){
  if(environment?.name!==ENV||!environment.deployment_branch_policy?.custom_branch_policies||
    environment.deployment_branch_policy?.protected_branches)fail('BRANCH_RESTRICTION')
  if(!environment.protection_rules?.some(rule=>
    rule.type==='required_reviewers'&&Array.isArray(rule.reviewers)&&rule.reviewers.length>0))
    fail('REVIEWER_REQUIRED')
  if(!Array.isArray(branches?.branch_policies)||branches.branch_policies.length!==1||
     branches.branch_policies[0].name!==BRANCH)fail('PRODUCTION_ONLY')
  if(!Array.isArray(existingSecrets?.secrets)||!Array.isArray(existingVariables?.variables))
    fail('CREDENTIAL_METADATA_UNAVAILABLE')
  if(existingSecrets.secrets.some(item=>secrets.includes(item.name)))
    fail('EXISTING_SIGNING_SECRET_DO_NOT_ROTATE')
  if(existingVariables.variables.some(item=>variables.includes(item.name)))
    fail('EXISTING_SIGNING_VARIABLE_DO_NOT_ROTATE')
  if(registry?.schemaVersion!==1||registry.appId!==APP||
    registry.android?.status!=='not_released'||registry.android.ownerApproved!==false)
    fail('RELEASE_ALREADY_EXISTS_OR_UNKNOWN')
  return {repo:REPO,branch:BRANCH,firstTimeOnly:true}
}
export function verifyOwnerExecution({ci,isTTY}){
  if(ci||!isTTY)fail('RUN_LOCALLY_INTERACTIVE_ONLY')
  return true
}
function run(tool,args,{input=null,env=process.env,output=false,encoding='utf8',timeout=30000}={}){
  const x=spawnSync(tool,args,{shell:false,encoding,env,timeout,maxBuffer:2_000_000,
    ...(input===null?{}:{input})})
  // Do not print stderr: keytool and an accidentally debug-enabled GH CLI
  // could otherwise expose private values.
  if(x.error||x.status!==0)fail('COMMAND_'+tool.replace(/[^A-Za-z0-9]/g,'_').toUpperCase())
  return output?x.stdout:null
}
const json=path=>{try{return JSON.parse(run('gh',['api',path,'--method','GET'],{output:true}))}
  catch{fail('GITHUB_PREFLIGHT_'+path.replace(/[^a-z0-9]/gi,'_').toUpperCase())}}
const fetched=path=>{
  const body=json('repos/'+REPO+'/contents/'+path+'?ref='+BRANCH)
  if(!body?.content||body.encoding!=='base64')fail('SOURCE_NOT_READABLE')
  return Buffer.from(body.content,'base64').toString('utf8')
}
const secret=(name,value)=>run('gh',['secret','set',name,'--env',ENV,'--repo',REPO],
  {input:value,env:{...process.env,GH_PROMPT_DISABLED:'1'}})
const variable=(name,value)=>run('gh',['variable','set',name,'--env',ENV,'--repo',REPO],
  {input:value,env:{...process.env,GH_PROMPT_DISABLED:'1'}})

async function main(){
  if(process.argv.length!==3||process.argv[2]!=='--initialize'){
    console.log('Owner-only: node scripts/bootstrap-hh-android-signing.mjs --initialize')
    console.log('Prepares an encrypted QA candidate, NOT a public Android release.')
    return
  }
  verifyOwnerExecution({ci:Boolean(process.env.CI||process.env.GITHUB_ACTIONS),
    isTTY:Boolean(process.stdin.isTTY)})
  if(process.env.GH_DEBUG||process.env.DEBUG)fail('DISABLE_DEBUG_LOGGING')
  run('gh',['auth','status'],{env:{...process.env,GH_PROMPT_DISABLED:'1'}})
  const api='repos/'+REPO+'/environments/'+ENV
  verifyProtectedFirstRelease({
    environment:json(api),branches:json(api+'/deployment-branch-policies'),
    existingSecrets:json(api+'/secrets'),existingVariables:json(api+'/variables'),
    registry:JSON.parse(fetched('data/native-public-releases.json'))
  })
  const workflow=fetched('.github/workflows/holistic-house-play-aab.yml')
  if(!workflow.includes('environment: '+ENV)||
    !workflow.includes("github.ref == 'refs/heads/"+BRANCH+"'")||
    !workflow.includes('HH_APK_QA_AGE_RECIPIENT')||
    !workflow.includes('run: ./gradlew --no-daemon assembleRelease'))
    fail('PRODUCTION_SIGNING_WORKFLOW_UNVERIFIED')

  const dir=join(homedir(),'.config','holistic-house','android-release')
  if(existsSync(dir)){
    const stat=lstatSync(dir)
    if(!stat.isDirectory()||stat.isSymbolicLink()||
      (typeof process.getuid==='function'&&stat.uid!==process.getuid())||
      (stat.mode&0o077)!==0)fail('LOCAL_FOLDER_PERMISSIONS')
  }else mkdirSync(dir,{recursive:true,mode:0o700})
  chmodSync(dir,0o700)
  const key=join(dir,'holistic-house-signing.jks')
  const credentials=join(dir,'signing-credentials.json')
  const identity=join(dir,'qa-decryption-identity.txt')
  const backup=join(dir,'encrypted-signing-backup.tar.gz.age')
  for(const f of [key,credentials,identity,backup])
    if(existsSync(f))fail('LOCAL_EXISTING_KEY_DO_NOT_ROTATE')
  const storepass=randomBytes(36).toString('base64url')
  const keypass=randomBytes(36).toString('base64url')
  const alias='holistic-house-website'
  const env={...process.env,HH_STOREPASS:storepass,HH_KEYPASS:keypass}
  run('keytool',['-genkeypair','-noprompt','-keystore',key,'-storetype','JKS',
    '-alias',alias,'-keyalg','RSA','-keysize','4096','-validity','10000',
    '-dname','CN=Holistic House Android Signing, OU=Application Release, C=CA',
    '-storepass:env','HH_STOREPASS','-keypass:env','HH_KEYPASS'],
    {env,timeout:120000})
  chmodSync(key,0o600)
  const pem=run('keytool',['-exportcert','-rfc','-keystore',key,'-alias',alias,
    '-storepass:env','HH_STOREPASS'],{env,output:true})
  const cert=new X509Certificate(pem).fingerprint256.replaceAll(':','').toLowerCase()
  if(!/^[a-f0-9]{64}$/.test(cert))fail('INVALID_CERT')
  writeFileSync(credentials,JSON.stringify({alias,storepass,keypass,
    certificateSha256:cert,appId:APP},null,2)+'\n',{flag:'wx',mode:0o600})
  run('age-keygen',['-o',identity])
  chmodSync(identity,0o600)
  const recipient=String(run('age-keygen',['-y',identity],{output:true})).trim()
  if(!/^age1[023456789acdefghjklmnpqrstuvwxyz]{58}$/.test(recipient))
    fail('INVALID_AGE_RECIPIENT')
  const tar=spawnSync('tar',['-czf','-','-C',dir,
    'holistic-house-signing.jks','signing-credentials.json'],
    {encoding:null,shell:false,maxBuffer:2_000_000,timeout:30000})
  if(tar.error||tar.status!==0||!tar.stdout?.length)fail('BACKUP')
  run('age',['-r',recipient,'-o',backup],{input:tar.stdout,encoding:null})
  chmodSync(backup,0o600)
  if(!lstatSync(backup).size)fail('EMPTY_BACKUP')
  // GH CLI reads encrypted environment secrets from stdin. Never --body.
  secret('HH_ANDROID_KEYSTORE_B64',readFileSync(key).toString('base64'))
  secret('HH_ANDROID_KEYSTORE_PASSWORD',storepass)
  secret('HH_ANDROID_KEY_ALIAS',alias)
  secret('HH_ANDROID_KEY_PASSWORD',keypass)
  variable('HH_EXPECTED_WEBSITE_CERT_SHA256',cert)
  variable('HH_APK_QA_AGE_RECIPIENT',recipient)
  // Keep owner-managed encrypted backup; discard local plaintext intermediates
  // only after all protected GitHub values have been accepted.
  unlinkSync(credentials);unlinkSync(key)
  console.log('Release signing configured in protected environment. Cert SHA256:',cert)
  console.log('Encrypted signing backup:',backup)
  console.log('PRIVATE age identity:',identity,'— BACK UP INDEPENDENTLY; NEVER SEND TO CHAT')
  run('gh',['workflow','run','holistic-house-play-aab.yml','--repo',REPO,
    '--ref',BRANCH,'-f','version_code=2','-f','version_name=1.0.0',
    '-f','build_play_aab=false'])
  console.log('Private signed APK QA build requested; approve protected GitHub Environment.')
  console.log('NO PUBLIC RELEASE; real device OAuth, Messenger, updates and owner approval still needed.')
}
if(process.argv[1]===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error(e?.message||String(e));process.exitCode=1})
