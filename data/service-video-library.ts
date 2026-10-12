import type { PublishedSiteVideo } from "@/lib/site-videos/model";
import { siteVideoWatchUrl } from "@/lib/site-videos/model";

export type ServiceVideoLocale = "en" | "ru" | "es";
export type ServiceVideoTopic = "overview" | "alchemy" | "hypnotherapy" | "constellations" | "homeopathy";

export type ServiceVideoMedia = {
  video: PublishedSiteVideo;
  poster: string;
  /** A general methods video, never represented as a service-specific walkthrough. */
  general: boolean;
};

const path = "/images/holistic-house/video-posters/";

const overviewEn: ServiceVideoMedia = {
  video: { youtubeId: "s30Y42IwPcg", language: "en", title: "How I Choose the Right Method", durationSeconds: 29 },
  poster: path + "services-en-v2.webp",
  general: true,
};
const overviewRu: ServiceVideoMedia = {
  video: { youtubeId: "Cz6SxXJNZbw", language: "ru", title: "Как я выбираю подходящий метод", durationSeconds: 33 },
  poster: path + "services-ru-v1.webp",
  general: true,
};
const constellationsEn: ServiceVideoMedia = {
  video: { youtubeId: "", heygenId: "7c6b243f048b9c0581ae29619a4a89fc", language: "en", title: "How I Work with Systemic Constellations", durationSeconds: 48 },
  poster: path + "constellations-en-v1.webp",
  general: false,
};
const hypnotherapyEn: ServiceVideoMedia = {
  video: { youtubeId: "", heygenId: "8c1634ce904434a91931429b6a7eefe1", language: "en", title: "How I Work with Hypnotherapy", durationSeconds: 47 },
  poster: path + "hypnotherapy-en-v1.webp",
  general: false,
};
const homeopathyEn: ServiceVideoMedia = {
  video: { youtubeId: "ILyRWyHtJoE", language: "en", title: "My Approach to Homeopathy", durationSeconds: 31 },
  poster: path + "homeopathy-en-v2.webp",
  general: false,
};
const homeopathyRu: ServiceVideoMedia = {
  video: { youtubeId: "Q9NvYECKWuc", language: "ru", title: "Мой подход к гомеопатии", durationSeconds: 32 },
  poster: path + "homeopathy-ru-v1.webp",
  general: false,
};

/**
 * Only already-approved public source videos.
 * The 4 YouTube IDs are the checked, previously published @shamanic_academy
 * mirrors of the exact HeyGen masters in defaults.js; do not reupload.
 * The EN method videos retain their approved HeyGen provider embeds and original stills.
 * No method-specific RU render exists: use a clearly labelled GENERAL RU overview.
 * No personal/client videos or Drive playback links belong in this registry.
 */
const media: Record<"en" | "ru", Record<ServiceVideoTopic, ServiceVideoMedia>> = {
  en: {
    overview: overviewEn,
    alchemy: constellationsEn,
    hypnotherapy: hypnotherapyEn,
    constellations: constellationsEn,
    homeopathy: homeopathyEn,
  },
  ru: {
    overview: overviewRu,
    alchemy: overviewRu,
    hypnotherapy: overviewRu,
    constellations: overviewRu,
    homeopathy: homeopathyRu,
  },
};

export function getServiceVideoMedia(topic: ServiceVideoTopic, locale: ServiceVideoLocale): ServiceVideoMedia {
  return media[locale === "es" ? "en" : locale][topic];
}

/** A direct original watch link stays available even if an iframe is blocked by Safari. */
export function getServiceVideoWatchUrl(topic: ServiceVideoTopic, locale: ServiceVideoLocale): string {
  return siteVideoWatchUrl(getServiceVideoMedia(topic, locale).video);
}
