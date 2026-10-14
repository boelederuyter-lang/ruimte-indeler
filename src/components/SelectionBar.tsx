import { useStore } from '../store/useStore';
import { useSelectedItem, useWarnings } from '../store/selectors';
import { footprint } from '../lib/geometry';

/** Zwevende balk met snelle acties voor het geselecteerde meubel (handig op mobiel). */
export function SelectionBar({ onDetails }: { onDetails: () => void }) {
  const item = useSelectedItem();
  const rotateItem = useStore((s) => s.rotateItem);
  const removeItem = useStore((s) => s.removeItem);
  const warnings = useWarnings();
  if (!item) return null;
  const { w, d } = footprint(item.product, item.rotation);
  const warn = warnings.get(item.id);
  const bad = warn?.overlap || warn?.outside;
  return (
    <div className={`selection-bar${bad ? ' bad' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
      <div className="sel-info">
        <strong>{item.product.name}</strong>
        <span>
          {w}×{d}×{item.product.height} cm{bad ? ' · ⚠ ' + (warn?.outside ? 'buiten muren' : 'overlap') : ''}
        </span>
      </div>
      <button type="button" onClick={() => rotateItem(item.id)} title="Draai 90° (R)" aria-label="Draai 90 graden">
        ⟳
      </button>
      <button type="button" onClick={onDetails} title="Details" aria-label="Details">
        ⓘ
      </button>
      <button type="button" className="danger" onClick={() => removeItem(item.id)} title="Verwijderen (Del)" aria-label="Verwijderen">
        🗑
      </button>
    </div>
  );
}
