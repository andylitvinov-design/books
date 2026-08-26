import importlib.util
import unittest
from pathlib import Path


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

    def test_reader_preserves_fenced_code_without_decoding_it(self):
        rendered = BUILD.render_text_html("Текст\n\n```\npath = r'C:\\\\new'\n```")

        self.assertIn("<pre><code>path = r&#x27;C:\\\\new&#x27;</code></pre>", rendered)

    def test_parses_all_substantive_templetherapy_entries_into_shared_chapters(self):
        entries = BUILD.parse_supplemental_articles()

        self.assertEqual(len(entries), 29)
        self.assertTrue(all(entry["channel"] == "TempleTherapy" for entry in entries))
        self.assertEqual({entry["chapter"] for entry in entries}, set(BUILD.CHAPTERS))
        self.assertTrue(all(entry["article_id"].startswith("templetherapy-") for entry in entries))
        self.assertEqual(entries[0]["post_id"], 2062)

    def test_unification_keeps_one_canonical_text_and_all_source_identities(self):
        primary = BUILD.parse_articles()
        unified = BUILD.unify_articles(primary, BUILD.parse_supplemental_articles())

        self.assertEqual(len(unified), 93)
        canonical = next(entry for entry in unified if entry["article_id"] == "mayaismagic-89")
        self.assertEqual([source["channel"] for source in canonical["source_links"]], ["Mayaismagic", "TempleTherapy"])
        self.assertEqual(sum(entry["article_id"] == "templetherapy-2065" for entry in unified), 0)

    def test_verifier_checks_the_supplemental_index_and_integrated_manuscript(self):
        self.assertEqual(VERIFY.verify_supplemental(ROOT), [])


if __name__ == "__main__":
    unittest.main()
