import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {streamReadyMaterial} from '@/lib/clients/material-library'
export const runtime='nodejs'
export const dynamic='force-dynamic'
async function handle(request,{params}){
  const {id}=await params
  return ownerMaterialRequest(request,async({config})=>streamReadyMaterial(config,id,request))
}
export const GET=handle
export const HEAD=handle
