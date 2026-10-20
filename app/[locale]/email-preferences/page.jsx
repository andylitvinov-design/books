import EmailPreferences from '@/components/app/crm-email-preferences'
export const dynamic='force-dynamic'
export const metadata={title:'Email preferences · Holistic House',robots:{index:false,follow:false}}
export default async function Page({params}) {
  const {locale}=await params
  return <EmailPreferences locale={['en','ru','es'].includes(locale)?locale:'en'} />
}
