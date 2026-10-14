import { useEffect, useState } from 'react';

/**
 * Invoerveld dat pas bij Enter/blur doorgeeft, zodat tussentijdse invoer ("1,") niet stoort
 * en er per wijziging maar één undo-stap ontstaat.
 */
export function NumberField({
  label,
  value,
  onCommit,
  parse,
  format = (v) => String(v),
  suffix,
  min,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  parse: (s: string) => number;
  format?: (v: number) => string;
  suffix?: string;
  min?: number;
}) {
  const [text, setText] = useState(format(value));
  useEffect(() => setText(format(value)), [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    const v = parse(text);
    if (Number.isNaN(v) || (min !== undefined && v < min)) {
      setText(format(value));
      return;
    }
    if (v !== value) onCommit(v);
    else setText(format(value));
  };

  return (
    <label className="field">
      <span>{label}</span>
      <span className="input-wrap">
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </span>
    </label>
  );
}
