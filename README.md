# THURBO website

De website van THURBO, de ontwerpstudio van Thorben Contant en Beau Schellevis.

## Wat staat waar

- `index.html` is het ontwerp van de site: lettertypes, raster, menu en filters.
- `content/` bevat de inhoud, één bestand per onderdeel: `projecten.json`, `ander-werk.json`, `nieuws.json`, `studio.json`, `voorwaarden.json` en `instellingen.json`.
- `img/` bevat alle foto's en tekeningen.
- `.pages.yml` stelt het beheerscherm in.

## Inhoud aanpassen

Ga naar https://thurbo.nl/admin (dat stuurt door naar Pages CMS) en log in. De onderdelen staan daar in dezelfde volgorde als het menu op de site.
Daar voeg je projecten toe, zet je foto's erin of haal je ze weg. Na opslaan staat
de wijziging binnen een minuut op de site.

Tips:
- Link in een tekst: zet het woord tussen blokhaken en het adres erachter tussen haakjes, zoals [LA^ARC](https://www.la-rc.com/).
- Zet foto's op webformaat, rond 2000 pixels aan de lange kant.
- De eerste foto van een project is ook de miniatuur in het overzicht.
- De volgorde in het beheerscherm (slepen) is de volgorde op de site. De eerste 10 projecten met een foto staan ook in de slideshow op de homepage.
- Nieuws staat in drie lijsten, net als de drie rijen op de site: Eigen artikelen, Nieuws en Instagram.
- Projectadressen zijn /projecten/naam-van-het-project. Oude adressen met een nummer sturen vanzelf door.
- Nieuwe beelden krijgen na het opslaan vanzelf jullie naam en het auteursrecht in de bestandsgegevens.
- Bij "Ontworpen door" bepaal je de letter t, b of tb en het filter op naam.
- Het projectnummer gaat vanzelf op datum: het oudste project is 01. Vul dus bij elk project de datum in (jjjj-mm).

## Logo

Het logo is THURBO in Helvetica Neue Medium met een streep eronder. Maak de PNG's op een Mac of iPhone met de logopagina die Claude heeft gemaakt (https://claude.ai/artifact/Vkc5SEUbAHi1bGtQBc8931): die tekent het logo met de echte Helvetica van het apparaat.

## Vertalen

Laat je een veld met EN leeg, dan vult GitHub het na het opslaan vanzelf met een vertaling via DeepL. Daarvoor moet in GitHub onder Settings → Secrets and variables → Actions een secret `DEEPL_KEY` staan (gratis sleutel via deepl.com/pro-api). Een Engelse tekst die je zelf invult, blijft staan.

## Online zetten

Cloudflare Pages, gekoppeld aan deze repository. Geen bouwcommando; de map is de root (`/`).
