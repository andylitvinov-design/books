import latest from "./telegram-psychic-alchemy-live-import.json";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paragraphs(text) {
  return String(text)
    .split(/\n{2,}/)
    .map((block) => "<p>" + escapeHtml(block).replace(/\n/g, "<br>") + "</p>")
    .join("");
}

const book01Ids = new Set([1060, 1063, 1064, 1065, 1066, 1067, 1068, 1073, 1075, 1076, 1077, 1078]);

export function latestAlchemyBook01Html() {
  const posts = latest.posts.filter((post) => book01Ids.has(post.id));
  return '<section class="latest-alchemy-publications">' +
    '<h2>Новые публикации — сентябрь–октябрь 2026</h2>' +
    '<aside class="latest-alchemy-safety"><strong>Образовательный архив автора.</strong> Эти публикации сохраняются как авторские наблюдения и концепции. Они не являются назначением, инструкцией по дозировкам или заменой доказательной медицинской, психиатрической или экстренной помощи.</aside>' +
    posts.map((post) =>
      '<article class="latest-alchemy-post" id="telegram-' + post.id + '">' +
      '<header><p>Публикация ' + post.id + ' · ' + escapeHtml(post.date) + '</p><a href="' + post.source_url + '" rel="noreferrer" target="_blank">Telegram ↗</a></header>' +
      (post.image ? '<figure><img src="' + post.image + '" alt="Исходное изображение из публикации ' + post.id + '" loading="lazy"></figure>' : '') +
      '<div>' + paragraphs(post.text) + '</div></article>'
    ).join("") +
    '</section>';
}
