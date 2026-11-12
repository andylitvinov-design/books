import "@/app/site-video-admin.css";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { PrescriptionAdminHeader } from "@/components/prescription-admin-header";
import { SiteVideoManager } from "@/components/site-video-manager";
import { KlingSceneStudio } from "@/components/kling-scene-studio";
import { VeoSceneStudio } from "@/components/veo-scene-studio";
import { KlingAvatarStudio } from "@/components/kling-avatar-studio";
import { books } from "@/data/library";
import { localizedBookText } from "@/data/library-localization";
import { getRemedyDirectory } from "@/data/remedies";
import { requireAdminRequest } from "@/lib/prescriptions/admin";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import type { SiteVideoRecord } from "@/lib/site-videos/model";
import { builtInSiteVideoRecords } from "@/lib/site-videos/defaults";
import { getSiteVideoStore } from "@/lib/site-videos/store";
import { uiLocaleCookie } from "@/lib/ui-locale";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website videos — Holistic House", robots: { index: false, follow: false } };

export default async function SiteVideosPage() {
  if (!await requireAdminRequest()) redirect("/admin/login");
  const cookieLocale = (await cookies()).get(uiLocaleCookie)?.value;
  const klingLocale = cookieLocale === "es" ? "es" : cookieLocale === "en" ? "en" : "ru";
  const initialLocale = klingLocale === "es" ? "en" : klingLocale;
  let records: SiteVideoRecord[] = [];
  let storageReady = false;
  try {
    const store = getSiteVideoStore();
    if (store) {
      records = await store.list();
      storageReady = true;
    } else records = builtInSiteVideoRecords();
  } catch {
    // Configuration and connection errors stay out of HTML and browser logs.
  }

  // Only already approved, public practitioner profiles may be attributed.
  let masters: { slug: string; name: string }[] = [];
  try {
    const approved: PublicPractitioner[] = await createPractitionerRepository(getAppConfig()).listPublicPractitioners("en");
    masters = approved.map(item => ({
      slug: item.slug,
      name: item.profile.displayName || item.profile.name || item.slug,
    })).filter(item => Boolean(item.name));
  } catch { /* Publishing remains disabled when the verified master directory is unavailable. */ }

  const entities = {
    remedies: getRemedyDirectory("en").map(remedy => ({ id: remedy.slug, label: { en: remedy.title, ru: remedy.title } })),
    books: books.map(book => ({ id: book.id, label: { en: localizedBookText(book, "en").title, ru: localizedBookText(book, "ru").title } })),
  };

  return (
    <main className="prescription-admin-shell site-video-manager-shell">
      <PrescriptionAdminHeader
        title={{ en: "Website videos", ru: "Видео сайта" }}
        description={{ en: "Choose a page, add a YouTube link, and preview before publishing.", ru: "Выберите страницу, добавьте ссылку YouTube и проверьте видео перед публикацией." }}
      />
      <SiteVideoManager initialRecords={records} initialLocale={initialLocale} storageReady={storageReady} entities={entities} masters={masters} />
      <section className="site-video-review-entry" aria-label="Video library coverage">
        <div>
          <strong>{klingLocale === "ru" ? "Покрытие видеобиблиотеки" : "Video Library Coverage"}</strong>
          <p>{klingLocale === "ru" ? "Проверьте 64 темы MyTube, 120 сценариев и очередь недостающих видеосцен без фиктивной готовности." : "Review 64 MyTube topics, 120 stories and missing source scenes without invented readiness."}</p>
        </div>
        <Link href="/admin/video-library">{klingLocale === "ru" ? "Открыть карту покрытия" : "Open coverage map"}</Link>
      </section>
      <section className="site-video-review-entry" aria-label="Storyboard review">
        <div><strong>{klingLocale === "ru" ? "Редакторская проверка 120 сценариев" : "Review 120 video storyboards"}</strong>
          <p>{klingLocale === "ru" ? "Просмотрите 48 локальных MP4-композиций, подберите четыре кадра и сохраните черновик без публикации." : "Inspect the 48 approved local MP4 compositions and save private storyboard notes without publishing."}</p></div>
        <Link href="/admin/videos/scenario-review">{klingLocale === "ru" ? "Открыть проверку сцен" : "Open scene review"}</Link>
      </section>
      <VeoSceneStudio
        initialLocale={klingLocale}
        configured={Boolean(process.env.HH_VEO_GCP_PROJECT_ID && process.env.HH_VEO_GCS_OUTPUT_URI && process.env.HH_VEO_SERVICE_ACCOUNT_JSON)}
        enabled={process.env.HH_VEO_PAID_ENABLED === "true"}
      />
      <KlingSceneStudio
        initialLocale={klingLocale}
        configured={Boolean(process.env.KLING_API_KEY)}
        enabled={process.env.HH_KLING_PAID_GENERATION_ENABLED === "true"}
        premiumEnabled={process.env.HH_KLING_PREMIUM_RENDER_ENABLED === "true"}
      />
      <KlingAvatarStudio
        initialLocale={klingLocale}
        configured={Boolean(process.env.KLING_API_KEY)}
        enabled={process.env.HH_KLING_PAID_GENERATION_ENABLED === "true" && process.env.HH_KLING_AVATAR_PAID_ENABLED === "true"}
      />
    </main>
  );
}
