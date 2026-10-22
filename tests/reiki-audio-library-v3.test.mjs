import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  REIKI_AUDIO_MAX_BATCH, REIKI_AUDIO_MAX_TITLE, REIKI_AUDIO_MAX_DESCRIPTION,
  reikiAudioCleanLabel, reikiAudioUploadTitle, reikiAudioValidMetadataInput,
  reikiIntroAudioPath, validReikiIntroAudioPath,
} from '../lib/academy/reiki-intro-audio-model.js'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const migration = read('supabase/migrations/20261020145000_reiki_intro_audio_metadata.sql')
const repository = read('lib/academy/reiki-audio-metadata.js')
const store = read('lib/academy/reiki-intro-audio-store.js')
const ownerRoute = read('app/admin/reiki-audio/data/route.js')
const publicRoute = read('app/api/reiki-intro-audio/route.js')
const manager = read('components/admin-reiki-audio.jsx')
const styles = read('components/admin-reiki-audio.module.css')

test('Reiki library labels preserve the owners spoken-language titles safely', () => {
  assert.equal(REIKI_AUDIO_MAX_TITLE, 100)
  assert.equal(REIKI_AUDIO_MAX_DESCRIPTION, 360)
  assert.equal(REIKI_AUDIO_MAX_BATCH, 5)
  assert.equal(reikiAudioUploadTitle('Урок_1-Моё-введение.m4a'), 'Урок 1 Моё введение')
  assert.equal(reikiAudioUploadTitle('Tantra_Reiki-EN.mp3'), 'Tantra Reiki EN')
  assert.equal(reikiAudioCleanLabel('  My   recording   '), 'My recording')
  assert.equal(reikiAudioCleanLabel('Valid <script>'), null)
  assert.equal(reikiAudioCleanLabel('text\u0000other'), 'text other')
  assert.equal(reikiAudioCleanLabel(''), null)
  assert.equal(reikiAudioCleanLabel('x'.repeat(101)), null)
  assert.equal(reikiAudioCleanLabel(123), null)
  assert.equal(reikiAudioValidMetadataInput({title:'Рейки Иггдрасиль', description:'Короткое введение'}),true)
  assert.equal(reikiAudioValidMetadataInput({title:'Okay',description:'n'.repeat(361)}),false)
  assert.equal(reikiAudioValidMetadataInput({title:'Okay',description:'ok',archived:'true'}),false)
  assert.equal(reikiAudioValidMetadataInput({title:'<svg>',description:''}),false)
})

test('Metadata migration is server/owner-only, non-public and validates scope/lesson/language', () => {
  assert.match(migration,/app_private\.reiki_intro_audio_metadata/)
  assert.match(migration,/primary key \(storage_scope, object_path\)/)
  assert.match(migration,/storage_scope in \('draft','public'\)/)
  assert.match(migration,/object_path ~/)
  assert.match(migration,/locale in \('ru','en'\)/)
  assert.match(migration,/enable row level security/)
  assert.match(migration,/revoke all on app_private\.reiki_intro_audio_metadata from public, anon, authenticated/)
  assert.match(migration,/grant select, insert, update, delete .* to hh_app_backend/)
  assert.match(migration,/current_setting\('hh\.reiki_audio_owner', true\) = '1'/)
  assert.match(repository,/transaction\(config, null, async db/)
  assert.match(repository,/set_config\('hh\.reiki_audio_owner','1',true\)/)
  assert.match(repository,/\{ server: true \}/)
  assert.doesNotMatch(publicRoute,/reiki_audio_metadata|metadata|register|archive|delete/)
})

test('Read label data only for exact folder; updates never move or overwrite media objects', () => {
  assert.match(repository,/where lesson_id=\$1 and locale=\$2 order by updated_at/)
  assert.match(repository,/validReikiIntroAudioPath\(path, lesson, locale\)/)
  assert.match(repository,/on conflict\(storage_scope,object_path\) do nothing/)
  assert.match(repository,/on conflict\(storage_scope,object_path\)/)
  assert.match(repository,/description=excluded\.description/)
  assert.match(repository,/delete from app_private\.reiki_intro_audio_metadata/)
  assert.doesNotMatch(repository,/storage\.remove|copy\(/)
  assert.match(store,/readReikiAudioMetadata\(config, lesson, locale\)/)
  assert.match(store,/files\.reduce\(\(sum, item\) => sum \+ item\.bytes, 0\)/)
  assert.match(store,/title: metadata\.get\(file\.storage/)
})

test('Three new actions verify actual storage object and require authenticated same-origin owner', () => {
  assert.match(ownerRoute,/requireAdminRequest\(\)/)
  assert.match(ownerRoute,/requireSameOrigin\(request, config\)/)
  for(const action of ['register','metadata','delete-draft']) {
    assert.match(ownerRoute,new RegExp("body\\?\\.action === '"+action+"'"))
  }
  assert.match(ownerRoute,/reikiIntroAudioRegister\(config, body\)/)
  assert.match(ownerRoute,/reikiIntroAudioEdit\(config, body\)/)
  assert.match(ownerRoute,/reikiIntroAudioDeleteDraft\(config, body\)/)
  assert.match(store,/const storage = await checkedDraftStorage\(config\)/)
  assert.match(store,/reikiIntroAudioDeleteDraft\(config/)
  assert.match(store,/REIKI_AUDIO_ARCHIVE_FIRST/)
  assert.match(store,/REIKI_AUDIO_ACTIVE_ON_SLIDE/)
  assert.match(store,/await storage\.remove\(\[path\]\)/)
  assert.doesNotMatch(store,/remove\(\[publishedPath\]\)|publicStorage\.remove/)
})

test('Archived audio cannot accidentally disappear from a live slide', () => {
  const name = reikiIntroAudioPath('initiation','en','a'.repeat(32),'audio/mpeg')
  assert.ok(validReikiIntroAudioPath(name,'initiation','en'))
  assert.ok(!validReikiIntroAudioPath(name,'initiation','ru'))
  const deletion = store.split('export async function reikiIntroAudioDeleteDraft')[1].split('export async function reikiIntroAudioPrepare')[0]
  assert.match(deletion,/confirmed !== true/)
  assert.match(deletion,/metadata\.get\('draft:' \+ path\)\?\.archived !== true/)
  assert.match(deletion,/manifest\.slots\[reikiIntroSlot\(lesson, locale\)\]\?\.path/)
  assert.match(deletion,/storage\.remove\(\[path\]\)/)
  assert.match(manager,/window\.confirm\(copy\.confirmDelete\)/)
  assert.match(manager,/editing\.storage==='draft'/)
  assert.match(manager,/item\.archived/)
})

test('Mobile UI manages several uploads, cancellation, private title and accessible editing', () => {
  assert.match(manager,/type="file" multiple/)
  assert.match(manager,/REIKI_AUDIO_MAX_BATCH/)
  assert.match(manager,/for \(const item of pendingFiles\)/)
  assert.match(manager,/cancelAfterCurrent\.current/)
  assert.match(manager,/action:'register'/)
  assert.match(manager,/reikiAudioUploadTitle\(item\.name\)/)
  assert.match(manager,/data-reiki-audio-editor/)
  assert.match(manager,/action:'metadata'/)
  assert.match(manager,/action:'delete-draft'/)
  assert.match(manager,/checked=\{showArchived\}/)
  assert.match(manager,/checked=\{editing\.archived\}/)
  assert.match(manager,/maxLength=\{REIKI_AUDIO_MAX_TITLE\}/)
  assert.match(manager,/maxLength=\{REIKI_AUDIO_MAX_DESCRIPTION\}/)
  assert.match(manager,/data-reiki-audio-folder-contents/)
  assert.match(manager,/role="status"/)
  assert.match(styles,/@media\(max-width:690px\)/)
  assert.match(styles,/metadataEditor/)
  assert.doesNotMatch(manager,/autoPlay|autoplay/)
})


test('An archived recording cannot be republished through a stale owner browser tab', () => {
  const start=store.indexOf('export async function reikiIntroAudioPublish')
  const end=store.indexOf('export async function reikiIntroAudioUnpublish',start)
  const code=store.slice(start,end)
  const archived=code.indexOf("metadata.get(source + ':' + path)?.archived === true")
  const copying=code.indexOf('originStorage.copy(path, publishedPath')
  const writing=code.indexOf('writeStoredManifest(publicStorage,')
  assert.ok(start > -1 && end > start && archived > -1)
  assert.ok(copying > archived, 'Guard before copying any archived private original')
  assert.ok(writing > archived, 'Guard before writing the learner publication manifest')
  assert.match(code,/REIKI_AUDIO_ARCHIVED/)
  assert.match(ownerRoute,/REIKI_AUDIO_ARCHIVED/)
  assert.match(manager,/copy\.archivePublishBlocked/)
  assert.match(manager,/disabled=\{!!busy \|\| !stagedUrl \|\| !metadataAvailable\}/)
})

test('Private deletion only reports success after confirmed Storage 404, not transient server error', () => {
  const block=store.split('export async function reikiIntroAudioDeleteDraft')[1]
    .split('export async function reikiIntroAudioPrepare')[0]
  assert.match(block,/storage\.remove\(\[path\]\)/)
  assert.match(block,/storage\.info\(path\)/)
  assert.match(block,/!missingObject\(checkError\)/)
  assert.ok(block.indexOf('storage.remove([path])') <
    block.indexOf('storage.info(path)',block.indexOf('storage.remove([path])')))
  assert.match(block,/failure\('REIKI_AUDIO_REMOVE_FAILED'\)/)
  assert.doesNotMatch(block,/publicStorage\.remove/)
  assert.doesNotMatch(block,/client-private-media/)
})

test('A temporary metadata database failure is visible and disables destructive editing', () => {
  assert.match(store,/metadataAvailable = false/)
  assert.match(store,/metadataAvailable,/)
  assert.match(manager,/setMetadataReady\(answer\.metadataAvailable!==false\)/)
  assert.match(manager,/metadataAvailable=\{metadataReady\}/)
  assert.match(manager,/role="alert" className=\{styles\.notice\}>\{t\.metadataUnavailable\}/)
  assert.match(manager,/className=\{styles\.editRecording\} disabled=\{!!busy \|\| !metadataAvailable\}/)
  assert.match(manager,/!metadataAvailable \|\| !window\.confirm\(copy\.confirmPublish\)/)
  assert.match(manager,/copy\.archiveCheckbox/)
  assert.doesNotMatch(manager,/editing\.archived \? <><RotateCcw/)
})

test('Approved private audio releases retain teacher titles without affecting student API', () => {
  const block=store.split('export async function reikiIntroAudioPublish')[1]
    .split('export async function reikiIntroAudioUnpublish')[0]
  const manifestWritten=block.indexOf('writeStoredManifest(publicStorage,')
  const labelSaved=block.indexOf("metadata.get('draft:' + path)?.title")
  assert.ok(manifestWritten>-1 && labelSaved>manifestWritten)
  assert.match(block,/storage: 'public', lesson, locale, title: label/)
  assert.match(block,/catch \{ \/\* publishing already succeeded \*\/ \}/)
  assert.doesNotMatch(publicRoute,/reiki-audio-metadata|storage\.list|private.*original/)
})

test('Current canonical Reiki course uses the complete 60-slide sequence', async () => {
  const {energyworkSequence}=await import('../data/academy/energywork-ai-schema.js')
  const ids=energyworkSequence()
  assert.equal(ids.length,60)
  assert.equal(new Set(ids).size,60)
  for(const id of ['flight-01','tan-01','kun-01','ygg-01','paths-01'])
    assert.ok(ids.includes(id))
})
