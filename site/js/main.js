/* SFL Planner — arranque e ligação de eventos */
window.App = window.App || {};

(function () {
  function ligarTabs(containerSel, btnSel, conteudoSel, atributo, chaveUi) {
    document.querySelectorAll(containerSel + " " + btnSel).forEach(function (btn) {
      if (btn.classList.contains("bloqueado")) return;
      btn.addEventListener("click", function () {
        var alvo = btn.getAttribute(atributo);
        if (!alvo) return;
        document.querySelectorAll(containerSel + " " + btnSel).forEach(function (b) {
          b.classList.toggle("ativo", b === btn);
        });
        document.querySelectorAll(conteudoSel).forEach(function (c) {
          c.classList.toggle("ativo", c.id === alvo);
        });
        if (chaveUi) { App.state.ui[chaveUi] = alvo; App.save(); }
      });
    });
  }

  function boot() {
    App.load();
    App.lang = App.state.lang;
    App.applyStatic();

    document.getElementById("versao-site").textContent =
      "v" + (SFL_DATA.meta.version || "1.0") + " · " + (SFL_DATA.meta.generatedAt || "");
    document.getElementById("rodape-meta").textContent = SFL_DATA.meta.source || "";

    /* idioma */
    var selIdioma = document.getElementById("sel-idioma");
    selIdioma.value = App.lang;
    selIdioma.addEventListener("change", function () {
      App.state.lang = App.lang = selIdioma.value;
      App.save();
      App.applyStatic();
      App.renderTudoSkills();
      App.renderNivel();
    });

    /* tabs */
    ligarTabs("#tabs-principais", ".tab-btn", ".tab-conteudo", "data-tab", "tab");
    ligarTabs("#tabs-calc", ".tab2-btn", ".calc-conteudo", "data-calc", "calcTab");

    /* farm lookup */
    document.getElementById("btn-farm").addEventListener("click", App.pesquisarFarm);
    document.getElementById("input-farm").addEventListener("keydown", function (e) {
      if (e.key === "Enter") App.pesquisarFarm();
    });
    if (App.state.farmId) document.getElementById("input-farm").value = App.state.farmId;

    /* status */
    var selIlha = document.getElementById("sel-ilha");
    selIlha.value = App.state.farm.island;
    selIlha.addEventListener("change", function () {
      App.state.farm.island = selIlha.value;
      App.save(); App.renderTudoSkills();
    });

    var selEstacao = document.getElementById("sel-estacao");
    selEstacao.value = App.state.farm.season;
    selEstacao.addEventListener("change", function () {
      App.state.farm.season = selEstacao.value; App.save();
    });

    var inpNivel = document.getElementById("input-nivel");
    inpNivel.value = App.state.farm.level || "";
    inpNivel.addEventListener("input", function () {
      App.state.farm.level = parseInt(inpNivel.value || "1", 10);
      App.save(); App.renderPontos();
    });

    var inpFlower = document.getElementById("input-flower-coins");
    if (App.state.prices.flowerCoins) inpFlower.value = App.state.prices.flowerCoins;
    inpFlower.addEventListener("input", function () {
      App.state.prices.flowerCoins = parseFloat(inpFlower.value || "0");
      App.save(); App.renderCombo();
    });

    document.getElementById("btn-limpar").addEventListener("click", function () {
      App.state.planner.selected = {};
      Object.keys(App.state.farm.skillsOwned).forEach(function (nome) {
        if (SFL_DATA.skills[nome]) {
          App.state.planner.selected[nome] = App.state.farm.skillsOwned[nome] || 1;
        }
      });
      App.save(); App.renderTudoSkills();
    });

    /* nós principais */
    [["input-plots", "plots"], ["input-fruit-patches", "fruitPatches"],
     ["input-gh-pots", "ghPots"]].forEach(function (par) {
      var inp = document.getElementById(par[0]);
      inp.addEventListener("input", function () {
        App.state.farm.nodes[par[1]] = parseInt(inp.value || "0", 10);
        App.save(); App.renderTabelas(); App.renderCombo();
      });
    });

    /* selects de cultura ativa */
    [["sel-crop-ativo", "cropAtivo"], ["sel-fruit-ativa", "fruitAtiva"],
     ["sel-gh-ativa", "ghAtiva"]].forEach(function (par) {
      var sel = document.getElementById(par[0]);
      sel.addEventListener("change", function () {
        App.state.calc[par[1]] = sel.value;
        App.save(); App.renderCombo(); App.renderTabelas();
      });
    });

    /* accordion + período */
    var acc = document.getElementById("accordion-combo");
    if (App.state.ui.accordion) acc.classList.add("aberto");
    document.getElementById("accordion-btn").addEventListener("click", function () {
      acc.classList.toggle("aberto");
      App.state.ui.accordion = acc.classList.contains("aberto");
      App.save();
    });

    document.querySelectorAll("#seg-periodo button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("#seg-periodo button").forEach(function (b) {
          b.classList.toggle("ativo", b === btn);
        });
        App.state.ui.periodo = btn.getAttribute("data-periodo");
        App.save(); App.renderCombo();
      });
    });

    /* bumpkin level */
    document.getElementById("input-xp").addEventListener("input", App.renderNivel);

    /* restaurar tab ativa */
    if (App.state.ui.tab && App.state.ui.tab !== "tab-skills") {
      var btnTab = document.querySelector('[data-tab="' + App.state.ui.tab + '"]');
      if (btnTab) btnTab.click();
    }
    if (App.state.ui.calcTab && App.state.ui.calcTab !== "calc-crops") {
      var btnCalc = document.querySelector('[data-calc="' + App.state.ui.calcTab + '"]');
      if (btnCalc) btnCalc.click();
    }

    /* primeira renderização */
    App.renderSubTabs();
    App.sincronizarInputsNodos();
    App.renderTudoSkills();
    App.renderNivel();
    App.renderNfts();

    /* dados ao vivo */
    App.iniciarFlowerTicker();
    App.carregarPrecos();

    /* ?farm=1234 no URL pesquisa logo */
    var params = new URLSearchParams(location.search);
    if (params.get("farm")) {
      document.getElementById("input-farm").value = params.get("farm");
      App.pesquisarFarm();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
