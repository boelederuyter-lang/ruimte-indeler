import { useStore } from '../store/useStore';
import { NumberField } from './ui/NumberField';
import { cmToMetersString, parseCm, parseMetersToCm } from '../lib/units';
import { wallLength } from '../lib/geometry';
import type { WallSide } from '../types';

const WALLS: Array<{ value: WallSide; label: string }> = [
  { value: 'noord', label: 'Boven (noord)' },
  { value: 'oost', label: 'Rechts (oost)' },
  { value: 'zuid', label: 'Onder (zuid)' },
  { value: 'west', label: 'Links (west)' },
];

export function RoomPanel() {
  const room = useStore((s) => s.room);
  const setRoomSize = useStore((s) => s.setRoomSize);
  const addOpening = useStore((s) => s.addOpening);
  const updateOpening = useStore((s) => s.updateOpening);
  const removeOpening = useStore((s) => s.removeOpening);
  const checkpoint = useStore((s) => s.checkpoint);

  const size = { width: room.width, length: room.length, height: room.height };
  const meters = { parse: parseMetersToCm, format: cmToMetersString, suffix: 'm', min: 50 };

  return (
    <div className="panel-section">
      <h3>Afmetingen ruimte</h3>
      <div className="field-row three">
        <NumberField label="Breedte" value={room.width} onCommit={(v) => setRoomSize({ ...size, width: v })} {...meters} />
        <NumberField label="Lengte" value={room.length} onCommit={(v) => setRoomSize({ ...size, length: v })} {...meters} />
        <NumberField label="Hoogte" value={room.height} onCommit={(v) => setRoomSize({ ...size, height: v })} {...meters} />
      </div>
      <p className="hint">
        Oppervlakte: {((room.width * room.length) / 10000).toLocaleString('nl-NL', { maximumFractionDigits: 2 })} m²
      </p>

      <h3>Deuren en ramen</h3>
      <div className="button-row">
        <button type="button" onClick={() => addOpening('deur', 'zuid')}>
          + Deur
        </button>
        <button type="button" onClick={() => addOpening('raam', 'noord')}>
          + Raam
        </button>
      </div>

      {room.openings.length === 0 && <p className="hint">Nog geen deuren of ramen.</p>}

      <ul className="opening-list">
        {room.openings.map((o, i) => (
          <li key={o.id} className="card">
            <div className="card-head">
              <strong>
                {o.type === 'deur' ? '🚪 Deur' : '🪟 Raam'} {i + 1}
              </strong>
              <button type="button" className="icon-btn danger" onClick={() => removeOpening(o.id)} aria-label="Verwijderen" title="Verwijderen">
                🗑
              </button>
            </div>
            <label className="field">
              <span>Muur</span>
              <select value={o.wall} onChange={(e) => updateOpening(o.id, { wall: e.target.value as WallSide })}>
                {WALLS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-row">
              <NumberField
                label={o.wall === 'noord' || o.wall === 'zuid' ? 'Vanaf links' : 'Vanaf boven'}
                value={o.offset}
                onCommit={(v) => updateOpening(o.id, { offset: v })}
                parse={parseCm}
                suffix="cm"
                min={0}
              />
              <NumberField label="Breedte" value={o.width} onCommit={(v) => updateOpening(o.id, { width: v })} parse={parseCm} suffix="cm" min={10} />
            </div>
            <div className="field-row">
              <NumberField label="Hoogte" value={o.height} onCommit={(v) => updateOpening(o.id, { height: v })} parse={parseCm} suffix="cm" min={10} />
              {o.type === 'raam' && (
                <NumberField label="Borstwering" value={o.sill} onCommit={(v) => updateOpening(o.id, { sill: v })} parse={parseCm} suffix="cm" min={0} />
              )}
            </div>
            <input
              type="range"
              aria-label="Positie op de muur"
              min={0}
              max={Math.max(0, wallLength(room, o.wall) - o.width)}
              step={1}
              value={o.offset}
              onPointerDown={checkpoint}
              onKeyDown={checkpoint}
              onChange={(e) => updateOpening(o.id, { offset: Number(e.target.value) }, false)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
