# THURBO website

De website van THURBO, de ontwerpstudio van Thorben Contant en Beau Schellevis.

## Wat staat waar

- `index.html` is het ontwerp van de site: lettertypes, raster, menu en filters.
- `content/site.json` bevat alle inhoud: projecten, ander werk, nieuws, de studiotekst en de gebruiksvoorwaarden.
- `img/` bevat alle foto's en tekeningen.
- `.pages.yml` stelt het beheerscherm in.

## Inhoud aanpassen

Log in op https://app.pagescms.org met je GitHub-account en kies deze repository.
Daar voeg je projecten toe, zet je foto's erin of haal je ze weg. Na opslaan staat
de wijziging binnen een minuut op de site.

Tips:
- Link in een tekst: zet het woord tussen blokhaken en het adres erachter tussen haakjes, zoals [LA^ARC](https://www.la-rc.com/).
- Zet foto's op webformaat, rond 2000 pixels aan de lange kant.
- De eerste foto van een project is ook de miniatuur in het overzicht.
- De volgorde in het beheerscherm (slepen) is de volgorde op de site. De eerste 10 projecten met een foto staan ook in de slideshow op de homepage.
- Nieuws staat in drie rijen. Het veld Soort bepaalt de rij: Nieuws, Project en Studio in het midden, Instagram onderaan, de rest (recepten, boeken, kaarten, websites) bovenaan.
- Nieuwe beelden krijgen na het opslaan vanzelf jullie naam en het auteursrecht in de bestandsgegevens.
- Bij "Ontworpen door" bepaal je de letter t, b of tb en het filter op naam.

## Logo

De map `logo/` bevat het woordmerk als PNG: voor Instagram (licht en donker, 1080 × 1080) en los op een transparante achtergrond.

## Online zetten

Cloudflare Pages, gekoppeld aan deze repository. Geen bouwcommando; de map is de root (`/`).
