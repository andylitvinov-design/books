// Isolated date-partition housekeeping. No client records, secrets, or file contents are read.
// Storage.list is paginated, bounded and sorted; exceeding the cap is a visible retry error.
const DATE_PARTITION = /^\d{4}-\d{2}-\d{2}$/;
const ENQUIRY_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const FILES = new Set(['portrait.jpg', 'drawing.jpg']);
const DAY_MS = 86_400_000;
export const FREE_EXPRESS_RETENTION_DAYS = 31;
export const FREE_EXPRESS_RETENTION_BATCH = 20;
export const FREE_EXPRESS_RETENTION_PAGE = 40;
export const FREE_EXPRESS_RETENTION_MAX_LISTS = 60;

/** Delete up to 20 expired private images, without reading any enquiry records.
 * IMPORTANT: collect candidates before deleting. Deleting while walking a
 * mutable offset-paginated Storage folder shifts indices and skips clients.
 * The existing daily cron calls this after feature rollback as well.
 */
export async function purgeExpiredFreeExpressObjects(bucket, now = Date.now()) {
  if (!Number.isFinite(now)) throw new Error('FREE_EXPRESS_RETENTION_INVALID_TIME');
  let listCalls = 0;
  const selected = [];

  const list = async (prefix, offset = 0) => {
    if (++listCalls > FREE_EXPRESS_RETENTION_MAX_LISTS)
      throw new Error('FREE_EXPRESS_RETENTION_SCAN_LIMIT');
    const { data, error } = await bucket.list(prefix, {
      limit: FREE_EXPRESS_RETENTION_PAGE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error || !Array.isArray(data))
      throw new Error('FREE_EXPRESS_RETENTION_LIST_FAILED');
    return data;
  };

  // Never modify storage while iterating pages: all offsets remain stable.
  scan: for (let dayOffset = 0; ; dayOffset += FREE_EXPRESS_RETENTION_PAGE) {
    const folders = await list('free-express', dayOffset);
    for (const folder of folders) {
      const name = folder?.name;
      if (typeof name !== 'string' || !DATE_PARTITION.test(name)) continue;
      const date = Date.parse(name + 'T00:00:00Z');
      if (!Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== name
        || now - date < FREE_EXPRESS_RETENTION_DAYS * DAY_MS) continue;

      const dayPath = 'free-express/' + name;
      for (let enquiryOffset = 0; ; enquiryOffset += FREE_EXPRESS_RETENTION_PAGE) {
        const enquiries = await list(dayPath, enquiryOffset);
        for (const enquiry of enquiries) {
          if (!ENQUIRY_ID.test(enquiry?.name || '')) continue;
          const path = dayPath + '/' + enquiry.name.toLowerCase();
          for (let fileOffset = 0; ; fileOffset += FREE_EXPRESS_RETENTION_PAGE) {
            const entries = await list(path, fileOffset);
            for (const file of entries) {
              if (!FILES.has(file?.name)) continue;
              selected.push(path + '/' + file.name);
              if (selected.length === FREE_EXPRESS_RETENTION_BATCH) break scan;
            }
            if (entries.length < FREE_EXPRESS_RETENTION_PAGE) break;
          }
        }
        if (enquiries.length < FREE_EXPRESS_RETENTION_PAGE) break;
      }
    }
    if (folders.length < FREE_EXPRESS_RETENTION_PAGE) break;
  }
  if (!selected.length) return 0;
  // One bounded deletion request, only after successful listing and validation.
  const { error } = await bucket.remove(selected);
  if (error) throw new Error('FREE_EXPRESS_RETENTION_DELETE_FAILED');
  return selected.length;
}
