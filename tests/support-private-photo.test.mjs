import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const api=read('app/api/app/support-photo/route.js')
const helper=read('lib/mandala/prepare-browser-photo.ts')
const support=read('components/holistic-support-mobile.tsx')
const styles=read('components/holistic-support-mobile.module.css')
const cabinet=read('components/app/support-photo-cabinet.jsx')
const videos=read('components/app/my-personal-videos.jsx')
const mandala=read('components/mandala-meditation-client.tsx')

test('support photo is never uploaded without an explicit Save click',()=>{
  assert.match(support,/prepareBrowserPhoto\(file\)/)
  assert.match(support,/const savePhoto = async \(\) =>/)
  assert.match(support,/onClick=\{\(\) => \{ void savePhoto\(\); \}\}/)
  assert.match(support,/method:"POST", credentials:"same-origin"/)
  assert.match(support,/photoBlob && <button/)
  assert.match(support,/data-support-photo-saved/)
  assert.match(support,/photoSignIn/)
  assert.match(support,/\/app\/videos/)
  assert.match(support,/privateInfo: "Оценки и история/)
})

test('private photo API is session-bound and does not expose public media URLs',()=>{
  assert.match(api,/requireSameOrigin/)
  assert.match(api,/requestOrigin/)
  assert.match(api,/auth\.verified\(\)/)
  assert.match(api,/transaction\(config,actor/)
  assert.match(api,/support-photo\/.*actor\.id/)
  assert.match(api,/const BUCKET='hh-client-private-media'/)
  assert.match(api,/checkPrivateMediaStorage/)
  assert.match(api,/createSignedUrl\(key,120\)/)
  assert.match(api,/PRIVATE_HEADERS/)
  assert.match(api,/sharp\(Buffer\.from/)
  assert.match(api,/upsert:true/)
  assert.match(api,/export async function GET/)
  assert.match(api,/export async function POST/)
  assert.match(api,/export async function DELETE/)
  assert.doesNotMatch(api,/\/storage\/v1\/object\/public\//)
})

test('iPhone Photos and Files use full tap-target and decoded metadata-stripped JPEG',()=>{
  assert.match(helper,/image\/heic/)
  assert.match(helper,/FILE_EXT\.test\(file\.name\)/)
  assert.match(helper,/image\/heif/)
  assert.match(helper,/image\/\*/)
  assert.match(helper,/image\.decode\(\)/)
  // Safari may load a valid iPhone image through <img> after decode() rejects.
  // The fallback must still require real pixels and fail closed on timeout/error.
  assert.match(helper,/function waitForBrowserImageLoad\(image:/)
  assert.match(helper,/image\.addEventListener\("load"/)
  assert.match(helper,/image\.addEventListener\("error"/)
  assert.match(helper,/if \(image\.complete\) finish\(valid\(\)\)/)
  assert.match(helper,/window\.setTimeout\(\(\) => finish\(false\), 15_000\)/)
  assert.match(helper,/catch \{ await waitForBrowserImageLoad\(image\); \}/)
  assert.match(helper,/canvas\.toBlob\(resolve, "image\/jpeg"/)
  assert.match(helper,/URL\.revokeObjectURL/)
  assert.match(support,/accept=\{SUPPORT_PHOTO_ACCEPT\}/)
  assert.match(styles,/\.fileInput \{ position: absolute; inset: 0; width: 100%; height: 100%/)
  assert.match(styles,/\.photo:has\(\.photoReference\) \.camera \{ display: grid; \}/)
  assert.match(mandala,/await prepareBrowserPhoto\(image\)/)
  assert.match(mandala,/type="file" accept=\{SUPPORT_PHOTO_ACCEPT\}/)
})

test('cabinet lists, replaces, and deletes only voluntarily saved private photo',()=>{
  assert.match(videos,/SupportPhotoCabinet locale=\{locale\}/)
  assert.match(cabinet,/\/api\/app\/support-photo/)
  assert.match(cabinet,/prepareBrowserPhoto/)
  assert.match(cabinet,/method:'POST'/)
  assert.match(cabinet,/method:'DELETE'/)
  assert.match(cabinet,/result\.removed!==true/)
  assert.match(cabinet,/photo.*never shared/)
})

test('strict CSP exposes blob previews on Support and signed images only in My Videos',()=>{
  const policy=read('middleware.ts')
  assert.match(policy,/const privateSupportPhotoCabinet/)
  assert.match(policy,/const privateSupportPhotoOrigin/)
  assert.ok(policy.includes('supportMobilePublishedMedia || privateSupportPhotoCabinet'))
  assert.ok(policy.includes('directMessageStorageOrigin + privateSupportPhotoOrigin'))
  assert.ok(policy.includes('if (!privateSupportPhotoCabinet) return'))
  assert.ok(policy.includes('url.origin'))
})

test('new mobile layout retains the advisor and a visible photo affordance',()=>{
  const css=read('components/holistic-support-mobile.module.css')
  const ui=read('components/holistic-support-mobile.tsx')
  assert.match(ui,/HolisticSupportInlineGuide/)
  assert.match(ui,/photoUrl \|\| storedPhotoUrl/)
  assert.match(ui,/photoSaved/)
  assert.match(css,/\.photoPlaceholder strong \{ display: block;/)
})

test('invalid replacement clears an older pending photo and a saved photo stays discoverable',()=>{
  const pending=support.slice(support.indexOf('const onPhoto = async'),support.indexOf('const savePhoto = async'))
  assert.ok(pending.includes('setPhotoBlob(null);') && pending.indexOf('setPhotoBlob(null);')<pending.indexOf('prepareBrowserPhoto(file)'))
  assert.ok(pending.includes('setPhotoUrl(null);') && pending.indexOf('setPhotoUrl(null);')<pending.indexOf('prepareBrowserPhoto(file)'))
  const cabinetSelect=cabinet.slice(cabinet.indexOf('async function select'),cabinet.indexOf('async function save'))
  assert.ok(cabinetSelect.includes('setBlob(null);setPreview(null)') &&
    cabinetSelect.indexOf('setBlob(null);setPreview(null)')<cabinetSelect.indexOf('prepareBrowserPhoto(file)'))
  assert.match(support,/\(photoSaved \|\| storedPhotoUrl\) && <Link href/)
})


test('late initial private-image GET cannot restore a deleted portrait or override a fresh Save',()=>{
  // A private signed GET is asynchronous. Any successful write advances a
  // monotonic epoch before applying its result; older responses are ignored.
  assert.match(cabinet,/const photoStorageEpoch=useRef\(0\)/)
  assert.match(cabinet,/const readEpoch=photoStorageEpoch\.current/)
  assert.match(cabinet,/if\(mounted&&readEpoch===photoStorageEpoch\.current&&data\)/)
  const save=cabinet.slice(cabinet.indexOf('async function save'),cabinet.indexOf('async function remove'))
  const remove=cabinet.slice(cabinet.indexOf('async function remove'),cabinet.indexOf('return <section'))
  assert.ok(save.indexOf('photoStorageEpoch.current+=1')<save.indexOf('setUrl(result.url)'))
  assert.ok(remove.indexOf('photoStorageEpoch.current+=1')<remove.indexOf('setUrl(null)'))
  assert.match(support,/const photoStorageEpoch = useRef\(0\)/)
  assert.match(support,/readEpoch === photoStorageEpoch\.current/)
  const photoSave=support.slice(support.indexOf('const savePhoto = async'),support.indexOf('// Quick matching'))
  assert.ok(photoSave.indexOf('photoStorageEpoch.current += 1')<photoSave.indexOf('setStoredPhotoUrl(data.url)'))
})

test('concurrent photo choices never let an older iPhone decode replace the newest draft',()=>{
  const select=cabinet.slice(cabinet.indexOf('async function select'),cabinet.indexOf('async function save'))
  assert.match(cabinet,/const photoChoiceEpoch=useRef\(0\)/)
  assert.match(cabinet,/photoChoiceEpoch\.current\+=1/)
  assert.match(select,/const choiceEpoch=\+\+photoChoiceEpoch\.current/)
  assert.match(select,/if\(choiceEpoch!==photoChoiceEpoch\.current\)return/)
  assert.ok(select.indexOf('if(choiceEpoch!==photoChoiceEpoch.current)return')<
    select.indexOf('setBlob(result)'), 'outdated decode must be discarded before setting the save candidate')
  assert.match(select,/if\(choiceEpoch===photoChoiceEpoch\.current\)setError\(t\.invalid\)/)
  assert.match(select,/if\(choiceEpoch===photoChoiceEpoch\.current\)setBusy\(false\)/)
})
