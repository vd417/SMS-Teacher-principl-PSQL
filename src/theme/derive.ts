import { Colors } from './colors';

export interface ColorSet {
  color: string;
  colorSoft: string;
  colorTint: string;
}

const PALETTE: ColorSet[] = [
  { color: Colors.pink, colorSoft: Colors.pinkSoft, colorTint: Colors.pinkTint },
  { color: Colors.coral, colorSoft: Colors.coralSoft, colorTint: Colors.coralTint },
  { color: Colors.blue, colorSoft: Colors.blueSoft, colorTint: Colors.blueTint },
  { color: Colors.teal, colorSoft: Colors.tealSoft, colorTint: Colors.tealTint },
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function deriveColorSet(id: string): ColorSet {
  return PALETTE[hash(id) % PALETTE.length];
}
