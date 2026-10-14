/**
 * Datamodel van de ruimte-indeler.
 *
 * Alle maten zijn in hele CENTIMETERS (integers) om afrondingsfouten te voorkomen.
 * Alleen in de interface rekenen we om naar meters.
 *
 * Coördinaten (bovenaanzicht):
 *   x loopt van links (0) naar rechts (room.width)
 *   y loopt van boven/achter (0) naar onder/voor (room.length)
 * In 3D wordt dat: x → x, y → z, hoogte → y.
 */

export type Cm = number;

/** Muren, met de klok mee vanaf de bovenkant van de plattegrond. */
export type WallSide = 'noord' | 'oost' | 'zuid' | 'west';

export interface Opening {
  id: string;
  type: 'deur' | 'raam';
  wall: WallSide;
  /** Afstand vanaf het begin van de muur (noord/zuid: vanaf links, oost/west: vanaf boven) tot de rand van de opening. */
  offset: Cm;
  width: Cm;
  height: Cm;
  /** Hoogte van de onderkant boven de vloer (0 voor deuren). */
  sill: Cm;
}

export interface Room {
  width: Cm;
  length: Cm;
  height: Cm;
  openings: Opening[];
}

/** Waar de maten van een product vandaan komen. 'link' is gereserveerd voor automatisch uitlezen (later). */
export type DimensionSource = 'catalogus' | 'handmatig' | 'link';

/**
 * Productspecificatie. Wordt gebruikt in de bibliotheek én als kopie (snapshot) in elk geplaatst item,
 * zodat een ontwerp blijft kloppen als een eigen product later wordt gewijzigd of verwijderd.
 */
export interface Product {
  id: string;
  name: string;
  category: string;
  width: Cm;
  depth: Cm;
  height: Cm;
  /** CSS-kleur, bijv. "#8b5e3c". */
  color: string;
  /** Optionele productlink (webshop). Nu alleen opgeslagen. */
  url?: string;
  /** Prijs in eurocenten (integer) om afrondingsfouten te voorkomen. */
  priceCents?: number;
  dimensionSource: DimensionSource;
  /**
   * Metadata voor de toekomstige "maten uit link halen"-functie.
   * Bevat bijv. wanneer en van welke link de gegevens zijn uitgelezen.
   */
  linkImport?: {
    importedAt: string;
    sourceUrl: string;
    /** Velden die automatisch zijn ingevuld (zodat de gebruiker ze kan controleren). */
    fields: Array<keyof ProductDetails>;
  };
}

/** Velden die een (toekomstige) link-importer kan invullen. */
export type ProductDetails = Pick<Product, 'name' | 'width' | 'depth' | 'height' | 'color' | 'priceCents'>;

export type Rotation = 0 | 90 | 180 | 270;

export interface PlacedItem {
  id: string;
  product: Product;
  /** Middelpunt in cm. */
  x: Cm;
  y: Cm;
  rotation: Rotation;
}

export interface Design {
  id: string;
  name: string;
  room: Room;
  items: PlacedItem[];
  createdAt: string;
  updatedAt: string;
}

/** Het deel van een ontwerp dat in de undo/redo-geschiedenis zit. */
export interface DesignSnapshot {
  room: Room;
  items: PlacedItem[];
}
