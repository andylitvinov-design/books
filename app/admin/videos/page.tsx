import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PrescriptionAdminHeader } from "@/components/prescription-admin-header";
import { SiteVideoManager } from "@/components/site-video-manager";
import { books } from "@/data/library";
import { localizedBookText } from "@/data/library-localization";
import { getRemedyDirectory } from "@/data/remedies";
import { requireAdminRequest } from "@/lib/prescriptions/admin";
import type { SiteVideoRecord } from "@/lib/site-videos/model";
import { builtInSiteVideoRecords } from "@/lib/site-videos/defaults";
import { getSiteVideoStore } from "@/lib/site-videos/store";
import { uiLocaleCookie } from "@/lib/ui-locale";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website videos — Holistic House", robots: { index: false, follow: false } };

export default async function SiteVideosPage() {
  if (!await requireAdminRequest()) redirect("/admin/login");
  const initialLocale = (await cookies()).get(uiLocaleCookie)?.value === "en" ? "en" : "ru";
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
      <SiteVideoManager initialRecords={records} initialLocale={initialLocale} storageReady={storageReady} entities={entities} />
    </main>
  );
}
