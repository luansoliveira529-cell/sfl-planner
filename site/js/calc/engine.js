/* SFL Planner — motor de cálculo (funções puras, sem DOM)
 * produção/dia por atividade + totais dia/semana/mês + delta por skill
 */
window.App = window.App || {};

(function () {
  var DIA = 86400;

  function clamp0(x) { return x > 0 ? x : 0; }

  /* ---------------- CROPS ---------------- */
  App.calcularCrops = function (mods) {
    var out = [];
    var plots = App.state.farm.nodes.plots | 0;
    var crops = SFL_DATA.crops.crops;
    var seeds = SFL_DATA.crops.seeds;
    Object.keys(crops).forEach(function (nome) {
      var c = crops[nome];
      if (!c.harvestSeconds || !c.sellPrice) return;
      var grupo = App.grupoCrop(nome);
      var tempo = c.harvestSeconds * mods.crops.growthMult * mods.crops.grupoGrowth[grupo];
      var ciclos = DIA / tempo;
      var y = 1 + mods.crops.yieldAdd + mods.crops.grupoYield[grupo];
      var seed = seeds[nome + " Seed"] || {};
      var custoSemente = (seed.price || 0) * mods.crops.seedCostMult;
      var brutoDia = plots * ciclos * y * c.sellPrice * mods.crops.coinsMult;
      var custoDia = plots * ciclos * custoSemente;
      out.push({
        nome: nome, tempo: tempo, ciclos: ciclos, yield: y,
        bruto: brutoDia, custo: custoDia, liquido: brutoDia - custoDia
      });
    });
    out.sort(function (a, b) { return b.liquido - a.liquido; });
    return out;
  };

  /* ---------------- FRUTAS ---------------- */
  var COLHEITAS_POR_SEMENTE = 4; // média de colheitas antes de replantar

  App.calcularFrutas = function (mods) {
    var out = [];
    var patches = App.state.farm.nodes.fruitPatches | 0;
    var fruit = SFL_DATA.fruits.fruit;
    var seeds = SFL_DATA.fruits.seeds;
    Object.keys(fruit).forEach(function (nome) {
      var f = fruit[nome];
      var seed = seeds[nome + " Seed"] || {};
      var tempoBase = seed.plantSeconds || 0;
      if (!tempoBase || !f.sellPrice) return;
      var tempo = tempoBase * mods.fruits.growthMult;
      var ciclos = DIA / tempo;
      var y = 1 + mods.fruits.yieldAdd;
      var custoDia = patches * (ciclos / COLHEITAS_POR_SEMENTE) *
        (seed.price || 0) * mods.fruits.seedCostMult;
      var brutoDia = patches * ciclos * y * f.sellPrice * mods.fruits.coinsMult;
      out.push({
        nome: nome, tempo: tempo, ciclos: ciclos, yield: y,
        bruto: brutoDia, custo: custoDia, liquido: brutoDia - custoDia
      });
    });
    out.sort(function (a, b) { return b.liquido - a.liquido; });
    return out;
  };

  /* ---------------- GREENHOUSE ---------------- */
  App.calcularGreenhouse = function (mods) {
    var out = [];
    var pots = App.state.farm.nodes.ghPots | 0;
    var ghc = SFL_DATA.crops.greenhouseCrops;
    var ghs = SFL_DATA.crops.greenhouseSeeds;
    Object.keys(ghc).forEach(function (nome) {
      var c = ghc[nome];
      if (!c.harvestSeconds || !c.sellPrice) return;
      var gg = mods.gh.grupoGrowth[nome] || 1;
      var tempo = c.harvestSeconds * mods.gh.growthMult * gg;
      var ciclos = DIA / tempo;
      var y = 1 + mods.gh.yieldAdd + (mods.gh.grupoYield[nome] || 0);
      var seed = ghs[nome + " Seed"] || {};
      var brutoDia = pots * ciclos * y * c.sellPrice;
      var custoDia = pots * ciclos * (seed.price || 0) * mods.gh.seedCostMult;
      out.push({
        nome: nome, tempo: tempo, ciclos: ciclos, yield: y,
        bruto: brutoDia, custo: custoDia, liquido: brutoDia - custoDia
      });
    });
    out.sort(function (a, b) { return b.liquido - a.liquido; });
    return out;
  };

  /* ---------------- MINERAIS ---------------- */
  var MINERAIS = [
    { chave: "trees", dominio: "wood", item: "Wood", rec: "TREE_RECOVERY_TIME", rotulo: "Wood" },
    { chave: "stones", dominio: "stone", item: "Stone", rec: "STONE_RECOVERY_TIME", rotulo: "Stone" },
    { chave: "iron", dominio: "iron", item: "Iron", rec: "IRON_RECOVERY_TIME", rotulo: "Iron" },
    { chave: "gold", dominio: "gold", item: "Gold", rec: "GOLD_RECOVERY_TIME", rotulo: "Gold" },
    { chave: "crimstones", dominio: "crimstone", item: "Crimstone", rec: "CRIMSTONE_RECOVERY_TIME", rotulo: "Crimstone" },
    { chave: "oil", dominio: "oil", item: "Oil", rec: "OIL_RESERVE_RECOVERY_TIME", rotulo: "Oil" }
  ];

  var YIELD_BASE = { Wood: 1, Stone: 1, Iron: 1, Gold: 1, Crimstone: 1, Oil: 10 };
  var REC_FALLBACK = { OIL_RESERVE_RECOVERY_TIME: 20 * 3600 };

  App.calcularMinerais = function (mods) {
    var out = [];
    MINERAIS.forEach(function (mdef) {
      var nos = App.state.farm.nodes[mdef.chave] | 0;
      var rec = SFL_DATA.resources.recovery[mdef.rec] || REC_FALLBACK[mdef.rec] || DIA;
      var dm = mods[mdef.dominio];
      var ciclos = DIA / (rec * dm.respawnMult);
      var unidades = nos * ciclos * (YIELD_BASE[mdef.item] + dm.yieldAdd);
      var preco = App.precoP2P(mdef.item);
      out.push({
        nome: mdef.rotulo, item: mdef.item, nos: nos, ciclos: ciclos,
        unidades: unidades, preco: preco, flower: unidades * preco
      });
    });
    return out;
  };

  /* ---------------- ANIMAIS ---------------- */
  var ANIMAIS_DEF = [
    { tipo: "Chicken", chave: "chickens", produto: "Egg", horas: 24 },
    { tipo: "Cow", chave: "cows", produto: "Milk", horas: 24 },
    { tipo: "Sheep", chave: "sheep", produto: "Wool", horas: 24 }
  ];

  App.calcularAnimais = function (mods) {
    var out = [];
    ANIMAIS_DEF.forEach(function (a) {
      var qtd = App.state.farm.nodes[a.chave] | 0;
      var am = mods.animals;
      var ciclosDia = (DIA / (a.horas * 3600 * am.cycleMult));
      var producao = qtd * ciclosDia * (1 + am.produceAdd + am.produceAddPor[a.tipo]);
      var preco = App.precoP2P(a.produto);
      out.push({
        nome: a.tipo, produto: a.produto, qtd: qtd,
        producao: producao, preco: preco, flower: producao * preco
      });
    });
    return out;
  };

  /* ---------------- ESCOLHA ATIVA + TOTAIS ---------------- */
  function escolha(lista, chaveSel) {
    var alvo = App.state.calc[chaveSel];
    if (alvo && alvo !== "auto") {
      for (var i = 0; i < lista.length; i++) if (lista[i].nome === alvo) return lista[i];
    }
    return lista[0] || null;
  }

  /* totais por dia com um dado conjunto de skills */
  App.totaisComSelecao = function (selected) {
    var mods = App.modificadores(selected);
    var crops = App.calcularCrops(mods);
    var frutas = App.calcularFrutas(mods);
    var gh = App.calcularGreenhouse(mods);
    var minerais = App.calcularMinerais(mods);
    var animais = App.calcularAnimais(mods);

    var cropAtivo = escolha(crops, "cropAtivo");
    var frutaAtiva = escolha(frutas, "fruitAtiva");
    var ghAtiva = escolha(gh, "ghAtiva");

    var coinsDia = clamp0(cropAtivo ? cropAtivo.liquido : 0) +
      clamp0(frutaAtiva ? frutaAtiva.liquido : 0) +
      clamp0(ghAtiva ? ghAtiva.liquido : 0);

    var flowerDia = 0;
    minerais.forEach(function (r) { flowerDia += r.flower; });
    animais.forEach(function (r) { flowerDia += r.flower; });

    var taxa = App.state.prices.flowerCoins; // coins por 1 FLOWER
    var flowerTotalDia = flowerDia + (taxa > 0 ? coinsDia / taxa : 0);

    return {
      mods: mods, crops: crops, frutas: frutas, gh: gh,
      minerais: minerais, animais: animais,
      cropAtivo: cropAtivo, frutaAtiva: frutaAtiva, ghAtiva: ghAtiva,
      coinsDia: coinsDia, flowerDia: flowerDia, flowerTotalDia: flowerTotalDia,
      usdDia: flowerTotalDia * (App.state.prices.flowerUsd || 0),
      brlDia: flowerTotalDia * (App.state.prices.flowerBrl || 0)
    };
  };

  App.totais = function () {
    return App.totaisComSelecao(App.state.planner.selected);
  };

  /* delta FLOWER/mês de adicionar (ou remover) uma skill */
  App.deltaDaSkill = function (nome) {
    var sel = App.state.planner.selected;
    var com, sem;
    if (sel[nome]) {
      com = App.totaisComSelecao(sel);
      var copia = {}; Object.keys(sel).forEach(function (k) { if (k !== nome) copia[k] = sel[k]; });
      sem = App.totaisComSelecao(copia);
    } else {
      var copia2 = {}; Object.keys(sel).forEach(function (k) { copia2[k] = sel[k]; });
      copia2[nome] = 1;
      com = App.totaisComSelecao(copia2);
      sem = App.totaisComSelecao(sel);
    }
    return {
      flowerMes: (com.flowerTotalDia - sem.flowerTotalDia) * 30,
      coinsMes: (com.coinsDia - sem.coinsDia) * 30
    };
  };

  /* lista de compras: skills simuláveis ainda não selecionadas, por eficiência */
  App.listaCompras = function () {
    var sel = App.state.planner.selected;
    var out = [];
    Object.keys(SFL_DATA.skills).forEach(function (nome) {
      var s = SFL_DATA.skills[nome];
      if (sel[nome] || s.disabled) return;
      if (!App.skillSimulavel(nome)) return;
      var d = App.deltaDaSkill(nome);
      if (d.flowerMes <= 0 && d.coinsMes <= 0) return;
      var custo = App.custoSkill(nome, 1);
      out.push({
        nome: nome, tree: s.tree, tier: s.tier, custo: custo,
        flowerMes: d.flowerMes, coinsMes: d.coinsMes,
        eficiencia: custo > 0 ? d.flowerMes / custo : d.flowerMes
      });
    });
    out.sort(function (a, b) { return b.eficiencia - a.eficiencia; });
    return out.slice(0, 15);
  };
})();
