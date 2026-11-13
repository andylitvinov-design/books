import styles from "./loading.module.css";

/**
 * Lightweight server-rendered fallback for Next.js streaming routes.
 * The App Router replaces it as soon as real page content is ready.
 * Do not add a client timer, network fetch, hydration gate or minimum delay.
 */
export default function Loading() {
  return (
    <div className={styles.splash} role="status" aria-busy="true" aria-label="Holistic House loading" data-hh-loading-splash>
      <div className={styles.content}>
        {/* First-party 939-byte logo; avoid image optimization work on the fallback. */}
        <img className={styles.logo} src="/icons/holistic-house-teal.svg" alt="" aria-hidden="true" width="76" height="76" />
        <span className={styles.name}>Holistic House</span>
        <span className={styles.progress} aria-hidden="true" />
      </div>
    </div>
  );
}
