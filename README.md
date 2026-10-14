# Ruimte-indeler

Webapp om een kamer in te delen, met een 2D-plattegrond en een 3D-weergave. Werkt op desktop en mobiel, zonder backend: alles wordt in de browser opgeslagen (localStorage).

## Lokaal starten

Vereist: [Node.js](https://nodejs.org) 20 of nieuwer.

```bash
npm install      # eenmalig
npm run dev      # start op http://localhost:5173
```

Op je telefoon testen (zelfde wifi): `npm run dev -- --host` en open het getoonde netwerkadres.

Overige commando's:

| Commando | Wat het doet |
| --- | --- |
| `npm test` | unit-tests (geometrie, store, undo/redo) |
| `npm run build` | productiebuild in `dist/` |
| `npm run preview` | de productiebuild lokaal bekijken |

## Online zetten

De build (`dist/`) is een statische site en werkt op elk pad (`base: './'`).

- **GitHub Pages**: de workflow `.github/workflows/deploy.yml` bouwt en publiceert bij elke push naar `main`. Zet eenmalig in GitHub *Settings → Pages → Source* op **GitHub Actions**. De site komt op `https://<gebruiker>.github.io/ruimte-indeler/`.
- **Netlify / Vercel / Cloudflare Pages**: koppel de repository, build-commando `npm run build`, publicatiemap `dist`.
- **Handmatig**: `npm run build` en upload de inhoud van `dist/` naar een willekeurige webhost.

Let op: ontwerpen staan in de browser van de gebruiker (localStorage). Een andere browser of apparaat ziet dus andere ontwerpen.

## Bestandsstructuur

```
src/
  types.ts                  Datamodel (alles in hele centimeters)
  data/catalog.ts           Standaardmeubels met realistische maten
  store/
    useStore.ts             Centrale Zustand-store: ruimte, meubels, selectie, undo/redo, ontwerpen
    persistence.ts          Lezen/schrijven van localStorage
    selectors.ts            Afgeleide data (waarschuwingen, geselecteerd item)
  lib/
    geometry.ts             Footprint, overlap, buiten-de-muren, afstanden, snappen, openingen
    units.ts                Omrekenen cm ⇄ m, prijsnotatie
    productLink.ts          Contract voor het later uitlezen van productlinks (nog leeg)
    dnd.ts, color.ts, id.ts Hulpjes
  components/
    Toolbar.tsx             Ontwerpnaam, ongedaan maken/opnieuw, raster, 2D/3D
    ProductPanel.tsx        Bibliotheek (links), klikken of slepen om te plaatsen
    CustomProductDialog.tsx "Eigen product toevoegen"
    RoomPanel.tsx           Maten van de ruimte, deuren en ramen
    Inspector.tsx           Geselecteerd meubel: maten, afstanden, positie, acties
    ProductList.tsx         Geplaatste producten met links en totaalprijs
    DesignsDialog.tsx       Ontwerpen opslaan/openen/hernoemen/verwijderen
    SelectionBar.tsx        Zwevende snelknoppen (handig op mobiel)
    plan2d/FloorPlan2D.tsx  SVG-plattegrond met raster, slepen, zoom/pan/pinch
    view3d/                 React Three Fiber: Scene3D, Walls3D (uitsparingen), Furniture3D
```

## Datamodel in het kort

- **Room**: `width`, `length`, `height` (cm) en `openings` (deur/raam met `wall`, `offset`, `width`, `height`, `sill`).
- **Product**: naam, maten (cm), kleur, optioneel `url` en `priceCents` (eurocenten), plus `dimensionSource` (`catalogus` | `handmatig` | `link`) en `linkImport`-metadata.
- **PlacedItem**: een *kopie* van het product + middelpunt `x`, `y` (cm) + `rotation` (0/90/180/270). Een ontwerp blijft dus kloppen als je een eigen product later verwijdert.
- **Design**: naam + room + items. Undo/redo bewaart snapshots van `{ room, items }`.

2D en 3D lezen allebei uit dezelfde store, dus een wijziging in de ene weergave zie je meteen in de andere.

## Later: maten uit een productlink halen

Al voorbereid, nog niet gebouwd:

1. Implementeer een `ProductLinkImporter` (`src/lib/productLink.ts`) en voeg die toe aan `linkImporters`. Omdat browsers andere sites niet mogen uitlezen (CORS), is waarschijnlijk een kleine serverless functie nodig die de pagina ophaalt.
2. Zet in `CustomProductDialog.tsx` een knop "Maten uit link halen" op de gemarkeerde plek die het formulier vult.
3. Sla het product op met `dimensionSource: 'link'` en vul `linkImport` (bron, tijdstip, ingevulde velden), zodat de gebruiker ziet wat automatisch is overgenomen.

## Bediening

- **2D**: sleep meubels; sleep de achtergrond om te schuiven; scrollen of knijpen om te zoomen. `R` draait, `Delete` verwijdert, pijltjes verschuiven 10 cm (met Shift 1 cm), `Ctrl+Z` / `Ctrl+Y` ongedaan maken / opnieuw.
- **3D**: sleep de achtergrond om te draaien, rechtermuisknop of twee vingers om te schuiven, scroll of knijp om te zoomen. Sleep een meubel om het over de vloer te verplaatsen.
