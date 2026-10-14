import { useEffect, useRef, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { useWarnings } from '../../store/selectors';
import { hasProductDrag, readProductDrag } from '../../lib/dnd';
import { Walls3D } from './Walls3D';
import { Furniture3D } from './Furniture3D';

type Api = { camera: THREE.Camera; gl: THREE.WebGLRenderer } | null;

/** Zet de camera schuin boven de ruimte, op een afstand waarbij de hele ruimte in beeld past. */
function CameraRig({ W, L, H, resetKey }: { W: number; L: number; H: number; resetKey: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  useEffect(() => {
    const radius = Math.sqrt(W * W + L * L + H * H) / 2;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const dist = (radius / Math.sin(Math.min(vfov, hfov) / 2)) * 0.95;
    const dir = new THREE.Vector3(0.35, 1.0, 1.1).normalize();
    camera.position.set(W / 2 + dir.x * dist, dir.y * dist, L / 2 + dir.z * dist);
    camera.lookAt(W / 2, 0, L / 2);
    if (controls) {
      controls.target.set(W / 2, 0, L / 2);
      controls.update();
    }
    // Bewust niet afhankelijk van `aspect`: draaien van het scherm mag de camera niet resetten.
  }, [W, L, H, resetKey, camera, controls]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Geeft camera en renderer door naar buiten de Canvas (voor slepen vanuit het productpaneel). */
function ApiBridge({ apiRef }: { apiRef: React.MutableRefObject<Api> }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  apiRef.current = { camera, gl };
  return null;
}

export default function Scene3D() {
  const room = useStore((s) => s.room);
  const items = useStore((s) => s.items);
  const selectedId = useStore((s) => s.selectedId);
  const wallStyle = useStore((s) => s.wallStyle);
  const select = useStore((s) => s.select);
  const setWallStyle = useStore((s) => s.setWallStyle);
  const addItem = useStore((s) => s.addItem);
  const warnings = useWarnings();
  const apiRef = useRef<Api>(null);
  const [resetKey, setResetKey] = useState(0);
  const [dropActive, setDropActive] = useState(false);

  const W = room.width / 100;
  const L = room.length / 100;
  const size = Math.max(W, L);

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta < 4) select(null);
  };

  const onDrop = (e: React.DragEvent) => {
    setDropActive(false);
    const product = readProductDrag(e);
    const api = apiRef.current;
    if (!product || !api) return;
    e.preventDefault();
    const rect = api.gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, api.camera);
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) addItem(product, { x: p.x * 100, y: p.z * 100 });
    else addItem(product);
  };

  return (
    <div
      className={`view3d${dropActive ? ' drop-active' : ''}`}
      onDragOver={(e) => {
        if (!hasProductDrag(e)) return;
        e.preventDefault();
        setDropActive(true);
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={onDrop}
    >
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 45, near: 0.05, far: 200 }} onPointerMissed={() => select(null)}>
        <color attach="background" args={['#e9ebef']} />
        <hemisphereLight args={['#ffffff', '#d6d3ca', 0.9]} />
        <directionalLight
          position={[W * 0.2 - 2, size * 2, L * 0.3 - 1]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-size}
          shadow-camera-right={size}
          shadow-camera-top={size}
          shadow-camera-bottom={-size}
          shadow-bias={-0.0005}
          target-position={[W / 2, 0, L / 2]}
        />

        {/* Vloer */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, 0, L / 2]} receiveShadow onClick={onFloorClick}>
          <planeGeometry args={[W, L]} />
          <meshStandardMaterial color="#efe9dc" />
        </mesh>
        <Grid
          position={[W / 2, 0.001, L / 2]}
          args={[W, L]}
          cellSize={0.1}
          cellThickness={0.6}
          cellColor="#d9d3c4"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#bdb5a3"
          fadeDistance={size * 6}
          fadeStrength={0}
        />

        <Walls3D room={room} style={wallStyle} />

        {items.map((it) => {
          const w = warnings.get(it.id);
          return <Furniture3D key={it.id} item={it} selected={it.id === selectedId} warn={!!(w?.overlap || w?.outside)} />;
        })}

        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.03} minDistance={0.5} maxDistance={size * 8} enableDamping dampingFactor={0.12} />
        <CameraRig W={W} L={L} H={room.height / 100} resetKey={resetKey} />
        <ApiBridge apiRef={apiRef} />
      </Canvas>

      <div className="zoom-controls">
        <button type="button" title="Camera herstellen" aria-label="Camera herstellen" onClick={() => setResetKey((k) => k + 1)}>
          ⤢
        </button>
      </div>
      <div className="view3d-top">
        <select value={wallStyle} onChange={(e) => setWallStyle(e.target.value as typeof wallStyle)} aria-label="Muren" title="Weergave van de muren">
          <option value="transparant">Muren transparant</option>
          <option value="laag">Muren laag</option>
          <option value="vol">Muren vol</option>
        </select>
        <p className="view3d-hint">Sleep om te draaien · twee vingers of rechtermuisknop om te schuiven · scroll/knijp om te zoomen</p>
      </div>
    </div>
  );
}
