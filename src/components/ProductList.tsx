import { useStore } from '../store/useStore';
import { formatPrice } from '../lib/units';
import type { Product } from '../types';

interface Row {
  key: string;
  product: Product;
  count: number;
  ids: string[];
}

/** Groepeert identieke producten (zelfde naam, maten, link en prijs). */
function groupItems(items: { id: string; product: Product }[]): Row[] {
  const map = new Map<string, Row>();
  for (const it of items) {
    const p = it.product;
    const key = [p.name, p.width, p.depth, p.height, p.url ?? '', p.priceCents ?? ''].join('|');
    const row = map.get(key);
    if (row) {
      row.count++;
      row.ids.push(it.id);
    } else map.set(key, { key, product: p, count: 1, ids: [it.id] });
  }
  return Array.from(map.values());
}

export function ProductList() {
  const items = useStore((s) => s.items);
  const select = useStore((s) => s.select);
  const rows = groupItems(items);
  const total = items.reduce((sum, it) => sum + (it.product.priceCents ?? 0), 0);
  const withoutPrice = items.filter((it) => it.product.priceCents === undefined).length;

  if (!items.length) return <p className="hint panel-section">Nog geen producten geplaatst.</p>;

  return (
    <div className="panel-section">
      <table className="product-table">
        <thead>
          <tr>
            <th>Product</th>
            <th className="num">Aantal</th>
            <th className="num">Prijs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                <button type="button" className="link-btn row-name" onClick={() => select(r.ids[0])} title="Selecteren">
                  <span className="swatch small" style={{ background: r.product.color }} />
                  {r.product.name}
                </button>
                <div className="hint">
                  {r.product.width}×{r.product.depth}×{r.product.height} cm
                  {r.product.url && (
                    <>
                      {' · '}
                      <a href={r.product.url} target="_blank" rel="noopener noreferrer">
                        link ↗
                      </a>
                    </>
                  )}
                </div>
              </td>
              <td className="num">{r.count}×</td>
              <td className="num">{r.product.priceCents !== undefined ? formatPrice(r.product.priceCents * r.count) : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>Totaal</th>
            <th className="num">{items.length}</th>
            <th className="num">{formatPrice(total)}</th>
          </tr>
        </tfoot>
      </table>
      {withoutPrice > 0 && <p className="hint">{withoutPrice} item(s) zonder prijs tellen niet mee in het totaal.</p>}
    </div>
  );
}
