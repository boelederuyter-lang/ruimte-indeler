import { useMemo, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import type { PlacedItem } from '../../types';

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const DRAG_THRESHOLD = 4;

interface DragState {
  dx: number;
  dz: number;
  startX: number;
  startY: number;
  moved: boolean;
}

type Controls = { enabled: boolean } | null;

export function Furniture3D({ item, selected, warn }: { item: PlacedItem; selected: boolean; warn: boolean }) {
  const { product } = item;
  const controls = useThree((s) => s.controls) as unknown as Controls;
  const select = useStore((s) => s.select);
  const dragItem = useStore((s) => s.dragItem);
  const checkpoint = useStore((s) => s.checkpoint);
  const drag = useRef<DragState | null>(null);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const w = product.width / 100;
  const d = product.depth / 100;
  const h = product.height / 100;

  const floorPoint = (e: ThreeEvent<PointerEvent>) => (e.ray.intersectPlane(FLOOR, hit) ? hit : null);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    select(item.id);
    const p = floorPoint(e);
    if (!p) return;
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    // Camerabesturing uit tijdens het slepen van een meubel.
    if (controls) controls.enabled = false;
    drag.current = { dx: p.x - item.x / 100, dz: p.z - item.y / 100, startX: e.nativeEvent.clientX, startY: e.nativeEvent.clientY, moved: false };
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const g = drag.current;
    if (!g) return;
    e.stopPropagation();
    if (!g.moved) {
      if (Math.hypot(e.nativeEvent.clientX - g.startX, e.nativeEvent.clientY - g.startY) < DRAG_THRESHOLD) return;
      checkpoint();
      g.moved = true;
    }
    const p = floorPoint(e);
    if (p) dragItem(item.id, (p.x - g.dx) * 100, (p.z - g.dz) * 100);
  };

  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    (e.target as unknown as Element).releasePointerCapture(e.pointerId);
    drag.current = null;
    if (controls) controls.enabled = true;
  };

  const edgeColor = warn ? '#dc2626' : selected ? '#2563eb' : '#1f2937';

  return (
    <group position={[item.x / 100, 0, item.y / 100]} rotation={[0, (-item.rotation * Math.PI) / 180, 0]}>
      <mesh
        position={[0, h / 2, 0]}
        castShadow
        receiveShadow
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={(e) => e.stopPropagation() /* klik niet doorgeven aan de vloer (die deselecteert) */}
        onPointerOver={() => (document.body.style.cursor = 'grab')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={product.color} emissive={warn ? '#7f1d1d' : '#000000'} emissiveIntensity={warn ? 0.25 : 0} />
        <Edges color={edgeColor} lineWidth={selected || warn ? 2.5 : 1} />
      </mesh>
      {/* Voorkant-markering */}
      <mesh position={[0, Math.min(h, 0.06), d / 2 + 0.002]} raycast={() => null}>
        <planeGeometry args={[w * 0.8, Math.min(h, 0.06) * 0.5]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} />
      </mesh>
      {selected && (
        <Html position={[0, h + 0.15, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`label3d${warn ? ' bad' : ''}`}>
            <strong>{product.name}</strong>
            <span>
              {product.width}×{product.depth}×{product.height} cm
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
