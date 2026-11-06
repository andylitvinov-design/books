"use client";

import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";
import {MessageCircleQuestion, X} from "lucide-react";
import {HolisticAgentChat} from "@/components/holistic-agent-chat";
import {pageHelpFromRoute} from "@/lib/ihelp/page-context.mjs";
import type {IHelpPageContext} from "@/lib/ihelp/page-context.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import styles from "./sitewide-ihelp.module.css";

const UI={
 ru:{open:"Открыть iHelp — помощник по странице",close:"Закрыть iHelp",title:"iHelp",subtitle:"ИИ-помощник по странице · не психотерапевт"},
 en:{open:"Open iHelp — page-aware guide",close:"Close iHelp",title:"iHelp",subtitle:"AI guide for this page · not a therapist"},
 es:{open:"Abrir iHelp — guía de la página",close:"Cerrar iHelp",title:"iHelp",subtitle:"Guía IA de esta página · no es terapeuta"},
} as const;

function routeLocale(pathname:string):PublicLocale {
 const match=/^\/(ru|en|es)(?:\/|$)/.exec(pathname);
 return (match?.[1] as PublicLocale|undefined) ?? "en";
}

// Read only reviewed *UI state identifiers* from a video editor, never page
// text, search queries, test answers, health scores or private DOM content.
function selectedEditorTab():string {
 const studio=document.querySelector<HTMLElement>("[data-mandala-free-video]");
 const workspace=studio?.getAttribute("data-active-workspace")||"";
 if(workspace==="editor"){
   const subtab=studio?.getAttribute("data-montage-panel")||"";
   if(["audio","text","effects","settings"].includes(subtab))return subtab;
   return "editor";
 }
 if(["video","ideas","effects","audio","text"].includes(workspace))return workspace;
 const pressed=document.querySelector<HTMLElement>("[data-video-quick-control][aria-pressed='true']");
 const selected=pressed?.getAttribute("data-video-quick-control")||"";
 return ["video","ideas","editor","effects","audio","text"].includes(selected)?selected:"";
}

export function SitewideIHelp(){
 const pathname=usePathname()||"/";
 const locale=routeLocale(pathname);
 const t=UI[locale];
 const [open,setOpen]=useState(false);
 const [nativeVideoOpen,setNativeVideoOpen]=useState(false);
 const [mounted,setMounted]=useState(false);
 const [context,setContext]=useState<IHelpPageContext>(()=>pageHelpFromRoute({locale,pathname}));
 const launcher=useRef<HTMLButtonElement>(null);
 const dialog=useRef<HTMLElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const priorPath=useRef(pathname);
 // The video studio reports whether its ONE real Director drawer is open.
 // We do not mount a second copy of the video chatbot here.
 useEffect(()=>{
   const stateChanged=(event:Event)=>{
     const state=(event as CustomEvent<{open:boolean}>).detail;
     setNativeVideoOpen(state?.open===true);
   };
   window.addEventListener("hh:ihelp-video-director-state",stateChanged);
   return ()=>window.removeEventListener("hh:ihelp-video-director-state",stateChanged);
 },[]);

 useEffect(()=>{
   if(priorPath.current!==pathname){
     priorPath.current=pathname;
     // A navigation cannot trigger an unsolicited help popup.
     setOpen(false);
   }
 },[pathname]);

 useEffect(()=>{
   if(!open)return;
   const before=document.body.style.overflow;
   document.body.style.overflow="hidden";
   const focusFrame=window.requestAnimationFrame(()=>closeButton.current?.focus({preventScroll:true}));
   function handleKey(event:KeyboardEvent){
     if(event.key==="Escape"){
       event.preventDefault();
       setOpen(false);
       window.requestAnimationFrame(()=>launcher.current?.focus({preventScroll:true}));
       return;
     }
     if(event.key!=="Tab")return;
     const elements=Array.from(dialog.current?.querySelectorAll<HTMLElement>(
       "button:not([disabled]),a[href],textarea:not([disabled]),input:not([disabled]),select:not([disabled]),summary"
     )||[]).filter(el=>el.getClientRects().length>0);
     if(!elements.length){event.preventDefault();return;}
     const first=elements[0],last=elements[elements.length-1];
     if(event.shiftKey&&(document.activeElement===first||!dialog.current?.contains(document.activeElement))){
       event.preventDefault();last.focus();
     }else if(!event.shiftKey&&(document.activeElement===last||!dialog.current?.contains(document.activeElement))){
       event.preventDefault();first.focus();
     }
   }
   document.addEventListener("keydown",handleKey);
   return ()=>{
     window.cancelAnimationFrame(focusFrame);
     document.removeEventListener("keydown",handleKey);
     document.body.style.overflow=before;
   };
 },[open]);

 function close(){
   setOpen(false);
   window.requestAnimationFrame(()=>launcher.current?.focus({preventScroll:true}));
 }
 function show(){
   // Video Studio already has an executable, single-instance AI Video Director.
   // Launch its existing conversation without resetting the Studio draft.
   if(/^\/(?:ru|en|es)\/(?:holistic-support\/mandala|video-studio)(?:\/|$)/.test(pathname)){
     const studio=document.querySelector<HTMLElement>("[data-mandala-free-video]");
     if(studio?.querySelector("[data-video-director-chat-details]")){
       const request=new CustomEvent<{handled:boolean}>("hh:ihelp-open-video-director",
         {detail:{handled:false}});
       window.dispatchEvent(request);
       if(request.detail.handled)return;
     }
   }
   // The dedicated Messages page already owns this same AI component.
   // Activate its AI tab rather than mounting a second concurrent chat.
   if(/^\/(?:ru|en|es)\/app\/messages(?:\/|$)/.test(pathname)){
     const tab=document.querySelector<HTMLButtonElement>(
       "[data-orders-clients-hub] [aria-controls='hh-ai-panel']"
     );
     if(tab){
       tab.click();
       window.requestAnimationFrame(()=>
         document.querySelector<HTMLTextAreaElement>("[data-hh-messenger-ai] textarea")
           ?.focus({preventScroll:true}));
       return;
     }
   }
   const params=new URLSearchParams(window.location.search);
   setContext(pageHelpFromRoute({
     locale,pathname,hash:window.location.hash,
     activeTab:selectedEditorTab(),photo:params.get("mode")==="photo"
   }));
   setMounted(true);
   setOpen(true);
 }
 return <>
   <button type="button" ref={launcher} className={styles.launcher}
     data-hh-ihelp-trigger aria-label={t.open} aria-haspopup="dialog"
     aria-controls={nativeVideoOpen?"hh-ihelp-video-director-dialog":"hh-ihelp-panel"}
     aria-expanded={open||nativeVideoOpen} onClick={show}>
     <MessageCircleQuestion size={18} aria-hidden="true"/><span>iHelp</span>
   </button>
   {mounted&&<div className={styles.overlay} data-hh-ihelp-overlay hidden={!open}>
     <button type="button" tabIndex={-1} aria-label={t.close}
       className={styles.backdrop} onClick={close}/>
     <section id="hh-ihelp-panel" role="dialog" aria-modal="true"
       data-hh-ihelp-dialog data-hh-ihelp-section={context.section}
       ref={dialog} aria-labelledby="hh-ihelp-heading" className={styles.panel}>
       <header className={styles.header}>
         <div className={styles.heading}><strong id="hh-ihelp-heading">{t.title}</strong>
           <small>{t.subtitle}</small></div>
         <button type="button" ref={closeButton} className={styles.close} onClick={close}
           aria-label={t.close}><X size={21} aria-hidden="true"/></button>
       </header>
       <div className={styles.chat}>
         <HolisticAgentChat locale={locale} compact pageHelp={context}/>
       </div>
     </section>
   </div>}
 </>;
}
