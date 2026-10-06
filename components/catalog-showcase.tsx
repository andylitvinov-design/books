import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronRight } from "lucide-react";

export type CatalogShowcaseItem = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  href: string;
  indexHref?: string;
  actionLabel: string;
  image?: string;
  media?: ReactNode;
  eyebrow?: string;
  meta?: string;
};

export function CatalogShowcase({
  items,
  label,
}: {
  items: CatalogShowcaseItem[];
  label: string;
}) {
  if (!items.length) return null;

  return (
    <section className="catalog-showcase" aria-label={label}>
      <nav className="catalog-showcase-index" aria-label={label + " — contents"}>
        {items.map((item) => (
          <Link className="catalog-showcase-index-card" href={item.indexHref ?? item.href} key={item.id}>
            {item.image ? (
              <span className="catalog-showcase-index-photo" aria-hidden="true">
                <Image alt="" fill sizes="(max-width: 720px) 76px, 128px" src={item.image} />
              </span>
            ) : null}
            <span className="catalog-showcase-index-copy">
              <strong>{item.title}</strong>
            </span>
            <ChevronRight aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <div className="catalog-showcase-stack">
        {items.map((item, index) => (
          <article className="catalog-showcase-panel" id={item.id} key={item.id}>
            <div className="catalog-showcase-media">
              {item.image ? (
                <Image
                  alt=""
                  className="catalog-showcase-media-image"
                  fill
                  sizes="(max-width: 720px) 100vw, 52vw"
                  src={item.image}
                />
              ) : null}
              {item.media ? <div className="catalog-showcase-media-live">{item.media}</div> : null}
            </div>
            <div className="catalog-showcase-copy">
              <div>
                <p className="catalog-showcase-kicker">
                  {item.eyebrow ?? (String(index + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0"))}
                </p>
                <h2>{item.title}</h2>
                {item.subtitle ? <p className="catalog-showcase-subtitle">{item.subtitle}</p> : null}
                <p className="catalog-showcase-description">{item.description}</p>
                {item.meta ? <p className="catalog-showcase-meta">{item.meta}</p> : null}
              </div>
              <Link className="catalog-showcase-action" href={item.href}>
                <span>{item.actionLabel}</span><ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
