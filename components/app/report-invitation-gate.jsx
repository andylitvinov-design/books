'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './report-invitation-gate.module.css'

const COPY = {
  en: {
    private: 'HOLISTIC HOUSE · PRIVATE',
    reportTitle: 'Your personal report is ready',
    documentTitle: 'A private document for you',
    reportText: 'You have received a private report from Andrii Litvinov.',
    documentText: 'You have received a private document from Andrii Litvinov.',
    saveText: 'Sign in with Google to save this item in your own Cabinet. It will open there automatically after saving.',
    readText: 'You can also view this item without saving it.',
    viewReport: 'View report without saving',
    viewDocument: 'View document without saving',
    onlyView: 'This invitation allows viewing only.',
  },
  ru: {
    private: 'HOLISTIC HOUSE · ЛИЧНО И КОНФИДЕНЦИАЛЬНО',
    reportTitle: 'Ваш личный отчёт готов',
    documentTitle: 'Для вас подготовлен личный документ',
    reportText: 'Вы получили личный отчёт от Андрея Литвинова.',
    documentText: 'Вы получили личный документ от Андрея Литвинова.',
    saveText: 'Войдите через Google, чтобы сохранить этот документ в своём кабинете. После сохранения он откроется автоматически.',
    readText: 'Вы также можете просмотреть документ без сохранения.',
    viewReport: 'Посмотреть отчёт без сохранения',
    viewDocument: 'Посмотреть документ без сохранения',
    onlyView: 'Для этой ссылки доступен только просмотр.',
  },
}

// Visual blur is a presentation step, not authentication. The parent must
// first authorize the individual private link on the server or exchange the
// fragment into a scoped HttpOnly viewer session.
export function ReportInvitationGate({ locale = 'en', kind = 'report', saveAction = null, viewPdfHref = null, onViewed = null, children }) {
  const [viewing, setViewing] = useState(false)
  const dialogRef = useRef(null)
  const titleId = 'hh-report-invitation-title'
  const c = COPY[locale] || COPY.en
  const isReport = kind === 'report'

  function openReport() {
    setViewing(true)
    onViewed?.()
  }

  useEffect(() => {
    if (viewing) return undefined
    const previous = document.activeElement
    dialogRef.current?.querySelector('button:not([disabled])')?.focus()
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [viewing])

  function handleDialogKeys(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      openReport()
      return
    }
    if (event.key !== 'Tab') return
    const controls = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), a[href]') || [])]
    if (!controls.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={styles.shell}>
      <div className={viewing ? styles.content : styles.contentBlurred} inert={!viewing} aria-hidden={!viewing}>
        {children}
      </div>
      {!viewing && (
        <div className={styles.backdrop}>
          <section
            className={styles.dialog}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={handleDialogKeys}
          >
            <p className={styles.eyebrow}>{c.private}</p>
            <div className={styles.symbol} aria-hidden="true">✦</div>
            <h1 id={titleId}>{isReport ? c.reportTitle : c.documentTitle}</h1>
            <p className={styles.lead}>{isReport ? c.reportText : c.documentText}</p>
            <p className={styles.description}>{saveAction ? c.saveText : c.onlyView}</p>
            {saveAction && <div className={styles.saveAction}>{saveAction}</div>}
            {viewPdfHref ? (
              <a className={styles.viewButton} href={viewPdfHref}>
                {isReport ? c.viewReport : c.viewDocument}
              </a>
            ) : (
              <button
                type="button"
                className={styles.viewButton}
                onClick={openReport}
              >
                {isReport ? c.viewReport : c.viewDocument}
              </button>
            )}
            <p className={styles.readNote}>{c.readText}</p>
          </section>
        </div>
      )}
    </div>
  )
}
