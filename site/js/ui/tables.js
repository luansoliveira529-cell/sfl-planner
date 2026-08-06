/* SFL Planner — tabelas das calculadoras + resultado do combo + lista de compras */
window.App = window.App || {};

(function () {
  var MARKET = "https://sunflower-land.com/play/#/marketplace/hot";

  function fmtTempo(seg) {
    if (seg < 3600) return Math.round(seg / 60) + "m";
    if (seg < 86400) return (seg / 3600).toFixed(1).replace(/\.0$/, "") + "h";
    return (seg / 86400).toFixed(1).replace(/\.0$/, "") + "d";
  }

  var F = function (x) { return App.fmtNum(x); };

  /* -------- tabela crops/frutas/greenhouse -------- */
  function tabelaCultura(lista, elId, selId, chaveCalc, nNodes) {
    var t = App.t;
    var html = "";
    if (!nNodes) {
      html = '<p class="tier-info">' + t("semDados") + "</p>";
    }
    html += '<table class="tabela"><tr><th>' + t("cultura") + "</th><th>" + t("tempo") +
      "</th><th>" + t("ciclosDia") + "</th><th>" + t("yield") + "</th><th>" + t("bruto") +
      "</th><th>" + t("custo") + "</th><th>" + t("liquido") + "</th></tr>";
    lista.forEach(function (r, i) {
      html += '<tr class="' + (i === 0 ? "melhor" : "") + '"><td>' + r.nome +
        (i === 0 ? " ⭐" : "") + "</td><td>" + fmtTempo(r.tempo) + "</td><td>" +
        F(r.ciclos) + "</td><td>" + r.yield.toFixed(2) + "</td><td>" + F(r.bruto) +
        "</td><td>" + F(r.custo) + '</td><td class="' + (r.liquido >= 0 ? "pos" : "neg") + '">' +
        F(r.liquido) + "</td></tr>";
    });
    html += "</table>";
    document.getElementById(elId).innerHTML = html;

    /* povoar select da cultura ativa */
    var sel = document.getElementById(selId);
    if (sel && sel.options.length <= 1) {
      lista.slice().sort(function (a, b) { return a.nome < b.nome ? -1 : 1; })
        .forEach(function (r) {
          var op = document.createElement("option");
          op.value = r.nome; op.textContent = r.nome;
          sel.appendChild(op);
        });
      sel.value = App.state.calc[chaveCalc] || "auto";
    }
  }

  /* -------- minerais -------- */
  function tabelaMinerais(lista) {
    var t = App.t;
    var html = '<table class="tabela"><tr><th>' + t("recurso") + "</th><th>" + t("nos") +
      "</th><th>" + t("ciclosDia") + "</th><th>" + t("producaoDia") + "</th><th>" +
      t("precoP2P") + ' 🌸</th><th>' + t("flowerDia") + "</th><th></th></tr>";
    lista.forEach(function (r) {
      html += "<tr><td>" + r.nome + "</td><td>" + r.nos + "</td><td>" + F(r.ciclos) +
        "</td><td>" + F(r.unidades) + "</td><td>" + (r.preco ? F(r.preco) : "—") +
        '</td><td class="pos">' + F(r.flower) + '</td><td><a href="' + MARKET +
        '" target="_blank" rel="noopener">' + t("marketLink") + "</a></td></tr>";
    });
    document.getElementById("tabela-minerals").innerHTML = html + "</table>";
  }

  function tabelaAnimais(lista) {
    var t = App.t;
    var html = '<table class="tabela"><tr><th>' + t("animal") + "</th><th>" + t("quantos") +
      "</th><th>" + t("producao") + "/dia</th><th>" + t("precoP2P") + ' 🌸</th><th>' +
      t("flowerDia") + "</th><th></th></tr>";
    lista.forEach(function (r) {
      html += "<tr><td>" + r.nome + " (" + r.produto + ")</td><td>" + r.qtd + "</td><td>" +
        F(r.producao) + "</td><td>" + (r.preco ? F(r.preco) : "—") +
        '</td><td class="pos">' + F(r.flower) + '</td><td><a href="' + MARKET +
        '" target="_blank" rel="noopener">' + t("marketLink") + "</a></td></tr>";
    });
    document.getElementById("tabela-animals").innerHTML = html + "</table>";
  }

  /* -------- inputs de minerais/animais -------- */
  var CAMPOS_MIN = [
    ["trees", "🌳 Trees"], ["stones", "🪨 Stone"], ["iron", "⚙ Iron"],
    ["gold", "🥇 Gold"], ["crimstones", "🔴 Crimstone"], ["oil", "🛢 Oil"]
  ];
  var CAMPOS_ANI = [["chickens", "🐔 Chickens"], ["cows", "🐄 Cows"], ["sheep", "🐑 Sheep"]];

  function inputsNodos(elId, campos) {
    var el = document.getElementById(elId);
    if (el.children.length) return;
    campos.forEach(function (c) {
      var div = document.createElement("div");
      div.className = "campo";
      div.innerHTML = '<label>' + c[1] + ':</label><input type="number" min="0" data-node="' +
        c[0] + '" value="' + (App.state.farm.nodes[c[0]] || "") + '">';
      el.appendChild(div);
    });
    el.querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        App.state.farm.nodes[inp.getAttribute("data-node")] = parseInt(inp.value || "0", 10);
        App.save();
        App.renderTabelas();
        App.renderCombo();
      });
    });
  }

  App.sincronizarInputsNodos = function () {
    document.querySelectorAll("[data-node]").forEach(function (inp) {
      var v = App.state.farm.nodes[inp.getAttribute("data-node")];
      inp.value = v || "";
    });
    document.getElementById("input-plots").value = App.state.farm.nodes.plots || "";
    document.getElementById("input-fruit-patches").value = App.state.farm.nodes.fruitPatches || "";
    document.getElementById("input-gh-pots").value = App.state.farm.nodes.ghPots || "";
  };

  /* -------- render principal das calculadoras -------- */
  App.renderTabelas = function () {
    inputsNodos("config-minerais", CAMPOS_MIN);
    inputsNodos("config-animais", CAMPOS_ANI);

    var mods = App.modificadores(App.state.planner.selected);
    tabelaCultura(App.calcularCrops(mods), "tabela-crops", "sel-crop-ativo", "cropAtivo",
      App.state.farm.nodes.plots);
    tabelaCultura(App.calcularFrutas(mods), "tabela-fruits", "sel-fruit-ativa", "fruitAtiva",
      App.state.farm.nodes.fruitPatches);
    tabelaCultura(App.calcularGreenhouse(mods), "tabela-greenhouse", "sel-gh-ativa", "ghAtiva",
      App.state.farm.nodes.ghPots);
    tabelaMinerais(App.calcularMinerais(mods));
    tabelaAnimais(App.calcularAnimais(mods));
  };

  /* -------- resultado do combo -------- */
  App.renderCombo = function () {
    var t = App.t;
    var tot = App.totais();
    var mult = { dia: 1, semana: 7, mes: 30 }[App.state.ui.periodo] || 1;
    var sufixo = { dia: t("porDia"), semana: t("porSemana"), mes: t("porMes") }[App.state.ui.periodo];

    function cartaoTotal(rotulo, valor, sub) {
      return '<div class="cartao-total"><div class="rotulo">' + rotulo +
        '</div><div class="valor">' + valor + '</div><div class="subvalor">' + (sub || "") +
        "</div></div>";
    }

    var linhas = [];
    if (tot.cropAtivo) linhas.push(["🌾 " + tot.cropAtivo.nome, tot.cropAtivo.liquido * mult, "coins"]);
    if (tot.frutaAtiva) linhas.push(["🍎 " + tot.frutaAtiva.nome, tot.frutaAtiva.liquido * mult, "coins"]);
    if (tot.ghAtiva) linhas.push(["🏡 " + tot.ghAtiva.nome, tot.ghAtiva.liquido * mult, "coins"]);
    tot.minerais.forEach(function (r) {
      if (r.flower > 0) linhas.push(["⛏️ " + r.nome, r.flower * mult, "🌸"]);
    });
    tot.animais.forEach(function (r) {
      if (r.flower > 0) linhas.push(["🐄 " + r.nome, r.flower * mult, "🌸"]);
    });

    var html = '<div class="combo-totais">' +
      cartaoTotal(t("coins") + sufixo, F(tot.coinsDia * mult), "") +
      cartaoTotal("FLOWER" + sufixo, F(tot.flowerTotalDia * mult) + " 🌸",
        App.state.prices.flowerCoins > 0 ? "" : "(minerais+animais)") +
      cartaoTotal(t("valorUSD"), "$" + F(tot.usdDia * mult), "") +
      cartaoTotal(t("valorBRL"), "R$" + F(tot.brlDia * mult), "") +
      "</div>";

    if (linhas.length) {
      html += '<table class="tabela"><tr><th>' + t("atividade") + "</th><th>" +
        t("totalGeral") + sufixo + "</th></tr>";
      linhas.forEach(function (l) {
        html += "<tr><td>" + l[0] + '</td><td class="pos">' + F(l[1]) + " " + l[2] + "</td></tr>";
      });
      html += "</table>";
    } else {
      html += '<p class="tier-info">' + t("semDados") + "</p>";
    }

    document.getElementById("combo-resultado").innerHTML = html;
    App.renderListaCompras();
  };

  App.renderListaCompras = function () {
    var t = App.t;
    var lista = App.listaCompras();
    var el = document.getElementById("lista-compras");
    if (!lista.length) {
      el.innerHTML = '<p class="tier-info">' + t("semDados") + "</p>";
      return;
    }
    var html = '<p class="tier-info">' + t("comprarPrimeiro") + "</p>" +
      '<table class="tabela"><tr><th>#</th><th>' + t("skill") + "</th><th>" + t("arvore") +
      "</th><th>" + t("tier") + "</th><th>" + t("custoTotal") + "</th><th>" + t("ganhoMes") +
      "</th><th>" + t("eficiencia") + "</th></tr>";
    lista.forEach(function (r, i) {
      html += '<tr class="' + (i === 0 ? "melhor" : "") + '"><td>' + (i + 1) + "</td><td>" +
        r.nome + "</td><td>" + App.emojiArvore(r.tree) + " " + r.tree + "</td><td>" + r.tier +
        "</td><td>" + r.custo + '</td><td class="pos">+' + F(r.flowerMes) +
        " 🌸</td><td><b>" + F(r.eficiencia) + "</b> 🌸/pt</td></tr>";
    });
    el.innerHTML = html + "</table>";
  };

  /* -------- bumpkin level -------- */
  App.renderNivel = function () {
    var t = App.t;
    var xp = parseFloat(document.getElementById("input-xp").value || "0");
    var nivel = App.nivelDoXp(xp);
    var tab = SFL_DATA.levels.experience;
    var prox = tab[String(nivel + 1)];
    var res = t("nivelLabel") + ": <b>" + nivel + "</b><br>" +
      t("pontosSkill") + ": <b>" + nivel + "</b><br>";
    if (prox !== undefined) {
      res += t("xpProximo") + ": <b>" + F(prox - xp) + "</b>";
    }
    document.getElementById("nivel-resultado").innerHTML = res;

    var html = '<table class="tabela"><tr><th>' + t("nivelLabel") + "</th><th>" + t("xpTotal") +
      "</th></tr>";
    for (var n = Math.max(1, nivel - 2); n <= Math.min(200, nivel + 8); n++) {
      if (tab[String(n)] === undefined) break;
      html += '<tr class="' + (n === nivel ? "melhor" : "") + '"><td>' + n + "</td><td>" +
        F(tab[String(n)]) + "</td></tr>";
    }
    document.getElementById("nivel-tabela").innerHTML = html + "</table>";
  };
})();
