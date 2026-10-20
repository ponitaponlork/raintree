"""Tiny same-origin web server and Rasa REST bridge for the Raintree chat UI."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RASA_WEBHOOK = os.environ.get("RASA_WEBHOOK", "http://127.0.0.1:5005/webhooks/rest/webhook")
PROFILE_MARKER = re.compile(r"<!--\s*oar-profile\s*:\s*(\{.*?\})\s*-->", re.IGNORECASE | re.DOTALL)
RISK_LEVEL = re.compile(r"\brisk\s+(?:level|profile|band)\s*[:\-]\s*(cautious|balanced|growth[-\s]oriented)\b", re.IGNORECASE)
ALLOCATION_ITEM = re.compile(r"\b(cash|bonds|equities)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)\s*%", re.IGNORECASE)


def profile_from_text(text):
    """Extract the fixed result lines required in Oar's agent instructions."""
    profile = {}
    risk_levels = RISK_LEVEL.findall(text)
    if risk_levels:
        profile["risk_level"] = risk_levels[-1].lower().replace(" ", "-")
    allocation = {}
    for name, value in ALLOCATION_ITEM.findall(text):
        percentage = float(value)
        if 0 <= percentage <= 100:
            allocation[name.lower()] = percentage
    if all(name in allocation for name in ("cash", "bonds", "equities")):
        profile["asset_allocation"] = allocation
    return profile


def merge_profiles(*profiles):
    merged = {}
    for profile in profiles:
        if not isinstance(profile, dict):
            continue
        if isinstance(profile.get("risk_level"), str):
            merged["risk_level"] = profile["risk_level"]
        allocation = profile.get("asset_allocation")
        if isinstance(allocation, dict):
            merged.setdefault("asset_allocation", {}).update(allocation)
    return merged


def attach_advisory_profile(messages):
    """Move Rasa's invisible profile marker into a REST custom payload."""
    if not isinstance(messages, list):
        return messages
    enriched = []
    for message in messages:
        if not isinstance(message, dict) or not isinstance(message.get("text"), str):
            enriched.append(message)
            continue
        profile = None

        def remove_marker(match):
            nonlocal profile
            try:
                candidate = json.loads(match.group(1))
                if isinstance(candidate, dict):
                    profile = candidate
            except json.JSONDecodeError:
                pass
            return ""

        text = PROFILE_MARKER.sub(remove_marker, message["text"]).strip()
        updated = {**message, "text": text}
        profile = merge_profiles(profile_from_text(text), profile)
        if profile:
            custom = dict(updated.get("custom") or {})
            custom["client_profile"] = profile
            updated["custom"] = custom
        enriched.append(updated)
    return enriched


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path != "/api/chat":
            self.send_error(404)
            return
        try:
            length = min(int(self.headers.get("Content-Length", "0")), 128_000)
            payload = json.loads(self.rfile.read(length))
            sender = str(payload.get("sender", ""))[:100]
            message = str(payload.get("message", ""))[:4000]
            client_context = str(payload.get("client_context", ""))[:14_000].strip()
            if not sender or not message.strip():
                self._json(400, {"error": "A sender and message are required."})
                return
            if client_context:
                message = (
                    "Client-specific information shared across this client's chats. "
                    "Use as background and treat the current message as the request.\n\n"
                    f"{client_context}\n\nCurrent message:\n{message}"
                )
            request = Request(RASA_WEBHOOK, data=json.dumps({"sender": sender, "message": message}).encode(), headers={"Content-Type": "application/json"}, method="POST")
            with urlopen(request, timeout=60) as response:
                result = json.loads(response.read())
            self._json(200, attach_advisory_profile(result))
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            self._json(502, {"error": f"Rasa is unavailable: {exc}"})
        except (ValueError, json.JSONDecodeError) as exc:
            self._json(400, {"error": f"Invalid request: {exc}"})

    def _json(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        if self.path.startswith("/api/"):
            super().log_message(format, *args)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"Raintree chat UI at http://127.0.0.1:{port}")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
