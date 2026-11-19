"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PublicLocale } from "@/lib/public-locales";

const HomeDeferredContent = dynamic(
  () => import("./home-deferred-content").then(mod => mod.HomeDeferredContent),
  {ssr:false,loading:()=>null}
);

// Do not download topic catalogues, course lists or marketing carousels as part
// of the first interactive viewport. A 4KB local background and the Ali form
// can paint independently of the rest of Holistic House.
export function HomeDeferredSections({locale}:{locale:PublicLocale}){
  const anchor=useRef<HTMLDivElement|null>(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const target=anchor.current;
    if(!target)return;
    if(typeof IntersectionObserver==="undefined"){setVisible(true);return}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect()}
    },{rootMargin:"220px 0px",threshold:0});
    observer.observe(target);
    return()=>observer.disconnect();
  },[]);
  return <div id="home-discover" ref={anchor} data-home-deferred-sections
    data-home-deferred-ready={visible?"true":"false"}
    style={{minHeight:visible?undefined:140,contentVisibility:"auto",containIntrinsicSize:"auto 600px"}}>
    {visible?<HomeDeferredContent locale={locale}/>:null}
    <noscript><a href={"/"+locale+"/academy"}>Courses</a> · <a href={"/"+locale+"/services"}>Services</a></noscript>
  </div>;
}
