import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isPublicLocale } from '@/data/academy/catalog'
import { getAppConfig } from '@/lib/app/config'
import { createPractitionerRepository } from '@/lib/practitioners/repository'
import MasterProfile, { generateMetadata as profileMetadata } from '../../masters/[slug]/page'

type Params={params:Promise<{locale:string;alias:string}>}

export const dynamic='force-dynamic'
export const revalidate=0

async function profileSlug(locale:string,alias:string){
  if(!isPublicLocale(locale))notFound()
  try{
    const slug=await createPractitionerRepository(getAppConfig()).resolvePublicAlias(alias)
    if(slug)return slug
  }catch{
    // Unknown, reserved and unpublished names all have the same 404 response.
  }
  notFound()
}

export async function generateMetadata({params}:Params):Promise<Metadata>{
  const {locale,alias}=await params
  const slug=await profileSlug(locale,alias)
  // The original permanent profile URL remains the search-engine canonical.
  return profileMetadata({params:Promise.resolve({locale,slug})})
}

export default async function ShortMasterProfile({params}:Params){
  const {locale,alias}=await params
  const slug=await profileSlug(locale,alias)
  // Reuse the existing moderated profile and service rendering, no duplicate data.
  return MasterProfile({params:Promise.resolve({locale,slug})})
}
