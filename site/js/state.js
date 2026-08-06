/* SFL Planner — estado global + persistência + regras de pontos/tier */
window.App = window.App || {};

(function () {
  var CHAVE = "sflplanner:v1";

  App.state = {
    lang: "pt",
    farmId: null,
    farm: {
      owner: "",
      island: "basic",
      season: "summer",
      level: 1,
      xp: 0,
      ascension: 0,
      skillsOwned: {},          // nome -> rank
      nodes: {
        plots: 0, fruitPatches: 0, ghPots: 0,
        trees: 0, stones: 0, iron: 0, gold: 0, crimstones: 0, oil: 0,
        chickens: 0, cows: 0, sheep: 0
      }
    },
    planner: { selected: {} },  // nome -> rank (inclui as da farm)
    calc: { cropAtivo: "auto", fruitAtiva: "auto", ghAtiva: "auto" },
    prices: { flowerUsd: 0, flowerBrl: 0, flowerCoins: 0, p2p: {} },
    ui: { periodo: "dia", arvore: "Crops", tab: "tab-skills", calcTab: "calc-crops", accordion: true }
  };

  App.save = function () {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({
        lang: App.state.lang,
        farmId: App.state.farmId,
        farm: App.state.farm,
        planner: App.state.planner,
        calc: App.state.calc,
        flowerCoins: App.state.prices.flowerCoins,
        ui: App.state.ui
      }));
    } catch (e) { /* quota */ }
  };

  App.load = function () {
    try {
      var raw = localStorage.getItem(CHAVE);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d.lang) App.state.lang = d.lang;
      if (d.farmId) App.state.farmId = d.farmId;
      if (d.farm) Object.assign(App.state.farm, d.farm);
      if (d.planner && d.planner.selected) App.state.planner.selected = d.planner.selected;
      if (d.calc) Object.assign(App.state.calc, d.calc);
      if (d.flowerCoins) App.state.prices.flowerCoins = d.flowerCoins;
      if (d.ui) Object.assign(App.state.ui, d.ui);
    } catch (e) { /* estado corrompido: ignora */ }
  };

  /* ---------------- regras oficiais de pontos/tier ---------------- */

  var META = function () { return SFL_DATA.skillsMeta; };

  App.upgradePoints = function (tier) {
    return META().upgradePointsByTier[String(tier)] || 1;
  };

  /* custo total em pontos de uma skill no rank r */
  App.custoSkill = function (nome, rank) {
    var s = SFL_DATA.skills[nome];
    if (!s) return 0;
    var custo = s.points;
    if (rank > 1) custo += App.upgradePoints(s.tier) * (rank - 1);
    return custo;
  };

  App.pontosGastos = function () {
    var total = 0, sel = App.state.planner.selected;
    Object.keys(sel).forEach(function (nome) {
      total += App.custoSkill(nome, sel[nome]);
    });
    return total;
  };

  App.pontosTotais = function () {
    return Math.max(1, App.state.farm.level | 0);
  };

  App.pontosDisponiveis = function () {
    return App.pontosTotais() - App.pontosGastos();
  };

  /* pontos gastos na árvore (regra do jogo: só base points de skills tier 1/2) */
  App.pontosNaArvore = function (arvore) {
    var total = 0, sel = App.state.planner.selected;
    Object.keys(sel).forEach(function (nome) {
      var s = SFL_DATA.skills[nome];
      if (s && s.tree === arvore && s.tier !== 3) total += s.points;
    });
    return total;
  };

  App.tierDesbloqueado = function (arvore) {
    var pts = App.pontosNaArvore(arvore);
    var th = SFL_DATA.tierThresholds[arvore] || { "2": 2, "3": 5 };
    if (pts >= th["3"]) return 3;
    if (pts >= th["2"]) return 2;
    return 1;
  };

  /* tier necessário na árvore para a skill estar no rank alvo (regra oficial) */
  App.tierNecessarioParaRank = function (nome, rankAlvo) {
    var s = SFL_DATA.skills[nome];
    if (!s) return 1;
    if (rankAlvo <= 1) return s.tier;
    return Math.min(3, s.tier + (rankAlvo - 1));
  };

  var ORDEM_ILHAS = ["basic", "spring", "desert", "volcano", "swamp"];

  App.ilhaSuficiente = function (necessaria) {
    var atual = ORDEM_ILHAS.indexOf(App.state.farm.island);
    var req = ORDEM_ILHAS.indexOf(necessaria);
    if (req < 0) return true;
    return atual >= req;
  };

  /* nível a partir do XP (tabela oficial de 200 níveis) */
  App.nivelDoXp = function (xp) {
    var tab = SFL_DATA.levels.experience;
    var nivel = 1;
    for (var n = 1; n <= 200; n++) {
      var req = tab[String(n)];
      if (req !== undefined && xp >= req) nivel = n; else if (req !== undefined) break;
    }
    return nivel;
  };
})();
