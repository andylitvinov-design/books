// Synthetic acceptance only. Never retain request contents in failure artifacts.
export function containsPrivateText(text, values) {
  return values.some(value => value && [value, encodeURIComponent(value),
    new URLSearchParams({value}).toString().slice('value='.length)].some(encoded => text.includes(encoded)));
}
export function privateRequestLeak(request, values) {
  return containsPrivateText(request.url(), values) || containsPrivateText(request.postData() || '', values);
}
export async function privateBrowserPersistence(page, values) {
  return page.evaluate(values => {
    const variants = values.filter(Boolean).flatMap(value => [value, encodeURIComponent(value),
      new URLSearchParams({value}).toString().slice('value='.length)]);
    return [location.href, document.cookie,
      ...[localStorage, sessionStorage].flatMap(storage => Object.keys(storage).flatMap(key => [key, storage.getItem(key) || '']))]
      .some(text => variants.some(value => text.includes(value)));
  }, values);
}
