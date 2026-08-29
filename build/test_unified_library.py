import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("build_unified_library", ROOT / "build" / "build_unified_library.py")
BUILD = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(BUILD)


class UnifiedLibraryRenderingTests(unittest.TestCase):
    def test_next_catalog_contains_the_four_maya_reading_volumes(self):
        catalog = json.loads((ROOT / "data" / "books.json").read_text(encoding="utf-8"))
        ids = {book["id"] for book in catalog}

        self.assertTrue({
            "maya-egregor-gods",
            "maya-calendar",
            "maya-exorcism",
            "maya-mysteries",
        } <= ids)
        self.assertNotIn("maya-tradition-methodology", ids)

    def test_every_catalog_card_has_a_published_cover_image(self):
        catalog = json.loads((ROOT / "data" / "books.json").read_text(encoding="utf-8"))

        missing = [
            book["id"]
            for book in catalog
            if not (ROOT / "public" / "library" / "covers" / f"{book['id']}.jpg").is_file()
        ]

        self.assertEqual(missing, [])

    def test_every_maya_catalog_route_rewrites_to_its_static_reader(self):
        config = (ROOT / "next.config.ts").read_text(encoding="utf-8")

        for book_id in ("maya-egregor-gods", "maya-calendar", "maya-exorcism", "maya-mysteries"):
            with self.subTest(book_id=book_id):
                self.assertIn(f'"/library/{book_id}"', config)
                self.assertIn(f'"/library/{book_id}/index.html"', config)

    def test_public_catalog_contains_the_four_maya_reading_volumes(self):
        ids = {book["id"] for book in BUILD.BOOKS}

        self.assertTrue({
            "maya-egregor-gods",
            "maya-calendar",
            "maya-exorcism",
            "maya-mysteries",
        } <= ids)

    def test_published_unified_library_has_no_literal_newline_escapes(self):
        output = BUILD.OUTPUT_FILE.read_text(encoding="utf-8")

        self.assertNotIn(chr(92) + "n", output)

    def test_every_library_source_is_free_of_literal_newline_escapes(self):
        for book in BUILD.BOOKS:
            with self.subTest(book=book["id"]):
                source = book["path"].read_text(encoding="utf-8")
                self.assertNotIn(chr(92) + "n", source)


if __name__ == "__main__":
    unittest.main()
