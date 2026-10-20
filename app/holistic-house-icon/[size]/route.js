import { ImageResponse } from 'next/og'
import { createElement } from 'react'

export const runtime = 'edge'
// Raster icons for Safari Home Screen and Chromium installability.
// Pure vector geometry; no private account content or external lookups.
export async function GET(_request, { params }) {
  const {size:requested} = await params
  const size = {'180':180,'192':192,'512':512}[requested]
  if(!size)return new Response('Not found',{status:404})
  const div=(style,...children)=>createElement('div',{style},...children)
  const icon = div({
    display:'flex',position:'relative',height:'100%',width:'100%',
    alignItems:'center',justifyContent:'center',
    background:'linear-gradient(145deg, #153a3d 0%, #245d52 60%, #287a67 100%)',
    borderRadius:size*.225,overflow:'hidden',
  },
    div({display:'flex',position:'absolute',width:size*.70,height:size*.70,
      borderRadius:size*.35,background:'#ffffff',opacity:0.07,
      left:size*.15,top:size*.15}),
    // Draw the sparkle geometrically: glyph ✦ forced @vercel/og to fetch a
    // dynamic font and produced repeated 400/font errors in production.
    div({display:'flex',position:'absolute',top:size*.15,left:size*.455,
      width:size*.09,height:size*.09,borderRadius:size*.014,
      background:'#c4e7cf',transform:'rotate(45deg)'}),
    div({display:'flex',fontFamily:'sans-serif',fontWeight:800,
      fontSize:size*.37,letterSpacing:-size*.014,
      color:'#f6fbf8',lineHeight:1},'HH'),
    div({display:'flex',position:'absolute',width:size*.10,height:size*.10,
      borderRadius:size*.05,background:'#bce9ce',
      bottom:size*.15,right:size*.15,opacity:0.90})
  )
  return new ImageResponse(icon,{width:size,height:size,headers:{
    'Cache-Control':'public, max-age=86400, s-maxage=86400',
    'Content-Disposition':'inline'
  }})
}
