import 'server-only';
import { unstable_cache } from 'next/cache';
import { readPersonalCoachingCatalog } from '@/lib/app/personal-coaching-catalog';
import { getAppConfig } from '@/lib/app/config';

// Reuse the exact production reference library for the public lounge and
// dedicated model landing pages, without fetching personal client answers.
// Only reviewed models and published schemes are exposed. 15-minute server
// cache avoids repeated Supabase queries on every page view.
export const getPublicCoachingCatalog=unstable_cache(async()=>{
  const data=await readPersonalCoachingCatalog(getAppConfig(),null,{server:true});
  const reviewed=new Set(data.models.map(model=>model.modelKey));
  return {
    version:data.version,
    models:data.models,
    schemes:data.schemes.filter(scheme=>reviewed.has(scheme.modelKey)),
    signals:data.signals,
  };
},['hh-public-coaching-reference-v1'],{revalidate:900});
