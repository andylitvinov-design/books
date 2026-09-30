"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Film, Globe2, Save } from "lucide-react";

import { refreshSiteVideosAction, saveSiteVideoAction } from "@/app/admin/videos/actions";
import { SiteVideoPlayer } from "@/components/site-video-player";
import { parseSiteVideoSource, siteVideoWatchUrl, SITE_VIDEO_SLOTS, videoKey, videoPagePath } from "@/lib/site-videos/model";
import type { SiteVideoRecord } from "@/lib/site-videos/model";

type Locale = "en" | "ru";
type EntityOption = { id: string; label: Record<Locale, string> };
type Props = {
  initialRecords: SiteVideoRecord[];
  initialLocale: Locale;
  storageReady: boolean;
  entities: { remedies: EntityOption[]; books: EntityOption[] };
};
type FormValues = {
  youtubeUrl: string;
  title: string;
  description: string;
  transcript: string;
  driveUrl: string;
  durationSeconds: string;
  youtubeVisibility: "unlisted" | "public";
  reviewed: boolean;
};

const copy = {
  ru: {
    language: "Язык видео и страницы", pages: "Место на сайте", en: "Английский", ru: "Русский",
    overview: "Готовность страниц", published: "Опубликовано", draft: "Черновик", empty: "Без видео",
    available: "страниц с видео", draftCount: "черновиков", intro: "Для каждого языка — своя ссылка. Без опубликованного видео страница остаётся в обычном виде.",
    unavailable: "Сохранение видео сейчас недоступно. Изменения не будут опубликованы. Подключение хранилища нужно проверить.",
    chooseRemedy: "Выберите препарат", chooseBook: "Выберите книгу", destination: "Страница назначения", openPage: "Открыть страницу",
    link: "Ссылка на видео YouTube / HeyGen", linkHelp: "Вставьте ссылку YouTube или ссылку Share / Embed из HeyGen.",
    title: "Название видео", titlePlaceholder: "Например: как проходит личная консультация", visibility: "Доступ на YouTube",
    unlisted: "Доступ по ссылке (Unlisted)", public: "Открытый доступ (Public)", visibilityHelp: "«Личное» (Private) видео не откроется у посетителей. Доступ по ссылке подходит для сайта.",
    heygenVisibilityHelp: "В HeyGen включите доступ по публичной ссылке. Проверьте, что видео открывается без входа в аккаунт.",
    details: "Описание, текст и архив", description: "Короткое описание", transcript: "Текст видео / расшифровка", transcriptHelp: "Посетитель сможет раскрыть текст под видео. Субтитры настраиваются в сервисе, где размещено видео.",
    duration: "Длительность, секунд", archive: "Ссылка на оригинал в Google Drive", archiveHelp: "Только для вашего архива. Эта ссылка не появится на публичной странице.",
    preview: "Предпросмотр", previewHelp: "Добавьте ссылку на видео YouTube или HeyGen, чтобы проверить воспроизведение.", invalidLink: "Проверьте ссылку: нужна ссылка на видео YouTube или ссылка Share / Embed из HeyGen.",
    reviewed: "Я проверил видео: оно открывается и предназначено для посетителей сайта.",
    save: "Сохранить черновик", publish: "Опубликовать на странице", update: "Обновить публикацию", hide: "Скрыть с сайта", saving: "Сохранение…",
    draftHelp: "Сохранение черновика не меняет видео, которое уже видят посетители.", unsaved: "Есть несохранённые изменения", current: "Сейчас на сайте", watch: "Открыть видео",
    savedDraft: "Черновик сохранён. Видео на сайте не изменилось.", savedPublish: "Видео опубликовано на выбранной странице.", savedHide: "Видео скрыто с сайта. Чтобы сохранить новые правки, нажмите «Сохранить черновик».",
    refresh: "Обновить список, сохранив правки", refreshed: "Список обновлён, ваши правки остались в форме. Проверьте актуальное видео и сохраните изменения ещё раз.", selection: "Выберите страницу слева, затем препарат или книгу, если это нужно.",
    errors: {
      unauthorized: "Сессия закончилась. Войдите в кабинет и повторите сохранение.",
      storage: "Не удалось сохранить. Изменения остались в форме; попробуйте ещё раз.",
      conflict: "Эту запись уже изменили в другом окне. Обновите список перед сохранением.",
      approval: "Сначала проверьте видео и отметьте подтверждение под предпросмотром.",
      destination: "Не удалось найти выбранную страницу. Выберите её заново.",
      validation: "Проверьте поля: для публикации нужны название и корректная ссылка YouTube или HeyGen; архивная ссылка должна вести в Google Drive.",
    },
  },
  en: {
    language: "Video and page language", pages: "Website placement", en: "English", ru: "Russian",
    overview: "Page readiness", published: "Published", draft: "Draft", empty: "No video",
    available: "pages with video", draftCount: "drafts", intro: "Each language has its own link. Pages without a published video keep their normal layout.",
    unavailable: "Video storage is currently unavailable. Changes cannot be published until the storage connection is checked.",
    chooseRemedy: "Choose a remedy", chooseBook: "Choose a book", destination: "Destination page", openPage: "Open page",
    link: "YouTube / HeyGen video link", linkHelp: "Paste a YouTube link or a Share / Embed link from HeyGen.",
    title: "Video title", titlePlaceholder: "For example: what happens in a personal consultation", visibility: "YouTube visibility",
    unlisted: "Unlisted — anyone with the link", public: "Public — discoverable on YouTube", visibilityHelp: "Private videos will not play for visitors. Unlisted is suitable for website videos.",
    heygenVisibilityHelp: "Enable public link sharing in HeyGen. Check that the video opens without signing in.",
    details: "Description, transcript and archive", description: "Short description", transcript: "Video text / transcript", transcriptHelp: "Visitors can expand the transcript below the video. Manage captions in the service hosting the video.",
    duration: "Duration in seconds", archive: "Original file in Google Drive", archiveHelp: "For your archive only. This link is never shown on the public page.",
    preview: "Preview", previewHelp: "Add a YouTube or HeyGen video link to check playback.", invalidLink: "Check the link: use a YouTube video link or a Share / Embed link from HeyGen.",
    reviewed: "I checked that the video plays and is intended for website visitors.",
    save: "Save draft", publish: "Publish to page", update: "Update publication", hide: "Hide from website", saving: "Saving…",
    draftHelp: "Saving a draft does not change the video visitors already see.", unsaved: "Unsaved changes", current: "Currently on the website", watch: "Open video",
    savedDraft: "Draft saved. The website video has not changed.", savedPublish: "Video published to the selected page.", savedHide: "Video hidden from the website. To keep any new edits, choose Save draft.",
    refresh: "Refresh list and keep edits", refreshed: "List refreshed. Your edits remain in the form. Review the current video before saving again.", selection: "Choose a page on the left, then a remedy or book if needed.",
    errors: {
      unauthorized: "Your session has ended. Sign in to your cabinet and save again.",
      storage: "Could not save. Your changes remain in the form; please try again.",
      conflict: "This record changed in another window. Refresh the list before saving.",
      approval: "Check the video first, then tick the confirmation below the preview.",
      destination: "The selected page could not be found. Please select it again.",
      validation: "Check the fields: publishing needs a title and valid YouTube or HeyGen link; an archive link must point to Google Drive.",
    },
  },
} as const;

function valuesFor(record?: SiteVideoRecord): FormValues {
  const source = record?.draft ?? record?.published;
  return {
    youtubeUrl: record?.draft?.youtubeUrl ?? (source ? siteVideoWatchUrl(source) : ""),
    title: source?.title ?? "",
    description: source?.description ?? "",
    transcript: source?.transcript ?? "",
    driveUrl: record?.draft?.driveUrl ?? "",
    durationSeconds: source?.durationSeconds === undefined ? "" : String(source.durationSeconds),
    youtubeVisibility: record?.draft?.youtubeVisibility ?? "unlisted",
    reviewed: false,
  };
}

export function SiteVideoManager({ initialRecords, initialLocale, storageReady, entities }: Props) {
  const [uiLocale, setUiLocale] = useState<Locale>(initialLocale);
  const [locale, setLocale] = useState<Locale>("en");
  const [slotId, setSlotId] = useState("home-intro");
  const [entityId, setEntityId] = useState("");
  const [records, setRecords] = useState(initialRecords);
  // Unsaved edits survive switching between placements and languages in this editor.
  const [edits, setEdits] = useState<Record<string, FormValues>>({});
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ key: string; kind: "draft" | "publish" | "hide" | "refreshed" | "error"; error?: string } | null>(null);
  const text = copy[uiLocale];
  const slot = SITE_VIDEO_SLOTS.find(item => item.id === slotId)!;
  const needsEntity = Boolean(slot.entityType);
  const key = !needsEntity || entityId ? videoKey(slotId, locale, entityId) : "";
  const record = records.find(item => item.key === key);
  const form = edits[key] ?? valuesFor(record);
  const source = parseSiteVideoSource(form.youtubeUrl);
  const entityOptions = slot.entityType === "remedy" ? entities.remedies : entities.books;
  const publishedCount = records.filter(item => item.locale === locale && item.published).length;
  const draftCount = records.filter(item => item.locale === locale && item.draft && !item.published).length;

  useEffect(() => {
    function onLocale(event: Event) {
      setUiLocale((event as CustomEvent).detail === "en" ? "en" : "ru");
    }
    window.addEventListener("holistic-house-ui-locale", onLocale);
    return () => window.removeEventListener("holistic-house-ui-locale", onLocale);
  }, []);

  function change(values: Partial<FormValues>) {
    if (!key) return;
    setEdits(previous => ({ ...previous, [key]: { ...form, reviewed: false, ...values } }));
    setNotice(null);
  }

  function chooseSlot(nextId: string) {
    setSlotId(nextId);
    setEntityId("");
    setNotice(null);
  }

  async function save(intent: "draft" | "publish" | "hide") {
    if (!key || pending || !storageReady) return;
    setPending(true);
    setNotice(null);
    try {
      const result = await saveSiteVideoAction({
        ...form, slot: slotId, locale, entityId, intent,
        expectedRevision: record?.revision ?? 0,
      });
      if (result.ok && result.record) {
        const saved = result.record as SiteVideoRecord;
        setRecords(previous => [...previous.filter(item => item.key !== key), saved]);
        if (intent !== "hide") setEdits(previous => {
          const next = { ...previous };
          delete next[key];
          return next;
        });
        setNotice({ key, kind: intent });
      } else setNotice({ key, kind: "error", error: result.error ?? "storage" });
    } catch {
      setNotice({ key, kind: "error", error: "storage" });
    } finally {
      setPending(false);
    }
  }

  async function refresh() {
    if (pending) return;
    setPending(true);
    try {
      const result = await refreshSiteVideosAction();
      if (result.ok && result.records) {
        setRecords(result.records as SiteVideoRecord[]);
        setEdits(previous => Object.fromEntries(Object.entries(previous).map(([entryKey, values]) => [entryKey, { ...values, reviewed: false }])));
        setNotice({ key, kind: "refreshed" });
      } else setNotice({ key, kind: "error", error: result.error ?? "storage" });
    } catch {
      setNotice({ key, kind: "error", error: "storage" });
    } finally { setPending(false); }
  }

  const visibleNotice = notice?.key === key ? notice : null;
  const noticeText = visibleNotice?.kind === "error"
    ? text.errors[visibleNotice.error as keyof typeof text.errors] ?? text.errors.storage
    : visibleNotice?.kind === "publish" ? text.savedPublish
    : visibleNotice?.kind === "hide" ? text.savedHide
    : visibleNotice?.kind === "draft" ? text.savedDraft
    : visibleNotice?.kind === "refreshed" ? text.refreshed : "";

  return (
    <section className="site-video-manager" lang={uiLocale} aria-label={text.overview}>
      {!storageReady && <p className="site-video-admin-notice site-video-admin-notice--error" role="alert">{text.unavailable}</p>}
      <div className="site-video-manager-toolbar">
        <div>
          <span className="site-video-field-label" id="video-language-label"><Globe2 size={16} aria-hidden="true" />{text.language}</span>
          <div className="site-video-language-picker" role="group" aria-labelledby="video-language-label">
            {(["en", "ru"] as const).map(language => <button key={language} type="button" aria-pressed={locale === language} disabled={pending} onClick={() => { setLocale(language); setNotice(null); }}>{text[language]}<span>{language.toUpperCase()}</span></button>)}
          </div>
        </div>
        <p className="site-video-readiness"><strong>{publishedCount}</strong> {text.available}<span> · {draftCount} {text.draftCount}</span></p>
      </div>
      <p className="site-video-manager-intro">{text.intro}</p>

      <div className="site-video-manager-grid">
        <nav className="site-video-placement-list" aria-label={text.pages}>
          {SITE_VIDEO_SLOTS.map(item => {
            const itemRecord = item.entityType ? undefined : records.find(entry => entry.key === videoKey(item.id, locale));
            const count = item.entityType ? records.filter(entry => entry.slot === item.id && entry.locale === locale && entry.published).length : 0;
            const status = itemRecord?.published ? "published" : itemRecord?.draft ? "draft" : "empty";
            return <button type="button" disabled={pending} aria-pressed={slotId === item.id} onClick={() => chooseSlot(item.id)} key={item.id}>
              <span>{item.label[uiLocale]}</span>
              <small className={`site-video-status site-video-status--${status}`}>{item.entityType ? `${count} ${text.published.toLowerCase()}` : text[status]}</small>
            </button>;
          })}
        </nav>

        <div className="site-video-editor">
          <div className="site-video-editor-heading"><div><p className="site-video-field-label">{text.destination} · {locale.toUpperCase()}</p><h2>{slot.label[uiLocale]}</h2></div>{key && <a href={videoPagePath(slotId, locale, entityId)} target="_blank" rel="noreferrer">{text.openPage}<ExternalLink size={15} aria-hidden="true" /></a>}</div>
          {needsEntity && <label className="site-video-field"><span>{slot.entityType === "remedy" ? text.chooseRemedy : text.chooseBook}</span><select value={entityId} disabled={pending} onChange={event => { setEntityId(event.target.value); setNotice(null); }}><option value="">{slot.entityType === "remedy" ? text.chooseRemedy : text.chooseBook}</option>{entityOptions.map(item => <option key={item.id} value={item.id}>{item.label[uiLocale]}</option>)}</select></label>}
          {!key ? <p className="site-video-selection-help">{text.selection}</p> : <>
            {record?.published && <div className="site-video-current"><Check size={17} aria-hidden="true" /><div><strong>{text.current}</strong><span>{record.published.title}</span></div><a href={siteVideoWatchUrl(record.published)} target="_blank" rel="noreferrer">{text.watch}</a></div>}
            <form className="site-video-editor-form" onSubmit={event => event.preventDefault()}>
              <label className="site-video-field"><span>{text.link}</span><input name="youtubeUrl" value={form.youtubeUrl} disabled={pending} maxLength={2048} placeholder="https://youtu.be/… / https://app.heygen.com/share/…" autoComplete="off" spellCheck={false} onChange={event => change({ youtubeUrl: event.target.value })} /><small>{text.linkHelp}</small>{form.youtubeUrl.trim() && !source && <small className="site-video-field-error">{text.invalidLink}</small>}</label>
              <label className="site-video-field"><span>{text.title}</span><input name="title" value={form.title} disabled={pending} maxLength={160} placeholder={text.titlePlaceholder} onChange={event => change({ title: event.target.value })} /></label>
              {source?.youtubeId ? <label className="site-video-field"><span>{text.visibility}</span><select name="youtubeVisibility" value={form.youtubeVisibility} disabled={pending} onChange={event => change({ youtubeVisibility: event.target.value as "unlisted" | "public" })}><option value="unlisted">{text.unlisted}</option><option value="public">{text.public}</option></select><small>{text.visibilityHelp}</small></label> : source?.heygenId ? <p className="site-video-draft-help">{text.heygenVisibilityHelp}</p> : null}

              <details className="site-video-editor-details">
                <summary>{text.details}</summary>
                <label className="site-video-field"><span>{text.description}</span><textarea name="description" rows={2} value={form.description} disabled={pending} maxLength={600} onChange={event => change({ description: event.target.value })} /></label>
                <label className="site-video-field"><span>{text.transcript}</span><textarea name="transcript" rows={5} value={form.transcript} disabled={pending} maxLength={20000} onChange={event => change({ transcript: event.target.value })} /><small>{text.transcriptHelp}</small></label>
                <label className="site-video-field"><span>{text.duration}</span><input name="durationSeconds" type="number" min="1" max="7200" step="1" value={form.durationSeconds} disabled={pending} onChange={event => change({ durationSeconds: event.target.value })} /></label>
                <label className="site-video-field"><span>{text.archive}</span><input name="driveUrl" value={form.driveUrl} disabled={pending} maxLength={2048} placeholder="https://drive.google.com/file/d/…/view" spellCheck={false} onChange={event => change({ driveUrl: event.target.value })} /><small>{text.archiveHelp}</small></label>
              </details>

              <section className="site-video-admin-preview" aria-label={text.preview}>
                <p className="site-video-field-label">{text.preview}</p>
                {source ? <SiteVideoPlayer video={{ ...source, title: form.title || text.preview, description: form.description, transcript: form.transcript, language: locale, ...(Number(form.durationSeconds) > 0 ? { durationSeconds: Number(form.durationSeconds) } : {}) }} locale={uiLocale} /> : <div className="site-video-preview-empty"><Film size={30} strokeWidth={1.3} aria-hidden="true" /><p>{text.previewHelp}</p></div>}
              </section>
              <label className="site-video-review-check"><input name="reviewed" type="checkbox" checked={form.reviewed} disabled={pending || !source} onChange={event => change({ reviewed: event.target.checked })} /><span>{text.reviewed}</span></label>
              <div className="site-video-editor-actions">
                <button type="button" className="site-video-admin-button site-video-admin-button--primary" disabled={pending || !storageReady || !source || !form.title.trim() || !form.reviewed} onClick={() => save("publish")}>{pending ? text.saving : record?.published ? text.update : text.publish}</button>
                <button type="button" className="site-video-admin-button" disabled={pending || !storageReady} onClick={() => save("draft")}><Save size={16} aria-hidden="true" />{text.save}</button>
                {record?.published && <button type="button" className="site-video-hide" disabled={pending || !storageReady} onClick={() => save("hide")}>{text.hide}</button>}
              </div>
              <p className="site-video-draft-help">{text.draftHelp}{edits[key] && <strong>{text.unsaved}</strong>}</p>
              <div aria-live="polite" aria-atomic="true">{noticeText && <p className={`site-video-admin-notice ${visibleNotice?.kind === "error" ? "site-video-admin-notice--error" : ""}`}>{noticeText}{visibleNotice?.error === "conflict" && <button type="button" disabled={pending} onClick={refresh}>{text.refresh}</button>}</p>}</div>
            </form>
          </>}
        </div>
      </div>
    </section>
  );
}
