#!/usr/bin/env node
// Build a signed Google Play AAB ONLY in a trusted, ephemeral Holistic House CI checkout.
// The committed PsiAlchemy Android project and signing identities must not be changed.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const read = path => readFileSync(path, 'utf8')
const write = (path, contents) => writeFileSync(path, contents)
const fail = message => { throw new Error('HH_PLAY_RELEASE: ' + message) }

function replaceOne(value, before, after, file) {
  if (value.split(before).length !== 2) fail('Unexpected ' + file + ' template; review changed Android build configuration')
  return value.replace(before, after)
}

const signingScript = `// Generated only in trusted, ephemeral CI. Never commit this file or credentials.
def hhUploadFile = System.getenv('HH_ANDROID_KEYSTORE_PATH')
def hhUploadStorePassword = System.getenv('HH_ANDROID_KEYSTORE_PASSWORD')
def hhUploadKeyAlias = System.getenv('HH_ANDROID_KEY_ALIAS')
def hhUploadKeyPassword = System.getenv('HH_ANDROID_KEY_PASSWORD')
if (!hhUploadFile || !file(hhUploadFile).isFile() ||
    !hhUploadStorePassword || !hhUploadKeyAlias || !hhUploadKeyPassword) {
    throw new GradleException('Holistic House Play upload key is not configured')
}
android {
    signingConfigs {
        hhPlayUpload {
            storeFile file(hhUploadFile)
            storePassword hhUploadStorePassword
            keyAlias hhUploadKeyAlias
            keyPassword hhUploadKeyPassword
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.hhPlayUpload
        }
    }
}
`

export function stagePlayRelease(env = process.env) {
  const codeText = env.HH_PLAY_VERSION_CODE ?? ''
  const version = env.HH_PLAY_VERSION_NAME ?? ''
  if (!/^[1-9][0-9]*$/.test(codeText) || Number(codeText) < 2 ||
      Number(codeText) >= 2100000000 || !Number.isSafeInteger(Number(codeText)))
    fail('versionCode must be an integer >= 2 and < 2100000000; check against prior Play release')
  if (!/^[0-9]+(?:\.[0-9]+){1,2}(?:[-+][A-Za-z0-9.-]+)?$/.test(version) ||
      version.length > 40)
    fail('versionName must be a short semantic version without shell/Gradle metacharacters')

  const required = ['HH_ANDROID_KEYSTORE_PATH', 'HH_ANDROID_KEYSTORE_PASSWORD',
    'HH_ANDROID_KEY_ALIAS', 'HH_ANDROID_KEY_PASSWORD']
  for (const key of required) if (!env[key]) fail('Missing protected environment setting: ' + key)
  if (!existsSync(env.HH_ANDROID_KEYSTORE_PATH)) fail('Upload keystore file does not exist')

  const config = JSON.parse(read('capacitor.config.json'))
  const bundled = JSON.parse(read('android/app/src/main/assets/capacitor.config.json'))
  for (const c of [config, bundled]) {
    if (c.appId !== 'com.holistichouse.app' ||
        c.appName !== 'Holistic House' ||
        c.server?.url !== 'https://holistichouse.vercel.app/en/app/messages' ||
        c.server?.cleartext !== false ||
        JSON.stringify(c.server?.allowNavigation) !== '["holistichouse.vercel.app"]')
      fail('Refusing to sign non-Holistic-House or non-canonical origin')
  }

  const rootGradle = replaceOne(read('android/build.gradle'),
    "classpath 'com.android.tools.build:gradle:8.7.2'",
    "classpath 'com.android.tools.build:gradle:8.9.1'", 'android/build.gradle')
  let variables = read('android/variables.gradle')
  variables = replaceOne(variables, 'compileSdkVersion = 35', 'compileSdkVersion = 36', 'android/variables.gradle')
  variables = replaceOne(variables, 'targetSdkVersion = 35', 'targetSdkVersion = 36', 'android/variables.gradle')
  let appGradle = read('android/app/build.gradle')
  if (!appGradle.includes('applicationId "com.holistichouse.app"') ||
      appGradle.includes("apply from: 'hh-play-signing.gradle'"))
    fail('After-sync HH app ID or signing stage is missing/duplicated')
  appGradle = replaceOne(appGradle, 'versionCode 1', 'versionCode ' + codeText, 'android/app/build.gradle')
  appGradle = replaceOne(appGradle, 'versionName "1.0"', 'versionName "' + version + '"', 'android/app/build.gradle')
  appGradle += "\napply from: 'hh-play-signing.gradle'\n"

  // All validation is complete before modifying any Gradle file.
  write('android/build.gradle', rootGradle)
  write('android/variables.gradle', variables)
  write('android/app/build.gradle', appGradle)
  write('android/app/hh-play-signing.gradle', signingScript)
  return { appId: config.appId, versionCode: Number(codeText), versionName: version, targetSdk: 36 }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = stagePlayRelease()
    console.log('Holistic House Android Play AAB staged:', result.appId,
      'versionCode=' + result.versionCode, 'versionName=' + result.versionName,
      'targetSdk=' + result.targetSdk, '(NO store upload)')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
