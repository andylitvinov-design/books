import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getNativePublicDownloads,resolveNativePublicDownloads} from '../lib/native/public-downloads.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const current=()=>JSON.parse(read('data/native-public-releases.json'))
const qa='https://github.com/andylitvinov-design/books/issues/1310#issuecomment-6474532824'
const valid=()=>{
  const x=current()
  x.android={
    status:'released',version:'1.0.0',versionCode:3,
    downloadUrl:'https://github.com/andylitvinov-design/books/releases/download/hh-android-v1.0.0/Holistic-House-Android-v1.0.0.apk',
    sha256:'a'.repeat(64),signingCertificateSha256:'b'.repeat(64),
    qaEvidenceUrl:qa,ownerApproved:true
  }
  x.ios={
    status:'released',version:'1.0.0',
    appStoreUrl:'https://apps.apple.com/ca/app/holistic-house/id1234567890',
    qaEvidenceUrl:qa,ownerApproved:true
  }
  return x
}

test('actual public registry is fail closed; unsigned test installers never become downloads',()=>{
  const manifest=current()
  assert.equal(manifest.appId,'com.holistichouse.app')
  assert.equal(manifest.schemaVersion,1)
  assert.deepEqual(resolveNativePublicDownloads(manifest,true),{androidUrl:null,iosUrl:null})
  assert.deepEqual(resolveNativePublicDownloads(manifest,false),{androidUrl:null,iosUrl:null})
  const android=JSON.stringify(manifest.android)
  const ios=JSON.stringify(manifest.ios)
  assert.doesNotMatch(android+ios,/(?:https?:\/\/|\.apk|\.ipa|testflight)/i)
  assert.equal(getNativePublicDownloads(manifest).androidUrl,null)
})

test('production switch and platform-specific signed release metadata both required',()=>{
  const x=valid()
  assert.deepEqual(resolveNativePublicDownloads(x,false),{androidUrl:null,iosUrl:null})
  assert.deepEqual(resolveNativePublicDownloads({...x,appId:'app.psialchemy.mobile'},true),{androidUrl:null,iosUrl:null})
  assert.deepEqual(resolveNativePublicDownloads({...x,schemaVersion:9},true),{androidUrl:null,iosUrl:null})
  assert.equal(resolveNativePublicDownloads(x,true).androidUrl,x.android.downloadUrl)
  assert.equal(resolveNativePublicDownloads(x,true).iosUrl,x.ios.appStoreUrl)
  const prior=process.env.HH_NATIVE_PUBLIC_RELEASES_ENABLED
  try{
    delete process.env.HH_NATIVE_PUBLIC_RELEASES_ENABLED
    assert.equal(getNativePublicDownloads(x).androidUrl,null)
    process.env.HH_NATIVE_PUBLIC_RELEASES_ENABLED='true'
    assert.equal(getNativePublicDownloads(x).androidUrl,x.android.downloadUrl)
  }finally{
    if(prior===undefined)delete process.env.HH_NATIVE_PUBLIC_RELEASES_ENABLED
    else process.env.HH_NATIVE_PUBLIC_RELEASES_ENABLED=prior
  }
})

test('never expose Android debug APKs, opaque redirects, invalid signatures or missing physical QA',()=>{
  const x=valid()
  const bad=[
    ['status','not_released'],['ownerApproved',false],
    ['version','1.0.1'],['versionCode',0],
    ['downloadUrl','https://github.com/andylitvinov-design/books/actions/runs/40627812200/artifacts/12790078340'],
    ['downloadUrl','https://evil.example/holistic.apk'],
    ['downloadUrl','https://github.com/andylitvinov-design/books/releases/download/hh-android-v1.0.0/app-debug.apk'],
    ['downloadUrl','https://github.com/andylitvinov-design/books/releases/download/hh-android-v1.0.0/Holistic-House-Android-v1.0.0.apk?token=1'],
    ['downloadUrl','https://github.com@evil.example/andylitvinov-design/books/releases/download/hh-android-v1.0.0/Holistic-House-Android-v1.0.0.apk'],
    ['sha256','not-a-sha'],['signingCertificateSha256',null],
    ['qaEvidenceUrl','https://evil.example/fake-acceptance'],
  ]
  for(const [key,value] of bad){
    const candidate=structuredClone(x)
    candidate.android[key]=value
    assert.equal(resolveNativePublicDownloads(candidate,true).androidUrl,null,key+' must fail closed')
    assert.equal(resolveNativePublicDownloads(candidate,true).iosUrl,x.ios.appStoreUrl)
  }
})

test('iOS links only direct to verified Apple App Store; unsigned IPA and TestFlight are not public',()=>{
  const x=valid()
  const bad=[
    ['status','not_released'],['ownerApproved',false],
    ['version','1.2 beta'],
    ['appStoreUrl','https://testflight.apple.com/join/ABCD1234'],
    ['appStoreUrl','https://github.com/andylitvinov-design/books/releases/download/ios/Holistic-House-Unsigned-iPhone.ipa'],
    ['appStoreUrl','https://apps.apple.com/ca/app/holistic-house/id1234567890?mt=8'],
    ['appStoreUrl','http://apps.apple.com/ca/app/id1234567890'],
    ['appStoreUrl','https://apps.apple.com.evil.example/ca/app/id1234567890'],
    ['qaEvidenceUrl',null]
  ]
  for(const [key,value] of bad){
    const candidate=structuredClone(x)
    candidate.ios[key]=value
    assert.equal(resolveNativePublicDownloads(candidate,true).iosUrl,null,key+' must fail closed')
  }
})

test('public install page prioritizes the working PWA, while unreleased native installers fail closed',()=>{
  const page=read('app/[locale]/install/page.jsx')
  const css=read('app/[locale]/install/install.module.css')
  const banner=read('components/free-mobile-app-banner.tsx')
  assert.match(page,/getNativePublicDownloads\(nativeReleases\)/)
  assert.ok(page.indexOf('data-hh-pwa-alternative')<page.indexOf('data-hh-native-downloads'))
  for(const label of ['Настоящее приложение для iPhone и Android','Real iPhone and Android applications','Aplicaciones reales para iPhone y Android']){
    assert.ok(page.includes(label),label)
  }
  assert.match(page,/data-hh-native-android-pending/)
  assert.match(page,/data-hh-native-ios-pending/)
  assert.match(page,/downloads\.androidUrl/)
  assert.match(page,/downloads\.iosUrl/)
  assert.match(page,/href="\/api\/native-download\/android"/)
  assert.match(page,/href="\/api\/native-download\/ios"/)
  assert.match(page,/InstallHolisticHouse locale=\{locale\} showGuideLink=\{false\} landing\/>/)
  assert.match(css,/@media\(max-width:350px\)/)
  assert.match(css,/:focus-visible/)
  assert.match(banner,/Signed native releases will appear after verification/)
  assert.doesNotMatch(page,/href=["'][^"']*\.ipa|href=["'][^"']*app-debug\.apk/)
})

test('same-site endpoints fail closed without approval; never proxy binary bytes or credentials',()=>{
  for(const platform of ['android','ios']){
    const src=read('app/api/native-download/'+platform+'/route.js')
    assert.match(src,/getNativePublicDownloads\(manifest\)/)
    assert.match(src,/status:404/)
    assert.match(src,/Cache-Control':'no-store'/)
    assert.match(src,/status:302/)
    assert.match(src,/NextResponse.redirect\(target/)
    assert.doesNotMatch(src,/fetch\(|readFileSync|storage\.from|cookies\(|api\.github\.com/)
  }
})
