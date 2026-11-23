// Optional public UI may be interrupted by WebKit history navigation.
// Contain only its own import rejection; never suppress global JS errors.
// Active failures get one retry and remain explicitly retryable by the UI.
export async function loadOptionalLeadCapture(load, active, pause = () => new Promise(resolve => setTimeout(resolve, 250))) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!active()) return { status: "cancelled" };
    try {
      const loadedModule = await load();
      return active() ? { status: "ready", module: loadedModule } : { status: "cancelled" };
    } catch {
      if (!active()) return { status: "cancelled" };
      if (attempt === 1) return { status: "failed" };
      await pause();
    }
  }
  return { status: "failed" };
}
