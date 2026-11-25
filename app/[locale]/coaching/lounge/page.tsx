import {notFound, permanentRedirect} from 'next/navigation'

const publicLocales=['en','ru','es']

// Single canonical public Coaching Lounge. This friendly URL never duplicates
// the live catalog or creates a second session engine/database.
export default async function CoachingLoungeAlias({params}: {params: Promise<{locale: string}>}){
  const {locale}=await params
  if(!publicLocales.includes(locale))notFound()
  permanentRedirect('/'+locale+'/coaching')
}
