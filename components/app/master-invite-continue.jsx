'use client'
import {useEffect,useState} from 'react'
import {MASTER_INVITE_PENDING_KEY,masterInviteContinuation} from '@/lib/practitioners/master-invite-contract.mjs'
export default function MasterInviteContinue({locale}){
 const [error,setError]=useState('')
 useEffect(()=>{
   try{
     const raw=sessionStorage.getItem(MASTER_INVITE_PENDING_KEY)
     const intent=JSON.parse(raw||'null')
     if(!masterInviteContinuation(intent,locale))throw new Error('EXPIRED')
     window.location.replace('/'+locale+'/masters/invite/'+intent.token+'?ready=1')
   }catch{setError(locale==='ru'?'Не удалось восстановить приглашение. Откройте исходную ссылку.':locale==='es'?'La invitación ha caducado. Vuelve a abrir el enlace original.':'Invitation expired. Open your original invitation link.')}
 },[locale])
 return <main style={{minHeight:'100svh',display:'grid',placeItems:'center',padding:'24px',background:'#f5f6ef',color:'#35594c'}}>
   <p role={error?'alert':'status'}>{error||(locale==='ru'?'Завершаем привязку аккаунта…':locale==='es'?'Vinculando cuenta…':'Finishing Google account linking…')}</p>
 </main>
}
