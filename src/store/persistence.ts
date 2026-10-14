import type { Design, Product } from '../types';

const KEY_DESIGNS = 'ruimte-indeler/v1/designs';
const KEY_CURRENT = 'ruimte-indeler/v1/current';
const KEY_CUSTOM = 'ruimte-indeler/v1/custom-products';

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Opslaan in localStorage mislukt', e);
  }
}

export function loadDesigns(): Design[] {
  const list = readJson<Design[]>(KEY_DESIGNS, []);
  return Array.isArray(list) ? list : [];
}

export function saveDesign(design: Design): void {
  const list = loadDesigns();
  const i = list.findIndex((d) => d.id === design.id);
  if (i >= 0) list[i] = design;
  else list.push(design);
  writeJson(KEY_DESIGNS, list);
}

export function deleteStoredDesign(id: string): void {
  writeJson(
    KEY_DESIGNS,
    loadDesigns().filter((d) => d.id !== id),
  );
}

export function loadCurrentId(): string | null {
  return readJson<string | null>(KEY_CURRENT, null);
}

export function saveCurrentId(id: string): void {
  writeJson(KEY_CURRENT, id);
}

export function loadCustomProducts(): Product[] {
  const list = readJson<Product[]>(KEY_CUSTOM, []);
  return Array.isArray(list) ? list : [];
}

export function saveCustomProducts(products: Product[]): void {
  writeJson(KEY_CUSTOM, products);
}
