import curriculum from "@/data/academy/yggdrasil-curriculum.json";
import { EnergyworkVideoArchiveClient, type EnergyworkArchiveModule } from "@/components/energywork-video-archive-client";
import type { PublicLocale } from "@/lib/public-locales";

type ArchiveVideo = { youtubeId?: string | null; title?: string; label?: string };
type ArchiveStep = { title: Record<PublicLocale,string>; video?: { videos?: ArchiveVideo[] } | null };
type ArchiveLevel = { id: number; title: Record<PublicLocale,string>; steps: ArchiveStep[] };

// Preserve the entire existing seven-module source collection, not merely
// whichever five recordings another page happens to feature. Missing/unverified
// IDs are excluded; the historical original-language titles are never renamed
// to imply that these recordings were made in English or by Andrey.
export function EnergyworkVideoArchive({ locale }: { locale: PublicLocale }) {
  const groups: EnergyworkArchiveModule[] = (curriculum.levels as unknown as ArchiveLevel[]).map((level) => {
    const seen = new Set<string>();
    const videos = level.steps.flatMap((step) =>
      (step.video?.videos ?? [])
        .filter((item): item is ArchiveVideo & { youtubeId: string } =>
          typeof item.youtubeId === "string" && /^[\w-]{11}$/.test(item.youtubeId))
        .filter((item) => {
          if (seen.has(item.youtubeId)) return false;
          seen.add(item.youtubeId);
          return true;
        })
        .map((item) => ({
          id: item.youtubeId,
          title: item.title || step.title.ru,
          levelLabel: step.title[locale],
          sourceNote: item.label || "",
        })),
    );
    return { id: level.id, title: level.title[locale], videos };
  }).filter((group) => group.videos.length > 0);

  const total = groups.reduce((sum, group) => sum + group.videos.length, 0);
  return <EnergyworkVideoArchiveClient locale={locale} groups={groups} total={total} />;
}
