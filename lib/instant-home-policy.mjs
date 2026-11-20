// Fast HTML only for direct anonymous Home documents, never for RSC/prefetch.
export function instantHomeLocale({pathname,method,headers,searchParams}) {
 const language=pathname==="/"||pathname==="/en"||pathname==="/en/"?"en":pathname==="/ru"||pathname==="/ru/"?"ru":pathname==="/es"||pathname==="/es/"?"es":null;
 if(!language||!["GET","HEAD"].includes(method)||searchParams?.has("_rsc")||searchParams?.get("full")==="1")return null;
 if(headers?.has("rsc")||headers?.has("next-router-state-tree")||headers?.has("next-router-prefetch")||headers?.has("x-nextjs-data")||/text\/x-component/i.test(headers?.get("accept")||""))return null;
 return language;
}
