/* SFL Planner — i18n (UI própria PT/EN + descrições oficiais do jogo) */
window.App = window.App || {};

(function () {
  var UI = {
    pt: {
      "header.market": "Market do jogo ↗",
      "nav.combo": "Combo Maker",
      "nav.expansao": "Expansão",
      "farm.inserir": "Inserir Farm:",
      "farm.pesquisar": "Pesquisar",
      "farm.offline": "⚠ APIs indisponíveis — modo manual",
      "farm.erro": "Não consegui carregar a farm",
      "farm.carregada": "Farm carregada",
      "tab.nivel": "Bumpkin Level",
      "skills.titulo": "Skills — Tier 1 · 2 · 3",
      "nivel.titulo": "Bumpkin Level",
      "nivel.xp": "XP atual:",
      "cartao.dica": "Passa o rato ou clica numa skill para ver os detalhes",
      "status.ilha": "Tipo de Ilha:",
      "status.estacao": "Estação:",
      "status.nivel": "Nível Bumpkin:",
      "status.flowerCoins": "Coins por 1 FLOWER:",
      "status.limpar": "Limpar seleção",
      "estacao.primavera": "Primavera",
      "estacao.verao": "Verão",
      "estacao.outono": "Outono",
      "estacao.inverno": "Inverno",
      "combo.titulo": "Resultado do Combo Completo",
      "combo.ver": "Visualizar:",
      "combo.dia": "Dia", "combo.semana": "Semana", "combo.mes": "Mês",
      "combo.lista": "🛒 Que skill comprar primeiro? (ganho ÷ custo)",
      "calc.frutas": "Frutas", "calc.minerais": "Minerais", "calc.animais": "Animais",
      "calc.plots": "Qtd. de Crop Plots:",
      "calc.patches": "Qtd. de Fruit Patches:",
      "calc.pots": "Qtd. de Pots:",
      "calc.cropAtivo": "Crop para o combo:",
      "calc.frutaAtiva": "Fruta para o combo:",
      "calc.ghAtiva": "Cultura para o combo:",
      "rodape.fan": "Ferramenta fan-made, não oficial. Dados extraídos do código open-source do Sunflower Land.",
      pontos: "Pontos", disponiveis: "disponíveis", gastos: "gastos", nivel: "Nível",
      tier: "Tier", arvore: "Árvore", naFarm: "✓ Na farm", naoSimulado: "não simulado",
      power: "⚡ Power", desativada: "desativada",
      desbloqueado: "desbloqueado", faltam: "faltam {n} pontos nesta árvore",
      gastarPontos: "gasta {n} pontos na árvore para desbloquear",
      rank: "Rank", efeito: "Efeito", custoBase: "Custo base", custoRank: "Cada rank-up",
      shards: "shards", requerTier: "requer Tier {t} da árvore",
      ilhaMin: "Ilha mínima", ganho: "Ganho estimado", semGanho: "Sem impacto direto na produção simulada",
      porDia: "/dia", porSemana: "/semana", porMes: "/mês",
      atividade: "Atividade", coins: "Coins", flower: "FLOWER",
      cultura: "Cultura", ciclosDia: "Ciclos/dia", yield: "Yield", tempo: "Tempo",
      bruto: "Bruto", custo: "Custo", liquido: "Líquido (coins)",
      recurso: "Recurso", nos: "Nós", producaoDia: "Produção/dia", precoP2P: "Preço p2p",
      flowerDia: "FLOWER/dia", animal: "Animal", quantos: "Qtd.",
      producao: "Produção", racao: "Ração/dia (coins)", custoFerr: "Ferramentas/dia (coins)",
      "nft.aviso": "Itens da tua farm (boosts destes itens entram na simulação numa próxima fase)",
      "nft.vazio": "Pesquisa a tua farm primeiro para veres os itens",
      "nft.equipados": "Equipados no Bumpkin", "nft.guardaroupa": "Guarda-roupa",
      "nft.colocados": "Colocados na farm",
      skill: "Skill", custoTotal: "Custo (pts)", ganhoMes: "Ganho FLOWER/mês", eficiencia: "Eficiência",
      totalGeral: "Total", valorUSD: "Valor USD", valorBRL: "Valor BRL",
      xpProximo: "XP p/ próximo nível", pontosSkill: "Pontos de skill",
      nivelLabel: "Nível", xpTotal: "XP total",
      semDados: "Preenche os plots/nós para veres resultados",
      deltaFarm: "Δ vs farm atual",
      legacy: "Legacy (antigas)",
      melhorEscolha: "melhor",
      comprarPrimeiro: "Compra primeiro as do topo — mais FLOWER por ponto gasto",
      marketLink: "market ↗"
    },
    en: {
      "header.market": "In-game Market ↗",
      "nav.combo": "Combo Maker",
      "nav.expansao": "Expansion",
      "farm.inserir": "Enter Farm:",
      "farm.pesquisar": "Search",
      "farm.offline": "⚠ APIs unavailable — manual mode",
      "farm.erro": "Could not load farm",
      "farm.carregada": "Farm loaded",
      "tab.nivel": "Bumpkin Level",
      "skills.titulo": "Skills — Tier 1 · 2 · 3",
      "nivel.titulo": "Bumpkin Level",
      "nivel.xp": "Current XP:",
      "cartao.dica": "Hover or click a skill to see details",
      "status.ilha": "Island type:",
      "status.estacao": "Season:",
      "status.nivel": "Bumpkin level:",
      "status.flowerCoins": "Coins per 1 FLOWER:",
      "status.limpar": "Clear selection",
      "estacao.primavera": "Spring",
      "estacao.verao": "Summer",
      "estacao.outono": "Autumn",
      "estacao.inverno": "Winter",
      "combo.titulo": "Full Combo Result",
      "combo.ver": "View:",
      "combo.dia": "Day", "combo.semana": "Week", "combo.mes": "Month",
      "combo.lista": "🛒 Which skill to buy first? (gain ÷ cost)",
      "calc.frutas": "Fruits", "calc.minerais": "Minerals", "calc.animais": "Animals",
      "calc.plots": "Crop Plots:",
      "calc.patches": "Fruit Patches:",
      "calc.pots": "Pots:",
      "calc.cropAtivo": "Crop for the combo:",
      "calc.frutaAtiva": "Fruit for the combo:",
      "calc.ghAtiva": "Crop for the combo:",
      "rodape.fan": "Fan-made tool, not official. Data extracted from Sunflower Land's open-source code.",
      pontos: "Points", disponiveis: "available", gastos: "spent", nivel: "Level",
      tier: "Tier", arvore: "Tree", naFarm: "✓ On farm", naoSimulado: "not simulated",
      power: "⚡ Power", desativada: "disabled",
      desbloqueado: "unlocked", faltam: "{n} more points needed in this tree",
      gastarPontos: "spend {n} points in this tree to unlock",
      rank: "Rank", efeito: "Effect", custoBase: "Base cost", custoRank: "Each rank-up",
      shards: "shards", requerTier: "requires tree Tier {t}",
      ilhaMin: "Min island", ganho: "Estimated gain", semGanho: "No direct impact on simulated production",
      porDia: "/day", porSemana: "/week", porMes: "/month",
      atividade: "Activity", coins: "Coins", flower: "FLOWER",
      cultura: "Crop", ciclosDia: "Cycles/day", yield: "Yield", tempo: "Time",
      bruto: "Gross", custo: "Cost", liquido: "Net (coins)",
      recurso: "Resource", nos: "Nodes", producaoDia: "Production/day", precoP2P: "P2P price",
      flowerDia: "FLOWER/day", animal: "Animal", quantos: "Count",
      producao: "Produce", racao: "Feed/day (coins)", custoFerr: "Tools/day (coins)",
      "nft.aviso": "Your farm's items (their boosts join the simulation in a later phase)",
      "nft.vazio": "Search your farm first to see the items",
      "nft.equipados": "Equipped on Bumpkin", "nft.guardaroupa": "Wardrobe",
      "nft.colocados": "Placed on farm",
      skill: "Skill", custoTotal: "Cost (pts)", ganhoMes: "FLOWER gain/month", eficiencia: "Efficiency",
      totalGeral: "Total", valorUSD: "USD value", valorBRL: "BRL value",
      xpProximo: "XP to next level", pontosSkill: "Skill points",
      nivelLabel: "Level", xpTotal: "Total XP",
      semDados: "Fill in your plots/nodes to see results",
      deltaFarm: "Δ vs current farm",
      legacy: "Legacy (old)",
      melhorEscolha: "best",
      comprarPrimeiro: "Buy the top ones first — most FLOWER per point spent",
      marketLink: "market ↗"
    }
  };

  App.lang = "pt";

  App.t = function (key, subs) {
    var s = (UI[App.lang] && UI[App.lang][key]) || UI.pt[key] || key;
    if (subs) Object.keys(subs).forEach(function (k) {
      s = s.replace("{" + k + "}", subs[k]);
    });
    return s;
  };

  /* descrição oficial do jogo (chave i18n extraída) */
  App.gameText = function (key) {
    if (!key) return "";
    var dict = SFL_DATA.i18nGame[App.lang === "pt" ? "pt" : "en"] || {};
    return dict[key] || (SFL_DATA.i18nGame.en || {})[key] || key;
  };

  App.applyStatic = function () {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = App.t(el.getAttribute("data-i18n"));
    });
    document.documentElement.lang = App.lang === "pt" ? "pt-BR" : "en";
  };
})();
