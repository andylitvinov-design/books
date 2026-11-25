import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {needsPrivateVideoChunks,uploadSignedPrivateVideoChunks,savePrivateMp4,
  PRIVATE_VIDEO_CHUNK_BYTES} from "../lib/mandala/signed-private-video-upload.mjs";

const ref="shervdixkaxurnaecioe";
const api="https://"+ref+".supabase.co/";
const tus="https://"+ref+".storage.supabase.co/storage/v1/upload/resumable/sign";
const location=tus+"/mock-upload-id";
const bucket="hh-client-private-media";
const key="personal-videos/12345678-1234-4123-8123-123456789012/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee/master.mp4";
function mp4(size){
 const bytes=Buffer.alloc(size);
 bytes.write("ftyp",4,"ascii");
 return new Blob([bytes],{type:"video/mp4"});
}
function response(status,headers={}){
 return new Response(null,{status,headers});
}
const metadata={id:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",supabaseUrl:api,
 bucket,objectKey:key,token:"test-signed-token",publishableKey:"test-publishable"};

test("small iPhone MP4s upload with video/mp4 in the actual Supabase multipart file part",async()=>{
 for(const mime of ["","application/octet-stream","video/mp4"]){
  const bytes=Buffer.from(await mp4(2048).arrayBuffer());
  const file=new File([bytes],"phone.mp4",{type:mime});
  let uploaded=false,complete=false;
  const sessionRef={current:null};
  const id=await savePrivateMp4({file,
   details:{theme:"life",sceneId:"light-path",duration:45,aspect:"portrait"},
   request:async(path,body,method)=>{
    assert.equal(method,"POST");
    if(path==="personal-videos")return metadata;
    assert.equal(path,"personal-videos/"+metadata.id);
    assert.equal(uploaded,true);complete=true;return {status:"ready"};
   },
   sessionRef,
   fetchImpl:async(url,options)=>{
    assert.equal(new URL(url).origin,new URL(api).origin);
    assert.equal(options.method,"PUT");
    assert.ok(options.body instanceof FormData);
    const uploadedFile=options.body.get("");
    assert.equal(uploadedFile.type,"video/mp4");
    assert.deepEqual(Buffer.from(await uploadedFile.arrayBuffer()),bytes);
    uploaded=true;
    return Response.json({Id:metadata.id,Key:bucket+"/"+key},{status:200});
   },
  });
  assert.equal(id,metadata.id);assert.equal(complete,true);
  assert.equal(sessionRef.current.file,file,"MIME normalization must not replace retry identity");
 }
});

test("files larger than 6 MiB use native signed TUS rather than a single Safari PUT",async()=>{
 assert.equal(needsPrivateVideoChunks(PRIVATE_VIDEO_CHUNK_BYTES+1),true);
 assert.equal(needsPrivateVideoChunks(PRIVATE_VIDEO_CHUNK_BYTES),false);
 const file=mp4(PRIVATE_VIDEO_CHUNK_BYTES+1024);
 let offset=0;
 const calls=[],progress=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method,headers:options.headers,bytes:options.body?.size||0});
  if(options.method==="POST"){
   assert.equal(url,tus);
   assert.equal(options.headers["x-signature"],metadata.token);
   assert.equal(options.headers["Upload-Length"],String(file.size));
   assert.match(options.headers["Upload-Metadata"],/bucketName/);
   assert.match(options.headers["Upload-Metadata"],/objectName/);
   return response(201,{Location:location});
  }
  if(options.method==="PATCH"){
   assert.equal(url,location);
   assert.equal(options.headers["x-signature"],metadata.token);
   assert.equal(Number(options.headers["Upload-Offset"]),offset);
   assert.equal(options.headers["Content-Type"],"application/offset+octet-stream");
   assert.ok(options.body.size<=PRIVATE_VIDEO_CHUNK_BYTES);
   offset+=options.body.size;
   return response(204,{"Upload-Offset":String(offset)});
  }
  throw Error("unexpected method");
 };
 const finished=await uploadSignedPrivateVideoChunks({
  ...metadata,file,fetchImpl,onProgress:(n,d)=>progress.push([n,d])
 });
 assert.equal(finished.uploadedBytes,file.size);
 assert.equal(finished.uploadUrl,location);
 assert.deepEqual(calls.map(x=>x.method),["POST","PATCH","PATCH"]);
 assert.equal(calls[1].bytes,PRIVATE_VIDEO_CHUNK_BYTES);
 assert.equal(calls[2].bytes,1024);
 assert.equal(progress.at(-1)[0],file.size);
 assert.ok(calls.every(x=>x.method!=="PUT"));
});

test("offline retry reuses the same reserved video and resumes via HEAD",async()=>{
 const file=mp4(PRIVATE_VIDEO_CHUNK_BYTES+24);
 const sessionRef={current:null};
 let reserves=0,complete=0,offset=0,posts=0,heads=0,patches=0;
 const request=async(path,body,method)=>{
  if(path==="personal-videos"){reserves++;return metadata;}
  assert.equal(path,"personal-videos/"+metadata.id);
  if(method==="PATCH")return {uploadUrl:body.uploadUrl};
  complete++;
  if(offset!==file.size)throw Object.assign(new Error("missing"),{code:"MEDIA_UPLOAD_NOT_FOUND"});
  return {status:"ready"};
 };
 const fetchImpl=async(url,opts)=>{
  if(opts.method==="POST"){posts++;return response(201,{Location:location});}
  if(opts.method==="HEAD"){heads++;return response(200,{"Upload-Offset":String(offset)});}
  if(opts.method==="PATCH"){
   patches++;
   if(patches===1)return response(503);
   offset+=opts.body.size;return response(204,{"Upload-Offset":String(offset)});
  }
  throw Error("unexpected");
 };
 const opts={file,details:{theme:"energy",sceneId:"personal-film",duration:30,aspect:"landscape"},
   sessionRef,request,fetchImpl};
 await assert.rejects(()=>savePrivateMp4(opts),/PRIVATE_UPLOAD_FAILED/);
 assert.equal(reserves,1);
 assert.equal(sessionRef.current.created.id,metadata.id);
 assert.equal(sessionRef.current.uploadUrl,location);
 const id=await savePrivateMp4(opts);
 assert.equal(id,metadata.id);
 assert.equal(reserves,1,"a retry must not reserve a second video or consent event");
 assert.equal(posts,1,"do not start a second TUS session on retry");
 assert.equal(heads,1);
 assert.equal(patches,3);
 assert.equal(offset,file.size);
 assert.equal(complete,2);
});

test("untrusted TUS Location never receives a signed token",async()=>{
 const file=mp4(PRIVATE_VIDEO_CHUNK_BYTES+1);
 const calls=[];
 const fetchImpl=async(url,opts)=>{
  calls.push({url,method:opts.method});
  return response(201,{Location:"https://attacker.example/storage/v1/upload/resumable/steal"});
 };
 await assert.rejects(()=>uploadSignedPrivateVideoChunks({
  ...metadata,file,fetchImpl
 }),/INVALID_STORAGE_UPLOAD_URL/);
 assert.equal(calls.length,1);
 assert.ok(calls.every(x=>x.url===tus));
});

test("unsigned TUS Location never receives a signed token even on the project host",async()=>{
 const file=mp4(PRIVATE_VIDEO_CHUNK_BYTES+1);
 const calls=[];
 await assert.rejects(()=>uploadSignedPrivateVideoChunks({
  ...metadata,file,fetchImpl:async(url,options)=>{
   calls.push(options.method);
   return response(201,{Location:tus.replace(/\/sign$/,"/unsigned-upload-id")});
  }
 }),/INVALID_STORAGE_UPLOAD_URL/);
 assert.deepEqual(calls,["POST"]);
});

test("malformed media and an expired reservation fail before new uploads",async()=>{
 const file=mp4(PRIVATE_VIDEO_CHUNK_BYTES+10);
 let called=0;
 const request=async()=>{called++;return metadata;};
 await assert.rejects(()=>savePrivateMp4({
  file:new Blob([Buffer.alloc(1024)]),details:{theme:"energy"},
  request,sessionRef:{current:null}
 }),/MEDIA_TYPE_NOT_ALLOWED/);
 assert.equal(called,0);
 const details={theme:"energy",sceneId:"personal-film",duration:30,aspect:"landscape"};
 const sessionRef={current:{file,signature:JSON.stringify(details),created:metadata,
   issuedAt:Date.now()-2*60*60*1000-1000,uploadUrl:location}};
 await assert.rejects(()=>savePrivateMp4({
  file,details,request:async(path)=>{
   if(path==="personal-videos/"+metadata.id)
    throw Object.assign(new Error("missing"),{code:"MEDIA_UPLOAD_NOT_FOUND"});
   throw Error("unexpected new reservation");
  },sessionRef
 }),/PRIVATE_UPLOAD_EXPIRED/);
});

test("both UI routes share the signed upload helper without weakening consent",()=>{
 const ready=readFileSync(new URL("../components/mandala-video-delivery.tsx",import.meta.url),"utf8");
 const gallery=readFileSync(new URL("../components/app/my-personal-videos.jsx",import.meta.url),"utf8");
 const uploader=readFileSync(new URL("../lib/mandala/signed-private-video-upload.mjs",import.meta.url),"utf8");
 assert.match(ready,/savePrivateMp4\(/);
 assert.match(gallery,/savePrivateMp4\(/);
 assert.match(ready,/uploadSessionRef/);
 assert.match(gallery,/uploadSessionRef/);
 assert.match(uploader,/const SIGNED_TOKEN_LIFETIME_MS=2\*60\*60\*1000/);
 assert.match(uploader,/x-signature/);
 assert.match(uploader,/PRIVATE_VIDEO_CHUNK_BYTES=6\*1024\*1024/);
 assert.match(uploader,/uploadToSignedUrl/);
 assert.match(uploader,/request\("personal-videos"/);
 assert.match(uploader,/consent:true/);
 assert.match(uploader,/request\("personal-videos\/"\+session\.created\.id,undefined,"POST"\)/);
 assert.doesNotMatch(uploader,/localStorage|sessionStorage|service_role|upsert:true/);
});

test("reselecting the exact file after page refresh resumes the same private reservation",async()=>{
  const file=mp4(PRIVATE_VIDEO_CHUNK_BYTES+24);
  const details={theme:"energy",sceneId:"personal-film",duration:30,aspect:"landscape"};
  let reservations=0, tusCreates=0, offset=0;
  let finishInterrupted=false;
  const tickets=new Map();
  const request=async(path,body,method)=>{
    if(path==="personal-videos"){
      if(body.fingerprint&&tickets.has(body.fingerprint)){
        return {...tickets.get(body.fingerprint),resumed:true};
      }
      reservations++;
      const ticket={...metadata,issuedAt:Date.now(),uploadUrl:null};
      if(body.fingerprint)tickets.set(body.fingerprint,ticket);
      return ticket;
    }
    assert.equal(path,"personal-videos/"+metadata.id);
    if(method==="PATCH"){
      assert.equal(tickets.size,1);
      const ticket=[...tickets.values()][0];
      assert.equal(body.previousUploadUrl,ticket.uploadUrl);
      ticket.uploadUrl=body.uploadUrl;
      return {uploadUrl:ticket.uploadUrl};
    }
    if(offset!==file.size)throw Object.assign(new Error("missing"),{code:"MEDIA_UPLOAD_NOT_FOUND"});
    return {video:{id:metadata.id,status:"ready"}};
  };
  const fetchImpl=async(url,opts)=>{
    if(opts.method==="POST"){tusCreates++;if(tusCreates>1)offset=0;return response(201,{Location:location});}
    if(opts.method==="HEAD")return response(200,{"Upload-Offset":String(offset)});
    if(offset>0&&!finishInterrupted){finishInterrupted=true;return response(503);}
    offset+=opts.body.size;
    return response(204,{"Upload-Offset":String(offset)});
  };
  const common={details,request,fetchImpl};
  await assert.rejects(()=>savePrivateMp4({...common,file,sessionRef:{current:null}}),/PRIVATE_UPLOAD_FAILED/);
  assert.equal(offset,PRIVATE_VIDEO_CHUNK_BYTES);
  // Reload recreates the component and the user selects the same bytes again.
  const reselected=mp4(file.size);
  assert.equal(await savePrivateMp4({...common,file:reselected,sessionRef:{current:null}}),metadata.id);
  assert.equal(reservations,1,"a reloaded page must not reserve a second video or consent");
  assert.equal(tusCreates,1,"a reloaded page must use HEAD on the same TUS upload");
});
