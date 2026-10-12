"use client";
import {useState,useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
export default function Controls(){const router=useRouter();const [target,setTarget]=useState('/books/SYNTHETIC_PRIVATE_TOKEN?secret=SYNTHETIC_PRIVATE_QUERY');
useEffect(()=>{document.documentElement.dataset.controlsReady='true';},[]);
return <><input id="target" value={target} onChange={event=>setTarget(event.target.value)}/><Link id="link" prefetch={false} href={target}>Next Link</Link><button id="push" onClick={()=>router.push(target)}>Push</button><button id="replace" onClick={()=>router.replace(target)}>Replace</button></>;}
