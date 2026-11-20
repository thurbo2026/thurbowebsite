/* Zet per pagina de echte inhoud, titel, beschrijving, deelpreview en gestructureerde gegevens in de HTML.
   Zo kunnen zoekmachines en AI-assistenten de site lezen zonder JavaScript uit te voeren.
   Alles komt uit content/*.json (één bestand per onderdeel), dus wat jullie in Pages CMS aanpassen staat hier vanzelf ook goed. */

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
  .replace(/^## (.+)$/gm, "\n\n<h3>$1</h3>\n\n")
  .split(/\n{2,}/).filter(p => p.trim()).map(p => p.startsWith("<h3>") ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

/* projectnummer op datum: het oudste project is 01, zonder datum achteraan (zelfde regel als in index.html) */
function datumVan(p) {
  if (p.datum) return String(p.datum);
  const j = String(p.jaar || ""), m = j.match(/(\d{1,2})\.(\d{4})/); if (m) return m[2] + "-" + m[1].padStart(2, "0");
  const y = j.match(/(19|20)\d\d/); return y ? y[0] + "-00" : "";
}
function nummer(P) {
  P.map((p, i) => ({ p, i, d: datumVan(p), oud: parseInt(p.nummer, 10) || 999 }))
    .sort((a, b) => (!a.d) - (!b.d) || (a.d < b.d ? -1 : a.d > b.d ? 1 : 0) || a.oud - b.oud || a.i - b.i)
    .forEach((x, k) => { x.p.nr = String(k + 1).padStart(2, "0"); });
  return P;
}
export const DELEN = ["projecten", "ander-werk", "nieuws", "studio", "voorwaarden", "instellingen"];

export function data(d) {
  const projecten = nummer((d.projecten || []).map(p => ({ ...p })));
  for (const p of projecten) Object.assign(p, {
    door: p.ontworpen_door || [],
    fotos: (p.fotos || []).filter(f => f.beeld), tekeningen: (p.tekeningen || []).filter(f => f.beeld),
    pad: `/projecten/${slug(p.titel)}` });
  const nieuws = [...(d.eigen_artikelen || []), ...(d.nieuwsberichten || []), ...(d.instagram_posts || []), ...(d.nieuws || [])].filter(n => !n.concept).map((n, i) => ({ ...n, beelden: (n.beelden || []).filter(f => f.beeld),
    id: (n.datum || "") + "-" + slug(n.titel || String(i)) })).map(n => ({ ...n, pad: `/nieuws/${n.id}` }))
    .sort((a, b) => String(b.datum || "").localeCompare(String(a.datum || "")));
  /* de slideshow op de homepage: de eerste 10 projecten met een foto, in de volgorde van het beheerscherm */
  const slides = projecten.filter(p => p.fotos[0]).slice(0, 10).map(p => ({ beeld: p.fotos[0].beeld, bijschrift: [p.titel, p.plaats].filter(Boolean).join(", ") }));
  const ander = (d.andere_werken || []).filter(x => x.beeld);
  return { projecten, nieuws, studio: studioRijen(d.studio), slides, ander, voorwaarden: d.voorwaarden || {} };
}

/* Studio en contact staat in het beheerscherm per kolom (THURBO, Thorben, Beau); hier als losse regels */
function studioRijen(st) {
  if (Array.isArray(st)) return st;
  return [["Studio", "thurbo"], ["Thorben", "thorben"], ["Beau", "beau"]].flatMap(([kolom, k]) => {
    const o = (st || {})[k]; if (!o) return [];
    return [{ kolom, contact: false, kop: o.kop || (kolom === "Studio" ? "Studio" : NAMEN[kolom]), kop_en: o.kop_en, foto: o.foto, tekst: o.tekst, tekst_en: o.tekst_en },
      ...(o.regels || []).map(r => ({ ...r, kolom, contact: false })), ...(o.contact || []).map(r => ({ ...r, kolom, contact: true }))];
  });
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
    image: g.bio(wie)?.foto ? abs(g.bio(wie).foto) : undefined,
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

/* Engelse versie onder /en: dezelfde pagina's, met de _en-velden en Engelse labels */
const EN = { "Projecten": "Projects", "Studies": "Studies", "Ander Werk": "Other Work", "Nieuws": "News", "Studio": "Studio", "Contact": "Contact",
  "Alle projecten": "All projects", "Ontwerp": "Design", "Categorie": "Category", "Jaar": "Year", "Locatie": "Location", "Opgave": "Brief", "Type": "Type",
  "Status": "Status", "Bureau": "Office", "Begeleiding": "Tutors", "Ontwerpteam": "Design team", "Gebruiksvoorwaarden": "Terms of use", "Zoeken": "Search",
  "ontwerp": "design", "Studie": "Study", "Praktijk": "Practice", "Hoofdmenu": "Main menu", "Alle rechten voorbehouden.": "All rights reserved.",
  "Projecten van THURBO": "Projects by THURBO", "Studieprojecten van THURBO": "Study projects by THURBO",
  "OMSCHRIJVING": "THURBO is the design studio of Thorben Contant and Beau Schellevis: architecture, urbanism, studies and own work.",
  "TITEL_THUIS": "THURBO – design studio of Thorben Contant & Beau Schellevis",
  "NIEUWS_BESCHR": "News from THURBO: projects, art, recipes and photography.",
  "ANDER_BESCHR": "Other Work by THURBO: photos, collages and models by Thorben Contant and Beau Schellevis.",
  "VOORW_BESCHR": "Copyright and use of the work of Studio THURBO. No reuse without written permission.",
  "ZOEK_BESCHR": "Search the projects of THURBO." };
const NL = { "OMSCHRIJVING": OMSCHRIJVING, "TITEL_THUIS": "THURBO – ontwerpstudio van Thorben Contant & Beau Schellevis",
  "NIEUWS_BESCHR": "Nieuws van THURBO: projecten, kunst, recepten en fotografie.",
  "ANDER_BESCHR": "Ander Werk van THURBO: foto's, collages en maquettes van Thorben Contant en Beau Schellevis.",
  "VOORW_BESCHR": "Auteursrecht en gebruik van het werk van Studio THURBO. Geen hergebruik zonder schriftelijke toestemming.",
  "ZOEK_BESCHR": "Zoek in de projecten van THURBO." };
const woord = taal => s => taal === "en" ? (EN[s] ?? s) : (NL[s] ?? s);
const metTaal = (taal, p) => taal === "en" ? "/en" + (p === "/" ? "" : p) : p;
/* alle velden die een _en-versie hebben vervangen door die versie (leeg _en-veld: Nederlands blijft staan) */
function engels(o) {
  if (Array.isArray(o)) return o.map(engels);
  if (!o || typeof o !== "object") return o;
  const r = {};
  for (const [k, v] of Object.entries(o)) if (!k.endsWith("_en")) r[k] = engels(v);
  for (const [k, v] of Object.entries(o)) if (k.endsWith("_en") && v && String(v).trim()) r[k.slice(0, -3)] = v;
  return r;
}
function inTaal(S, taal) {
  if (taal !== "en") return S;
  const E = engels(S);
  for (const p of E.projecten) p.pad = "/en" + p.pad;
  for (const n of E.nieuws) n.pad = "/en" + n.pad;
  return E;
}

const feit = (k, v) => v ? `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>` : "";
const beeldHTML = (f, titel) => `<figure><img src="${esc(f.beeld)}" alt="${esc([titel, f.bijschrift].filter(Boolean).join(" – "))}" loading="lazy">${f.bijschrift ? `<figcaption>${esc(f.bijschrift)}</figcaption>` : ""}</figure>`;
const navHTML = taal => { const w = woord(taal), P = p => metTaal(taal, p);
  return `<nav aria-label="${w("Hoofdmenu")}"><a href="${P("/")}">THURBO</a> · ${["/projecten:Projecten", "/studies:Studies", "/ander-werk:Ander Werk", "/nieuws:Nieuws", "/studio:Studio", "/contact:Contact"].map(x => { const [p, n] = x.split(":"); return `<a href="${P(p)}">${w(n)}</a>`; }).join(" · ")} · <a href="${taal === "en" ? "/" : "/en"}" hreflang="${taal === "en" ? "nl" : "en"}">${taal === "en" ? "Nederlands" : "English"}</a></nav>`; };
const voetHTML = taal => `<footer><p>© ${new Date().getFullYear()} Studio THURBO — Thorben Contant &amp; Beau Schellevis. ${woord(taal)("Alle rechten voorbehouden.")} <a href="${metTaal(taal, "/voorwaarden")}">${woord(taal)("Gebruiksvoorwaarden")}</a></p></footer>`;

function projectLijst(lijst, w = s => s) {
  return `<ul>${lijst.map(p => `<li><a href="${p.pad}">${esc(p.nr)} ${esc(p.titel)}</a>${p.plaats ? ` – ${esc(p.plaats)}` : ""}${p.jaar ? `, ${esc(p.jaar)}` : ""}${p.categorie ? ` (${esc(w(p.categorie))})` : ""}${p.door.length ? `, ${w("ontwerp")}: ${esc(p.door.map(n => NAMEN[n] || n).join(" & "))}` : ""}</li>`).join("")}</ul>`;
}

function studioHTML(S, metContact, w = s => s) {
  const kolom = wie => S.studio.filter(x => x.kolom === wie);
  const deel = (wie, contact) => kolom(wie).filter(x => !!x.contact === contact)
    .map(x => `${x.kop && x.kop !== NAMEN[wie] && x.kop !== wie ? `<h3>${esc(x.kop)}</h3>` : ""}${x.link ? `<p><a href="${esc(x.link)}">${esc(x.tekst || x.link)}</a></p>` : rijk(x.tekst)}`).join("");
  return `<h1>${w("Studio")}</h1>${["Studio", "Thorben", "Beau"].map(w => `<section><h2>${esc(w === "Studio" ? "THURBO" : NAMEN[w])}</h2>${deel(w, false)}</section>`).join("")}
    ${metContact !== false ? `<h2 id="contact">Contact</h2>${["Studio", "Thorben", "Beau"].map(w => `<section><h3>${esc(w === "Studio" ? "THURBO" : NAMEN[w])}</h3>${deel(w, true)}</section>`).join("")}` : ""}`;
}

/* per adres: titel, beschrijving, beeld, inhoud en eventuele extra gestructureerde gegevens */
export function pagina(path, S, taal = "nl") {
  path = decodeURI(path).replace(/\/+$/, "") || "/";
  S = inTaal(S, taal);
  const w = woord(taal), P = p => metTaal(taal, p), OMSCHRIJVING = w("OMSCHRIJVING");
  const thuis = S.slides[0]?.beeld || S.projecten[0]?.fotos[0]?.beeld;
  let m;
  if (path === "/") return { titel: w("TITEL_THUIS"), beschrijving: OMSCHRIJVING, beeld: thuis,
    inhoud: `<h1>THURBO</h1><p>${esc(OMSCHRIJVING)}</p><h2>${w("Projecten")}</h2>${projectLijst(S.projecten, w)}${studioHTML(S)}` };
  if (path === "/projecten" || path === "/studies") {
    const st = path === "/studies", lijst = st ? S.projecten.filter(p => p.categorie === "Studie") : S.projecten;
    return { titel: `THURBO – ${w(st ? "Studies" : "Projecten")}`, beeld: lijst[0]?.fotos[0]?.beeld || thuis,
      beschrijving: `${w(st ? "Studieprojecten van THURBO" : "Projecten van THURBO")}: ${lijst.slice(0, 6).map(p => p.titel).join(", ")}.`,
      inhoud: `<h1>${w(st ? "Studies" : "Projecten")}</h1>${projectLijst(lijst, w)}`,
      extra: { "@context": "https://schema.org", "@type": "CollectionPage", name: w(st ? "Studies" : "Projecten"), url: BASIS + P(path), inLanguage: taal,
        hasPart: lijst.map(p => ({ "@type": "CreativeWork", name: p.titel, url: BASIS + p.pad })) } };
  }
  if ((m = path.match(/^\/projecten\/([^/]+)/))) {
    /* /projecten/styx; oude adressen met nummer (/projecten/12-styx, /projecten/12) worden doorgestuurd */
    const o = m[1].match(/^(\d+)(?:-(.*))?$/), naam = o ? o[2] : m[1], nr = o ? o[1].padStart(2, "0") : "";
    const p = (naam && S.projecten.find(x => slug(x.titel) === naam)) || (nr && S.projecten.find(x => x.nr === nr)); if (!p) return null;
    const beelden = [...p.fotos, ...p.tekeningen];
    const titel = `${p.titel}${p.plaats ? " – " + p.plaats : ""}`;
    return { titel: `THURBO – ${titel}`, canoniek: p.pad, beeld: p.fotos[0]?.beeld || beelden[0]?.beeld, type: "article",
      beschrijving: kort(p.tekst) || `${p.titel}, ${[p.type, p.plaats, p.jaar].filter(Boolean).join(", ")}. ${w("Ontwerp")}: ${p.door.map(n => NAMEN[n]).join(" & ")} (THURBO).`,
      inhoud: `<article><p>THURBO ${esc(p.nr)}</p><h1>${esc(p.titel)}</h1>${p.plaats ? `<p>${esc(p.plaats)}</p>` : ""}${rijk(p.tekst)}
        <dl>${feit(w("Ontwerp"), p.door.map(n => NAMEN[n] || n).join(" & "))}${feit(w("Categorie"), w(p.categorie))}${feit(w("Jaar"), p.jaar)}${feit(w("Locatie"), p.locatie)}${feit(w("Opgave"), p.opgave)}${feit(w("Type"), p.type)}${feit(w("Status"), p.status)}${feit(w(p.categorie === "Praktijk" ? "Bureau" : "Begeleiding"), p.bureau_of_begeleiding)}${feit(w("Ontwerpteam"), p.ontwerpteam)}</dl>
        ${beelden.map(f => beeldHTML(f, p.titel)).join("")}
        <p><a href="${P("/projecten")}">${w("Alle projecten")}</a></p></article>`,
      extra: { "@context": "https://schema.org", "@type": "CreativeWork", additionalType: "https://schema.org/ArchitecturalProject",
        name: p.titel, url: BASIS + p.pad, inLanguage: taal, description: kort(p.tekst, 500) || undefined,
        genre: p.categorie, dateCreated: p.datum || p.jaar || undefined, keywords: [p.type, p.opgave, p.categorie].filter(Boolean).join(", ") || undefined,
        locationCreated: p.locatie || p.plaats ? { "@type": "Place", name: p.locatie || p.plaats,
          geo: p.lat && p.lng ? { "@type": "GeoCoordinates", latitude: +p.lat, longitude: +p.lng } : undefined } : undefined,
        creator: p.door.map(n => ({ "@id": `${BASIS}/#${n.toLowerCase()}` })), publisher: { "@id": `${BASIS}/#studio` },
        copyrightHolder: { "@id": `${BASIS}/#studio` }, copyrightYear: (String(p.datum || p.jaar || "").match(/(19|20)\d\d/) || [])[0] ? +(String(p.datum || p.jaar).match(/(19|20)\d\d/)[0]) : undefined,
        image: beelden.map(f => abs(f.beeld)) } };
  }
  if (path === "/studio" || path === "/contact") {
    const g = gegevens(S);
    return { titel: `THURBO – ${w(path === "/studio" ? "Studio" : "Contact")}`, beeld: thuis,
      beschrijving: path === "/contact" ? (taal === "en" ? `Contact THURBO at ${g.info}. Thorben Contant and Beau Schellevis.` : `Neem contact op met THURBO via ${g.info}. Thorben Contant en Beau Schellevis.`) : kort(S.studio.filter(x => !x.contact).map(x => x.tekst).join(" ")),
      inhoud: studioHTML(S, true, w) };
  }
  if (path === "/nieuws") return { titel: `THURBO – ${w("Nieuws")}`, beeld: S.nieuws[0]?.beelden[0]?.beeld || thuis,
    beschrijving: w("NIEUWS_BESCHR"),
    inhoud: `<h1>${w("Nieuws")}</h1><ul>${S.nieuws.map(n => `<li><a href="${n.pad}">${esc(n.titel)}</a>${n.datum ? ` (${esc(n.datum)})` : ""}</li>`).join("")}</ul>` };
  if ((m = path.match(/^\/nieuws\/(.+)$/))) {
    const n = S.nieuws.find(x => x.id === m[1]);
    /* Instagram-posts komen pas in de browser binnen: gewoon de pagina geven, niet indexeren */
    if (!n && m[1].startsWith("ig-")) return { titel: `THURBO – ${w("Nieuws")}`, beschrijving: "Instagram – THURBO", inhoud: `<h1>${w("Nieuws")}</h1>`, noindex: true };
    if (!n) return null;
    return { titel: `THURBO – ${n.titel}`, canoniek: n.pad, beeld: n.beelden[0]?.beeld || thuis, type: "article", beschrijving: kort(n.tekst) || n.titel,
      inhoud: `<article><h1>${esc(n.titel)}</h1>${n.datum ? `<p><time datetime="${esc(n.datum)}">${esc(n.datum)}</time></p>` : ""}${rijk(n.tekst)}${n.beelden.map(f => beeldHTML(f, n.titel)).join("")}</article>`,
      extra: { "@context": "https://schema.org", "@type": "BlogPosting", headline: n.titel, datePublished: n.datum || undefined, url: BASIS + n.pad, inLanguage: taal,
        image: n.beelden.map(f => abs(f.beeld)), author: (n.door || []).map(x => ({ "@id": `${BASIS}/#${x.toLowerCase()}` })), publisher: { "@id": `${BASIS}/#studio` } } };
  }
  if (path === "/ander-werk") return { titel: `THURBO – ${w("Ander Werk")}`, beeld: S.ander[0]?.beeld || thuis,
    beschrijving: w("ANDER_BESCHR"),
    inhoud: `<h1>${w("Ander Werk")}</h1>${S.ander.map(x => beeldHTML({ beeld: x.beeld, bijschrift: [x.titel, x.bijschrift, x.jaar].filter(Boolean).join(", ") }, x.titel || w("Ander Werk"))).join("")}`,
    extra: { "@context": "https://schema.org", "@type": "ImageGallery", name: w("Ander Werk"), url: BASIS + P(path),
      image: S.ander.map(x => ({ "@type": "ImageObject", contentUrl: abs(x.beeld), name: x.titel || undefined,
        creditText: "Studio THURBO", copyrightNotice: "© Studio THURBO", creator: { "@id": `${BASIS}/#studio` } })) } };
  if (path === "/voorwaarden") return { titel: `THURBO – ${w("Gebruiksvoorwaarden")}`, beeld: thuis,
    beschrijving: w("VOORW_BESCHR"),
    inhoud: `<h1>${w("Gebruiksvoorwaarden")}</h1>${rijk(S.voorwaarden.tekst)}` };
  if (path === "/zoek") return { titel: `THURBO – ${w("Zoeken")}`, beschrijving: w("ZOEK_BESCHR"), beeld: thuis, inhoud: `<h1>${w("Zoeken")}</h1>${projectLijst(S.projecten, w)}`, noindex: true };
  return null;
}

export function vulIn(html, pg, path, taal = "nl") {
  const kaalPad = decodeURI(path).replace(/^\/en(?=\/|$)/, "").replace(/\/+$/, "") || "/";
  const basisPad = pg.canoniek ? pg.canoniek.replace(/^\/en(?=\/|$)/, "") || "/" : kaalPad;
  const canon = BASIS + metTaal(taal, basisPad);
  const beeld = abs(pg.beeld);
  const kop = [
    `<link rel="canonical" href="${esc(canon)}">`,
    pg.noindex ? `<meta name="robots" content="noindex,follow">` : "",
    `<meta property="og:site_name" content="THURBO">`,
    `<meta property="og:type" content="${pg.type || "website"}">`,
    `<meta property="og:title" content="${esc(pg.titel)}">`,
    `<meta property="og:description" content="${esc(pg.beschrijving)}">`,
    `<meta property="og:url" content="${esc(canon)}">`,
    pg.noindex ? "" : `<link rel="alternate" hreflang="nl" href="${esc(BASIS + basisPad)}"><link rel="alternate" hreflang="en" href="${esc(BASIS + metTaal("en", basisPad))}"><link rel="alternate" hreflang="x-default" href="${esc(BASIS + basisPad)}">`,
    taal === "en" ? `<meta property="og:locale" content="en_GB"><meta property="og:locale:alternate" content="nl_NL">` : `<meta property="og:locale" content="nl_NL"><meta property="og:locale:alternate" content="en_GB">`,
    beeld ? `<meta property="og:image" content="${esc(beeld)}"><meta name="twitter:image" content="${esc(beeld)}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(pg.titel)}"><meta name="twitter:description" content="${esc(pg.beschrijving)}">`,
    `<link rel="sitemap" type="application/xml" href="/sitemap.xml">`,
    `<script type="application/ld+json">${JSON.stringify(pg.ld).replace(/</g, "\\u003c")}</script>`,
    pg.extra ? `<script type="application/ld+json">${JSON.stringify(pg.extra).replace(/</g, "\\u003c")}</script>` : "",
  ].filter(Boolean).join("\n");
  return html
    .replace('<html lang="nl">', `<html lang="${taal}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(pg.titel)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(pg.beschrijving)}">\n${kop}`)
    .replace('<main id="app" tabindex="-1"></main>', `<main id="app" tabindex="-1"><div class="ssr">${navHTML(taal)}${pg.inhoud}${voetHTML(taal)}</div></main>`);
}

export function sitemap(S) {
  const vandaag = new Date().toISOString().slice(0, 10);
  const alt = p => `<xhtml:link rel="alternate" hreflang="nl" href="${BASIS}${p}"/><xhtml:link rel="alternate" hreflang="en" href="${BASIS}${metTaal("en", p)}"/>`;
  const u = (p, d) => ["nl", "en"].map(t => `<url><loc>${BASIS}${metTaal(t, p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}${alt(p)}</url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    [u("/", vandaag), u("/projecten", vandaag), u("/studies"), u("/ander-werk"), u("/studio"), u("/contact"), u("/nieuws", S.nieuws[0]?.datum), u("/voorwaarden"),
      ...S.projecten.map(p => u(p.pad)), ...S.nieuws.map(n => u(n.pad, n.datum))].join("\n") + "\n</urlset>\n";
}

/* llms.txt: een korte, leesbare samenvatting van de site voor AI-assistenten (llmstxt.org) */
export function llms(S) {
  const g = gegevens(S);
  const r = [`# THURBO`, ``, `> ${OMSCHRIJVING}`, ``,
    `THURBO is opgericht door ${NAMEN.Thorben} en ${NAMEN.Beau}, beiden architectuurstudenten aan de TU Delft. De site is tweetalig: Nederlands op ${BASIS}/, Engels op ${BASIS}/en.`, ``,
    `Contact: ${g.info}${g.insta ? ` · Instagram: ${g.insta}` : ""}`, ``, `## Mensen`, ``];
  for (const w of ["Thorben", "Beau"]) r.push(`- [${NAMEN[w]}](${BASIS}/${w.toLowerCase()}): ${kort(g.bio(w)?.tekst, 400)}${g.mail(w) ? ` E-mail: ${g.mail(w)}.` : ""}${g.linkedin(w) ? ` LinkedIn: ${g.linkedin(w)}` : ""}`);
  r.push(``, `## Projecten`, ``);
  for (const p of S.projecten) r.push(`- [${p.nr} ${p.titel}](${BASIS}${p.pad}): ${[p.plaats, p.jaar, p.categorie, p.type].filter(Boolean).join(", ")}. Ontwerp: ${p.door.map(n => NAMEN[n]).join(" & ")}.${p.tekst ? " " + kort(p.tekst, 300) : ""}`);
  r.push(``, `## Pagina's`, ``, `- [Projecten](${BASIS}/projecten)`, `- [Studies](${BASIS}/studies)`, `- [Ander Werk](${BASIS}/ander-werk)`, `- [Studio](${BASIS}/studio)`, `- [Contact](${BASIS}/contact)`, `- [Nieuws](${BASIS}/nieuws)`, `- [Gebruiksvoorwaarden](${BASIS}/voorwaarden)`);
  r.push(``, `Alle beelden en teksten: © Studio THURBO. Hergebruik alleen met schriftelijke toestemming (${g.info}).`);
  if (S.nieuws.length) { r.push(``, `## Nieuws`, ``); for (const n of S.nieuws) r.push(`- [${n.titel}](${BASIS}${n.pad})${n.datum ? ` (${n.datum})` : ""}`); }
  r.push(``, `## Optional`, ``, `- [Sitemap](${BASIS}/sitemap.xml)`, ...DELEN.map(n => `- [Inhoud: ${n} (JSON)](${BASIS}/content/${n}.json)`), ``);
  return r.join("\n");
}

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD" || url.pathname.startsWith("/api/")) return next();
  try {
    const delen = await Promise.all(DELEN.map(n => env.ASSETS.fetch(new URL(`/content/${n}.json`, url)).then(r => r.ok ? r.json() : {}).catch(() => ({}))));
    const d = Object.assign({}, ...delen);
    const S = data(d);
    if (url.pathname === "/sitemap.xml") return new Response(sitemap(S), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" } });
    if (url.pathname === "/llms.txt") return new Response(llms(S), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=600" } });
    const taal = /^\/en(\/|$)/.test(url.pathname) ? "en" : "nl";
    const binnen = taal === "en" ? (url.pathname.slice(3) || "/") : url.pathname;
    const pg = pagina(binnen, S, taal);
    const basis = await env.ASSETS.fetch(new URL("/", url));
    if (!pg) {
      /* onbekende pagina: de site toont zelf "Perceel 404" */
      const html = (await basis.text()).replace(/<title>[^<]*<\/title>/, "<title>THURBO – Niet gevonden</title>").replace("<head>", '<head>\n<meta name="robots" content="noindex">');
      return new Response(html, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    /* oud adres van een project: blijvend doorsturen naar het nieuwe */
    if (pg.canoniek && binnen.startsWith("/projecten/") && decodeURI(url.pathname).replace(/\/+$/, "") !== pg.canoniek)
      return Response.redirect(url.origin + pg.canoniek + url.search, 301);
    pg.ld = organisatie(S);
    const html = vulIn(await basis.text(), pg, url.pathname, taal);
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
  } catch (e) {
    return next();
  }
}
