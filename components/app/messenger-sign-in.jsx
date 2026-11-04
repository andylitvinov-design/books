'use client'
import {useState} from 'react'
import {isNativeHolisticHouse} from '@/lib/native/client'
import {directMessengerRecipient} from '@/lib/app/direct-messenger-handoff.mjs'

// Uses the SAME Google account and PKCE flow as My House. Never save a
// private draft, token, or return URL in browser storage. Only a public,
// allowlisted practitioner slug may survive OAuth.
const COPY={
  en:{button:'Continue with Google',busy:'Opening secure sign-in…',error:'Could not open sign-in. Please try again.'},
  ru:{button:'Войти через Google',busy:'Открываем защищённый вход…',error:'Не удалось открыть вход. Попробуйте ещё раз.'},
  es:{button:'Continuar con Google',busy:'Abriendo acceso seguro…',error:'No se pudo abrir el acceso. Inténtalo de nuevo.'},
}
export default function MessengerSignIn({locale='en',recipientSlug='',label=''}){
  const c=COPY[locale]||COPY.en
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  async function signin(){
    if(busy)return
    setBusy(true);setError('')
    try{
      const recipient=directMessengerRecipient(recipientSlug||null)
      const native=isNativeHolisticHouse()
      const response=await fetch('/api/app/auth/start',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({locale,continueTo:'direct-messages',
          ...(recipient?{recipientSlug:recipient}:{}),
          ...(native?{native:true}:{})}),
      })
      const data=await response.json().catch(()=>({}))
      if(!response.ok||typeof data.redirectUrl!=='string')throw new Error('SIGN_IN_UNAVAILABLE')
      const destination=new URL(data.redirectUrl)
      if(destination.protocol!=='https:')throw new Error('SIGN_IN_UNAVAILABLE')
      if(native){
        const {Browser}=await import('@capacitor/browser')
        await Browser.open({url:destination.href})
        setBusy(false)
      }else window.location.assign(destination.href)
    }catch{
      setError(c.error)
      setBusy(false)
    }
  }
  return <span data-hh-messenger-sign-in>
    <button type="button" className="hh-primary" disabled={busy} onClick={signin}
      data-hh-messenger-google-login>
      {busy?c.busy:label||c.button}
    </button>
    {error&&<span role="alert">{error}</span>}
  </span>
}
