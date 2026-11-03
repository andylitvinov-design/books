import Link from 'next/link'
import {BookmarkCheck,Gift} from 'lucide-react'
import styles from './report-final-actions.module.css'

// For non-session legacy readers. Never offer a misleading Google "save"
// operation in practitioner preview or a document already saved to the Cabinet.
export function ReportFinalActions({locale='en',mode='preview',saveControl=null}) {
  const ru=locale==='ru'
  return <nav className={styles.wrapper} data-hh-report-next-actions
    aria-label={ru?'После отчёта':'After your report'}>
    <div className={styles.heading}>
      <span>{ru?'СОХРАНИТЕ И ПРОДОЛЖАЙТЕ':'SAVE & CONTINUE'}</span>
      <h2>{ru?'Ваши следующие шаги':'Your next steps'}</h2>
    </div>
    <div className={styles.actions}>
      {mode==='saved'
        ? <Link className={styles.primary} href={'/'+locale+'/app/portrait#personal-reports'}>
            <BookmarkCheck size={20} aria-hidden="true"/>
            {ru?'Открыть мой кабинет — отчёт сохранён':'Open my Cabinet — report saved'}
          </Link>
        : mode==='preview'||!saveControl
          ? <button className={styles.primary} type="button" disabled>
              <BookmarkCheck size={20} aria-hidden="true"/>
              {ru?'Войти в мой кабинет и сохранить отчёт':'Sign in to my Cabinet and save report'}
            </button>
          : <div className={styles.saveSlot}>{saveControl}</div>}
      <Link className={styles.bonus} href={'/'+locale+'/client'}>
        <Gift size={20} aria-hidden="true"/>
        {ru?'Пройти дополнительное тестирование (бонус)':'Take additional tests (bonus)'}
      </Link>
    </div>
    {mode==='preview'&&<p className={styles.hint}>{ru?
      'В предпросмотре сохранение отключено. Клиент сможет воспользоваться этой кнопкой по своей защищённой ссылке.':
      'Saving is disabled in practitioner preview. The client can use this action through their authorized private link.'}</p>}
    {mode!=='preview'&&mode!=='saved'&&!saveControl&&<p className={styles.hint}>{ru?
      'Сохранение сейчас недоступно для этой ссылки. Дополнительные тесты доступны без регистрации.':
      'Saving is unavailable for this link. Additional tests can be taken without registering.'}</p>}
  </nav>
}
