'use client'
import {useEffect,useRef,useState} from 'react'
import {isNativeHolisticHouse} from '@/lib/native/client'
import {registerNativePushToken} from '@/lib/native/push-registration'
import {appFetch} from '@/lib/app/client-fetch'

const COPY={
  ru:{title:'Уведомления приложения',intro:'Получайте на телефон уведомление, когда мастер отвечает вам в личной переписке.',
    allow:'Подключить этот телефон',off:'Отключить на всех телефонах',on:'Для аккаунта подключены уведомления',
    disabled:'Уведомления отключены',loading:'Проверяем настройки…',
    unavailable:'Отправка нативных уведомлений пока не настроена на сервере.',
    denied:'Телефон запретил уведомления. Разрешите их в настройках устройства.',
    error:'Не удалось подключить уведомления. Повторите позже.',
    privacy:'Текст переписки и сведения о здоровье никогда не показываются на экране блокировки.',
    saved:'Устройство зарегистрировано для личных уведомлений.',
    revoked:'Регистрация этого аккаунта отозвана на сервере.'},
  en:{title:'App notifications',intro:'Receive a phone notification when a practitioner replies to your private conversation.',
    allow:'Enable this phone',off:'Disable on all devices',on:'Notifications are registered for this account',
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
  const scope=useRef(null);scope.current={accountId,locale}
  const belongs=session=>owner.current===session&&scope.current.accountId===session.accountId&&
    scope.current.locale===session.locale&&!session.controller.signal.aborted
  useEffect(()=>{
    const name=currentPlatform()
    setPlatform(name)
    if(!name)return
    const session={accountId,locale,controller:new AbortController()}
    owner.current=session;active.current=false
    setState(null);setBusy(false);setError('');setNotice('')
    appFetch('notifications/native?platform='+name,undefined,'GET',
      {accountId,signal:session.controller.signal})
      .then(result=>{if(belongs(session))setState(result)})
      .catch(()=>{if(belongs(session))setError(t.error)})
    return ()=>{session.controller.abort();if(owner.current===session)owner.current=null}
  // belongs reads the render-updated account ref rather than a stale closure.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[accountId,locale,t.error])
  async function run(action){
    if(active.current||!owner.current)return
    const session=owner.current
    if(!belongs(session))return
    active.current=true;setBusy(true);setError('');setNotice('')
    const fresh=()=>belongs(session)
    try {await action(session,fresh)}
    catch {if(fresh())setError(t.error)}
    finally {if(fresh()){active.current=false;setBusy(false)}}
  }
  async function enable(){
    await run(async(session,fresh)=>{
      if(!state?.ready)return
      const push=await plugin()
      if(!fresh())return
      const permission=await push.checkPermissions()
      if(!fresh())return
      const allowed=permission.receive==='granted'?permission:await push.requestPermissions()
      if(!fresh())return
      if(allowed.receive!=='granted'){setError(t.denied);return}
      if(platform==='android'){
        await push.createChannel({id:'hh_private_messages',name:'Holistic House messages',
          description:'Private message arrival alerts',importance:3,visibility:0,vibration:true})
      }
      if(!fresh())return
      const token=await registerNativePushToken({
        addListener:(...args)=>push.addListener(...args),register:()=>push.register(),
      },{signal:session.controller.signal,isCurrent:fresh})
      if(!fresh())return
      const saved=await appFetch('notifications/native/register',{
        platform,token,locale,environment:state.environment,messageAlerts:true,
      },'POST',{accountId:session.accountId,signal:session.controller.signal})
      if(!fresh())return
      setState(previous=>({...previous,...saved,enabled:true,deviceCount:Math.max(1,previous?.deviceCount||0)}))
      setNotice(t.saved)
    })
  }
  async function disable(){
    await run(async(session,fresh)=>{
      await appFetch('notifications/native/disable',{},'POST',
        {accountId:session.accountId,signal:session.controller.signal})
      if(!fresh())return
      try {const push=await plugin();if(fresh())await push.unregister()} catch {}
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
