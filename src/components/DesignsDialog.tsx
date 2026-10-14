import { useState } from 'react';
import { flushSave, useStore } from '../store/useStore';
import { loadDesigns } from '../store/persistence';
import { Modal } from './ui/Modal';
import { cmToMetersString, parseMetersToCm } from '../lib/units';

export function DesignsDialog({ onClose }: { onClose: () => void }) {
  const designId = useStore((s) => s.designId);
  const openDesign = useStore((s) => s.openDesign);
  const renameDesign = useStore((s) => s.renameDesign);
  const deleteDesign = useStore((s) => s.deleteDesign);
  const newDesign = useStore((s) => s.newDesign);

  const refresh = () => {
    flushSave();
    return loadDesigns().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  };
  const [designs, setDesigns] = useState(refresh);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [name, setName] = useState('Nieuw ontwerp');
  const [width, setWidth] = useState('4,00');
  const [length, setLength] = useState('5,00');
  const [height, setHeight] = useState('2,60');
  const [error, setError] = useState('');

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseMetersToCm(width);
    const l = parseMetersToCm(length);
    const h = parseMetersToCm(height);
    if ([w, l, h].some((v) => Number.isNaN(v) || v < 50 || v > 5000)) {
      setError('Vul geldige maten in tussen 0,5 en 50 meter.');
      return;
    }
    newDesign(name.trim() || 'Nieuw ontwerp', { width: w, length: l, height: h });
    onClose();
  };

  const saveRename = (id: string) => {
    renameDesign(id, editName);
    setEditing(null);
    setDesigns(refresh());
  };

  return (
    <Modal title="Ontwerpen" onClose={onClose}>
      <ul className="design-list">
        {designs.map((d) => (
          <li key={d.id} className={d.id === designId ? 'current' : ''}>
            {editing === d.id ? (
              <form
                className="rename-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRename(d.id);
                }}
              >
                <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Nieuwe naam" />
                <button type="submit">Opslaan</button>
                <button type="button" onClick={() => setEditing(null)}>
                  Annuleren
                </button>
              </form>
            ) : (
              <>
                <div className="design-info">
                  <strong>{d.name}</strong>
                  <span className="hint">
                    {cmToMetersString(d.room.width)} × {cmToMetersString(d.room.length)} m · {d.items.length} items · {new Date(d.updatedAt).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="design-actions">
                  {d.id === designId ? (
                    <span className="badge">Geopend</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        openDesign(d.id);
                        onClose();
                      }}
                    >
                      Openen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(d.id);
                      setEditName(d.name);
                    }}
                  >
                    Hernoemen
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      if (confirm(`Ontwerp "${d.name}" verwijderen? Dit kan niet ongedaan worden.`)) {
                        deleteDesign(d.id);
                        setDesigns(refresh());
                      }
                    }}
                  >
                    Verwijderen
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <h3>Nieuw ontwerp</h3>
      <form className="new-design" onSubmit={create}>
        <label className="field">
          <span>Naam</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="field-row three">
          <label className="field">
            <span>Breedte (m)</span>
            <input inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)} />
          </label>
          <label className="field">
            <span>Lengte (m)</span>
            <input inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} />
          </label>
          <label className="field">
            <span>Hoogte (m)</span>
            <input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
        </div>
        {error && <div className="alert">{error}</div>}
        <button type="submit" className="primary">
          Ruimte aanmaken
        </button>
      </form>
    </Modal>
  );
}
