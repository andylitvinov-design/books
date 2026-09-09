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
