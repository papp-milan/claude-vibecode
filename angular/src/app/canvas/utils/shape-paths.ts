import { ShapeKind } from '../models/board-item.model';

const round = (n: number) => Math.round(n * 100) / 100;

type PathCmd = readonly [string, ...number[]];

/** Koordinaten sind in 0..100 angegeben und werden auf w x h skaliert. */
function scaled(w: number, h: number, cmds: readonly PathCmd[]): string {
  return cmds
    .map(([cmd, ...nums]) => {
      const coords = nums.map((n, i) => round(i % 2 === 0 ? (n * w) / 100 : (n * h) / 100));
      return coords.length ? `${cmd}${coords.join(' ')}` : cmd;
    })
    .join(' ');
}

const TRIANGLE: readonly PathCmd[] = [['M', 50, 0], ['L', 100, 100], ['L', 0, 100], ['Z']];
const DIAMOND: readonly PathCmd[] = [['M', 50, 0], ['L', 100, 50], ['L', 50, 100], ['L', 0, 50], ['Z']];
const HEXAGON: readonly PathCmd[] = [
  ['M', 25, 3], ['L', 75, 3], ['L', 100, 50], ['L', 75, 97], ['L', 25, 97], ['L', 0, 50], ['Z'],
];
const ARROW: readonly PathCmd[] = [
  ['M', 0, 30], ['L', 58, 30], ['L', 58, 5], ['L', 100, 50], ['L', 58, 95], ['L', 58, 70], ['L', 0, 70], ['Z'],
];
const HEART: readonly PathCmd[] = [
  ['M', 50, 92],
  ['C', 10, 62, 0, 38, 14, 20],
  ['C', 27, 4, 46, 10, 50, 27],
  ['C', 54, 10, 73, 4, 86, 20],
  ['C', 100, 38, 90, 62, 50, 92],
  ['Z'],
];
const BUBBLE: readonly PathCmd[] = [
  ['M', 10, 0], ['L', 90, 0], ['Q', 100, 0, 100, 10], ['L', 100, 62], ['Q', 100, 72, 90, 72],
  ['L', 38, 72], ['L', 18, 100], ['L', 24, 72], ['L', 10, 72], ['Q', 0, 72, 0, 62], ['L', 0, 10],
  ['Q', 0, 0, 10, 0], ['Z'],
];

export function shapePath(kind: ShapeKind, w: number, h: number): string {
  switch (kind) {
    case 'rect':
      return `M0 0 H${round(w)} V${round(h)} H0 Z`;
    case 'rounded': {
      const r = round(Math.min(w, h) * 0.2);
      return (
        `M${r} 0 H${round(w - r)} A${r} ${r} 0 0 1 ${round(w)} ${r} V${round(h - r)} ` +
        `A${r} ${r} 0 0 1 ${round(w - r)} ${round(h)} H${r} A${r} ${r} 0 0 1 0 ${round(h - r)} ` +
        `V${r} A${r} ${r} 0 0 1 ${r} 0 Z`
      );
    }
    case 'ellipse': {
      const rx = round(w / 2);
      const ry = round(h / 2);
      return `M0 ${ry} A${rx} ${ry} 0 1 0 ${round(w)} ${ry} A${rx} ${ry} 0 1 0 0 ${ry} Z`;
    }
    case 'star': {
      const points = Array.from({ length: 10 }, (_, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? 1 : 0.42;
        return `${round(w / 2 + (Math.cos(angle) * radius * w) / 2)} ${round(h / 2 + (Math.sin(angle) * radius * h) / 2)}`;
      });
      return `M${points.join(' L')} Z`;
    }
    case 'triangle':
      return scaled(w, h, TRIANGLE);
    case 'diamond':
      return scaled(w, h, DIAMOND);
    case 'hexagon':
      return scaled(w, h, HEXAGON);
    case 'arrow':
      return scaled(w, h, ARROW);
    case 'heart':
      return scaled(w, h, HEART);
    case 'bubble':
      return scaled(w, h, BUBBLE);
  }
}
