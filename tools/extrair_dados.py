# -*- coding: utf-8 -*-
"""Extrai dados dos ficheiros .ts oficiais do Sunflower Land (tools/vendor/)
para site/data/*.data.js (globals window.SFL_DATA.*).

Parser recursivo tolerante de object literals TS:
  - comentarios // e /* */
  - translate("chave")           -> "chave"
  - SUNNYSIDE?.skills?.x         -> {"__ref": "SUNNYSIDE.skills.x"}
  - identificadores importados   -> resolvidos para paths de assets (icones)
  - aritmetica simples           -> avaliada (2 * 60 * 60 -> 7200)
  - new Decimal(x)               -> x
  - spread ...CONST              -> inline de constantes pre-registadas

Falha ALTO em construcoes desconhecidas — nunca dados silenciosamente maus.
"""

import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENDOR = ROOT / "tools" / "vendor"
OUT = ROOT / "site" / "data"


# ---------------------------------------------------------------- tokenizer

class Parser:
    def __init__(self, src, consts=None, imports=None):
        self.s = src
        self.i = 0
        self.n = len(src)
        self.consts = consts or {}       # nome -> valor python (para spreads/refs)
        self.imports = imports or {}     # var de import -> path do asset

    def error(self, msg):
        ctx = self.s[max(0, self.i - 60):self.i + 60].replace("\n", "\\n")
        raise SyntaxError(f"{msg} @ pos {self.i}: ...{ctx}...")

    def skip_ws(self):
        while self.i < self.n:
            c = self.s[self.i]
            if c in " \t\r\n":
                self.i += 1
            elif self.s.startswith("//", self.i):
                j = self.s.find("\n", self.i)
                self.i = self.n if j < 0 else j + 1
            elif self.s.startswith("/*", self.i):
                j = self.s.find("*/", self.i)
                if j < 0:
                    self.error("comentario /* sem fecho")
                self.i = j + 2
            else:
                return

    def peek(self):
        self.skip_ws()
        return self.s[self.i] if self.i < self.n else ""

    def eat(self, ch):
        self.skip_ws()
        if not self.s.startswith(ch, self.i):
            self.error(f"esperava '{ch}'")
        self.i += len(ch)

    def try_eat(self, ch):
        self.skip_ws()
        if self.s.startswith(ch, self.i):
            self.i += len(ch)
            return True
        return False

    # ------------------------------------------------------------ strings

    def parse_string(self):
        q = self.s[self.i]
        self.i += 1
        out = []
        while self.i < self.n:
            c = self.s[self.i]
            if c == "\\":
                nxt = self.s[self.i + 1]
                mapa = {"n": "\n", "t": "\t", "'": "'", '"': '"', "`": "`", "\\": "\\"}
                out.append(mapa.get(nxt, nxt))
                self.i += 2
            elif c == q:
                self.i += 1
                return "".join(out)
            else:
                out.append(c)
                self.i += 1
        self.error("string sem fecho")

    def parse_template(self):
        # template literal; ${expr} vira a string do valor parseado
        self.i += 1  # `
        out = []
        while self.i < self.n:
            c = self.s[self.i]
            if c == "`":
                self.i += 1
                return "".join(out)
            if self.s.startswith("${", self.i):
                self.i += 2
                v = self.parse_expr()
                self.eat("}")
                out.append(str(v))
            else:
                out.append(c)
                self.i += 1
        self.error("template sem fecho")

    # ------------------------------------------------------------ atomos

    def parse_ident(self):
        m = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", self.s[self.i:])
        if not m:
            self.error("esperava identificador")
        self.i += m.end()
        return m.group(0)

    def parse_ident_chain(self):
        """Ident seguido de .x / ?.x / ["x"] / (args). Devolve valor resolvido."""
        name = self.parse_ident()

        if name == "new":
            self.skip_ws()
            cls = self.parse_ident()
            self.eat("(")
            args = self.parse_args()
            return args[0] if args else {"__new": cls}

        if name == "true":
            return True
        if name == "false":
            return False
        if name in ("null", "undefined"):
            return None

        parts = [name]
        while True:
            self.skip_ws()
            if self.s.startswith("?.", self.i):
                self.i += 2
                parts.append(self.parse_ident())
            elif self.s.startswith(".", self.i) and not self.s.startswith("...", self.i):
                self.i += 1
                parts.append(self.parse_ident())
            elif self.s.startswith("[", self.i):
                self.i += 1
                k = self.parse_expr()
                self.eat("]")
                parts.append(str(k))
            elif self.s.startswith("(", self.i):
                self.i += 1
                args = self.parse_args()
                if parts == ["translate"] and args:
                    return args[0]
                # outra chamada qualquer: devolve marcador
                return {"__call": ".".join(parts), "args": args}
            else:
                break

        if len(parts) == 1:
            if name in self.consts:
                return self.consts[name]
            if name in self.imports:
                return {"__asset": self.imports[name]}
            return {"__ref": name}
        return {"__ref": ".".join(parts)}

    def parse_args(self):
        args = []
        while True:
            if self.peek() == ")":
                self.i += 1
                return args
            args.append(self.parse_expr())
            if not self.try_eat(","):
                self.eat(")")
                return args

    def parse_number(self):
        m = re.match(r"-?\d[\d_]*(\.\d+)?([eE][+-]?\d+)?", self.s[self.i:])
        if not m:
            self.error("esperava numero")
        self.i += m.end()
        txt = m.group(0).replace("_", "")
        return float(txt) if ("." in txt or "e" in txt or "E" in txt) else int(txt)

    # ------------------------------------------------------------ expressoes

    def parse_primary(self):
        c = self.peek()
        if c == "":
            self.error("fim inesperado")
        if c in "\"'":
            return self.parse_string()
        if c == "`":
            return self.parse_template()
        if c == "{":
            return self.parse_object()
        if c == "[":
            return self.parse_array()
        if c == "(":
            self.i += 1
            v = self.parse_expr()
            self.eat(")")
            return v
        if c == "-" or c.isdigit():
            return self.parse_number()
        return self.parse_ident_chain()

    def skip_type_assertion(self):
        """Salta `as const` / `as Tipo<...>[]` depois de um valor."""
        self.skip_ws()
        if not re.match(r"as\b", self.s[self.i:]):
            return
        self.i += 2
        self.skip_ws()
        self.parse_ident()  # const | NomeDoTipo
        self.skip_ws()
        if self.s.startswith("<", self.i):  # genericos balanceados
            depth = 0
            while self.i < self.n:
                c = self.s[self.i]
                if c == "<":
                    depth += 1
                elif c == ">":
                    depth -= 1
                    if depth == 0:
                        self.i += 1
                        break
                self.i += 1
        while self.try_eat("[]"):
            pass

    def parse_muldiv(self):
        v = self.parse_primary()
        self.skip_type_assertion()
        while True:
            self.skip_ws()
            if self.s.startswith("*", self.i) and not self.s.startswith("**", self.i):
                self.i += 1
                v = v * self.parse_primary()
            elif self.s.startswith("/", self.i) and not self.s.startswith("//", self.i) \
                    and not self.s.startswith("/*", self.i):
                self.i += 1
                v = v / self.parse_primary()
            else:
                return v

    def parse_expr(self):
        v = self.parse_muldiv()
        while True:
            self.skip_ws()
            if self.s.startswith("+", self.i):
                self.i += 1
                v = v + self.parse_muldiv()
            elif self.s.startswith("-", self.i) and re.match(r"-\s", self.s[self.i:]):
                self.i += 1
                v = v - self.parse_muldiv()
            else:
                return v

    def parse_array(self):
        self.eat("[")
        out = []
        while True:
            if self.peek() == "]":
                self.i += 1
                return out
            if self.try_eat("..."):
                v = self.parse_expr()
                if isinstance(v, list):
                    out.extend(v)
                else:
                    self.error("spread de nao-lista em array")
            else:
                out.append(self.parse_expr())
            if not self.try_eat(","):
                self.eat("]")
                return out

    def parse_object(self):
        self.eat("{")
        out = {}
        while True:
            c = self.peek()
            if c == "}":
                self.i += 1
                return out
            if self.try_eat("..."):
                v = self.parse_expr()
                if isinstance(v, dict):
                    out.update(v)
                else:
                    self.error("spread de nao-objeto")
            else:
                if c in "\"'":
                    key = self.parse_string()
                elif c == "[":  # computed key
                    self.i += 1
                    key = str(self.parse_expr())
                    self.eat("]")
                elif c.isdigit() or c == "-":
                    n = self.parse_number()
                    key = str(int(n)) if float(n).is_integer() else str(n)
                else:
                    key = self.parse_ident()
                self.eat(":")
                out[key] = self.parse_expr()
            if not self.try_eat(","):
                self.eat("}")
                return out


# ------------------------------------------------------- helpers de ficheiro

def read(name):
    return (VENDOR / name).read_text(encoding="utf-8")


def find_export(src, name):
    """Posiciona no inicio do literal ({ ou [) de `export const NAME`."""
    m = re.search(rf"export const {re.escape(name)}\s*(?::[^=]+)?=\s*", src)
    if not m:
        raise SystemExit(f"ERRO: export const {name} nao encontrado")
    return m.end()


def parse_export(src, name, consts=None, imports=None):
    p = Parser(src, consts=consts, imports=imports)
    p.i = find_export(src, name)
    return p.parse_expr()


def collect_icon_imports(src):
    """import x from "assets/..." -> {x: path} (so' assets de imagem)."""
    out = {}
    for m in re.finditer(
            r'import\s+([A-Za-z_$][\w$]*)\s+from\s+"(assets/[^"]+\.(?:png|webp|gif|jpg))"',
            src):
        out[m.group(1)] = m.group(2)
    return out


def parse_simple_consts(src, names):
    """const NAME = <expr>; para constantes numericas/arrays simples."""
    out = {}
    for name in names:
        m = re.search(rf"(?:export )?const {re.escape(name)}\s*(?::[^=]+)?=\s*", src)
        if not m:
            continue
        p = Parser(src)
        p.i = m.end()
        out[name] = p.parse_expr()
    return out


def clean(v):
    """Substitui marcadores nao serializaveis por formas JSON simples."""
    if isinstance(v, dict):
        if "__asset" in v:
            return {"asset": v["__asset"]}
        if "__ref" in v:
            return {"ref": v["__ref"]}
        if "__call" in v:
            return {"call": v["__call"]}
        if "__new" in v:
            return None
        return {k: clean(x) for k, x in v.items()}
    if isinstance(v, list):
        return [clean(x) for x in v]
    return v


def write_datajs(fname, prop, value, extra_comment=""):
    OUT.mkdir(parents=True, exist_ok=True)
    body = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    txt = (f"// GERADO por tools/extrair_dados.py — nao editar a mao. {extra_comment}\n"
           f"window.SFL_DATA = window.SFL_DATA || {{}};\n"
           f"window.SFL_DATA.{prop} = {body};\n")
    (OUT / fname).write_text(txt, encoding="utf-8")
    print(f"  ok {fname}  ({len(body)//1024} KB)")


# ---------------------------------------------------------------- pipeline

def extrair_skills():
    src = read("bumpkinSkills.ts")
    imports = collect_icon_imports(src)
    consts = parse_simple_consts(src, ["AOE_RANKS", "UPGRADE_POINTS_BY_TIER",
                                       "OIL_DRILL_WOOL_BY_RANK"])

    tree = parse_export(src, "BUMPKIN_REVAMP_SKILL_TREE",
                        consts=consts, imports=imports)
    legacy = parse_export(src, "BUMPKIN_SKILL_TREE",
                          consts=consts, imports=imports)

    skills = {}
    for name, s in tree.items():
        s = clean(s)
        req = s.get("requirements", {})
        buff = (s.get("boosts") or {}).get("buff") or {}
        debuff = (s.get("boosts") or {}).get("debuff") or {}
        icon = s.get("image")
        icon_out = None
        if isinstance(icon, dict):
            if "asset" in icon:
                icon_out = {"type": "file", "path": icon["asset"]}
            elif "ref" in icon:
                r = icon["ref"]
                if r.startswith("ITEM_DETAILS."):
                    icon_out = {"type": "item", "item": r.split(".")[1]}
                else:
                    icon_out = {"type": "ref", "ref": r}
        skills[name] = {
            "name": name,
            "tree": s.get("tree"),
            "tier": req.get("tier"),
            "points": req.get("points"),
            "island": req.get("island"),
            "cooldown": req.get("cooldown"),
            "items": req.get("items"),
            "power": bool(s.get("power")),
            "disabled": bool(s.get("disabled")),
            "npc": s.get("npc") if isinstance(s.get("npc"), str) else None,
            "buffKey": buff.get("shortDescription"),
            "buffLabel": buff.get("labelType"),
            "debuffKey": debuff.get("shortDescription"),
            "icon": icon_out,
            "upgrade": s.get("upgrade"),
        }

    legacy_out = {}
    for name, s in legacy.items():
        s = clean(s)
        legacy_out[name] = {
            "name": name,
            "tree": s.get("tree"),
            "points": (s.get("requirements") or {}).get("points"),
            "boostKey": s.get("boosts"),
        }

    upgrade_points = consts.get("UPGRADE_POINTS_BY_TIER") or {"1": 1, "2": 3, "3": 6}
    upgrade_points = {str(int(float(k))): v for k, v in upgrade_points.items()}

    write_datajs("skills.data.js", "skills", skills)
    write_datajs("skillsLegacy.data.js", "skillsLegacy", legacy_out)
    write_datajs("skillsMeta.data.js", "skillsMeta", {
        "upgradePointsByTier": upgrade_points,
        "shardsByTier": {"1": 1, "2": 2, "3": 3},
    })
    return skills


def extrair_tiers():
    src = read("choseSkill.ts")
    tiers = parse_export(src, "SKILL_POINTS_PER_TIER")
    write_datajs("tiers.data.js", "tierThresholds", clean(tiers))
    return tiers


def extrair_gamedata():
    crops_src = read("crops.ts")
    crops = clean(parse_export(crops_src, "CROPS"))
    crop_seeds = clean(parse_export(crops_src, "CROP_SEEDS"))
    gh_crops = clean(parse_export(crops_src, "GREENHOUSE_CROPS"))
    gh_seeds = clean(parse_export(crops_src, "GREENHOUSE_SEEDS"))

    fruits_src = read("fruits.ts")
    patch_fruit = clean(parse_export(fruits_src, "PATCH_FRUIT"))
    patch_seeds = clean(parse_export(fruits_src, "PATCH_FRUIT_SEEDS"))

    animals_src = read("animals.ts")
    animals = clean(parse_export(animals_src, "ANIMALS"))
    animal_levels = clean(parse_export(animals_src, "ANIMAL_LEVELS"))
    animal_foods = clean(parse_export(animals_src, "ANIMAL_FOODS"))
    animal_xp = clean(parse_export(animals_src, "ANIMAL_FOOD_EXPERIENCE"))
    animal_drop = clean(parse_export(animals_src, "ANIMAL_RESOURCE_DROP"))

    const_src = read("constants.ts")
    rec = parse_simple_consts(const_src, [
        "TREE_RECOVERY_TIME", "STONE_RECOVERY_TIME", "IRON_RECOVERY_TIME",
        "GOLD_RECOVERY_TIME", "CRIMSTONE_RECOVERY_TIME", "SUNSTONE_RECOVERY_TIME",
        "OIL_RESERVE_RECOVERY_TIME",
    ])

    res_src = read("resources.ts")
    commodities = clean(parse_export(res_src, "COMMODITIES"))

    write_datajs("crops.data.js", "crops", {
        "crops": crops, "seeds": crop_seeds,
        "greenhouseCrops": gh_crops, "greenhouseSeeds": gh_seeds,
    })
    write_datajs("fruits.data.js", "fruits", {
        "fruit": patch_fruit, "seeds": patch_seeds,
    })
    write_datajs("animals.data.js", "animals", {
        "animals": animals, "levels": animal_levels, "foods": animal_foods,
        "foodXp": animal_xp, "drops": animal_drop,
    })
    write_datajs("resources.data.js", "resources", {
        "recovery": {k: v for k, v in rec.items()},
        "commodities": commodities,
        # yields base por no' (fonte: wiki + eventos do jogo; modo manual)
        "baseYield": {"Tree": 1, "Stone Rock": 1, "Iron Rock": 1,
                      "Gold Rock": 1, "Crimstone Rock": 1, "Oil Reserve": 10},
    })
    return crops


def extrair_levels():
    src = read("level.ts")
    levels = parse_export(src, "LEVEL_EXPERIENCE")
    consts = parse_simple_consts(src, ["LEVELS_PER_ASCENSION", "PRE_ASCENSION_MAX_LEVEL"])
    write_datajs("levels.data.js", "levels", {
        "experience": clean(levels),
        "levelsPerAscension": consts.get("LEVELS_PER_ASCENSION", 50),
        "preAscensionMax": consts.get("PRE_ASCENSION_MAX_LEVEL", 150),
    })
    return levels


def extrair_i18n(skills):
    en = json.loads(read("en.json"))
    pt = json.loads(read("pt-BR.json"))

    chaves = set()
    for s in skills.values():
        for k in (s.get("buffKey"), s.get("debuffKey")):
            if isinstance(k, str):
                chaves.add(k)
    # descricoes de crops/frutas legacy tambem usam description.*
    for k in list(en.keys()):
        if k.startswith("description.") and (k in pt):
            pass  # so' incluimos as usadas — ver abaixo

    legacy = json.loads((OUT / "skillsLegacy.data.js").read_text(encoding="utf-8")
                        .split("window.SFL_DATA.skillsLegacy = ", 1)[1].rstrip().rstrip(";"))
    for s in legacy.values():
        if isinstance(s.get("boostKey"), str):
            chaves.add(s["boostKey"])

    out = {"en": {}, "pt": {}}
    faltam = []
    for k in sorted(chaves):
        if k in en:
            out["en"][k] = en[k]
            out["pt"][k] = pt.get(k, en[k])
        else:
            faltam.append(k)
    if faltam:
        print(f"  aviso: {len(faltam)} chaves i18n nao encontradas (ex: {faltam[:4]})")
    write_datajs("i18n-game.data.js", "i18nGame", out)


def main():
    t0 = time.time()
    print("A extrair dados oficiais...")
    skills = extrair_skills()
    extrair_tiers()
    extrair_gamedata()
    extrair_levels()
    extrair_i18n(skills)
    write_datajs("meta.data.js", "meta", {
        "generatedAt": time.strftime("%Y-%m-%d %H:%M"),
        "source": "github.com/sunflower-land/sunflower-land @ main",
        "version": "1.0.0",
    })
    arvores = sorted({s["tree"] for s in skills.values() if s["tree"]})
    print(f"Skills novas: {len(skills)} | Arvores: {len(arvores)}: {arvores}")
    print(f"Concluido em {time.time()-t0:.1f}s")


if __name__ == "__main__":
    main()
