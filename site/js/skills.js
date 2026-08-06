/* SFL Planner — UI das skills: sub-tabs por árvore, tiers, seleção com gating */
window.App = window.App || {};

(function () {
  var ARVORES = ["Crops", "Fruit Patch", "Greenhouse", "Trees", "Mining", "Animals",
    "Machinery", "Fishing", "Cooking", "Compost", "Bees & Flowers", "Aging"];

  function skillsDaArvore(arvore) {
    return Object.keys(SFL_DATA.skills)
      .map(function (n) { return SFL_DATA.skills[n]; })
      .filter(function (s) { return s.tree === arvore; });
  }

  /* ---------------- sub-tabs ---------------- */
  App.renderSubTabs = function () {
    var el = document.getElementById("sub-tabs-arvores");
    var html = "";
    ARVORES.forEach(function (a) {
      html += '<button class="sub-tab-btn' + (App.state.ui.arvore === a ? " ativo" : "") +
        '" data-arvore="' + a + '">' + App.emojiArvore(a) + " " + a + "</button>";
    });
    html += '<button class="sub-tab-btn' + (App.state.ui.arvore === "__legacy" ? " ativo" : "") +
      '" data-arvore="__legacy">' + App.t("legacy") + "</button>";
    el.innerHTML = html;
    el.querySelectorAll(".sub-tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        App.state.ui.arvore = btn.getAttribute("data-arvore");
        App.save();
        App.renderSubTabs();
        App.renderArvore();
      });
    });
  };

  /* ---------------- células ---------------- */
  function celulaHTML(s) {
    var nome = s.name;
    var rank = App.state.planner.selected[nome] || 0;
    var naFarm = !!App.state.farm.skillsOwned[nome];
    var tierAberto = App.tierDesbloqueado(s.tree);
    var classes = ["skill-celula"];
    var bloqueio = "";

    if (s.disabled) { classes.push("indisponivel"); bloqueio = "disabled"; }
    else if (!App.ilhaSuficiente(s.island)) { classes.push("indisponivel"); bloqueio = "ilha"; }
    else if (rank === 0 && s.tier > tierAberto) { classes.push("trancada"); bloqueio = "tier"; }
    if (rank > 0) classes.push("selecionada");
    if (naFarm) classes.push("na-farm");

    var pips = "";
    var max = s.upgrade ? (s.upgrade.maxLevel || 3) : 1;
    if (max > 1) {
      pips = '<span class="rank-pips">';
      for (var i = 1; i <= max; i++) {
        pips += '<span class="' + (i <= rank ? "cheio" : "") + '"></span>';
      }
      pips += "</span>";
    }

    return '<div class="' + classes.join(" ") + '" data-skill="' + nome.replace(/"/g, "&quot;") +
      '" data-bloqueio="' + bloqueio + '" title="' + nome + '">' +
      App.iconeHTML(nome, 34) + pips +
      (s.power ? '<span class="selo-power">⚡</span>' : "") + "</div>";
  }

  /* ---------------- conteúdo da árvore ---------------- */
  App.renderArvore = function () {
    var el = document.getElementById("conteudo-arvore");
    var arvore = App.state.ui.arvore;

    if (arvore === "__legacy") {
      var html = '<p class="tier-info">' + App.t("legacy") + "</p>" +
        '<div class="grelha-skills">';
      Object.keys(SFL_DATA.skillsLegacy).forEach(function (nome) {
        html += '<div class="skill-celula" data-legacy="' + nome +
          '" title="' + nome + '"><span class="emoji-fallback">📜</span></div>';
      });
      el.innerHTML = html + "</div>";
      return;
    }

    var skills = skillsDaArvore(arvore);
    var tierAberto = App.tierDesbloqueado(arvore);
    var pontosArvore = App.pontosNaArvore(arvore);
    var th = SFL_DATA.tierThresholds[arvore] || {};
    var html = "";

    [1, 2, 3].forEach(function (tier) {
      var doTier = skills.filter(function (s) { return s.tier === tier; });
      if (!doTier.length) return;
      var estado, cls;
      if (tier <= tierAberto) { estado = "✓ " + App.t("desbloqueado"); cls = "desbloqueado"; }
      else {
        var falta = (th[String(tier)] || 0) - pontosArvore;
        estado = "🔒 " + App.t("faltam", { n: falta });
        cls = "trancado";
      }
      html += '<div class="tier-secao"><div class="tier-cab">' +
        '<span class="tier-nome">Tier ' + tier + "</span>" +
        '<span class="tier-info ' + cls + '">' + estado + "</span></div>" +
        '<div class="grelha-skills">' +
        doTier.map(celulaHTML).join("") + "</div></div>";
    });

    el.innerHTML = html;

    el.querySelectorAll(".skill-celula[data-skill]").forEach(function (cel) {
      var nome = cel.getAttribute("data-skill");
      cel.addEventListener("mouseenter", function () { App.mostrarSkill(nome); });
      cel.addEventListener("click", function () { App.cliqueSkill(nome); });
    });
  };

  /* ---------------- clique: ciclar rank com regras do jogo ---------------- */
  App.cliqueSkill = function (nome) {
    var s = SFL_DATA.skills[nome];
    if (!s || s.disabled || !App.ilhaSuficiente(s.island)) return;

    var sel = App.state.planner.selected;
    var rank = sel[nome] || 0;
    var max = s.upgrade ? (s.upgrade.maxLevel || 3) : 1;
    var alvo = rank >= max ? 0 : rank + 1;

    if (alvo > 0) {
      // tier da árvore necessário para o rank alvo
      var tierNecessario = App.tierNecessarioParaRank(nome, alvo);
      if (App.tierDesbloqueado(s.tree) < (alvo === 1 ? s.tier : tierNecessario)) {
        alvo = 0; // trancado: volta a desmarcar
      }
    }

    if (alvo === 0) delete sel[nome];
    else sel[nome] = alvo;

    App.save();
    App.renderTudoSkills();
    App.mostrarSkill(nome);
  };

  /* ---------------- medidor de pontos ---------------- */
  App.renderPontos = function () {
    var disp = App.pontosDisponiveis();
    var el = document.getElementById("pontos-medidor");
    el.innerHTML =
      "<span>" + App.t("nivel") + " <b>" + App.pontosTotais() + "</b></span>" +
      "<span>" + App.t("pontos") + ": <b>" + App.pontosGastos() + "</b> " + App.t("gastos") + "</span>" +
      '<span class="' + (disp < 0 ? "neg" : "") + '"><b>' + disp + "</b> " + App.t("disponiveis") + "</span>";
  };

  App.renderTudoSkills = function () {
    App.renderPontos();
    App.renderArvore();
    if (App.renderCombo) App.renderCombo();
    if (App.renderTabelas) App.renderTabelas();
  };
})();
