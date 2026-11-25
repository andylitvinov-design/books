"use client";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { PublicLocale } from "@/lib/public-locales";

// React.lazy is evaluated only after the observer actually reveals this area.
// Next dynamic() would eagerly associate the hidden catalog CSS with Home's
// route manifest even though it was never rendered in the initial viewport.
const HomeDeferredContent = lazy(
  () => import("./home-deferred-content").then(mod => ({ default: mod.HomeDeferredContent }))
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
    data-home-deferred-ready={visible?"true":"false"}>
    {visible?<Suspense fallback={null}><HomeDeferredContent locale={locale}/></Suspense>:null}
    <noscript><a href={"/"+locale+"/academy"}>Courses</a> · <a href={"/"+locale+"/services"}>Services</a></noscript>
  </div>;
}
