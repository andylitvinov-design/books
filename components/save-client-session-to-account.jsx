'use client'
import {BookmarkCheck,ShieldCheck} from 'lucide-react'
import {useSessionExitNavigation} from './session-exit-save-guard'
import styles from './client-session.module.css'

export const SESSION_SAVE_COPY = {
  en: {
    kicker: 'YOUR PERSONAL REPORT',
    title: 'Save your report for later',
    savedTitle: 'Your report is saved',
    description: 'Your report and recommendations will be available in your personal Cabinet.',
    savedDescription: 'You can return to this report in your Cabinet anytime.',
    save: 'Save my report',
    open: 'Open my saved report',
    google: 'With Google · no new password',
    privacy: 'Private save · not shared publicly',
    savedNote: 'Already saved to your personal Cabinet.',
    modalTitle: 'Save this report to your Cabinet?',
  },
  ru: {
    kicker: 'ВАШ ЛИЧНЫЙ ОТЧЁТ',
    title: 'Сохраните отчёт, чтобы вернуться к нему позже',
    savedTitle: 'Ваш отчёт сохранён',
    description: 'Ваш отчёт и рекомендации будут доступны в личном кабинете.',
    savedDescription: 'Вы сможете вернуться к отчёту в личном кабинете в любое время.',
    save: 'Сохранить мой отчёт',
    open: 'Открыть сохранённый отчёт',
    google: 'Через Google · без нового пароля',
    privacy: 'Личное сохранение · без публичной публикации',
    savedNote: 'Отчёт уже сохранён в личном кабинете.',
    modalTitle: 'Сохранить этот отчёт в личном кабинете?',
  },
  es: {
    kicker: 'TU INFORME PERSONAL',
    title: 'Guarda tu informe para volver a verlo después',
    savedTitle: 'Tu informe está guardado',
    description: 'Tu informe y las recomendaciones estarán disponibles en tu espacio personal.',
    savedDescription: 'Puedes volver a este informe desde tu espacio personal cuando quieras.',
    save: 'Guardar mi informe',
    open: 'Abrir mi informe guardado',
    google: 'Con Google · sin crear otra contraseña',
    privacy: 'Guardado privado · no se publica',
    savedNote: 'El informe ya está guardado en tu espacio personal.',
    modalTitle: '¿Guardar este informe en tu espacio personal?',
  },
}

// A secondary voluntary entry. It opens the same consent dialog used when
// leaving the consultation, rather than a second save implementation.
export function SaveClientSessionToAccount({locale='en',appAvailable=true,compact=false}){
  const ru=locale==='ru',navigation=useSessionExitNavigation()
  const copy=SESSION_SAVE_COPY[locale]||SESSION_SAVE_COPY.en
  if(compact)return <div className={styles.sessionBottomSaveAction}>
    <button type="button" className={styles.sessionBottomPrimary}
      disabled={!appAvailable||!navigation} onClick={()=>navigation?.requestSave()}>
      <BookmarkCheck size={20} aria-hidden="true"/>
      <span className={styles.sessionBottomPrimaryCopy}>
        <strong>{navigation?.savedSessionId?copy.open:copy.save}</strong>
        {!navigation?.savedSessionId&&<small>{copy.google}</small>}
      </span>
    </button>
    <p className={styles.sessionBottomTrust}><ShieldCheck size={15} aria-hidden="true"/>
      <span>{navigation?.savedSessionId?copy.savedNote:copy.privacy}</span>
    </p>
  </div>
  return <section className={styles.saveSessionBox} aria-label={ru?'Сохранить консультацию':'Save consultation'}>
    <div className={styles.saveSessionHeading}>
      <BookmarkCheck size={24} aria-hidden="true"/>
      <div><h2>{ru?'Оставить консультацию в моём кабинете':'Keep this consultation in my Cabinet'}</h2>
        <p>{ru?'Ваш рецепт, личные записи и упражнения будут доступны в «Моих отчётах» после подтверждения через Google.':
          'Your report, personal recordings and practices will be available under My Reports after Google confirmation.'}</p></div>
    </div>
    <button className={styles.saveSessionButton} type="button"
      disabled={!appAvailable||!navigation} onClick={()=>navigation?.requestSave()}>
      <BookmarkCheck size={19} aria-hidden="true"/>
      {navigation?.savedSessionId?(ru?'Открыть сохранённую консультацию':'Open saved consultation'):
        (ru?'Сохранить эту консультацию':'Save this consultation')}
    </button>
    <p className={styles.saveSessionPrivacy}><ShieldCheck size={15} aria-hidden="true"/>
      {navigation?.savedSessionId
        ? (ru?'Уже сохранено в этом Google-кабинете.':'Already saved to this Google Cabinet.')
        : (ru?'Сохранится только эта сессия. Перед Google-входом вы подтвердите действие во всплывающем окне.':
          'Only this session is saved. Confirm in the dialog before Google sign-in.')}</p>
  </section>
}
