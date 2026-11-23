import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,existsSync,rmSync,writeFileSync,lstatSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {
  prepareOwnerKeys,uploadOwnerKeys,backupOwnerKeys,verifyOwnerBackup,policyReady,fingerprint,REPO,ENVIRONMENT,PRODUCTION,
  REQUIRED_SECRETS,REQUIRED_VARIABLES
} from '../scripts/bootstrap-hh-apk-signing.mjs'

const cert = 'af'.repeat(32), age = 'age1'+'q'.repeat(58)
const backupAge='age1'+'p'.repeat(58)
function mockedRunner() {
  let sent = [], uploadedSecrets=false,uploadedVars=false
  const calls = []
  const secretMetadata=[],variableMetadata=[]
  const registry={schemaVersion:1,appId:'com.holistichouse.app',android:{status:'not_released',ownerApproved:false,version:null,versionCode:null,downloadUrl:null,sha256:null,signingCertificateSha256:null,qaEvidenceUrl:null}}
  const environment = {name:ENVIRONMENT,protection_rules:[{type:'required_reviewers',reviewers:[{id:123,type:'User'}]}],
    deployment_branch_policy:{custom_branch_policies:true,protected_branches:false}}
  function run(tool,args,options={}) {
    calls.push({tool,args,hasEnv:!!options.env,input:options.input||null})
    if (tool === 'keytool') {
      if (args[0] === '-genkeypair') {
        const path = args[args.indexOf('-keystore') + 1]
        assert.equal(args.includes('-storepass'),false,'Password must never be an argument')
        assert.ok(!args.includes(options.env.HH_LOCAL_SIGN_PASSWORD))
        writeFileSync(path,'mock binary keystore',{mode:0o600})
        return ''
      }
      if(args[0] === '-list')return 'Owner: CN=Holistic House\nSHA256: '+cert.match(/../g).join(':').toUpperCase()+'\n'
      if(args[0] === '-help')return ''
    }
    if(tool==='age-keygen') {
      if(args[0]==='-o'){writeFileSync(args[1],'AGE-SECRET-KEY-1-DO-NOT-PUBLISH',{mode:0o600});return ''}
      if(args[0]==='-y')return (args[1].endsWith('backup-private.txt')?backupAge:age)+'\n'
      if(args[0]==='-version')return 'age v1'
    }
    if(tool==='age'){
      if(args[0]==='--version')return 'age v1'
      if(args[0]==='--encrypt'){writeFileSync(args[args.indexOf('--output')+1],'MOCK-AGE\n'+Buffer.from(options.input).toString('base64'),{mode:0o600});return ''}
      if(args[0]==='--decrypt')return Buffer.from(readFileSync(args.at(-1),'utf8').slice('MOCK-AGE\n'.length),'base64').toString('utf8')
    }
    if(tool==='gh') {
      const p=args.join(' ')
      if(p==='auth status')return ''
      if(args[0]==='api') {
        if(args[1].endsWith('/environments/'+ENVIRONMENT))return JSON.stringify(environment)
        if(args[1].endsWith('/deployment-branch-policies'))return JSON.stringify({branch_policies:[{name:PRODUCTION,type:'branch'}]})
        if(args[1].includes('/branches/'))return JSON.stringify({protected:true})
        if(args[1].includes('/contents/data/native-public-releases.json'))return JSON.stringify({encoding:'base64',content:Buffer.from(JSON.stringify(registry)).toString('base64')})
      }
      if(p.includes('secret list'))return JSON.stringify(uploadedSecrets?REQUIRED_SECRETS.map(name=>({name})):secretMetadata)
      if(p.includes('variable list'))return JSON.stringify(uploadedVars?REQUIRED_VARIABLES.map(name=>({name})):variableMetadata)
      if(p.includes('secret set')){assert.ok(options.input?.includes('HH_ANDROID_KEYSTORE_B64='));sent.push({what:'secret',payload:options.input});uploadedSecrets=true;return ''}
      if(p.includes('variable set')){sent.push({what:'variable',payload:options.input});uploadedVars=true;return ''}
    }
    throw new Error('Unexpected subprocess: '+tool+' '+args.join(' '))
  }
  return {run,calls,sent,environment,registry,secretMetadata,variableMetadata}
}
function tempDir(fn){const root=mkdtempSync(join(tmpdir(),'hh-apk-owner-'));try{return fn(join(root,'secure','apk'))}finally{rmSync(root,{recursive:true,force:true})}}
function checkedBackup(dir,mock){
 const archive=join(dir,'..','backup.age'),identity=join(dir,'..','backup-private.txt')
 writeFileSync(identity,'MOCK INDEPENDENT BACKUP IDENTITY',{mode:0o600})
 backupOwnerKeys({dir,archive,recipient:backupAge,run:mock.run})
 verifyOwnerBackup({dir,archive,identity,confirmIndependent:true,run:mock.run})
 return {archive,identity}
}
test('fingerprint validates full SHA256 and rejects shorter or wrong formats',()=>{
  assert.equal(fingerprint('Certificate SHA256: '+cert.match(/../g).join(':').toUpperCase()),cert)
  for(const x of ['SHA256: '+('aa:'.repeat(18)),'SHA1: '+cert, 'SHA256: incorrect'])
    assert.throws(()=>fingerprint(x),/HH_SIGNING_SETUP_CERTIFICATE_FINGERPRINT/)
})
test('signing preparation creates owner-private files outside Git and refuses rotation',()=>tempDir(dir=>{
  const mock=mockedRunner();const r=prepareOwnerKeys({dir,run:mock.run})
  assert.equal(r.certificateSha256,cert)
  assert.equal(r.qaRecipient,age)
  assert.equal(r.remoteSecretsConfigured,false)
  for(const file of [join(dir,'holistic-house-website-release.jks'),
      join(dir,'owner-credentials.json'),join(dir,'qa-decryption-identity.txt')]){
    assert.ok(existsSync(file))
    assert.equal(lstatSync(file).mode & 0o077,0,'No group/other access to '+file)
  }
  const stored=JSON.parse(readFileSync(join(dir,'owner-credentials.json')))
  assert.ok(stored.password.length>=40)
  assert.ok(!mock.calls.find(c=>c.tool==='keytool')?.args.join(' ').includes(stored.password))
  assert.throws(()=>prepareOwnerKeys({dir,run:mock.run}),/KEY_ALREADY_EXISTS_REFUSE_ROTATION/)
}))
test('environment must have reviewers, protected production and a precise branch policy',()=>{
  const safe={name:ENVIRONMENT,protection_rules:[{type:'required_reviewers',reviewers:[{id:1}]}],deployment_branch_policy:{custom_branch_policies:true,protected_branches:false}};
  assert.equal(policyReady(safe,[{name:PRODUCTION,type:'branch'}],{protected:true}),true)
  assert.throws(()=>policyReady({...safe,protection_rules:[]},[{name:PRODUCTION}],{protected:true}),/REQUIRED_REVIEWER_MISSING/)
  assert.throws(()=>policyReady(safe,[{name:'main'}],{protected:true}),/PRODUCTION_BRANCH_POLICY_MISMATCH/)
  assert.throws(()=>policyReady(safe,[{name:PRODUCTION},{name:'main'}],{protected:true}),/PRODUCTION_BRANCH_POLICY_MISMATCH/)
  assert.throws(()=>policyReady(safe,[{name:PRODUCTION}],{protected:false}),/PRODUCTION_BRANCH_NOT_PROTECTED/)
  assert.throws(()=>policyReady({...safe,deployment_branch_policy:{}},null,{protected:true}),/DEPLOYMENT_BRANCH_RESTRICTION_MISSING/)
})
test('all-protected-branches and production-named tag policies cannot authorize signing upload',()=>{
  const safe={name:ENVIRONMENT,protection_rules:[{type:'required_reviewers',reviewers:[{id:1}]}],deployment_branch_policy:{custom_branch_policies:true,protected_branches:false}}
  assert.throws(()=>policyReady({...safe,deployment_branch_policy:{custom_branch_policies:false,protected_branches:true}},null,{protected:true}),/PRODUCTION_BRANCH_POLICY_MISMATCH/)
  assert.throws(()=>policyReady({...safe,deployment_branch_policy:{custom_branch_policies:true,protected_branches:true}},[{name:PRODUCTION,type:'branch'}],{protected:true}),/PRODUCTION_BRANCH_POLICY_MISMATCH/)
  assert.throws(()=>policyReady(safe,[{name:PRODUCTION,type:'tag'}],{protected:true}),/PRODUCTION_BRANCH_POLICY_MISMATCH/)
  assert.throws(()=>policyReady(safe,[{name:PRODUCTION}],{protected:true}),/PRODUCTION_BRANCH_POLICY_MISMATCH/)
  assert.equal(policyReady(safe,[{name:PRODUCTION,type:'branch'}],{protected:true}),true)
})
test('upload is explicit, protected, client-side and verifies only secret names',()=>tempDir(dir=>{
  const mock=mockedRunner();prepareOwnerKeys({dir,run:mock.run})
  assert.throws(()=>uploadOwnerKeys({dir,run:mock.run}),/EXPLICIT_UPLOAD_CONFIRMATION_REQUIRED/)
  checkedBackup(dir,mock)
  const output=uploadOwnerKeys({dir,run:mock.run,confirm:true})
  assert.equal(output.signedApkCreated,false)
  assert.equal(output.githubReleasePublished,false)
  assert.equal(output.repository,REPO)
  assert.deepEqual(output.uploadedSecretNames,[...REQUIRED_SECRETS])
  const secret=mock.sent.find(x=>x.what==='secret')?.payload
  const vars=mock.sent.find(x=>x.what==='variable')?.payload
  assert.ok(secret.includes('HH_ANDROID_KEYSTORE_B64='))
  assert.ok(secret.includes('HH_ANDROID_KEY_PASSWORD='))
  assert.ok(vars.includes('HH_APK_QA_AGE_RECIPIENT='+age))
  assert.ok(vars.includes('HH_EXPECTED_WEBSITE_CERT_SHA256='+cert))
  const pass=JSON.parse(readFileSync(join(dir,'owner-credentials.json'))).password
  assert.ok(secret.includes(pass),'Client encryption is fed through stdin')
  assert.ok(!mock.calls.some(x=>x.args.join(' ').includes(pass)),'Never expose passwords through CLI arguments')
}))

test('owner command requires interactive non-CI execution without debug tracing',async()=>{
 const {verifyOwnerExecution}=await import('../scripts/bootstrap-hh-apk-signing.mjs')
 assert.equal(typeof verifyOwnerExecution,'function')
 for(const value of [{ci:true,isTTY:true,debug:false},{ci:false,isTTY:false,debug:false},{ci:false,isTTY:true,debug:true}])assert.throws(()=>verifyOwnerExecution(value),/LOCAL_OWNER_REQUIRED/)
 assert.equal(verifyOwnerExecution({ci:false,isTTY:true,debug:false}),true)
})

test('first-release registry rejects every existing or ambiguous Android release identity',async()=>{
 const {verifyFirstReleaseRegistry}=await import('../scripts/bootstrap-hh-apk-signing.mjs')
 assert.equal(typeof verifyFirstReleaseRegistry,'function')
 const clean={schemaVersion:1,appId:'com.holistichouse.app',android:{status:'not_released',ownerApproved:false,version:null,versionCode:null,downloadUrl:null,sha256:null,signingCertificateSha256:null,qaEvidenceUrl:null}}
 assert.equal(verifyFirstReleaseRegistry(clean),true)
 for(const value of [null,{}, {...clean,appId:'other'}, {...clean,android:{...clean.android,status:'released'}}, {...clean,android:{...clean.android,signingCertificateSha256:cert}}, {...clean,android:{...clean.android,versionCode:1}}, {...clean,android:{...clean.android,ownerApproved:true}}, {...clean,android:{status:'not_released',ownerApproved:false}}])assert.throws(()=>verifyFirstReleaseRegistry(value),/RELEASE_ALREADY_EXISTS_OR_UNKNOWN/)
})
test('preparation checks the protected first release before generating any key',()=>tempDir(dir=>{
 const mock=mockedRunner();mock.registry.android.signingCertificateSha256=cert
 assert.throws(()=>prepareOwnerKeys({dir,run:mock.run}),/RELEASE_ALREADY_EXISTS_OR_UNKNOWN/)
 assert.equal(existsSync(dir),false)
 assert.equal(mock.calls.some(call=>call.tool==='keytool'&&call.args.includes('-genkeypair')),false)
}))
test('upload refuses unverified backups before transmitting any credentials',()=>tempDir(dir=>{
 const mock=mockedRunner();prepareOwnerKeys({dir,run:mock.run})
 assert.throws(()=>uploadOwnerKeys({dir,run:mock.run,confirm:true}),/VERIFIED_BACKUP_REQUIRED/)
 assert.equal(mock.sent.length,0)
}))
test('encrypted backup requires an independent recipient and a verified restore before upload',async()=>{
 const {backupOwnerKeys,verifyOwnerBackup}=await import('../scripts/bootstrap-hh-apk-signing.mjs')
 assert.equal(typeof backupOwnerKeys,'function');assert.equal(typeof verifyOwnerBackup,'function')
 tempDir(dir=>{
  const mock=mockedRunner();prepareOwnerKeys({dir,run:mock.run})
  const archive=join(dir,'..','backup.age'),identity=join(dir,'..','backup-private.txt')
  writeFileSync(identity,'MOCK INDEPENDENT BACKUP IDENTITY',{mode:0o600})
  assert.throws(()=>backupOwnerKeys({dir,archive,recipient:age,run:mock.run}),/INDEPENDENT_BACKUP_RECIPIENT/)
  assert.throws(()=>backupOwnerKeys({dir,archive:join(dir,'backup.age'),recipient:backupAge,run:mock.run}),/BACKUP_OUTSIDE_KEY_DIRECTORY/)
  backupOwnerKeys({dir,archive,recipient:backupAge,run:mock.run})
  assert.equal(readFileSync(archive,'utf8').includes('mock binary keystore'),false)
  assert.throws(()=>backupOwnerKeys({dir,archive,recipient:backupAge,run:mock.run}),/BACKUP_ALREADY_EXISTS/)
  assert.throws(()=>verifyOwnerBackup({dir,archive,identity,run:mock.run}),/INDEPENDENT_BACKUP_CONFIRMATION_REQUIRED/)
  assert.throws(()=>uploadOwnerKeys({dir,run:mock.run,confirm:true}),/VERIFIED_BACKUP_REQUIRED/)
  const unsafeIdentity=join(dir,'backup-private.txt')
  writeFileSync(unsafeIdentity,'MOCK INDEPENDENT BACKUP IDENTITY',{mode:0o600})
  assert.throws(()=>verifyOwnerBackup({dir,archive,identity:unsafeIdentity,confirmIndependent:true,run:mock.run}),/BACKUP_OUTSIDE_KEY_DIRECTORY/)
  const checked=verifyOwnerBackup({dir,archive,identity,confirmIndependent:true,run:mock.run})
  assert.equal(checked.verified,true)
  const output=uploadOwnerKeys({dir,run:mock.run,confirm:true})
  assert.equal(output.backupVerified,true);assert.equal(output.signedApkCreated,false)
  const encrypted=mock.calls.find(call=>call.tool==='age'&&call.args[0]==='--encrypt')
  assert.equal(encrypted.args.includes(backupAge),true)
  const pass=JSON.parse(readFileSync(join(dir,'owner-credentials.json'))).password
  assert.ok(!mock.calls.some(call=>call.args.join(' ').includes(pass)))
 })
})
test('changed backup ciphertext or local credentials invalidate restore evidence before any upload',()=>{
 for(const changed of ['archive','keystore','identity','record'])tempDir(dir=>{
  const mock=mockedRunner();prepareOwnerKeys({dir,run:mock.run})
  const {archive}=checkedBackup(dir,mock)
  const path=changed==='archive'?archive:join(dir,changed==='keystore'?'holistic-house-website-release.jks':changed==='identity'?'qa-decryption-identity.txt':'owner-credentials.json')
  if(changed==='record'){
   const record=JSON.parse(readFileSync(path));record.password+='changed';writeFileSync(path,JSON.stringify(record))
  }else writeFileSync(path,'changed synthetic bytes')
  assert.throws(()=>uploadOwnerKeys({dir,run:mock.run,confirm:true}),/VERIFIED_BACKUP_CHANGED/)
  assert.equal(mock.sent.length,0)
 })
})
test('malformed credential metadata and case-insensitive existing names cannot authorize a new signing identity',()=>{
 for(const [kind,value,reason] of [['secretMetadata',{},/CREDENTIAL_METADATA_UNAVAILABLE/],['variableMetadata',{name:42},/CREDENTIAL_METADATA_UNAVAILABLE/],['secretMetadata',{name:'hh_android_keystore_b64'},/EXISTING_KEYS_REFUSE_OVERWRITE/],['variableMetadata',{name:'hh_expected_website_cert_sha256'},/EXISTING_KEYS_REFUSE_OVERWRITE/]])tempDir(dir=>{
  const mock=mockedRunner();mock[kind].push(value)
  assert.throws(()=>prepareOwnerKeys({dir,run:mock.run}),reason)
  assert.equal(existsSync(dir),false)
  assert.equal(mock.calls.some(call=>call.tool==='keytool'&&call.args.includes('-genkeypair')),false)
 })
})
test('missing backup encryption tool stops preparation before any secret file is created',()=>tempDir(dir=>{
 const mock=mockedRunner(),run=(tool,args,options)=>{if(tool==='age')throw Error('MISSING_AGE');return mock.run(tool,args,options)}
 assert.throws(()=>prepareOwnerKeys({dir,run}),/MISSING_AGE/)
 assert.equal(existsSync(dir),false)
 assert.equal(mock.calls.some(call=>call.tool==='keytool'&&call.args.includes('-genkeypair')),false)
}))
test('owner credentials reject line breaks before an env-file upload can reinterpret the password',()=>tempDir(dir=>{
 const mock=mockedRunner();prepareOwnerKeys({dir,run:mock.run})
 const path=join(dir,'owner-credentials.json'),record=JSON.parse(readFileSync(path))
 record.password+='\nUNEXPECTED_NAME=value';writeFileSync(path,JSON.stringify(record))
 assert.throws(()=>backupOwnerKeys({dir,archive:join(dir,'..','backup.age'),recipient:backupAge,run:mock.run}),/OWNER_RECORD_MISMATCH/)
 assert.equal(mock.sent.length,0)
}))
