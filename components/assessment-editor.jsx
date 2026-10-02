'use client'
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { assessmentText } from '@/lib/clients/assessment-copy'
export function AssessmentEditor({ action, record, requestId, documents, locale = 'en', kind = 'test' }) {
  const [state, submit, pending] = useActionState(action, { error: '' })
  const t = assessmentText(locale)
  return <form action={submit} className="assessment-form">
    {requestId && <input type="hidden" name="requestId" value={requestId} />}
    {record && <input type="hidden" name="expectedRevision" value={record.revision} />}
    <label>{t.recordTitle}<input name="title" required maxLength={200} defaultValue={record?.title ?? ''} /></label>
    <label>{t.kind}<select name="kind" defaultValue={record?.kind ?? kind}><option value="test">{t.testOption}</option><option value="research_result">{t.resultOption}</option></select></label>
    <label>{t.date}<input name="occurredOn" type="date" required defaultValue={record?.occurredOn ?? ''} /></label>
    <label>{t.language}<select name="language" defaultValue={record?.language ?? locale}><option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option><option value="other">{t.other}</option></select></label>
    <label>{t.source}<input name="sourceName" maxLength={200} defaultValue={record?.sourceName ?? ''} /></label>
    <label>{t.version}<input name="sourceVersion" maxLength={200} defaultValue={record?.sourceVersion ?? ''} /></label>
    <label>{t.description}<textarea name="description" maxLength={10000} defaultValue={record?.description ?? ''} /></label>
    <label>{t.original}<textarea name="originalResult" maxLength={10000} defaultValue={record?.originalResult ?? ''} /></label>
    <label>{t.comment}<textarea name="practitionerComment" maxLength={10000} defaultValue={record?.practitionerComment ?? ''} /></label>
    <fieldset><legend>{t.related}</legend>{documents.length ? documents.map(doc => <label key={doc.id} className="assessment-document-choice"><input name="relatedDocumentIds" type="checkbox" value={doc.id} defaultChecked={record?.relatedDocumentIds?.includes(doc.id) ?? false} />{doc.label}</label>) : <p>{t.noDocs}</p>}</fieldset>
    <p className="assessment-notice">{t.draftNotice}</p>
    {state?.error && <p role="alert" className="assessment-error">{state.error}</p>}
    <button disabled={pending} type="submit">{pending ? t.saving : t.save}</button>
  </form>
}
export function AssessmentStateActions({ action, status, revision, locale = 'en' }) {
  const [state, submit, pending] = useActionState(action, { error: '' })
  const router = useRouter()
  useEffect(() => { if (state?.savedRevision) router.refresh() }, [router, state?.savedRevision])
  const t = assessmentText(locale)
  if (status === 'archived') return <p className="assessment-notice">{t.archiveNotice}</p>
  return <form action={submit}>
    <input type="hidden" name="expectedRevision" value={revision} />
    {status === 'shared' && <p className="assessment-notice">{t.sharedNotice}</p>}
    <div className="assessment-actions">
      {status === 'draft' && <button name="operation" value="share" disabled={pending}>{t.share}</button>}
      {status === 'shared' && <button name="operation" value="unshare" disabled={pending}>{t.unshare}</button>}
      <button name="operation" value="archive" disabled={pending}>{t.archive}</button>
    </div>
    {state?.error && <p role="alert" className="assessment-error">{state.error}</p>}
  </form>
}
