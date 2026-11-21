'use client'
import {useCallback,useEffect,useState} from 'react'
import {ALI_DEFAULT_PERSONA_ID,ALI_PERSONA_EVENT,ALI_PERSONA_STORAGE_KEY,
 getAliPersona,isAliPersonaId} from '@/lib/holistic-support/ali-personas.mjs'

/** @param {string} [fallbackId] */
function savedPersona(fallbackId=ALI_DEFAULT_PERSONA_ID){
 try{const id=window.localStorage.getItem(ALI_PERSONA_STORAGE_KEY)
  return isAliPersonaId(id)?id:fallbackId}catch{return fallbackId}
}
export function chooseAliPersona(id){
 if(!isAliPersonaId(id))return false
 try{window.localStorage.setItem(ALI_PERSONA_STORAGE_KEY,id)}catch{}
 window.dispatchEvent(new CustomEvent(ALI_PERSONA_EVENT,{detail:{id}}))
 return true
}
/** @param {string} [initialId] */
export function useAliPersona(initialId=ALI_DEFAULT_PERSONA_ID){
 const [id,setId]=useState(isAliPersonaId(initialId)?initialId:ALI_DEFAULT_PERSONA_ID)
 useEffect(()=>{
  const sync=()=>setId(savedPersona(initialId))
  const onChange=event=>setId(isAliPersonaId(event?.detail?.id)?event.detail.id:savedPersona(initialId))
  sync()
  window.addEventListener('storage',sync)
  window.addEventListener(ALI_PERSONA_EVENT,onChange)
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener(ALI_PERSONA_EVENT,onChange)}
 },[initialId])
 const select=useCallback(nextId=>chooseAliPersona(nextId),[])
 return {id,persona:getAliPersona(id),select}
}
