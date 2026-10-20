"""Synthetic QA marker and launchd manifest checks, no actual Mac setup."""
from pathlib import Path
import hashlib
import importlib.util
import json
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "andrey-voice" / "launch_agent.py"
spec = importlib.util.spec_from_file_location("andrey_voice_launch_agent", SCRIPT)
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)


class VoiceLaunchAgentTest(unittest.TestCase):
    def test_plist_contains_no_secrets_or_automatic_paid_provider(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp) / "AndreyVoice"
            profile = agent.specification(home)
            self.assertTrue(agent.no_secrets(profile))
            self.assertEqual(profile["RunAtLoad"], True)
            self.assertGreaterEqual(profile["StartInterval"], 300)
            self.assertIn("--once", profile["ProgramArguments"])
            self.assertNotIn("HEYGEN_API_KEY", json.dumps(profile))
            self.assertNotIn("worker-token", json.dumps(profile).lower())

    def test_two_voice_hashes_and_owner_approval_are_required(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp) / "AndreyVoice"
            refs = home / "voice_sources"
            refs.mkdir(parents=True)
            ru = refs / "ru_heygen_preview.wav"
            en = refs / "en_v4_ref_12s.wav"
            ru.write_bytes(b"synthetic-ru"*600)
            en.write_bytes(b"synthetic-en"*600)
            marker = home / "owner_voice_qa_approved.json"
            self.assertFalse(agent.owner_qa_verified(home))
            good = {
                "owner_approved": True,
                "ru_sha256": hashlib.sha256(ru.read_bytes()).hexdigest(),
                "en_sha256": hashlib.sha256(en.read_bytes()).hexdigest(),
            }
            marker.write_text(json.dumps(good))
            self.assertTrue(agent.owner_qa_verified(home))
            en.write_bytes(b"modified-synthetic-en"*600)
            self.assertFalse(agent.owner_qa_verified(home))
            good["owner_approved"] = False
            marker.write_text(json.dumps(good))
            self.assertFalse(agent.owner_qa_verified(home))


if __name__ == "__main__":
    unittest.main()
