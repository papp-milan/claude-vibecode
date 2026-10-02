import { getStroke } from 'perfect-freehand';
import { PenKind, StrokePoint } from '../models/board-item.model';

export interface PenStyle {
  sizeFactor: number;
  thinning: number;
  smoothing: number;
  streamline: number;
  opacity: number;
  taper: boolean;
}

export const PEN_STYLES: Record<PenKind, PenStyle> = {
  pen: { sizeFactor: 1, thinning: 0.5, smoothing: 0.5, streamline: 0.5, opacity: 1, taper: false },
  brush: { sizeFactor: 2.2, thinning: 0.85, smoothing: 0.6, streamline: 0.45, opacity: 1, taper: true },
  marker: { sizeFactor: 2.5, thinning: 0, smoothing: 0.5, streamline: 0.55, opacity: 1, taper: false },
  highlighter: { sizeFactor: 5, thinning: 0, smoothing: 0.5, streamline: 0.6, opacity: 0.35, taper: false },
};

export const penWidth = (kind: PenKind, size: number): number => size * PEN_STYLES[kind].sizeFactor;

const round = (n: number) => Math.round(n * 100) / 100;

/** Wandelt die Punkte eines Strichs in einen gefüllten SVG-Umriss um. */
export function buildStrokePath(
  points: readonly StrokePoint[],
  kind: PenKind,
  size: number,
  complete = true,
): string {
  if (!points.length) {
    return '';
  }
  const style = PEN_STYLES[kind];
  const width = penWidth(kind, size);
  // Maus liefert konstant 0.5 -> Druck simulieren, Stift/Touch liefern echte Werte.
  const realPressure = points.some((p) => p[2] > 0 && p[2] !== 0.5);

  const outline = getStroke([...points], {
    size: width,
    thinning: style.thinning,
    smoothing: style.smoothing,
    streamline: style.streamline,
    simulatePressure: !realPressure,
    last: complete,
    start: { taper: style.taper ? width * 1.5 : 0 },
    end: { taper: style.taper ? width * 3 : 0 },
  });
  return outlineToPath(outline);
}

function outlineToPath(outline: number[][]): string {
  if (outline.length < 3) {
    return '';
  }
  const d: (string | number)[] = ['M', round(outline[0][0]), round(outline[0][1]), 'Q'];
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d.push(round(x0), round(y0), round((x0 + x1) / 2), round((y0 + y1) / 2));
  }
  d.push('Z');
  return d.join(' ');
}
