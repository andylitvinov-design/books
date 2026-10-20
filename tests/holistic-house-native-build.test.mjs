import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,copyFileSync,mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {spawnSync} from 'node:child_process'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const stage=new URL('../scripts/prepare-holistic-house-native.mjs',import.meta.url)
const files=[
  'capacitor.config.json','capacitor.holistic-house.config.json','native-web/index.html',
  'ios/App/Podfile','ios/App/App/Info.plist','ios/App/App/App.entitlements',
  'ios/App/App.xcodeproj/project.pbxproj','android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml','android/app/src/main/res/values/strings.xml'
]
function fixture(run){
  const root=mkdtempSync(join(tmpdir(),'hh-native-brand-'))
  try{
    for(const file of files){
      const target=join(root,file)
      mkdirSync(dirname(target),{recursive:true})
      writeFileSync(target,source(file))
    }
    const invoke=arg=>{
      const child=spawnSync(process.execPath,[stage.pathname,arg],{cwd:root,encoding:'utf8',timeout:10000})
      assert.equal(child.status,0,arg+' '+child.stderr)
    }
    run({root,invoke,read:file=>readFileSync(join(root,file),'utf8')})
  }finally{rmSync(root,{recursive:true,force:true})}
}
test('Holistic House has an independent canonical-domain native identity; PsiAlchemy source remains unchanged',()=>{
  const sourceConfig=JSON.parse(source('capacitor.config.json'))
  const hh=JSON.parse(source('capacitor.holistic-house.config.json'))
  assert.equal(sourceConfig.appId,'app.psialchemy.mobile')
  assert.equal(sourceConfig.appName,'PsiAlchemy')
  assert.equal(hh.appId,'com.holistichouse.app')
  assert.equal(hh.appName,'Holistic House')
  assert.equal(hh.server.url,'https://holistichouse.vercel.app/en/app/portrait')
  assert.deepEqual(hh.server.allowNavigation,['holistichouse.vercel.app'])
  assert.equal(hh.server.cleartext,false)
})
test('staged Android identity, launch label and private conversation links survive real script execution',()=>{
  fixture(f=>{
    f.invoke('before-sync')
    const config=f.read('capacitor.config.json')
    mkdirSync(join(f.root,'android/app/src/main/assets'),{recursive:true})
    writeFileSync(join(f.root,'android/app/src/main/assets/capacitor.config.json'),config)
    f.invoke('after-android-sync')
    assert.match(f.read('android/app/build.gradle'),/applicationId "com.holistichouse.app"/)
    assert.match(f.read('android/app/src/main/res/values/strings.xml'),/Holistic House/)
    const manifest=f.read('android/app/src/main/AndroidManifest.xml')
    assert.match(manifest,/android:scheme="holistichouse"/)
    assert.match(manifest,/android:host="holistichouse.vercel.app"/)
    assert.doesNotMatch(manifest,/android:scheme="psialchemy"/)
    assert.match(manifest,/android:autoVerify="false"/)
  })
})
test('staged iOS app does not reuse PsiAlchemy bundle ID or stale developer CocoaPods cache',()=>{
  fixture(f=>{
    f.invoke('before-sync')
    assert.match(f.read('ios/App/Podfile'),/\.\.\/\.\.\/node_modules\/@capacitor\/ios/)
    assert.doesNotMatch(f.read('ios/App/Podfile'),/\.npm\/_npx\//)
    mkdirSync(join(f.root,'ios/App/App'),{recursive:true})
    writeFileSync(join(f.root,'ios/App/App/capacitor.config.json'),f.read('capacitor.config.json'))
    f.invoke('after-ios-sync')
    assert.match(f.read('ios/App/App/Info.plist'),/<string>Holistic House<\/string>/)
    assert.match(f.read('ios/App/App/Info.plist'),/<string>holistichouse<\/string>/)
    assert.match(f.read('ios/App/App.xcodeproj/project.pbxproj'),/PRODUCT_BUNDLE_IDENTIFIER = com\.holistichouse\.app;/)
    assert.match(f.read('ios/App/App/App.entitlements'),/applinks:holistichouse\.vercel\.app/)
  })
})
test('no native build claims signing, TestFlight, store release or verified association',()=>{
  const flow=source('.github/workflows/holistic-house-native.yml')
  assert.match(flow,/assembleDebug/)
  assert.match(flow,/CODE_SIGNING_ALLOWED=NO build/)
  assert.match(flow,/Holistic-House-Android-Test-APK/)
  assert.match(flow,/Holistic-House-iOS-Simulator-Only/)
  assert.match(flow,/com\.holistichouse\.app/)
  assert.match(flow,/if: always\(\)/)
  assert.doesNotMatch(flow,/continue-on-error:\s*true|signingCertificate|upload-to-testflight/)
})
test('private deep links are always validated and filtered before native routing',async()=>{
  const {classifyNativeLink,classifyHolisticHouseNativeLink}=await import('../lib/native/deep-link-policy.js')
  const id='12345678-1234-4234-8234-123456789abc'
  const desired='/ru/app/consultations?request='+id
  assert.deepEqual(classifyHolisticHouseNativeLink('holistichouse://app/consultations?lang=ru&request='+id),
    {kind:'hh-consultation',path:desired})
  assert.deepEqual(classifyHolisticHouseNativeLink('https://holistichouse.vercel.app'+desired),
    {kind:'hh-consultation',path:desired})
  for(const url of [
    'https://attacker.example'+desired,
    'https://holistichouse.vercel.app/ru/client/secret',
    'https://holistichouse.vercel.app'+desired+'&next=https://attacker.example',
    'holistichouse://app/consultations?request=../admin',
    'holistichouse://attacker/consultations?request='+id
  ])assert.notEqual(classifyHolisticHouseNativeLink(url).kind,'hh-consultation')
  assert.equal(classifyNativeLink('https://holistichouse.vercel.app/ru/client/secret').kind,'private-blocked')
})
