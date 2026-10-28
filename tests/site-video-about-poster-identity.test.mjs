import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const source = readFileSync(new URL('../scripts/verify-site-video-browser.mjs', import.meta.url), 'utf8')
const begin = source.indexOf('// BEGIN bounded About gallery contract')
const end = source.indexOf('// END bounded About gallery contract.')
assert.ok(begin >= 0 && end > begin)
const { aboutPosterIdentityMatches, classifyAboutGallery, aboutTestimonialVideos } = runInNewContext(
  source.slice(begin, end) + '\n({ aboutPosterIdentityMatches, classifyAboutGallery, aboutTestimonialVideos })', { URL }, { timeout: 1000 })
const expectedIds = ['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk', '4NrryHcEF1A', 'hYwRNMxIMjc',
  'MIVLm1GUTtM', 'ttQxUHopaUM', 'VABgpmn4ZYA', 'muOnIHllI7E']
const origins = ['http://127.0.0.1:3100', 'https://holistichouse.vercel.app']
const poster = id => `/images/holistic-house/testimonial-posters/${id}.webp`

// DOM-like URL-reflecting IDL property: the getter resolves against the document
// base; assigning it writes the resolved string into the content attribute.
// This is a source model, not a native-browser or network execution claim.
function reflectedImage(relative, origin) {
  let attribute = relative, assignments = 0
  return {
    get src() { return new URL(attribute, origin).href },
    set src(value) { attribute = String(value); assignments++ },
    getAttribute(name) { assert.equal(name, 'src'); return attribute },
    assignments() { return assignments },
  }
}
// Pinned matching framework source: Next v15.5.21 image-component.tsx:210–221,
// blob ca1666a2bc99ab02b66808e3e73ff7af16bba4d9.
// https://github.com/vercel/next.js/blob/v15.5.21/packages/next/src/client/image-component.tsx#L210-L221
function frameworkRefSourceModel(img, onError) {
  if (!img) return
  if (onError) {
    img.src = img.src
  }
}
function validGallery(origin, absolute = false) {
  return { galleryCount: 1, locale: 'en', playerCount: 10, iframeCount: 0, watchLinkCount: 0,
    cards: expectedIds.map((id, i) => ({ id, audioLanguage: i < 6 ? 'en' : 'ru', playerCount: 1, playerLocale: 'en',
      playCount: 1, playDisabled: false, posterSrc: (absolute ? origin : '') + poster(id) })) }
}

test('pinned Next ref source model changes only src representation, not exact poster identity', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(aboutTestimonialVideos)).map(([id]) => id), expectedIds)
  for (const origin of origins) for (const id of expectedIds) {
    const relative = poster(id), img = reflectedImage(relative, origin)
    assert.equal(img.getAttribute('src'), relative)
    assert.equal(aboutPosterIdentityMatches(img.getAttribute('src'), id, origin), true)
    frameworkRefSourceModel(img, () => { throw new Error('The source model must not call the error callback') })
    assert.equal(img.assignments(), 1)
    assert.equal(img.getAttribute('src'), origin + relative)
    assert.notEqual(img.getAttribute('src'), relative, 'The former relative-only observer rejects a valid framework representation')
    assert.equal(aboutPosterIdentityMatches(img.getAttribute('src'), id, origin), true)
    const untouched = reflectedImage(relative, origin); frameworkRefSourceModel(untouched, undefined)
    assert.equal(untouched.assignments(), 0); assert.equal(untouched.getAttribute('src'), relative)
  }
})

test('only exact relative or exact configured-origin absolute strings pass, without URL normalization', () => {
  for (const origin of origins) for (const id of expectedIds) {
    const p = poster(id), absolute = origin + p
    assert.equal(aboutPosterIdentityMatches(p, id, origin), true)
    assert.equal(aboutPosterIdentityMatches(absolute, id, origin), true)
    const otherOrigin = origins.find(value => value !== origin)
    const bad = [null, undefined, '', new String(p), otherOrigin + p, 'https://foreign.invalid' + p,
      origin.replace('://', '://user:password@') + p, origin.replace(/^https?:/, '') + p,
      origin.toUpperCase() + p, absolute + '?', absolute + '?v=1', absolute + '#', absolute + '#x',
      p + '?', p + '?x', p + '#', p + '#x', p + '/', absolute + '/',
      ' ' + p, p + ' ', p + '\n', '\n' + absolute, absolute + '\u0000',
      p.replace('/testimonial-posters/', '/testimonial-posters/../testimonial-posters/'),
      absolute.replace('/images/', '//images/'), p.replace(id, encodeURIComponent(id[0]) === id[0] ? '%' + id.charCodeAt(0).toString(16) + id.slice(1) : encodeURIComponent(id)),
      p.replace('/images/', '/%69mages/'), p.replace('.webp', '.WEBP'),
      origin + '/_next/image?url=' + encodeURIComponent(p) + '&w=480&q=75',
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      'blob:' + absolute, 'data:image/webp;base64,AAAA', poster(id === expectedIds[0] ? expectedIds[1] : expectedIds[0]),
    ]
    if (origin.startsWith('https:')) bad.push('https://holistichouse.vercel.app:443' + p)
    for (const raw of bad) assert.equal(aboutPosterIdentityMatches(raw, id, origin), false, 'Reject any nonliteral representation or identity')
  }
})

test('origin context is explicit and fail-closed; no caller can infer a new allowed origin from observed DOM', () => {
  for (const configured of [undefined, null, '', 'http://localhost:3100', 'https://foreign.invalid', origins[0] + '/',
    'http://127.0.0.1:3101', 'https://holistichouse.vercel.app:443', 'HTTPS://HOLISTICHOUSE.VERCEL.APP', '//holistichouse.vercel.app']) {
    assert.equal(aboutPosterIdentityMatches(poster(expectedIds[0]), expectedIds[0], configured), false)
    assert.equal(aboutPosterIdentityMatches(String(configured) + poster(expectedIds[0]), expectedIds[0], configured), false)
  }
  for (const id of ['../private', '', 'short', 'Dk0LBmOivQo/extra', 'Dk0LBmOivQo?x', null])
    assert.equal(aboutPosterIdentityMatches(poster(id), id, origins[0]), false)
  assert.ok(source.includes("if (classifyAboutGallery(await readAboutGallery(), origin) === 'match') break"))
  assert.ok(source.includes('await expect.poll(async () => classifyAboutGallery(await readAboutGallery(), origin),'))
})

test('all ten identities may use either exact form while missing, foreign, duplicate and eager-provider states remain fatal', () => {
  for (const origin of origins) {
    assert.equal(classifyAboutGallery(validGallery(origin), origin), 'match')
    assert.equal(classifyAboutGallery(validGallery(origin, true), origin), 'match')
    const mixed = validGallery(origin); mixed.cards.forEach((card, i) => { if (i % 2) card.posterSrc = origin + card.posterSrc })
    assert.equal(classifyAboutGallery(mixed, origin), 'match')
    for (const bad of [null, 'https://foreign.invalid' + poster(expectedIds[0]), `https://i.ytimg.com/vi/${expectedIds[0]}/hqdefault.jpg`]) {
      const state = validGallery(origin); state.cards[0].posterSrc = bad
      assert.equal(classifyAboutGallery(state, origin), 'poster-identity')
    }
    const duplicate = validGallery(origin); duplicate.cards[1].id = duplicate.cards[0].id
    assert.equal(classifyAboutGallery(duplicate, origin), 'video-order-or-identity')
    const eager = validGallery(origin, true); eager.iframeCount = 1
    assert.equal(classifyAboutGallery(eager, origin), 'eager-iframe')
    const external = validGallery(origin, true); external.watchLinkCount = 1
    assert.equal(classifyAboutGallery(external, origin), 'external-watch-link')
    assert.equal(classifyAboutGallery(validGallery(origin), undefined), 'poster-identity')
  }
})
