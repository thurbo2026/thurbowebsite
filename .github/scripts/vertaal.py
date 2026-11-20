"""Vult lege Engelse velden (..._en) in content/*.json automatisch met een vertaling via DeepL.

- Alleen als de GitHub-secret DEEPL_KEY is ingesteld; anders doet dit niets.
- Een Engels veld dat jullie zelf hebben ingevuld blijft staan.
- Pas je later de Nederlandse tekst aan en stond er nog een automatische vertaling, dan wordt die vernieuwd.
  Welke vertalingen automatisch zijn, staat in .github/scripts/vertalingen.json.
"""
import hashlib, html, json, os, re, sys, urllib.request

VELDEN = {"titel", "plaats", "locatie", "opgave", "type", "status", "tekst", "bijschrift", "kop"}
CACHE = ".github/scripts/vertalingen.json"
KEY = os.environ.get("DEEPL_KEY", "").strip()
if not KEY:
    print("Geen DEEPL_KEY ingesteld: niets vertaald."); sys.exit(0)
API = "https://api-free.deepl.com/v2/translate" if KEY.endswith(":fx") else "https://api.deepl.com/v2/translate"

if "--gebruik" in sys.argv:
    # verbruik deze maand; boven 80% faalt deze stap, zodat GitHub jullie een mail stuurt
    req = urllib.request.Request(API.replace("/translate", "/usage"), headers={"Authorization": f"DeepL-Auth-Key {KEY}"})
    u = json.load(urllib.request.urlopen(req, timeout=30))
    n, m = u.get("character_count", 0), u.get("character_limit", 0) or 1
    print(f"DeepL deze maand: {n:,} van {m:,} tekens ({n / m:.0%}).".replace(",", "."))
    if n / m >= 0.8:
        print(f"::error::Let op: DeepL is voor {n / m:.0%} op deze maand. Boven de limiet stopt het vertalen tot volgende maand (er wordt niets betaald).")
        sys.exit(1)
    sys.exit(0)

h = lambda s: hashlib.sha1(s.encode()).hexdigest()[:16]
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}   # hash van NL -> automatische EN
auto = set(cache.values())

LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
def naar_xml(s):  # [woord](adres) en regeleinden heel houden
    s = html.escape(s, quote=False)
    s = LINK.sub(lambda m: f'<a href="{html.escape(m.group(2))}">{m.group(1)}</a>', s)
    return s.replace("\n", "<br/>")
def van_xml(s):
    s = re.sub(r'<a href="([^"]*)">(.*?)</a>', lambda m: f"[{m.group(2)}]({html.unescape(m.group(1))})", s)
    return html.unescape(s.replace("<br/>", "\n").replace("<br />", "\n"))

def vertaal(teksten):
    uit = []
    for i in range(0, len(teksten), 40):
        body = json.dumps({"text": [naar_xml(t) for t in teksten[i:i+40]], "source_lang": "NL", "target_lang": "EN-GB",
                           "tag_handling": "xml", "ignore_tags": ["x"], "preserve_formatting": True}).encode()
        req = urllib.request.Request(API, data=body, headers={"Authorization": f"DeepL-Auth-Key {KEY}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            uit += [van_xml(x["text"]) for x in json.load(r)["translations"]]
    return uit

def langs(o, taken):
    if isinstance(o, list):
        for x in o: langs(x, taken)
    elif isinstance(o, dict):
        for k in list(o):
            v = o[k]
            if k in VELDEN and isinstance(v, str) and v.strip():
                en = o.get(k + "_en") or ""
                if not en.strip() or (en in auto and cache.get(h(v)) != en):
                    taken.append((o, k))
            if isinstance(v, (dict, list)): langs(v, taken)

bestanden = sorted(f for f in os.listdir("content") if f.endswith(".json"))
data = {f: json.load(open(os.path.join("content", f))) for f in bestanden}
taken = []
for d in data.values(): langs(d, taken)
nieuw = [o[k] for o, k in taken if h(o[k]) not in cache]
if nieuw:
    uniek = list(dict.fromkeys(nieuw))
    for nl, en in zip(uniek, vertaal(uniek)): cache[h(nl)] = en
for o, k in taken: o[k + "_en"] = cache[h(o[k])]
for f, d in data.items():
    with open(os.path.join("content", f), "w") as fh:
        json.dump(d, fh, ensure_ascii=False, indent=2); fh.write("\n")
json.dump(cache, open(CACHE, "w"), ensure_ascii=False, indent=1)
print(f"{len(taken)} Engelse velden ingevuld, waarvan {len(set(nieuw))} nieuwe vertalingen.")
