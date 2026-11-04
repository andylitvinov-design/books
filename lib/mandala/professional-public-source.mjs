/**
 * Convert the EXISTING public practitioner repository's approved records into
 * the small read model consumed by Professional Content Director.
 *
 * Call this only AFTER a server-side public/relation query. This pure adapter
 * never queries raw app tables, token stores, test results or CRM.
 */
import {getPublicServiceDetailHref} from '../practitioners/public-service-links.js';

const PUBLIC_LOCALES = ['en','ru','es'];
const SLUG = /^[a-z0-9][a-z0-9-]{0,89}$/;
function clean(value, max) {
  return typeof value === 'string' ? value.replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/\s+/g,' ').trim().slice(0,max) : '';
}
export function toPublishedProfessionalSource(detail,locale) {
  if (!PUBLIC_LOCALES.includes(locale)) throw Error('unsupported_locale');
  const s=detail?.service, p=detail?.practitioner;
  if(!s || !p || s.status!=='published' || s.active!==true ||
    !s.id || !s.practitionerId || s.practitionerId!==p.id)throw Error('published_service_required');
  if(!SLUG.test(String(s.slug||''))||!SLUG.test(String(p.slug||'')))throw Error('invalid_public_slug');
  if(locale==='es' && Array.isArray(s.displayLocales) && !s.displayLocales.includes('es')) {
    throw Error('unpublished_translation');
  }
  const title=clean(s.copy?.title,110);
  if(!title)throw Error('published_title_required');
  const publicDescription=clean(s.copy?.shortDescription||s.copy?.description,150);
  const displayName=clean(p.profile?.displayName,70);
  const professionalTitle=clean(p.profile?.professionalTitle,90);
  const validated=Array.isArray(p.credentials)&&p.credentials.some(c=>
    c && c.public===true && c.verificationStatus==='verified' &&
    clean(c.title,90).toLocaleLowerCase()===professionalTitle.toLocaleLowerCase() &&
    (!c.expiresOn || c.expiresOn >= new Date().toISOString().slice(0,10)));
  return Object.freeze({
    publicOffer:Object.freeze({
      id:String(s.id),kind:'service',published:true,publicSnapshot:true,
      practitionerId:String(p.id),locale,title,publicDescription,
      href:getPublicServiceDetailHref(locale,p.slug,s.slug)
    }),
    publicPractitioner:Object.freeze({
      id:String(p.id),practitionerId:String(p.id),published:true,publicSnapshot:true,
      displayName,professionalTitle,credentialVerified:Boolean(professionalTitle)&&validated
    }),
  });
}
