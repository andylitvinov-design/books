# Holistic House: Google Search Console ownership + indexing handoff

**Recorded:** 2026-10-16. **Status:** owner verification of CONNECTED account blocked; DO NOT claim the page indexed or sitemap submitted.
**Property:** `https://holistichouse.vercel.app/` (URL-prefix, exact https host).
**Existing public source:** `app/layout.tsx` already emits `google-site-verification` through Next.js Metadata. Preserve the existing HTML verification tag — it may belong to another owner. Do not paste its value into PRs/issues or rotate/remove it without comparing which Google identity owns it.

## Evidence

- GSC Wizard lists `https://psitrends.com/` and `https://ezohata.com/` and an unverified test domain, not a readable Holistic House property.
- GSC Wizard `add_site({siteUrl:"https://holistichouse.vercel.app/"})` explicitly answered that the property **exists in Search Console but is NOT verified for a connected Google account**. That is NOT evidence of failed indexing, zero clicks, or missing metadata.
- Browser access for the signed-in Google profile was unavailable on 2026-10-16 because its separate TinyFish wallet had insufficient funds; run did not start. No Google UI work was executed.
- This does not require a paid Google Ads plan, and paid advertising is completely separate from SEO.

## Owner action (cannot be done with repository write alone)

1. Open [Google Search Console](https://search.google.com/search-console) using the **same Google account linked to GSC Wizard**. Select URL-prefix `https://holistichouse.vercel.app/`.
2. In Settings → Ownership verification, try the existing HTML-tag method and click **Verify**. If the existing tag belongs to another Google account, the verified owner can add the connected user under Settings → Users and permissions with **Full** access, or owner-authorized new verification can be generated for the connected identity.
3. If Google supplies a **different** token/HTML filename for the connected identity, deliver its exact method through a safe authorized workflow to the developer. Add it to metadata or `public/` without removing other owners; deploy exact SHA, verify response on the actual canonical hostname, and click Verify in Google.
4. Do not create duplicate wrong-prefix properties, switch to PsiTrends account by assumption, buy anything, or claim success before the Google status says verified.

## After the property is readable in GSC Wizard

1. Re-run list_sites and add_site on the exact verified property.
2. Submit `https://holistichouse.vercel.app/sitemap.xml` once; record provider acknowledgement and date, not invented indexed-count.
3. Inspect one of each five page families, then the other EN/RU/ES counterparts:
   - `/{locale}/about`
   - `/{locale}/services/free-situation-review`
   - `/{locale}/academy/reiki/yggdrasil/basic-course`
   - `/{locale}/academy/reiki/yggdrasil/free-initiation`
   - `/{locale}/academy/reiki/tantra-reiki/free-initiation`
4. Export actual 28-/90-day Search Analytics by query/page/device/country with **property**, **window**, **settled date**, **source**. New pages may have no impressions yet; annotate correctly.
5. Update [SEO #306](https://github.com/andylitvinov-design/books/issues/306), [master plan](./holistic-house-seo-master-plan.md) and [manifest](./seo-306-execution-manifest.md).

**Privacy:** No personal tests, client cabinet, diagnoses, report data, notes, drawings, private URLs or patient content in GSC submissions, GA4 events or public GitHub documentation.
