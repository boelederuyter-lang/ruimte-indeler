import { useStore } from '../store/useStore';
import { useSelectedItem, useWarnings } from '../store/selectors';
import { footprint, itemRect, wallDistances } from '../lib/geometry';
import { formatDims, formatPrice, parseCm } from '../lib/units';
import { NumberField } from './ui/NumberField';

export function Inspector() {
  const item = useSelectedItem();
  const room = useStore((s) => s.room);
  const items = useStore((s) => s.items);
  const setItemPosition = useStore((s) => s.setItemPosition);
  const rotateItem = useStore((s) => s.rotateItem);
  const removeItem = useStore((s) => s.removeItem);
  const duplicateItem = useStore((s) => s.duplicateItem);
  const select = useStore((s) => s.select);
  const warnings = useWarnings();

  if (!item) {
    return (
      <div className="panel-section">
        <p className="hint">
          Selecteer een meubel op de plattegrond of in 3D om de maten, de afstand tot de muren en de positie te zien.
        </p>
        <p className="hint">
          Sneltoetsen: <kbd>R</kbd> draaien, <kbd>Del</kbd> verwijderen, pijltjes verschuiven, <kbd>Ctrl</kbd>+<kbd>Z</kbd> ongedaan maken.
        </p>
      </div>
    );
  }

  const { product } = item;
  const r = itemRect(item);
  const { w, d } = footprint(product, item.rotation);
  const dist = wallDistances(r, room);
  const warn = warnings.get(item.id);
  const overlapNames = (warn?.overlapsWith ?? []).map((id) => items.find((i) => i.id === id)?.product.name ?? '?');

  return (
    <div className="panel-section">
      <div className="inspector-title">
        <span className="swatch" style={{ background: product.color }} />
        <div>
          <h3>{product.name}</h3>
          <div className="hint">{formatDims(product.width, product.depth, product.height)} (b × d × h)</div>
        </div>
      </div>

      {warn?.outside && <div className="alert">⚠ Dit meubel valt (deels) buiten de muren.</div>}
      {warn?.overlap && <div className="alert">⚠ Overlapt met: {overlapNames.join(', ')}</div>}

      <h4>Afstand tot de muren</h4>
      <div className="distance-grid">
        <div />
        <div className="dist">↑ {Math.round(dist.noord)} cm</div>
        <div />
        <div className="dist">← {Math.round(dist.west)} cm</div>
        <div className="dist-center">
          {w}×{d}
        </div>
        <div className="dist">{Math.round(dist.oost)} cm →</div>
        <div />
        <div className="dist">↓ {Math.round(dist.zuid)} cm</div>
        <div />
      </div>

      <h4>Positie (linkerbovenhoek)</h4>
      <div className="field-row">
        <NumberField label="Vanaf links" value={r.x0} parse={parseCm} suffix="cm" onCommit={(v) => setItemPosition(item.id, v + w / 2, item.y)} />
        <NumberField label="Vanaf boven" value={r.y0} parse={parseCm} suffix="cm" onCommit={(v) => setItemPosition(item.id, item.x, v + d / 2)} />
      </div>
      <p className="hint">Draaiing: {item.rotation}°</p>

      <div className="button-row">
        <button type="button" onClick={() => rotateItem(item.id)}>
          ⟳ Draai 90°
        </button>
        <button type="button" onClick={() => duplicateItem(item.id)}>
          ⧉ Dupliceren
        </button>
        <button type="button" className="danger" onClick={() => removeItem(item.id)}>
          🗑 Verwijderen
        </button>
      </div>

      {(product.url || product.priceCents !== undefined) && (
        <>
          <h4>Product</h4>
          {product.priceCents !== undefined && <p>Prijs: {formatPrice(product.priceCents)}</p>}
          {product.url && (
            <p className="link-line">
              <a href={product.url} target="_blank" rel="noopener noreferrer">
                Bekijk product ↗
              </a>
            </p>
          )}
        </>
      )}

      <button type="button" className="link-btn" onClick={() => select(null)}>
        Selectie opheffen
      </button>
    </div>
  );
}
