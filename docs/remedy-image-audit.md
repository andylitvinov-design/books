# Remedy image audit — Phase M

## Method

The complete Telegram export was checked through `messages.html`, `photos/`, the parsed Telegram index, the 94-card inventory, and the generated image map. A public asset is copied only when its attachment belongs to a mapped canonical full-card or supporting-post message. All URLs below are repository-owned `/media/remedies/...` URLs; no Telegram Desktop path is exposed.

## Result

| Measure | Count |
| --- | ---: |
| Unique Telegram image assets reviewed | 627 |
| Remedy-linked image attachments | 110 |
| Approved primary images | 93 |
| Approved supporting images | 15 |
| Excluded promotional/admin images | 4 |
| Duplicate/repost images retained only in audit | 0 |
| Case images retained only in audit | 0 |
| Unclear/manual-review images not published | 515 |
| Remedies with a usable image | 94 |
| Remedies with no usable image | 0 |

## Decisions

- 93 cards have exactly one `primary_remedy_image`, selected from their first suitable canonical full-card message. One further card has an approved supporting-gallery image only because its canonical attachment was a CTA banner.
- The 15 approved supporting attachments are compact gallery images.
- Images not mapped to a full-card or explicit supporting-post message remain in the export audit and are not copied to public assets.
- Promotional/admin, duplicate/repost, case-only, and unclear images never enter the public remedy media path.
