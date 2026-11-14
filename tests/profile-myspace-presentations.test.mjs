import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { profilePresentationForLocale } from '../lib/profile-presentation.mjs'
import { approvedTelegramPresentation } from '../lib/crm/telegram-presentation.mjs'
import { parseSiteVideoSource, siteVideoWatchUrl } from '../lib/site-videos/model.js'

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8')

test('RU My Space uses the existing approved 1:37 YouTube presentation', () => {
  const approved = approvedTelegramPresentation('ru')
  const video = profilePresentationForLocale('ru')
  assert.ok(approved?.youtubeId)
  assert.equal(video.youtubeId, approved.youtubeId)
  assert.equal(video.language, 'ru')
  assert.equal(video.durationSeconds, 96.862)
  assert.equal(siteVideoWatchUrl(video), 'https://www.youtube.com/watch?v=G0Db6yOCMto')
})

test('EN My Space uses stable 91s HeyGen identity, never an expiring MP4', () => {
  const video = profilePresentationForLocale('en')
  assert.equal(video.language, 'en')
  assert.equal(video.youtubeId, '')
  assert.equal(video.heygenId, '8d998c778af3b563aa63233aa4fb4a06')
  assert.ok(video.durationSeconds > 90)
  const url = siteVideoWatchUrl(video)
  assert.equal(url, 'https://app.heygen.com/share/8d998c778af3b563aa63233aa4fb4a06')
  assert.deepEqual(parseSiteVideoSource(url), { youtubeId: '', heygenId: video.heygenId })
  assert.doesNotMatch(url, /(?:Expires|Signature|files2\.heygen)/i)
})

test('Spanish profile keeps its scenic film rather than mismatched narration', () => {
  assert.equal(profilePresentationForLocale('es'), null)
  assert.equal(profilePresentationForLocale('fr'), null)
})

test('RU/EN switch preserves profile sections and video is click-to-play', async () => {
  const [component, styles] = await Promise.all([
    read('components/app/profile-hub-tabs.jsx'),
    read('components/app/profile-hub-tabs.module.css'),
  ])
  assert.match(component, /data-profile-language-switch/)
  assert.match(component, /\['ru', 'en'\]\.map\(language/)
  assert.match(component, /href=\{languageHref\(language\)\}/)
  assert.match(component, /aria-current=\{selected === language \? 'page'/)
  for (const section of ['tests', 'state', 'path', 'courses', 'reports']) {
    assert.ok(component.includes("current === '" + section + "'"), section)
  }
  assert.match(component, /<SiteVideoPlayer key=\{selected\} video=\{presentation\} locale=\{selected\}/)
  assert.match(component, /minimal fallbackPoster=\{POSTER\}/)
  assert.match(component, /data-profile-presentation-source/)
  assert.match(styles, /\.languageSwitch a\[aria-current=page\]/)
  assert.match(styles, /min-height:40px/)
  assert.doesNotMatch(component + styles, /https?:\/\/files2\.heygen\.ai|Expires=|Signature=/)
})
