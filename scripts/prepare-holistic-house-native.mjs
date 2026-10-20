#!/usr/bin/env node
// Stages a Holistic House binary only inside the CI checkout.
// PsiAlchemy's committed source is never rebranded or overwritten.
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
const read=p=>readFileSync(p,'utf8'),write=(p,v)=>writeFileSync(p,v)
const fail=m=>{throw new Error('HH_NATIVE: '+m)}
const id='com.holistichouse.app',host='holistichouse.vercel.app'
function exact(s,a,b,n=1){
  if(s.split(a).length-1!==n)fail('Unexpected native template: '+a.slice(0,48))
  return s.replaceAll(a,b)
}
function check(){
  const c=JSON.parse(read('capacitor.config.json'))
  if(c.appId!==id||c.appName!=='Holistic House'||
      c.server?.url!=='https://'+host+'/en/app/portrait'||
      c.server?.cleartext!==false||
      JSON.stringify(c.server?.allowNavigation)!==JSON.stringify([host]))
    fail('Native identity/origin must match reviewed config')
}
export function beforeSync(){
  const base=JSON.parse(read('capacitor.config.json'))
  if(base.appId!=='app.psialchemy.mobile'||base.appName!=='PsiAlchemy')
    fail('Refusing to modify a non-PsiAlchemy source checkout')
  write('capacitor.config.json',read('capacitor.holistic-house.config.json'))
  check()
  // Historical PsiAlchemy Podfile contains an obsolete developer npx cache path.
  // Resolve all Capacitor Pods from this CI checkout's pinned node_modules.
  const pod='ios/App/Podfile'
  const previous=read(pod)
  const portable=previous.replace(/(?:\.\.\/){7}\.npm\/_npx\/[a-z0-9]+\/node_modules\/@capacitor\/ios/g,
    '../../node_modules/@capacitor/ios')
  if(portable===previous&&!previous.includes('../../node_modules/@capacitor/ios'))
    fail('Unexpected iOS CocoaPods reference')
  write(pod,portable)
  write('native-web/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Holistic House</title></head><body style="background:#163d38;color:white;font:16px system-ui;text-align:center;padding:30px"><h1>Holistic House</h1><p>Connect to the internet to open your secure cabinet.</p></body></html>')
}
function synced(platform){
  check()
  const file=platform==='android'?'android/app/src/main/assets/capacitor.config.json':'ios/App/App/capacitor.config.json'
  if(!existsSync(file))fail('Missing bundled config: '+file)
  const c=JSON.parse(read(file))
  if(c.appId!==id||c.server?.url!=='https://'+host+'/en/app/portrait')fail('Wrong bundled app origin')
}
export function afterAndroid(){
  synced('android')
  const gradle='android/app/build.gradle'
  write(gradle,exact(read(gradle),'applicationId "app.psialchemy.mobile"','applicationId "'+id+'"'))
  const strings='android/app/src/main/res/values/strings.xml'
  write(strings,read(strings).replaceAll('PsiAlchemy','Holistic House')
    .replaceAll('app.psialchemy.mobile',id).replaceAll('custom_url_scheme">psialchemy','custom_url_scheme">holistichouse'))
  const manifest='android/app/src/main/AndroidManifest.xml'
  let s=read(manifest).replace(/<intent-filter\b[^>]*>[\s\S]*?<\/intent-filter>/g,block=>
    /android:scheme="psialchemy"|android:host="codex-public-book-library\.vercel\.app"/.test(block)?'':block)
  const filters=[
    '<intent-filter><action android:name="android.intent.action.VIEW" />',
    '<category android:name="android.intent.category.DEFAULT" />',
    '<category android:name="android.intent.category.BROWSABLE" />',
    '<data android:scheme="holistichouse" android:host="app" android:pathPrefix="/consultations" /></intent-filter>',
    '<intent-filter><action android:name="android.intent.action.VIEW" />',
    '<category android:name="android.intent.category.DEFAULT" />',
    '<category android:name="android.intent.category.BROWSABLE" />',
    '<data android:scheme="holistichouse" android:host="auth" android:path="/callback" /></intent-filter>',
    '<intent-filter android:autoVerify="false"><action android:name="android.intent.action.VIEW" />',
    '<category android:name="android.intent.category.DEFAULT" />',
    '<category android:name="android.intent.category.BROWSABLE" />',
    '<data android:scheme="https" android:host="'+host+'" android:pathPrefix="/en/app/consultations" />',
    '<data android:scheme="https" android:host="'+host+'" android:pathPrefix="/ru/app/consultations" /></intent-filter>'
  ].join('\n')
  write(manifest,exact(s,'</activity>',filters+'\n</activity>'))
}
export function afterIos(){
  synced('ios')
  const plist='ios/App/App/Info.plist'
  let info=read(plist)
  info=exact(info,'<string>PsiAlchemy</string>','<string>Holistic House</string>')
  info=exact(info,'<string>psialchemy</string>','<string>holistichouse</string>')
  info=exact(info,'<string>app.psialchemy.mobile</string>','<string>'+id+'</string>')
  write(plist,info)
  const project='ios/App/App.xcodeproj/project.pbxproj'
  let pbx=read(project)
  pbx=exact(pbx,'PRODUCT_BUNDLE_IDENTIFIER = app.psialchemy.mobile.HHCourseWidget;',
    'PRODUCT_BUNDLE_IDENTIFIER = '+id+'.HHCourseWidget;',2)
  pbx=exact(pbx,'PRODUCT_BUNDLE_IDENTIFIER = app.psialchemy.mobile;',
    'PRODUCT_BUNDLE_IDENTIFIER = '+id+';',2)
  write(project,pbx)
  const ent='ios/App/App/App.entitlements'
  let entitlement=exact(read(ent),'applinks:codex-public-book-library.vercel.app','applinks:'+host)
  entitlement=exact(entitlement,'</dict>',
    '<key>aps-environment</key>\n<string>development</string>\n</dict>')
  write(ent,entitlement)
  // Register APNs callbacks with the officially pinned Capacitor push plugin.
  // Only the temporary Holistic House build receives these methods.
  const delegate='ios/App/App/AppDelegate.swift'
  const registration=[
    '    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {',
    '        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)',
    '    }',
    '    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {',
    '        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)',
    '    }',
    ''
  ].join('\n')
  const swift=read(delegate)
  if(!swift.includes('import Capacitor')||swift.includes('capacitorDidRegisterForRemoteNotifications'))
    fail('Unexpected AppDelegate push registration state')
  write(delegate,swift.replace(/\n}\\s*$/, '\n'+registration+'}\n'))
}
export function run(stage){
  if(stage==='before-sync')return beforeSync()
  if(stage==='after-android-sync')return afterAndroid()
  if(stage==='after-ios-sync')return afterIos()
  fail('Expected before-sync, after-android-sync or after-ios-sync')
}
if(process.argv[1]?.endsWith('/prepare-holistic-house-native.mjs')){
  try{run(process.argv[2]);console.log('Holistic House prepared:',process.argv[2])}
  catch(error){console.error(error.message);process.exitCode=1}
}
