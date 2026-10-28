import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// UI-only acceptance of existing source recordings, not playback/fullscreen QA.
// Owner removed the standalone audio block on 2026-10-27:
// https://chatgpt.com/c/6ae10f44-19bc-83ea-928b-116899ef186b?messageId=b3619077-662b-4a10-ab16-bb06c11a55e2
// Never click Play, follow a provider link, or weaken the caller's request fence.
export const galleryTopics = ['all', 'business', 'love', 'energy', 'health']
export const gallerySelector = '#meditation-practices [data-holistic-meditation-gallery]'
const themeSets = [galleryTopics.slice(1), ['business','love','energy'], ['love','energy'],
  ['energy','health'], ['energy'], ['energy','health'], ['energy','health']]
export function expectedGalleryVideos(locale, manifest) {
  assert.ok(['en','ru','es'].includes(locale), 'known gallery locale')
  if (locale !== 'ru') return [{id:'HqfixazXqRY', title:'Flight to the Sun' +
    (locale === 'es' ? ' · audio original en inglés' : ' · original English audio'), topics:galleryTopics.slice(1)}]
  return [['videos/strength-protection',5],['videos/strength-protection',6],
    ['videos/strength-protection',7],['videos/strength-protection',3],['videos/strength-protection',1],
    ['videos/energy-pump-ups',1],['videos/energy-pump-ups',2]].map(([logicalId,order],index) => {
    const rows = manifest.filter(row => row.logicalId === logicalId && row.order === order && row.status === 'verified_legacy_public_embed')
    assert.equal(rows.length,1,'one verified source recording')
    assert.match(rows[0].videoId,/^[A-Za-z0-9_-]{11}$/)
    return {id:rows[0].videoId,title:rows[0].lessonTitle,topics:themeSets[index]}
  })
}
export function assertGallerySnapshot(s, videos, topic, selectedId, width, label) {
  const visible = videos.filter(video => topic === 'all' || video.topics.includes(topic))
  const active = visible.find(video => video.id === selectedId) ?? visible[0]
  assert.ok(active,label + ': source-backed active recording')
  assert.equal(new Set(videos.map(video => video.id)).size,videos.length,label + ': unique sources')
  assert.equal(s.audio,0,label + ': no cancelled standalone audio')
  assert.equal(s.iframes,0,label + ': no player before explicit Play')
  assert.deepEqual(s.topics,galleryTopics,label + ': five theme filters')
  assert.deepEqual(s.activeTopics,[topic],label + ': one active filter')
  assert.deepEqual(s.recordingIds,visible.length > 1 ? visible.map(video => video.id) : [],label + ': exact locale/topic sources')
  assert.deepEqual(s.activeIds,visible.length > 1 ? [active.id] : [],label + ': one active recording when selector exists')
  assert.equal(s.title,active.title,label + ': exact selected source title')
  assert.equal(s.href,'https://www.youtube.com/watch?v=' + active.id,label + ': exact public source identity')
  assert.equal(s.poster,'https://i.ytimg.com/vi/' + active.id + '/hqdefault.jpg',label + ': exact poster identity')
  assert.equal(s.posters,1,label + ': one inert Play poster')
  assert.ok(s.documentWidth <= width + 2,label + ': no horizontal page overflow')
  assert.ok(s.galleryWidth > 0 && s.galleryWidth <= width + 2,label + ': gallery fits viewport')
  // Original gate covered first-screen choices, not the 30px direct YouTube link.
  // Do not claim that link has passed a 44px target check. Filters, selectors,
  // and the inert Play button are checked here without activating playback.
  assert.equal(s.targets.length,5 + s.recordingIds.length + 1,label + ': every gallery button checked')
  for (const b of s.targets) assert.ok(b.width >= 44 && b.height >= 44 && b.x >= -1 && b.x + b.width <= width + 1,
    label + ': button retains visible 44px target')
}
export async function verifyCurrentGallery(page, locale, width, label) {
  const manifest = JSON.parse(readFileSync(new URL('../../data/academy/psimaster-media.generated.json',import.meta.url),'utf8'))
  const videos = expectedGalleryVideos(locale,manifest)
  assert.equal(videos.length,locale === 'ru' ? 7 : 1,label + ': original locale source count')
  const gallery = page.locator(gallerySelector)
  assert.equal(await gallery.count(),1,label + ': one current video-only gallery')
  await gallery.scrollIntoViewIfNeeded()
  const snapshot = () => gallery.evaluate(node => {
    const all = selector => Array.from(node.querySelectorAll(selector))
    const bounds = element => {const b=element.getBoundingClientRect();return {x:b.x,width:b.width,height:b.height}}
    return {audio:document.querySelectorAll('#meditation-practices audio, #meditation-audio, [data-holistic-audio-player]').length,
      iframes:node.querySelectorAll('iframe').length,
      topics:all('[data-meditation-topic]').map(n=>n.getAttribute('data-meditation-topic')),
      activeTopics:all('[data-meditation-topic][aria-pressed="true"]').map(n=>n.getAttribute('data-meditation-topic')),
      recordingIds:all('[data-meditation-video-id]').map(n=>n.getAttribute('data-meditation-video-id')),
      activeIds:all('[data-meditation-video-id][aria-pressed="true"]').map(n=>n.getAttribute('data-meditation-video-id')),
      title:node.querySelector('h3[aria-live="polite"]')?.textContent?.trim(),
      href:node.querySelector('a.academy-video-direct-link')?.getAttribute('href'),
      poster:node.querySelector('button.academy-video-poster img')?.getAttribute('src'),
      posters:node.querySelectorAll('button.academy-video-poster').length,
      documentWidth:document.documentElement.scrollWidth,galleryWidth:node.getBoundingClientRect().width,
      targets:all('button[data-meditation-topic], button[data-meditation-video-id], button.academy-video-poster').map(bounds)}
  })
  const check = async (topic='all',selectedId=null) => assertGallerySnapshot(await snapshot(),videos,topic,selectedId,width,label)
  await check()
  if(locale === 'ru') {
    const last = videos.at(-1)
    await gallery.locator('[data-meditation-video-id="' + last.id + '"]').tap()
    await check('all',last.id)
  }
  for(const topic of galleryTopics.slice(1)) {
    await gallery.locator('[data-meditation-topic="' + topic + '"]').tap()
    await check(topic) // Changing theme resets selection to its first source.
  }
  await gallery.locator('[data-meditation-topic="all"]').tap()
  await check() // All restores full source list and first recording.
  if(width === 320) {
    await page.setViewportSize({width,height:568})
    await check()
    await page.setViewportSize({width,height:844})
    await check()
  }
}
