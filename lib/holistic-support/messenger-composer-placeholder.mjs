/** Examples of requests for the six real Holistic House AI Assistant directions. */
export const MESSENGER_COMPOSER_HINTS = Object.freeze({
  en: Object.freeze([
    "Help me understand my situation…",
    "Suggest a test for me…",
    "Find a video on MyTube…",
    "Help me request a session…",
    "Recommend a practice or course…",
    "Help me create an AI video…",
  ]),
  ru: Object.freeze([
    "Помоги разобраться в ситуации…",
    "Подбери мне подходящий тест…",
    "Найди видео в MyTube…",
    "Хочу записаться на сессию…",
    "Предложи практику или курс…",
    "Помоги создать AI-видео…",
  ]),
  es: Object.freeze([
    "Ayúdame a entender mi situación…",
    "Recomiéndame una prueba…",
    "Busca un vídeo en MyTube…",
    "Quiero solicitar una sesión…",
    "Sugiere una práctica o un curso…",
    "Ayúdame a crear un vídeo con IA…",
  ]),
});

/**
 * Animates only the native textarea placeholder, never its value or a React state.
 * The returned cleanup stops every timer and listener when typing, navigating,
 * changing languages or replacing the inline composer with the chat composer.
 */
export function animateMessengerComposerPlaceholder(input, locale, fallback) {
  const doc = input.ownerDocument;
  const view = doc.defaultView;
  const hints = MESSENGER_COMPOSER_HINTS[locale] || MESSENGER_COMPOSER_HINTS.en;
  const motion = view.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  let timeoutId = null;
  let hintIndex = 0;
  let visibleCharacters = 0;
  let erasing = false;
  let disposed = false;

  function cancel() {
    if (timeoutId !== null) view.clearTimeout(timeoutId);
    timeoutId = null;
  }

  function schedule(delay) {
    timeoutId = view.setTimeout(tick, delay);
  }

  function tick() {
    timeoutId = null;
    if (disposed || doc.visibilityState === "hidden" || doc.activeElement === input || input.value || motion?.matches) {
      pause();
      return;
    }
    const phrase = hints[hintIndex];
    if (!erasing) {
      visibleCharacters = Math.min(phrase.length, visibleCharacters + 1);
      input.placeholder = phrase.slice(0, visibleCharacters);
      if (visibleCharacters === phrase.length) {
        erasing = true;
        schedule(1700);
      } else schedule(55);
    } else {
      visibleCharacters = Math.max(0, visibleCharacters - 1);
      input.placeholder = phrase.slice(0, visibleCharacters);
      if (visibleCharacters === 0) {
        erasing = false;
        hintIndex = (hintIndex + 1) % hints.length;
        schedule(380);
      } else schedule(26);
    }
  }

  function pause() {
    cancel();
    input.placeholder = fallback;
  }

  function restart() {
    cancel();
    if (disposed) return;
    hintIndex = 0;
    visibleCharacters = 0;
    erasing = false;
    if (motion?.matches) {
      input.placeholder = hints[0];
    } else {
      input.placeholder = fallback;
      if (doc.visibilityState !== "hidden" && doc.activeElement !== input && !input.value) schedule(650);
    }
  }

  input.addEventListener("focus", pause);
  input.addEventListener("blur", restart);
  doc.addEventListener("visibilitychange", restart);
  motion?.addEventListener?.("change", restart);
  restart();

  return () => {
    disposed = true;
    cancel();
    input.removeEventListener("focus", pause);
    input.removeEventListener("blur", restart);
    doc.removeEventListener("visibilitychange", restart);
    motion?.removeEventListener?.("change", restart);
    input.placeholder = fallback;
  };
}
