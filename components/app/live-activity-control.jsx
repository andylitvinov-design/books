'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {isNativePsiAlchemy} from '@/lib/native/client'

const MSG={
  ru:{title:'Живая карточка на экране iPhone',
    intro:'День курса и следующий маленький шаг на экране блокировки и Dynamic Island.',
    start:'Показать мой курс на экране',stop:'Убрать с экрана',
    running:'Live Activity активна',needs:'Сначала начните 14-дневный курс.',
    unavailable:'Требуется нативное приложение iOS, разрешение Live Activities и подключение Apple Push.',
    saved:'Карточка подключена к курсу',removed:'Карточка выключена',
    error:'Не удалось обновить карточку. Проверьте разрешения iPhone.'},
  en:{title:'Live course card on iPhone',
    intro:'Your current course day and a small next step on the Lock Screen and Dynamic Island.',
    start:'Show my course on Lock Screen',stop:'Remove from Lock Screen',
    running:'Live Activity running',needs:'Start a 14-day course first.',
    unavailable:'Requires the native iOS app, Live Activities permission and configured Apple Push.',
    saved:'Live Activity linked to your course',removed:'Live Activity turned off',
    error:'Unable to update the card. Check your iPhone permissions.'}
}
export default function LiveActivityControl({locale='en',serverReady=false,accountId}){
  const c=MSG[locale]||MSG.en
  const [native,setNative]=useState(false),[available,setAvailable]=useState(false),
    [cycle,setCycle]=useState(null),[running,setRunning]=useState(false),
    [busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const plugin=useRef(null),owner=useRef(null),busyRef=useRef(false)
  const currentAccount=useRef(accountId);currentAccount.current=accountId
  const api=useCallback(async(path,body)=>{
    const session=owner.current
    if(!session||session.accountId!==currentAccount.current)throw new Error('ACCOUNT_CHANGED')
    const result=await appFetch(path,body,undefined,{accountId:session.accountId,signal:session.controller.signal})
    if(owner.current!==session||session.accountId!==currentAccount.current)throw new Error('ACCOUNT_CHANGED')
    return result
  },[])

  const refresh=useCallback(async()=>{
    if(!plugin.current||!owner.current)return
    const session=owner.current
    try{
      const state=await api('course/today?locale='+locale)
      const progress=state?.cycle
      if(!progress?.id){setCycle(null);setRunning(false);return}
      setCycle({...progress,completedToday:Boolean(state.currentSession)})
      const list=await plugin.current.list()
      if(owner.current!==session)return
      const mine=list.activities?.find(x=>x.cycleId===progress.id)
      setRunning(Boolean(mine))
      if(mine){
        await plugin.current.update({cycleId:progress.id,
          day:Math.max(1,Math.min(14,progress.day)),
          completedToday:Boolean(state.currentSession),
          finished:progress.status!=='active'||progress.afterCycle})
        if(owner.current!==session)return
        if(mine.token&&progress.status==='active'&&!progress.afterCycle&&serverReady){
          await api('notifications/live-token',{
            cycleId:progress.id,activityId:mine.activityId,pushToken:mine.token,locale})
        }
      }
    }catch{/* Never surface sensitive course details on a Lock Screen. */}
  },[locale,serverReady,api])
  useEffect(()=>{
    if(!isNativePsiAlchemy())return
    let alive=true
    const session={accountId,controller:new AbortController(),listener:null};owner.current=session
    busyRef.current=false;setBusy(false)
    async function initialize(){
      const {registerPlugin,Capacitor}=await import('@capacitor/core')
      if(!Capacitor.isNativePlatform()||Capacitor.getPlatform()!=='ios')return
      const bridge=registerPlugin('HHCourseActivity')
      const response=await bridge.availability()
      if(!alive)return
      plugin.current=bridge;setNative(true);setAvailable(Boolean(response.available))
      const handle=await bridge.addListener('token',async event=>{
        if(!alive||owner.current!==session||!serverReady)return
        try{
          await api('notifications/live-token',{
            cycleId:event.cycleId,activityId:event.activityId,
            pushToken:event.token,locale})
        }catch{/* Token upload can be retried on the next authenticated visit. */}
      })
      if(!alive||owner.current!==session){void handle?.remove();return}
      session.listener=handle
      await refresh()
    }
    initialize().catch(()=>{})
    const changed=()=>{void refresh()}
    window.addEventListener('hh-course-changed',changed)
    return()=>{alive=false;session.controller.abort();if(owner.current===session)owner.current=null;window.removeEventListener('hh-course-changed',changed);
      void session.listener?.remove();plugin.current=null}
  },[accountId,locale,serverReady,refresh,api])
  async function activate(){
    if(busyRef.current||!owner.current||!plugin.current||!cycle||!serverReady||!available)return
    const session=owner.current;busyRef.current=true
    setBusy(true);setMessage('')
    try{
      const result=await plugin.current.start({
        cycleId:cycle.id,day:Math.max(1,Math.min(14,cycle.day)),
        locale,completedToday:cycle.completedToday})
      if(owner.current!==session)return
      const details=await plugin.current.list()
      if(owner.current!==session)return
      const item=details.activities?.find(x=>x.activityId===result.activityId)
      if(item?.token)await api('notifications/live-token',{
        cycleId:cycle.id,activityId:result.activityId,pushToken:item.token,locale})
      if(owner.current===session){setRunning(true);setMessage(c.saved)}
    }catch{if(owner.current===session)setMessage(c.error)}finally{if(owner.current===session){busyRef.current=false;setBusy(false)}}
  }
  async function stop(){
    if(busyRef.current||!plugin.current||!owner.current)return
    const session=owner.current;busyRef.current=true
    setBusy(true);setMessage('')
    try{
      await api('notifications/live-stop',{activityId:null})
      if(owner.current!==session)return
      await plugin.current.stop({})
      if(owner.current!==session)return
      setRunning(false);setMessage(c.removed)
    }catch{if(owner.current===session)setMessage(c.error)}finally{if(owner.current===session){busyRef.current=false;setBusy(false)}}
  }
  if(!native)return null
  return <section aria-label={c.title} style={{
    padding:'14px',margin:'14px 0',border:'1px solid #c6dfd4',borderRadius:14,background:'#f4faf7'}}>
    <h3 style={{margin:'0 0 6px',fontSize:17,color:'#27574c'}}>{c.title}</h3>
    <p style={{margin:'0 0 10px',fontSize:13,color:'#5f796e'}}>{c.intro}</p>
    <p style={{fontSize:12,color:'#5f796e'}}>{!available||!serverReady?c.unavailable:
      !cycle||cycle.status!=='active'||cycle.afterCycle?c.needs:running?c.running:''}</p>
    {running?
      <button type="button" onClick={stop} disabled={busy}>{c.stop}</button>:
      <button type="button" onClick={activate} disabled={busy||!available||!serverReady||
        !cycle||cycle.status!=='active'||cycle.afterCycle}>{c.start}</button>}
    {message&&<p role="status" style={{fontSize:12}}>{message}</p>}
  </section>
}
