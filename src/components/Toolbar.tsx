import { useStore } from '../store/useStore';

export function Toolbar({ onOpenDesigns, onToggleProducts }: { onOpenDesigns: () => void; onToggleProducts: () => void }) {
  const designName = useStore((s) => s.designName);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const snap = useStore((s) => s.snap);
  const setSnap = useStore((s) => s.setSnap);

  return (
    <header className="toolbar">
      <button type="button" className="products-toggle" onClick={onToggleProducts} aria-label="Producten tonen">
        ☰ <span className="label">Producten</span>
      </button>

      <button type="button" className="design-name" onClick={onOpenDesigns} title="Ontwerpen beheren">
        <span className="app-title">Ruimte-indeler</span>
        <span className="name">{designName}</span>
        <span className="caret">▾</span>
      </button>

      <div className="spacer" />

      <div className="group">
        <button type="button" onClick={undo} disabled={!canUndo} title="Ongedaan maken (Ctrl+Z)" aria-label="Ongedaan maken">
          ↶
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title="Opnieuw (Ctrl+Y)" aria-label="Opnieuw">
          ↷
        </button>
      </div>

      {view === '2d' && (
        <label className="toggle" title="Uitlijnen op raster van 10 cm">
          <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
          <span>Raster</span>
        </label>
      )}

      <div className="segmented" role="group" aria-label="Weergave">
        <button type="button" className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')} aria-pressed={view === '2d'}>
          2D
        </button>
        <button type="button" className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')} aria-pressed={view === '3d'}>
          3D
        </button>
      </div>
    </header>
  );
}
