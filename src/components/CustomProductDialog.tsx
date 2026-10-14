import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Modal } from './ui/Modal';
import { parseCm, parsePriceToCents } from '../lib/units';
import { isValidUrl } from '../lib/productLink';

const PRESET_COLORS = ['#8b5e3c', '#c9b79c', '#e8e2d6', '#6b7a8f', '#374151', '#9ca3af', '#4d7c0f', '#b91c1c', '#1d4ed8', '#f59e0b'];

export function CustomProductDialog({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const addCustomProduct = useStore((s) => s.addCustomProduct);
  const addItem = useStore((s) => s.addItem);

  const [name, setName] = useState('');
  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [height, setHeight] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [url, setUrl] = useState('');
  const [price, setPrice] = useState('');
  const [placeNow, setPlaceNow] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    const w = parseCm(width);
    const d = parseCm(depth);
    const h = parseCm(height);
    if (!name.trim()) errs.push('Geef het product een naam.');
    if ([w, d, h].some((v) => Number.isNaN(v) || v < 1 || v > 2000)) errs.push('Breedte, diepte en hoogte moeten tussen 1 en 2000 cm liggen.');
    const link = url.trim();
    if (link && !isValidUrl(link)) errs.push('De productlink moet beginnen met http:// of https://');
    const priceCents = parsePriceToCents(price);
    if (Number.isNaN(priceCents)) errs.push('Vul een geldige prijs in, bijv. 249,95.');
    setErrors(errs);
    if (errs.length) return;

    const product = addCustomProduct({
      name: name.trim(),
      width: w,
      depth: d,
      height: h,
      color,
      url: link || undefined,
      priceCents,
    });
    if (placeNow) addItem(product);
    onCreated?.();
    onClose();
  };

  return (
    <Modal
      title="Eigen product toevoegen"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}>
            Annuleren
          </button>
          <button type="submit" form="custom-product-form" className="primary">
            Opslaan
          </button>
        </>
      }
    >
      <form id="custom-product-form" onSubmit={submit}>
        <label className="field">
          <span>Naam</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Boekenkast Billy" />
        </label>
        <div className="field-row three">
          <label className="field">
            <span>Breedte</span>
            <span className="input-wrap">
              <input inputMode="numeric" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="80" />
              <span className="suffix">cm</span>
            </span>
          </label>
          <label className="field">
            <span>Diepte</span>
            <span className="input-wrap">
              <input inputMode="numeric" value={depth} onChange={(e) => setDepth(e.target.value)} placeholder="28" />
              <span className="suffix">cm</span>
            </span>
          </label>
          <label className="field">
            <span>Hoogte</span>
            <span className="input-wrap">
              <input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="202" />
              <span className="suffix">cm</span>
            </span>
          </label>
        </div>

        <div className="field">
          <span>Kleur</span>
          <div className="color-row">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-dot${c === color ? ' active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Kleur ${c}`}
              />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Eigen kleur" />
          </div>
        </div>

        <label className="field">
          <span>Productlink (optioneel)</span>
          <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
        {/* Later: hier komt een knop "Maten uit link halen" die `linkImporters` (lib/productLink.ts) gebruikt. */}
        <p className="hint">De link wordt alleen opgeslagen; maten worden (nog) niet automatisch uitgelezen.</p>

        <label className="field">
          <span>Prijs (optioneel)</span>
          <span className="input-wrap">
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
            <span className="suffix">€</span>
          </span>
        </label>

        <label className="check">
          <input type="checkbox" checked={placeNow} onChange={(e) => setPlaceNow(e.target.checked)} />
          Direct in de ruimte plaatsen
        </label>

        {errors.map((er) => (
          <div key={er} className="alert">
            {er}
          </div>
        ))}
      </form>
    </Modal>
  );
}
