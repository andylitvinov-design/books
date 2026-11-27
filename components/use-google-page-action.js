'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {appFetch} from '@/lib/app/client-fetch'
import {isNativeHolisticHouse} from '@/lib/native/client'
import {rememberPageAuthAction,takePageAuthAction} from '@/lib/app/page-auth-continuation.mjs'

export function useGooglePageAction({locale,continuation,kind,check='auth/status',reikiRegistration,onAuthorized}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(false),[open,setOpen]=useState(false)
 const pending=useRef(false),actionRef=useRef(null),live=useRef(true)
 const callback=useRef(onAuthorized)
 useEffect(()=>{callback.current=onAuthorized},[onAuthorized])
 useEffect(()=>{live.current=true;return()=>{live.current=false}},[])
 const begin=useCallback(async(action,resumed=false)=>{
  if(pending.current)return
  pending.current=true;setBusy(true);setError(false)
  try{
   let verified
   try{verified=await appFetch(check)}
   catch(failure){
    if(failure?.status!==401||resumed)throw failure
    if(live.current){actionRef.current=action;setOpen(true)}
    return
   }
   if(live.current){setOpen(false);await callback.current(action,verified,resumed)}
  }catch{if(live.current)setError(true)}
  finally{pending.current=false;if(live.current)setBusy(false)}
 },[check])
 useEffect(()=>{
  const action=takePageAuthAction({continuation,locale,kind})
  if(action!==null)void begin(action,true)
 },[begin,continuation,locale,kind])
 async function signIn(){
  if(pending.current||!open||actionRef.current===null)return
  pending.current=true;setBusy(true);setError(false)
  let navigating=false
  try{
   const native=isNativeHolisticHouse()
   const returnPath=rememberPageAuthAction({continuation,locale,kind,action:actionRef.current})
   const result=await appFetch('auth/start',{locale,continueTo:continuation,provider:'google',returnPath,...(native?{native:true}:{}),...(reikiRegistration?{reikiRegistration}:{})},'POST')
   if(!result?.redirectUrl||new URL(result.redirectUrl).protocol!=='https:')throw Error('INVALID_OAUTH_URL')
   if(!live.current)return
   if(native){const {Browser}=await import('@capacitor/browser');await Browser.open({url:result.redirectUrl})}
   else{window.location.assign(result.redirectUrl);navigating=true}
  }catch{if(live.current)setError(true)}
  finally{if(!navigating){pending.current=false;if(live.current)setBusy(false)}}
 }
 function dismiss(){if(!pending.current){actionRef.current=null;setOpen(false);setError(false)}}
 return {busy,error,open,begin,signIn,dismiss}
}
