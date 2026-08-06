# -*- coding: utf-8 -*-
"""Descarrega os icones das skills do repo oficial (best-effort).

Skills com icon.type == "file" -> site/assets/icons/skills/<slug>.png
Restantes -> fallback por arvore (tratado no CSS).
Gera site/data/icons.data.js com o mapa skill -> path local (ou null).
Nunca falha o build: falhas de download ficam como fallback.
"""

import json
import re
import ssl
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# maquinas com antivirus que intercepta TLS rebentam a verificacao do Python;
# para download de assets publicos aceitamos contexto sem verificacao.
try:
    _CTX = ssl.create_default_context()
    urllib.request.urlopen("https://raw.githubusercontent.com", timeout=10, context=_CTX)
except Exception:
    _CTX = ssl._create_unverified_context()

ROOT = Path(__file__).resolve().parent.parent
OUT_ICONS = ROOT / "site" / "assets" / "icons" / "skills"
OUT_DATA = ROOT / "site" / "data"
RAW = "https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/"

skills = json.loads(
    (OUT_DATA / "skills.data.js").read_text(encoding="utf-8")
    .split("window.SFL_DATA.skills = ", 1)[1].rstrip().rstrip(";"))


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def baixar(item):
    name, path = item
    dest = OUT_ICONS / f"{slug(name)}.png"
    if dest.exists() and dest.stat().st_size > 100:
        return name, dest.name
    url = RAW + path
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30, context=_CTX) as r:
            data = r.read()
        if len(data) > 100:
            dest.write_bytes(data)
            return name, dest.name
    except Exception as e:
        print(f"  falhou {name}: {e}")
    return name, None


def main():
    OUT_ICONS.mkdir(parents=True, exist_ok=True)
    tarefas = []
    for name, s in skills.items():
        ic = s.get("icon")
        if ic and ic.get("type") == "file":
            tarefas.append((name, ic["path"]))

    print(f"A descarregar {len(tarefas)} icones...")
    mapa = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        for name, fname in ex.map(baixar, tarefas):
            if fname:
                mapa[name] = fname

    body = json.dumps(mapa, ensure_ascii=False, separators=(",", ":"))
    (OUT_DATA / "icons.data.js").write_text(
        "// GERADO por tools/baixar_icones.py\n"
        "window.SFL_DATA = window.SFL_DATA || {};\n"
        f"window.SFL_DATA.icons = {body};\n", encoding="utf-8")
    print(f"OK: {len(mapa)}/{len(tarefas)} icones locais; "
          f"{len(skills) - len(mapa)} usam fallback da arvore")


if __name__ == "__main__":
    main()
