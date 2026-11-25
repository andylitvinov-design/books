import 'server-only'
import { transaction } from '../app/database.js'
import { validReikiIntroAudioPath, reikiIntroSlot, reikiAudioValidMetadataInput } from './reiki-intro-audio-model.js'

// Private Postgres metadata is never exposed to students. Each entrypoint
// requires owner auth in the route; the database also checks this local flag.
async function withOwnerMetadata(config, callback) {
  return transaction(config, null, async db => {
    await db.query("select set_config('hh.reiki_audio_owner','1',true)")
    return callback(db)
  }, { server: true })
}

function checkPath(path, storage, lesson, locale) {
  if (!reikiIntroSlot(lesson, locale) || !validReikiIntroAudioPath(path, lesson, locale) ||
      !['draft','public'].includes(storage)) {
    const error = new Error('INVALID_REIKI_AUDIO_FILE')
    error.code = 'INVALID_REIKI_AUDIO_FILE'
    throw error
  }
}

export async function readReikiAudioMetadata(config, lesson, locale) {
  if (!reikiIntroSlot(lesson, locale)) return new Map()
  const rows = await withOwnerMetadata(config, async db =>
    (await db.query(
      "select storage_scope, object_path, title, description, archived "+
      "from app_private.reiki_intro_audio_metadata "+
      "where lesson_id=$1 and locale=$2 order by updated_at desc limit 250",
      [lesson, locale],
    )).rows)
  return new Map(rows.map(item => [item.storage_scope + ':' + item.object_path, {
    title: item.title,
    description: item.description,
    archived: item.archived === true,
  }]))
}

export async function registerReikiAudioMetadata(config, { path, storage = 'draft', lesson, locale, title } = {}) {
  checkPath(path, storage, lesson, locale)
  if (!reikiAudioValidMetadataInput({ title, description: '' })) {
    const error = new Error('INVALID_REIKI_AUDIO_TITLE')
    error.code = 'INVALID_REIKI_AUDIO_TITLE'
    throw error
  }
  const row = await withOwnerMetadata(config, async db =>
    (await db.query(
      "insert into app_private.reiki_intro_audio_metadata "+
      "(storage_scope,object_path,lesson_id,locale,title,description,archived) "+
      "values($1,$2,$3,$4,$5,'',false) "+
      "on conflict(storage_scope,object_path) do nothing "+
      "returning title, description, archived",
      [storage, path, lesson, locale, title],
    )).rows[0])
  return row || { title, description: '', archived: false }
}

export async function saveReikiAudioMetadata(config, {
  path, storage = 'draft', lesson, locale, title, description = '', archived = false,
} = {}) {
  checkPath(path, storage, lesson, locale)
  if (!reikiAudioValidMetadataInput({ title, description, archived })) {
    const error = new Error('INVALID_REIKI_AUDIO_METADATA')
    error.code = 'INVALID_REIKI_AUDIO_METADATA'
    throw error
  }
  return withOwnerMetadata(config, async db => {
    const row = (await db.query(
      "insert into app_private.reiki_intro_audio_metadata "+
      "(storage_scope,object_path,lesson_id,locale,title,description,archived) "+
      "values($1,$2,$3,$4,$5,$6,$7) "+
      "on conflict(storage_scope,object_path) "+
      "do update set title=excluded.title, description=excluded.description, "+
      "archived=excluded.archived, updated_at=now() "+
      "returning title,description,archived",
      [storage, path, lesson, locale, title, description, archived],
    )).rows[0]
    return { title: row.title, description: row.description, archived: row.archived }
  })
}

export async function deleteReikiAudioMetadata(config, { path, lesson, locale } = {}) {
  checkPath(path, 'draft', lesson, locale)
  await withOwnerMetadata(config, async db => db.query(
    "delete from app_private.reiki_intro_audio_metadata "+
    "where storage_scope='draft' and object_path=$1 and lesson_id=$2 and locale=$3",
    [path, lesson, locale],
  ))
  return true
}
