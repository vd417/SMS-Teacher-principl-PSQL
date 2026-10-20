import { keyboardOverlap } from '../useKeyboardInset';

test('reports the keyboard overlap when the visible viewport shrinks', () => {
  expect(keyboardOverlap(800, 460, 0)).toBe(340);
});

test('ignores the mobile browser address bar', () => {
  expect(keyboardOverlap(800, 760, 0)).toBe(0);
});

test('does not double-count a viewport that already scrolled', () => {
  expect(keyboardOverlap(800, 500, 300)).toBe(0);
});
