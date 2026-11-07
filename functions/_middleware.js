/* Zet per pagina de echte inhoud, titel, beschrijving, deelpreview en gestructureerde gegevens in de HTML.
   Zo kunnen zoekmachines en AI-assistenten de site lezen zonder JavaScript uit te voeren.
   Alles komt uit content/site.json, dus wat jullie in Pages CMS aanpassen staat hier vanzelf ook goed. */

const BASIS = "https://thurbo.nl";
const NAMEN = { Thorben: "Thorben Contant", Beau: "Beau Schellevis" };
const OMSCHRIJVING = "THURBO is de ontwerpstudio van Thorben Contant en Beau Schellevis: architectuur, stedenbouw, studies en eigen werk.";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const slug = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const kaal = s => String(s || "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1").replace(/\s+/g, " ").trim();
const kort = (s, n = 158) => { s = kaal(s); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
const abs = u => !u ? "" : /^https?:/.test(u) ? u : BASIS + (u.startsWith("/") ? u : "/" + u);
/* tekst met [woord](link) en witregels naar eenvoudige HTML */
const rijk = s => esc(s || "")
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>')
  .split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

export function data(d) {
  const projecten = (d.projecten || []).map(p => ({
    ...p, nr: String(p.nummer || ""), door: p.ontworpen_door || [],
    fotos: (p.fotos || []).filter(f => f.beeld), tekeningen: (p.tekeningen || []).filter(f => f.beeld),
  })).map(p => ({ ...p, pad: `/projecten/${p.nr}-${slug(p.titel)}` }));
  const nieuws = (d.nieuws || []).map((n, i) => ({ ...n, beelden: (n.beelden || []).filter(f => f.beeld),
    id: (n.datum || "") + "-" + slug(n.titel || String(i)) })).map(n => ({ ...n, pad: `/nieuws/${n.id}` }))
    .sort((a, b) => String(b.datum || "").localeCompare(String(a.datum || "")));
  return { projecten, nieuws, studio: d.studio || [], slides: (d.slideshow || []).filter(s => s.beeld) };
}

/* contactgegevens en links uit de studio-rijen */
function gegevens(S) {
  const alle = S.studio.map(x => (x.tekst || "") + " " + (x.link || "")).join(" ");
  const mail = wie => (S.studio.filter(x => x.kolom === wie).map(x => x.tekst || "").join(" ").match(/[\w.+-]+@thurbo\.nl/) || [])[0];
  const linkedin = wie => (S.studio.filter(x => x.kolom === wie).map(x => (x.tekst || "") + " " + (x.link || "")).join(" ").match(/https:\/\/[\w.]*linkedin\.com\/in\/[\w-]+/) || [])[0];
  const insta = (alle.match(/https:\/\/(www\.)?instagram\.com\/[\w.]+\/?/) || [])[0];
  const bio = wie => S.studio.find(x => x.kolom === wie && !x.contact);
  return { info: mail("Studio") || "info@thurbo.nl", mail, linkedin, insta, bio };
}

function organisatie(S) {
  const g = gegevens(S);
  const persoon = wie => ({
    "@type": "Person", "@id": `${BASIS}/#${wie.toLowerCase()}`, name: NAMEN[wie], jobTitle: "Ontwerper",
    worksFor: { "@id": `${BASIS}/#studio` }, email: g.mail(wie) ? "mailto:" + g.mail(wie) : undefined,
    sameAs: [g.linkedin(wie)].filter(Boolean), url: `${BASIS}/${wie.toLowerCase()}`,
    description: g.bio(wie) ? kort(g.bio(wie).tekst, 300) : undefined,
  });
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${BASIS}/#studio`, name: "THURBO", alternateName: "Studio THURBO", url: BASIS + "/",
        logo: BASIS + "/icon-512.png", description: OMSCHRIJVING, email: "mailto:" + g.info,
        founder: [{ "@id": `${BASIS}/#thorben` }, { "@id": `${BASIS}/#beau` }],
        sameAs: [g.insta, g.linkedin("Thorben"), g.linkedin("Beau")].filter(Boolean),
        contactPoint: { "@type": "ContactPoint", contactType: "general", email: g.info, availableLanguage: ["nl", "en"] },
        knowsAbout: ["Architectuur", "Stedenbouw", "Maquettes", "Architectuurfotografie"] },
      persoon("Thorben"), persoon("Beau"),
      { "@type": "WebSite", "@id": `${BASIS}/#site`, url: BASIS + "/", name: "THURBO", inLanguage: ["nl", "en"], publisher: { "@id": `${BASIS}/#studio` } },
    ],
  };
}

const feit = (k, v) => v ? `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>` : "";
const beeldHTML = (f, titel) => `<figure><img src="${esc(f.beeld)}" alt="${esc([titel, f.bijschrift].filter(Boolean).join(" – "))}" loading="lazy">${f.bijschrift ? `<figcaption>${esc(f.bijschrift)}</figcaption>` : ""}</figure>`;
const navHTML = `<nav aria-label="Hoofdmenu"><a href="/">THURBO</a> · <a href="/projecten">Projecten</a> · <a href="/studies">Studies</a> · <a href="/nieuws">Nieuws</a> · <a href="/studio">Studio</a> · <a href="/contact">Contact</a></nav>`;

function projectLijst(lijst) {
  return `<ul>${lijst.map(p => `<li><a href="${p.pad}">${esc(p.nr)} ${esc(p.titel)}</a>${p.plaats ? ` – ${esc(p.plaats)}` : ""}${p.jaar ? `, ${esc(p.jaar)}` : ""}${p.categorie ? ` (${esc(p.categorie)})` : ""}${p.door.length ? `, ontwerp: ${esc(p.door.map(n => NAMEN[n] || n).join(" & "))}` : ""}</li>`).join("")}</ul>`;
}

function studioHTML(S, metContact) {
  const kolom = wie => S.studio.filter(x => x.kolom === wie);
  const deel = (wie, contact) => kolom(wie).filter(x => !!x.contact === contact)
    .map(x => `${x.kop && x.kop !== NAMEN[wie] && x.kop !== wie ? `<h3>${esc(x.kop)}</h3>` : ""}${x.link ? `<p><a href="${esc(x.link)}">${esc(x.tekst || x.link)}</a></p>` : rijk(x.tekst)}`).join("");
  return `<h1>Studio</h1>${["Studio", "Thorben", "Beau"].map(w => `<section><h2>${esc(w === "Studio" ? "THURBO" : NAMEN[w])}</h2>${deel(w, false)}</section>`).join("")}
    ${metContact !== false ? `<h2 id="contact">Contact</h2>${["Studio", "Thorben", "Beau"].map(w => `<section><h3>${esc(w === "Studio" ? "THURBO" : NAMEN[w])}</h3>${deel(w, true)}</section>`).join("")}` : ""}`;
}

/* per adres: titel, beschrijving, beeld, inhoud en eventuele extra gestructureerde gegevens */
export function pagina(path, S) {
  path = decodeURI(path).replace(/\/+$/, "") || "/";
  const thuis = S.slides[0]?.beeld || S.projecten[0]?.fotos[0]?.beeld;
  let m;
  if (path === "/") return { titel: "THURBO – ontwerpstudio van Thorben Contant & Beau Schellevis", beschrijving: OMSCHRIJVING, beeld: thuis,
    inhoud: `<h1>THURBO</h1><p>${esc(OMSCHRIJVING)}</p><h2>Projecten</h2>${projectLijst(S.projecten)}${studioHTML(S)}` };
  if (path === "/projecten" || path === "/studies") {
    const st = path === "/studies", lijst = st ? S.projecten.filter(p => p.categorie === "Studie") : S.projecten;
    return { titel: `THURBO – ${st ? "Studies" : "Projecten"}`, beeld: lijst[0]?.fotos[0]?.beeld || thuis,
      beschrijving: `${st ? "Studieprojecten" : "Projecten"} van THURBO: ${lijst.slice(0, 6).map(p => p.titel).join(", ")}.`,
      inhoud: `<h1>${st ? "Studies" : "Projecten"}</h1>${projectLijst(lijst)}`,
      extra: { "@context": "https://schema.org", "@type": "CollectionPage", name: st ? "Studies" : "Projecten", url: BASIS + path,
        hasPart: lijst.map(p => ({ "@type": "CreativeWork", name: p.titel, url: BASIS + p.pad })) } };
  }
  if ((m = path.match(/^\/projecten\/([^/-]+)/))) {
    const p = S.projecten.find(x => x.nr === m[1]); if (!p) return null;
    const beelden = [...p.fotos, ...p.tekeningen];
    const titel = `${p.titel}${p.plaats ? " – " + p.plaats : ""}`;
    return { titel: `THURBO – ${titel}`, canoniek: p.pad, beeld: p.fotos[0]?.beeld || beelden[0]?.beeld, type: "article",
      beschrijving: kort(p.tekst) || `${p.titel}, ${[p.type, p.plaats, p.jaar].filter(Boolean).join(", ")}. Ontwerp door ${p.door.map(n => NAMEN[n]).join(" & ")} (THURBO).`,
      inhoud: `<article><p>THURBO ${esc(p.nr)}</p><h1>${esc(p.titel)}</h1>${p.plaats ? `<p>${esc(p.plaats)}</p>` : ""}${rijk(p.tekst)}
        <dl>${feit("Ontwerp", p.door.map(n => NAMEN[n] || n).join(" & "))}${feit("Categorie", p.categorie)}${feit("Jaar", p.jaar)}${feit("Locatie", p.locatie)}${feit("Opgave", p.opgave)}${feit("Type", p.type)}${feit("Status", p.status)}${feit(p.categorie === "Praktijk" ? "Bureau" : "Begeleiding", p.bureau_of_begeleiding)}${feit("Ontwerpteam", p.ontwerpteam)}</dl>
        ${beelden.map(f => beeldHTML(f, p.titel)).join("")}
        ${p.tekst_en ? `<section lang="en"><h2>${esc(p.titel_en || p.titel)} (English)</h2>${rijk(p.tekst_en)}</section>` : ""}
        <p><a href="/projecten">Alle projecten</a></p></article>`,
      extra: { "@context": "https://schema.org", "@type": "CreativeWork", additionalType: "https://schema.org/ArchitecturalProject",
        name: p.titel, alternateName: p.titel_en || undefined, url: BASIS + p.pad, description: kort(p.tekst, 500) || undefined,
        genre: p.categorie, dateCreated: p.datum || p.jaar || undefined, keywords: [p.type, p.opgave, p.categorie].filter(Boolean).join(", ") || undefined,
        locationCreated: p.locatie || p.plaats ? { "@type": "Place", name: p.locatie || p.plaats,
          geo: p.lat && p.lng ? { "@type": "GeoCoordinates", latitude: +p.lat, longitude: +p.lng } : undefined } : undefined,
        creator: p.door.map(n => ({ "@id": `${BASIS}/#${n.toLowerCase()}` })), publisher: { "@id": `${BASIS}/#studio` },
        image: beelden.map(f => abs(f.beeld)) } };
  }
  if (path === "/studio" || path === "/contact") {
    const g = gegevens(S);
    return { titel: `THURBO – ${path === "/studio" ? "Studio" : "Contact"}`, beeld: thuis,
      beschrijving: path === "/contact" ? `Neem contact op met THURBO via ${g.info}. Thorben Contant en Beau Schellevis.` : kort(S.studio.filter(x => !x.contact).map(x => x.tekst).join(" ")),
      inhoud: studioHTML(S) };
  }
  if (path === "/nieuws") return { titel: "THURBO – Nieuws", beeld: S.nieuws[0]?.beelden[0]?.beeld || thuis,
    beschrijving: "Nieuws van THURBO: projecten, kunst, recepten en fotografie.",
    inhoud: `<h1>Nieuws</h1><ul>${S.nieuws.map(n => `<li><a href="${n.pad}">${esc(n.titel)}</a>${n.datum ? ` (${esc(n.datum)})` : ""}</li>`).join("")}</ul>` };
  if ((m = path.match(/^\/nieuws\/(.+)$/))) {
    const n = S.nieuws.find(x => x.id === m[1]); if (!n) return null;
    return { titel: `THURBO – ${n.titel}`, canoniek: n.pad, beeld: n.beelden[0]?.beeld || thuis, type: "article", beschrijving: kort(n.tekst) || n.titel,
      inhoud: `<article><h1>${esc(n.titel)}</h1>${n.datum ? `<p><time datetime="${esc(n.datum)}">${esc(n.datum)}</time></p>` : ""}${rijk(n.tekst)}${n.beelden.map(f => beeldHTML(f, n.titel)).join("")}</article>`,
      extra: { "@context": "https://schema.org", "@type": "BlogPosting", headline: n.titel, datePublished: n.datum || undefined, url: BASIS + n.pad,
        image: n.beelden.map(f => abs(f.beeld)), author: (n.door || []).map(x => ({ "@id": `${BASIS}/#${x.toLowerCase()}` })), publisher: { "@id": `${BASIS}/#studio` } } };
  }
  if (path === "/zoek") return { titel: "THURBO – Zoeken", beschrijving: "Zoek in de projecten van THURBO.", beeld: thuis, inhoud: `<h1>Zoeken</h1>${projectLijst(S.projecten)}`, noindex: true };
  return null;
}

export function vulIn(html, pg, path) {
  const canon = BASIS + (pg.canoniek || (decodeURI(path).replace(/\/+$/, "") || "/"));
  const beeld = abs(pg.beeld);
  const kop = [
    `<link rel="canonical" href="${esc(canon)}">`,
    pg.noindex ? `<meta name="robots" content="noindex,follow">` : "",
    `<meta property="og:site_name" content="THURBO">`,
    `<meta property="og:type" content="${pg.type || "website"}">`,
    `<meta property="og:title" content="${esc(pg.titel)}">`,
    `<meta property="og:description" content="${esc(pg.beschrijving)}">`,
    `<meta property="og:url" content="${esc(canon)}">`,
    `<meta property="og:locale" content="nl_NL"><meta property="og:locale:alternate" content="en_GB">`,
    beeld ? `<meta property="og:image" content="${esc(beeld)}"><meta name="twitter:image" content="${esc(beeld)}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(pg.titel)}"><meta name="twitter:description" content="${esc(pg.beschrijving)}">`,
    `<link rel="sitemap" type="application/xml" href="/sitemap.xml">`,
    `<script type="application/ld+json">${JSON.stringify(pg.ld).replace(/</g, "\\u003c")}</script>`,
    pg.extra ? `<script type="application/ld+json">${JSON.stringify(pg.extra).replace(/</g, "\\u003c")}</script>` : "",
  ].filter(Boolean).join("\n");
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(pg.titel)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(pg.beschrijving)}">\n${kop}`)
    .replace('<main id="app"></main>', `<main id="app"><div class="ssr">${navHTML}${pg.inhoud}</div></main>`);
}

export function sitemap(S) {
  const vandaag = new Date().toISOString().slice(0, 10);
  const u = (p, d) => `<url><loc>${BASIS}${p}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [u("/", vandaag), u("/projecten", vandaag), u("/studies"), u("/studio"), u("/contact"), u("/nieuws", S.nieuws[0]?.datum),
      ...S.projecten.map(p => u(p.pad)), ...S.nieuws.map(n => u(n.pad, n.datum))].join("\n") + "\n</urlset>\n";
}

/* llms.txt: een korte, leesbare samenvatting van de site voor AI-assistenten (llmstxt.org) */
export function llms(S) {
  const g = gegevens(S);
  const r = [`# THURBO`, ``, `> ${OMSCHRIJVING}`, ``,
    `THURBO is opgericht door ${NAMEN.Thorben} en ${NAMEN.Beau}, beiden architectuurstudenten aan de TU Delft. De site is tweetalig (Nederlands en Engels).`, ``,
    `Contact: ${g.info}${g.insta ? ` · Instagram: ${g.insta}` : ""}`, ``, `## Mensen`, ``];
  for (const w of ["Thorben", "Beau"]) r.push(`- [${NAMEN[w]}](${BASIS}/${w.toLowerCase()}): ${kort(g.bio(w)?.tekst, 400)}${g.mail(w) ? ` E-mail: ${g.mail(w)}.` : ""}${g.linkedin(w) ? ` LinkedIn: ${g.linkedin(w)}` : ""}`);
  r.push(``, `## Projecten`, ``);
  for (const p of S.projecten) r.push(`- [${p.nr} ${p.titel}](${BASIS}${p.pad}): ${[p.plaats, p.jaar, p.categorie, p.type].filter(Boolean).join(", ")}. Ontwerp: ${p.door.map(n => NAMEN[n]).join(" & ")}.${p.tekst ? " " + kort(p.tekst, 300) : ""}`);
  r.push(``, `## Pagina's`, ``, `- [Projecten](${BASIS}/projecten)`, `- [Studies](${BASIS}/studies)`, `- [Studio](${BASIS}/studio)`, `- [Contact](${BASIS}/contact)`, `- [Nieuws](${BASIS}/nieuws)`);
  if (S.nieuws.length) { r.push(``, `## Nieuws`, ``); for (const n of S.nieuws) r.push(`- [${n.titel}](${BASIS}${n.pad})${n.datum ? ` (${n.datum})` : ""}`); }
  r.push(``, `## Optional`, ``, `- [Sitemap](${BASIS}/sitemap.xml)`, `- [Alle inhoud als JSON](${BASIS}/content/site.json)`, ``);
  return r.join("\n");
}

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD" || url.pathname.startsWith("/api/")) return next();
  try {
    const d = await env.ASSETS.fetch(new URL("/content/site.json", url)).then(r => r.json());
    const S = data(d);
    if (url.pathname === "/sitemap.xml") return new Response(sitemap(S), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" } });
    if (url.pathname === "/llms.txt") return new Response(llms(S), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=600" } });
    const pg = pagina(url.pathname, S);
    const basis = await env.ASSETS.fetch(new URL("/", url));
    if (!pg) {
      /* onbekende pagina: de site toont zelf "Perceel 404" */
      const html = (await basis.text()).replace(/<title>[^<]*<\/title>/, "<title>THURBO – Niet gevonden</title>").replace("<head>", '<head>\n<meta name="robots" content="noindex">');
      return new Response(html, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    pg.ld = organisatie(S);
    const html = vulIn(await basis.text(), pg, url.pathname);
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
  } catch (e) {
    return next();
  }
}
