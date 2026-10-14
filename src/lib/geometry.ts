import type { Cm, Opening, PlacedItem, Product, Room, Rotation, WallSide } from '../types';

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const GRID_CM = 10;

/** Breedte/diepte zoals het item op de plattegrond ligt (na draaiing). */
export function footprint(product: Pick<Product, 'width' | 'depth'>, rotation: Rotation): { w: Cm; d: Cm } {
  return rotation === 90 || rotation === 270
    ? { w: product.depth, d: product.width }
    : { w: product.width, d: product.depth };
}

export function itemRect(item: Pick<PlacedItem, 'product' | 'x' | 'y' | 'rotation'>): Rect {
  const { w, d } = footprint(item.product, item.rotation);
  return { x0: item.x - w / 2, y0: item.y - d / 2, x1: item.x + w / 2, y1: item.y + d / 2 };
}

/** Echte overlap (elkaar alleen raken telt niet). */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

export function isOutsideRoom(r: Rect, room: Pick<Room, 'width' | 'length'>): boolean {
  return r.x0 < 0 || r.y0 < 0 || r.x1 > room.width || r.y1 > room.length;
}

export function wallDistances(r: Rect, room: Pick<Room, 'width' | 'length'>): Record<WallSide, Cm> {
  return {
    noord: r.y0,
    zuid: room.length - r.y1,
    west: r.x0,
    oost: room.width - r.x1,
  };
}

export interface ItemWarning {
  overlap: boolean;
  outside: boolean;
  /** Ids van items waarmee dit item overlapt. */
  overlapsWith: string[];
}

export function computeWarnings(items: PlacedItem[], room: Pick<Room, 'width' | 'length'>): Map<string, ItemWarning> {
  const rects = items.map(itemRect);
  const result = new Map<string, ItemWarning>();
  items.forEach((it, i) => {
    result.set(it.id, { overlap: false, outside: isOutsideRoom(rects[i], room), overlapsWith: [] });
  });
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (rectsOverlap(rects[i], rects[j])) {
        const a = result.get(items[i].id)!;
        const b = result.get(items[j].id)!;
        a.overlap = b.overlap = true;
        a.overlapsWith.push(items[j].id);
        b.overlapsWith.push(items[i].id);
      }
    }
  }
  return result;
}

/**
 * Plaatst het middelpunt zó dat de linkerbovenhoek van het item op het raster ligt.
 * Met grid = 1 komen de hoeken op hele centimeters. Het middelpunt blijft binnen de ruimte,
 * zodat een item nooit "kwijt" raakt.
 */
export function snapCenter(
  x: number,
  y: number,
  w: Cm,
  d: Cm,
  grid: number,
  room: Pick<Room, 'width' | 'length'>,
): { x: number; y: number } {
  const g = Math.max(1, grid);
  let x0 = Math.round((x - w / 2) / g) * g;
  let y0 = Math.round((y - d / 2) / g) * g;
  // Middelpunt binnen de ruimte houden.
  x0 = Math.min(Math.max(x0, -w / 2), room.width - w / 2);
  y0 = Math.min(Math.max(y0, -d / 2), room.length - d / 2);
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  return { x: x0 + w / 2, y: y0 + d / 2 };
}

export function nextRotation(r: Rotation): Rotation {
  return ((r + 90) % 360) as Rotation;
}

/** Zoekt een vrije plek op het raster voor een nieuw product; anders het midden van de ruimte. */
export function findFreeSpot(product: Product, room: Room, items: PlacedItem[]): { x: number; y: number } {
  const { w, d } = footprint(product, 0);
  const rects = items.map(itemRect);
  const step = GRID_CM * 5;
  for (let y0 = 0; y0 + d <= room.length; y0 += step) {
    for (let x0 = 0; x0 + w <= room.width; x0 += step) {
      const r = { x0, y0, x1: x0 + w, y1: y0 + d };
      if (!rects.some((o) => rectsOverlap(o, r))) return { x: x0 + w / 2, y: y0 + d / 2 };
    }
  }
  return snapCenter(room.width / 2, room.length / 2, w, d, GRID_CM, room);
}

// ---------- Muren & openingen ----------

export function wallLength(room: Pick<Room, 'width' | 'length'>, wall: WallSide): Cm {
  return wall === 'noord' || wall === 'zuid' ? room.width : room.length;
}

/** Houdt een opening binnen de muur. */
export function clampOpening(o: Opening, room: Room): Opening {
  const len = wallLength(room, o.wall);
  const width = Math.max(10, Math.min(Math.round(o.width), len));
  const offset = Math.max(0, Math.min(Math.round(o.offset), len - width));
  const height = Math.max(10, Math.min(Math.round(o.height), room.height));
  const sill = o.type === 'deur' ? 0 : Math.max(0, Math.min(Math.round(o.sill), room.height - height));
  return { ...o, width, offset, height, sill };
}

/** Begin- en eindpunt van de opening in plattegrond-coördinaten (op de binnenkant van de muur). */
export function openingSegment(o: Opening, room: Pick<Room, 'width' | 'length'>): { a: [number, number]; b: [number, number] } {
  switch (o.wall) {
    case 'noord':
      return { a: [o.offset, 0], b: [o.offset + o.width, 0] };
    case 'zuid':
      return { a: [o.offset, room.length], b: [o.offset + o.width, room.length] };
    case 'west':
      return { a: [0, o.offset], b: [0, o.offset + o.width] };
    case 'oost':
      return { a: [room.width, o.offset], b: [room.width, o.offset + o.width] };
  }
}

/** Normaal-vector die vanaf de muur de ruimte in wijst. */
export function wallInwardNormal(wall: WallSide): [number, number] {
  switch (wall) {
    case 'noord':
      return [0, 1];
    case 'zuid':
      return [0, -1];
    case 'west':
      return [1, 0];
    case 'oost':
      return [-1, 0];
  }
}
