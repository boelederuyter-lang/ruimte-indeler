import { useMemo } from 'react';
import type { Room, WallSide } from '../../types';
import type { WallStyle } from '../../store/useStore';

/** Muurdikte in meter (buiten de binnenmaat van de ruimte). */
export const WALL_T = 0.12;
const LOW_WALL = 0.6;

interface Box {
  key: string;
  pos: [number, number, number];
  size: [number, number, number];
}

/**
 * Bouwt een muur op uit blokken, met uitsparingen voor deuren en ramen.
 * We knippen de muur op in verticale stroken op elke rand van een opening en bepalen per strook
 * welke hoogtes massief zijn. Dat werkt ook als openingen elkaar overlappen.
 */
function wallBoxes(room: Room, wall: WallSide, height: number): Box[] {
  const W = room.width / 100;
  const L = room.length / 100;
  const horizontal = wall === 'noord' || wall === 'zuid';
  const len = horizontal ? W : L;
  // Noord/zuid lopen door over de hoeken.
  const u0 = horizontal ? -WALL_T : 0;
  const u1 = horizontal ? len + WALL_T : len;

  const openings = room.openings
    .filter((o) => o.wall === wall)
    .map((o) => ({ a: o.offset / 100, b: (o.offset + o.width) / 100, lo: o.sill / 100, hi: (o.sill + o.height) / 100 }));

  const cuts = Array.from(new Set([u0, u1, ...openings.flatMap((o) => [o.a, o.b])].filter((u) => u >= u0 && u <= u1))).sort((p, q) => p - q);

  const boxes: Box[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i];
    const b = cuts[i + 1];
    if (b - a < 1e-6) continue;
    const mid = (a + b) / 2;
    const holes = openings
      .filter((o) => o.a <= mid && o.b >= mid)
      .map((o) => [Math.max(0, o.lo), Math.min(height, o.hi)] as [number, number])
      .filter(([lo, hi]) => hi > lo)
      .sort((p, q) => p[0] - q[0]);
    // Massieve stukken = [0, height] min de gaten.
    let y = 0;
    const solids: Array<[number, number]> = [];
    for (const [lo, hi] of holes) {
      if (lo > y) solids.push([y, lo]);
      y = Math.max(y, hi);
    }
    if (y < height) solids.push([y, height]);

    for (const [lo, hi] of solids) {
      const h = hi - lo;
      const cy = lo + h / 2;
      const along = b - a;
      let pos: [number, number, number];
      let size: [number, number, number];
      switch (wall) {
        case 'noord':
          pos = [mid, cy, -WALL_T / 2];
          size = [along, h, WALL_T];
          break;
        case 'zuid':
          pos = [mid, cy, L + WALL_T / 2];
          size = [along, h, WALL_T];
          break;
        case 'west':
          pos = [-WALL_T / 2, cy, mid];
          size = [WALL_T, h, along];
          break;
        case 'oost':
          pos = [W + WALL_T / 2, cy, mid];
          size = [WALL_T, h, along];
          break;
      }
      boxes.push({ key: `${wall}-${i}-${lo.toFixed(3)}`, pos, size });
    }
  }
  return boxes;
}

export function Walls3D({ room, style }: { room: Room; style: WallStyle }) {
  const H = room.height / 100;
  const height = style === 'laag' ? Math.min(H, LOW_WALL) : H;
  const boxes = useMemo(
    () => (['noord', 'oost', 'zuid', 'west'] as WallSide[]).flatMap((w) => wallBoxes(room, w, height)),
    [room, height],
  );
  const transparent = style === 'transparant';

  return (
    <group>
      {boxes.map((b) => (
        <mesh key={b.key} position={b.pos} castShadow={!transparent} receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#e7e3da" transparent={transparent} opacity={transparent ? 0.35 : 1} depthWrite={!transparent} />
        </mesh>
      ))}
      {/* Glas in de ramen (alleen als het raam binnen de muurhoogte valt). */}
      {room.openings
        .filter((o) => o.type === 'raam' && o.sill / 100 < height)
        .map((o) => {
          const top = Math.min(height, (o.sill + o.height) / 100);
          const h = top - o.sill / 100;
          const cy = o.sill / 100 + h / 2;
          const c = (o.offset + o.width / 2) / 100;
          const w = o.width / 100;
          const W = room.width / 100;
          const L = room.length / 100;
          const pos: [number, number, number] =
            o.wall === 'noord' ? [c, cy, -WALL_T / 2] : o.wall === 'zuid' ? [c, cy, L + WALL_T / 2] : o.wall === 'west' ? [-WALL_T / 2, cy, c] : [W + WALL_T / 2, cy, c];
          const size: [number, number, number] = o.wall === 'noord' || o.wall === 'zuid' ? [w, h, 0.02] : [0.02, h, w];
          return (
            <mesh key={o.id} position={pos}>
              <boxGeometry args={size} />
              <meshStandardMaterial color="#93c5fd" transparent opacity={0.35} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
}
