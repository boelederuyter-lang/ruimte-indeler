import type { ProductDetails } from '../types';

/**
 * VOORBEREIDING VOOR LATER — nog niet geïmplementeerd.
 *
 * Een toekomstige functie kan op basis van een productlink de afmetingen (en evt. naam, prijs)
 * ophalen. Omdat de app geen backend heeft, zal dat waarschijnlijk via een kleine serverless
 * functie / proxy moeten (CORS). Het contract hieronder staat al vast, zodat de rest van de app
 * (formulier, datamodel met `dimensionSource: 'link'` en `linkImport`) niet hoeft te veranderen.
 *
 * Gebruik later:
 *   const importer = linkImporters.find((i) => i.canHandle(url));
 *   const details = await importer?.fetchDetails(url);
 *   // vul het formulier met `details`, zet dimensionSource = 'link'
 */
export interface ProductLinkImporter {
  /** Naam voor in de interface, bijv. "IKEA". */
  name: string;
  canHandle(url: string): boolean;
  fetchDetails(url: string): Promise<Partial<ProductDetails>>;
}

/** Lijst van beschikbare importers. Bewust leeg: de functie wordt later gebouwd. */
export const linkImporters: ProductLinkImporter[] = [];

/** Controleert of een string een geldige http(s)-link is. */
export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
