import 'server-only'
import { NextResponse } from 'next/server'
import { getAppConfig } from '../app/config.js'
import { deliveryEnabled } from './delivery-model.js'
import { requireAdminRequest } from '../prescriptions/admin.js'
import { getPrescriptionStore } from '../prescriptions/store.js'
import { isSameOriginRequest } from '../prescriptions/session.js'
import { privateHeaders } from './session.js'
export const privateJson=(data,status=200)=>NextResponse.json(data,{status,headers:privateHeaders})
export const privateError=(error)=>{
  const valid=error?.name==='AppError'
  const status=valid?error.status:503
  const allowed=[400,401,403,404,409,413,415,429,503]
  return privateJson({error:valid?error.code:'PRIVATE_DELIVERY_UNAVAILABLE'},
    allowed.includes(status)?status:503)
}
export async function smallJson(request,limit=65536) {
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') ||
    Number(request.headers.get('content-length')||0)>limit || !isSameOriginRequest(request))
    throw Object.assign(new Error('Origin denied'),{name:'AppError',code:'ORIGIN_DENIED',status:403})
  const text=await request.text()
  if(!text||Buffer.byteLength(text)>limit) throw Object.assign(new Error('Payload too large'),{name:'AppError',code:'INVALID_REQUEST',status:413})
  try {const value=JSON.parse(text);if(value&&typeof value==='object'&&!Array.isArray(value)) return value}
  catch {}
  throw Object.assign(new Error('Invalid JSON'),{name:'AppError',code:'INVALID_REQUEST',status:400})
}
export async function ownerDelivery(request,fn,{body=false}={}) {
  if(!deliveryEnabled()) return privateJson({error:'SESSION_UNAVAILABLE'},404)
  if(!await requireAdminRequest()) return privateJson({error:'SESSION_UNAVAILABLE'},404)
  try {
    const config=getAppConfig(),store=getPrescriptionStore()
    if(!store) return privateJson({error:'SESSION_UNAVAILABLE'},503)
    const data=body?await smallJson(request):undefined
    return await fn({config,store,data})
  } catch(error) {return privateError(error)}
}
export async function privateDelivery(fn) {
  if(!deliveryEnabled()) return privateJson({error:'SESSION_UNAVAILABLE'},404)
  try {
    return await fn({config:getAppConfig(),store:getPrescriptionStore()})
  } catch(error){return privateError(error)}
}
