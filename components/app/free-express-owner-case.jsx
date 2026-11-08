'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import FreeExpressOwnerMedia from './free-express-owner-media'
import { freeExpressOwnerParts } from '@/lib/practitioners/free-express-owner-reply-policy.mjs'
import styles from './free-express-owner-case.module.css'

const COPY = {
  en: {
    open:'Open application', close:'Close application', title:'Free review application',
    name:'Name', submitted:'Submitted', number:'Reference', question:'Client request',
    details:'Full coaching questionnaire', noDetails:'No extra answers have been submitted.',
    media:'Private portrait and drawing', reply:'Reply to client', channel:'Delivery channel',
    secure:'Verified Google account · Holistic House private inbox',
    guest:'No verified private inbox yet. The client needs to save this application through Google. A website phone number is not a Telegram chat ID.',
    pending:'Google account is linked, but the private inbox is not ready. Ask the client to open Messages in Holistic House.',
    blocked:'This private conversation has been blocked. Do not send.',
    loading:'Verifying the recipient…', error:'Cannot confirm the recipient. No reply has been sent.',
    text:'Your message', placeholder:'Write a personal reply visible only after client sign-in.',
    send:'Send to private inbox', sending:'Saving…', saved:'Saved in the client’s private inbox. Telegram/WhatsApp delivery is not implied.',
    uncertain:'Delivery status unknown. Check the inbox before retrying.',
    noExternal:'Personal answers and images stay inside the secure site; external Telegram or WhatsApp delivery is not enabled for this application.',
    inbox:'Open Holistic House inbox',
  },
  ru: {
    open:'Открыть заявку', close:'Закрыть заявку', title:'Бесплатная заявка',
    name:'Имя', submitted:'Получена', number:'Номер', question:'Запрос клиента',
    details:'Подробная коучинг-анкета', noDetails:'Дополнительные ответы ещё не поступили.',
    media:'Приватное фото и рисунок', reply:'Ответить клиенту', channel:'Канал ответа',
    secure:'Подтверждённый Google-аккаунт · защищённые сообщения Holistic House',
    guest:'Приватный канал клиента не подтверждён. Клиенту нужно сохранить заявку через Google. Номер телефона с сайта не подтверждает Telegram-чат.',
    pending:'Google-аккаунт привязан, но личная переписка ещё не создана. Попросите клиента открыть «Сообщения» на сайте.',
    blocked:'Клиент заблокировал переписку. Не отправляйте сообщение.',
    loading:'Проверяем получателя…', error:'Получатель не подтверждён. Ответ не отправлен.',
    text:'Ваш ответ', placeholder:'Напишите ответ, который клиент увидит после входа в кабинет.',
    send:'Отправить в защищённый inbox', sending:'Сохраняем…', saved:'Ответ сохранён в личных сообщениях клиента. Доставка в Telegram/WhatsApp не подтверждалась.',
    uncertain:'Статус сохранения неизвестен. Проверьте переписку перед повтором.',
    noExternal:'Анкета и фотографии остаются на сайте. Внешняя доставка по Telegram или WhatsApp для этой заявки не включена.',
    inbox:'Открыть сообщения Holistic House',
  },
  es: {
    open:'Abrir solicitud', close:'Cerrar solicitud', title:'Solicitud de revisión gratuita',
    name:'Nombre', submitted:'Recibida', number:'Referencia', question:'Consulta',
    details:'Cuestionario completo', noDetails:'Aún no hay respuestas adicionales.',
    media:'Foto y dibujo privados', reply:'Responder al cliente', channel:'Canal de respuesta',
    secure:'Cuenta Google verificada · buzón privado de Holistic House',
    guest:'El cliente aún no tiene un buzón verificado. Debe guardar la solicitud con Google. El teléfono no acredita su identidad de Telegram.',
    pending:'La cuenta Google está vinculada, pero el chat privado no está listo. El cliente debe abrir Mensajes.',
    blocked:'El cliente bloqueó la conversación.',
    loading:'Verificando destinatario…', error:'No se pudo verificar el destinatario; no se envió ningún mensaje.',
    text:'Tu respuesta', placeholder:'Mensaje privado que el cliente verá tras iniciar sesión.',
    send:'Enviar al buzón privado', sending:'Guardando…', saved:'Guardado en el buzón privado. No implica entrega por Telegram o WhatsApp.',
    uncertain:'El estado es incierto. Comprueba el buzón antes de repetir.',
    noExternal:'Las respuestas e imágenes permanecen privadas. No hay envío a Telegram/WhatsApp desde esta solicitud.',
    inbox:'Abrir mensajes de Holistic House',
  },
}

export function isOwnerFreeExpressRequest(request) {
  return request?.requestKind === 'public'
    && /^\/(en|ru|es)\/services\/free-situation-review$/.test(request.sourcePath || '')
}

export default function FreeExpressOwnerCase({ request, locale='en', accountId }) {
  const lang = COPY[locale] ? locale : 'en'
  const t = COPY[lang]
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(null)
  const [statusError, setStatusError] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const operation = useRef(null)
  const { initial, details } = freeExpressOwnerParts(request.message)
  const endpoint = '/api/app/practice/free-express/' + encodeURIComponent(request.id) + '/reply'

  useEffect(() => {
    if (!open || !accountId) return
    const controller = new AbortController()
    setStatus(null); setStatusError(false); setNotice('')
    fetch(endpoint, {
      credentials:'same-origin', cache:'no-store', signal:controller.signal,
      headers:{'X-HH-Account-Id':accountId},
    }).then(async response => {
      if (!response.ok) throw new Error('CHANNEL_UNAVAILABLE')
      return response.json()
    }).then(result => {
      if (!controller.signal.aborted) {
        if (typeof result.canReply !== 'boolean') throw new Error('INVALID_RESULT')
        setStatus(result)
      }
    }).catch(() => { if (!controller.signal.aborted) setStatusError(true) })
    return () => controller.abort()
  }, [open, accountId, endpoint])

  async function send() {
    const message = text.trim()
    if (!status?.canReply || !message || busy || message.length > 1150) return
    const pending = operation.current
    const op = pending && pending.text === message
      ? pending : { text:message, operationId:crypto.randomUUID() }
    operation.current = op
    setBusy(true); setNotice('')
    try {
      const response = await fetch(endpoint, {
        method:'POST', credentials:'same-origin', cache:'no-store',
        headers:{'Content-Type':'application/json','X-HH-Account-Id':accountId},
        body:JSON.stringify(op),
      })
      const receipt = await response.json().catch(() => ({}))
      if (!response.ok || receipt.saved !== true || receipt.id !== op.operationId
        || receipt.enquiryId !== request.id || receipt.delivery !== 'in_app_only')
        throw new Error('UNCONFIRMED')
      operation.current = null; setText(''); setNotice(t.saved)
    } catch { setNotice(t.uncertain) }
    finally { setBusy(false) }
  }

  return <section className={styles.case} data-free-express-owner-case={request.id}>
    <button type="button" className={styles.open} aria-expanded={open}
      onClick={() => setOpen(value => !value)}>
      <strong>{t.title} · {request.referenceCode || '—'}</strong>
      <span>{open ? t.close : t.open}</span>
    </button>
    {open && <div className={styles.contents}>
      <dl className={styles.meta}>
        <div><dt>{t.number}</dt><dd>{request.referenceCode || '—'}</dd></div>
        <div><dt>{t.name}</dt><dd>{request.contact?.displayName || '—'}</dd></div>
        <div><dt>{t.submitted}</dt><dd>{request.createdAt ? new Date(request.createdAt).toLocaleString(lang==='ru'?'ru-RU':lang==='es'?'es-ES':'en-CA') : '—'}</dd></div>
      </dl>
      <h4>{t.question}</h4>
      <p className={styles.message}>{initial || '—'}</p>
      <details className={styles.answers} data-free-express-details>
        <summary>{t.details} {details ? '✓' : ''}</summary>
        <p className={styles.message}>{details || t.noDetails}</p>
      </details>
      <h4>{t.media}</h4>
      <FreeExpressOwnerMedia request={request} locale={lang}/>
      <section className={styles.reply} aria-label={t.reply}>
        <h4>{t.reply}</h4>
        {!status && !statusError && <p role="status">{t.loading}</p>}
        {statusError && <p role="alert">{t.error}</p>}
        {status && <p className={styles.state}>{t.channel}: {status.channel==='private_cabinet'?t.secure:
          status.channel==='blocked'?t.blocked:
          status.channel==='account_pending'?t.pending:t.guest}</p>}
        {status?.canReply && <div className={styles.composer}>
          <label htmlFor={'hh-express-reply-'+request.id}>{t.text}</label>
          <textarea id={'hh-express-reply-'+request.id} value={text} maxLength={1150}
            rows={3} disabled={busy} placeholder={t.placeholder}
            onChange={event => {
              if (operation.current?.text !== event.target.value.trim()) operation.current = null
              setText(event.target.value)
            }}/>
          <button type="button" disabled={busy || !text.trim()}
            onClick={() => { void send() }}>{busy?t.sending:t.send}</button>
        </div>}
        {notice && <p role="status" className={styles.notice}>{notice}</p>}
        <p className={styles.privacy}>{t.noExternal}</p>
        {status?.canReply && <Link href={'/'+lang+'/app/messages'} prefetch={false}>{t.inbox}</Link>}
      </section>
    </div>}
  </section>
}
