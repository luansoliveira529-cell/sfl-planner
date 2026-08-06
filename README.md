# 🌻 SFL Planner

Planeador de skills e produção para **Sunflower Land**, com o novo sistema de
skills **Tier 1/2/3 + ranks de upgrade**, ligado ao market do jogo e ao valor
do token **FLOWER em tempo real**. Layout inspirado no sflhub.xyz, código 100%
original. Ferramenta fan-made, não oficial.

## Como usar

1. Duplo clique em **`iniciar.bat`** (precisa de Python 3, já instalado).
2. O browser abre em `http://localhost:8377`.
3. Escreve o número da tua farm e carrega **Pesquisar** — as tuas skills,
   ranks, pontos, plots, ilha e nível são pré-carregados.
   (Também podes usar `http://localhost:8377/?farm=1234`.)
4. Clica nas skills para simular compras (cada clique sobe 1 rank; regras de
   tier/pontos/ilha iguais às do jogo). O cartão à direita mostra a descrição
   oficial, custos e o **ganho estimado em FLOWER/mês**.
5. Abre o **Resultado do Combo** para veres coins/FLOWER/USD/BRL por
   dia/semana/mês, e a lista **"Que skill comprar primeiro?"** ordenada por
   eficiência (ganho ÷ custo em pontos).

## Estrutura

| Pasta / ficheiro | O quê |
|---|---|
| `server.py` + `iniciar.bat` | servidor local + proxy das APIs (a chave nunca chega ao browser) |
| `config.local.json` | **a tua API key** (Settings > Developer Options no jogo) e a porta — não partilhar, está no `.gitignore` |
| `site/` | o site (HTML/CSS/JS puro) |
| `site/data/*.data.js` | dados gerados do código oficial do jogo |
| `tools/extrair_dados.py` | regenera os dados quando o jogo atualizar |
| `tools/baixar_icones.py` | descarrega os ícones das skills |
| `tools/selftest.py` | valida os dados gerados |
| `tools/vendor/` | cópias dos ficheiros oficiais usados na extração |

## Atualizar quando o jogo mudar

```
python tools/extrair_dados.py
python tools/selftest.py
python tools/baixar_icones.py
```

(O `extrair_dados.py` usa os ficheiros em `tools/vendor/`; para ir buscar
versões novas ao GitHub oficial, substitui os ficheiros de `vendor/` pelos de
https://github.com/sunflower-land/sunflower-land e volta a correr.)

## Fontes de dados

- **Código oficial** (open source): skills, tiers, ranks, crops, frutas,
  greenhouse, minerais, animais, níveis, traduções PT-BR/EN.
- **API oficial** `api.sunflower-land.com/community/farms/{id}`: estado da farm
  (requer a tua API key — fica só no `config.local.json`).
- **sfl.world**: preços p2p do market e câmbio FLOWER.
- **CoinGecko** (`flower-2`): preço do FLOWER em USD/BRL, refresh 30 s.

## Limitações conhecidas (v1)

- Skills de Cooking/Fishing/Compost/Bees/Machinery/Aging aparecem e contam
  pontos, mas ainda não entram na simulação de produção (badge "não simulado").
- Farms com ascensão alta podem mostrar pontos disponíveis ligeiramente errados
  (a matemática de ascensão do jogo ainda não está portada) — podes corrigir o
  nível à mão no campo "Nível Bumpkin".
- Custos de ferramentas (picaretas/machados) e Crop Machine ficam para a fase 2,
  tal como Collectibles/Wearables/Buds e a calculadora de expansão de ilha.

## Publicar mais tarde (fase 2)

O site é estático — para pôr online (Netlify/Vercel) basta servir `site/` e
recriar os 2 endpoints do proxy (`/api/farm/*`, `/api/sfl/*`) como funções
serverless, com a API key numa variável de ambiente.
