import { useMemo } from 'react';
import { computeWarnings, type ItemWarning } from '../lib/geometry';
import { useStore } from './useStore';

export function useWarnings(): Map<string, ItemWarning> {
  const items = useStore((s) => s.items);
  const width = useStore((s) => s.room.width);
  const length = useStore((s) => s.room.length);
  return useMemo(() => computeWarnings(items, { width, length }), [items, width, length]);
}

export function useSelectedItem() {
  return useStore((s) => s.items.find((i) => i.id === s.selectedId) ?? null);
}
