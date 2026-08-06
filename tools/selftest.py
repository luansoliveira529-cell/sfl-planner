# -*- coding: utf-8 -*-
"""Valida os dados gerados em site/data/ — falha alto se a extracao degradar."""

import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "site" / "data"

KINDS_CONHECIDOS = {
    "growthMultiplier", "additiveYield", "coinBonus", "dropChance", "chance",
    "costMultiplier", "flatTimeBonus", "stockBonus", "aoe", "cooldown",
    "multiplier", "dailyLimit", "xpBonus", "timeReduction", "flatDebuff",
    "oilReduction", "flatBonus", "growthWithOilDebuff", "yieldWithDebuff",
    "growthWithDebuff", "frenziedFish", "doubleNom", "flatReduction",
    "yieldWithOilDebuff", "productionRate", "rateWithGrowthDebuff",
    "costWithDebuff", "xpWithFeedDebuff", "sicknessWithSpread",
}

falhas = []


def check(cond, msg):
    if cond:
        print(f"  ok  {msg}")
    else:
        falhas.append(msg)
        print(f"  FALHA  {msg}")


def load(fname, prop):
    txt = (OUT / fname).read_text(encoding="utf-8")
    return json.loads(txt.split(f"window.SFL_DATA.{prop} = ", 1)[1].rstrip().rstrip(";"))


skills = load("skills.data.js", "skills")
tiers = load("tiers.data.js", "tierThresholds")
crops = load("crops.data.js", "crops")
levels = load("levels.data.js", "levels")
i18n = load("i18n-game.data.js", "i18nGame")

print("== Estrutura ==")
check(len(skills) >= 150, f"{len(skills)} skills (>=150)")
arvores = {s["tree"] for s in skills.values()}
check(len(arvores) == 12, f"12 arvores ({len(arvores)})")
check(all(s["tier"] in (1, 2, 3) for s in skills.values()), "todos os tiers em 1..3")
check(all(isinstance(s["points"], int) and s["points"] >= 0 for s in skills.values()),
      "todos os points inteiros >= 0")
check(all(isinstance(s["island"], str) for s in skills.values()), "todas com island")

kinds = {s["upgrade"]["effect"]["kind"] for s in skills.values()
         if s.get("upgrade") and s["upgrade"].get("effect")}
desconhecidos = kinds - KINDS_CONHECIDOS
check(not desconhecidos, f"effect kinds conhecidos (desconhecidos: {desconhecidos or 'nenhum'})")

com_upgrade = sum(1 for s in skills.values() if s.get("upgrade"))
check(com_upgrade >= 100, f"{com_upgrade} skills com ranks de upgrade (>=100)")

print("== Valores exatos do jogo ==")
gt = skills["Green Thumb"]
check(gt["upgrade"]["effect"]["ranks"] == [0.95, 0.94, 0.925],
      "Green Thumb ranks [0.95, 0.94, 0.925]")
check(gt["tier"] == 1 and gt["points"] == 1, "Green Thumb tier 1, 1 ponto")
check(tiers["Crops"]["2"] == 3 and tiers["Crops"]["3"] == 7, "Crops: Tier2@3pts, Tier3@7pts")
check(tiers["Animals"]["2"] == 4 and tiers["Animals"]["3"] == 8, "Animals: Tier2@4, Tier3@8")

sun = crops["crops"]["Sunflower"]
check(sun["harvestSeconds"] == 60 and sun["sellPrice"] == 0.02,
      "Sunflower: 60s, 0.02 coins")
seed = crops["seeds"]["Sunflower Seed"]
check(seed["price"] == 0.01, "Sunflower Seed: 0.01 coins")

check(levels["experience"]["1"] == 0, "Level 1 = 0 XP")
check(len(levels["experience"]) >= 150, f"{len(levels['experience'])} niveis (>=150)")

print("== i18n ==")
check(len(i18n["en"]) >= 120 and len(i18n["pt"]) >= 120,
      f"i18n en={len(i18n['en'])} pt={len(i18n['pt'])} (>=120)")
check(i18n["pt"].get("skill.greenThumb", "") != i18n["en"].get("skill.greenThumb", "x"),
      "skill.greenThumb traduzida em PT")

print()
if falhas:
    print(f"SELFTEST FALHOU: {len(falhas)} problema(s)")
    sys.exit(1)
print("SELFTEST OK")
