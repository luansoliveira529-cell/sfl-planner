/* SFL Planner — tabs Collectibles / Wearables / Buds: itens da farm carregada */
window.App = window.App || {};

(function () {
  function chip(nome, extra) {
    return '<span class="nft-chip" title="' + nome + '">' + nome +
      (extra ? ' <b>' + extra + "</b>" : "") + "</span>";
  }

  function grelha(itens, fmt) {
    if (!itens || !Object.keys(itens).length) return "";
    return '<div class="grelha-nfts">' +
      Object.keys(itens).sort().map(function (k) { return fmt(k, itens[k]); }).join("") +
      "</div>";
  }

  App.renderNfts = function () {
    var t = App.t;
    var nfts = App.state.farm.nfts || {};
    var vazio = '<p class="tier-info">' + t("nft.vazio") + "</p>";

    /* collectibles: nome -> quantidade colocada */
    var elC = document.getElementById("lista-collectibles");
    var col = nfts.collectibles || {};
    elC.innerHTML = Object.keys(col).length
      ? '<h3 class="titulo-secao">' + t("nft.colocados") + " (" + Object.keys(col).length +
        ")</h3>" + grelha(col, function (nome, qtd) {
          return chip(nome, qtd > 1 ? "×" + qtd : "");
        })
      : vazio;

    /* wearables: equipados + guarda-roupa */
    var elW = document.getElementById("lista-wearables");
    var eq = nfts.equipped || {};
    var ward = nfts.wardrobe || {};
    var htmlW = "";
    if (Object.keys(eq).length) {
      htmlW += '<h3 class="titulo-secao">' + t("nft.equipados") + "</h3>" +
        grelha(eq, function (slot, nome) { return chip(nome, slot); });
    }
    if (Object.keys(ward).length) {
      htmlW += '<h3 class="titulo-secao">' + t("nft.guardaroupa") + " (" +
        Object.keys(ward).length + ")</h3>" +
        grelha(ward, function (nome, qtd) { return chip(nome, qtd > 1 ? "×" + qtd : ""); });
    }
    elW.innerHTML = htmlW || vazio;

    /* buds */
    var elB = document.getElementById("lista-buds");
    var buds = nfts.buds || {};
    elB.innerHTML = Object.keys(buds).length
      ? grelha(buds, function (id, b) {
          var desc = (b && b.type ? b.type : "Bud") +
            (b && b.colour ? " · " + b.colour : "");
          return chip("🌱 #" + id, desc);
        })
      : vazio;
  };
})();
