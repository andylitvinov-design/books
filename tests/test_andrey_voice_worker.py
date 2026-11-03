"""Offline Mac worker protocol tests. No real reports, tokens or HTTP requests."""
from pathlib import Path
import importlib.util
import os
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "andrey-voice" / "local_worker.py"
spec = importlib.util.spec_from_file_location("andrey_local_worker", SCRIPT)
voice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voice)


class LocalWorkerContract(unittest.TestCase):
    def test_no_network_or_paid_provider_during_check(self):
        with patch.object(voice, "api_post", side_effect=AssertionError("network forbidden")):
            with patch.dict(os.environ, {}, clear=True), patch("sys.argv", ["worker", "--check"]):
                self.assertEqual(voice.main(), 0)

    def test_site_origin_is_pinned(self):
        with patch.dict(os.environ, {"HH_VOICE_SITE_URL": "https://evil.example"}, clear=True):
            with self.assertRaisesRegex(ValueError, "unapproved"):
                voice.base_url()
        with patch.dict(os.environ, {"HH_VOICE_SITE_URL": "http://holistichouse.vercel.app"}, clear=True):
            with self.assertRaisesRegex(ValueError, "https"):
                voice.base_url()

    def test_signed_url_pinned_to_supabase_bucket_and_owner_project(self):
        expected = "alpha123.supabase.co"
        good = ("https://" + expected + "/storage/v1/object/upload/sign/"
                "hh-client-private-media/narration/synthetic.mp3?token=testtoken")
        with patch.dict(os.environ, {"HH_LOCAL_NARRATION_SUPABASE_HOST":expected}, clear=True):
            self.assertEqual(voice.approved_upload_url(good),good)
            with self.assertRaises(ValueError):
                voice.approved_upload_url(good.replace(expected,"evil.example"))
            with self.assertRaises(ValueError):
                voice.approved_upload_url(good.replace("hh-client-private-media","public"))
            with self.assertRaises(ValueError):
                voice.approved_upload_url(good.replace("https:", "http:"))
            with self.assertRaises(ValueError):
                voice.approved_upload_url(good.replace("token=testtoken", "hello=world"))

    def test_invalid_audio_cannot_be_uploaded(self):
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp)/"bad.mp3"
            file.write_bytes(b"not mp3"*30)
            with self.assertRaisesRegex(ValueError,"recognizable MP3"):
                voice.verify_mp3(file)

    def test_api_paths_have_strict_allowlist(self):
        with self.assertRaisesRegex(ValueError,"allowlisted"):
            voice.api_post("/api/admin/export-private-data", {})
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ValueError):
                voice.api_token()


if __name__ == "__main__":
    unittest.main()
