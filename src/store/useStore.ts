import { create } from 'zustand';
import type { Design, DesignSnapshot, Opening, PlacedItem, Product, Room, WallSide } from '../types';
import { newId } from '../lib/id';
import { clampOpening, findFreeSpot, footprint, GRID_CM, nextRotation, snapCenter, wallLength } from '../lib/geometry';
import {
  deleteStoredDesign,
  loadCurrentId,
  loadCustomProducts,
  loadDesigns,
  saveCurrentId,
  saveCustomProducts,
  saveDesign,
} from './persistence';

const HISTORY_LIMIT = 100;

export type ViewMode = '2d' | '3d';
export type WallStyle = 'transparant' | 'laag' | 'vol';

export interface State {
  designId: string;
  designName: string;
  createdAt: string;
  room: Room;
  items: PlacedItem[];

  past: DesignSnapshot[];
  future: DesignSnapshot[];

  selectedId: string | null;
  view: ViewMode;
  snap: boolean;
  wallStyle: WallStyle;
  customProducts: Product[];

  // Geschiedenis
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;

  // Ruimte
  setRoomSize: (size: { width: number; length: number; height: number }) => void;
  addOpening: (type: Opening['type'], wall: WallSide) => void;
  /** `record = false` voor live-updates (bijv. schuifbalk) na een `checkpoint()`. */
  updateOpening: (id: string, patch: Partial<Omit<Opening, 'id'>>, record?: boolean) => void;
  removeOpening: (id: string) => void;

  // Meubels
  addItem: (product: Product, at?: { x: number; y: number }) => string;
  /** Verplaatsen tijdens slepen: geen geschiedenis (roep eerst `checkpoint()` aan). */
  dragItem: (id: string, x: number, y: number) => void;
  /** Verplaatsen via invoervelden: met geschiedenis. */
  setItemPosition: (id: string, x: number, y: number) => void;
  rotateItem: (id: string) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  select: (id: string | null) => void;

  // Weergave
  setView: (v: ViewMode) => void;
  setSnap: (v: boolean) => void;
  setWallStyle: (v: WallStyle) => void;

  // Ontwerpen
  newDesign: (name: string, size: { width: number; length: number; height: number }) => void;
  openDesign: (id: string) => void;
  renameDesign: (id: string, name: string) => void;
  deleteDesign: (id: string) => void;

  // Eigen producten
  addCustomProduct: (p: Omit<Product, 'id' | 'dimensionSource' | 'category'> & Partial<Pick<Product, 'dimensionSource'>>) => Product;
  removeCustomProduct: (id: string) => void;
}

export function defaultRoom(width = 400, length = 500, height = 260): Room {
  return {
    width,
    length,
    height,
    openings: [
      { id: newId('op'), type: 'deur', wall: 'zuid', offset: 30, width: 83, height: 211, sill: 0 },
      { id: newId('op'), type: 'raam', wall: 'noord', offset: Math.max(0, Math.round(width / 2 - 75)), width: 150, height: 130, sill: 90 },
    ],
  };
}

export function createDesign(name: string, room: Room): Design {
  const now = new Date().toISOString();
  return { id: newId('ontwerp'), name, room, items: [], createdAt: now, updatedAt: now };
}

function initialDesign(): Design {
  const id = loadCurrentId();
  const designs = loadDesigns();
  const found = designs.find((d) => d.id === id) ?? designs[designs.length - 1];
  if (found) return found;
  const d = createDesign('Mijn kamer', defaultRoom());
  saveDesign(d);
  saveCurrentId(d.id);
  return d;
}

const first = initialDesign();

export const useStore = create<State>()((set, get) => {
  const snapshot = (): DesignSnapshot => ({ room: get().room, items: get().items });

  /** Wijziging met undo-stap. */
  const commit = (partial: Partial<Pick<State, 'room' | 'items' | 'selectedId'>>) => {
    set((s) => ({
      ...partial,
      past: [...s.past, { room: s.room, items: s.items }].slice(-HISTORY_LIMIT),
      future: [],
    }));
  };

  const grid = () => (get().snap ? GRID_CM : 1);

  const placeAt = (item: PlacedItem, x: number, y: number): PlacedItem => {
    const { w, d } = footprint(item.product, item.rotation);
    return { ...item, ...snapCenter(x, y, w, d, grid(), get().room) };
  };

  const loadIntoState = (d: Design) => ({
    designId: d.id,
    designName: d.name,
    createdAt: d.createdAt,
    room: d.room,
    items: d.items,
    past: [],
    future: [],
    selectedId: null,
  });

  return {
    ...loadIntoState(first),
    view: '2d',
    snap: true,
    wallStyle: 'transparant',
    customProducts: loadCustomProducts(),

    checkpoint: () => set((s) => ({ past: [...s.past, snapshot()].slice(-HISTORY_LIMIT), future: [] })),

    undo: () => {
      const { past, future } = get();
      if (!past.length) return;
      const prev = past[past.length - 1];
      set((s) => ({
        room: prev.room,
        items: prev.items,
        past: past.slice(0, -1),
        future: [snapshot(), ...future],
        selectedId: prev.items.some((i) => i.id === s.selectedId) ? s.selectedId : null,
      }));
    },

    redo: () => {
      const { past, future } = get();
      if (!future.length) return;
      const next = future[0];
      set((s) => ({
        room: next.room,
        items: next.items,
        past: [...past, snapshot()],
        future: future.slice(1),
        selectedId: next.items.some((i) => i.id === s.selectedId) ? s.selectedId : null,
      }));
    },

    setRoomSize: ({ width, length, height }) => {
      const r = get().room;
      const room: Room = { ...r, width, length, height };
      room.openings = r.openings.map((o) => clampOpening(o, room));
      commit({ room });
    },

    addOpening: (type, wall) => {
      const r = get().room;
      const len = wallLength(r, wall);
      const base: Opening =
        type === 'deur'
          ? { id: newId('op'), type, wall, offset: 0, width: 83, height: 211, sill: 0 }
          : { id: newId('op'), type, wall, offset: 0, width: 120, height: 120, sill: 90 };
      base.offset = Math.round((len - base.width) / 2);
      commit({ room: { ...r, openings: [...r.openings, clampOpening(base, r)] } });
    },

    updateOpening: (id, patch, record = true) => {
      const r = get().room;
      const room = { ...r, openings: r.openings.map((o) => (o.id === id ? clampOpening({ ...o, ...patch }, r) : o)) };
      if (record) commit({ room });
      else set({ room });
    },

    removeOpening: (id) => {
      const r = get().room;
      commit({ room: { ...r, openings: r.openings.filter((o) => o.id !== id) } });
    },

    addItem: (product, at) => {
      const { room, items } = get();
      const pos = at ?? findFreeSpot(product, room, items);
      const item = placeAt({ id: newId('item'), product: { ...product }, x: 0, y: 0, rotation: 0 }, pos.x, pos.y);
      commit({ items: [...items, item], selectedId: item.id });
      return item.id;
    },

    dragItem: (id, x, y) => {
      set((s) => ({ items: s.items.map((it) => (it.id === id ? placeAt(it, x, y) : it)) }));
    },

    setItemPosition: (id, x, y) => {
      const { items } = get();
      commit({
        items: items.map((it) => {
          if (it.id !== id) return it;
          const { w, d } = footprint(it.product, it.rotation);
          // Exacte invoer: alleen afronden op hele cm, niet op het raster.
          return { ...it, ...snapCenter(x, y, w, d, 1, get().room) };
        }),
      });
    },

    rotateItem: (id) => {
      commit({
        items: get().items.map((it) => (it.id === id ? placeAt({ ...it, rotation: nextRotation(it.rotation) }, it.x, it.y) : it)),
      });
    },

    removeItem: (id) => {
      commit({ items: get().items.filter((it) => it.id !== id), selectedId: get().selectedId === id ? null : get().selectedId });
    },

    duplicateItem: (id) => {
      const src = get().items.find((it) => it.id === id);
      if (!src) return;
      const copy = placeAt({ ...src, id: newId('item') }, src.x + 20, src.y + 20);
      commit({ items: [...get().items, copy], selectedId: copy.id });
    },

    select: (id) => set({ selectedId: id }),

    setView: (view) => set({ view }),
    setSnap: (snap) => set({ snap }),
    setWallStyle: (wallStyle) => set({ wallStyle }),

    newDesign: (name, size) => {
      const d = createDesign(name, defaultRoom(size.width, size.length, size.height));
      saveDesign(d);
      saveCurrentId(d.id);
      set(loadIntoState(d));
    },

    openDesign: (id) => {
      const d = loadDesigns().find((x) => x.id === id);
      if (!d) return;
      saveCurrentId(d.id);
      set(loadIntoState(d));
    },

    renameDesign: (id, name) => {
      const trimmed = name.trim() || 'Naamloos ontwerp';
      if (id === get().designId) {
        set({ designName: trimmed });
      } else {
        const d = loadDesigns().find((x) => x.id === id);
        if (d) saveDesign({ ...d, name: trimmed, updatedAt: new Date().toISOString() });
      }
    },

    deleteDesign: (id) => {
      discardPending(id);
      deleteStoredDesign(id);
      if (id === get().designId) {
        const rest = loadDesigns();
        const next = rest[rest.length - 1] ?? createDesign('Mijn kamer', defaultRoom());
        saveDesign(next);
        saveCurrentId(next.id);
        set(loadIntoState(next));
      }
    },

    addCustomProduct: (p) => {
      const product: Product = { dimensionSource: 'handmatig', ...p, id: newId('eigen'), category: 'Eigen producten' };
      const list = [...get().customProducts, product];
      saveCustomProducts(list);
      set({ customProducts: list });
      return product;
    },

    removeCustomProduct: (id) => {
      const list = get().customProducts.filter((p) => p.id !== id);
      saveCustomProducts(list);
      set({ customProducts: list });
    },
  };
});

// ---------- Automatisch opslaan ----------
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pending: Design | null = null;

export function flushSave(): void {
  clearTimeout(saveTimer);
  if (pending) saveDesign(pending);
  pending = null;
}

function discardPending(designId: string): void {
  if (pending?.id === designId) {
    clearTimeout(saveTimer);
    pending = null;
  }
}

useStore.subscribe((s, prev) => {
  if (s.designId !== prev.designId) {
    // Ander ontwerp geladen: eerst eventuele wijzigingen van het vorige ontwerp wegschrijven.
    flushSave();
    return;
  }
  if (s.room === prev.room && s.items === prev.items && s.designName === prev.designName) return;
  pending = {
    id: s.designId,
    name: s.designName,
    room: s.room,
    items: s.items,
    createdAt: s.createdAt,
    updatedAt: new Date().toISOString(),
  };
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 250);
});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushSave);
  window.addEventListener('pagehide', flushSave);
}
