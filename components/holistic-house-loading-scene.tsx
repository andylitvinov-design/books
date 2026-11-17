import styles from "./holistic-house-loading-scene.module.css";

/**
 * Server-rendered, dependency-free route fallback. Keep it transient:
 * Next removes this screen when the requested route is ready.
 */
export function HolisticHouseLoadingScene() {
  return (
    <main className={styles.scene} role="status" aria-live="polite" aria-label="Holistic House">
      <div className={styles.photograph} aria-hidden="true" />
      <div className={styles.tint} aria-hidden="true" />
      <div className={styles.content}>
        <span className={styles.symbol} aria-hidden="true">✦</span>
        <h1 className={styles.wordmark}>Holistic <span>House</span></h1>
        <span className={styles.divider} aria-hidden="true" />
        <div className={styles.progress} aria-hidden="true">
          <span /><span /><span />
        </div>
      </div>
    </main>
  );
}
