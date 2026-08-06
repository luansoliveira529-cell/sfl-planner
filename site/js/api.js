/* SFL Planner — APIs: farm oficial (via proxy), sfl.world (via proxy), CoinGecko direto */
window.App = window.App || {};

(function () {
  var COINGECKO = "https://api.coingecko.com/api/v3/simple/price?ids=flower-2&vs_currencies=usd,brl";
  var cacheFarm = {};   // id -> {t, dados}

  function getJSON(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var ctl = new AbortController();
      var timer = setTimeout(function () { ctl.abort(); }, timeoutMs || 25000);
      fetch(url, { signal: ctl.signal })
        .then(function (r) {
          clearTimeout(timer);
          if (!r.ok) return reject(new Error("HTTP " + r.status));
          return r.json().then(resolve, reject);
        })
        .catch(function (e) { clearTimeout(timer); reject(e); });
    });
  }

  App.api = {
    online: false,

    farm: function (id) {
      var hit = cacheFarm[id];
      if (hit && Date.now() - hit.t < 10 * 60 * 1000) return Promise.resolve(hit.dados);
      return getJSON("/api/farm/" + id).then(function (d) {
        cacheFarm[id] = { t: Date.now(), dados: d };
        return d;
      });
    },

    landInfo: function (id) { return getJSON("/api/sfl/landinfo/" + id); },
    land: function (id) { return getJSON("/api/sfl/land/" + id); },
    prices: function () { return getJSON("/api/sfl/prices"); },
    exchange: function () { return getJSON("/api/sfl/exchange"); },

    coingecko: function () { return getJSON(COINGECKO, 15000); }
  };

  /* ---------------- FLOWER em tempo real ---------------- */

  function pintarFlower(usd, brl, vivo) {
    var elU = document.getElementById("flower-usd");
    var elB = document.getElementById("flower-brl");
    var dot = document.getElementById("flower-dot");
    if (usd) {
      App.state.prices.flowerUsd = usd;
      elU.textContent = "$" + usd.toFixed(4);
    }
    if (brl) {
      App.state.prices.flowerBrl = brl;
      elB.textContent = "R$" + brl.toFixed(3);
    }
    dot.classList.toggle("vivo", !!vivo);
    if (App.renderCombo) App.renderCombo();
  }

  function atualizarFlower() {
    App.api.coingecko().then(function (d) {
      var f = d["flower-2"] || {};
      pintarFlower(f.usd, f.brl, true);
    }).catch(function () {
      // fallback: sfl.world exchange via proxy
      App.api.exchange().then(function (d) {
        var s = d.sfl || {};
        pintarFlower(s.usd, s.brl, true);
      }).catch(function () { pintarFlower(0, 0, false); });
    });
  }

  App.iniciarFlowerTicker = function () {
    atualizarFlower();
    setInterval(atualizarFlower, 30000);
  };

  /* ---------------- preços p2p ---------------- */

  App.carregarPrecos = function () {
    return App.api.prices().then(function (d) {
      // formato sfl.world: {data:{p2p:{item:preco}}} ou variantes — normaliza
      var p2p = (d && d.data && (d.data.p2p || d.data)) || d.p2p || d || {};
      App.state.prices.p2p = p2p;
      App.api.online = true;
      document.getElementById("aviso-offline").classList.add("oculto");
      if (App.renderTabelas) App.renderTabelas();
    }).catch(function () {
      App.api.online = false;
      document.getElementById("aviso-offline").classList.remove("oculto");
    });
  };

  /* preço p2p em FLOWER por unidade de um item (tolerante ao formato) */
  App.precoP2P = function (item) {
    var p = App.state.prices.p2p;
    if (!p) return 0;
    var v = p[item];
    if (v === undefined && p[item && item.toLowerCase ? item.toLowerCase() : item] !== undefined) {
      v = p[item.toLowerCase()];
    }
    if (v === undefined) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "object") return v.p2p || v.price || v.usd || 0;
    return 0;
  };
})();
