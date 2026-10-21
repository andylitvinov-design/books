"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ServiceMode = "online" | "toronto";
export type ServiceTopic = "all" | "personal" | "relationships" | "business" | "reiki" | "free";
export type StudioServiceId =
  | "tests" | "situation" | "dao"
  | "alchemy" | "hypnotherapy" | "constellations" | "business" | "remote-energy-support";

/** Existing approved offers only. Toronto means a session enquiry, never a confirmed booking. */
const facets: Record<StudioServiceId, { modes: readonly ServiceMode[]; topics: readonly ServiceTopic[] }> = {
  tests: { modes: ["online"], topics: ["free"] },
  situation: { modes: ["online"], topics: ["free"] },
  dao: { modes: ["online"], topics: ["free"] },
  alchemy: { modes: ["online", "toronto"], topics: ["personal", "relationships"] },
  hypnotherapy: { modes: ["online", "toronto"], topics: ["personal"] },
  constellations: { modes: ["online", "toronto"], topics: ["relationships"] },
  business: { modes: ["online", "toronto"], topics: ["business"] },
  "remote-energy-support": { modes: ["online"], topics: ["reiki"] },
};

export const studioServiceIds = Object.keys(facets) as StudioServiceId[];
export const serviceTopics: readonly ServiceTopic[] = ["all", "personal", "relationships", "business", "reiki", "free"];

export function serviceIsVisible(id: StudioServiceId, mode: ServiceMode, topic: ServiceTopic): boolean {
  const offer = facets[id];
  return offer.modes.includes(mode) && (topic === "all" || offer.topics.includes(topic));
}

export function matchingServicesCount(mode: ServiceMode, topic: ServiceTopic): number {
  return studioServiceIds.filter(id => serviceIsVisible(id, mode, topic)).length;
}

type ExplorerState = {
  mode: ServiceMode;
  setMode: (mode: ServiceMode) => void;
  topic: ServiceTopic;
  setTopic: (topic: ServiceTopic) => void;
};

const ExplorerContext = createContext<ExplorerState | null>(null);

export function ServicesExplorerProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ServiceMode>("online");
  const [topic, setTopic] = useState<ServiceTopic>("all");
  return (
    <ExplorerContext.Provider value={{ mode, setMode, topic, setTopic }}>
      {children}
    </ExplorerContext.Provider>
  );
}

export function useServicesExplorer(): ExplorerState {
  const state = useContext(ExplorerContext);
  if (!state) throw new Error("Services explorer must be rendered inside ServicesExplorerProvider");
  return state;
}
