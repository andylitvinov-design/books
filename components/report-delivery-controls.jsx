'use client'

import { useActionState } from 'react'

function FormStatus({ state, locale }) {
  if (state?.error) return <p role="alert" className="assessment-error">{state.error}</p>
  if (state?.shareUrl)
    return (
      <div className="assessment-notice">
        <strong>{locale === 'ru' ? 'Новая приватная ссылка' : 'New private report link'}</strong>
        <p>{locale === 'ru' ? 'Показывается один раз. Скопируйте её сейчас.' : 'Shown once. Copy it now.'}</p>
        <p className="assessment-share-url"><a href={state.shareUrl} target="_blank" rel="noreferrer">{state.shareUrl}</a></p>
        <p>{locale === 'ru' ? 'Действует до' : 'Expires'}: {new Date(state.expiresAt).toLocaleString(locale)}</p>
      </div>
    )
  if (state?.saved) return <p role="status">{locale === 'ru' ? 'Изменение сохранено.' : 'Change saved.'}</p>
  return null
}

export function ReportDeliveryCreate({ action, locale = 'en' }) {
  const [state, submit, pending] = useActionState(action, {})
  return (
    <section className="assessment-notice">
      <h2>{locale === 'ru' ? 'Отправить только этот отчёт' : 'Share only this report'}</h2>
      <p>
        {locale === 'ru'
          ? 'Ссылка открывает только этот отчёт. Она не даёт доступ к остальному Client Cabinet.'
          : 'The link opens only this report. It does not grant access to the rest of the Client Cabinet.'}
      </p>
      <form action={submit} className="assessment-actions">
        <label>
          {locale === 'ru' ? 'Срок ссылки' : 'Link lifetime'}
          <select name="expiresInDays" defaultValue="30">
            <option value="1">1 {locale === 'ru' ? 'день' : 'day'}</option>
            <option value="7">7 {locale === 'ru' ? 'дней' : 'days'}</option>
            <option value="30">30 {locale === 'ru' ? 'дней' : 'days'}</option>
          </select>
        </label>
        <label className="hh-check">
          <input type="checkbox" name="saveAllowed" defaultChecked />
          {locale === 'ru' ? 'Разрешить сохранить этот отчёт в одном Google-кабинете' : 'Allow saving this report to one Google Cabinet'}
        </label>
        <button type="submit" disabled={pending}>
          {pending ? (locale === 'ru' ? 'Создаём…' : 'Creating…') : (locale === 'ru' ? 'Создать ссылку на отчёт' : 'Create report link')}
        </button>
      </form>
      <p className="assessment-notice">
        {locale === 'ru'
          ? 'Важно: любой, у кого есть полная ссылка, сможет прочитать этот отчёт до её отключения/истечения. При явном сохранении карточка клиента связывается с выбранным Google-аккаунтом, но остальные старые документы автоматически не открываются.'
          : 'Anyone with the complete link can read this report until it expires or is disabled. An explicit Save links the client profile to the chosen Google Account, but other legacy documents are not opened automatically.'}
      </p>
      <FormStatus state={state} locale={locale} />
    </section>
  )
}

export function ReportDeliveryGrant({ grant, rotateAction, stateAction, locale = 'en' }) {
  const [rotateState, rotateSubmit, rotating] = useActionState(rotateAction, {})
  const [state, stateSubmit, changing] = useActionState(stateAction, {})
  const active = grant.status === 'active'
  return (
    <article className="assessment-notice">
      <p>
        <strong>{active ? (locale === 'ru' ? 'Активная ссылка' : 'Active link') : grant.status}</strong>
        {' · '}
        {locale === 'ru' ? 'до' : 'until'} {new Date(grant.expires_at).toLocaleString(locale)}
        {' · '}
        {grant.save_allowed ? (locale === 'ru' ? 'можно сохранить' : 'save enabled') : (locale === 'ru' ? 'только просмотр' : 'view only')}
      </p>
      {grant.bound_account_id && (
        <p>{locale === 'ru' ? 'Этот отчёт уже закреплён за одним аккаунтом.' : 'This report is already bound to one account.'}</p>
      )}
      {active && !grant.bound_account_id && (
        <>
          <form action={rotateSubmit} className="assessment-actions">
            <select name="expiresInDays" defaultValue="30">
              <option value="1">1 {locale === 'ru' ? 'день' : 'day'}</option>
              <option value="7">7 {locale === 'ru' ? 'дней' : 'days'}</option>
              <option value="30">30 {locale === 'ru' ? 'дней' : 'days'}</option>
            </select>
            <button type="submit" disabled={rotating}>
              {locale === 'ru' ? 'Выпустить новую ссылку' : 'Rotate link'}
            </button>
          </form>
          <form action={stateSubmit} className="assessment-actions">
            <button name="operation" value="revoke" disabled={changing}>
              {locale === 'ru' ? 'Отключить приглашение' : 'Disable invitation'}
            </button>
            <button name="operation" value="withdraw" disabled={changing}>
              {locale === 'ru' ? 'Отозвать сам отчёт' : 'Withdraw report'}
            </button>
          </form>
        </>
      )}
      {grant.bound_account_id && grant.status !== 'withdrawn' && (
        <form action={stateSubmit} className="assessment-actions">
          <button name="operation" value="withdraw" disabled={changing}>
            {locale === 'ru' ? 'Отозвать сам отчёт' : 'Withdraw report'}
          </button>
        </form>
      )}
      <FormStatus state={rotateState?.shareUrl ? rotateState : state} locale={locale} />
    </article>
  )
}
