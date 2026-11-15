#!/usr/bin/env node
/**
 * One-time owner/editorial import for the Holistic House concept-photo library.
 * Downloads only the exact Commons files already recorded in the versioned
 * source manifest. Does not scrape search results or accept arbitrary URLs.
 */
import {createHash} from "node:crypto";
import {mkdir,readFile,writeFile,stat} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=process.cwd();
const manifestPath=path.join(root,"data/video-catalog/photo-library-v1.json");
const publicRoot=path.join(root,"public");
const manifest=JSON.parse(await readFile(manifestPath,"utf8"));
const expectedHost="upload.wikimedia.org";
const MAX_BYTES=5*1024*1024;
const MIN_BYTES=40*1024;
const WIDTH=1920;
const sha256=buffer=>createHash("sha256").update(buffer).digest("hex");
const sha1=buffer=>createHash("sha1").update(buffer).digest("hex");

function jpegDimensions(buffer){
  if(buffer.length<4||buffer[0]!==0xff||buffer[1]!==0xd8)throw Error("not_jpeg");
  let offset=2;
  while(offset+9<buffer.length){
    if(buffer[offset]!==0xff){offset++;continue;}
    const marker=buffer[offset+1];offset+=2;
    if(marker===0xd9||marker===0xda)break;
    if(offset+2>buffer.length)break;
    const length=buffer.readUInt16BE(offset);
    if(length<2||offset+length>buffer.length)break;
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
      return {height:buffer.readUInt16BE(offset+3),width:buffer.readUInt16BE(offset+5)};
    }
    offset+=length;
  }
  throw Error("jpeg_dimensions_missing");
}

function thumbnailUrl(source){
  const url=new URL(source);
  if(url.protocol!=="https:"||url.hostname!==expectedHost||
     !url.pathname.startsWith("/wikipedia/commons/"))throw Error("source_not_allowlisted");
  const parts=url.pathname.split("/");
  if(parts.length!==6)throw Error("source_path_invalid");
  const file=parts[5];
  return "https://upload.wikimedia.org/wikipedia/commons/thumb/"+
    parts[3]+"/"+parts[4]+"/"+file+"/"+WIDTH+"px-"+file;
}

const downloadedHashes=new Map();
let imported=0, skipped=0;
for(const asset of manifest.assets){
  if(asset.status==="approved"&&asset.downloadStatus==="imported"){
    const existing=path.join(publicRoot,asset.localPath.replace(/^\//,""));
    try{
      const bytes=await readFile(existing);
      if(sha256(bytes)===asset.sha256){skipped++;continue;}
    }catch{}
  }
  const url=thumbnailUrl(asset.sourceFileUrl);
  const response=await fetch(url,{headers:{
    "User-Agent":"HolisticHouse-PhotoLibrary/1.0 (source attribution in manifest)",
    "Accept":"image/jpeg",
  },redirect:"follow"});
  if(!response.ok)throw Error(asset.id+": source_http_"+response.status);
  if(new URL(response.url).hostname!==expectedHost)throw Error(asset.id+": source_redirect_not_allowed");
  const type=(response.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  if(type!=="image/jpeg")throw Error(asset.id+": unexpected_content_type_"+type);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<MIN_BYTES||bytes.length>MAX_BYTES)throw Error(asset.id+": image_size_out_of_bounds");
  const dimensions=jpegDimensions(bytes);
  if(dimensions.width<720||dimensions.height<720||dimensions.width>WIDTH)
    throw Error(asset.id+": image_dimensions_out_of_bounds");
  const hash=sha256(bytes);
  const duplicate=downloadedHashes.get(hash);
  if(duplicate)throw Error(asset.id+": duplicate_photo_of_"+duplicate);
  downloadedHashes.set(hash,asset.id);
  const target=path.join(publicRoot,asset.localPath.replace(/^\//,""));
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,bytes,{flag:"w"});
  asset.status="approved";
  asset.downloadStatus="imported";
  asset.editorialStatus="source-and-frame-reviewed";
  asset.bytes=bytes.length;
  asset.width=dimensions.width;
  asset.height=dimensions.height;
  asset.sha256=hash;
  asset.importedVariantUrl=url;
  asset.licenseUrl=asset.licenseId==="CC0-1.0"
    ?"https://creativecommons.org/publicdomain/zero/1.0/"
    :asset.licenseId==="Public-Domain"
      ?"https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_subject_matter"
      :"https://creativecommons.org/licenses/by/2.0/";
  asset.modificationNotice="Downscaled Wikimedia Commons original to a maximum width of 1920px; no content edits.";
  imported++;
}
manifest.importedPhotoCount=manifest.assets.filter(a=>a.status==="approved"&&a.downloadStatus==="imported").length;
manifest.importedAt=new Date().toISOString();
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+"\n");
console.log(JSON.stringify({
  imported,skipped,total:manifest.assets.length,
  approved:manifest.importedPhotoCount,
  output:"public/images/video-library/",
  duplicateGuard:true,sourceHost:expectedHost
},null,2));
