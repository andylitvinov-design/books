import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const read = (file) => readFileSync(file, 'utf8')

test('ships a single-content Capacitor shell with provisional PsiAlchemy identifiers', () => {
  const config = JSON.parse(read('capacitor.config.json'))
  assert.equal(config.appId, 'app.psialchemy.mobile')
  assert.equal(config.appName, 'PsiAlchemy')
  assert.equal(config.webDir, 'native-web')
  assert.equal(config.server.url, 'https://codex-public-book-library.vercel.app')
  assert.equal(existsSync('ios/App/App.xcodeproj/project.pbxproj'), true)
  assert.equal(existsSync('android/gradlew'), true)
  assert.equal(existsSync('native-web/index.html'), true)
})

test('declares public link handling, safe native navigation, and no automatic verification', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml')
  const activity = read('android/app/src/main/java/app/psialchemy/mobile/MainActivity.java')
  const info = read('ios/App/App/Info.plist')
  const entitlements = read('ios/App/App/App.entitlements')
  const xcodeProject = read('ios/App/App.xcodeproj/project.pbxproj')
  assert.match(manifest, /android:scheme="psialchemy"/)
  assert.match(manifest, /android:autoVerify="false"/)
  assert.match(manifest, /homeopathy\/remedies/)
  assert.match(activity, /onBackPressed/)
  assert.match(info, /psialchemy/)
  assert.match(entitlements, /applinks:codex-public-book-library\.vercel\.app/)
  assert.match(xcodeProject, /CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements/)
  assert.match(read('app/globals.css'), /safe-area-inset-top/)
  assert.match(read('app/globals.css'), /safe-area-inset-bottom/)
})

test('keeps association documents empty and native CI explicitly unsigned', () => {
  assert.deepEqual(JSON.parse(read('public/.well-known/assetlinks.json')), [])
  assert.deepEqual(JSON.parse(read('public/.well-known/apple-app-site-association')), { applinks: { apps: [], details: [] } })
  const workflow = read('.github/workflows/native-ci.yml')
  assert.match(workflow, /runs-on: macos-14/)
  assert.match(workflow, /CODE_SIGNING_ALLOWED=NO/)
  assert.match(workflow, /assembleDebug/)
  assert.match(workflow, /actions\/upload-artifact@v4/)
  assert.match(read('components/native-external-links.tsx'), /private-blocked/)
})
