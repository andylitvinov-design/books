import { ImageResponse } from 'next/og'
import { createElement } from 'react'
export const runtime = 'edge'
// Generated from simple vector geometry, with no user data or external assets.
export async function GET(_request, { params }) {
  const { size: value } = await params
  const size = value === '192' ? 192 : value === '512' ? 512 : null
  if (!size) return new Response('Not found', { status: 404 })
  return new ImageResponse(createElement('div', { style: { display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#4f3829', color: '#fffdf8', fontSize: size * .36, fontWeight: 700 } }, 'HH'), { width: size, height: size, headers: { 'Cache-Control': 'public, max-age=86400' } })
}
