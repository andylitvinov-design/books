'use client'

import {useFormStatus} from 'react-dom'
import styles from './telegram-setup.module.css'

// Keep the original owner-only Server Action form and its native submit.
// React 19 shows a visible pending state as soon as the mobile browser submits;
// server-side per-day receipt still protects against another send.
export function SendDailyCouncilButton({ru,disabled}){
  const {pending}=useFormStatus()
  return <>
    <button type="submit" className={styles.primary}
      disabled={disabled||pending} aria-busy={pending}>
      {pending
        ?ru?'Отправляем отчёт…':'Sending report…'
        :ru?'Отправить доступный отчёт сегодня':'Send available daily report now'}
    </button>
    <p className={styles.sendHint} role="status" aria-live="polite">
      {pending
        ?ru?'Запрос запущен. Проверяем API и Telegram. Не нажимай повторно — дождись результата или проверь чат бота.':
          'Request started. Checking the APIs and Telegram. Do not submit again; check the result or your bot chat.'
        :ru?'После отправки здесь появится результат. Повтор принятого отчёта заблокирован.':
          'The result will appear here after sending. An accepted report cannot be sent twice.'}
    </p>
  </>
}
