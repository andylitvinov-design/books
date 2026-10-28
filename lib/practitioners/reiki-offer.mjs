// One moderated Reiki offer contract for the practitioner editor and public filter.
// Published offers describe conditions; no advertised timing is a confirmed slot.
export const REIKI_KINDS = ['session', 'initiation', 'course'];
export const REIKI_TIMINGS = ['day', 'days', 'chosen'];
export const REIKI_REPORTS = ['brief', 'text', 'voice'];
export const REIKI_DURATIONS = [10, 20, 30, 60];

const fail = () => { throw new Error('INVALID_REIKI_OFFER'); };
const keys = (value, allowed) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !allowed.includes(key))) fail();
};
const validPrice = value => typeof value === 'number' && Number.isFinite(value) &&
  value >= 0 && value <= 100000 && Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

export function normalizeReikiOffer(value, { complete = false } = {}) {
  if (value == null) return null;
  keys(value, ['kind', 'currency', 'timings', 'role', 'variants']);
  if (!REIKI_KINDS.includes(value.kind) || !['EUR', 'CAD', 'USD'].includes(value.currency)) fail();
  const timings = value.timings ?? [];
  if (!Array.isArray(timings) || timings.length > 3 || new Set(timings).size !== timings.length ||
      timings.some(timing => !REIKI_TIMINGS.includes(timing))) fail();
  const role = value.kind === 'session' ? value.role : null;
  if (value.kind === 'session' && !['practitioner', 'master'].includes(role)) fail();
  if (value.kind !== 'session' && value.role != null) fail();
  const items = value.variants ?? [];
  if (!Array.isArray(items) || items.length > 12 || (complete && items.length === 0)) fail();
  const seen = new Set();
  const variants = items.map(item => {
    keys(item, ['duration', 'report', 'certificate', 'price']);
    if (!REIKI_REPORTS.includes(item.report) || typeof item.certificate !== 'boolean' ||
        !validPrice(item.price)) fail();
    const duration = value.kind === 'session' ? item.duration : null;
    if (value.kind === 'session') {
      if (!REIKI_DURATIONS.includes(duration) || item.certificate) fail();
    } else if (item.duration != null) fail();
    const key = [duration, item.report, item.certificate].join(':');
    if (seen.has(key)) fail();
    seen.add(key);
    return { duration, report: item.report, certificate: item.certificate, price: item.price };
  });
  return { kind: value.kind, currency: value.currency, timings, role, variants };
}

export function reikiOfferPricing(offer) {
  if (!offer || !offer.variants.length) return { pricingMode: 'contact', confirmedPrice: null, currency: '' };
  const cheapest = Math.min(...offer.variants.map(variant => variant.price));
  return {
    pricingMode: offer.variants.every(variant => variant.price === 0) ? 'free' :
      offer.variants.length === 1 ? 'fixed' : 'from',
    confirmedPrice: offer.variants.every(variant => variant.price === 0) ? null : cheapest,
    currency: offer.variants.every(variant => variant.price === 0) ? '' : offer.currency,
  };
}

export function matchesReikiEuroPrice(currency, band, price) {
  if (band === 'all') return true;
  if (currency !== 'EUR' || !Number.isFinite(price)) return false;
  if (band === 'free') return price === 0;
  if (band === 'low') return price > 0 && price <= 20;
  if (band === 'mid') return price > 20 && price <= 50;
  if (band === 'high') return price > 50 && price <= 100;
  if (band === 'premium') return price > 100;
  return false;
}

export function matchReikiVariants(offer, { kind, price = 'all', time = 'any',
  report = 'brief', role = 'any', certificate = false } = {}) {
  if (!offer || offer.kind !== kind || (time !== 'any' && !offer.timings.includes(time)) ||
      (kind === 'session' && role !== 'any' && offer.role !== role)) return [];
  return offer.variants.filter(variant => variant.report === report &&
    (kind === 'session' || variant.certificate === certificate) &&
    matchesReikiEuroPrice(offer.currency, price, variant.price));
}
