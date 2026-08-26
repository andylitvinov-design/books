import csv
import json
import subprocess
import sys
import tempfile
import unittest
import importlib.util
from pathlib import Path


SPEC = importlib.util.spec_from_file_location("verify_corpus", Path(__file__).with_name("verify_corpus.py"))
VERIFY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFY)


class VerifyCorpusTests(unittest.TestCase):
    def test_accepts_mobile_reading_order_in_maya_manuscript(self):
        root = Path(__file__).resolve().parent
        self.assertEqual(VERIFY.verify_mobile_reading_order(root), [])

    def test_extracts_only_numeric_default_message_ids_from_html(self):
        with tempfile.TemporaryDirectory() as temp:
            html = Path(temp) / "messages.html"
            html.write_text(
                '<div class="message default" id="message2"></div>'
                '<div class="message service" id="message-3"></div>'
                '<div class="message default" id="message004"></div>'
                '<div class="message default" id="message-not-numeric"></div>',
                encoding="utf-8",
            )
            self.assertEqual(VERIFY.html_post_ids(html), [2, 4])

    def test_rejects_unknown_adjacent_post_id(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "raw").mkdir()
            record = {
                "channel": "mayaismagic", "post_id": 7,
                "url": "https://t.me/mayaismagic/7", "date": "2023-01-01 00:00:00 UTC",
                "raw_text": "source text", "media_references": [], "media_caption": "",
                "previous_post_id": 6, "next_post_id": None,
            }
            (root / "raw" / "posts.jsonl").write_text(json.dumps(record) + "\n", encoding="utf-8")
            (root / "raw" / "media-manifest.json").write_text("[]\n", encoding="utf-8")
            with (root / "SOURCE_INDEX.csv").open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=["post_id"])
                writer.writeheader()
                writer.writerow({"post_id": 7})
            result = subprocess.run(
                [sys.executable, str(Path(__file__).with_name("verify_corpus.py")), str(root)],
                text=True, capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("unknown previous_post_id", result.stderr)

    def test_rejects_link_to_non_adjacent_known_post(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "raw").mkdir()
            posts = [
                {"channel": "mayaismagic", "post_id": post_id, "url": f"https://t.me/mayaismagic/{post_id}", "date": "2023-01-01 UTC", "raw_text": "text", "media_references": [], "media_caption": "", "previous_post_id": previous, "next_post_id": following}
                for post_id, previous, following in ((7, None, 9), (8, 7, 9), (9, 8, None))
            ]
            (root / "raw" / "posts.jsonl").write_text("".join(json.dumps(post) + "\n" for post in posts), encoding="utf-8")
            (root / "raw" / "media-manifest.json").write_text("[]\n", encoding="utf-8")
            with (root / "SOURCE_INDEX.csv").open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=["post_id"])
                writer.writeheader()
                writer.writerows({"post_id": post["post_id"]} for post in posts)
            result = subprocess.run([sys.executable, str(Path(__file__).with_name("verify_corpus.py")), str(root)], text=True, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("non-contiguous next_post_id", result.stderr)

    def test_rejects_non_object_jsonl_record(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "raw").mkdir()
            (root / "raw" / "messages.html").write_text("", encoding="utf-8")
            (root / "raw" / "posts.jsonl").write_text("[]\n", encoding="utf-8")
            (root / "raw" / "media-manifest.json").write_text("[]\n", encoding="utf-8")
            result = subprocess.run([sys.executable, str(Path(__file__).with_name("verify_corpus.py")), str(root)], text=True, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("JSON record must be an object", result.stderr)

    def test_rejects_manifest_entry_with_non_string_path(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "raw").mkdir()
            (root / "raw" / "messages.html").write_text("", encoding="utf-8")
            record = {"channel": "mayaismagic", "post_id": 1, "url": "https://t.me/mayaismagic/1", "date": "2023 UTC", "raw_text": "text", "media_references": [], "media_caption": "", "previous_post_id": None, "next_post_id": None}
            (root / "raw" / "posts.jsonl").write_text(json.dumps(record) + "\n", encoding="utf-8")
            (root / "raw" / "media-manifest.json").write_text(json.dumps([{"path": 4, "bytes": True, "sha256": "not-a-digest"}]), encoding="utf-8")
            result = subprocess.run([sys.executable, str(Path(__file__).with_name("verify_corpus.py")), str(root)], text=True, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("media manifest path must be a non-empty relative string", result.stderr)


if __name__ == "__main__":
    unittest.main()
