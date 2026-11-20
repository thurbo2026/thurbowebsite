"""Maakt bijgesneden versies van beelden met een ingevuld veld 'bijsnijden' (code uit thurbo.nl/bijsnijden).

Code: 'links boven rechts onder' in procenten van het originele beeld, bijv. '0 3.5 100 100'.
Het origineel blijft staan; de bijgesneden versie komt in img/bijgesneden/ en de site gebruikt die vanzelf.
De bestandsnaam moet precies hetzelfde zijn als in index.html (functie bijgesneden).
"""
import glob, json, os, re
from PIL import Image, ImageOps

def code(s):
    n = re.findall(r"-?\d+(?:[.,]\d+)?", str(s or ""))
    if len(n) != 4: return None
    v = [min(100.0, max(0.0, round(float(x.replace(",", ".")), 1))) for x in n]
    if v[2] - v[0] < 1 or v[3] - v[1] < 1 or v == [0, 0, 100, 100]: return None
    return v

def naam(beeld, v):
    stam, ext = os.path.splitext(os.path.basename(beeld))
    return f"img/bijgesneden/{stam}_" + "-".join(("%g" % x).replace(".", "p") for x in v) + ext.lower()

def beelden(o):
    if isinstance(o, dict):
        if o.get("beeld") and o.get("bijsnijden"): yield o
        for x in o.values(): yield from beelden(x)
    elif isinstance(o, list):
        for x in o: yield from beelden(x)

os.makedirs("img/bijgesneden", exist_ok=True)
for f in sorted(glob.glob("content/*.json")):
    for b in beelden(json.load(open(f, encoding="utf-8"))):
        v = code(b["bijsnijden"]); src = b["beeld"].lstrip("/")
        if not v or not src.startswith("img/") or not os.path.isfile(src): continue
        uit = naam(src, v)
        if os.path.exists(uit): continue
        im = ImageOps.exif_transpose(Image.open(src)); w, h = im.size
        im = im.crop((round(v[0] / 100 * w), round(v[1] / 100 * h), round(v[2] / 100 * w), round(v[3] / 100 * h)))
        if uit.endswith((".jpg", ".jpeg")): im.convert("RGB").save(uit, "JPEG", quality=92, optimize=True, progressive=True)
        else: im.save(uit)
        print("bijgesneden:", uit, im.size)
