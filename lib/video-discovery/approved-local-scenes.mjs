/**
 * Public MyTube bridge for physical local MP4 scenes.
 * Admit only already-published 5-second composites with two independently
 * verified Dareful CC BY 4.0 source pages, explicit attribution, local MP4 and
 * poster paths, and a content hash. Never promote the wider research queue.
 */
import catalogue from "../../data/video-catalog/free-stock-scenes.json" with { type: "json" };

const LOCALES = new Set(["ru", "en", "es"]);
const ROOT = "/videos/holistic-house/film-collection-v3/";
const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const SHA256 = /^[a-f0-9]{64}$/i;
const SOURCE_PAGE = /^https:\/\/dareful\.com\/[a-z0-9-]+\/?$/i;
const TOPICS = Object.freeze({
  health: { lifeAreas: ["energy_health"], topicTags: ["stress", "energy", "practices"] },
  energy: { lifeAreas: ["energy_health"], topicTags: ["energy", "practices"] },
  life: { lifeAreas: ["personal_growth"], topicTags: ["meaning", "practices"] },
  goals: { lifeAreas: ["personal_growth"], topicTags: ["meaning", "practices"] },
  relationships: { lifeAreas: ["relationships"], topicTags: ["relationships", "practices"] },
});
const DESCRIPTION = Object.freeze({
  ru: "Лицензированная видеосцена · 5 секунд",
  en: "Licensed cinematic video scene · 5 seconds",
  es: "Escena cinematográfica con licencia · 5 segundos",
});

export function isApprovedLocalFilmScene(scene) {
  if (!scene || scene.status !== "approved" ||
      scene.sourceKind !== "licensed_two_shot_composite" ||
      typeof scene.id !== "string" || !/^[a-z0-9-]+$/.test(scene.id) ||
      scene.durationSeconds !== 5 || !Number.isInteger(scene.bytes) || scene.bytes <= 1024 ||
      !SHA256.test(scene.sha256 || "") ||
      scene.video !== ROOT + scene.id + ".mp4" ||
      scene.poster !== ROOT + scene.id + ".jpg" ||
      typeof scene.attribution !== "string" || !scene.attribution.includes("CC BY 4.0") ||
      !Array.isArray(scene.sources) || scene.sources.length !== 2) return false;
  return scene.sources.every(source =>
    source?.provider === "dareful" &&
    source?.creator === "Joel Holland" &&
    source?.licenseId === "cc_by_4_0" &&
    source?.licenseUrl === LICENSE_URL &&
    source?.attributionRequired === true &&
    Boolean(source?.licenseEvidence) &&
    SHA256.test(source?.sha256 || "") &&
    Number.isInteger(source?.bytes) && source.bytes > 1024 &&
    SOURCE_PAGE.test(source?.sourcePage || "")
  );
}

export function listApprovedLocalFilmScenes(locale = "ru") {
  const language = LOCALES.has(locale) ? locale : "ru";
  const rows = Array.isArray(catalogue) ? catalogue : [];
  return rows.filter(isApprovedLocalFilmScene).map(scene => {
    const facets = TOPICS[scene.theme] || { lifeAreas: ["personal_growth"], topicTags: ["practices"] };
    return {
      id: "local-scene-" + scene.id,
      kind: "video",
      title: scene.label?.[language] || scene.label?.en || scene.id,
      description: DESCRIPTION[language],
      image: scene.poster,
      videoSrc: scene.video,
      sourceGroup: "approved-local-film-scenes",
      sourceLabel: "Dareful · Joel Holland · CC BY 4.0",
      mediaAttribution: scene.attribution,
      mediaAttributionUrl: LICENSE_URL,
      mediaLicense: "CC BY 4.0",
      mediaRightsApproved: true,
      localMediaVerified: true,
      mediaBytes: scene.bytes,
      mediaSha256: scene.sha256,
      sourceApproved: true,
      curation: "verified",
      durationVerifiedSeconds: scene.durationSeconds,
      lifeAreas: [...facets.lifeAreas],
      topicTags: [...facets.topicTags],
      tags: [...(Array.isArray(scene.tags) ? scene.tags : [])],
    };
  });
}
