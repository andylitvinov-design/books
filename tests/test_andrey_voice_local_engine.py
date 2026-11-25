"""Synthetic offline tests for the free local Qwen voice CLI; no model downloads."""
from pathlib import Path
import importlib.util
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "scripts" / "andrey-voice" / "andrey_tts.py"
spec = importlib.util.spec_from_file_location("andrey_free_tts", SOURCE)
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)


class OfflineVoiceEngineTest(unittest.TestCase):
    def test_text_is_chunked_without_clipping(self):
        text = "Это тестовая фраза без каких-либо данных клиента. " * 65
        chunks = engine.split_text(text.strip())
        self.assertGreater(len(chunks), 1)
        self.assertEqual(" ".join(chunks), text.strip())
        self.assertTrue(all(len(chunk) <= 240 for chunk in chunks))

    def test_worker_pipe_input_supported_and_bounded(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake_stdin = Path(tmp) / "synthetic-in.txt"
            fake_stdin.write_text("Only a synthetic test.", encoding="utf-8")
            self.assertEqual(engine.read_input(None, str(fake_stdin)),
                             "Only a synthetic test.")
            with self.assertRaises(RuntimeError):
                engine.read_input("supplied twice", str(fake_stdin))
            with self.assertRaises(RuntimeError):
                engine.read_input("x" * 3001, None)
            with self.assertRaises(RuntimeError):
                engine.read_input("", None)

    def test_reference_required_before_any_inference(self):
        with tempfile.TemporaryDirectory() as tmp:
            fake = Path(tmp) / "synthetic.wav"
            fake.write_bytes(b"FAKE-NOT-A-VOICE" * 600)
            self.assertEqual(engine.approved_reference("ru", str(fake)), fake)
            with self.assertRaises(RuntimeError):
                engine.approved_reference("en", str(Path(tmp) / "missing.wav"))


if __name__ == "__main__":
    unittest.main()
