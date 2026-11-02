#!/usr/bin/env node
// Secret-free preflight for the ONE existing protected Android release workflow.
// No network, signing-key access, release creation or publication.
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

const SHA256=/^[a-f0-9]{64}$/
const VERSION=/^[0-9]+(?:\.[0-9]+){1,2}(?:[-+][A-Za-z0-9.-]+)?$/
const invalid=key=>{throw new Error('HH_DIRECT_APK_'+key)}

export function verifyDirectApkCandidate(registry,{versionCode,versionName,certificateSha256}){
  if(!registry||registry.schemaVersion!==1||registry.appId!=='com.holistichouse.app')
    invalid('REGISTRY_IDENTITY')
  if(!/^[1-9][0-9]*$/.test(String(versionCode??''))||
    !Number.isSafeInteger(Number(versionCode))||Number(versionCode)<2||Number(versionCode)>=2100000000)
    invalid('VERSION_CODE')
  if(typeof versionName!=='string'||!VERSION.test(versionName)||versionName.length>40)
    invalid('VERSION_NAME')
  const cert=typeof certificateSha256==='string'?certificateSha256.toLowerCase():''
  if(!SHA256.test(cert))invalid('EXPECTED_CERTIFICATE')
  const last=registry.android
  if(!last||!['not_released','released'].includes(last.status))
    invalid('RELEASE_REGISTRY_STATE')
  if(last.status==='released'){
    if(!Number.isSafeInteger(last.versionCode)||last.versionCode<1)
      invalid('PRIOR_VERSION')
    if(Number(versionCode)<=last.versionCode)invalid('VERSION_DOWNGRADE')
    const oldCert=typeof last.signingCertificateSha256==='string'
      ?last.signingCertificateSha256.toLowerCase():''
    if(!SHA256.test(oldCert)||oldCert!==cert)invalid('CERTIFICATE_ROTATION')
  }
  return {appId:registry.appId,versionCode:Number(versionCode),versionName,
    priorVersionCode:last.status==='released'?last.versionCode:null}
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{
    const registry=JSON.parse(readFileSync(new URL('../data/native-public-releases.json',import.meta.url),'utf8'))
    const result=verifyDirectApkCandidate(registry,{
      versionCode:process.env.HH_PLAY_VERSION_CODE,
      versionName:process.env.HH_PLAY_VERSION_NAME,
      certificateSha256:process.env.HH_EXPECTED_WEBSITE_CERT_SHA256
    })
    console.log('Direct APK preflight PASS',result.appId,'versionCode='+result.versionCode,
      'priorVersionCode='+String(result.priorVersionCode),'(private artifact; not released)')
  }catch(e){
    console.error(String(e?.message||e))
    process.exitCode=1
  }
}
