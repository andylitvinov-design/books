import { preload } from "react-dom";
import { getImageProps, type ImageProps } from "next/image";
import portrait from "@/data/static-portrait.json";

/** Responsive static portrait; original source stays intact. No runtime transform. */
export function StaticPortrait(input: ImageProps) {
  if (input.src !== portrait.source) throw new Error("StaticPortrait requires the verified portrait source");
  const fallback = portrait.variants[portrait.variants.length - 1];
  const { props } = getImageProps({ ...input, src: fallback.path, unoptimized: true });
  const srcSet = portrait.variants.map((variant) => `${variant.path} ${variant.width}w`).join(", ");
  if (input.priority) preload(fallback.path, { as: "image", imageSrcSet: srcSet, imageSizes: input.sizes, fetchPriority: "high" });
  // Native srcSet is required because Next's unoptimized path omits srcSet.
  // Keep Next's dimensions/fill style, sizes, alt and loading semantics.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt} sizes={input.sizes} srcSet={srcSet} fetchPriority={input.priority ? "high" : props.fetchPriority} />;
}
