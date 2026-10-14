import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { CATALOG } from '../data/catalog';
import { writeProductDrag } from '../lib/dnd';
import { formatPrice } from '../lib/units';
import { CustomProductDialog } from './CustomProductDialog';
import type { Product } from '../types';

export function ProductPanel({ onPlaced }: { onPlaced?: () => void }) {
  const customProducts = useStore((s) => s.customProducts);
  const addItem = useStore((s) => s.addItem);
  const removeCustomProduct = useStore((s) => s.removeCustomProduct);
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...customProducts, ...CATALOG].filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    const map = new Map<string, Product[]>();
    for (const p of all) map.set(p.category, [...(map.get(p.category) ?? []), p]);
    return Array.from(map.entries());
  }, [customProducts, query]);

  const place = (p: Product) => {
    addItem(p);
    onPlaced?.();
  };

  return (
    <>
      <div className="product-panel-head">
        <button type="button" className="primary block" onClick={() => setDialogOpen(true)}>
          + Eigen product toevoegen
        </button>
        <input type="search" placeholder="Zoeken…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Producten zoeken" />
        <p className="hint">Klik om te plaatsen, of sleep naar de plattegrond.</p>
      </div>
      <div className="panel-scroll">
        {groups.length === 0 && <p className="hint panel-section">Geen producten gevonden.</p>}
        {groups.map(([category, products]) => (
          <section key={category} className="product-group">
            <h4>{category}</h4>
            <ul>
              {products.map((p) => (
                <li key={p.id}>
                  <div
                    className="product-card"
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => writeProductDrag(e, p)}
                    onClick={() => place(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        place(p);
                      }
                    }}
                    title={`${p.name} plaatsen`}
                  >
                    <ProductIcon p={p} />
                    <div className="product-text">
                      <strong>{p.name}</strong>
                      <span className="hint">
                        {p.width} × {p.depth} × {p.height} cm
                        {p.priceCents !== undefined && ` · ${formatPrice(p.priceCents)}`}
                      </span>
                    </div>
                    {p.dimensionSource !== 'catalogus' && (
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label={`${p.name} uit bibliotheek verwijderen`}
                        title="Uit bibliotheek verwijderen (geplaatste items blijven staan)"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`"${p.name}" uit je bibliotheek verwijderen?`)) removeCustomProduct(p.id);
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {dialogOpen && <CustomProductDialog onClose={() => setDialogOpen(false)} onCreated={onPlaced} />}
    </>
  );
}

/** Klein bovenaanzicht in verhouding. */
function ProductIcon({ p }: { p: Product }) {
  const max = Math.max(p.width, p.depth);
  const w = (p.width / max) * 30;
  const d = (p.depth / max) * 30;
  return (
    <svg className="product-icon" width={34} height={34} viewBox="0 0 34 34" aria-hidden="true">
      <rect x={17 - w / 2} y={17 - d / 2} width={w} height={d} rx={2} fill={p.color} stroke="rgba(0,0,0,.35)" />
    </svg>
  );
}
