import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('scripts/verify-site-video-browser.mjs')
function loadContract(text = source) {
  const begin = text.indexOf('// BEGIN bounded public detail-video contract')
  const end = text.indexOf('// END bounded public detail-video contract.')
  assert.ok(begin >= 0 && end > begin, 'Keep the bounded pure contract separate from browser/server execution')
  const pure = text.slice(begin, end)
  assert.doesNotMatch(pure, /\b(?:fetch|process|require|import|writeFile|exec|spawn|page|browser)\s*[.(]/)
  return runInNewContext(pure + '\n({ detailVideoCases, detailVideoWatchUrl, classifyDetailVideoSource })', { URL }, { timeout: 1000 })
}
const contract = loadContract()
const rows = JSON.parse(JSON.stringify(contract.detailVideoCases))
// Independent reviewed oracle, not generated from the renderer or registry.
const expected = [
  ['alchemy-en', '/en/services/alchemy-of-soul', '[data-alchemy-panel="video"]', 'en', 'en', 'heygen', '7c6b243f048b9c0581ae29619a4a89fc'],
  ['hypnotherapy-en', '/en/services/hypnotherapy-course', '[data-service-video="hypnotherapy"]', 'en', 'en', 'heygen', '8c1634ce904434a91931429b6a7eefe1'],
  ['alchemy-ru', '/ru/services/alchemy-of-soul', '[data-alchemy-panel="video"]', 'ru', 'ru', 'youtube', 'Cz6SxXJNZbw'],
  ['hypnotherapy-ru', '/ru/services/hypnotherapy-course', '[data-service-video="hypnotherapy"]', 'ru', 'ru', 'youtube', 'eLsjFaKCBhI'],
  ['alchemy-legacy-en', '/en/services/psychohomeopathy', '[data-alchemy-panel="video"]', 'en', 'en', 'heygen', '7c6b243f048b9c0581ae29619a4a89fc'],
  ['alchemy-legacy-ru', '/ru/services/psychohomeopathy', '[data-alchemy-panel="video"]', 'ru', 'ru', 'youtube', 'Cz6SxXJNZbw'],
  ['imagery-es', '/es/services/imagery-therapy', '[data-service-video="hypnotherapy"]', 'es', 'en', 'heygen', '8c1634ce904434a91931429b6a7eefe1'],
  ['constellations-en', '/en/services/systemic-constellations', '[data-service-video="constellation-case"]', 'en', 'en', 'youtube', 'sfVFOQNr2qk'],
  ['free-review-en', '/en/services/free-situation-review', '[data-free-review-intro-video][data-intro-audio-language="en"]', 'en', 'en', 'youtube', 's30Y42IwPcg'],
]
const embed = row => row.provider === 'heygen'
  ? `https://app.heygen.com/embeds/${row.videoId}`
  : `https://www.youtube-nocookie.com/embed/${row.videoId}?autoplay=1&playsinline=1&rel=0&hl=${row.locale}&cc_lang_pref=${row.audioLanguage}`

test('nine public detail cases preserve explicit selectors, exact provider/video IDs and independent audio locale', () => {
  assert.deepEqual(rows.map(({alias, route, selector, locale, audioLanguage, provider, videoId}) =>
    [alias, route, selector, locale, audioLanguage, provider, videoId]), expected)
  assert.equal(new Set(rows.map(row => row.alias)).size, 9)
  for (const row of rows) {
    assert.match(row.alias, /^[a-z-]{1,30}$/)
    assert.equal(row.canonicalPath, row.route.replace('/psychohomeopathy', '/alchemy-of-soul'))
    assert.equal(contract.classifyDetailVideoSource(embed(row), row), 'match', row.alias)
    assert.equal(contract.detailVideoWatchUrl(row), row.provider === 'heygen'
      ? `https://app.heygen.com/share/${row.videoId}` : `https://www.youtube.com/watch?v=${row.videoId}`)
  }
})

test('source routing supports the three explicitly corrected browser expectations', () => {
  const registry = read('data/service-video-library.ts')
  const showcase = read('components/service-video-showcase.tsx')
  const core = read('components/core-service-detail.tsx')
  const personal = read('components/personal-service-landing.tsx')
  const free = read('components/free-entry-landing.tsx')
  assert.match(registry, /const hypnotherapyRu: ServiceVideoMedia = \{\s*video: \{ youtubeId: "eLsjFaKCBhI", language: "ru"/)
  assert.match(registry, /ru: \{[^}]*hypnotherapy: hypnotherapyRu,/)
  assert.match(core, /<ServiceVideoShowcase topic=\{kind === "dao" \? "overview" : kind\} locale=\{locale\}/)
  assert.match(read('app/[locale]/services/hypnotherapy-course/page.tsx'), /const kind = "hypnotherapy" as const/)
  assert.match(showcase, /variant === "psychotherapy-en" && locale === "en" && topic === "hypnotherapy"/)
  assert.match(registry, /const constellationCase: ServiceVideoMedia = \{\s*video: \{ youtubeId: "sfVFOQNr2qk", language: "en"/)
  assert.match(personal, /service === "systemic-constellations" \? "constellation-case"/)
  assert.match(read('app/[locale]/services/systemic-constellations/page.tsx'), /const service = "systemic-constellations" as const/)
  assert.match(free, /data-free-review-intro-video data-intro-audio-language=\{locale\}/)
  assert.match(free, /const situationVideo = kind !== "situation" \? null : locale === "es" \? \{[\s\S]*?\} : getServiceVideoMedia\("overview", locale\)/)
  assert.match(registry, /const overviewEn: ServiceVideoMedia = \{\s*video: \{ youtubeId: "s30Y42IwPcg", language: "en"/)
})

test('six unchanged identities keep canonical Alchemy, EN method and ES English-audio source boundaries', () => {
  const registry = read('data/service-video-library.ts')
  assert.match(registry, /const constellationsEn: ServiceVideoMedia = \{\s*video: \{ youtubeId: "", heygenId: "7c6b243f048b9c0581ae29619a4a89fc", language: "en"/)
  assert.match(registry, /const hypnotherapyEn: ServiceVideoMedia = \{\s*video: \{ youtubeId: "", heygenId: "8c1634ce904434a91931429b6a7eefe1", language: "en"/)
  assert.match(registry, /const overviewRu: ServiceVideoMedia = \{\s*video: \{ youtubeId: "Cz6SxXJNZbw", language: "ru"/)
  assert.match(registry, /en: \{[^}]*alchemy: constellationsEn,[^}]*hypnotherapy: hypnotherapyEn,/)
  assert.match(registry, /ru: \{[^}]*alchemy: overviewRu,/)
  assert.match(registry, /return media\[locale === "es" \? "en" : locale\]\[topic\]/)
  const alchemy = read('components/alchemy-soul-landing.tsx')
  assert.match(alchemy, /const video = getServiceVideoMedia\("alchemy", locale\)/)
  assert.match(alchemy, /data-alchemy-panel="video"[\s\S]*?<SiteVideoPlayer video=\{video.video\} locale=\{locale\}/)
  assert.match(read('app/[locale]/services/psychohomeopathy/page.tsx'), /permanentRedirect\("\/" \+ locale \+ "\/services\/alchemy-of-soul"\)/)
  const personal = read('components/personal-service-landing.tsx')
  assert.match(personal, /service === "imagery-therapy" \? "hypnotherapy"/)
  assert.match(personal, /variant=\{service === "imagery-therapy" && locale === "en" \? "psychotherapy-en" : "default"\}/)
})

test('strict embed classification rejects cross-locale IDs, unknown hosts, credentials and private/extra parameters without exposing raw values', () => {
  for (const row of rows) {
    const good = embed(row)
    const invalid = [null, '', 'not-a-url', ' ' + good, good.replace('https:', 'http:'), good.replace('https://', 'https://user:secret@'),
      good.replace(row.videoId, row.videoId + 'extra'), good.replace(row.videoId, row.provider === 'heygen' ? 'fd5fcead9b067f9a0649862675a38771' : 'Q9NvYECKWuc'),
      good.replace('https://', 'https://unknown.invalid/'), good + '#private', good + (good.includes('?') ? '&' : '?') + 'secret=SYNTHETIC-DO-NOT-LOG']
    if (row.provider === 'youtube') invalid.push(good.replace('www.youtube-nocookie.com', 'www.youtube.com'), good.replace('www.youtube-nocookie.com', 'www.youtube-nocookie.com.evil.invalid'),
      good.replace('hl=' + row.locale, 'hl=es'), good.replace('cc_lang_pref=' + row.audioLanguage, 'cc_lang_pref=es'), good + '&hl=' + row.locale,
      good.replace('rel=0', 'rel=1'), good.replace('playsinline=1&', ''), good.replace('autoplay=1', 'autoplay=0'), good.split('?')[0])
    for (const raw of invalid) {
      const result = contract.classifyDetailVideoSource(raw, row)
      assert.notEqual(result, 'match', row.alias)
      assert.ok(['missing', 'invalid', 'wrong-origin', 'wrong-video', 'wrong-parameters'].includes(result))
      assert.doesNotMatch(result, /SYNTHETIC|secret|https|Q9NvYECKWuc/)
    }
    if (row.provider === 'youtube') {
      const url = new URL(good); url.searchParams.sort()
      assert.equal(contract.classifyDetailVideoSource(url.href, row), 'match', 'parameter order does not change identity')
    }
  }
})

test('browser uses strict oracle, locale and click-to-mount assertions, and only fixed failure aliases/categories', () => {
  const loop = source.slice(source.indexOf('    for (const contract of detailVideoCases)'), source.indexOf('    // Wu Xing is now'))
  assert.match(loop, /toHaveAttribute\('lang', locale\)/)
  assert.match(loop, /toHaveAttribute\('lang', audioLanguage\)/)
  const before = loop.indexOf("assert.equal(await block.locator('iframe').count(), 0")
  const play = loop.indexOf("await block.locator('.site-video-play').click()")
  assert.ok(before >= 0 && play > before)
  assert.match(loop, /await expect\(block.locator\('iframe'\)\).toHaveCount\(1\)/)
  assert.match(loop, /classifyDetailVideoSource\(await block.locator\('iframe'\).getAttribute\('src'\), contract\)/)
  assert.match(loop, /timeout: 10000[\s\S]*?\.toBe\('match'\)/)
  assert.match(loop, /getAttribute\('data-video-playback'\)\) === provider/)
  assert.match(loop, /getAttribute\('href'\)\) === detailVideoWatchUrl\(contract\)/)
  assert.match(loop, /poster remained after Play/)
  assert.match(loop, /console.log\(`CHECK: video-detail \$\{alias\}`\)/)
  assert.match(loop, /console.log\(`PASS: video-detail \$\{alias\}`\)/)
  assert.match(loop, /const failure = \{ schemaVersion: 1, caseAlias: alias, phase, \.\.\.snapshot \}/)
  assert.match(loop, /source: classifyDetailVideoSource\(frame.src, contract\), providerMatches: frame.provider === provider/)
  assert.doesNotMatch(loop, /startsWith\(expectedUrl\)|console\.[a-z]+\([^\n]*(?:frame\.src|page\.url|error\.message)|JSON\.stringify\(frames\)/)
  assert.match(loop, /writeFileSync\(`\$\{evidence\}\/detail-route-failure.json`/)
  assert.match(loop, /throw error/)
  assert.match(source, /main\[data-free-entry-landing="dao"\] \[data-compact-lead-form\]/)
  assert.match(source, /separate Dao free start must not imply a video consultation/)
})
