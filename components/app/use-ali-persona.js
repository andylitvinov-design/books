'use client'
import {useCallback,useEffect,useState} from 'react'
import {ALI_DEFAULT_PERSONA_ID,ALI_PERSONA_EVENT,ALI_PERSONA_STORAGE_KEY,
 getAliPersona,isAliPersonaId} from '@/lib/holistic-support/ali-personas.mjs'

function savedPersona(){
 try{const id=window.localStorage.getItem(ALI_PERSONA_STORAGE_KEY)
  return isAliPersonaId(id)?id:ALI_DEFAULT_PERSONA_ID}catch{return ALI_DEFAULT_PERSONA_ID}
}
export function chooseAliPersona(id){
 if(!isAliPersonaId(id))return false
 try{window.localStorage.setItem(ALI_PERSONA_STORAGE_KEY,id)}catch{}
 window.dispatchEvent(new CustomEvent(ALI_PERSONA_EVENT,{detail:{id}}))
 return true
}
export function useAliPersona(){
 const [id,setId]=useState(ALI_DEFAULT_PERSONA_ID)
 useEffect(()=>{
  const sync=()=>setId(savedPersona())
  const onChange=event=>setId(isAliPersonaId(event?.detail?.id)?event.detail.id:savedPersona())
  sync()
  window.addEventListener('storage',sync)
  window.addEventListener(ALI_PERSONA_EVENT,onChange)
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener(ALI_PERSONA_EVENT,onChange)}
 },[])
 const select=useCallback(nextId=>chooseAliPersona(nextId),[])
 return {id,persona:getAliPersona(id),select}
}
