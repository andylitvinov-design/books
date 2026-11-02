-- Canonical ru remedy markdown aliases missing from the source status index.
-- Idempotent and scoped strictly to existing private article drafts.
WITH data AS (SELECT slug,tags FROM jsonb_to_recordset('[{"slug":"bach-willow","tags":["Bach Willow","Willow"]},{"slug":"calcarea-phosphorica","tags":["Calcarea Phosphorica"]},{"slug":"candida-albicans","tags":["Кандида","Candida Albicans"]},{"slug":"cimicifuga-racemosa","tags":["Цимицифуга","Cimicifuga Racemosa","Cimicifuga"]},{"slug":"graphites","tags":["графит","Graphites"]},{"slug":"stramonium","tags":["Белена, дурман обыкновенный","Stramonium","Белена","дурман обыкновенный"]},{"slug":"taraxacum-officinale","tags":["Одуванчик","Taraxacum Officinale","Taraxacum"]},{"slug":"zincum-metallicum","tags":["Цинк металлический","Zincum Metallicum","Zincum","Zinc","Цинк"]}]'::jsonb) AS t(slug text,tags jsonb)),
patched AS (UPDATE app.practitioner_articles a
SET draft=jsonb_set(a.draft,'{tags}',d.tags,true),revision=a.revision+1,updated_at=now()
FROM data d,app.practitioners p,app.practitioner_article_folders f
WHERE a.practitioner_id=p.id AND a.folder_id=f.id AND f.practitioner_id=p.id AND p.slug='andy-litvinov'
AND f.slug='remedy-cards' AND a.status='draft' AND a.slug='remedy-'||d.slug||'-ru' AND NOT(a.draft ? 'tags')
RETURNING a.id)
SELECT count(*)::int AS enriched FROM patched;