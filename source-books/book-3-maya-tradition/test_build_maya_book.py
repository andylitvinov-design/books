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
    def test_parses_all_substantive_templetherapy_entries_as_appendix(self):
        entries = BUILD.parse_supplemental_articles()

        self.assertEqual(len(entries), 29)
        self.assertTrue(all(entry["channel"] == "TempleTherapy" for entry in entries))
        self.assertTrue(all(entry["chapter"] == "VIII. Приложение: TempleTherapy — дополнительные публичные материалы" for entry in entries))
        self.assertEqual(entries[0]["post_id"], 2062)

    def test_appendix_keeps_supplemental_text_and_source_identity(self):
        appendix = BUILD.supplemental_appendix_markdown()

        self.assertIn("# VIII. Приложение: TempleTherapy — дополнительные публичные материалы", appendix)
        self.assertIn("*Дополнительный публичный источник: TempleTherapy", appendix)
        self.assertIn("## TempleTherapy · пост 2062", appendix)
        self.assertIn("Опишу технологии, которым мы исследуем", appendix)

    def test_verifier_checks_the_supplemental_index_and_appendix(self):
        self.assertEqual(VERIFY.verify_supplemental(ROOT), [])


if __name__ == "__main__":
    unittest.main()
