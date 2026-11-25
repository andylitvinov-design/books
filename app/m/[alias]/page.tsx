import type { Metadata } from 'next'
import ShortMasterProfile, {generateMetadata as aliasMetadata} from '../../[locale]/m/[alias]/page'

type Params={params:Promise<{alias:string}>}
export const dynamic='force-dynamic'
export const revalidate=0

export async function generateMetadata({params}:Params):Promise<Metadata>{
  const {alias}=await params
  return aliasMetadata({params:Promise.resolve({locale:'en',alias})})
}

export default async function PublicShortMaster({params}:Params){
  const {alias}=await params
  return ShortMasterProfile({params:Promise.resolve({locale:'en',alias})})
}
