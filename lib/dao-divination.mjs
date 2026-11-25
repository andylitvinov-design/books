// Small, browser-only reflective selection helper. No question text leaves the client.
export function validHexagramNumber(raw) {
  const value = String(raw ?? "").trim();
  if (!/^\d{1,2}$/.test(value)) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 64 ? number : null;
}
export function hexagramFromRandomWord(word) {
  if (!Number.isInteger(word) || word < 0 || word > 0xffffffff) throw new RangeError("Random word out of range");
  return (word % 64) + 1;
}
export function drawRandomHexagram() {
  // Because 2^32 is divisible by 64, the modulo mapping is exactly uniform.
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const words = new Uint32Array(1);
    crypto.getRandomValues(words);
    return hexagramFromRandomWord(words[0]);
  }
  // Still a random, purely client-side draw in older browsers without Web Crypto.
  return Math.floor(Math.random() * 64) + 1;
}
