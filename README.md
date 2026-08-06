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

## Usar noutro PC (clonar do GitHub)

```
git clone https://github.com/luansoliveira529-cell/sfl-planner.git
cd sfl-planner
copy config.example.json config.local.json
:: edita config.local.json e cola a tua API key
iniciar.bat
```

Requisito único: Python 3 instalado.

## ⚠ O GitHub não corre o site

O GitHub só **guarda o código**. Abrir o site "a partir do GitHub" (Pages ou
ficheiros raw) NÃO funciona por inteiro: o lookup da farm e os preços precisam
de um proxy, que o GitHub não executa. Há dois modos suportados:

- **No teu PC** → `iniciar.bat` (o `server.py` faz de servidor e de proxy).
- **Online** → Netlify (ver abaixo), com a mesma lógica em função serverless.

## ✅ Estado do deploy (verificado a 2026-08-06)

Site: https://legendary-pithivier-53f9ca.netlify.app — a publicar de `main`,
a partir do repositório Git.

| Verificação | Estado |
|---|---|
| `/` | ✅ 200 |
| `/api/sfl/prices` (função serverless) | ✅ 200 com preços reais |
| `/assets/icons/skills/*.png` | ✅ 200 — os 81 ícones estão publicados |
| `/api/farm/<id>` | ❌ 500 — falta a `SFL_API_KEY` |

**Falta só um passo:** criar `SFL_API_KEY` em *Project configuration >
Environment variables* com a API key do jogo (a mesma do `config.local.json`)
e refazer o deploy. Enquanto não existir, a função devolve o erro explícito
`SFL_API_KEY em falta`.

Nota para não repetir um diagnóstico errado: os ícones **nunca** estiveram
partidos. O 404 que se via era o favicon, que apontava para
`green-thumb.png` — um ficheiro que nunca existiu neste projeto (os ícones
reais são `abundant-harvest.png`, `golden-touch.png`, etc.). Já corrigido.
Para testar ícones, usar um nome que exista, não este.

## Pôr online no Netlify

O `netlify.toml` e o `netlify/functions/api.mjs` já estão no repositório. A
função serverless espelha os endpoints do `server.py`, por isso o site é o
mesmo nos dois modos — nada muda no `site/js/api.js`.

1. No Netlify: **Add new site > Import an existing project** e escolhe o repo
   `sfl-planner`. O `netlify.toml` já traz o `publish` e as funções — não é
   preciso configurar build.
2. **Antes do primeiro deploy**, em *Site configuration > Environment
   variables*, cria `SFL_API_KEY` com a tua API key do jogo.
3. Deploy. A partir daí, cada `git push` para `main` republica sozinho.

Se saltares o passo 2, o site abre e o preço do FLOWER funciona, mas o lookup
da farm devolve `SFL_API_KEY em falta`.

| Onde | Chave da API |
|---|---|
| PC local | `config.local.json` (fora do git) |
| Netlify | variável de ambiente `SFL_API_KEY` |

⚠ Um site Netlify é **público**: qualquer pessoa com o URL pode consultar farms
através do teu proxy, e portanto da tua API key (a chave em si nunca é
exposta, mas o consumo conta para ti). O cache da função e o rate limit do
Netlify seguram o uso normal; se te preocupar, mantém o URL só para ti ou
protege o site com password (funcionalidade paga do Netlify).
