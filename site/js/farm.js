/* SFL Planner — lookup da farm: pré-carrega skills, nós, ilha, nível */
window.App = window.App || {};

(function () {
  function contar(obj) { return obj ? Object.keys(obj).length : 0; }

  function contarAnimais(edificio, tipo) {
    if (!edificio || !edificio.animals) return 0;
    var n = 0;
    Object.keys(edificio.animals).forEach(function (k) {
      var a = edificio.animals[k];
      if (a && (a.type === tipo || (!a.type && tipo === "Chicken"))) n++;
    });
    return n;
  }

  App.pesquisarFarm = function () {
    var id = parseInt(document.getElementById("input-farm").value || "0", 10);
    if (!id) return;
    var loader = document.getElementById("farm-loader");
    var resumo = document.getElementById("farm-resumo");
    loader.classList.remove("oculto");
    resumo.textContent = "";

    App.api.farm(id).then(function (d) {
      App._tentouDeNovo = false;
      var farm = d.farm || d;
      var st = App.state.farm;

      App.state.farmId = id;
      st.island = (farm.island && farm.island.type) || "basic";
      st.ascension = (farm.island && farm.island.ascensionLevel) || 0;
      st.season = (farm.season && farm.season.season) || st.season;

      var b = farm.bumpkin || {};
      st.xp = b.experience || 0;
      st.level = App.nivelDoXp(st.xp);
      st.skillsOwned = b.skills || {};

      /* seleção inicial = skills reais da farm */
      App.state.planner.selected = {};
      Object.keys(st.skillsOwned).forEach(function (nome) {
        if (SFL_DATA.skills[nome]) {
          App.state.planner.selected[nome] = st.skillsOwned[nome] || 1;
        }
      });

      st.nodes.plots = contar(farm.crops);
      st.nodes.fruitPatches = contar(farm.fruitPatches);
      st.nodes.trees = contar(farm.trees);
      st.nodes.stones = contar(farm.stones);
      st.nodes.iron = contar(farm.iron);
      st.nodes.gold = contar(farm.gold);
      st.nodes.crimstones = contar(farm.crimstones);
      st.nodes.oil = contar(farm.oilReserves);
      st.nodes.ghPots = farm.greenhouse ? contar(farm.greenhouse.pots) : 0;
      st.nodes.chickens = contarAnimais(farm.henHouse, "Chicken");
      st.nodes.cows = contarAnimais(farm.barn, "Cow");
      st.nodes.sheep = contarAnimais(farm.barn, "Sheep");

      /* NFTs: collectibles colocados (terreno + casa), wearables e buds */
      var col = {};
      [farm.collectibles, farm.home && farm.home.collectibles].forEach(function (fonte) {
        if (!fonte) return;
        Object.keys(fonte).forEach(function (nome) {
          var n = Array.isArray(fonte[nome]) ? fonte[nome].length : 1;
          col[nome] = (col[nome] || 0) + n;
        });
      });
      st.nfts = {
        collectibles: col,
        equipped: (b.equipped && typeof b.equipped === "object") ? b.equipped : {},
        wardrobe: farm.wardrobe || {},
        buds: farm.buds || {}
      };

      /* UI */
      document.getElementById("sel-ilha").value = st.island;
      document.getElementById("sel-estacao").value = st.season;
      document.getElementById("input-nivel").value = st.level;
      document.getElementById("input-xp").value = Math.round(st.xp);
      App.sincronizarInputsNodos();

      var nSkills = Object.keys(App.state.planner.selected).length;
      resumo.textContent = "✓ " + App.t("farm.carregada") + " #" + id + " — " +
        st.island + " · " + App.t("nivel") + " " + st.level + " · " + nSkills + " skills";

      /* nome do dono (best-effort) */
      App.api.landInfo(id).then(function (info) {
        var dono = (info && (info.username || (info.data && info.data.username))) || "";
        if (dono) resumo.textContent += " · 👤 " + dono;
      }).catch(function () {});

      App.save();
      App.renderTudoSkills();
      App.renderNivel();
      App.renderNfts();
      loader.classList.add("oculto");
    }).catch(function (e) {
      /* upstream lento/rate-limit: tenta 1x mais passados 2.5s */
      if (!App._tentouDeNovo) {
        App._tentouDeNovo = true;
        setTimeout(function () { App.pesquisarFarm(); }, 2500);
        return;
      }
      App._tentouDeNovo = false;
      loader.classList.add("oculto");
      resumo.textContent = "✗ " + App.t("farm.erro") + " (" + e.message + ")";
    });
  };
})();
