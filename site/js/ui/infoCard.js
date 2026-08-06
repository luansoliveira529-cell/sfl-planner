/* SFL Planner — cartão de info da skill (direita) */
window.App = window.App || {};

(function () {
  var EMOJI_ARVORE = {
    "Crops": "🌾", "Fruit Patch": "🍎", "Trees": "🌳", "Fishing": "🎣",
    "Animals": "🐄", "Greenhouse": "🏡", "Mining": "⛏️", "Cooking": "🍳",
    "Bees & Flowers": "🐝", "Machinery": "⚙️", "Compost": "♻️", "Aging": "🧀"
  };

  App.emojiArvore = function (tree) { return EMOJI_ARVORE[tree] || "✨"; };

  App.iconeHTML = function (nome, tamanho) {
    var s = SFL_DATA.skills[nome];
    var emoji = App.emojiArvore(s ? s.tree : "");
    var f = SFL_DATA.icons[nome];
    if (f) {
      /* onerror: se o PNG faltar no deploy, cai para o emoji da árvore
         em vez de mostrar imagem partida */
      return '<img class="icone-pixel" src="assets/icons/skills/' + f + '" alt="" width="' +
        (tamanho || 34) + '" height="' + (tamanho || 34) +
        '" onerror="this.outerHTML=\'<span class=&quot;emoji-fallback&quot;>' +
        emoji + '</span>\'">';
    }
    return '<span class="emoji-fallback">' + emoji + "</span>";
  };

  /* formata o efeito de um rank consoante o kind */
  function fmtEfeito(kind, v) {
    function pct(x) { return (x * 100).toFixed(1).replace(/\.0$/, "") + "%"; }
    switch (kind) {
      case "growthMultiplier": return "-" + pct(1 - v) + " ⏱";
      case "timeReduction": return "-" + pct(v) + " ⏱";
      case "additiveYield": return "+" + v + " yield";
      case "flatBonus": return "+" + v;
      case "coinBonus": return "+" + pct(v) + " coins";
      case "costMultiplier": return "-" + pct(1 - v) + " custo";
      case "dropChance": case "chance": return pct(v) + " chance";
      case "stockBonus": return "+" + v + " stock";
      case "cooldown": return (v / 3600000).toFixed(1) + "h cooldown";
      case "dailyLimit": return v + "/dia";
      case "xpBonus": return "+" + pct(v) + " XP";
      case "oilReduction": return "-" + pct(v) + " oil";
      case "multiplier": return "×" + v;
      default: return String(v);
    }
  }

  App.mostrarSkill = function (nome) {
    var s = SFL_DATA.skills[nome];
    if (!s) return;
    document.getElementById("cartao-vazio").classList.add("oculto");
    document.getElementById("cartao-corpo").classList.remove("oculto");

    document.getElementById("cartao-icone").innerHTML = App.iconeHTML(nome, 52);
    document.getElementById("cartao-titulo").textContent = nome;

    var badges = [];
    badges.push('<span class="badge">' + App.t("tier") + " " + s.tier + "</span>");
    badges.push('<span class="badge azul">' + App.emojiArvore(s.tree) + " " + s.tree + "</span>");
    if (s.power) badges.push('<span class="badge azul">' + App.t("power") + "</span>");
    if (App.state.farm.skillsOwned[nome]) {
      badges.push('<span class="badge verde">' + App.t("naFarm") + " · R" +
        App.state.farm.skillsOwned[nome] + "</span>");
    }
    if (!App.skillSimulavel(nome)) {
      badges.push('<span class="badge vermelho">' + App.t("naoSimulado") + "</span>");
    }
    if (s.disabled) badges.push('<span class="badge vermelho">' + App.t("desativada") + "</span>");
    document.getElementById("cartao-badges").innerHTML = badges.join("");

    var desc = App.gameText(s.buffKey);
    if (s.debuffKey) desc += " · ⚠ " + App.gameText(s.debuffKey);
    document.getElementById("cartao-descricao").textContent = desc;

    /* tabela de ranks */
    var ranksHtml = "";
    var e = s.upgrade && s.upgrade.effect;
    var ranks = e && (e.ranks || e.yield || e.buff);
    if (ranks && ranks.length && typeof ranks[0] === "number") {
      var rankAtual = App.state.planner.selected[nome] || 0;
      ranksHtml = "<table><tr><th>" + App.t("rank") + "</th><th>" + App.t("efeito") +
        "</th><th></th></tr>";
      for (var i = 0; i < ranks.length; i++) {
        var req = App.tierNecessarioParaRank(nome, i + 1);
        ranksHtml += '<tr class="' + (rankAtual === i + 1 ? "rank-atual" : "") + '"><td>' +
          "I".repeat(i + 1) + "</td><td>" + fmtEfeito(e.kind, ranks[i]) + "</td><td>" +
          (i > 0 ? App.t("requerTier", { t: req }) : "") + "</td></tr>";
      }
      ranksHtml += "</table>";
    }
    document.getElementById("cartao-ranks").innerHTML = ranksHtml;

    var custos = App.t("custoBase") + ": <b>" + s.points + " " + App.t("pontos").toLowerCase() +
      "</b> · " + App.t("ilhaMin") + ": <b>" + s.island + "</b>";
    if (s.upgrade) {
      custos += "<br>" + App.t("custoRank") + ": <b>" + App.upgradePoints(s.tier) + " " +
        App.t("pontos").toLowerCase() + " + " + s.tier + " " + App.t("shards") + "</b>";
    }
    document.getElementById("cartao-custos").innerHTML = custos;

    /* delta de produção */
    var deltaEl = document.getElementById("cartao-delta");
    if (App.skillSimulavel(nome)) {
      var d = App.deltaDaSkill(nome);
      var partes = [];
      if (Math.abs(d.coinsMes) > 0.01) partes.push(App.fmtNum(d.coinsMes) + " coins" + App.t("porMes"));
      if (Math.abs(d.flowerMes) > 0.0001) partes.push(App.fmtNum(d.flowerMes) + " 🌸" + App.t("porMes"));
      if (partes.length) {
        var pos = d.flowerMes >= 0 && d.coinsMes >= 0;
        deltaEl.className = "cartao-delta" + (pos ? "" : " negativo");
        deltaEl.innerHTML = App.t("ganho") + ": <b>" + (pos ? "+" : "") + partes.join(" · ") + "</b>";
      } else {
        deltaEl.className = "cartao-delta neutro";
        deltaEl.textContent = App.t("semGanho");
      }
    } else {
      deltaEl.className = "cartao-delta neutro";
      deltaEl.textContent = App.t("semGanho");
    }
  };

  App.fmtNum = function (x) {
    if (x === 0) return "0";
    var abs = Math.abs(x);
    if (abs >= 1000000) return (x / 1000000).toFixed(2) + "M";
    if (abs >= 1000) return (x / 1000).toFixed(1) + "k";
    if (abs >= 10) return x.toFixed(1);
    if (abs >= 0.01) return x.toFixed(2);
    return x.toFixed(4);
  };
})();
