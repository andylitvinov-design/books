"use client";
import { HomeSectionCarousel } from "./home-section-carousel";
import { HomeFeaturedWorkspace } from "./home-featured-workspace";
import { FreeMobileAppBanner } from "./free-mobile-app-banner";
import { PersonalTestimonials } from "./personal-testimonials";
import { HomepageContactCta } from "./homepage-contact-cta";
import type { PublicLocale } from "@/lib/public-locales";

// Optional, explicitly opened long-form catalogue. Never part of Home's
// initial JS bundle or the first interactive paint.
export function HomeExpandedCatalog({locale}:{locale:PublicLocale}){
  return <div data-home-expanded-catalog style={{display:"grid",gap:16,paddingTop:12}}>
    <HomeSectionCarousel locale={locale}/>
    <HomeFeaturedWorkspace locale={locale}/>
    <FreeMobileAppBanner locale={locale}/>
    <PersonalTestimonials locale={locale} variant="home"/>
    {locale!=="es"?<HomepageContactCta locale={locale}/>:null}
  </div>;
}
