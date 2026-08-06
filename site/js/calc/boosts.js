/* SFL Planner — dobra as skills selecionadas num objeto Modifiers */
window.App = window.App || {};

(function () {
  function base() {
    return {
      crops: { growthMult: 1, yieldAdd: 0, coinsMult: 1, seedCostMult: 1,
               grupoYield: { basic: 0, medium: 0, advanced: 0 },
               grupoGrowth: { basic: 1, medium: 1, advanced: 1 } },
      fruits: { growthMult: 1, yieldAdd: 0, coinsMult: 1, seedCostMult: 1 },
      gh: { growthMult: 1, yieldAdd: 0, seedCostMult: 1,
            grupoYield: { Rice: 0, Olive: 0, Grape: 0 },
            grupoGrowth: { Rice: 1, Olive: 1, Grape: 1 } },
      wood: { respawnMult: 1, yieldAdd: 0, toolCostMult: 1 },
      stone: { respawnMult: 1, yieldAdd: 0, toolCostMult: 1 },
      iron: { respawnMult: 1, yieldAdd: 0, toolCostMult: 1 },
      gold: { respawnMult: 1, yieldAdd: 0, toolCostMult: 1 },
      crimstone: { respawnMult: 1, yieldAdd: 0, toolCostMult: 1 },
      oil: { respawnMult: 1, yieldAdd: 0, toolCostMult: 1 },
      animals: { feedCostMult: 1, produceAdd: 0, cycleMult: 1,
                 produceAddPor: { Chicken: 0, Cow: 0, Sheep: 0 } }
    };
  }

  /* selected: {nome: rank} */
  App.modificadores = function (selected) {
    var m = base();
    Object.keys(selected || {}).forEach(function (nome) {
      var rank = selected[nome];
      if (!rank) return;
      var regra = App.regraDaSkill(nome);
      if (!regra) return;
      var s = SFL_DATA.skills[nome];
      var v = App.valorRankDaSkill(s, rank);
      if (v === null || v === undefined) return;
      regra(m, v, s);
    });
    return m;
  };
})();
