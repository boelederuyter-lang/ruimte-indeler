import type { Product } from '../types';

/** MIME-type voor slepen van een product uit het paneel naar de plattegrond. */
export const PRODUCT_MIME = 'application/x-ruimte-product';

export function writeProductDrag(e: React.DragEvent, product: Product): void {
  e.dataTransfer.setData(PRODUCT_MIME, JSON.stringify(product));
  e.dataTransfer.setData('text/plain', product.name);
  e.dataTransfer.effectAllowed = 'copy';
}

export function readProductDrag(e: React.DragEvent): Product | null {
  const raw = e.dataTransfer.getData(PRODUCT_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Product;
  } catch {
    return null;
  }
}

export function hasProductDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes(PRODUCT_MIME);
}
