import { ImageResponse } from 'next/og'
import { createElement } from 'react'

export const runtime = 'edge'

export async function GET(_request, { params }) {
  const { size: requested } = await params
  const size = requested === '192' ? 192 : requested === '512' ? 512 : null
  if (!size) return new Response('Not found', { status: 404 })

  const circle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: size * .52, height: size * .52, borderRadius: size * .26,
    border: Math.max(2, Math.round(size * .012)) + 'px solid #b4e6dc',
    background: 'linear-gradient(145deg, #0b7188 0%, #11566e 100%)',
    color: '#ffe2a3', fontFamily: 'sans-serif', fontWeight: 500,
    fontSize: size * .36, lineHeight: 1,
  }
  const label = {
    display: 'flex', color: '#fff7e8', fontFamily: 'sans-serif',
    fontSize: size * .10, fontWeight: 700, letterSpacing: size * .006,
    marginTop: size * .045,
  }
  return new ImageResponse(createElement('div', {
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', width: '100%', height: '100%',
      background: 'linear-gradient(145deg, #092f4b 0%, #146f80 65%, #0d5267 100%)',
      borderRadius: size * .13,
    },
  },
  createElement('div', { style: circle }, 'O'),
  createElement('span', { style: label }, 'OPORA'),
  ), { width: size, height: size, headers: { 'Cache-Control': 'public, max-age=86400' } })
}
