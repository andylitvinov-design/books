'use client'

// The planned paid billing module must be the sole authority for advertising.
// An HTTP 404 means the feature is not installed on this build (free-only);
// transient failures suppress promotions rather than showing ads to paid users.
import { useEffect, useState } from 'react'

export function useCoursePromotion(accountId) {
  const [state,setState]=useState({show:false,checkoutReady:false,checking:true})
  useEffect(()=>{
    if(!accountId){setState({show:false,checkoutReady:false,checking:false});return}
    const controller=new AbortController()
    setState({show:false,checkoutReady:false,checking:true})
    fetch('/api/app/billing/status',{
      method:'GET',credentials:'same-origin',cache:'no-store',
      headers:{'X-HH-Account-ID':accountId},signal:controller.signal,
    }).then(async response=>{
      if(response.status===404) {
        setState({show:true,checkoutReady:false,checking:false});return
      }
      if(!response.ok)throw new Error('BILLING_STATUS_UNAVAILABLE')
      const value=await response.json()
      if(!value?.entitlement || typeof value.entitlement.adFree!=='boolean') throw new Error('BILLING_STATUS_UNAVAILABLE')
      const adFree=value.entitlement.active===true || value.entitlement.adFree===true
      const checkoutReady=Boolean(value.enabled && !value.sandbox &&
        value.available && value.enabledPlans?.includes('advanced'))
      setState({show:!adFree,checkoutReady:!adFree&&checkoutReady,checking:false})
    }).catch(()=>{
      if(!controller.signal.aborted)setState({show:false,checkoutReady:false,checking:false})
    })
    return ()=>controller.abort()
  },[accountId])
  return state
}
