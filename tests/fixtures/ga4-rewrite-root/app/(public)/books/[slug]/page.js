import {notFound} from 'next/navigation';
import Controls from '../../../controls';
export async function generateMetadata({params}){const {slug}=await params;return {title:slug==='known-public'?'Known public book':'Unknown book'};}
export default async function Page({params}){const {slug}=await params;if(slug!=='known-public')notFound();return <><h1>Known public book</h1><Controls/></>;}
