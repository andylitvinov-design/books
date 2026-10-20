'use client'
import {useEffect,useRef,useState} from 'react'
import {isNativeHolisticHouse} from '@/lib/native/client'
import {appFetch} from '@/lib/app/client-fetch'

const COPY={
  ru:{title:'Уведомления приложения',intro:'Получайте на телефон уведомление, когда мастер отвечает вам в личной переписке.',
    allow:'Подключить этот телефон',off:'Отключить на всех телефонах',on:'Уведомления включены',
    disabled:'Уведомления отключены',loading:'Проверяем настройки…',
    unavailable:'Отправка нативных уведомлений пока не настроена на сервере.',
    denied:'Телефон запретил уведомления. Разрешите их в настройках устройства.',
    error:'Не удалось подключить уведомления. Повторите позже.',
    privacy:'Текст переписки и сведения о здоровье никогда не показываются на экране блокировки.',
    saved:'Устройство зарегистрировано для личных уведомлений.',
    revoked:'Регистрация этого аккаунта отозвана на сервере.'},
  en:{title:'App notifications',intro:'Receive a phone notification when a practitioner replies to your private conversation.',
    allow:'Enable this phone',off:'Disable on all devices',on:'Notifications enabled',
    disabled:'Notifications disabled',loading:'Checking settings…',
    unavailable:'Native push delivery has not been configured on the server yet.',
    denied:'Your phone has blocked notifications. Change this in device settings.',
    error:'Notifications could not be enabled. Please try again later.',
    privacy:'Message content and health details are never shown on the Lock Screen.',
    saved:'This device is registered for private notifications.',
    revoked:'Notification registration for this account has been revoked.'}
}
async function plugin(){
  const {registerPlugin}=await import('@capacitor/core')
  return registerPlugin('PushNotifications')
}
function currentPlatform(){
  if(typeof window==='undefined'||!isNativeHolisticHouse())return null
  const detected=window.Capacitor?.getPlatform?.()
  if(detected==='ios'||detected==='android')return detected
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)?'ios':'android'
}
export default function NativeMessageNotifications({accountId,locale='en'}){
  const t=COPY[locale]||COPY.en
  const [platform,setPlatform]=useState(null)
  const [state,setState]=useState(null)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const [error,setError]=useState('')
  const owner=useRef(null),active=useRef(false)
  useEffect(()=>{
    const name=currentPlatform()
    setPlatform(name)
    if(!name)return
    const session={accountId,controller:new AbortController()}
    owner.current=session;active.current=false
    setState(null);setBusy(false);setError('');setNotice('')
    appFetch('notifications/native?platform='+name,undefined,'GET',
      {accountId,signal:session.controller.signal})
      .then(result=>{if(owner.current===session)setState(result)})
      .catch(()=>{if(owner.current===session)setError(t.error)})
    return ()=>{session.controller.abort();if(owner.current===session)owner.current=null}
  },[accountId,locale,t.error])
  async function run(action){
    if(active.current||!owner.current)return
    const session=owner.current;active.current=true;setBusy(true);setError('');setNotice('')
    const fresh=()=>owner.current===session&&session.accountId===accountId&&!session.controller.signal.aborted
    try {await action(session,fresh)}
    catch {if(fresh())setError(t.error)}
    finally {if(fresh()){active.current=false;setBusy(false)}}
  }
  async function enable(){
    await run(async(session,fresh)=>{
      if(!state?.ready)return
      const push=await plugin()
      const permission=await push.checkPermissions()
      if(!fresh())return
      const allowed=permission.receive==='granted'?permission:
        await push.requestPermissions()
      if(!fresh())return
      if(allowed.receive!=='granted'){setError(t.denied);return}
      if(platform==='android'){
        await push.createChannel({id:'hh_private_messages',name:'Holistic House messages',
          description:'Private message arrival alerts',importance:3,visibility:0,
          sound:undefined,vibration:true})
      }
      let handles=[]
      let expiry
      try {
        const registration=new Promise((resolve,reject)=>{
          let settled=false
          const success=token=>{
            if(settled)return
            settled=true;resolve(token?.value)
          }
          const failure=()=>{if(!settled){settled=true;reject(new Error('REGISTER_FAILED'))}}
          // Attach listeners before register to avoid losing a fast native token.
          Promise.all([
            push.addListener('registration',success),
            push.addListener('registrationError',failure)
          ]).then(list=>{handles=list;return push.register()})
            .catch(failure)
          expiry=setTimeout(failure,15000)
        })
        const token=await registration
        if(!fresh())return
        const saved=await appFetch('notifications/native/register',{
          platform,token,locale,environment:state.environment,messageAlerts:true,
        },'POST',{accountId:session.accountId,signal:session.controller.signal})
        if(!fresh())return
        setState(previous=>({...previous,...saved,enabled:true,deviceCount:Math.max(1,previous?.deviceCount||0)}))
        setNotice(t.saved)
      }finally{
        clearTimeout(expiry)
        await Promise.allSettled(handles.map(h=>h.remove()))
      }
    })
  }
  async function disable(){
    await run(async(session,fresh)=>{
      await appFetch('notifications/native/disable',{},'POST',
        {accountId:session.accountId,signal:session.controller.signal})
      if(!fresh())return
      try { const push=await plugin();await push.unregister() } catch {}
      if(!fresh())return
      setState(previous=>({...previous,enabled:false,deviceCount:0}))
      setNotice(t.revoked)
    })
  }
  if(!platform)return null
  return <section className="hh-panel hh-section" aria-label={t.title} data-native-message-notifications>
    <h2>{t.title}</h2><p>{t.intro}</p>
    <p className="hh-fine">{t.privacy}</p>
    {!state&&!error&&<p role="status">{t.loading}</p>}
    {state&&<p role="status">{state.enabled?t.on:t.disabled}</p>}
    {state&&!state.ready&&<p>{t.unavailable}</p>}
    {state&&<div className="hh-actions">
      <button type="button" className="hh-primary" disabled={busy||!state.ready} onClick={enable}>{t.allow}</button>
      {state.enabled&&<button type="button" disabled={busy} onClick={disable}>{t.off}</button>}
    </div>}
    {error&&<p role="alert">{error}</p>}
    {notice&&<p role="status">{notice}</p>}
  </section>
}
