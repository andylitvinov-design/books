import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

const readSource = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const script = new URL('../scripts/prepare-holistic-house-play-release.mjs', import.meta.url)
const inputFiles = ['android/build.gradle', 'android/variables.gradle', 'android/app/build.gradle',
  'capacitor.holistic-house.config.json']

function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), 'hh-play-release-'))
  try {
    for (const file of inputFiles) {
      const destination = join(root, file)
      mkdirSync(dirname(destination), { recursive: true })
      writeFileSync(destination, readSource(file))
    }
    const hh = readSource('capacitor.holistic-house.config.json')
    writeFileSync(join(root, 'capacitor.config.json'), hh)
    mkdirSync(join(root, 'android/app/src/main/assets'), { recursive: true })
    writeFileSync(join(root, 'android/app/src/main/assets/capacitor.config.json'), hh)
    const gradlePath = join(root, 'android/app/build.gradle')
    writeFileSync(gradlePath,
      readFileSync(gradlePath, 'utf8').replace('applicationId "app.psialchemy.mobile"',
        'applicationId "com.holistichouse.app"'))
    const key = join(root, 'fake-upload.jks')
    writeFileSync(key, 'not-a-real-key')
    const env = {
      ...process.env,
      HH_PLAY_VERSION_CODE: '2',
      HH_PLAY_VERSION_NAME: '1.0.0',
      HH_ANDROID_KEYSTORE_PATH: key,
      HH_ANDROID_KEYSTORE_PASSWORD: 'fake-store-password',
      HH_ANDROID_KEY_ALIAS: 'fake-alias',
      HH_ANDROID_KEY_PASSWORD: 'fake-key-password'
    }
    const run = (overrides = {}) => spawnSync(process.execPath, [script.pathname], {
      cwd: root, env: { ...env, ...overrides }, timeout: 10000, encoding: 'utf8'
    })
    fn({ root, env, run, read: path => readFileSync(join(root, path), 'utf8') })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test('a trusted staged HH build becomes API 36, versioned and signed using environment references only', () => {
  fixture(({ root, run, read }) => {
    const proc = run()
    assert.equal(proc.status, 0, proc.stderr)
    assert.match(read('android/build.gradle'), /com\.android\.tools\.build:gradle:8\.9\.1/)
    assert.match(read('android/variables.gradle'), /compileSdkVersion = 36/)
    assert.match(read('android/variables.gradle'), /targetSdkVersion = 36/)
    assert.match(read('android/app/build.gradle'), /applicationId "com\.holistichouse\.app"/)
    assert.match(read('android/app/build.gradle'), /versionCode 2/)
    assert.match(read('android/app/build.gradle'), /versionName "1\.0\.0"/)
    assert.match(read('android/app/build.gradle'), /apply from: 'hh-play-signing.gradle'/)
    assert.ok(existsSync(join(root, 'android/app/hh-play-signing.gradle')))
    const signing = read('android/app/hh-play-signing.gradle')
    assert.match(signing, /signingConfigs\.hhPlayUpload/)
    for (const secret of ['fake-store-password', 'fake-key-password', 'fake-alias']) {
      assert.doesNotMatch(signing + read('android/app/build.gradle') + proc.stdout, new RegExp(secret))
    }
    assert.match(signing, /System\.getenv\('HH_ANDROID_KEYSTORE_PASSWORD'\)/)
  })
})

test('missing keys, incorrect identity, and unsafe version inputs fail before any file mutation', () => {
  for (const badEnv of [
    { HH_ANDROID_KEYSTORE_PASSWORD: '' },
    { HH_ANDROID_KEYSTORE_PATH: '/does-not-exist' },
    { HH_PLAY_VERSION_CODE: '1' },
    { HH_PLAY_VERSION_CODE: '-200' },
    { HH_PLAY_VERSION_NAME: '1.0.0"; println password' },
    { HH_PLAY_VERSION_NAME: '1\\.0' },
    { HH_PLAY_VERSION_NAME: '1.0' },
    { HH_PLAY_VERSION_NAME: '1.0.0-rc1' },
    { HH_PLAY_VERSION_NAME: '1.0.0+build1' },
    { HH_PLAY_VERSION_NAME: '01.0.0' },
    { HH_PLAY_VERSION_NAME: '1.02.0' }
  ]) {
    fixture(({ root, run, read }) => {
      const before = read('android/app/build.gradle')
      const result = run(badEnv)
      assert.notEqual(result.status, 0, JSON.stringify(badEnv))
      assert.equal(read('android/app/build.gradle'), before)
      assert.ok(!existsSync(join(root, 'android/app/hh-play-signing.gradle')))
    })
  }
  fixture(({ root, run, read }) => {
    const configFile = join(root, 'android/app/src/main/assets/capacitor.config.json')
    writeFileSync(configFile, read('capacitor.config.json').replace('com.holistichouse.app', 'app.psialchemy.mobile'))
    const result = run()
    assert.notEqual(result.status, 0)
    assert.ok(!existsSync(join(root, 'android/app/hh-play-signing.gradle')))
  })
})

test('Android direct APK candidate is manual, signed and never publicly distributed', () => {
  const release = readSource('.github/workflows/holistic-house-play-aab.yml')
  assert.match(release, /workflow_dispatch:/)
  assert.doesNotMatch(release, /^  pull_request:/m)
  assert.doesNotMatch(release, /^  push:/m)
  assert.match(release, /github\.ref == 'refs\/heads\/codex\/public-book-library'/)
  assert.match(release, /environment: google-play-release/)
  assert.match(release, /HH_ANDROID_KEYSTORE_B64/)
  assert.match(release, /HH_FIREBASE_CONFIG_B64/)
  assert.match(release, /platforms;android-36/)
  const nativeCI=readSource('.github/workflows/holistic-house-native.yml')
  const sourceJob=nativeCI.slice(nativeCI.indexOf('  native-current-contracts:'),nativeCI.indexOf('  android-test-installer:'))
  assert.ok(sourceJob.includes('Secret-free source contracts must run on DRAFT PRs too'))
  assert.ok(!sourceJob.includes('github.event.pull_request.draft'))
  assert.ok(sourceJob.includes('node --test tests/holistic-house-native-build.test.mjs tests/holistic-house-play-release.test.mjs'))
  assert.ok(nativeCI.includes("if: ${{ github.event_name != 'pull_request' }}"))
  assert.match(nativeCI,/bundleRelease assembleRelease/)
  assert.match(nativeCI,/apksigner/)
  assert.match(nativeCI,/disposable signature, NO store upload or artifact/)
  assert.match(release, /bundleRelease/)
  assert.ok(release.includes('run: ./gradlew --no-daemon assembleRelease'))
  assert.ok(release.includes('run: ./gradlew --no-daemon bundleRelease'))
  assert.ok(release.includes('if: ${{ inputs.build_play_aab }}'))
  assert.ok(release.includes('default: false'))
  assert.ok(release.includes('node scripts/verify-hh-direct-apk-candidate.mjs'))
  assert.ok(release.includes('if [ -n "$HH_FIREBASE_CONFIG_B64" ]; then'))
  assert.ok(!release.includes('HH_ANDROID_KEY_PASSWORD HH_FIREBASE_CONFIG_B64; do'))
  assert.ok(!release.includes('run: ./gradlew --no-daemon bundleRelease assembleRelease'))
  assert.match(release, /apksigner/)
  assert.match(release, /certificate SHA-256 digest:/)
  assert.match(release, /HH_EXPECTED_WEBSITE_CERT_SHA256/)
  assert.match(release, /APK signing fingerprint differs from approved release certificate/)
  assert.match(release, /protected release Environment/)

  assert.match(release, /targetSdkVersion:'36'/)
  assert.match(release, /Holistic-House-Android-v/)
  assert.match(release, /HH-Website-APK-/)
  assert.match(release, /NOT-PUBLISHED/)
  assert.match(release, /jarsigner -verify/)
  assert.match(release, /retention-days: 7/)
  assert.doesNotMatch(release, /publishRelease|google-play-deploy|r0adkll\/upload-google-play|fastlane supply|curl.*androidpublisher/)
  assert.doesNotMatch(release, /gh release create|upload-release-asset|softprops\/action-gh-release|actions\/upload-release-asset/)
  assert.equal(JSON.parse(readSource('capacitor.holistic-house.config.json')).server.url,
    'https://holistichouse.vercel.app/en/app/messages')
  assert.match(readSource('scripts/prepare-holistic-house-play-release.mjs'), /targetSdkVersion = 36/)
})

test('Android website APK rejects version rollback and certificate rotation',async()=>{
  const {verifyDirectApkCandidate}=await import('../scripts/verify-hh-direct-apk-candidate.mjs')
  const empty=JSON.parse(readSource('data/native-public-releases.json'))
  const cert='a'.repeat(64)
  const first={versionCode:'3',versionName:'1.0.0',certificateSha256:cert}
  assert.equal(verifyDirectApkCandidate(empty,first).versionCode,3)
  const published=structuredClone(empty)
  published.android={...published.android,status:'released',versionCode:3,signingCertificateSha256:cert}
  const next={versionCode:'4',versionName:'1.0.1',certificateSha256:cert.toUpperCase()}
  assert.equal(verifyDirectApkCandidate(published,next).priorVersionCode,3)
  for(const [label,registry,input] of [
    ['same version',published,{...next,versionCode:'3'}],
    ['rollback',published,{...next,versionCode:'2'}],
    ['different signer',published,{...next,certificateSha256:'b'.repeat(64)}],
    ['no cert',empty,{...first,certificateSha256:''}],
    ['zero version',empty,{...first,versionCode:'0'}],
    ['malformed version',empty,{...first,versionName:'1.0.0"; bad'}],
    ['incomplete version',empty,{...first,versionName:'1.0'}],
    ['unpublishable prerelease',empty,{...first,versionName:'1.0.0-rc1'}],
    ['unpublishable build suffix',empty,{...first,versionName:'1.0.0+build1'}],
    ['leading zero',empty,{...first,versionName:'01.0.0'}],
    ['minor leading zero',empty,{...first,versionName:'1.02.0'}],
    ['wrong identity',{...empty,appId:'app.psialchemy.mobile'},first],
    ['unknown status',{...empty,android:{status:'unknown'}},first]
  ])assert.throws(()=>verifyDirectApkCandidate(registry,input),/HH_DIRECT_APK_/,label)
})

test('operator release instructions keep direct website APK independent of stores and optional Firebase',()=>{
  const runbook=readSource('docs/releases/HOLISTIC_HOUSE_PLAY_OPERATOR_RUNBOOK_20261027.md')
  for(const text of [
    'Google Play не требуется','build_play_aab=false','Firebase не нужен для сборки APK',
    'HH_EXPECTED_WEBSITE_CERT_SHA256','HH-Website-APK-<version_code>-ENCRYPTED-NOT-PUBLISHED',
    'ownerApproved:true','HH_NATIVE_PUBLIC_RELEASES_ENABLED=true','Android Developer Console'
  ])assert.ok(runbook.includes(text),'missing direct Android release contract: '+text)
  assert.ok(!runbook.includes('Verify with [Play Console]'))
  assert.ok(!runbook.includes('Fresh Play internal install'))
  assert.ok(runbook.includes('/api/native-download/android'))
  assert.ok(runbook.includes('сначала') || runbook.includes('До этого API обязан возвращать 404'))
})

test('public GitHub Actions artifacts never contain unapproved plaintext APK or AAB',()=>{
  const workflow=readSource('.github/workflows/holistic-house-play-aab.yml')
  assert.ok(workflow.includes('HH_APK_QA_AGE_RECIPIENT'))
  assert.ok(workflow.includes('Missing approved age recipient: cannot publish raw QA APK'))
  assert.ok(workflow.includes('age -r "$HH_APK_QA_AGE_RECIPIENT"'))
  assert.ok(workflow.includes('rm -f "$apk" android/app/build/outputs/apk/release/app-release.apk'))
  const apkSection=workflow.split('      - name: Retain ENCRYPTED website APK for owner QA (NOT public)')[1]
    ?.split('      - name: Retain ENCRYPTED optional AAB')[0]
  const aabSection=workflow.split('      - name: Retain ENCRYPTED optional AAB for manual Play review')[1]
    ?.split('      - name: Remove ephemeral signing key')[0]
  assert.ok(apkSection&&aabSection)
  assert.ok(apkSection.includes('Holistic-House-Android-v*.apk.age'))
  assert.ok(aabSection.includes('Holistic-House-Android-v*.aab.age'))
  assert.ok(!apkSection.split('\n').some(x=>x.trim()==='Holistic-House-Android-v*.apk'))
  assert.ok(!aabSection.split('\n').some(x=>x.trim()==='android/app/build/outputs/bundle/release/app-release.aab'))
  assert.ok(readSource('docs/releases/HOLISTIC_HOUSE_PLAY_OPERATOR_RUNBOOK_20261027.md').includes('age --decrypt'))
})

test('offline Android APK QA recomputes signed payload evidence and never claims real device acceptance',async()=>{
  const {verifyApkEvidence}=await import('../scripts/verify-hh-direct-apk-qa.mjs')
  const digest='a'.repeat(64), cert='b'.repeat(64)
  const template={
    filename:'Holistic-House-Android-v1.0.0.apk',
    sha256:digest,
    checksumText:digest+'  Holistic-House-Android-v1.0.0.apk\n',
    certificateSha256:cert,
    version:'1.0.0',versionCode:'2',
    signerOutput:'Verifies\nVerified using v2 scheme (APK Signature Scheme v2): true\nSigner #1 certificate SHA-256 digest: '+cert+'\n',
    badgingOutput:"package: name='com.holistichouse.app' versionCode='2' versionName='1.0.0'\n"+
      "application-label:'Holistic House'\ntargetSdkVersion:'36'\n"
  }
  const ok=verifyApkEvidence(template)
  assert.equal(ok.staticPackageChecks,'PASS')
  assert.equal(ok.physicalDeviceE2E,'NOT_CHECKED')
  assert.equal(ok.ownerApprovedForPublication,false)
  for(const [name,change] of [
    ['bad hash',{sha256:'c'.repeat(64)}],
    ['wrong filename',{filename:'app-debug.apk'}],
    ['wrong release version',{version:'1.0.0-rc'}],
    ['downgraded versionCode',{versionCode:'1'}],
    ['wrong checksum filename',{checksumText:digest+'  app-release.apk\n'}],
    ['two checksum records',{checksumText:template.checksumText+template.checksumText}],
    ['wrong signing key',{certificateSha256:'c'.repeat(64)}],
    ['two signers',{signerOutput:template.signerOutput+'Signer #2 certificate SHA-256 digest: '+cert+'\n'}],
    ['unsigned',{signerOutput:'Does not verify\nVerified using v2 scheme: false\n'}],
    ['v1 signature only',{signerOutput:'Verifies\nVerified using v1 scheme (JAR): true\nSigner #1 certificate SHA-256 digest: '+cert+'\n'}],
    ['wrong native package',{badgingOutput:template.badgingOutput.replace('com.holistichouse.app','app.psialchemy.mobile')}],
    ['wrong app label',{badgingOutput:template.badgingOutput.replace('Holistic House','Other App')}],
    ['wrong Android version',{badgingOutput:template.badgingOutput.replace("targetSdkVersion:'36'","targetSdkVersion:'35'")}],
    ['debuggable',{badgingOutput:template.badgingOutput+"application-debuggable\n"}],
    ['wrong app version',{badgingOutput:template.badgingOutput.replace("versionName='1.0.0'","versionName='2.0.0'")}]
  ])assert.throws(()=>verifyApkEvidence({...template,...change}),/HH_APK_QA_/,name)
  const code=readSource('scripts/verify-hh-direct-apk-qa.mjs')
  assert.match(code,/spawnSync\(exe,args,\{shell:false/)
  assert.match(code,/ownerApprovedForPublication: false/)
  assert.doesNotMatch(code,/fetch\(|https:\/\/api\.github\.com|gh release create|upload-release-asset/)
})

test('offline APK QA command validates actual file stream with safe tools and refuses false receipt',()=>{
  const root=mkdtempSync(join(tmpdir(),'hh-apk-static-qa-'))
  try{
    const version='1.0.0',cert='b'.repeat(64)
    const filename='Holistic-House-Android-v'+version+'.apk'
    const apk=join(root,filename),hashFile=join(root,'hh-website-apk-sha256.txt')
    const bytes=Buffer.from('synthetic binary for QA command plumbing; NOT an Android application')
    writeFileSync(apk,bytes)
    const digest=createHash('sha256').update(bytes).digest('hex')
    writeFileSync(hashFile,digest+'  '+filename+'\n')
    const signer=join(root,'qa-fake-apksigner')
    const aapt=join(root,'qa-fake-aapt')
    writeFileSync(signer,'#!/usr/bin/env node\n'+
      "if(process.argv.slice(2,5).join(' ')!=='verify --verbose --print-certs')process.exit(3);\n"+
      "process.stdout.write('Verifies\\nVerified using v2 scheme (APK Signature Scheme v2): true\\nSigner #1 certificate SHA-256 digest: "+cert+"\\n');\n",
      {mode:0o755})
    writeFileSync(aapt,'#!/usr/bin/env node\n'+
      "if(process.argv.slice(2,4).join(' ')!=='dump badging')process.exit(3);\n"+
      "process.stdout.write(\"package: name='com.holistichouse.app' versionCode='2' versionName='1.0.0'\\napplication-label:'Holistic House'\\ntargetSdkVersion:'36'\\n\");\n",
      {mode:0o755})
    const script=new URL('../scripts/verify-hh-direct-apk-qa.mjs',import.meta.url).pathname
    const invoke=(expectedCert,shaPath,out,signerTool=signer)=>spawnSync(
      process.execPath,[script,'--apk',apk,'--sha-file',shaPath,
        '--expected-cert',expectedCert,'--version',version,'--version-code','2',
        '--apksigner',signerTool,'--aapt',aapt,'--out',out],
      {encoding:'utf8',timeout:15000})
    const output=join(root,'static-pass.json')
    const good=invoke(cert,hashFile,output)
    assert.equal(good.status,0,good.stderr)
    assert.ok(existsSync(output))
    const receipt=JSON.parse(readFileSync(output,'utf8'))
    assert.equal(receipt.sha256,digest)
    assert.equal(receipt.physicalDeviceE2E,'NOT_CHECKED')
    assert.equal(receipt.ownerApprovedForPublication,false)
    const mismatch=join(root,'mismatch.json')
    const badSigner=invoke('c'.repeat(64),hashFile,mismatch)
    assert.notEqual(badSigner.status,0)
    assert.match(badSigner.stderr,/HH_APK_QA_CERTIFICATE_MISMATCH/)
    assert.ok(!existsSync(mismatch),'Never write false PASS for unexpected signing certificate')
    const missingTool=join(root,'missing-tool.json')
    assert.notEqual(invoke(cert,hashFile,missingTool,join(root,'not-installed-apksigner')).status,0)
    assert.ok(!existsSync(missingTool),'Missing SDK must not create a receipt')
    writeFileSync(hashFile,'0'.repeat(64)+'  '+filename+'\n')
    const badChecksum=join(root,'bad-checksum.json')
    assert.notEqual(invoke(cert,hashFile,badChecksum).status,0)
    assert.ok(!existsSync(badChecksum),'Incorrect APK bytes cannot produce a receipt')
  }finally{rmSync(root,{recursive:true,force:true})}
})
