import { BoardItem, PenKind } from './board-item.model';

export type Tool =
  | 'select'
  | 'pan'
  | PenKind
  | 'eraser'
  | 'shape'
  | 'line'
  | 'arrow'
  | 'text'
  | 'note';

export const PEN_TOOLS: readonly Tool[] = ['pen', 'brush', 'marker', 'highlighter'];

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface ViewportSize {
  w: number;
  h: number;
}

/** Lineal: liegt im Bildschirm-Raum (nicht im Board), Winkel in Radiant. */
export interface RulerState {
  visible: boolean;
  cx: number;
  cy: number;
  angle: number;
}

export type BoardBackground = 'dark' | 'light';

export interface BoardFile {
  version: number;
  background: BoardBackground;
  items: BoardItem[];
}
