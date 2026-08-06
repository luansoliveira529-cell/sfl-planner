/* SFL Planner — proxy das APIs em Netlify Functions.
 *
 * Espelha os endpoints do server.py para o site funcionar online sem o PC ligado:
 *   /api/farm/<id>          -> api.sunflower-land.com/community/farms/<id>  (x-api-key)
 *   /api/sfl/prices         -> sfl.world/api/v1/prices
 *   /api/sfl/exchange       -> sfl.world/api/v1.1/exchange
 *   /api/sfl/land/<id>      -> sfl.world/api/v1/land/<id>
 *   /api/sfl/landinfo/<id>  -> sfl.world/api/v1/land/info/farm_id/<id>
 *
 * A API key vem da variavel de ambiente SFL_API_KEY do Netlify e nunca chega ao browser.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const FARM_TTL = 60_000;
const PRICES_TTL = 300_000;
const LAND_TTL = 60_000;

// cache em memoria: sobrevive enquanto o container da funcao for reutilizado
const cache = new Map();

function json(status, corpo) {
  return new Response(corpo, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}

async function fetchUpstream(url, headers, ttl) {
  const agora = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expira > agora) return hit;

  let status, corpo;
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
    status = r.status;
    corpo = await r.text();
  } catch (e) {
    status = 502;
    corpo = JSON.stringify({ error: `upstream: ${e.message}` });
  }

  if (status === 200) {
    cache.set(url, { expira: agora + ttl, status, corpo });
  } else if (hit) {
    return hit; // em erro (ex. rate limit), devolve a cache expirada
  }
  return { status, corpo };
}

/* O redirect do netlify.toml pode entregar o pedido como /api/... ou como
   /.netlify/functions/api/... — normaliza para "/farm/123", "/sfl/prices", etc. */
function rota(pathname) {
  return pathname
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "");
}

export default async (req) => {
  const path = rota(new URL(req.url).pathname);

  let m = /^\/farm\/(\d{1,10})$/.exec(path);
  if (m) {
    const key = process.env.SFL_API_KEY;
    if (!key) {
      return json(500, JSON.stringify({
        error: "SFL_API_KEY em falta nas variaveis de ambiente do Netlify",
      }));
    }
    const { status, corpo } = await fetchUpstream(
      `https://api.sunflower-land.com/community/farms/${m[1]}`,
      { "x-api-key": key, "User-Agent": BROWSER_UA },
      FARM_TTL,
    );
    return json(status, corpo);
  }

  if (path === "/sfl/prices") {
    const { status, corpo } = await fetchUpstream(
      "https://sfl.world/api/v1/prices",
      { "User-Agent": BROWSER_UA },
      PRICES_TTL,
    );
    return json(status, corpo);
  }

  if (path === "/sfl/exchange") {
    const { status, corpo } = await fetchUpstream(
      "https://sfl.world/api/v1.1/exchange",
      { "User-Agent": BROWSER_UA },
      PRICES_TTL,
    );
    return json(status, corpo);
  }

  m = /^\/sfl\/land\/(\d{1,10})$/.exec(path);
  if (m) {
    const { status, corpo } = await fetchUpstream(
      `https://sfl.world/api/v1/land/${m[1]}`,
      { "User-Agent": BROWSER_UA },
      LAND_TTL,
    );
    return json(status, corpo);
  }

  m = /^\/sfl\/landinfo\/(\d{1,10})$/.exec(path);
  if (m) {
    const { status, corpo } = await fetchUpstream(
      `https://sfl.world/api/v1/land/info/farm_id/${m[1]}`,
      { "User-Agent": BROWSER_UA },
      LAND_TTL,
    );
    return json(status, corpo);
  }

  return json(404, JSON.stringify({ error: "endpoint desconhecido" }));
};
