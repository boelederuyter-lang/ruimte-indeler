import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './useStore';
import { CATALOG } from '../data/catalog';

describe('store', () => {
  beforeEach(() => {
    useStore.getState().newDesign('Test', { width: 400, length: 500, height: 260 });
  });

  it('plaatst, draait, verwijdert en ondersteunt ongedaan maken/opnieuw', () => {
    const s = useStore.getState;
    const id = s().addItem(CATALOG[0]);
    expect(s().items).toHaveLength(1);
    expect(s().selectedId).toBe(id);

    s().rotateItem(id);
    expect(s().items[0].rotation).toBe(90);

    s().removeItem(id);
    expect(s().items).toHaveLength(0);

    s().undo();
    expect(s().items).toHaveLength(1);
    s().undo();
    expect(s().items[0].rotation).toBe(0);
    s().redo();
    expect(s().items[0].rotation).toBe(90);
  });

  it('slepen geeft één undo-stap via checkpoint', () => {
    const s = useStore.getState;
    const id = s().addItem(CATALOG[0]);
    const startX = s().items[0].x;
    s().checkpoint();
    s().dragItem(id, 200, 200);
    s().dragItem(id, 250, 260);
    expect(s().items[0].x).not.toBe(startX);
    s().undo();
    expect(s().items[0].x).toBe(startX);
  });

  it('past openingen aan als de ruimte kleiner wordt', () => {
    const s = useStore.getState;
    s().setRoomSize({ width: 200, length: 300, height: 250 });
    for (const o of s().room.openings) {
      const len = o.wall === 'noord' || o.wall === 'zuid' ? 200 : 300;
      expect(o.offset + o.width).toBeLessThanOrEqual(len);
    }
  });
});
