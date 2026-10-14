import { describe, expect, it } from 'vitest';
import { clampOpening, computeWarnings, footprint, itemRect, snapCenter, wallDistances } from './geometry';
import type { PlacedItem, Product, Room } from '../types';

const room: Room = { width: 400, length: 500, height: 260, openings: [] };
const bank: Product = { id: 'p', name: 'Bank', category: '', width: 210, depth: 90, height: 85, color: '#000', dimensionSource: 'catalogus' };
const item = (id: string, x: number, y: number, rotation: PlacedItem['rotation'] = 0): PlacedItem => ({ id, product: bank, x, y, rotation });

describe('geometry', () => {
  it('wisselt breedte en diepte bij 90°', () => {
    expect(footprint(bank, 90)).toEqual({ w: 90, d: 210 });
    expect(footprint(bank, 180)).toEqual({ w: 210, d: 90 });
  });

  it('snapt de linkerbovenhoek op 10 cm', () => {
    const p = snapCenter(113, 47, 210, 90, 10, room);
    expect(p.x - 105).toBe(10);
    expect(p.y - 45).toBe(0);
  });

  it('houdt hoeken op hele cm zonder raster, ook bij oneven maten', () => {
    const p = snapCenter(100.3, 100.7, 45, 51, 1, room);
    expect(Number.isInteger(p.x - 22.5)).toBe(true);
    expect(Number.isInteger(p.y - 25.5)).toBe(true);
  });

  it('berekent afstanden tot de muren', () => {
    const d = wallDistances(itemRect(item('a', 115, 55)), room);
    expect(d).toEqual({ west: 10, oost: 180, noord: 10, zuid: 400 });
  });

  it('detecteert overlap en buiten de muren', () => {
    const w = computeWarnings([item('a', 105, 45), item('b', 200, 60), item('c', 300, 480)], room);
    expect(w.get('a')!.overlap).toBe(true);
    expect(w.get('b')!.overlapsWith).toEqual(['a']);
    expect(w.get('c')!.outside).toBe(true);
    expect(w.get('c')!.overlap).toBe(false);
  });

  it('elkaar raken is geen overlap', () => {
    const w = computeWarnings([item('a', 105, 45), item('b', 105, 135)], room);
    expect(w.get('a')!.overlap).toBe(false);
  });

  it('houdt openingen binnen de muur', () => {
    const o = clampOpening({ id: 'o', type: 'raam', wall: 'noord', offset: 380, width: 100, height: 120, sill: 90 }, room);
    expect(o.offset).toBe(300);
  });
});
