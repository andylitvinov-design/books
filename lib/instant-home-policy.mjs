// Legacy fast HTML can only be served when middleware explicitly opts in.
// The canonical public homepage is the approved React Home in all three locales.
// Legacy HTML is eligible only for direct anonymous Home documents, never RSC/prefetch.
export function instantHomeLocale({pathname,method,headers,searchParams}) {
 const language=pathname==="/"||pathname==="/en"||pathname==="/en/"?"en":pathname==="/ru"||pathname==="/ru/"?"ru":null;
 if(!language||!["GET","HEAD"].includes(method)||searchParams?.has("_rsc")||searchParams?.get("full")==="1")return null;
 if(headers?.has("rsc")||headers?.has("next-router-state-tree")||headers?.has("next-router-prefetch")||headers?.has("x-nextjs-data")||/text\/x-component/i.test(headers?.get("accept")||""))return null;
 return language;
}
