export const PEN_KINDS = ['pen', 'brush', 'marker', 'highlighter'] as const;
export type PenKind = (typeof PEN_KINDS)[number];

export const SHAPE_KINDS = [
  'rect',
  'rounded',
  'ellipse',
  'triangle',
  'diamond',
  'star',
  'hexagon',
  'arrow',
  'heart',
  'bubble',
] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];

export type StrokePoint = [x: number, y: number, pressure: number];

/** Freihand-Strich. Die Punkte liegen lokal, `x`/`y` ist die Verschiebung des ganzen Strichs. */
export interface StrokeItem {
  type: 'stroke';
  id: string;
  kind: PenKind;
  color: string;
  size: number;
  x: number;
  y: number;
  points: StrokePoint[];
  /** Fertig berechneter SVG-Pfad (Umriss des Strichs). */
  path: string;
}

export interface ShapeItem {
  type: 'shape';
  id: string;
  shape: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string | null;
  stroke: string;
  strokeWidth: number;
}

export interface LineItem {
  type: 'line';
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  arrow: boolean;
  color: string;
  size: number;
}

/** Textfeld bzw. Haftnotiz mit Markdown-Inhalt. */
export interface TextItem {
  type: 'text';
  id: string;
  variant: 'text' | 'note';
  x: number;
  y: number;
  w: number;
  h: number;
  markdown: string;
  color: string;
  background: string | null;
}

export interface ImageItem {
  type: 'image';
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** data:-URL (png, jpeg, gif oder webp). */
  src: string;
}

export type BoxItem = ShapeItem | TextItem | ImageItem;
export type BoardItem = StrokeItem | ShapeItem | LineItem | TextItem | ImageItem;

export function isBoxItem(item: BoardItem): item is BoxItem {
  return item.type === 'shape' || item.type === 'text' || item.type === 'image';
}
