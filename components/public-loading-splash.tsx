import styles from "./public-loading-splash.module.css";

/**
 * First-party loading fallback for public content routes only.
 * Do not mount it above owner/admin auth or permanent redirects:
 * a root Suspense boundary would convert their HTTP 307/308 to streamed 200.
 */
export function PublicLoadingSplash() {
  return (
    <div className={styles.splash} role="status" aria-busy="true"
      aria-label="Holistic House loading" data-hh-loading-splash>
      <div className={styles.content}>
        <img className={styles.logo} src="/icons/holistic-house-teal.svg"
          alt="" aria-hidden="true" width="76" height="76" />
        <span className={styles.name}>Holistic House</span>
        <span className={styles.progress} aria-hidden="true" />
      </div>
    </div>
  );
}
