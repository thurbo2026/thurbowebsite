/* Telt zoektermen op de site en geeft de meest gezochte terug.
   Opslag: Cloudflare KV-database "thurbo-zoektermen", gekoppeld als ZOEK.
   Er wordt alleen de zoekterm bewaard, niets over de bezoeker. */
const schoon = q => String(q || "").toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
const geldig = q => q.length >= 2 && q.length <= 40 && /^[\p{L}\p{N} .'-]+$/u.test(q);

export async function onRequestGet({ env }) {
  if (!env.ZOEK) return Response.json({ termen: [] });
  const lijst = await env.ZOEK.list({ prefix: "t:", limit: 1000 });
  const termen = lijst.keys
    .map(k => ({ term: k.name.slice(2), n: (k.metadata && k.metadata.n) || 0 }))
    .filter(x => x.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 30);
  return Response.json({ termen }, { headers: { "Cache-Control": "public, max-age=600" } });
}

export async function onRequestPost({ request, env }) {
  if (!env.ZOEK) return new Response(null, { status: 204 });
  let q;
  try { q = schoon((await request.json()).q); } catch { return new Response(null, { status: 400 }); }
  if (!geldig(q)) return new Response(null, { status: 204 });
  const sleutel = "t:" + q;
  const n = (parseInt(await env.ZOEK.get(sleutel), 10) || 0) + 1;
  await env.ZOEK.put(sleutel, String(n), { metadata: { n } });
  return new Response(null, { status: 204 });
}
