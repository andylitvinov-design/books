#!/usr/bin/env node
// Owner-side, offline, read-only verification of a decrypted release-signed APK.
// Never uploads an APK, accepts health data, distributes an artifact, or
// substitutes for physical-device/OAuth/private-message acceptance.
import { createHash } from 'node:crypto'
import { createReadStream, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SHA = /^[a-f0-9]{64}$/i
const VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/
const PACKAGE = 'com.holistichouse.app'
function reject(reason) { throw new Error('HH_APK_QA_' + reason) }

export function verifyApkEvidence({ filename, sha256, checksumText, certificateSha256,
  version, versionCode, signerOutput, badgingOutput }) {
  if (typeof version !== 'string' || !VERSION.test(version))
    reject('VERSION_FORMAT')
  const versionNumber = Number(versionCode)
  if (!/^[1-9]\d*$/.test(String(versionCode)) ||
      !Number.isSafeInteger(versionNumber) || versionNumber < 2)
    reject('VERSION_CODE')
  const expectedName = 'Holistic-House-Android-v' + version + '.apk'
  if (filename !== expectedName) reject('FILENAME')
  if (!SHA.test(sha256 || '') || !SHA.test(certificateSha256 || ''))
    reject('EXPECTED_EVIDENCE')
  const checksumRows = String(checksumText || '').trim().split(/\r?\n/).filter(Boolean)
  if (checksumRows.length !== 1) reject('CHECKSUM_RECORD_COUNT')
  const checksum = checksumRows[0].match(/^([a-f0-9]{64})  ([^\r\n]+)$/)
  if (!checksum || checksum[2] !== expectedName ||
      checksum[1].toLowerCase() !== sha256.toLowerCase())
    reject('CHECKSUM_MISMATCH')

  const sig = String(signerOutput || '')
  if (!/^Verifies\s*$/m.test(sig) &&
      !/^Verified using v[23] scheme .*: true\s*$/m.test(sig))
    reject('SIGNATURE_VERIFICATION')
  const v2or3 = /^Verified using v[23] scheme .*: true\s*$/m.test(sig)
  if (!v2or3) reject('SIGNATURE_SCHEME')
  const allCerts = [...sig.matchAll(/^Signer #(\d+) certificate SHA-256 digest:\s*([0-9a-f]{64})\s*$/gmi)]
  if (allCerts.length !== 1 || allCerts[0][1] !== '1' ||
      allCerts[0][2].toLowerCase() !== certificateSha256.toLowerCase())
    reject('CERTIFICATE_MISMATCH')

  const badge = String(badgingOutput || '')
  const packageLine = badge.match(/^package:\s+name='([^']+)'\s+versionCode='([^']+)'\s+versionName='([^']+)'/m)
  if (!packageLine || packageLine[1] !== PACKAGE ||
      packageLine[2] !== String(versionCode) || packageLine[3] !== version)
    reject('PACKAGE_ID_VERSION')
  if (!/^application-label:'Holistic House'\s*$/m.test(badge))
    reject('APP_LABEL')
  if (/^application-debuggable\s*$/m.test(badge))
    reject('DEBUG_BUILD')
  const target = badge.match(/^targetSdkVersion:'(\d+)'\s*$/m)
  if (!target || Number(target[1]) < 36)
    reject('ANDROID_TARGET')

  return {
    schema: 'HH_APK_STATIC_QA_V1',
    packageId: PACKAGE, version, versionCode: versionNumber,
    targetSdk: Number(target[1]),
    sha256: sha256.toLowerCase(),
    signingCertificateSha256: certificateSha256.toLowerCase(),
    signature: 'VERIFIED_V2_OR_V3',
    staticPackageChecks: 'PASS',
    physicalDeviceE2E: 'NOT_CHECKED',
    ownerApprovedForPublication: false
  }
}

function parseArgs(raw) {
  const allowed = new Set(['--apk','--sha-file','--expected-cert',
    '--version','--version-code','--apksigner','--aapt','--out'])
  const opts = {}
  if (raw.length % 2) reject('ARGUMENTS')
  for (let i = 0; i < raw.length; i += 2) {
    if (!allowed.has(raw[i]) || Object.hasOwn(opts,raw[i]) ||
        !raw[i+1] || raw[i+1].startsWith('--'))
      reject('ARGUMENTS')
    opts[raw[i]] = raw[i+1]
  }
  for (const required of ['--apk','--sha-file','--expected-cert','--version','--version-code']) {
    if (!opts[required]) reject('MISSING_' + required.slice(2).toUpperCase().replaceAll('-','_'))
  }
  return opts
}

function executable(name,override) {
  if (override) return override
  const root = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  return root ? join(root,'build-tools','36.0.0',name) : name
}
function command(exe,args) {
  const run = spawnSync(exe,args,{shell:false,encoding:'utf8',timeout:30000,maxBuffer:262144})
  if (run.error || run.status !== 0 || !run.stdout) reject('ANDROID_BUILD_TOOLS')
  return run.stdout
}
async function sha256File(path) {
  const info = statSync(path)
  if (!info.isFile() || info.size < 1 || info.size > 250 * 1024 * 1024) reject('APK_SIZE')
  const hash = createHash('sha256')
  for await(const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}
export async function inspectApkOnDeviceHost(options) {
  const apk = options['--apk']
  const sha256 = await sha256File(apk)
  const output = verifyApkEvidence({
    filename: basename(apk), sha256,
    checksumText: readFileSync(options['--sha-file'],'utf8'),
    certificateSha256: options['--expected-cert'],
    version: options['--version'], versionCode: options['--version-code'],
    signerOutput:command(executable('apksigner',options['--apksigner']),
      ['verify','--verbose','--print-certs',apk]),
    badgingOutput:command(executable('aapt',options['--aapt']),
      ['dump','badging',apk])
  })
  if (options['--out']) writeFileSync(options['--out'],JSON.stringify(output,null,2)+'\n',
    {flag:'wx',mode:0o600})
  return output
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const opts=parseArgs(process.argv.slice(2))
    const receipt=await inspectApkOnDeviceHost(opts)
    console.log(JSON.stringify(receipt,null,2))
    console.log('STATIC APK VERIFIED; physical phone OAuth/Messages/update QA and owner approval still required.')
  } catch (error) {
    console.error(error?.message || String(error))
    process.exitCode=1
  }
}
