// Public first-party proxy for thumbnails of practitioner-approved general
// YouTube lessons. Never accept arbitrary image URLs or private client keys.
// Client viewers do not contact YouTube until deliberately pressing Play.
export const runtime='nodejs'
export const dynamic='force-dynamic'

const videoIdPattern=/^[A-Za-z0-9_-]{11}$/
const maxImageBytes=512_000

export async function GET(_request,{params}) {
  const {videoId}=await params
  if(!videoIdPattern.test(videoId||''))
    return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}})
  try{
    const source='https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg'
    const response=await fetch(source,{
      method:'GET',redirect:'error',cache:'force-cache',signal:AbortSignal.timeout(7000),
    })
    if(!response.ok||!/^image\/jpeg(?:;|$)/i.test(response.headers.get('content-type')||''))
      throw new Error('POSTER_UNAVAILABLE')
    const declared=response.headers.get('content-length')
    if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maxImageBytes))
      throw new Error('POSTER_TOO_LARGE')
    const bytes=await response.arrayBuffer()
    const sample=new Uint8Array(bytes)
    if(sample.length<16||sample.length>maxImageBytes||sample[0]!==0xff||sample[1]!==0xd8)
      throw new Error('INVALID_POSTER')
    return new Response(bytes,{
      headers:{
        'Content-Type':'image/jpeg',
        'Content-Length':String(sample.length),
        'Cache-Control':'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        'X-Content-Type-Options':'nosniff',
      }
    })
  }catch{
    return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}})
  }
}
