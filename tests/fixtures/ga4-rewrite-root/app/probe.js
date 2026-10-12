"use client";
import {useEffect} from 'react';
export default function Probe(){useEffect(()=>{
 let lastUrl;const record=()=>{if(lastUrl===location.href)return;lastUrl=location.href;window.__reportProof?.({url:location.href,documentId:window.__miniDocument,kind:'public-probe'});};record();
 const timer=setInterval(record,1);document.documentElement.dataset.probeReady='true';
 if(document.cookie.split(';').some(value=>value.trim()==='synthetic_analytics_granted=true')){
  window.dataLayer=[];window.gtag=function(){window.dataLayer.push(arguments);};
  const context={page_location:location.origin+location.pathname,page_path:location.pathname,page_title:'Holistic House',page_referrer:''};
  window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  window.gtag('set',context);window.gtag('js',new Date());
  window.gtag('config','G-3WX7PDD52N',{send_page_view:false,cookie_domain:'none',allow_google_signals:false,allow_ad_personalization_signals:false});
  window.gtag('event','page_view',{...context,send_to:'G-3WX7PDD52N'});
  const script=document.createElement('script');script.id='mini-google-tag';script.src='https://www.googletagmanager.com/gtag/js?id=G-3WX7PDD52N';script.referrerPolicy='no-referrer';script.async=true;document.head.appendChild(script);
 }
 return ()=>clearInterval(timer);
},[]);return null;}
