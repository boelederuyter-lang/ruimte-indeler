import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Toolbar } from './components/Toolbar';
import { FloorPlan2D } from './components/plan2d/FloorPlan2D';
import { RoomPanel } from './components/RoomPanel';
import { Inspector } from './components/Inspector';
import { ProductList } from './components/ProductList';
import { SelectionBar } from './components/SelectionBar';
import { DesignsDialog } from './components/DesignsDialog';
import { ProductPanel } from './components/ProductPanel';

type Tab = 'selectie' | 'ruimte' | 'lijst';

function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return;
      const s = useStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        s.undo();
      } else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        s.redo();
      } else if (!mod && s.selectedId) {
        const it = s.items.find((i) => i.id === s.selectedId);
        if (!it) return;
        const step = e.shiftKey ? 1 : 10;
        const moves: Record<string, [number, number]> = {
          arrowleft: [-step, 0],
          arrowright: [step, 0],
          arrowup: [0, -step],
          arrowdown: [0, step],
        };
        if (key === 'delete' || key === 'backspace') {
          e.preventDefault();
          s.removeItem(it.id);
        } else if (key === 'r') {
          s.rotateItem(it.id);
        } else if (key === 'escape') {
          s.select(null);
        } else if (moves[key]) {
          e.preventDefault();
          s.setItemPosition(it.id, it.x + moves[key][0], it.y + moves[key][1]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function App() {
  useKeyboardShortcuts();
  const view = useStore((s) => s.view);
  const selectedId = useStore((s) => s.selectedId);
  const [tab, setTab] = useState<Tab>('ruimte');
  const [productsOpen, setProductsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [designsOpen, setDesignsOpen] = useState(false);

  // Bij een nieuwe selectie automatisch naar het tabblad "Selectie".
  useEffect(() => {
    if (selectedId) setTab('selectie');
  }, [selectedId]);

  return (
    <div className="app">
      <Toolbar onOpenDesigns={() => setDesignsOpen(true)} onToggleProducts={() => setProductsOpen((v) => !v)} />
      <div className="main">
        <aside className={`panel panel-left${productsOpen ? ' open' : ''}`} aria-label="Producten">
          <ProductPanel onPlaced={() => setProductsOpen(false)} />
        </aside>
        {productsOpen && <div className="scrim" onClick={() => setProductsOpen(false)} />}

        <main className="stage">
          {view === '2d' ? <FloorPlan2D /> : <div className="hint">3D volgt.</div>}
          <SelectionBar
            onDetails={() => {
              setTab('selectie');
              setDetailsOpen(true);
            }}
          />
        </main>

        <aside className={`panel panel-right${detailsOpen ? ' open' : ''}`} aria-label="Details">
          <div className="sheet-handle">
            <button type="button" className="icon-btn" onClick={() => setDetailsOpen(false)} aria-label="Sluiten">
              ✕
            </button>
          </div>
          <nav className="tabs" role="tablist">
            {(
              [
                ['selectie', 'Selectie'],
                ['ruimte', 'Ruimte'],
                ['lijst', 'Productlijst'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="panel-scroll">
            {tab === 'selectie' && <Inspector />}
            {tab === 'ruimte' && <RoomPanel />}
            {tab === 'lijst' && <ProductList />}
          </div>
        </aside>
      </div>

      <button type="button" className="details-fab" onClick={() => setDetailsOpen(true)}>
        ⚙ Ruimte &amp; lijst
      </button>

      {designsOpen && <DesignsDialog onClose={() => setDesignsOpen(false)} />}
    </div>
  );
}
