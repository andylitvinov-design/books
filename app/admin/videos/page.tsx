import "@/app/site-video-admin.css";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PrescriptionAdminHeader } from "@/components/prescription-admin-header";
import { SiteVideoManager } from "@/components/site-video-manager";
import { VideoReviewQueue } from "@/components/video-review-queue";
import { KlingSceneStudio } from "@/components/kling-scene-studio";
import { KlingAvatarStudio } from "@/components/kling-avatar-studio";
import { books } from "@/data/library";
import { localizedBookText } from "@/data/library-localization";
import { getRemedyDirectory } from "@/data/remedies";
import { requireAdminActor } from "@/lib/prescriptions/admin";
import { getAppConfig } from "@/lib/app/config";
import { listVideoReviewRows } from "@/lib/site-videos/review-store";
import type { SiteVideoRecord } from "@/lib/site-videos/model";
import { builtInSiteVideoRecords } from "@/lib/site-videos/defaults";
import { getSiteVideoStore } from "@/lib/site-videos/store";
import { uiLocaleCookie } from "@/lib/ui-locale";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website videos — Holistic House", robots: { index: false, follow: false } };

export default async function SiteVideosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const actor = await requireAdminActor();
  if (!actor) redirect("/admin/login");
  const reviewMode = (await searchParams)?.tab === "review";
  const cookieLocale = (await cookies()).get(uiLocaleCookie)?.value;
  const klingLocale = cookieLocale === "es" ? "es" : cookieLocale === "en" ? "en" : "ru";
  const initialLocale = klingLocale === "es" ? "en" : klingLocale;
  let records: SiteVideoRecord[] = [];
  let storageReady = false;
  let reviewRows: Awaited<ReturnType<typeof listVideoReviewRows>> = [];
  let reviewUnavailable = false;
  try {
    if (reviewMode) {
      reviewRows = await listVideoReviewRows(getAppConfig(), actor);
    } else {
      const store = getSiteVideoStore();
      if (store) {
        records = await store.list();
        storageReady = true;
      } else records = builtInSiteVideoRecords();
    }
  } catch {
    // Private storage errors do not leak secrets to HTML or browser logs.
    reviewUnavailable = reviewMode;
  }

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
      <nav className="video-review-nav" aria-label={klingLocale === "ru" ? "Разделы видео" : "Video sections"}>
        <Link href="/admin/videos?tab=review" aria-current={reviewMode ? "page" : undefined}>
          {klingLocale === "ru" ? "Лента проверки · RU/EN" : klingLocale === "es" ? "Revisión de vídeos" : "Review queue · RU/EN"}
        </Link>
        <Link href="/admin/videos" aria-current={!reviewMode ? "page" : undefined}>
          {klingLocale === "ru" ? "Видео сайта / редактор" : klingLocale === "es" ? "Editor del sitio" : "Website video editor"}
        </Link>
      </nav>
      {reviewMode ? <VideoReviewQueue initialRows={reviewRows} initialLocale={klingLocale}
        unavailable={reviewUnavailable} /> : <>
      <SiteVideoManager initialRecords={records} initialLocale={initialLocale} storageReady={storageReady} entities={entities} />
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
      </>}
    </main>
  );
}
