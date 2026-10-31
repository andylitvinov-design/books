
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
const workflow=readFileSync('.github/workflows/site-video-browser.yml','utf8')
const source=readFileSync('scripts/verify-site-video-admin-browser.mjs','utf8')
const publicSource=readFileSync('scripts/verify-site-video-browser.mjs','utf8')
test('owner browser E2E uses real protected v2 session bridge and isolated provider, never legacy static credentials',()=>{
  assert.match(workflow,/admin-verified-owner-browser:/)
  assert.match(workflow,/postgres:17-alpine/)
  assert.match(workflow,/redis:7-alpine/)
  assert.match(workflow,/HH_APP_TEST_RUNTIME: isolated/)
  assert.match(workflow,/HH_APP_PRODUCTION_APPROVED: 'false'/)
  assert.match(workflow,/if: github.event_name == 'pull_request' && github.event.pull_request.draft == false/)
  assert.match(source,/\/api\/app\/practitioner\/open/)
  assert.match(source,/\/admin\/videos/)
  assert.match(source,/\^v2/)
  assert.match(source,/context.request.post/)
  assert.match(source,/createServerClient/)
  assert.match(source,/alg:'HS256'/)
  assert.match(source,/Next dev server did not start/)
  assert.match(source,/owner bridge must mint/i)
  assert.doesNotMatch(source,/prescriptions-admin-v1/)
  assert.doesNotMatch(publicSource,/prescriptions-admin-v1/)
  assert.match(source,/adminContext.newPage/)
  assert.match(source,/const videoLanguage = target.locator/)
  assert.match(source,/await ru.click\(\)/)
  assert.match(source,/await en.click\(\)/)
  assert.match(source,/await save\('publish'\)/)
  assert.match(source,/pageErrors\.push\('public: '/)
  assert.match(source,/pageErrors\.push\('owner editor: '/)
  assert.match(source,/assert\.deepEqual\(pageErrors,\[\],/)
  assert.match(source,/await save\('hide'/)
  assert.match(source,/await save\('draft'\)/)
  assert.match(source,/Concurrent edit rejected/)
  assert.match(source,/Spanish About/)
  assert.match(publicSource,/Guest cannot access video editor/)
  assert.match(publicSource,/Nine video service routes/)
})

test('video editor reconciles locale after independently hydrated header and manager',()=>{
  const s=readFileSync('components/site-video-manager.tsx','utf8')
  const h=readFileSync('components/prescription-admin-header.jsx','utf8')
  assert.match(s,/setUiLocale\(readUiLocale\(document\.cookie\) === "ru" \? "ru" : "en"\)/)
  assert.match(s,/window\.addEventListener\("holistic-house-ui-locale", onLocale\)/)
  assert.match(h,/saveUiLocale\(nextLocale\)/)
  assert.match(source,/await expect\(target\.locator\('\.site-video-manager'\)\)\.toHaveAttribute\('lang', 'ru'\)/)
  assert.match(source,/await expect\(target\.locator\('\.site-video-manager'\)\)\.toHaveAttribute\('lang', 'en'\)/)
})



test('same-document anchor navigation reloads published snapshot without popstate recursion',()=>{
  for (const script of [source, publicSource]) {
    assert.match(script,/const sameDocument\s*=/);
    assert.match(script,/previous\.origin\s*===\s*destination\.origin/);
    assert.match(script,/previous\.pathname\s*===\s*destination\.pathname/);
    assert.match(script,/previous\.search\s*===\s*destination\.search/);
    assert.match(script,/sameDocument\s*\?\s*await page\.reload\(options\)\s*:\s*await page\.goto\(destination\.href,\s*options\)/);
    assert.match(script,/await expect\(page\.locator\('main'\)\.first\(\)\)\.toBeVisible\(\)/);
  }
  assert.match(source,/assert\.deepEqual\(pageErrors,\[\],/);
  assert.doesNotMatch(source,/^[ \t]*pageErrors\s*=\s*\[\]/m); // no post-initialization reset.
});

test('owner Reel local preview is checked by real authenticated browser and narrowly scoped media CSP',()=>{
  const middleware=readFileSync('middleware.ts','utf8')
  assert.match(middleware,/const videoManager = pathname === '\/admin\/videos'/)
  assert.match(middleware,/\(\(videoManager\|\|ownerRecorderPage\|\|deliveryOrigin/)
  assert.match(source,/editorResponse = await target\.goto/)
  assert.match(source,/const editorMediaSource = editorPolicy/)
  assert.match(source,/media-src 'self' blob:/)
  assert.match(source,/publicMediaSource, "media-src 'self'"/)
  assert.match(source,/nativeFileInput\.setInputFiles/)
  assert.match(source,/film-collection-v3\/lake-mist-dawn\.mp4/)
  assert.match(source,/element\.videoWidth > 0/)
  assert.match(source,/await nativeFileInput\.setInputFiles\(\[\]\)/)
})
