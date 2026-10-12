'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { appFetch } from '@/lib/app/client-fetch'
import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import { ratingCopy } from '@/lib/assessments/test-ratings'
import styles from './test-rating.module.css'

// A new result mounts a fresh editor; a slow request from the old result cannot
// replace the new result's rating or announce a successful save on its behalf.
export function TestRating({ result, locale = 'en', audience = 'account', onSaveResult, disabled = false }) {
  if (!result?.id) return null
  const canRate = buildAssessmentResultReport(result, locale).status === 'available'
  if (audience !== 'account' && !canRate) return null
  return <RatingEditor canRate={canRate} key={result.id + ':' + audience} result={result} locale={locale} audience={audience} onSaveResult={onSaveResult} disabled={disabled} />
}
function RatingEditor({ result, locale, audience, onSaveResult, disabled, canRate }) {
  const c = ratingCopy(locale), id = useId()
  const [value, setValue] = useState(null), [saved, setSaved] = useState(null)
  const [revision, setRevision] = useState(0), [state, setState] = useState('loading')
  const [notice, setNotice] = useState(''), [reload, setReload] = useState(0)
  const busy = useRef(false), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (audience !== 'account') return
    let cancelled = false
    setState('loading'); setNotice('')
    appFetch(`results/${encodeURIComponent(result.id)}/rating`).then(data => {
      if (cancelled) return
      setSaved(data.stars); setValue(data.stars); setRevision(data.revision); setState('ready')
    }).catch(() => { if (!cancelled) setState('unavailable') })
    return () => { cancelled = true }
  }, [result.id, audience, reload])
  const allowRate = canRate && state !== 'interpretation-unavailable'
  async function submit(event, remove = false) {
    event.preventDefault()
    if (busy.current || !(state === 'ready' || (remove && state === 'interpretation-unavailable')) || (!remove && (!value || !allowRate))) return
    busy.current = true; setState('saving'); setNotice('')
    try {
      const body = remove ? { expectedRevision: revision } : { stars: value, expectedRevision: revision, uiLocale: locale === 'ru' ? 'ru' : 'en' }
      const data = await appFetch(`results/${encodeURIComponent(result.id)}/rating`, body, remove ? 'DELETE' : 'POST')
      if (!mounted.current) return
      setSaved(data.stars); setValue(data.stars); setRevision(data.revision); setState(remove && !allowRate ? 'interpretation-unavailable' : 'ready'); setNotice(remove ? 'removed' : 'saved')
      window.dispatchEvent(new Event('hh-test-ratings-updated'))
    } catch (error) {
      if (!mounted.current) return
      if (error.code === 'INTERPRETATION_UNAVAILABLE') { setState('interpretation-unavailable'); setNotice('') }
      else { setState(error.code === 'RATING_CONFLICT' ? 'conflict' : 'ready'); setNotice(error.code === 'RATING_CONFLICT' ? 'conflict' : 'error') }
    } finally { busy.current = false }
  }
  // A withdrawn interpretation permits only reading/removing an existing vote.
  // Do not offer a new star form or a guest prompt until an interpretation exists.
  if (audience === 'account' && !allowRate && !saved) return null
  return <section className={styles.rating} data-test-rating aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{allowRate ? c.title : c.savedTitle}</h2><p id={`${id}-note`}>{allowRate ? c.note : c.manageOnly}</p>
    {audience !== 'account' ? <><p>{c.guest}</p>{onSaveResult && <button type="button" disabled={disabled} onClick={onSaveResult}>{c.guestAction}</button>}</> : <>
      {state === 'loading' && <p role="status">{c.loading}</p>}
      {!allowRate ? <div><p>{c.choose}: {saved} / 5</p><button type="button" disabled={!['ready', 'interpretation-unavailable'].includes(state)} onClick={event => submit(event, true)}>{c.remove}</button></div>
      : state === 'unavailable' ? <p role="status">{c.unavailable}</p> : <form onSubmit={submit} aria-describedby={`${id}-note ${id}-privacy`}>
        <fieldset disabled={state !== 'ready'} className={styles.fieldset}>
          <legend>{c.choose}</legend><div className={styles.stars}>
            {[1, 2, 3, 4, 5].map(stars => <label className={styles.star} key={stars} data-filled={value >= stars}>
              <input type="radio" name={`${id}-stars`} value={stars} checked={value === stars} onChange={() => { setValue(stars); setNotice('') }} aria-label={`${stars} ${c.star}`} />
              <span aria-hidden="true">★</span>
            </label>)}
          </div>
        </fieldset>
        <div className={styles.actions}><button type="submit" disabled={state !== 'ready' || !value || value === saved}>{state === 'saving' ? c.saving : saved ? c.update : c.save}</button>
        {saved && <button type="button" disabled={state !== 'ready'} onClick={event => submit(event, true)}>{c.remove}</button>}</div>
      </form>}
      {state === 'interpretation-unavailable' && <button type="button" onClick={() => window.location.reload()}>{c.reloadResult}</button>}
      {(state === 'unavailable' || state === 'conflict') && <button type="button" onClick={() => setReload(current => current + 1)}>{c.reload}</button>}
      <p role={notice === 'error' || notice === 'conflict' ? 'alert' : 'status'} aria-live="polite">{notice ? c[notice] : ''}</p>
    </>}
    <p id={`${id}-privacy`} className={styles.privacy}>{c.privacy}</p>
  </section>
}
export function TestRatingSummary({ summary, locale = 'en', unavailable = false, loading = false }) {
  const c = ratingCopy(locale)
  if (loading || unavailable) return null
  return <p className={styles.summary} data-test-rating-summary>
    {unavailable ? c.unavailable : summary ? <><span aria-hidden="true">★ </span>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(summary.average)} / 5 · {summary.count} {c.votes}{!summary.ranked && <span> · {c.few}</span>}</> : c.empty}
  </p>
}
export function TestRatingSort({ value, onChange, locale = 'en', unavailable = false, loading = false, onChooseTop, topCount = 0 }) {
  const c = ratingCopy(locale)
  return <div className={styles.sort}><label>{c.sort}<select value={value} onChange={event => onChange(event.target.value)}>
    <option value="recommended">{c.recommended}</option><option value="rating" disabled={unavailable || loading}>{c.top}</option>
  </select></label>{value === 'rating' && <><p>{c.method}</p>{onChooseTop && <button type="button" onClick={onChooseTop} disabled={unavailable || loading || !topCount}>{c.chooseTop}</button>}{!unavailable && !loading && !topCount && <p>{c.notEnough}</p>}</>}{unavailable && <p role="status">{c.unavailable}</p>}</div>
}
