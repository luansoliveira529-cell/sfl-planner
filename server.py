"""SFL Planner - servidor local.

Serve os ficheiros estaticos de site/ e faz proxy das APIs do jogo
(resolve CORS e mantem a API key fora do browser).

Endpoints:
  /api/farm/<id>                       -> api.sunflower-land.com/community/farms/<id>  (x-api-key)
  /api/sfl/prices                      -> sfl.world/api/v1/prices
  /api/sfl/exchange                    -> sfl.world/api/v1.1/exchange
  /api/sfl/land/<id>                   -> sfl.world/api/v1/land/<id>
  /api/sfl/landinfo/<id>               -> sfl.world/api/v1/land/info/farm_id/<id>

Uso: python server.py  (ou duplo clique em iniciar.bat)
"""

import json
import re
import ssl
import sys
import threading
import time
import urllib.request
import urllib.error
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"

CONFIG = {}
config_path = ROOT / "config.local.json"
if config_path.exists():
    CONFIG = json.loads(config_path.read_text(encoding="utf-8"))

PORT = int(CONFIG.get("port", 8377))
API_KEY = CONFIG.get("sfl_api_key", "")

BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

# cache em memoria: url -> (expira_em, status, corpo)
_cache = {}
_cache_lock = threading.Lock()

FARM_TTL = 60
PRICES_TTL = 300
LAND_TTL = 60

# antivirus/proxy que intercepta TLS rebenta a verificacao do Python;
# a primeira falha de certificado muda para contexto nao-verificado (uso local).
_SSL_CTX = ssl.create_default_context()


def _e_erro_certificado(e):
    return "CERTIFICATE_VERIFY_FAILED" in str(e)


def fetch_upstream(url, headers, ttl):
    now = time.time()
    with _cache_lock:
        hit = _cache.get(url)
        if hit and hit[0] > now:
            return hit[1], hit[2]
    global _SSL_CTX
    req = urllib.request.Request(url, headers=headers)
    for tentativa in (1, 2):
        try:
            with urllib.request.urlopen(req, timeout=25, context=_SSL_CTX) as resp:
                body = resp.read()
                status = resp.status
            break
        except urllib.error.HTTPError as e:
            body = e.read()
            status = e.code
            break
        except Exception as e:  # timeout, DNS, TLS intercetado, etc.
            if tentativa == 1 and _e_erro_certificado(e):
                _SSL_CTX = ssl._create_unverified_context()
                continue
            body = json.dumps({"error": f"upstream: {e}"}).encode()
            status = 502
            break
    if status == 200:
        with _cache_lock:
            _cache[url] = (now + ttl, status, body)
    else:
        # em erro (ex. rate limit), devolve cache expirada se existir
        with _cache_lock:
            hit = _cache.get(url)
        if hit:
            return hit[1], hit[2]
    return status, body


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def log_message(self, fmt, *args):
        pass  # silencioso

    def _send_json(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]

        m = re.fullmatch(r"/api/farm/(\d{1,10})", path)
        if m:
            if not API_KEY:
                return self._send_json(500, json.dumps(
                    {"error": "sfl_api_key em falta no config.local.json"}).encode())
            status, body = fetch_upstream(
                f"https://api.sunflower-land.com/community/farms/{m.group(1)}",
                {"x-api-key": API_KEY, "User-Agent": BROWSER_UA},
                FARM_TTL,
            )
            return self._send_json(status, body)

        if path == "/api/sfl/prices":
            status, body = fetch_upstream(
                "https://sfl.world/api/v1/prices",
                {"User-Agent": BROWSER_UA}, PRICES_TTL)
            return self._send_json(status, body)

        if path == "/api/sfl/exchange":
            status, body = fetch_upstream(
                "https://sfl.world/api/v1.1/exchange",
                {"User-Agent": BROWSER_UA}, PRICES_TTL)
            return self._send_json(status, body)

        m = re.fullmatch(r"/api/sfl/land/(\d{1,10})", path)
        if m:
            status, body = fetch_upstream(
                f"https://sfl.world/api/v1/land/{m.group(1)}",
                {"User-Agent": BROWSER_UA}, LAND_TTL)
            return self._send_json(status, body)

        m = re.fullmatch(r"/api/sfl/landinfo/(\d{1,10})", path)
        if m:
            status, body = fetch_upstream(
                f"https://sfl.world/api/v1/land/info/farm_id/{m.group(1)}",
                {"User-Agent": BROWSER_UA}, LAND_TTL)
            return self._send_json(status, body)

        if path.startswith("/api/"):
            return self._send_json(404, b'{"error":"endpoint desconhecido"}')

        return super().do_GET()


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}"
    print(f"SFL Planner a correr em {url}")
    print("Ctrl+C para parar.")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAte ja!")


if __name__ == "__main__":
    main()
