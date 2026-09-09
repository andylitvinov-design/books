# Issue #3 — Phase M: source-backed remedy images

## Approved design

The Telegram export is the only image source. An image becomes public only when
its message is already mapped to the same canonical remedy card as a full-card
or explicit supporting post. The visual thesis is a restrained editorial
document: one source image beneath the remedy title, with a compact supporting
gallery only where the author attached additional source material.

The catalog has two parallel records:

1. `data/remedy-image-map.csv` preserves every remedy-linked source attachment,
   its classification, review decision, source message/date, and public URL.
2. Each paired remedy Markdown file receives the selected `primary_image` plus
   a semicolon-separated source/public gallery record. RU and EN use the same
   asset decision.

`primary_remedy_image` is assigned once per canonical slug, using the first
canonical-card message in inventory order. Additional mapped primary-post
attachments become supporting images. Explicit supporting-post attachments are
supporting images. Images from duplicate/repost, admin/promo, case-only, or
unclear records remain audit-only and are never copied to `public/`.

## Tasks

1. Add failing tests for a single public primary image per image-bearing remedy,
   non-local public URLs, copied assets, no missing files, and paired RU/EN
   metadata.
2. Rebuild the full-export image audit from `messages.html`, Telegram index,
   inventory, and existing mappings. Write classifications and decisions to the
   image map and `docs/remedy-image-audit.md`.
3. Copy only approved files through a deterministic generator to
   `public/media/remedies/<slug>/`; update 94 paired cards and Book 02 TOC.
4. Render the primary image under the title and a lazy supporting gallery,
   using source-only contextual alt text and responsive aspect-preserving CSS.
5. Add validators for assets, metadata pairs, primary uniqueness, public URL
   shape, build output, and local-path leakage. Run focused/full test suites,
   lint, build, preview, and visual checks.

## Visual and safety rules

- No full-screen media, caption invention, or generic image dump.
- The public image carries only `Source image attached to <canonical name>,
  <message id>` as its contextual alt text.
- Assets are copied, never hotlinked from local Telegram paths.
- All unrelated export assets remain indexed/audited but outside the website.
- Production and PR merge are out of scope.
