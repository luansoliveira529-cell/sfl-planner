/* SFL Planner — mapa efeito→modificador (o coração da correção do cálculo)
 *
 * Cada skill simulável tem uma regra: como o valor do rank altera os
 * modificadores de produção. Skills sem regra ficam com badge "não simulado"
 * — nunca números errados em silêncio.
 */
window.App = window.App || {};

(function () {
  /* grupos de crops por tempo (aproximação dos grupos basic/medium/advanced) */
  App.grupoCrop = function (nome) {
    var c = SFL_DATA.crops.crops[nome];
    if (!c) return "basic";
    if (c.harvestSeconds <= 60 * 60) return "basic";
    if (c.harvestSeconds <= 16 * 3600) return "medium";
    return "advanced";
  };

  function ranksDe(s) {
    var e = s.upgrade && s.upgrade.effect;
    if (!e) return null;
    return e.ranks || e.yield || e.buff || null;
  }

  function valorRank(s, rank) {
    var r = ranksDe(s);
    if (!r) return null;
    return r[Math.min(rank, r.length) - 1];
  }

  /* ---- regras explícitas por nome (v = valor do rank) ---- */
  var REGRAS = {
    // ---------- CROPS ----------
    "Green Thumb": function (m, v) { m.crops.growthMult *= v; },
    "Young Farmer": function (m, v) { m.crops.grupoYield.basic += v; },
    "Experienced Farmer": function (m, v) { m.crops.grupoYield.medium += v; },
    "Old Farmer": function (m, v) { m.crops.grupoYield.advanced += v; },
    "Strong Roots": function (m, v) { m.crops.grupoGrowth.advanced *= v; },
    "Coin Swindler": function (m, v) { m.crops.coinsMult *= 1 + v; },
    "Golden Flowers": null, // chance de sunflower dar ouro — não simulado
    // ---------- TREES ----------
    "Lumberjack's Extra": function (m, v) { m.wood.yieldAdd += v; },
    "Tree Charge": function (m, v) { m.wood.respawnMult *= v; },
    "Tree Turnaround": null,
    "Tree Blitz": null,
    "Tough Tree": null,
    "Feller's Discount": function (m, v) { m.wood.toolCostMult *= v; },
    // ---------- MINING ----------
    "Rock'N'Roll": function (m, v) { m.stone.yieldAdd += v; },
    "Speed Miner": function (m, v) { m.stone.respawnMult *= v; },
    "Iron Bumpkin": function (m, v) { m.iron.yieldAdd += v; },
    "Iron Hustle": function (m, v) { m.iron.respawnMult *= v; },
    "Golden Touch": function (m, v) { m.gold.yieldAdd += v; },
    "Midas Sprint": function (m, v) { m.gold.respawnMult *= v; },
    "Midas Rush": function (m, v) { m.gold.respawnMult *= v; },
    "Fire Kissed": function (m, v) { m.crimstone.yieldAdd += v; },
    "Fireside Alchemist": function (m, v) { m.crimstone.respawnMult *= v; },
    "Frugal Miner": function (m, v) {
      m.stone.toolCostMult *= v; m.iron.toolCostMult *= v; m.gold.toolCostMult *= v;
    },
    "Forge-Ward Profits": null,
    "Rocky Favor": null,   // stone + / iron − (debuff): fase 2
    "Ferrous Favor": null, // iron + / gold −: fase 2
    // ---------- FRUIT PATCH ----------
    "Fruity Heaven": function (m, v) { m.fruits.yieldAdd += v; },
    "Fruity Profit": function (m, v) { m.fruits.coinsMult *= 1 + v; },
    "Catchup": function (m, v) { m.fruits.growthMult *= v; },
    "Pear Turbocharge": null,
    "Generous Orchard": null,
    "Zesty Vibes": null,
    // ---------- GREENHOUSE ----------
    "Glass Room": function (m, v) { m.gh.yieldAdd += v; },
    "Seedy Business": function (m, v) { m.gh.seedCostMult *= v; },
    "Rice and Shine": function (m, v) { m.gh.grupoGrowth.Rice *= v; },
    "Rice Rocket": function (m, v) { m.gh.grupoYield.Rice += v; },
    "Olive Express": function (m, v) { m.gh.grupoGrowth.Olive *= v; },
    "Vine Velocity": function (m, v) { m.gh.grupoGrowth.Grape *= v; },
    "Greenhouse Guru": function (m, v) { m.gh.growthMult *= v; },
    "Seeded Bounty": function (m, v) { m.gh.yieldAdd += v; },
    "Slick Saver": null,
    "Greasy Plants": null,
    "Greenhouse Gamble": null,
    // ---------- ANIMALS ----------
    "Abundant Harvest": function (m, v) { m.animals.produceAdd += v; },
    "Efficient Feeding": function (m, v) { m.animals.feedCostMult *= v; },
    "Restless Animals": function (m, v) { m.animals.cycleMult *= v; },
    "Double Bale": null,
    "Fine Fibers": function (m, v) { m.animals.produceAddPor.Sheep += v; },
    "Featherweight": function (m, v) { m.animals.produceAddPor.Chicken += v; },
    "Chonky Feed": null,
    "Barnyard Rouse": null
  };

  /* ---- defaults por (árvore, kind) quando não há regra explícita ---- */
  function regraDefault(s) {
    var kind = s.upgrade && s.upgrade.effect && s.upgrade.effect.kind;
    if (!kind) return null;
    var t = s.tree;

    if (t === "Crops") {
      if (kind === "growthMultiplier") return function (m, v) { m.crops.growthMult *= v; };
      if (kind === "additiveYield") return function (m, v) { m.crops.yieldAdd += v; };
      if (kind === "coinBonus") return function (m, v) { m.crops.coinsMult *= 1 + v; };
      if (kind === "costMultiplier") return function (m, v) { m.crops.seedCostMult *= v; };
      if (kind === "timeReduction") return function (m, v) { m.crops.growthMult *= 1 - v; };
    }
    if (t === "Fruit Patch") {
      if (kind === "growthMultiplier") return function (m, v) { m.fruits.growthMult *= v; };
      if (kind === "additiveYield") return function (m, v) { m.fruits.yieldAdd += v; };
      if (kind === "coinBonus") return function (m, v) { m.fruits.coinsMult *= 1 + v; };
      if (kind === "costMultiplier") return function (m, v) { m.fruits.seedCostMult *= v; };
    }
    if (t === "Greenhouse") {
      if (kind === "growthMultiplier") return function (m, v) { m.gh.growthMult *= v; };
      if (kind === "additiveYield") return function (m, v) { m.gh.yieldAdd += v; };
      if (kind === "costMultiplier") return function (m, v) { m.gh.seedCostMult *= v; };
    }
    if (t === "Trees") {
      if (kind === "growthMultiplier") return function (m, v) { m.wood.respawnMult *= v; };
      if (kind === "additiveYield") return function (m, v) { m.wood.yieldAdd += v; };
      if (kind === "costMultiplier") return function (m, v) { m.wood.toolCostMult *= v; };
    }
    return null; // Mining sem regra explícita, Cooking, Fishing, etc. -> não simulado
  }

  App.regraDaSkill = function (nome) {
    var s = SFL_DATA.skills[nome];
    if (!s) return null;
    if (nome in REGRAS) return REGRAS[nome];        // pode ser null (não simulado)
    return regraDefault(s);
  };

  App.skillSimulavel = function (nome) {
    return !!App.regraDaSkill(nome) && !!ranksDe(SFL_DATA.skills[nome]);
  };

  App.valorRankDaSkill = valorRank;
})();
