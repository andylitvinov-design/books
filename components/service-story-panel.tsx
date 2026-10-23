import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./service-story-panel.module.css";

/** One visual thought per public service screen. Never truncate text or trap zoomed content. */
export function ServiceStoryPanel({
  image, eyebrow, title, body, href, action, index, variant = "teal",
}: {
  image: string;
  eyebrow: string;
  title: string;
  body?: string;
  href: string;
  action: string;
  index: string;
  variant?: "teal" | "wood";
}) {
  return (
    <section className={styles.panel} data-service-story-screen={index} data-story-variant={variant}>
      <div className={styles.photo}>
        <Image src={image} alt="" fill sizes="(max-width: 767px) 100vw, 48vw" />
        <span className={styles.counter} aria-hidden="true">{index}</span>
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        {body ? <p className={styles.body}>{body}</p> : null}
        <Link href={href} className={styles.action} prefetch={false}>
          {action}<ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
