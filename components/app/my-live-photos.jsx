'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SiteOwnerAvatarGallery from './site-owner-avatar-gallery';

const COPY = {
  ru: {
    title: 'Мои AI-аватары', intro: 'Приватные 5-секундные анимации фотографий для будущих видеороликов.',
    new: 'Добавить фотографию', subject: 'На фотографии', self: 'Я', other: 'Близкий человек',
    consent: 'У меня есть право на фото и разрешение изображённого человека на AI-анимацию и обработку в HeyGen.',
    motion: 'Как оживить', smile: 'Мягкая улыбка', greeting: 'Приветствие', wave: 'Помахать рукой', blink: 'Моргание', turn: 'Поворот головы',
    format: 'Формат', portrait: '9:16 · вертикальный', landscape: '16:9 · горизонтальный',
    create: 'Оживить через HeyGen', progress: 'HeyGen создаёт анимацию. Готовый файл сам появится здесь.',
    disabled: 'AI-анимация пока не подключена к сайту. Уже сохранённые материалы остаются доступны.',
    empty: 'Здесь появятся ваши живые фотографии.', loading: 'Открываем живые фото…',
    pending: 'Обрабатывается', unknown: 'Неопределённый ответ HeyGen — повтор не запускаем автоматически',
    failed: 'Не удалось создать анимацию', ready: 'Готово', preview: 'Смотреть', download: 'Скачать MP4',
    remove: 'Удалить', confirm: 'Удалить живое фото и исходник из личного кабинета?',
    retry: 'Обновить', error: 'Действие не завершено. Попробуйте позже.',
    limit: 'Максимум 3 живых фото. Новый заказ требует явного подтверждения.',
    studio: 'Создать ролик', private: 'Материалы приватны, публикация не выполняется автоматически.',
    choose: 'Выберите JPG, PNG, WebP или HEIC до 3 МБ.',
    price: 'Новое оживление — 500 XP; повторное использование сохранённого MP4 бесплатно.',
    xpConsent: 'Разрешаю резервировать 500 XP и списать их после сохранения MP4.',
    lowXp: 'Недостаточно XP: требуется 500 XP.',
     savedTitle: 'Выбрать из Моих фото', savedEmpty: 'Сохранённых фотографий пока нет.', savedUnavailable: 'Галерея фото ещё недоступна.', savedSelected: 'Фото из личного кабинета выбрано. Для HeyGen подтвердите согласие отдельно.', savedPick: 'Выбрать', savedLoading: 'Загружаем Мои фото…',
    waveTip: 'Для взмаха на фото должны быть видны кисть и предплечье. Иначе возможна только улыбка.',
  },
  en: {
    title: 'My AI Avatars', intro: 'Private 5-second photo animations you can reuse in future videos.',
    new: 'Add a photograph', subject: 'Person in the photo', self: 'Me', other: 'A loved one',
    consent: 'I have rights to this photo and the depicted person’s permission for AI animation and processing by HeyGen.',
    motion: 'Movement', smile: 'Gentle smile', greeting: 'Friendly greeting', wave: 'Small wave', blink: 'Blink', turn: 'Head turn',
    format: 'Format', portrait: '9:16 · portrait', landscape: '16:9 · landscape',
    create: 'Animate with HeyGen', progress: 'HeyGen is animating. Your finished clip will appear here automatically.',
    disabled: 'AI animation is not connected to this site yet. Existing saved materials remain available.',
    empty: 'Your live photos will appear here.', loading: 'Loading live photos…',
    pending: 'Processing', unknown: 'HeyGen submission uncertain — no automatic resubmission',
    failed: 'Animation failed', ready: 'Ready', preview: 'Preview', download: 'Download MP4',
    remove: 'Delete', confirm: 'Permanently delete this live photo and its original?',
    retry: 'Refresh', error: 'Could not complete the action. Please try later.',
    limit: 'Up to 3 live photos. Every new render requires your confirmation.',
    studio: 'Create a video', private: 'Private by default. Nothing is published automatically.',
    choose: 'Choose a JPG, PNG, WebP or HEIC image up to 3 MB.',
    price: 'One new animation: 500 XP. Reuse your saved clip for free.',
    xpConsent: 'I approve a 500 XP hold; capture it only after the MP4 is privately saved.',
    lowXp: 'Insufficient XP: 500 XP is required.',
     savedTitle: 'Choose from My Photos', savedEmpty: 'No photos saved yet.', savedUnavailable: 'Private photo gallery is not available yet.', savedSelected: 'A private photo was selected. Confirm separate HeyGen consent before animating.', savedPick: 'Select photo', savedLoading: 'Loading My Photos…',
    waveTip: 'For a natural wave, the photo should show the hand and forearm. Otherwise the clip may only smile.',
  },
  es: {
    title: 'Mis avatares IA', intro: 'Animaciones privadas de fotos de 5 segundos para futuros vídeos.',
    new: 'Añadir fotografía', subject: 'Persona en la foto', self: 'Yo', other: 'Un ser querido',
    consent: 'Tengo derecho a usar la imagen y permiso de la persona para animación y procesamiento con HeyGen.',
    motion: 'Movimiento', smile: 'Sonrisa suave', greeting: 'Saludo amable', wave: 'Saludar con la mano', blink: 'Parpadeo', turn: 'Girar la cabeza',
    format: 'Formato', portrait: '9:16 · vertical', landscape: '16:9 · horizontal',
    create: 'Animar con HeyGen', progress: 'HeyGen está animando. El vídeo aparecerá aquí automáticamente.',
    disabled: 'La animación AI aún no está conectada. Los materiales existentes siguen disponibles.',
    empty: 'Aquí aparecerán tus fotos vivas.', loading: 'Cargando fotos vivas…',
    pending: 'Procesando', unknown: 'Envío incierto: no se repetirá automáticamente',
    failed: 'No se pudo generar', ready: 'Listo', preview: 'Ver', download: 'Descargar MP4',
    remove: 'Eliminar', confirm: '¿Eliminar esta foto viva y la imagen original?',
    retry: 'Actualizar', error: 'No se completó la acción. Inténtalo más tarde.',
    limit: 'Máximo 3 fotos vivas. Cada nueva generación requiere confirmación.',
    studio: 'Crear un vídeo', private: 'Privado por defecto. No se publica automáticamente.',
    choose: 'Selecciona JPG, PNG, WebP o HEIC de hasta 3 MB.',
    price: 'Nueva animación: 500 XP. Puedes reutilizar el MP4 gratis.',
    xpConsent: 'Autorizo reservar 500 XP y cobrarlos al guardar el MP4 privado.',
    lowXp: 'XP insuficientes: se necesitan 500 XP.',
     savedTitle: 'Elegir de Mis fotos', savedEmpty: 'Aún no tienes fotos guardadas.', savedUnavailable: 'La galería privada no está disponible.', savedSelected: 'Foto privada seleccionada. Confirma el permiso separado para HeyGen.', savedPick: 'Elegir foto', savedLoading: 'Cargando Mis fotos…',
    waveTip: 'Para el saludo, la foto debe mostrar la mano y el antebrazo. Si no, el vídeo quizá solo sonría.',
  },
};
const styles = {
  card: { border: '1px solid #c9dedb', borderRadius: 18, padding: 16, margin: '14px 0', background: '#fcfffe', color: '#253a3b' },
  field: { width: '100%', minHeight: 40, border: '1px solid #b5cdca', borderRadius: 10, padding: '8px 9px', fontSize: 15, background: 'white' },
  button: { padding: '10px 13px', minHeight: 43, borderRadius: 12, border: '1px solid #6eafab', background: '#e7f6f3', color: '#164c4a', fontWeight: 650, fontSize: 14 },
};
export default function MyLivePhotos({ locale = 'en' }) {
  const t = COPY[locale] || COPY.en;
  const [items, setItems] = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState('loading');
  const [file, setFile] = useState(null);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [savedPhotosState, setSavedPhotosState] = useState('idle');
  const [savedPhotoBusy, setSavedPhotoBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState('');
  const [motion, setMotion] = useState('smile');
  const [orientation, setOrientation] = useState('portrait');
  const [subject, setSubject] = useState('self');
  const [consent, setConsent] = useState(false);
  const [xpConsent, setXpConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(null);
  const requestId = useRef(null);
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    const res = await fetch('/api/app/live-photos', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) throw Error('LIBRARY_UNAVAILABLE');
    const data = await res.json();
    if (mounted.current) { setItems(data.items || []); setEnabled(data.creationEnabled === true); setState('ready'); }
    return data;
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh().catch(() => { if (mounted.current) setState('error'); });
    return () => { mounted.current = false; };
  }, [refresh]);
  const active = items.some(item => ['pending', 'submitting', 'submitted', 'finalizing'].includes(item.status));
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const ids = items.filter(item => ['submitted', 'finalizing'].includes(item.status)).map(item => item.id);
        if (!ids.length) return;
        await Promise.allSettled(ids.map(id => fetch('/api/app/live-photos/' + encodeURIComponent(id),
          { credentials: 'same-origin', cache: 'no-store' })));
        if (!cancelled) await refresh();
      } catch {}
    }, 20000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [active, items, refresh]);

  // My Photos is the existing first-party owner-scoped gallery. Opening it never
  // authorizes an external upload or creates a billed HeyGen job.
  async function loadSavedPhotos() {
    if (savedPhotosState === 'loading') return;
    setSavedPhotosState('loading');
    try {
      const response = await fetch('/api/app/video-photos', {
        credentials: 'same-origin', cache: 'no-store',
      });
      if (!response.ok) throw Error('PHOTO_LIBRARY_UNAVAILABLE');
      const value = await response.json();
      const photos = Array.isArray(value.photos) ? value.photos : [];
      setSavedPhotos(photos.filter(entry => entry &&
        (entry.id === 'portrait' || /^[a-f0-9]{64}$/.test(entry.id)) &&
        typeof entry.url === 'string').slice(0, 9));
      setSavedPhotosState('ready');
    } catch { setSavedPhotosState('unavailable'); }
  }
  async function chooseSavedPhoto(id) {
    if (busy || savedPhotoBusy || !(id === 'portrait' || /^[a-f0-9]{64}$/.test(id))) return;
    setSavedPhotoBusy(true); setError(''); setPhotoNotice('');
    try {
      // Renew the 120s signed link on selection; do not trust an expired thumbnail URL.
      const response = await fetch('/api/app/video-photos?id=' + encodeURIComponent(id), {
        credentials: 'same-origin', cache: 'no-store',
      });
      if (!response.ok) throw Error('PHOTO_LIBRARY_UNAVAILABLE');
      const value = await response.json();
      const source = value?.photo?.url;
      if (typeof source !== 'string' || !source.startsWith('https://')) throw Error('INVALID_SOURCE');
      const media = await fetch(source, { credentials: 'omit', cache: 'no-store', mode: 'cors' });
      if (!media.ok) throw Error('PRIVATE_PHOTO_UNAVAILABLE');
      const blob = await media.blob();
      if (blob.size < 128 || blob.size > 1500000 ||
          !['image/jpeg', 'application/octet-stream'].includes(blob.type)) throw Error('INVALID_PHOTO');
      setFile(new File([blob], 'my-private-photo.jpg', { type: 'image/jpeg' }));
      setConsent(false);
      setXpConsent(false);
      requestId.current = null;
      setPhotoNotice(t.savedSelected);
    } catch { setError(t.error); }
    finally { setSavedPhotoBusy(false); }
  }
  async function create() {
    if (!enabled || busy || !file || !consent || !xpConsent || file.size > 3000000) return;
    setBusy(true); setError('');
    if (!requestId.current) requestId.current = crypto.randomUUID();
    const body = new FormData();
    body.set('photo', file);
    body.set('motion', motion);
    body.set('orientation', orientation);
    body.set('subject', subject);
    body.set('consentAi', 'true');
    body.set('consentSubject', 'true');
    body.set('consentXp', 'true');
    body.set('requestId', requestId.current);
    try {
      const result = await fetch('/api/app/live-photos', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', body,
      });
      const value = await result.json();
      if (!result.ok || !value.id) throw Error(value.error || 'GENERATION_FAILED');
      requestId.current = null;
      setConsent(false); setXpConsent(false); setFile(null);
      await refresh();
    } catch (failure) { setError(failure?.message === 'VIDEO_CREDITS_INSUFFICIENT' ? t.lowXp : t.error); await refresh().catch(() => {}); }
    finally { setBusy(false); }
  }
  async function preview(id) {
    setError(''); setOpened(null);
    try {
      const res = await fetch('/api/app/live-photos/' + encodeURIComponent(id), {
        credentials: 'same-origin', cache: 'no-store',
      });
      const value = await res.json();
      if (!res.ok || !value.url) throw Error('VIDEO_UNAVAILABLE');
      setOpened({ id, url: value.url });
    } catch { setError(t.error); }
  }
  async function remove(id) {
    if (!window.confirm(t.confirm)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/app/live-photos/' + encodeURIComponent(id), {
        method: 'DELETE', credentials: 'same-origin', cache: 'no-store',
      });
      if (!response.ok) throw Error('DELETE_FAILED');
      setOpened(null); await refresh();
    } catch { setError(t.error); }
    finally { setBusy(false); }
  }
  return <section data-client-live-photos style={styles.card} aria-label={t.title}>
    <h2 style={{ fontSize: 19, margin: '0 0 6px' }}>{t.title}</h2>
    <p style={{ fontSize: 14, marginTop: 0 }}>{t.intro}</p>
    <SiteOwnerAvatarGallery locale={locale} />
    {state === 'loading' ? <p role="status">{t.loading}</p> : null}
    {state === 'error' ? <button type="button" style={styles.button} onClick={() => void refresh()}>{t.retry}</button> : null}
    {state === 'ready' && !enabled ? <p role="status">{t.disabled}</p> : null}
    {enabled ? <div style={{ display: 'grid', gap: 11, marginBottom: 12 }}>
      <label style={{ display: 'grid', gap: 4, fontSize: 14 }}>{t.new}
        <input type="file" style={styles.field} disabled={busy} accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={event => {
          setFile(event.target.files?.[0] || null); setConsent(false); setXpConsent(false); setError(''); setPhotoNotice(''); requestId.current = null;
        }}/>
      </label>
      <details data-live-photo-saved-picker style={{ border: '1px solid #d1e2df', borderRadius: 10, padding: 9 }}
        onToggle={event => { if (event.currentTarget.open) void loadSavedPhotos(); }}>
        <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 650 }}>{t.savedTitle}</summary>
        {savedPhotosState === 'loading' ? <small role="status">{t.savedLoading}</small> : null}
        {savedPhotosState === 'unavailable' ? <small role="status">{t.savedUnavailable}</small> : null}
        {savedPhotosState === 'ready' && savedPhotos.length === 0 ? <small>{t.savedEmpty}</small> : null}
        {savedPhotosState === 'ready' && savedPhotos.length > 0 ? <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(94px,1fr))', gap: 8, marginTop: 9,
        }}>
          {savedPhotos.map(photo => <button type="button" key={photo.id}
            disabled={busy || savedPhotoBusy} aria-label={t.savedPick}
            onClick={() => void chooseSavedPhoto(photo.id)}
            style={{ ...styles.button, padding: 5, minWidth: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '1/1',
              objectFit: 'cover', borderRadius: 7 }} />
            <span style={{ fontSize: 12 }}>{t.savedPick}</span>
          </button>)}
        </div> : null}
      </details>
      {photoNotice ? <small role="status">{photoNotice}</small> : null}
      {file?.size > 3000000 ? <p role="alert">{t.choose}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 9 }}>
        <label style={{ fontSize: 13 }}>{t.motion}
          <select style={styles.field} value={motion} disabled={busy} onChange={e => { setMotion(e.target.value); setXpConsent(false); requestId.current = null; }}>
            {['smile', 'greeting', 'wave', 'blink', 'turn'].map(key => <option value={key} key={key}>{t[key]}</option>)}
          </select>
          {motion === 'wave' ? <small style={{ display: 'block', marginTop: 4, lineHeight: 1.35 }}>{t.waveTip}</small> : null}
        </label>
        <label style={{ fontSize: 13 }}>{t.format}
          <select style={styles.field} value={orientation} disabled={busy} onChange={e => { setOrientation(e.target.value); setXpConsent(false); requestId.current = null; }}>
            <option value="portrait">{t.portrait}</option><option value="landscape">{t.landscape}</option>
          </select>
        </label>
      </div>
      <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>{t.subject}
        <select style={styles.field} value={subject} disabled={busy} onChange={e => { setSubject(e.target.value); setConsent(false); setXpConsent(false); requestId.current = null; }}>
          <option value="self">{t.self}</option><option value="other">{t.other}</option>
        </select>
      </label>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13 }}>
        <input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />
        <span>{t.consent}</span>
      </label>
      <p style={{ fontSize: 13, margin: 0 }}>{t.price}</p>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13 }}>
        <input type="checkbox" checked={xpConsent} disabled={busy} onChange={e => setXpConsent(e.target.checked)}/>
        <span>{t.xpConsent}</span>
      </label>
      <button type="button" style={styles.button}
        disabled={busy || !file || file.size > 3000000 || !consent || !xpConsent ||
          items.filter(i => !['failed','deleted'].includes(i.status)).length >= 3}
        onClick={() => void create()}>{busy ? t.progress : t.create} · 500 XP</button>
      <small>{t.limit}</small>
    </div> : null}
    {error ? <p role="alert" style={{ color: '#a33d39' }}>{error}</p> : null}
    {state === 'ready' && !items.length ? <p>{t.empty}</p> : null}
    {items.map(item => <article key={item.id} style={{ borderTop: '1px solid #d1e2df', paddingTop: 12, paddingBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14 }}>{t[item.motion]} · {item.orientation === 'landscape' ? '16:9' : '9:16'}</strong>
        <small>{item.status === 'ready' ? t.ready : item.status === 'failed' ? t.failed :
          item.status === 'unknown' ? t.unknown : t.pending}</small>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 9 }}>
        {item.status === 'ready' ? <button type="button" style={styles.button} onClick={() => void preview(item.id)}>{t.preview}</button> : null}
        <button type="button" style={styles.button} disabled={busy ||
          ['submitting','submitted','finalizing','unknown'].includes(item.status)}
          onClick={() => void remove(item.id)}>{t.remove}</button>
      </div>
      {opened?.id === item.id ? <div style={{ marginTop: 10 }}>
        <video controls playsInline preload="metadata" src={opened.url} style={{ width: '100%', maxHeight: 280, borderRadius: 12, background: '#101c1c' }}/>
        <p><a href={opened.url} download>{t.download}</a></p>
      </div> : null}
    </article>)}
    <p style={{ fontSize: 12, marginBottom: 5 }}>{t.private}</p>
    <Link href={'/' + locale + '/video-studio'} prefetch={false}>{t.studio}</Link>
  </section>;
}
