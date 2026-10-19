import assert from 'node:assert/strict'
import test from 'node:test'
import { mount, nodes, textOf, findButton } from './helpers/course-ui-harness.mjs'

const snapshot = (accountId, marker, extra = {}) => ({ accountId, enrolled: true, revision: 3, sharingWithTeacher: false,
  answers: { 'flight-04': marker }, publicReviews: [], ...extra })
function pending() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function fixture(action = 'submit-review') {
  const requests = [], reads = [], posts = []
  const view = owner => snapshot(owner, `Synthetic ${owner} private reflection`, action === 'withdraw-review' ? { publicReviews: [{ slideId: 'flight-04', status: 'pending' }] } : {})
  const h = mount('reiki-my-reviews', { props: { accountId: 'owner-a', locale: 'en' },
    fetcher(path, options, body) {
      assert.equal(path, 'academy-energywork'); assert.ok(['owner-a', 'owner-b'].includes(options.accountId))
      if (!body) { reads.push(options.accountId); return view(options.accountId) }
      const response = pending(); requests.push({ ...body }); posts.push({ owner: options.accountId, response }); return response.promise
    } })
  return { h, requests, reads, posts, view }
}
async function prepare(h, action) {
  await h.settle()
  if (action === 'save') {
    findButton(h.tree, 'Edit review').props.onClick(); await h.settle()
    nodes(h.tree).find(node => node.type === 'textarea').props.onChange({ target: { value: 'Synthetic edited private reflection' } }); await h.settle()
    return findButton(h.tree, 'Save changes')
  }
  if (action === 'submit-review') {
    const card = nodes(h.tree).find(node => node.props?.['data-reiki-review-id'] === 'flight-04')
    nodes(card).find(node => node.type === 'input').props.onChange({ target: { checked: true } }); await h.settle()
    return findButton(h.tree, 'Submit for publication')
  }
  if (action === 'share') {
    const teacher = nodes(h.tree).find(node => node.type === 'div' && node.props.className === 'teacher')
    nodes(teacher).find(node => node.type === 'input').props.onChange({ target: { checked: true } })
    await h.settle(); return findButton(h.tree, 'Share with teacher')
  }
  return findButton(h.tree, 'Withdraw public consent')
}
const has = (h, marker) => textOf(h.tree).includes(marker)
const actions = ['submit-review', 'save', 'share', 'withdraw-review']
for (const action of actions) test(`${action}: an A response cannot replace B private reviews, even before B effects settle`, async () => {
  const { h, posts } = fixture(action)
  const button = await prepare(h, action); assert.equal(button.props.disabled, false)
  button.props.onClick(); await h.settle(); assert.equal(posts.length, 1)
  h.render({ accountId: 'owner-b', locale: 'en' })
  assert.equal(has(h, 'owner-a private reflection'), false, 'first B render must not show A before effects clear state')
  await h.settle(); assert.equal(has(h, 'owner-b private reflection'), true)
  posts[0].response.resolve(snapshot('owner-a', 'Synthetic stale A POST reflection', { revision: 4 })); await h.settle()
  assert.equal(has(h, 'owner-b private reflection'), true); assert.equal(has(h, 'stale A POST'), false)
  assert.equal(has(h, 'Review submitted for approval.'), false); assert.equal(has(h, 'Saved. You can continue learning.'), false)
  assert.equal(posts.length, 1)
  h.unmount()
})
for (const failed of [false, true]) test(`old ${failed ? 'error' : 'success'}/finally cannot clear B busy or change B feedback`, async () => {
  const { h, posts } = fixture()
  ;(await prepare(h, 'submit-review')).props.onClick(); await h.settle()
  h.render({ accountId: 'owner-b', locale: 'en' }); await h.settle()
  const newer = await prepare(h, 'submit-review'); assert.equal(newer.props.disabled, false, 'B is not blocked by an old A command')
  newer.props.onClick(); await h.settle(); assert.equal(posts.length, 2)
  if (failed) posts[0].response.reject(Object.assign(new Error('old conflict'), { status: 409 }))
  else posts[0].response.resolve(snapshot('owner-a', 'Old private result', { revision: 4 }))
  await h.settle()
  assert.equal(has(h, 'owner-b private reflection'), true); assert.equal(has(h, 'Old private result'), false)
  assert.equal(findButton(h.tree, 'Submit for publication').props.disabled, true, 'new B command still owns busy state')
  assert.equal(nodes(h.tree).filter(node => node.props?.role === 'alert').length, 0)
  posts[1].response.resolve(snapshot('owner-b', 'New B confirmed reflection', { revision: 4, publicReviews: [{ slideId: 'flight-04', status: 'pending' }] })); await h.settle()
  assert.equal(has(h, 'New B confirmed reflection'), true); assert.equal(has(h, 'Awaiting approval'), true)
  h.unmount()
})
for (const failed of [false, true]) test(`unmounted review ${failed ? 'error' : 'success'} response does not update any view state`, async () => {
  const { h, posts } = fixture()
  ;(await prepare(h, 'submit-review')).props.onClick(); await h.settle()
  const before = h.tree; h.unmount()
  if (failed) posts[0].response.reject(new Error('late failure'))
  else posts[0].response.resolve(snapshot('owner-a', 'Unmounted secret result', { revision: 4 }))
  await h.settle(); assert.equal(h.tree, before, 'there must be no state setter after unmount')
})
for (const action of actions) test(`${action}: repeated same-render invocation issues only one consented command`, async () => {
  const { h, posts, requests } = fixture(action)
  const button = await prepare(h, action); assert.equal(button.props.disabled, false)
  button.props.onClick(); button.props.onClick(); await h.settle()
  assert.equal(posts.length, 1); assert.equal(requests[0].action, action)
  assert.equal(posts[0].owner, 'owner-a'); assert.equal(requests[0].expectedRevision, 3); assert.equal(requests[0].version, '2026-10-18.p1')
  if (action === 'submit-review') assert.deepEqual(requests[0], { version: '2026-10-18.p1', expectedRevision: 3, action, slideId: 'flight-04', locale: 'en', consent: true })
  if (action === 'share') assert.deepEqual(requests[0], { version: '2026-10-18.p1', expectedRevision: 3, action, consent: true, teacherConsent: true })
  posts[0].response.resolve(snapshot('owner-a', 'Confirmed same owner reflection', { revision: 4 })); await h.settle(); h.unmount()
})
test('A to B to A invalidates the first A command, and an obsolete B callback cannot write', async () => {
  const { h, posts } = fixture()
  ;(await prepare(h, 'submit-review')).props.onClick(); await h.settle()
  h.render({ accountId: 'owner-b', locale: 'en' }); await h.settle()
  const obsolete = await prepare(h, 'submit-review')
  h.render({ accountId: 'owner-a', locale: 'en' }); await h.settle()
  obsolete.props.onClick(); await h.settle(); assert.equal(posts.length, 1, 'old B callback has no authority under A')
  posts[0].response.resolve(snapshot('owner-a', 'Obsolete first A response', { revision: 4 })); await h.settle()
  assert.equal(has(h, 'owner-a private reflection'), true); assert.equal(has(h, 'Obsolete first A'), false)
  h.unmount()
})
test('a mismatched POST owner fails closed without rendering that account data', async () => {
  const { h, posts } = fixture()
  ;(await prepare(h, 'submit-review')).props.onClick(); await h.settle()
  posts[0].response.resolve(snapshot('owner-b', 'Foreign response reflection')); await h.settle()
  assert.equal(has(h, 'Foreign response reflection'), false); assert.equal(has(h, 'owner-a private reflection'), true)
  assert.equal(nodes(h.tree).filter(node => node.props?.role === 'alert').length, 1)
  assert.equal(findButton(h.tree, 'Submit for publication').props.disabled, false)
  h.unmount()
})


test('an old owner callback cannot dispatch while the first new-owner render still awaits its read', async () => {
  const { h, posts } = fixture()
  const obsolete = await prepare(h, 'submit-review')
  h.render({ accountId: 'owner-b', locale: 'en' })
  obsolete.props.onClick(); await h.settle()
  assert.equal(posts.length, 0); assert.equal(has(h, 'owner-b private reflection'), true)
  h.unmount()
})

test('returning to A does not revive an old A callback or its earlier consent', async () => {
  const { h, posts } = fixture()
  const obsolete = await prepare(h, 'submit-review')
  h.render({ accountId: 'owner-b', locale: 'en' }); await h.settle()
  h.render({ accountId: 'owner-a', locale: 'en' }); await h.settle()
  assert.equal(findButton(h.tree, 'Submit for publication').props.disabled, true, 'the new A view has no public consent')
  obsolete.props.onClick(); await h.settle()
  assert.equal(posts.length, 0, 'old A consent cannot authorize a command in a new A lifetime')
  h.unmount()
})


test('an abandoned B render cannot invalidate the still-committed A command or leave it busy', async () => {
  const { h, posts } = fixture()
  ;(await prepare(h, 'submit-review')).props.onClick(); await h.settle()
  const speculative = h.speculate({ accountId: 'owner-b', locale: 'en' })
  assert.equal(textOf(speculative).includes('owner-a private reflection'), false, 'even an uncommitted B view is owner-filtered')
  posts[0].response.resolve(snapshot('owner-a', 'Committed A confirmed reflection', { revision: 4 })); await h.settle()
  assert.equal(has(h, 'Committed A confirmed reflection'), true)
  assert.equal(findButton(h.tree, 'Edit review').props.disabled, false, 'the committed operation releases its busy state')
  h.render({ accountId: 'owner-a', locale: 'en' }); await h.settle()
  assert.equal(has(h, 'Committed A confirmed reflection'), true)
  assert.equal(findButton(h.tree, 'Edit review').props.disabled, false)
  h.unmount()
})


for (const [locale, edit, save, countLabel] of [
  ['en', 'Edit review', 'Save changes', 'characters · minimum 15'],
  ['ru', 'Редактировать', 'Сохранить изменения', 'символов · минимум 15'],
]) test(`${locale}: owner review changes preserve uncapped Unicode count and exact long save payload`, async () => {
  const requests = []
  const h = mount('reiki-my-reviews', { props: { accountId: 'owner-a', locale },
    fetcher(path, options, body) {
      assert.equal(path, 'academy-energywork'); assert.equal(options.accountId, 'owner-a')
      if (!body) return snapshot('owner-a', 'Synthetic original reflection')
      requests.push({ ...body }); return snapshot('owner-a', body.answer, { revision: 4 })
    } })
  await h.settle(); findButton(h.tree, edit).props.onClick(); await h.settle()
  const textarea = () => nodes(h.tree).find(node => node.type === 'textarea')
  assert.equal(textarea().props.maxLength, undefined, 'owner removed the old 1600-character cap')
  for (const value of ['🌞'.repeat(14), '🌞'.repeat(15), '🌞'.repeat(1701)]) {
    textarea().props.onChange({ target: { value } }); await h.settle()
    const count = Array.from(value).length
    assert.equal(textarea().props.value, value)
    assert.ok(textOf(h.tree).replace(/\s+/g, ' ').includes(`${count} ${countLabel}`), 'display full Unicode count with localized minimum')
    assert.equal(findButton(h.tree, save).props.disabled, count < 15, 'keep the existing minimum without an upper cap')
  }
  findButton(h.tree, save).props.onClick(); await h.settle()
  assert.deepEqual(requests, [{ version: '2026-10-18.p1', expectedRevision: 3, action: 'save', slideId: 'flight-04', nextSlideId: 'flight-04', answer: '🌞'.repeat(1701) }])
  assert.ok(textOf(h.tree).includes('🌞'.repeat(1701)))
  h.unmount()
})
