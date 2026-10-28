import { NextResponse } from 'next/server'
import { configuredTalismanBasket, publicTalismanBasketView } from '@/lib/commerce/talisman-checkout'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  const url = new URL(request.url)
  const locale = url.searchParams.get('locale')
  const raw = url.searchParams.get('items') || ''
  if (!['en','ru','es'].includes(locale) || raw.length > 160 ||
      Array.from(url.searchParams.keys()).some(key => !['locale','items'].includes(key))) {
    return NextResponse.json({error:'INVALID_SELECTION'}, {status:400,headers:{'Cache-Control':'no-store'}})
  }
  const basket = configuredTalismanBasket(raw.split(','), locale)
  return NextResponse.json(publicTalismanBasketView(basket),
    {headers:{'Cache-Control':'private, no-store', 'X-Robots-Tag':'noindex'}})
}
