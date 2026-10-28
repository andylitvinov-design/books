import test from 'node:test'
import assert from 'node:assert/strict'
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
    { HH_PLAY_VERSION_NAME: '1\\.0' }
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

test('Play candidate workflow is manual, guarded, private, API 36 and never publishes', () => {
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
  assert.match(nativeCI,/bundleRelease assembleRelease/)
  assert.match(nativeCI,/apksigner/)
  assert.match(nativeCI,/disposable signature, NO store upload or artifact/)
  assert.match(release, /bundleRelease/)
  assert.match(release, /bundleRelease assembleRelease/)
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
