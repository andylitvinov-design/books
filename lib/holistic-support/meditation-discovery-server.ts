import "server-only";
import { createClient } from "@supabase/supabase-js";
import candidates from "@/data/academy/meditation-catalog-candidates-20261028.json";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { getAppConfig } from "@/lib/app/config";
import type { MeditationCatalogRecord } from "@/lib/holistic-support/meditation-catalog-types";
import type { PublicLocale } from "@/lib/public-locales";

const PUBLIC_FIELDS = [
  "youtube_id", "title", "creator", "source_kind", "source_url", "audio_language",
  "duration_hint_minutes", "duration_verified_seconds", "duration_basis", "content_type",
  "goals", "goal_weights", "subtopics", "user_situations", "desired_states",
  "techniques", "time_of_day", "posture", "experience_level", "intensity",
  "spiritual_style", "music_style", "voice_style", "safety_flags", "claims_risk",
  "metadata_confidence", "editorial_status", "embed_status", "rights_status",
  "metadata_checked_at", "content_checked_at", "discovery_status", "youtube_oembed_checked_at",
].join(",");

/**
 * Existing videos are authenticated by the *existing public playlist*, not by
 * treating all 11 archived candidates as approved. New third-party entries are
 * read through public Supabase RLS; hidden candidates never reach a browser.
 * The app keeps its original playlist when Supabase is offline.
 */
export async function loadMeditationDiscovery(locale: PublicLocale): Promise<{
  videos: MeditationCatalogRecord[];
  publishedSourceIds: string[];
}> {
  // These are the already public owner sources, across their *original* audio
  // languages. Site locale only chooses the filter's initial audio language.
  const known = new Map([
    ...freeMeditationVideos("ru").map(video => [video.id, video.title] as const),
    ...englishGuidedMeditations
      .filter(video => video.youtubeId && /^[A-Za-z0-9_-]{11}$/.test(video.youtubeId))
      .map(video => [video.youtubeId!, video.title] as const),
  ]);
  void locale;
  const originals = candidates.videos
    .filter(video => video.source_kind === "original" && known.has(video.youtube_id)
      && video.metadata_confidence === "owner_source")
    .map(video => ({
      ...video,
      title: known.get(video.youtube_id)!,
      discovery_status: "previously_published",
      // No fabricated approval/embedding audit: original video is already live
      // from the existing Academy/PsiMaster source and only its ID is whitelisted.
    })) as unknown as MeditationCatalogRecord[];
  const publishedSourceIds = [...known.keys()];
  try {
    const config = getAppConfig();
    if (!config.publishableKey) throw Error("public key unavailable");
    const supabase = createClient(config.supabaseUrl, config.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.from("hh_meditation_catalog_v1")
      .select(PUBLIC_FIELDS)
      .limit(80)
      .abortSignal(AbortSignal.timeout(4000));
    if (error || !Array.isArray(data)) throw Error("public catalog not available");
    const seen = new Set(publishedSourceIds);
    const external: MeditationCatalogRecord[] = [];
    for (const entry of data as unknown as MeditationCatalogRecord[]) {
      if (!entry || entry.source_kind !== "external"
        || !/^[A-Za-z0-9_-]{11}$/.test(entry.youtube_id)
        || entry.source_url !== "https://www.youtube.com/watch?v=" + entry.youtube_id
        || seen.has(entry.youtube_id)) continue;
      seen.add(entry.youtube_id);
      external.push(entry);
    }
    return {videos: [...originals, ...external], publishedSourceIds};
  } catch {
    // Missing config, provider outage, disabled public Data API: public originals
    // remain available; no private user data or failed response is exposed.
    return {videos: originals, publishedSourceIds};
  }
}
