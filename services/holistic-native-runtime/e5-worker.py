"""Optional multilingual E5 Small worker, loopback-only and fully offline at runtime.

Install model files on the *cloud VM* before first boot. No private transcript
storage, third-party inference calls or client-side model installation.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"


class E5Handler(BaseHTTPRequestHandler):
    model = None

    def log_message(self, _format, *_args):
        # Never print request text or client identifiers.
        pass

    def reply(self, status, content):
        encoded = json.dumps(content, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_POST(self):
        if self.path != "/embed":
            self.reply(404, {"error": "NOT_FOUND"})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 1 <= size <= 4000:
                self.reply(413, {"error": "INVALID_EMBED_INPUT"})
                return
            data = json.loads(self.rfile.read(size))
            source = data.get("input") if type(data) is dict else None
            if not isinstance(source, str) or not source.strip() or len(source) > 1200:
                self.reply(400, {"error": "INVALID_EMBED_INPUT"})
                return
            vector = self.model.encode(["query: " + source], normalize_embeddings=True,
                convert_to_numpy=True, show_progress_bar=False)[0]
            self.reply(200, {"model": "multilingual-e5-small",
                "embeddings": [[float(value) for value in vector]]})
        except (ValueError, TypeError, KeyError, json.JSONDecodeError):
            self.reply(400, {"error": "INVALID_EMBED_INPUT"})
        except Exception:
            self.reply(503, {"error": "NATIVE_EMBED_UNAVAILABLE"})


def main():
    model_dir = Path(os.environ.get("HH_E5_MODEL_DIR",
        "/srv/holistic-native-models/multilingual-e5-small"))
    if not model_dir.is_dir():
        raise SystemExit("E5 model must be pre-downloaded to the cloud VM")
    from sentence_transformers import SentenceTransformer
    E5Handler.model = SentenceTransformer(str(model_dir), device="cpu",
        trust_remote_code=False, local_files_only=True)
    port = int(os.environ.get("HH_E5_PORT", "8788"))
    if not 1024 <= port <= 65535:
        raise SystemExit("INVALID_E5_PORT")
    HTTPServer(("127.0.0.1", port), E5Handler).serve_forever()


if __name__ == "__main__":
    main()
