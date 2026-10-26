'use client'
import {useEffect,useState} from 'react'
import {MASTER_INVITE_PENDING_KEY,masterInviteToken} from '@/lib/practitioners/master-invite-contract.mjs'
import styles from './master-invite-claim.module.css'

const COPY={
 en:{title:'Join Holistic House',hello:'Your private practitioner card is ready.',help:'After signing in with your Google account, this profile and its private conversation will be linked to your cabinet. Public publication requires your approval and profile review.',accept:'Link my profile with Google',signing:'Connecting to Google…',saving:'Linking your account…',linked:'Account linked. Opening private messages…',error:'Invitation cannot be opened, or it has expired.',authError:'Could not sign in. Try again.',claimError:'Could not link this account. If you already have a practitioner profile, contact the person who invited you.',expires:'Invitation expires',privacy:'No private documents are available before you accept and verify your Google account.'},
 ru:{title:'Присоединиться к Holistic House',hello:'Для вас подготовлена карточка мастера.',help:'После входа через Google эта карточка и приватная переписка привяжутся к вашему кабинету. Публичная страница потребует заполнения профиля и модерации.',accept:'Привязать мой профиль через Google',signing:'Переходим в Google…',saving:'Привязываем аккаунт…',linked:'Аккаунт привязан. Открываем сообщения…',error:'Ссылка недоступна или срок приглашения истёк.',authError:'Не удалось войти. Повторите попытку.',claimError:'Не удалось привязать аккаунт. Если у вас уже есть профиль мастера, обратитесь к пригласившему вас человеку.',expires:'Ссылка действительна до',privacy:'Приватные документы станут доступны только после вашего согласия и подтверждения Google-аккаунта.'},
 es:{title:'Únete a Holistic House',hello:'Tu ficha privada como profesional está preparada.',help:'Al iniciar sesión con Google, la ficha y la conversación privada quedarán vinculadas a tu cuenta. El perfil público requiere revisión.',accept:'Vincular mi perfil con Google',signing:'Abriendo Google…',saving:'Vinculando cuenta…',linked:'Cuenta vinculada. Abriendo mensajes…',error:'La invitación no existe o ha caducado.',authError:'No se ha podido iniciar sesión. Inténtalo de nuevo.',claimError:'No se pudo vincular. Si ya tienes un perfil profesional, contacta con quien te invitó.',expires:'Caduca el',privacy:'Los documentos privados solo estarán disponibles después de dar tu consentimiento y verificar la cuenta Google.'},
}
export default function MasterInviteClaim({locale,token}){
 const t=COPY[locale]||COPY.en
 const [info,setInfo]=useState(null),[busy,setBusy]=useState(false)
 const [error,setError]=useState(''),[linked,setLinked]=useState(false)
 useEffect(()=>{
   if(!masterInviteToken(token)){setError(t.error);return}
   const controller=new AbortController()
   fetch('/api/app/practitioner-master-invites?token='+encodeURIComponent(token),{cache:'no-store',signal:controller.signal})
     .then(async r=>{if(!r.ok)throw new Error('NOT_FOUND');return r.json()})
     .then(data=>{if(!controller.signal.aborted)setInfo(data)})
     .catch(()=>{if(!controller.signal.aborted)setError(t.error)})
   return()=>controller.abort()
 },[locale,token,t.error])
 useEffect(()=>{
   if(typeof window==='undefined'||new URLSearchParams(window.location.search).get('ready')!=='1'||!masterInviteToken(token))return
   let active=true
   setBusy(true);setError('')
   fetch('/api/app/bootstrap?view=portrait',{cache:'no-store',credentials:'same-origin'})
     .then(async r=>{if(!r.ok)throw new Error('SIGN_IN_REQUIRED');return r.json()})
     .then(account=>{
       if(!active)return null
       if(account.account?.onboardingState!=='active'){
         // Preserve the opaque same-tab invitation until the normal consent flow.
         window.location.replace('/'+(locale==='es'?'en':locale)+'/app/portrait')
         return null
       }
       return fetch('/api/app/practitioner-master-invites',{
         method:'POST',cache:'no-store',credentials:'same-origin',
         headers:{'Content-Type':'application/json'},
         body:JSON.stringify({action:'claim',token}),
       }).then(async r=>{const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'CLAIM_FAILED');return data})
     }).then(data=>{
       if(!active||!data)return
       sessionStorage.removeItem(MASTER_INVITE_PENDING_KEY)
       setLinked(true)
       window.location.replace('/'+locale+'/app/messages?source=direct&thread='+encodeURIComponent(data.threadId))
     }).catch(()=>{if(active)setError(t.claimError)})
     .finally(()=>{if(active)setBusy(false)})
   return()=>{active=false}
 },[token,locale,t.claimError])
 async function accept(){
   if(busy||error||!info)return
   setBusy(true);setError('')
   try{
     sessionStorage.setItem(MASTER_INVITE_PENDING_KEY,JSON.stringify({token,locale,createdAt:Date.now()}))
     const response=await fetch('/api/app/auth/start',{method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'Content-Type':'application/json'},body:JSON.stringify({locale,continueTo:'master-invite'})})
     const data=await response.json().catch(()=>({}))
     if(!response.ok||!data.redirectUrl||new URL(data.redirectUrl).protocol!=='https:')throw new Error('AUTH_FAILED')
     window.location.assign(data.redirectUrl)
   }catch{setBusy(false);setError(t.authError)}
 }
 return <main className={styles.shell} lang={locale}>
   <div className={styles.card}>
     <small className={styles.brand}>HOLISTIC HOUSE</small>
     <h1>{t.title}</h1>
     {info&&<><h2>{info.name}</h2><p>{t.hello}</p><p>{t.help}</p>
       <p className={styles.expiry}>{t.expires}: {new Date(info.expiresAt).toLocaleDateString(locale,{dateStyle:'medium'})}</p>
     </>}
     {error&&<p role="alert" className={styles.error}>{error}</p>}
     {linked?<p role="status">{t.linked}</p>:info&&!error&&
       <button type="button" disabled={busy} onClick={accept}>{busy?t.signing:t.accept}</button>}
     {busy&&!linked&&<p role="status">{t.saving}</p>}
     <p className={styles.privacy}>{t.privacy}</p>
   </div>
 </main>
}
