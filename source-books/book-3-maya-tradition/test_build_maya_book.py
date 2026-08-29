import importlib.util
import unittest
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("build_maya_book", ROOT / "build_maya_book.py")
BUILD = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(BUILD)
VERIFY_SPEC = importlib.util.spec_from_file_location("verify_corpus", ROOT / "verify_corpus.py")
VERIFY = importlib.util.module_from_spec(VERIFY_SPEC)
assert VERIFY_SPEC.loader is not None
VERIFY_SPEC.loader.exec_module(VERIFY)


class SupplementalTempleTherapyTests(unittest.TestCase):
    def test_exact_supplemental_copy_merges_without_a_handwritten_post_map(self):
        primary = [{
            "article_id": "mayaismagic-900", "post_id": 900, "chapter": BUILD.CHAPTERS[1],
            "channel": "Mayaismagic", "url": "https://t.me/mayaismagic/900", "date": "2025-01-01", "text": "Бог ветра\nНастройка",
        }]
        supplemental = [{
            "article_id": "templetherapy-73", "post_id": 73, "chapter": BUILD.CHAPTERS[1],
            "channel": "TempleTherapy", "url": "https://t.me/TempleTherapy/73", "date": "2021-03-19", "text": "Бог ветра\nНастройка",
        }]

        unified = BUILD.unify_articles(primary, supplemental)

        self.assertEqual(len(unified), 1)
        self.assertEqual(unified[0]["article_id"], "mayaismagic-900")
        self.assertEqual({source["post_id"] for source in unified[0]["source_links"]}, {73, 900})

    def test_unified_manuscript_starts_with_maya_egregore_and_excludes_other_traditions(self):
        manuscript = BUILD.UNIFIED_MANUSCRIPT.read_text(encoding="utf-8")

        self.assertIn("# I. Эгрегор Майя", manuscript)
        self.assertLess(manuscript.index("# I. Эгрегор Майя"), manuscript.index("# II. Боги и божественные силы Майя и Ацтеков"))
        self.assertLess(manuscript.index("# II. Боги и божественные силы Майя и Ацтеков"), manuscript.index("# III. Настройки и энергии Майя и Ацтеков"))
        self.assertLess(manuscript.index("# III. Настройки и энергии Майя и Ацтеков"), manuscript.index("# VII. Календарь и энергия дней"))
        self.assertLess(manuscript.index("## ЭГРЕГОР МАЙЯ."), manuscript.index("## КИНИЧ АХАУ."))
        self.assertNotIn("## #2. ГРЕЧЕСКАЯ ТРАДИЦИЯ.", manuscript)
        self.assertNotIn("## #3. СКАНДИНАВСКАЯ ТРАДИЦИЯ.", manuscript)
        self.assertNotIn("## #4. ДАОССКАЯ ТРАДИЦИЯ.", manuscript)
        self.assertNotIn("## ИССЛЕДОВАНИЕ: ИНКИ.", manuscript)

    def test_reader_curation_keeps_maya_aztec_scope_and_calendar_last(self):
        canonical = BUILD.unify_articles(BUILD.parse_articles(), BUILD.parse_supplemental_articles())
        reader = BUILD.curate_reader_articles(canonical)

        self.assertEqual(reader[0]["article_id"], "mayaismagic-145")
        first_god = next(index for index, article in enumerate(reader) if article["chapter"] == BUILD.READER_CHAPTERS[1])
        self.assertEqual(reader[first_god]["article_id"], "mayaismagic-142")
        tonatiuh = next(index for index, article in enumerate(reader) if article["article_id"] == "mayaismagic-214")
        first_setting = next(index for index, article in enumerate(reader) if article["chapter"] == "III. Настройки и энергии Майя и Ацтеков")
        self.assertEqual(tonatiuh, first_setting + 1)
        mystery_and_twins = {"mayaismagic-224", "mayaismagic-225", "mayaismagic-143", "mayaismagic-144"}
        self.assertTrue(all(reader[index]["chapter"] == "VI. Мистерии, двойники и авторские модели" for index, article in enumerate(reader) if article["article_id"] in mystery_and_twins))
        self.assertLess(max(index for index, article in enumerate(reader) if article["article_id"] in mystery_and_twins), min(index for index, article in enumerate(reader) if article["chapter"] == BUILD.READER_CHAPTERS[-1]))
        self.assertEqual({article["chapter"] for article in reader}, set(BUILD.READER_CHAPTERS))
        self.assertTrue(all(article["article_id"] not in BUILD.READER_EXCLUDED_ARTICLE_IDS for article in reader))
        self.assertTrue(all(article["chapter"] == BUILD.READER_CHAPTERS[-1] for article in reader[-8:]))
        excluded_cross_tradition = {
            "templetherapy-2100", "templetherapy-2198", "templetherapy-2210",
            "mayaismagic-46", "mayaismagic-226",
        }
        self.assertTrue(excluded_cross_tradition <= BUILD.READER_EXCLUDED_ARTICLE_IDS)

    def test_mobile_reader_uses_larger_type(self):
        self.assertGreaterEqual(BUILD.MOBILE_READER_FONT_SIZE, 20)
        self.assertGreater(BUILD.DESKTOP_READER_FONT_SIZE, BUILD.MOBILE_READER_FONT_SIZE)

    def test_reader_merges_repeated_editions_and_preserves_their_sources(self):
        canonical = BUILD.unify_articles(BUILD.parse_articles(), BUILD.parse_supplemental_articles())
        reader = {article["article_id"]: article for article in BUILD.curate_reader_articles(canonical)}

        self.assertFalse({"mayaismagic-17", "mayaismagic-152", "mayaismagic-159", "mayaismagic-220"} & reader.keys())
        self.assertTrue({17, 147} <= {source["post_id"] for source in reader["mayaismagic-147"]["source_links"]})
        self.assertTrue({152, 212} <= {source["post_id"] for source in reader["mayaismagic-212"]["source_links"]})
        self.assertTrue({217, 220} <= {source["post_id"] for source in reader["mayaismagic-217"]["source_links"]})
        self.assertTrue({159, 2262} <= {source["post_id"] for source in reader["templetherapy-2262"]["source_links"]})
        self.assertIn("Света Сознания", reader["templetherapy-2262"]["text"])

    def test_front_description_omits_the_outside_reader_scope_course_label(self):
        source = BUILD.MANUSCRIPT.read_text(encoding="utf-8")
        description = BUILD.parse_front_description(source)
        self.assertNotIn("толтек", str(description["text"]).casefold())

    def test_article_html_renders_newlines_without_literal_escape_sequences(self):
        article = {
            "article_id": "templetherapy-regression",
            "chapter": BUILD.CHAPTERS[0],
            "channel": "TempleTherapy",
            "title": "Проверка переноса",
            "post_id": 9999,
            "url": "https://t.me/TempleTherapy/9999",
            "date": "01.01.2026",
            "text": "Первая строка\n\n1. Первый пункт\n2. Второй пункт",
        }

        rendered = BUILD.article_html(article, None)

        self.assertNotIn("\\\\n", rendered)
        self.assertIn("<p>Первая строка</p>", rendered)
        self.assertIn("<ol><li>Первый пункт</li><li>Второй пункт</li></ol>", rendered)

        serialized = BUILD.render_text_html("Первая строка\\n\\n1. Первый пункт\\n2. Второй пункт")
        self.assertNotIn("\\\\n", serialized)
        self.assertIn("<p>Первая строка</p>", serialized)
        self.assertIn("<ol><li>Первый пункт</li><li>Второй пункт</li></ol>", serialized)

    def test_reader_preserves_a_source_stanza_as_visible_lines(self):
        rendered = BUILD.render_text_html(
            "НАСТРОЙКА. Бог Ветра. Эхекатль.\n\n"
            "Взвиваясь, возносит истомы круженье\n"
            "Спадает вуалью бытийности плен\n"
            "Мерцают, лаская Иного знамения\n"
            "Клубясь, увлекая в грядущего день.\n\n"
            "ПРИМЕЧАНИЕ.\nБог ветра несёт потенцию изменений."
        )

        self.assertIn('<p class="verse">Взвиваясь, возносит истомы круженье<br>Спадает вуалью бытийности плен<br>Мерцают, лаская Иного знамения<br>Клубясь, увлекая в грядущего день.</p>', rendered)
        self.assertIn("<p>ПРИМЕЧАНИЕ. Бог ветра несёт потенцию изменений.</p>", rendered)

    def test_reader_preserves_fenced_code_without_decoding_it(self):
        rendered = BUILD.render_text_html("Текст\n\n```\npath = r'C:\\\\new'\n```")

        self.assertIn("<pre><code>path = r&#x27;C:\\\\new&#x27;</code></pre>", rendered)

    def test_parses_all_substantive_templetherapy_entries_into_shared_chapters(self):
        entries = BUILD.parse_supplemental_articles()

        self.assertEqual(len(entries), 158)
        self.assertTrue(all(entry["channel"] == "TempleTherapy" for entry in entries))
        self.assertTrue({entry["chapter"] for entry in entries} <= set(BUILD.CHAPTERS))
        self.assertTrue(all(entry["article_id"].startswith("templetherapy-") for entry in entries))
        self.assertEqual(entries[0]["post_id"], 4)
        self.assertTrue(any(entry["post_id"] == 73 and entry["reader_include"] for entry in entries))

    def test_unification_keeps_one_canonical_text_and_all_source_identities(self):
        primary = BUILD.parse_articles()
        unified = BUILD.unify_articles(primary, BUILD.parse_supplemental_articles())

        self.assertEqual(len(unified), 199)
        canonical = next(entry for entry in unified if entry["article_id"] == "mayaismagic-89")
        self.assertEqual([source["channel"] for source in canonical["source_links"]], ["Mayaismagic", "TempleTherapy"])
        self.assertEqual(sum(entry["article_id"] == "templetherapy-2065" for entry in unified), 0)

    def test_reader_includes_the_audited_maya_and_aztec_source_gaps_in_coherent_chapters(self):
        reader = BUILD.curate_reader_articles(
            BUILD.unify_articles(BUILD.parse_articles(), BUILD.parse_supplemental_articles())
        )
        by_id = {entry["article_id"]: entry for entry in reader}

        self.assertEqual(by_id["templetherapy-8"]["chapter"], BUILD.READER_CHAPTERS[0])
        self.assertEqual(by_id["templetherapy-116"]["chapter"], BUILD.READER_CHAPTERS[0])
        self.assertEqual(by_id["templetherapy-2226"]["chapter"], BUILD.READER_CHAPTERS[1])
        self.assertEqual(by_id["templetherapy-2253"]["chapter"], BUILD.READER_CHAPTERS[1])
        self.assertEqual(by_id["templetherapy-226"]["chapter"], BUILD.READER_CHAPTERS[5])
        self.assertEqual(by_id["templetherapy-2223"]["chapter"], BUILD.READER_CHAPTERS[5])

        self.assertIn("Эгрегор майянских богов", by_id["templetherapy-8"]["text"])
        self.assertIn("Давайте попробуем прислушаться к Голосу Майя", by_id["templetherapy-116"]["text"])
        self.assertIn("КИНИЧ АХАУ", by_id["templetherapy-2226"]["text"])
        self.assertIn("Кинич Ахау", by_id["templetherapy-2253"]["text"])
        self.assertIn("МИСТЕРИИ КАК МЕТОД ОБОЖЕСТВЛЕНИЯ", by_id["templetherapy-226"]["text"])
        self.assertIn("ИшМук'ане", by_id["templetherapy-2223"]["text"])

    def test_reader_groups_deity_channels_and_restored_media_without_empty_posts(self):
        reader = BUILD.curate_reader_articles(
            BUILD.unify_articles(BUILD.parse_articles(), BUILD.parse_supplemental_articles())
        )
        by_id = {entry["article_id"]: entry for entry in reader}

        self.assertFalse({"templetherapy-15", "templetherapy-25", "templetherapy-91", "templetherapy-228"} & by_id.keys())
        self.assertEqual(by_id["templetherapy-26"]["chapter"], BUILD.READER_CHAPTERS[1])
        self.assertEqual(by_id["templetherapy-74"]["chapter"], BUILD.READER_CHAPTERS[1])
        self.assertEqual(by_id["templetherapy-80"]["chapter"], BUILD.READER_CHAPTERS[1])
        self.assertEqual(by_id["templetherapy-2361"]["chapter"], BUILD.READER_CHAPTERS[1])
        self.assertEqual(by_id["templetherapy-143"]["chapter"], BUILD.READER_CHAPTERS[-1])
        self.assertNotIn("templetherapy-73", by_id)
        self.assertTrue({73, 243} <= {source["post_id"] for source in by_id["mayaismagic-243"]["source_links"]})
        self.assertIn("Взвиваясь, возносит истомы круженье", by_id["mayaismagic-243"]["text"])
        self.assertIn("Бог кукурузы, Ишиим", by_id["templetherapy-26"]["text"])
        self.assertIn("Тлалок - один из ключевых Богов", by_id["templetherapy-2361"]["text"])
        self.assertIn("ЧААК", by_id["templetherapy-80"]["text"])
        for filename in ("post-80-1.jpg", "post-103-1.jpg", "post-154-1.jpg", "post-2361-1.jpg"):
            self.assertTrue((BUILD.SUPPLEMENTAL_MEDIA / filename).is_file(), filename)

    def test_every_reader_article_with_a_templetherapy_photo_reference_has_local_media(self):
        reader = BUILD.curate_reader_articles(
            BUILD.unify_articles(BUILD.parse_articles(), BUILD.parse_supplemental_articles())
        )

        missing = [
            article["article_id"]
            for article in reader
            if article["channel"] == "TempleTherapy" and article["media_references"]
            and not list(BUILD.SUPPLEMENTAL_MEDIA.glob(f"post-{article['post_id']}-*"))
        ]

        self.assertEqual(missing, [])

    def test_reader_media_is_scaled_by_one_and_a_half_across_html_and_docx(self):
        self.assertEqual(BUILD.READER_IMAGE_SCALE, 1.9)
        self.assertEqual(BUILD.HTML_MEDIA_MAX_WIDTH_PX, 630)
        self.assertIn("width:min(72%,630px)", BUILD.READER_MEDIA_CSS)
        self.assertEqual(BUILD.DOCX_MEDIA_WIDTH_INCHES, 3.5)
        self.assertGreaterEqual(BUILD.DOCX_MEDIA_COLUMN_WIDTH_INCHES, BUILD.DOCX_MEDIA_WIDTH_INCHES)

    def test_documented_adjacent_series_media_is_available_for_reader_articles(self):
        expected = {
            "post-8-1.jpg", "post-26-1.jpg", "post-48-1.jpg", "post-58-1.jpg",
            "post-74-1.jpg", "post-79-1.jpg", "post-143-1.jpg", "post-203-1.jpg",
            "post-209-1.jpg", "post-217-1.jpg", "post-226-1.jpg", "post-229-1.jpg",
            "post-233-1.jpg", "post-244-1.jpg", "post-249-1.jpg", "post-573-1.jpg",
            "post-577-1.jpg", "post-589-1.jpg", "post-600-1.jpg", "post-609-1.jpg",
            "post-616-1.jpg", "post-624-1.jpg", "post-663-1.jpg",
        }

        self.assertTrue(expected <= VERIFY.ADJACENT_SERIES_MEDIA)
        self.assertTrue(all((BUILD.SUPPLEMENTAL_MEDIA / filename).is_file() for filename in expected))

    def test_calendar_day_cycle_is_complete_and_is_the_final_reader_section(self):
        reader = BUILD.curate_reader_articles(
            BUILD.unify_articles(BUILD.parse_articles(), BUILD.parse_supplemental_articles())
        )
        by_id = {article["article_id"]: article for article in reader}
        expected_day_articles = {
            "templetherapy-103", "templetherapy-104", "templetherapy-109", "templetherapy-110",
            "templetherapy-111", "templetherapy-113", "templetherapy-117", "templetherapy-119",
            "templetherapy-121", "templetherapy-122", "templetherapy-124", "templetherapy-125",
            "templetherapy-127", "templetherapy-128", "templetherapy-129", "templetherapy-130",
            "templetherapy-132", "templetherapy-133", "templetherapy-135", "templetherapy-136",
            "templetherapy-143", "templetherapy-146", "templetherapy-147", "templetherapy-149",
            "templetherapy-151", "templetherapy-154", "templetherapy-156", "templetherapy-158",
            "templetherapy-163",
        }

        self.assertTrue(expected_day_articles <= BUILD.CALENDAR_DAY_ARTICLE_IDS)
        self.assertTrue(expected_day_articles <= by_id.keys())
        self.assertTrue(all(by_id[article_id]["chapter"] == BUILD.READER_CHAPTERS[-1] for article_id in expected_day_articles))
        self.assertEqual(reader[-1]["chapter"], BUILD.READER_CHAPTERS[-1])

    def test_every_reader_article_has_a_traceable_local_illustration(self):
        reader = BUILD.curate_reader_articles(
            BUILD.unify_articles(BUILD.parse_articles(), BUILD.parse_supplemental_articles())
        )
        media = BUILD.parse_media()

        missing = [
            article["article_id"]
            for article in reader
            if BUILD.reader_media_path(article, media) is None
        ]

        self.assertEqual(missing, [])

    def test_four_volume_manifest_partitions_every_reader_article_once(self):
        reader = BUILD.curate_reader_articles(
            BUILD.unify_articles(BUILD.parse_articles(), BUILD.parse_supplemental_articles())
        )

        volumes = BUILD.volume_articles(reader)
        article_ids = [
            article["article_id"]
            for articles in volumes.values()
            for article in articles
        ]

        self.assertEqual(tuple(volumes), tuple(volume["id"] for volume in BUILD.VOLUMES))
        self.assertEqual(set(article_ids), {article["article_id"] for article in reader})
        self.assertEqual(len(article_ids), len(set(article_ids)))

    def test_each_volume_has_reader_html_and_illustrates_every_article(self):
        reader = BUILD.curate_reader_articles(
            BUILD.unify_articles(BUILD.parse_articles(), BUILD.parse_supplemental_articles())
        )
        media = BUILD.parse_media()

        for volume in BUILD.VOLUMES:
            with self.subTest(volume=volume["id"]):
                self.assertTrue(BUILD.volume_output_path(volume, "html").is_file())
                self.assertTrue(BUILD.volume_output_path(volume, "docx").is_file())
                self.assertTrue(all(
                    BUILD.reader_media_path(article, media) is not None
                    for article in BUILD.volume_articles(reader)[volume["id"]]
                ))

    def test_docx_has_extended_hyperlinked_contents_and_running_furniture(self):
        with ZipFile(BUILD.DOCX_OUT) as document:
            document_xml = document.read("word/document.xml").decode("utf-8")
            header_xml = "".join(
                document.read(name).decode("utf-8")
                for name in document.namelist()
                if name.startswith("word/header")
            )
            footer_xml = "".join(
                document.read(name).decode("utf-8")
                for name in document.namelist()
                if name.startswith("word/footer")
            )

        self.assertIn("Подробное содержание", document_xml)
        self.assertIn('w:hyperlink w:anchor="article_', document_xml)
        self.assertIn("MAYA TRADITION", header_xml)
        self.assertIn('w:instr="PAGE"', footer_xml)

    def test_verifier_checks_the_supplemental_index_and_integrated_manuscript(self):
        self.assertEqual(VERIFY.verify_supplemental(ROOT), [])

    def test_fact_check_labels_the_new_authorial_and_historical_boundary(self):
        fact_check = (ROOT / "FACT_CHECK.md").read_text(encoding="utf-8")

        self.assertIn("TempleTherapy:226", fact_check)
        self.assertIn("authorial interpretation", fact_check)


if __name__ == "__main__":
    unittest.main()
