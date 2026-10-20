'use client'

import { useState } from 'react'
import { BookOpen, FolderOpen, ShieldCheck } from 'lucide-react'
import { SessionMaterialPicker } from './session-material-picker'
import styles from './client-session.module.css'

// Before a document exists, keep only selected IDs in the form.
// Server validates the catalog and stages them on the newly saved session.
export function NewReportMaterials({ locale = 'en' }) {
  const ru = locale === 'ru'
  const [selectedIds, setSelectedIds] = useState([])
  return <section id="report-video-materials-editor"
    className={styles.ownerReportMaterials + ' consultation-new-materials'}
    aria-labelledby="new-report-materials-title">
    <div className={styles.ownerMaterialsHeader}>
      <span className={styles.ownerMaterialsSymbol}><FolderOpen size={23} aria-hidden="true" /></span>
      <div>
        <span className={styles.eyebrow}>{ru ? 'КОНСТРУКТОР ОТЧЁТА' : 'REPORT BUILDER'}</span>
        <h2 id="new-report-materials-title">{ru ? 'Материалы из библиотеки' : 'Materials from library'}</h2>
        <p>{ru ? 'Выберите видео, фото и материалы для этого отчёта.' : 'Choose reusable videos, photos and resources for this report.'}</p>
      </div>
      <span className={styles.ownerMaterialsCount}>{ru ? 'Выбрано' : 'Selected'}: {selectedIds.length}</span>
    </div>
    <div className={styles.ownerMaterialsNotice}>
      <ShieldCheck size={18} aria-hidden="true" />
      {ru ? 'Материалы останутся приватным черновиком до вашей отдельной публикации.' :
        'Selected resources stay in a private draft until you explicitly publish the session.'}
    </div>
    <input type="hidden" form="consultation-report-form" name="materialIdsJson"
      value={JSON.stringify(selectedIds)} readOnly />
    <SessionMaterialPicker locale={locale} selectedIds={selectedIds} onChange={setSelectedIds} />
    <p className="consultation-new-materials-help">
      {ru ? 'Новое общее видео сначала сохраните в библиотеке мастера.' : 'Save a new reusable video to the practitioner library first.'}
      {' '}<a className="consultation-new-materials-link" href="/admin/materials"
        target="_blank" rel="noopener noreferrer">{ru ? 'Открыть библиотеку ↗' : 'Open library ↗'}</a>
    </p>
    <div className="consultation-new-materials-pending">
      <BookOpen size={18} aria-hidden="true" />
      <strong>{ru ? 'Личные фото, аудио и видео' : 'Personal photos, audio and video'}</strong>
      <span>{ru ? 'После сохранения откройте этот же редактор: появятся загрузка фото, запись вашего голоса и прикрепление личного видео.' :
        'Save the report first, then use this same editor to attach photos, record your voice and add personal videos.'}</span>
    </div>
  </section>
}
