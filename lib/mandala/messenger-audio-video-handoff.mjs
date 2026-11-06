// Private, same-tab Messenger → original Video Studio transfer. No upload or API.
export const MESSENGER_AUDIO_VIDEO_KEY = "hh-messenger-audio-to-video-v1";
export const MESSENGER_AUDIO_VIDEO_MAX_BYTES = 15 * 1024 * 1024;
export const MESSENGER_AUDIO_VIDEO_TTL_MS = 15 * 60 * 1000;
const DB_NAME = "hh-messenger-local-audio-v1";
const STORE = "handoff";
const SUPPORTED = /\.(?:mp3|m4a|wav|aac|mp4|webm)$/i;
const TELEGRAM_VOICE = /\.(?:ogg|oga|opus)$/i;
const VIDEO_LENGTHS = Object.freeze([10, 15, 20, 30, 60]);

export function audioVideoDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60.05) return null;
  return VIDEO_LENGTHS.find(value => value + 0.05 >= seconds) ?? null;
}
export function audioVideoFileAllowed(file, allowTelegram = false) {
  if (!file || typeof file.name !== "string" ||
      !Number.isFinite(file.size) || file.size < 1 ||
      file.size > MESSENGER_AUDIO_VIDEO_MAX_BYTES) return false;
  if (!SUPPORTED.test(file.name) && !(allowTelegram && TELEGRAM_VOICE.test(file.name))) return false;
  return !file.type || file.type.startsWith("audio/") ||
    file.type === "application/octet-stream";
}
async function decodeLocal(file) {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) throw Error("AUDIO_NOT_DECODABLE");
  const context = new AudioCtor();
  try {
    return await context.decodeAudioData(await file.arrayBuffer());
  } finally { await context.close().catch(() => {}); }
}
function pcmWavFromBuffer(buffer) {
  const rate = Math.min(24000, buffer.sampleRate);
  const length = Math.ceil(buffer.duration * rate);
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const put = (offset, value) => view.setUint32(offset, value, true);
  for (const [offset, label] of [[0, "RIFF"], [8, "WAVE"], [12, "fmt "], [36, "data"]]) {
    for (let i = 0; i < 4; i++) view.setUint8(offset + i, label.charCodeAt(i));
  }
  put(4, bytes.byteLength - 8); put(16, 16);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  put(24, rate); put(28, rate * 2);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(40, length * 2);
  const channels = Array.from({length: buffer.numberOfChannels},
    (_, index) => buffer.getChannelData(index));
  for (let i = 0; i < length; i++) {
    const sourceIndex = Math.min(buffer.length - 1, Math.floor(i * buffer.sampleRate / rate));
    let sample = 0;
    for (const channel of channels) sample += channel[sourceIndex] || 0;
    sample /= channels.length;
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clipped < 0 ? Math.round(clipped * 32768) : Math.round(clipped * 32767), true);
  }
  return new File([bytes], "telegram-voice.wav", {type: "audio/wav"});
}
async function metadataDuration(file) {
  const url = URL.createObjectURL(file);
  let element;
  try {
    return await new Promise((resolve, reject) => {
      element = new Audio();
      const timer = setTimeout(() => {cleanup(); reject(Error("AUDIO_METADATA_TIMEOUT"));}, 8000);
      const cleanup = () => {
        clearTimeout(timer);
        element.onloadedmetadata = null;
        element.onerror = null;
      };
      element.preload = "metadata";
      element.onloadedmetadata = () => {
        const seconds = element.duration;
        cleanup();
        Number.isFinite(seconds) && seconds > 0
          ? resolve(seconds) : reject(Error("AUDIO_DURATION_UNKNOWN"));
      };
      element.onerror = () => {cleanup(); reject(Error("AUDIO_UNSUPPORTED"));};
      element.src = url;
      element.load();
    });
  } finally {
    if (element) {element.pause(); element.removeAttribute("src"); element.load();}
    URL.revokeObjectURL(url);
  }
}
/** Validate format/duration locally. Telegram OGG/Opus is converted only if
 * this device's built-in decoder can actually read it; never pretend success. */
export async function prepareMessengerAudio(file) {
  if (!audioVideoFileAllowed(file, true)) throw Error("AUDIO_INVALID_FILE");
  let prepared = file;
  let seconds;
  if (TELEGRAM_VOICE.test(file.name)) {
    const buffer = await decodeLocal(file);
    seconds = buffer.duration;
    if (!audioVideoDuration(seconds)) throw Error("AUDIO_TOO_LONG");
    prepared = pcmWavFromBuffer(buffer);
  } else {
    try { seconds = await metadataDuration(file); }
    catch { seconds = (await decodeLocal(file)).duration; }
  }
  const duration = audioVideoDuration(seconds);
  if (!duration) throw Error("AUDIO_TOO_LONG");
  if (!audioVideoFileAllowed(prepared)) throw Error("AUDIO_INVALID_FILE");
  return {file: prepared, seconds, duration};
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {reject(Error("AUDIO_STORAGE_UNAVAILABLE"));return;}
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onerror = () => reject(Error("AUDIO_STORAGE_UNAVAILABLE"));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function stageMessengerAudio({file, seconds, duration, locale, goal, rights}) {
  if (!rights || !["ru","en","es"].includes(locale) ||
      !audioVideoFileAllowed(file) ||
      audioVideoDuration(seconds) !== duration ||
      typeof goal !== "string") throw Error("AUDIO_TRANSFER_INVALID");
  const token = crypto.randomUUID();
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({token, file, seconds, duration,
        locale, goal: goal.trim().slice(0, 160), rights: true, created: Date.now()}, "pending");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(Error("AUDIO_STORAGE_UNAVAILABLE"));
      tx.onabort = () => reject(Error("AUDIO_STORAGE_UNAVAILABLE"));
    });
    sessionStorage.setItem(MESSENGER_AUDIO_VIDEO_KEY, token);
  } finally {db.close();}
}
export async function consumeMessengerAudio(locale) {
  let token = "";
  try {
    token = sessionStorage.getItem(MESSENGER_AUDIO_VIDEO_KEY) || "";
    if (token) sessionStorage.removeItem(MESSENGER_AUDIO_VIDEO_KEY);
  } catch {return null;}
  if (!token) return null;
  let db;
  try {
    db = await openDatabase();
    const item = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).get("pending");
      tx.objectStore(STORE).delete("pending");
      let found = null;
      req.onsuccess = () => {found = req.result || null;};
      tx.oncomplete = () => resolve(found);
      tx.onerror = () => reject(Error("AUDIO_STORAGE_UNAVAILABLE"));
      tx.onabort = () => reject(Error("AUDIO_STORAGE_UNAVAILABLE"));
    });
    if (!item || item.token !== token || item.locale !== locale ||
        !item.rights || !Number.isFinite(item.created) ||
        Date.now() - item.created > MESSENGER_AUDIO_VIDEO_TTL_MS ||
        item.created > Date.now() + 3000 ||
        !audioVideoFileAllowed(item.file) ||
        audioVideoDuration(item.seconds) !== item.duration ||
        typeof item.goal !== "string") return null;
    return item;
  } catch {return null;}
  finally {db?.close();}
}
