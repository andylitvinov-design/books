import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("build_unified_library", ROOT / "build" / "build_unified_library.py")
BUILD = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(BUILD)


class UnifiedLibraryRenderingTests(unittest.TestCase):
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
