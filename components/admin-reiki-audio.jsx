'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronRight, Check, FileAudio, Folder, FolderOpen, Headphones, RefreshCw, UploadCloud, Pencil, Archive, Trash2 } from 'lucide-react'
import {
  REIKI_INTRO_MAX_BYTES, REIKI_AUDIO_MAX_BATCH, REIKI_AUDIO_MAX_TITLE,
  REIKI_AUDIO_MAX_DESCRIPTION, reikiAudioUploadTitle, reikiIntroMime,
  reikiIntroPublicUrl, reikiIntroPublicObjectUrl, reikiIntroSlot,
} from '@/lib/academy/reiki-intro-audio-model'
import styles from './admin-reiki-audio.module.css'

const lessons = [
  { id: 'flight', number: 1, en: 'Flight to the Sun', ru: 'Полёт к Солнцу' },
  { id: 'tantra', number: 2, en: 'Tantra Reiki', ru: 'Тантра Рейки' },
  { id: 'kundalini', number: 3, en: 'Kundalini Reiki', ru: 'Кундалини Рейки' },
  { id: 'yggdrasil', number: 4, en: 'Reiki Yggdrasil', ru: 'Рейки Иггдрасиль' },
  { id: 'initiation', number: 5, en: 'Personal Initiation', ru: 'Личная инициация' },
]
const copy = {
  ru: {
    breadcrumbMaterials: 'Материалы', breadcrumbAudio: 'Аудио', course: 'Курс Reiki Practitioner',
    folderTitle: 'Папки уроков', lesson: 'Урок',
    language: 'Язык материала', languageHint: 'Выберите язык до загрузки. RU и EN хранятся отдельно.',
    intro: 'Выберите папку урока, затем язык записи. Можно хранить несколько аудиофайлов и отмечать один для воспроизведения ученику.',
    steps: 'Папка урока → RU / EN → загрузить → прослушать → опубликовать',
    published: 'На слайде', empty: 'Аудиовведение пока не выбрано',
    draft: 'Приватный оригинал', publishedFile: 'Публичная копия', preparing: 'Открываем защищённое аудио…',
    copyFailed: 'Не удалось создать публичную копию. Оригинал сохранён в приватной папке.',
    ready: 'Сохранено', noFiles: 'В этой папке пока нет записей на выбранном языке.',
    files: 'Аудиофайлы в папке', selectFile: 'Выбрать запись', selected: 'Выбрано',
    choice: 'Выбранная запись', current: 'Сейчас звучит на слайде',
    choose: 'Добавить новый аудиофайл', upload: 'Загрузить в папку',
    loading: 'Загрузка…', publish: 'Использовать на слайде',
    publishing: 'Публикуем…', uploadDone: 'Файл сохранён приватно. Прослушайте и отдельно опубликуйте копию для урока.',
    pickExisting: 'Запись выбрана. Можно прослушать и назначить на слайд.',
    confirmPublish: 'Создать публичную копию для учеников этого урока? Убедитесь, что запись не содержит конфиденциальных данных и её можно сделать общедоступной.',
    publishedDone: 'Запись назначена на слайд. Изменение станет видно после обновления страницы курса.',
    unpublish: 'Убрать со слайда', unpublishing: 'Убираем…',
    confirmUnpublish: 'Убрать запись со слайда? Оригинал сохранится, но ранее опубликованная публичная копия может остаться доступной по прямой ссылке.',
    removed: 'Аудио снято со слайда. Исходные файлы остались в папке.',
    unavailable: 'Аудиохранилище пока недоступно. Проверьте настройки доступа.',
    failed: 'Не получилось завершить действие. Проверьте подключение и повторите.',
    invalid: 'Используйте MP3, M4A или WAV размером от 512 байт до 20 МБ.',
    listen: 'Прослушать запись', localPreview: 'Прослушать выбранный файл с устройства',
    fileInfo: 'MP3 / M4A / WAV · максимум 20 МБ. Можно загружать несколько файлов в одну папку.',
    publicNote: 'Новые исходные записи остаются приватными. Только после вашего подтверждения создаётся публичная копия. Опубликованные версии доступны по ссылке; никогда не добавляйте данные клиентов.',
    viewCourse: 'Открыть курс', refresh: 'Обновить',
    refreshing: 'Обновляем список…', truncated: 'Показаны первые 100 файлов. Старые файлы остаются в хранилище.',
    edit: 'Название и описание', editTitle: 'Название записи', editDescription: 'Описание (необязательно)',
    save: 'Сохранить', saving: 'Сохраняем…', cancel: 'Отмена', saved: 'Название и настройки сохранены.',
    archive: 'В архив', restore: 'Вернуть из архива', archivedLabel: 'В архиве',
    archiveCheckbox: 'Хранить запись в архиве',
    archivePublishBlocked: 'Запись архивирована. Верните её из архива перед публикацией.',
    metadataUnavailable: 'Не удаётся загрузить названия и архив. Записи доступны, но редактирование и публикация временно заблокированы.',
    showArchived: 'Показывать архив', delete: 'Удалить оригинал навсегда',
    confirmDelete: 'Удалить этот архивный приватный файл навсегда? Восстановить его будет нельзя. Публичные копии остаются отдельно.',
    deleted: 'Приватный оригинал удалён.', activeDenied: 'Сначала снимите активную запись со слайда.',
    archiveFirst: 'Для удаления сначала сохраните запись в архиве.',
    bulkLimit: 'За один раз можно выбрать до 5 файлов (каждый до 20 МБ).',
    batchCount: 'Файлов выбрано', uploadProgress: 'Загружено файлов',
    uploadStopped: 'Загрузка остановлена после текущего файла.',
    stopBatch: 'Остановить после текущего', metadataWarning: 'Запись загружена, но её название пока не сохранено; можно изменить его позже.',
    storageUsage: 'В этой папке', incompleteUsage: 'Показаны не все файлы — размер указан только для отображаемых.',
    descriptionHint: 'Название и описание доступны только мастеру. Публикация аудио происходит отдельно.',
  },
  en: {
    breadcrumbMaterials: 'Materials', breadcrumbAudio: 'Audio', course: 'Reiki Practitioner course',
    folderTitle: 'Lesson folders', lesson: 'Lesson',
    language: 'Recording language', languageHint: 'Choose the language before uploading. RU and EN are kept separately.',
    intro: 'Choose a lesson folder, then a recording language. Keep several files and select one to play on the learner slide.',
    steps: 'Lesson folder → RU / EN → upload → listen → publish',
    published: 'On the slide', empty: 'No audio introduction is selected yet',
    draft: 'Private original', publishedFile: 'Public copy', preparing: 'Opening protected audio…',
    copyFailed: 'Could not create the public copy. The private original is safely stored.',
    ready: 'Saved', noFiles: 'This language folder does not have any recordings yet.',
    files: 'Audio recordings in this folder', selectFile: 'Select recording', selected: 'Selected',
    choice: 'Selected recording', current: 'Currently on the learner slide',
    choose: 'Add a new audio recording', upload: 'Upload to folder',
    loading: 'Uploading…', publish: 'Use on learner slide',
    publishing: 'Publishing…', uploadDone: 'Saved privately. Listen first, then approve a public copy for the slide.',
    pickExisting: 'Recording selected. Listen to it and choose whether to use it on the slide.',
    confirmPublish: 'Create a public copy for this lesson? Confirm that this recording has no confidential details and is suitable for public access.',
    publishedDone: 'Recording assigned to the slide. It will appear after the course page refreshes.',
    unpublish: 'Remove from slide', unpublishing: 'Removing…',
    confirmUnpublish: 'Remove audio from the slide? The original remains saved. A previously public copy may still be accessible via its direct link.',
    removed: 'Removed from the slide; uploaded originals remain in the folder.',
    unavailable: 'The audio store is not available. Check your account and storage settings.',
    failed: 'Unable to complete the action. Check the connection and retry.',
    invalid: 'Use MP3, M4A or WAV, between 512 bytes and 20 MB.',
    listen: 'Listen to recording', localPreview: 'Preview selected file from this device',
    fileInfo: 'MP3 / M4A / WAV · up to 20 MB. You can upload multiple files to the same folder.',
    publicNote: 'New originals remain private. Only your explicit approval creates a public copy. Published copies are accessible by direct URL; never upload client details.',
    viewCourse: 'Open the course', refresh: 'Refresh',
    refreshing: 'Refreshing files…', truncated: 'First 100 files shown. Older recordings remain stored.',
    edit: 'Title and notes', editTitle: 'Recording title', editDescription: 'Notes (optional)',
    save: 'Save', saving: 'Saving…', cancel: 'Cancel', saved: 'Title and settings saved.',
    archive: 'Archive', restore: 'Restore from archive', archivedLabel: 'Archived',
    archiveCheckbox: 'Keep this recording archived',
    archivePublishBlocked: 'This recording is archived. Restore it before publishing.',
    metadataUnavailable: 'Titles and archive data are unavailable. You can still access recordings, but editing and publication are temporarily disabled.',
    showArchived: 'Show archived', delete: 'Permanently delete original',
    confirmDelete: 'Permanently delete this archived private audio file? It cannot be recovered. Public copies are separate.',
    deleted: 'Private original deleted.', activeDenied: 'Remove the active track from the learner slide first.',
    archiveFirst: 'Archive and save the original before deleting.',
    bulkLimit: 'Choose up to 5 files at once (each up to 20 MB).',
    batchCount: 'Files selected', uploadProgress: 'Files uploaded',
    uploadStopped: 'Stopped after the current upload.',
    stopBatch: 'Stop after this file', metadataWarning: 'Audio uploaded, but its title was not saved. You can edit it later.',
    storageUsage: 'In this folder', incompleteUsage: 'Not all files are shown; size includes only displayed items.',
    descriptionHint: 'Names and notes are visible only to the owner. Publication is a separate action.',
  },
}

async function ownerRequest(body, lesson, locale) {
  const suffix = body ? '' : '?lesson=' + encodeURIComponent(lesson) + '&locale=' + encodeURIComponent(locale)
  const response = await fetch('/admin/reiki-audio/data' + suffix, {
    method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'OWNER_AUDIO_UNAVAILABLE')
  return data
}

function formatFileDate(value, locale) {
  if (!value) return locale === 'ru' ? 'Дата неизвестна' : 'Date unavailable'
  const timestamp = new Date(value)
  return Number.isNaN(timestamp.getTime()) ? '' :
    timestamp.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-CA',
      { dateStyle: 'medium', timeStyle: 'short' })
}
function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function LessonAudioCard({lesson,locale,origin,current,files,truncated,onChanged,setOperationBusy,copy,metadataAvailable=true}) {
  const [file,setFile] = useState(null)
  const [pendingFiles,setPendingFiles] = useState([])
  const [preview,setPreview] = useState(null)
  const [progress,setProgress] = useState('')
  const cancelAfterCurrent = useRef(false)
  const fileInputRef = useRef(null)
  const [editing,setEditing] = useState(null)
  const [showArchived,setShowArchived] = useState(false)
  const [staged,setStaged] = useState(null)
  const [busy,setBusy] = useState('')
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const publishedUrl = reikiIntroPublicUrl(origin,current,lesson.id,locale)
  const stagedUrl = staged
    ? (staged.previewUrl || (file && staged.fileName === file.name ? preview :
      staged.storage === 'public' ?
        reikiIntroPublicObjectUrl(origin,staged.path,lesson.id,locale) : null))
    : null

  const select = event => {
    const next = Array.from(event.target.files || [])
    setError('');setNotice('');setStaged(null);setProgress('')
    setFile(null);setPendingFiles([])
    if (!next.length) return
    if (next.length > REIKI_AUDIO_MAX_BATCH) {
      if (fileInputRef.current) fileInputRef.current.value=''
      setError(copy.bulkLimit);return
    }
    if (next.some(item => !reikiIntroMime(item.type,item.name) ||
      item.size < 512 || item.size > REIKI_INTRO_MAX_BYTES)) {
      if (fileInputRef.current) fileInputRef.current.value=''
      setError(copy.invalid);return
    }
    setPendingFiles(next)
    setFile(next[0])
  }

  async function upload() {
    if (!file || busy || !pendingFiles.length) return
    setOperationBusy(true);setBusy('upload');setError('');setNotice('')
    cancelAfterCurrent.current = false
    let saved = 0, metadataFailed = 0, last = null
    try {
      for (const item of pendingFiles) {
        if (cancelAfterCurrent.current) break
        const mime = reikiIntroMime(item.type,item.name)
        setProgress(copy.uploadProgress + ': ' + saved + '/' + pendingFiles.length)
        const {intent} = await ownerRequest({
          action:'prepare',lesson:lesson.id,locale,filename:item.name,mime,bytes:item.size,
        })
        if (!intent || intent.lesson !== lesson.id || intent.locale !== locale ||
          intent.bytes !== item.size || !intent.token || !intent.publishableKey ||
          intent.bucket !== 'hh-reiki-audio-drafts')
          throw new Error('INVALID_AUDIO_UPLOAD_INTENT')
        const storage = createClient(intent.supabaseUrl,intent.publishableKey,{
          auth:{persistSession:false,autoRefreshToken:false},
        }).storage.from(intent.bucket)
        const {error:uploadError} = await storage.uploadToSignedUrl(
          intent.path,intent.token,item,{contentType:intent.mime,upsert:false})
        if (uploadError) throw uploadError
        saved += 1
        last = {path:intent.path,fileName:item.name,storage:'draft'}
        setProgress(copy.uploadProgress + ': ' + saved + '/' + pendingFiles.length)
        try {
          await ownerRequest({
            action:'register',lesson:lesson.id,locale,path:intent.path,
            title:reikiAudioUploadTitle(item.name) || (locale === 'ru' ? 'Аудиозапись' : 'Audio recording'),
          })
        } catch {
          metadataFailed += 1
        }
      }
      await onChanged()
      if (saved === 1 && pendingFiles.length === 1 && last) setStaged(last)
      else {
        setFile(null);setStaged(null);setPendingFiles([])
        if (fileInputRef.current) fileInputRef.current.value=''
      }
      setNotice((cancelAfterCurrent.current ? copy.uploadStopped : copy.uploadDone) +
        ' · ' + copy.uploadProgress + ': ' + saved + '/' + pendingFiles.length +
        (metadataFailed ? ' · ' + copy.metadataWarning : ''))
    } catch {
      if (saved) await onChanged().catch(() => {})
      // Never silently re-upload completed files when the owner retries
      // after a partial network failure.
      if (saved) {
        const remaining = pendingFiles.slice(saved)
        setPendingFiles(remaining)
        setFile(remaining[0] || null)
        if (!remaining.length && fileInputRef.current) fileInputRef.current.value=''
      }
      setError(copy.failed + (saved ? ' · ' + copy.uploadProgress + ': ' + saved + '/' + pendingFiles.length : ''))
    } finally {
      setBusy('');setOperationBusy(false);cancelAfterCurrent.current = false
    }
  }

  async function chooseSaved(item) {
    if (busy) return
    setOperationBusy(true);setBusy('preview');setError('');setNotice('')
    try {
      const response = item.storage === 'draft'
        ? await ownerRequest({action:'preview',lesson:lesson.id,locale,path:item.path})
        : {previewUrl:reikiIntroPublicObjectUrl(origin,item.path,lesson.id,locale)}
      if (!response.previewUrl || new URL(response.previewUrl).origin !== origin)
        throw new Error('INVALID_REIKI_AUDIO_FILE')
      setFile(null)
      setStaged({path:item.path,fileName:null,storage:item.storage||'public',
        previewUrl:response.previewUrl})
      setNotice(copy.pickExisting)
    } catch {setError(copy.failed)}
    finally {setBusy('');setOperationBusy(false)}
  }

  async function publish() {
    if (!staged || busy || !metadataAvailable || !window.confirm(copy.confirmPublish)) return
    setOperationBusy(true);setBusy('publish');setError('');setNotice('')
    try {
      await ownerRequest({action:'publish',lesson:lesson.id,locale,path:staged.path,
        storage:staged.storage||'public'})
      await onChanged()
      setStaged(null);setFile(null);setPendingFiles([])
      if (fileInputRef.current) fileInputRef.current.value=''
      setNotice(copy.publishedDone)
    } catch (error) {
      setError(error?.message==='REIKI_AUDIO_ARCHIVED'?copy.archivePublishBlocked:
        error?.message==='REIKI_AUDIO_COPY_FAILED'?copy.copyFailed:copy.failed)
    }
    finally {setBusy('');setOperationBusy(false)}
  }

  async function unpublish() {
    if (!current || busy || !window.confirm(copy.confirmUnpublish)) return
    setOperationBusy(true);setBusy('unpublish');setError('');setNotice('')
    try {
      await ownerRequest({action:'unpublish',lesson:lesson.id,locale,confirmed:true})
      await onChanged()
      setNotice(copy.removed)
    } catch {setError(copy.failed)}
    finally {setBusy('');setOperationBusy(false)}
  }

  function editItem(item) {
    if (busy) return
    setEditing({
      path:item.path, storage:item.storage, title:item.title ||
        (locale === 'ru' ? 'Запись ' : 'Recording ') + item.path.split('/').pop()?.slice(0,8),
      description:item.description || '', archived:item.archived === true,
    })
    setError('');setNotice('')
  }
  async function saveMetadata(event) {
    event.preventDefault()
    if (!editing || busy) return
    setOperationBusy(true);setBusy('metadata');setError('');setNotice('')
    try {
      await ownerRequest({
        action:'metadata',lesson:lesson.id,locale,path:editing.path,storage:editing.storage,
        title:editing.title,description:editing.description,archived:editing.archived,
      })
      await onChanged()
      setEditing(null);setNotice(copy.saved)
    } catch (error) {
      setError(error?.message==='REIKI_AUDIO_ACTIVE_ON_SLIDE'?copy.activeDenied:copy.failed)
    } finally {setBusy('');setOperationBusy(false)}
  }
  async function deleteDraft(item) {
    if (busy || item.storage!=='draft' || !item.archived ||
        !window.confirm(copy.confirmDelete)) return
    setOperationBusy(true);setBusy('delete');setError('');setNotice('')
    try {
      await ownerRequest({
        action:'delete-draft',lesson:lesson.id,locale,path:item.path,confirmed:true,
      })
      if (staged?.path===item.path) setStaged(null)
      setEditing(null)
      await onChanged()
      setNotice(copy.deleted)
    } catch (error) {
      setError(error?.message==='REIKI_AUDIO_ACTIVE_ON_SLIDE'?copy.activeDenied:
        error?.message==='REIKI_AUDIO_ARCHIVE_FIRST'?copy.archiveFirst:copy.failed)
    } finally {setBusy('');setOperationBusy(false)}
  }
  const active = !!current
  const visibleFiles = files.filter(item => showArchived || !item.archived)
  const usageBytes = files.reduce((sum,item)=>sum+item.bytes,0)
  return <section className={styles.lessonCard} data-reiki-audio-lesson={lesson.id}>
    <header className={styles.lessonHead}>
      <div>
        <p className={styles.folderEyebrow}>{copy.lesson} {lesson.number} / 5 · {locale.toUpperCase()}</p>
        <h3>{lesson[locale]}</h3>
      </div>
      <span className={active ? styles.live : styles.notLive}>{active ? copy.published : copy.empty}</span>
    </header>
    {publishedUrl ? <div className={styles.player} data-reiki-audio-published>
      <span><Check size={15} aria-hidden="true"/>{copy.current}</span>
      <audio controls preload="none" src={publishedUrl} aria-label={copy.listen+' — '+lesson[locale]}/>
      <button type="button" className={styles.textDanger} disabled={!!busy} onClick={unpublish}>
        {busy==='unpublish'?copy.unpublishing:copy.unpublish}
      </button>
    </div> : null}

    <div className={styles.fileList} data-reiki-audio-folder-contents>
      <div className={styles.fileListHeading}>
        <h4><FileAudio size={17} aria-hidden="true"/>{copy.files}</h4>
        <span>{visibleFiles.length} / {files.length}</span>
      </div>
      <div className={styles.folderControls}>
        <small>{copy.storageUsage}: {files.length} · {formatBytes(usageBytes)}</small>
        <label className={styles.archivedToggle}>
          <input type="checkbox" checked={showArchived} onChange={event=>setShowArchived(event.target.checked)}/>
          {copy.showArchived}
        </label>
      </div>
      {!visibleFiles.length ? <p className={styles.folderEmpty}>{copy.noFiles}</p> : <div className={styles.files}>
        {visibleFiles.map((item)=>{
          const isActive = item.storage === 'public' && item.path === current?.path
          const isSelected = item.path === staged?.path && item.storage === staged?.storage
          return <div key={item.storage+':'+item.path} className={styles.fileRow + (isSelected? ' '+styles.fileRowSelected:'')}
            data-reiki-audio-file={item.path} data-file-on-slide={isActive?'true':'false'}>
            <span className={styles.fileIcon}><FileAudio size={18} aria-hidden="true"/></span>
            <div className={styles.fileDetails}>
              <strong>{item.title || ((locale==='ru'?'Запись':'Recording')+' · '+item.path.split('/').pop()?.slice(0,8).toUpperCase())}</strong>
              <small>{formatFileDate(item.createdAt,locale)} · {formatBytes(item.bytes)} · {item.path.slice(-3).toUpperCase()}</small>
              <small>{item.storage === 'draft' ? copy.draft : copy.publishedFile}{item.archived ? ' · '+copy.archivedLabel : ''}</small>
              {item.description ? <small>{item.description}</small> : null}
            </div>
            <div className={styles.fileActions}>
              {isActive ? <span className={styles.fileActive}><Check size={13} aria-hidden="true"/>{copy.published}</span> :
                <button type="button" disabled={!!busy || item.archived}
                  className={styles.selectRecording} aria-pressed={isSelected}
                  onClick={()=>void chooseSaved(item)}>{busy==='preview'&&isSelected?copy.preparing:
                    (isSelected ? copy.selected:copy.selectFile)}</button>}
              <button type="button" className={styles.editRecording} disabled={!!busy || !metadataAvailable}
                onClick={()=>editItem(item)} aria-label={copy.edit+' — '+(item.title||item.path)}>
                <Pencil size={15} aria-hidden="true"/>{copy.edit}
              </button>
            </div>
          </div>
        })}
      </div>}
      {truncated ? <p className={styles.notice}>{copy.truncated} {copy.incompleteUsage}</p> : null}
    </div>

    {editing ? <form className={styles.metadataEditor} onSubmit={saveMetadata} data-reiki-audio-editor>
      <strong>{copy.edit}</strong>
      <label>{copy.editTitle}
        <input type="text" required maxLength={REIKI_AUDIO_MAX_TITLE}
          value={editing.title} disabled={!!busy}
          onChange={event=>setEditing({...editing,title:event.target.value})}/>
      </label>
      <label>{copy.editDescription}
        <textarea rows={2} maxLength={REIKI_AUDIO_MAX_DESCRIPTION}
          value={editing.description} disabled={!!busy}
          onChange={event=>setEditing({...editing,description:event.target.value})}/>
      </label>
      <label className={styles.archivedToggle}>
        <input type="checkbox" checked={editing.archived} disabled={!!busy || !metadataAvailable}
          onChange={event=>setEditing({...editing,archived:event.target.checked})}/>
        <Archive size={15} aria-hidden="true"/>{copy.archiveCheckbox}
      </label>
      <p className={styles.fileHint}>{copy.descriptionHint}</p>
      <div className={styles.editorActions}>
        <button type="submit" disabled={!!busy || !editing.title.trim()}>
          {busy==='metadata'?copy.saving:copy.save}
        </button>
        <button type="button" disabled={!!busy} onClick={()=>setEditing(null)}>{copy.cancel}</button>
        {editing.storage==='draft' && editing.archived &&
          files.some(item=>item.path===editing.path && item.storage==='draft' && item.archived) ?
          <button type="button" className={styles.dangerButton}
            disabled={!!busy} onClick={()=>void deleteDraft(editing)}>
            <Trash2 size={15} aria-hidden="true"/>{copy.delete}
          </button> : null}
      </div>
    </form> : null}

    {staged ? <div className={styles.reviewPanel} data-reiki-audio-selection>
      <strong>{copy.choice}</strong>
      {stagedUrl ? <audio controls preload="none" src={stagedUrl}
        aria-label={copy.listen+' — '+lesson[locale]}/> : null}
      <button type="button" className={styles.publish} disabled={!!busy || !stagedUrl || !metadataAvailable}
        onClick={publish}>{busy==='publish'?copy.publishing:copy.publish}</button>
    </div> : null}

    <div className={styles.uploadPanel}>
      <label className={styles.filePicker}>
        <span><UploadCloud size={16} aria-hidden="true"/>{copy.choose}</span>
        <input ref={fileInputRef} type="file" multiple accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav"
          onChange={select} disabled={!!busy}/>
      </label>
      {preview && !staged ? <div className={styles.player}>
        <span>{copy.localPreview} · {file?.name}</span>
        <audio controls preload="none" src={preview} aria-label={copy.localPreview}/>
      </div> : null}
      {pendingFiles.length>1 ? <strong className={styles.fileHint}>
        {copy.batchCount}: {pendingFiles.length} / {REIKI_AUDIO_MAX_BATCH}
      </strong> : null}
      {progress ? <p className={styles.progress} role="status">{progress}</p> : null}
      <div className={styles.uploadActions}>
        <button type="button" className={styles.uploadButton} disabled={!file || !!busy || !!staged}
          onClick={upload}><UploadCloud size={18} aria-hidden="true"/>{busy==='upload'?copy.loading:copy.upload}</button>
        {busy==='upload' && pendingFiles.length>1 ?
          <button type="button" className={styles.stopUpload} onClick={()=>{cancelAfterCurrent.current=true}}>
            {copy.stopBatch}
          </button> : null}
      </div>
      <small className={styles.fileHint}>{copy.fileInfo} {copy.bulkLimit}</small>
    </div>
    {notice ? <p className={styles.success} role="status">{notice}</p> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </section>
}

export default function AdminReikiAudio({initialLocale='ru',initialLesson='flight'}) {
  const [locale,setLocale] = useState(initialLocale==='ru'?'ru':'en')
  const [selectedLesson,setSelectedLesson] = useState(
    lessons.some(item=>item.id===initialLesson)?initialLesson:'flight')
  const [manifest,setManifest] = useState({version:1,slots:{}})
  const [origin,setOrigin] = useState('')
  const [files,setFiles] = useState([])
  const [truncated,setTruncated] = useState(false)
  const [ready,setReady] = useState(false)
  const [metadataReady,setMetadataReady] = useState(true)
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const [locked,setLocked] = useState(false)
  const [error,setError] = useState('')
  const requestNumber = useRef(0)
  const t=copy[locale]

  const refresh = useCallback(async (lesson,language) => {
    const current = ++requestNumber.current
    setRefreshing(true)
    try {
      const answer = await ownerRequest(null,lesson,language)
      if (current !== requestNumber.current) return
      setManifest(answer.manifest||{version:1,slots:{}})
      setFiles(Array.isArray(answer.files)?answer.files:[])
      setTruncated(answer.truncated===true)
      setOrigin(answer.storageOrigin||'')
      setReady(answer.configured===true)
      setMetadataReady(answer.metadataAvailable!==false)
      setError('')
    } catch {
      if (current !== requestNumber.current) return
      setReady(false);setMetadataReady(false);setError(copy[language].unavailable)
    } finally {
      if (current===requestNumber.current) {
        setLoading(false);setRefreshing(false)
      }
    }
  }, [])

  useEffect(()=>{
    void refresh(selectedLesson,locale)
    return ()=>{requestNumber.current += 1}
  },[selectedLesson,locale,refresh])

  function replaceUrl(lesson,language) {
    const url=new URL(window.location.href)
    url.searchParams.set('lesson',lesson)
    url.searchParams.set('lang',language)
    window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash)
  }
  function chooseLesson(lesson) {
    if (locked || selectedLesson===lesson) return
    setFiles([]);setTruncated(false);setSelectedLesson(lesson);replaceUrl(lesson,locale)
  }
  function chooseLanguage(language) {
    if (locked || locale===language) return
    setFiles([]);setTruncated(false);setLocale(language);replaceUrl(selectedLesson,language)
  }

  const chosen=lessons.find(item=>item.id===selectedLesson)||lessons[0]
  const active=manifest.slots?.[reikiIntroSlot(selectedLesson,locale)]||null
  return <div className={styles.page} data-reiki-intro-audio-manager data-materials-reiki-folder-view>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link href="/admin/materials">{t.breadcrumbMaterials}</Link><ChevronRight size={15} aria-hidden="true"/>
      <Link href="/admin/materials/audio">{t.breadcrumbAudio}</Link><ChevronRight size={15} aria-hidden="true"/>
      <span>{t.course}</span>
    </nav>
    <header className={styles.courseHeader}>
      <div className={styles.courseHeading}>
        <span className={styles.courseIcon}><Headphones size={25} aria-hidden="true"/></span>
        <div><h2>{t.course}</h2><p>{t.intro}</p></div>
      </div>
      <div className={styles.langPanel} data-reiki-audio-language-toggle>
        <strong>{t.language}</strong>
        <div className={styles.localeToggle} role="group" aria-label={t.language}>
          <button type="button" aria-pressed={locale==='ru'} disabled={locked}
            onClick={()=>chooseLanguage('ru')}>RU · Русский</button>
          <button type="button" aria-pressed={locale==='en'} disabled={locked}
            onClick={()=>chooseLanguage('en')}>EN · English</button>
        </div>
        <small>{t.languageHint}</small>
      </div>
    </header>
    <p className={styles.process}>{t.steps}</p>
    <div className={styles.workspace}>
      <aside className={styles.lessonFolders} aria-label={t.folderTitle} data-reiki-lesson-folders>
        <h3><FolderOpen size={19} aria-hidden="true"/>{t.folderTitle}</h3>
        <div className={styles.folderButtons}>
          {lessons.map(lesson=>{
            const open=lesson.id===selectedLesson
            const ruPublished=!!manifest.slots?.[reikiIntroSlot(lesson.id,'ru')]
            const enPublished=!!manifest.slots?.[reikiIntroSlot(lesson.id,'en')]
            return <button type="button" key={lesson.id}
              className={styles.lessonFolder + (open?' '+styles.lessonFolderOpen:'')}
              aria-pressed={open} disabled={locked}
              onClick={()=>chooseLesson(lesson.id)} data-reiki-lesson-folder={lesson.id}>
              <span className={styles.lessonFolderIcon}>{open?<FolderOpen size={21} aria-hidden="true"/>:
                <Folder size={21} aria-hidden="true"/>}</span>
              <span className={styles.lessonFolderText}>
                <small>{t.lesson} {lesson.number}</small><strong>{lesson[locale]}</strong>
                <span className={styles.languageIndicators} aria-label={'RU: '+(ruPublished?t.published:t.empty)+'. EN: '+(enPublished?t.published:t.empty)}>
                  <i data-ready={ruPublished?'true':'false'}>RU {ruPublished?'✓':'–'}</i>
                  <i data-ready={enPublished?'true':'false'}>EN {enPublished?'✓':'–'}</i>
                </span>
              </span>
              <ChevronRight className={styles.lessonChevron} size={17} aria-hidden="true"/>
            </button>
          })}
        </div>
      </aside>
      <section className={styles.folderContents} data-open-reiki-lesson={chosen.id}
        aria-label={t.lesson+' '+chosen.number+' — '+chosen[locale]}>
        {loading ? <p role="status">{t.refreshing}</p> :
          !ready ? <p role="alert" className={styles.error}>{error||t.unavailable}</p> :
          <>
            <div className={styles.folderToolbar}>
              <span>{t.breadcrumbAudio} / {t.course} / {t.lesson} {chosen.number} / {locale.toUpperCase()}</span>
              <button type="button" onClick={()=>void refresh(selectedLesson,locale)}
                disabled={refreshing||locked}><RefreshCw size={15} aria-hidden="true"/>{t.refresh}</button>
            </div>
            {refreshing ? <p className={styles.refreshing} role="status">{t.refreshing}</p> : null}
            {!metadataReady ? <p role="alert" className={styles.notice}>{t.metadataUnavailable}</p> : null}
            <LessonAudioCard key={chosen.id+':'+locale} lesson={chosen} locale={locale} origin={origin}
              current={active} files={files} truncated={truncated} copy={t}
              metadataAvailable={metadataReady}
              onChanged={()=>refresh(chosen.id,locale)} setOperationBusy={setLocked}/>
          </>}
      </section>
    </div>
    <p className={styles.privacyNote}>{t.publicNote}</p>
    <Link className={styles.courseLink}
      href={'/'+locale+'/academy/principles-of-energywork/learn'} target="_blank"
      rel="noopener noreferrer">{t.viewCourse} ↗</Link>
  </div>
}
