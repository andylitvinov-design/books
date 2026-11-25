import {NextResponse} from 'next/server'
import {getAppConfig,requireSameOrigin} from '@/lib/app/config'
import {createRequestAuth} from '@/lib/app/session'
import {transaction,consumeRate} from '@/lib/app/database'
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http'
import {validateVaultResolveInput,listApprovedVaultRows,resolveVaultFourShots,serverVaultR2} from '@/lib/video-vault/api-service.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(request){
 try{
  const app=getAppConfig()
  requireSameOrigin(request,app)
  const auth=createRequestAuth(request,app)
  const actor=await auth.verified()
  await consumeRate(app,'vault-resolve:'+actor.id,15,60)
  const input=validateVaultResolveInput(await readBody(request,4096))
  const {config,r2}=serverVaultR2()
  const rows=await transaction(app,actor,db=>listApprovedVaultRows(db,{assetIds:input.assetIds}))
  const result=await resolveVaultFourShots(rows,input,{r2,bucket:config.bucket})
  return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}))
 }catch(error){
  const {status,code}=safeError(error)
  return NextResponse.json({error:code},{status,headers:PRIVATE_HEADERS})
 }
}
