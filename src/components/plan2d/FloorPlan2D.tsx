import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useWarnings } from '../../store/selectors';
import { footprint, GRID_CM, itemRect, openingSegment, wallDistances, wallInwardNormal } from '../../lib/geometry';
import { cmToMetersString } from '../../lib/units';
import { textColorFor } from '../../lib/color';
import { hasProductDrag, readProductDrag } from '../../lib/dnd';
import type { Opening, PlacedItem, Room } from '../../types';

/*
 * Alle lijnen gebruiken `vector-effect: non-scaling-stroke` (zie CSS), dus lijndiktes zijn in schermpixels.
 * Tekstgroottes delen we door de schaal `s`, zodat tekst op elk zoomniveau even groot blijft.
 */

/** Visuele muurdikte in cm (alleen voor de tekening; de binnenmaat van de ruimte telt). */
const WALL = 12;
const MIN_SCALE = 0.1;
const MAX_SCALE = 20;
/** Aantal pixels dat je moet bewegen voordat een tik een sleep wordt. */
const DRAG_THRESHOLD = 4;

interface View {
  /** pixels per cm */
  s: number;
  tx: number;
  ty: number;
}

type Gesture =
  | { kind: 'drag'; id: string; dx: number; dy: number; startX: number; startY: number; moved: boolean }
  | { kind: 'pan'; startX: number; startY: number; tx0: number; ty0: number; moved: boolean }
  | { kind: 'pinch'; d0: number; s0: number; wx: number; wy: number }
  | null;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function FloorPlan2D() {
  const room = useStore((s) => s.room);
  const items = useStore((s) => s.items);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const dragItem = useStore((s) => s.dragItem);
  const checkpoint = useStore((s) => s.checkpoint);
  const addItem = useStore((s) => s.addItem);
  const warnings = useWarnings();

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ s: 1, tx: 0, ty: 0 });
  const [dropActive, setDropActive] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture>(null);

  // Grootte van het tekenvlak volgen.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    if (!size.w || !size.h) return;
    const pad = Math.min(60, Math.max(24, Math.min(size.w, size.h) * 0.08));
    const W = room.width + WALL * 2;
    const L = room.length + WALL * 2;
    const s = clamp(Math.min((size.w - pad * 2) / W, (size.h - pad * 2) / L), MIN_SCALE, MAX_SCALE);
    setView({ s, tx: (size.w - room.width * s) / 2, ty: (size.h - room.length * s) / 2 });
  }, [size.w, size.h, room.width, room.length]);

  useEffect(fit, [fit]);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (clientX - rect.left - v.tx) / v.s, y: (clientY - rect.top - v.ty) / v.s };
  }, []);

  const zoomAround = useCallback((factor: number, sx: number, sy: number) => {
    setView((v) => {
      const s = clamp(v.s * factor, MIN_SCALE, MAX_SCALE);
      const wx = (sx - v.tx) / v.s;
      const wy = (sy - v.ty) / v.s;
      return { s, tx: sx - wx * s, ty: sy - wy * s };
    });
  }, []);

  // Muiswiel-zoom (niet-passief, zodat de pagina niet scrolt).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAround(Math.exp(-delta * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAround]);

  const startPinch = () => {
    const [p1, p2] = Array.from(pointers.current.values());
    const rect = svgRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    const mx = (p1.x + p2.x) / 2 - rect.left;
    const my = (p1.y + p2.y) / 2 - rect.top;
    gesture.current = {
      kind: 'pinch',
      d0: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1,
      s0: v.s,
      wx: (mx - v.tx) / v.s,
      wy: (my - v.ty) / v.s,
    };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      startPinch();
      return;
    }
    if (pointers.current.size > 2) return;

    const target = e.target as Element;
    const itemId = e.button === 1 ? null : target.closest('[data-item-id]')?.getAttribute('data-item-id');
    const item = itemId ? itemsRef.current.find((i) => i.id === itemId) : undefined;
    if (item) {
      select(item.id);
      const w = toWorld(e.clientX, e.clientY);
      gesture.current = { kind: 'drag', id: item.id, dx: w.x - item.x, dy: w.y - item.y, startX: e.clientX, startY: e.clientY, moved: false };
    } else {
      const v = viewRef.current;
      gesture.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, tx0: v.tx, ty0: v.ty, moved: false };
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;

    if (g.kind === 'pinch') {
      if (pointers.current.size < 2) return;
      const [p1, p2] = Array.from(pointers.current.values());
      const rect = svgRef.current!.getBoundingClientRect();
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const s = clamp((g.s0 * d) / g.d0, MIN_SCALE, MAX_SCALE);
      const mx = (p1.x + p2.x) / 2 - rect.left;
      const my = (p1.y + p2.y) / 2 - rect.top;
      setView({ s, tx: mx - g.wx * s, ty: my - g.wy * s });
      return;
    }

    const dist = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
    if (!g.moved && dist < DRAG_THRESHOLD) return;

    if (g.kind === 'drag') {
      if (!g.moved) {
        checkpoint(); // één undo-stap per sleepbeweging
        g.moved = true;
      }
      const w = toWorld(e.clientX, e.clientY);
      dragItem(g.id, w.x - g.dx, w.y - g.dy);
    } else {
      g.moved = true;
      setView((v) => ({ ...v, tx: g.tx0 + e.clientX - g.startX, ty: g.ty0 + e.clientY - g.startY }));
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.kind === 'pinch') {
      if (pointers.current.size === 1) {
        // Verder pannen met de overgebleven vinger.
        const [p] = Array.from(pointers.current.values());
        const v = viewRef.current;
        gesture.current = { kind: 'pan', startX: p.x, startY: p.y, tx0: v.tx, ty0: v.ty, moved: true };
      } else if (pointers.current.size === 0) {
        gesture.current = null;
      }
      return;
    }
    if (g?.kind === 'pan' && !g.moved && e.type === 'pointerup') select(null);
    if (pointers.current.size === 0) gesture.current = null;
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!hasProductDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  };

  const onDrop = (e: React.DragEvent) => {
    setDropActive(false);
    const product = readProductDrag(e);
    if (!product) return;
    e.preventDefault();
    addItem(product, toWorld(e.clientX, e.clientY));
  };

  const { s } = view;
  const sorted = selectedId ? [...items.filter((i) => i.id !== selectedId), ...items.filter((i) => i.id === selectedId)] : items;
  const selected = items.find((i) => i.id === selectedId);

  return (
    <div
      ref={wrapRef}
      className={`plan2d${dropActive ? ' drop-active' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={() => setDropActive(false)}
      onDrop={onDrop}
    >
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="Plattegrond"
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${s})`}>
          <rect x={0} y={0} width={room.width} height={room.length} className="floor" />
          <Grid room={room} s={s} />
          <Walls room={room} />
          {room.openings.map((o) => (
            <OpeningShape key={o.id} o={o} room={room} />
          ))}
          <RoomDims room={room} s={s} />

          {sorted.map((it) => {
            const w = warnings.get(it.id);
            return <Item key={it.id} item={it} s={s} selected={it.id === selectedId} warn={!!(w?.overlap || w?.outside)} />;
          })}

          {selected && <WallDistances item={selected} room={room} s={s} />}
        </g>
      </svg>

      <div className="zoom-controls" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" title="Inzoomen" aria-label="Inzoomen" onClick={() => zoomAround(1.25, size.w / 2, size.h / 2)}>
          +
        </button>
        <button type="button" title="Uitzoomen" aria-label="Uitzoomen" onClick={() => zoomAround(0.8, size.w / 2, size.h / 2)}>
          −
        </button>
        <button type="button" title="Passend maken" aria-label="Passend maken" onClick={fit}>
          ⤢
        </button>
      </div>
    </div>
  );
}

function Grid({ room, s }: { room: Room; s: number }) {
  const lines: JSX.Element[] = [];
  const showMinor = GRID_CM * s >= 5;
  for (let x = 0; x <= room.width; x += GRID_CM) {
    const major = x % 100 === 0;
    if (!major && !showMinor) continue;
    lines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={room.length} className={major ? 'grid-major' : 'grid-minor'} />);
  }
  for (let y = 0; y <= room.length; y += GRID_CM) {
    const major = y % 100 === 0;
    if (!major && !showMinor) continue;
    lines.push(<line key={`y${y}`} x1={0} y1={y} x2={room.width} y2={y} className={major ? 'grid-major' : 'grid-minor'} />);
  }
  return <g>{lines}</g>;
}

function Walls({ room }: { room: Room }) {
  const W = room.width;
  const L = room.length;
  const d = `M${-WALL},${-WALL} H${W + WALL} V${L + WALL} H${-WALL} Z M0,0 V${L} H${W} V0 Z`;
  return <path d={d} className="wall" fillRule="evenodd" />;
}

function OpeningShape({ o, room }: { o: Opening; room: Room }) {
  const { a, b } = openingSegment(o, room);
  const [nx, ny] = wallInwardNormal(o.wall);
  // Uitsparing in de muur.
  const gap = [a, b, [b[0] - nx * WALL, b[1] - ny * WALL], [a[0] - nx * WALL, a[1] - ny * WALL]]
    .map((p) => p.join(','))
    .join(' ');
  if (o.type === 'raam') {
    const mid = (t: number) => [a[0] - nx * WALL * t, a[1] - ny * WALL * t, b[0] - nx * WALL * t, b[1] - ny * WALL * t];
    const [x1, y1, x2, y2] = mid(0.5);
    return (
      <g className="window">
        <polygon points={gap} />
        <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={2} />
      </g>
    );
  }
  // Deur: scharnier bij `a`, draait de kamer in.
  const leaf: [number, number] = [a[0] + nx * o.width, a[1] + ny * o.width];
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const sweep = ux * ny - uy * nx > 0 ? 1 : 0;
  return (
    <g className="door">
      <polygon points={gap} />
      <path d={`M${b[0]},${b[1]} A${o.width},${o.width} 0 0 ${sweep} ${leaf[0]},${leaf[1]}`} strokeWidth={1} className="door-swing" />
      <line x1={a[0]} y1={a[1]} x2={leaf[0]} y2={leaf[1]} strokeWidth={2.5} />
    </g>
  );
}

function RoomDims({ room, s }: { room: Room; s: number }) {
  const fs = 12 / s;
  const off = WALL + 10 / s;
  return (
    <g className="room-dims" fontSize={fs}>
      <text x={room.width / 2} y={-off} textAnchor="middle">
        {cmToMetersString(room.width)} m
      </text>
      <text x={-off} y={room.length / 2} textAnchor="middle" transform={`rotate(-90 ${-off} ${room.length / 2})`}>
        {cmToMetersString(room.length)} m
      </text>
    </g>
  );
}

function Item({ item, s, selected, warn }: { item: PlacedItem; s: number; selected: boolean; warn: boolean }) {
  const { product } = item;
  const { w, d } = footprint(product, item.rotation);
  const fs = 12 / s;
  const showLabel = w * s > 36 && d * s > 18;
  const textColor = textColorFor(product.color);
  const cls = ['item', selected && 'selected', warn && 'warn'].filter(Boolean).join(' ');
  const inset = Math.min(4, product.depth / 6);
  return (
    <g data-item-id={item.id} className={cls}>
      <g transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}>
        <rect x={-product.width / 2} y={-product.depth / 2} width={product.width} height={product.depth} fill={product.color} />
        {/* Voorkant-markering, zodat je ziet hoe het meubel gedraaid is. */}
        <line
          x1={-product.width / 2 + inset}
          x2={product.width / 2 - inset}
          y1={product.depth / 2 - inset}
          y2={product.depth / 2 - inset}
          stroke={textColor}
          strokeOpacity={0.45}
          strokeWidth={2}
          pointerEvents="none"
        />
      </g>
      {showLabel && (
        <text x={item.x} y={item.y} fontSize={fs} fill={textColor} textAnchor="middle" dominantBaseline="middle" pointerEvents="none" className="item-label">
          <tspan x={item.x} dy={selected && d * s > 34 ? -fs * 0.6 : 0}>
            {truncate(product.name, Math.floor((w * s) / 7))}
          </tspan>
          {selected && d * s > 34 && (
            <tspan x={item.x} dy={fs * 1.2} fontSize={fs * 0.9} opacity={0.85}>
              {product.width}×{product.depth}
            </tspan>
          )}
        </text>
      )}
    </g>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return max <= 1 ? '' : text.slice(0, max - 1) + '…';
}

function WallDistances({ item, room, s }: { item: PlacedItem; room: Room; s: number }) {
  const r = itemRect(item);
  const d = wallDistances(r, room);
  const cx = (r.x0 + r.x1) / 2;
  const cy = (r.y0 + r.y1) / 2;
  const fs = 11 / s;
  const segs: Array<{ key: string; x1: number; y1: number; x2: number; y2: number; v: number }> = [];
  if (d.west > 0 && r.x0 <= room.width) segs.push({ key: 'w', x1: 0, y1: cy, x2: r.x0, y2: cy, v: d.west });
  if (d.oost > 0 && r.x1 >= 0) segs.push({ key: 'o', x1: r.x1, y1: cy, x2: room.width, y2: cy, v: d.oost });
  if (d.noord > 0 && r.y0 <= room.length) segs.push({ key: 'n', x1: cx, y1: 0, x2: cx, y2: r.y0, v: d.noord });
  if (d.zuid > 0 && r.y1 >= 0) segs.push({ key: 'z', x1: cx, y1: r.y1, x2: cx, y2: room.length, v: d.zuid });
  return (
    <g className="measure" pointerEvents="none">
      {segs.map((sg) => (
        <g key={sg.key}>
          <line x1={sg.x1} y1={sg.y1} x2={sg.x2} y2={sg.y2} strokeWidth={1} strokeDasharray="4 3" />
          {Math.hypot(sg.x2 - sg.x1, sg.y2 - sg.y1) * s > 26 && (
            <text x={(sg.x1 + sg.x2) / 2} y={(sg.y1 + sg.y2) / 2} fontSize={fs} textAnchor="middle" dominantBaseline="middle" strokeWidth={6 / s}>
              {Math.round(sg.v)}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}
