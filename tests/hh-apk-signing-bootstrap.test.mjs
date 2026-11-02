import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,existsSync,rmSync,writeFileSync,lstatSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {
  prepareOwnerKeys,uploadOwnerKeys,policyReady,fingerprint,REPO,ENVIRONMENT,PRODUCTION,
  REQUIRED_SECRETS,REQUIRED_VARIABLES
} from '../scripts/bootstrap-hh-apk-signing.mjs'

const cert = 'af'.repeat(32), age = 'age1'+'q'.repeat(58)
function mockedRunner() {
  let sent = [], uploadedSecrets=false,uploadedVars=false
  const calls = []
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
      if(args[0]==='-y')return age+'\n'
      if(args[0]==='-version')return 'age v1'
    }
    if(tool==='gh') {
      const p=args.join(' ')
      if(p==='auth status')return ''
      if(args[0]==='api') {
        if(args[1].endsWith('/environments/'+ENVIRONMENT))return JSON.stringify(environment)
        if(args[1].endsWith('/deployment-branch-policies'))return JSON.stringify({branch_policies:[{name:PRODUCTION}]})
        if(args[1].includes('/branches/'))return JSON.stringify({protected:true})
      }
      if(p.includes('secret list'))return JSON.stringify(uploadedSecrets?REQUIRED_SECRETS.map(name=>({name})):[])
      if(p.includes('variable list'))return JSON.stringify(uploadedVars?REQUIRED_VARIABLES.map(name=>({name})):[])
      if(p.includes('secret set')){assert.ok(options.input?.includes('HH_ANDROID_KEYSTORE_B64='));sent.push({what:'secret',payload:options.input});uploadedSecrets=true;return ''}
      if(p.includes('variable set')){sent.push({what:'variable',payload:options.input});uploadedVars=true;return ''}
    }
    throw new Error('Unexpected subprocess: '+tool+' '+args.join(' '))
  }
  return {run,calls,sent,environment}
}
function tempDir(fn){const root=mkdtempSync(join(tmpdir(),'hh-apk-owner-'));try{return fn(join(root,'secure','apk'))}finally{rmSync(root,{recursive:true,force:true})}}
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
  const safe={name:ENVIRONMENT,protection_rules:[{type:'required_reviewers',reviewers:[{id:1}]}],deployment_branch_policy:{custom_branch_policies:true}};
  assert.equal(policyReady(safe,[{name:PRODUCTION}],{protected:true}),true)
  assert.throws(()=>policyReady({...safe,protection_rules:[]},[{name:PRODUCTION}],{protected:true}),/REQUIRED_REVIEWER_MISSING/)
  assert.throws(()=>policyReady(safe,[{name:'main'}],{protected:true}),/PRODUCTION_BRANCH_POLICY_MISMATCH/)
  assert.throws(()=>policyReady(safe,[{name:PRODUCTION},{name:'main'}],{protected:true}),/PRODUCTION_BRANCH_POLICY_MISMATCH/)
  assert.throws(()=>policyReady(safe,[{name:PRODUCTION}],{protected:false}),/PRODUCTION_BRANCH_NOT_PROTECTED/)
  assert.throws(()=>policyReady({...safe,deployment_branch_policy:{}},null,{protected:true}),/DEPLOYMENT_BRANCH_RESTRICTION_MISSING/)
})
test('upload is explicit, protected, client-side and verifies only secret names',()=>tempDir(dir=>{
  const mock=mockedRunner();prepareOwnerKeys({dir,run:mock.run})
  assert.throws(()=>uploadOwnerKeys({dir,run:mock.run}),/EXPLICIT_UPLOAD_CONFIRMATION_REQUIRED/)
  const output=uploadOwnerKeys({dir,run:mock.run,confirm:true})
  assert.equal(output.signedApkCreated,false)
  assert.equal(output.githubReleasePublished,false)
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
