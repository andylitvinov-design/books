'use client'
import {useEffect,useState} from 'react'
import {COURSE_CART_STORAGE_KEY,restoreCourseCart} from '@/lib/commerce/course-cart.mjs'
import {SERVICE_CART_UPDATED_EVENT} from '@/lib/commerce/cart'

export function useCourseCart(includeUrl = false) {
  const [ids,setIds] = useState<string[]>([])
  const [ready,setReady] = useState(false)
  useEffect(()=>{
    function sync(){
      let stored:string[]=[]
      try{stored=restoreCourseCart(window.sessionStorage.getItem(COURSE_CART_STORAGE_KEY))}catch{}
      setIds(stored)
    }
    sync()
    if(includeUrl){
      const raw=new URLSearchParams(window.location.search).get('courses')
      if(raw){
        const selected=restoreCourseCart(JSON.stringify(raw.split(',')))
        if(selected.length){
          let stored:string[]=[]
          try{stored=restoreCourseCart(window.sessionStorage.getItem(COURSE_CART_STORAGE_KEY))}catch{}
          const next=restoreCourseCart(JSON.stringify([...stored,...selected]))
          setIds(next)
          try{window.sessionStorage.setItem(COURSE_CART_STORAGE_KEY,JSON.stringify(next))}catch{}
          // Remove URL selection once consumed; removal must survive reload.
          const url=new URL(window.location.href)
          url.searchParams.delete('courses')
          window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash)
          window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT))
        }
      }
    }
    setReady(true)
    window.addEventListener(SERVICE_CART_UPDATED_EVENT,sync)
    window.addEventListener('pageshow',sync)
    return()=>{window.removeEventListener(SERVICE_CART_UPDATED_EVENT,sync);window.removeEventListener('pageshow',sync)}
  },[includeUrl])
  function change(id:string,add:boolean){
    let current=ids
    try{current=restoreCourseCart(window.sessionStorage.getItem(COURSE_CART_STORAGE_KEY))}catch{}
    const next=restoreCourseCart(JSON.stringify(add?[...current,id]:current.filter(x=>x!==id)))
    setIds(next)
    try{window.sessionStorage.setItem(COURSE_CART_STORAGE_KEY,JSON.stringify(next))
      window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT))}catch{}
  }
  return {ids,ready,change}
}
