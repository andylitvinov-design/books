import { PublicLoadingSplash } from "@/components/public-loading-splash";

/** Immediate fallback for the published, public Library feed only. */
export default function Loading() {
  return <PublicLoadingSplash />;
}
