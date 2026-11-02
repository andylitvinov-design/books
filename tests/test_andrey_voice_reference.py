"""Pure offline tests; fake samples only, no owner voice or client documents."""
import math
import tempfile
import unittest
import wave
from array import array
from pathlib import Path
import importlib.util

PATH = Path(__file__).resolve().parents[1] / "scripts" / "andrey-voice" / "check_reference.py"
spec = importlib.util.spec_from_file_location("andrey_voice_reference_audit", PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fake_wav(file: Path, seconds=6, hz=16000, amplitude=0.25, channels=1):
    with wave.open(str(file), "wb") as sound:
        sound.setnchannels(channels)
        sound.setsampwidth(2)
        sound.setframerate(hz)
        values = array("h", (
            round(32767 * amplitude * math.sin(2 * math.pi * 300 * i / hz))
            for i in range(int(seconds * hz * channels))
        ))
        sound.writeframes(values.tobytes())


class VoiceReferenceTest(unittest.TestCase):
    def test_valid_synthetic_reference(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "synthetic.wav"
            fake_wav(file)
            result = module.audit_wav(file)
            self.assertTrue(result["no_detected_clipping"])
            self.assertTrue(result["suitable_length_5_to_15_seconds"])
            self.assertEqual(result["channels"], 1)
            self.assertEqual(result["sample_rate_hz"], 16000)
            self.assertGreater(result["active_seconds_estimate"], 4)

    def test_reject_stereo_and_unknown_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "stereo.wav"
            fake_wav(file, channels=2)
            with self.assertRaisesRegex(ValueError, "mono"):
                module.audit_wav(file)
            with self.assertRaisesRegex(ValueError, ".wav"):
                module.audit_wav(Path(directory) / "missing.mp3")

    def test_zero_data_is_not_suitable_for_cloning(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "silent.wav"
            fake_wav(file, amplitude=0)
            result = module.audit_wav(file)
            self.assertEqual(result["active_seconds_estimate"], 0)
            self.assertEqual(result["clipped_samples"], 0)


if __name__ == "__main__":
    unittest.main()
