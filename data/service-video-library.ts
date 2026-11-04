import type { PublishedSiteVideo } from "@/lib/site-videos/model";
import { siteVideoWatchUrl } from "@/lib/site-videos/model";

export type ServiceVideoLocale = "en" | "ru" | "es";
export type ServiceVideoTopic = "overview" | "alchemy" | "hypnotherapy" | "constellations" | "constellation-case" | "homeopathy";

export type ServiceVideoMedia = {
  video: PublishedSiteVideo;
  poster: string;
  /** A general methods video, never represented as a service-specific walkthrough. */
  general: boolean;
};

const path = "/images/holistic-house/video-posters/";

const overviewEn: ServiceVideoMedia = {
  video: { practitionerSlug: 'andy-litvinov', practitionerName: 'Andy', youtubeId: "s30Y42IwPcg", language: "en", title: "How I Choose the Right Method", durationSeconds: 29 },
  poster: path + "services-en-v2.webp",
  general: true,
};
const overviewRu: ServiceVideoMedia = {
  video: { practitionerSlug: 'andy-litvinov', practitionerName: 'Andy', youtubeId: "Cz6SxXJNZbw", language: "ru", title: "Как я выбираю подходящий метод", durationSeconds: 33 },
  poster: path + "services-ru-v1.webp",
  general: true,
};
const constellationsEn: ServiceVideoMedia = {
  video: { practitionerSlug: 'andy-litvinov', practitionerName: 'Andy', youtubeId: "", heygenId: "7c6b243f048b9c0581ae29619a4a89fc", language: "en", title: "How I Work with Systemic Constellations", durationSeconds: 48 },
  poster: path + "constellations-en-v1.webp",
  general: false,
};
/** Owner-selected public recording: one ID for three related service landings. */
const constellationCase: ServiceVideoMedia = {
  video: { practitionerSlug: 'andy-litvinov', practitionerName: 'Andy', youtubeId: "sfVFOQNr2qk", language: "en", title: "Business Constellations" },
  poster: "/images/holistic-house/andy-about.png",
  general: false,
};
const hypnotherapyEn: ServiceVideoMedia = {
  video: { practitionerSlug: 'andy-litvinov', practitionerName: 'Andy', youtubeId: "", heygenId: "8c1634ce904434a91931429b6a7eefe1", language: "en", title: "How I Work with Hypnotherapy", durationSeconds: 47 },
  poster: path + "hypnotherapy-en-v1.webp",
  general: false,
};
// The Russian psychotherapy landing uses the owner's selected public YouTube video.
// No new render or upload is needed, and the EN/ES media remain independent.
const hypnotherapyRu: ServiceVideoMedia = {
  video: { practitionerSlug: 'andy-litvinov', practitionerName: 'Andy', youtubeId: "eLsjFaKCBhI", language: "ru", title: "Образная психотерапия — видео о подходе" },
  poster: path + "hypnotherapy-en-v1.webp",
  general: false,
};
/** This source belongs exclusively to the English psychotherapy landing.
 * No new YouTube publication or HeyGen render is required.
 * Its own YouTube thumbnail is used, not an unrelated static HeyGen still.
 */
export const englishPsychotherapyLandingVideo: ServiceVideoMedia = {
  video: { practitionerSlug: 'andy-litvinov', practitionerName: 'Andy', youtubeId: "vqRmI79cecQ", language: "en", title: "Psychotherapy — introduction in English" },
  poster: "",
  general: false,
};

const homeopathyEn: ServiceVideoMedia = {
  video: { practitionerSlug: 'andy-litvinov', practitionerName: 'Andy', youtubeId: "ILyRWyHtJoE", language: "en", title: "My Approach to Homeopathy", durationSeconds: 31 },
  poster: path + "homeopathy-en-v2.webp",
  general: false,
};
const homeopathyRu: ServiceVideoMedia = {
  video: { practitionerSlug: 'andy-litvinov', practitionerName: 'Andy', youtubeId: "Q9NvYECKWuc", language: "ru", title: "Мой подход к гомеопатии", durationSeconds: 32 },
  poster: path + "homeopathy-ru-v1.webp",
  general: false,
};

/**
 * Only already-approved public source videos.
 * The 4 YouTube IDs are the checked, previously published @shamanic_academy
 * mirrors of the exact HeyGen masters in defaults.js; do not reupload.
 * The EN method videos retain their approved HeyGen provider embeds and original stills.
 * RU psychotherapy uses the owner's selected YouTube video; other RU methods
 * without a dedicated video retain the clearly labelled general overview.
 * No personal/client videos or Drive playback links belong in this registry.
 */
const media: Record<"en" | "ru", Record<ServiceVideoTopic, ServiceVideoMedia>> = {
  en: {
    overview: overviewEn,
    alchemy: constellationsEn,
    hypnotherapy: hypnotherapyEn,
    constellations: constellationsEn,
    "constellation-case": constellationCase,
    homeopathy: homeopathyEn,
  },
  ru: {
    overview: overviewRu,
    alchemy: overviewRu,
    hypnotherapy: hypnotherapyRu,
    constellations: overviewRu,
    "constellation-case": constellationCase,
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
