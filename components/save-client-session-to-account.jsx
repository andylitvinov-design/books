'use client'
import {BookmarkCheck,ShieldCheck} from 'lucide-react'
import {useSessionExitNavigation} from './session-exit-save-guard'
import styles from './client-session.module.css'

// A secondary voluntary entry. It opens the same consent dialog used when
// leaving the consultation, rather than a second save implementation.
export function SaveClientSessionToAccount({locale='en',appAvailable=true,compact=false}){
  const ru=locale==='ru',navigation=useSessionExitNavigation()
  if(compact)return <button type="button" className={styles.sessionBottomPrimary}
    disabled={!appAvailable||!navigation} onClick={()=>navigation?.requestSave()}>
    <BookmarkCheck size={20} aria-hidden="true"/>
    {navigation?.savedSessionId?(ru?'Открыть сохранённый отчёт':'Open saved report'):
      ru?'Войти в свой кабинет и сохранить отчёт':'Sign in to your Cabinet and save report'}
  </button>
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
