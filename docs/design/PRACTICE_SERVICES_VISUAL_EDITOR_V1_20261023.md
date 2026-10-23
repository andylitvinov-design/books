# Holistic House · Master services visual studio · 2026-10-23

**Approved direction:** match the existing course slide editor's ivory/wood/teal card UI in the master's authenticated **My Practice → Services** module. No second Services collection, editor route, CRM system, checkout or Supabase schema. Primary language EN; RU/ES mirrors.

## Reused live architecture
- Existing source: `components/app/my-services-dashboard.jsx` → `components/app/simple-service-editor.jsx` → `PracticeWorkspace` handlers `onSave`, `onSaveAndSubmit`, `onPause` → `/api/app/practice/services` → `lib/practitioners/repository.js`, `validateServiceDraft`, `app.service_offerings`, profile/master auth.
- Price is **not a payment**. Free/fixed/from/contact, CAD/EUR/USD and minutes follow existing backend validation. Do not enable unavailable Stripe/PayPal Business or synthetic payouts. The 20% marketplace commission is only relevant after independently confirmed payment (not at service creation).
- Photos reuse `PracticePhotoUpload`, publicly displayable marketing bucket and server-side ownership validation. A neutral CSS placeholder is editor-only, never a published photo. Video reuses `PracticeVideoField` with existing file-intent + moderation. Client/private data never sent to public buckets.
- No new lead at edit time. The visible request CTA is explicitly a **preview**, never a click-to-lead. Public request/CRM remains the existing authorized flow after service approval.

## Three compact visual screens
1. **Presentation:** client-facing real card, existing uploaded cover on left at desktop/top on mobile, short title and description editable in place, true format/price preview, opt-in photo gallery editor (5 allowed) and caption that CTA is only an editorial preview.
2. **Offer:** format segmented tiles, location for in-person/hybrid, category, service type, duration, pricing mode, confirmed amount and currency; actual price preview computed only from the master's entered values.
3. **Details:** existing promotional video editor; advanced disclosure with languages, long description, goals, methods, benefits, FAQ and optional WhatsApp/Telegram contact fields. Save draft and Submit for review use the existing revisions and back-end.

- One panel visible at once in 320–430px; compact segmented steps, next/previous, warm photograph-first card, safe-area-aware sticky Save action; mobile keyboard puts sticky bar back in normal flow. Controls >=44px where practical.
- Creating a service hides heavy finder/stats and other service cards. Closing a **dirty** new draft asks to discard; data stays local until explicit Save or Submit, no deceptive autosave.
- Preflight `lib/practitioners/service-editor-steps.mjs` mirrors existing validation rules (complete title/description in one language, paid amount + currency, duration 5–1440, location for in-person/hybrid, Spanish completeness, valid contact). Server-side `validateServiceDraft` remains authoritative.
- Fix legacy `null` duration/price coercion to `0` on subsequent saves.

## Required acceptance
- [ ] Node tests: new `tests/practice-service-visual-blocks.test.mjs` plus existing services/quota/photo/video/one-screen suite.
- [ ] Scoped ESLint, TypeScript, Next build in isolated GitHub workflow; unrelated failures tracked separately.
- [ ] Production branch `codex/public-book-library`; Vercel READY, exact SHA and `https://holistichouse.vercel.app` alias readback.
- [ ] Real authorized master E2E on iPhone Safari 320/375/390/430: new photo upload and preview, EN/RU/ES title, formats, free/€50/€100, save/reload, concurrent revision, submit and review state, anonymous read only after moderation, actual request → CRM (no false lead from visual preview). No seeded customer data or synthetic checkout. Keep the real-delivery acceptance open until tested.

**Rollback:** revert UI/step-helper PR; no database schema migration or external send. Related Master Network #715, workbench V4 and CRM #985.