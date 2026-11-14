import "server-only";
import { transaction } from "../app/database.js";
import { parseSessionYouTubeUrl } from "./youtube-resource.js";

// Public-only projector isolated from private media upload/storage imports.
// The publication SQL and URL validation remain byte-identical.
export async function listPublicLibraryVideos(config,locale){
  if(!['en','ru','es'].includes(locale))return []
  return transaction(config,null,async db=>{
    const rows=(await db.query(
      "select id,title,description,url,public_locale,published_at from app_private.practitioner_materials where kind='youtube' and status='ready' and public_locale=$1 and published_at is not null order by published_at desc,id desc limit 60",
      [locale]
    )).rows
    return rows.flatMap(row=>{
      const safe=parseSessionYouTubeUrl(row.url)
      return safe?[{
        id:row.id,title:row.title,description:row.description||'',
        youtubeId:safe.id,url:safe.url,locale:row.public_locale,
        publishedAt:new Date(row.published_at).toISOString(),
      }]:[]
    })
  },{server:true})
}
