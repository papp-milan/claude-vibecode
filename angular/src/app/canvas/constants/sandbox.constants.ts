import { ShapeKind } from '../models/board-item.model';
import { BoardBackground, Tool } from '../models/tool.model';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const MIN_ITEM_SIZE = 24;
export const HISTORY_LIMIT = 100;
export const DRAFT_ID = '__draft__';

export const DEFAULT_PEN_COLOR = '#4fc3f7';
export const NOTE_DEFAULT_COLOR = '#fff59d';

export const BOARD_BACKGROUNDS: Record<BoardBackground, string> = {
  dark: '#1b1f24',
  light: '#f7f7f4',
};

/** 1 cm in CSS-Pixeln (exakt so definiert, daher stimmen CSS-`cm` und TS überein). */
export const CM_PX = 96 / 2.54;
export const RULER_LENGTH_CM = 20;
export const RULER_THICKNESS_CM = 2.5;
export const RULER_LENGTH = RULER_LENGTH_CM * CM_PX;
export const RULER_THICKNESS = RULER_THICKNESS_CM * CM_PX;
/** Bis zu diesem Abstand (Bildschirm-Pixel) rastet ein Strich an der Lineal-Kante ein. */
export const RULER_SNAP_DISTANCE = 22;

export interface ToolDef {
  tool: Tool;
  icon: string;
  label: string;
  /** Tastenkürzel (Großbuchstabe). */
  key: string;
  dividerBefore?: boolean;
}

export const TOOLS: readonly ToolDef[] = [
  { tool: 'select', icon: 'near_me', label: 'Auswählen', key: 'V' },
  { tool: 'pan', icon: 'pan_tool', label: 'Board verschieben', key: 'H' },
  { tool: 'pen', icon: 'edit', label: 'Fineliner', key: 'P', dividerBefore: true },
  { tool: 'brush', icon: 'brush', label: 'Pinsel', key: 'B' },
  { tool: 'marker', icon: 'border_color', label: 'Marker', key: 'M' },
  { tool: 'highlighter', icon: 'highlight', label: 'Textmarker', key: 'Y' },
  { tool: 'eraser', icon: 'ink_eraser', label: 'Radierer', key: 'E' },
  { tool: 'line', icon: 'horizontal_rule', label: 'Linie', key: 'L', dividerBefore: true },
  { tool: 'arrow', icon: 'north_east', label: 'Pfeil', key: 'A' },
  { tool: 'text', icon: 'title', label: 'Text (Markdown)', key: 'T' },
  { tool: 'note', icon: 'sticky_note_2', label: 'Notiz (Markdown)', key: 'N' },
];

export const SHAPE_OPTIONS: readonly { kind: ShapeKind; label: string }[] = [
  { kind: 'rect', label: 'Rechteck' },
  { kind: 'rounded', label: 'Abgerundetes Rechteck' },
  { kind: 'ellipse', label: 'Ellipse' },
  { kind: 'triangle', label: 'Dreieck' },
  { kind: 'diamond', label: 'Raute' },
  { kind: 'star', label: 'Stern' },
  { kind: 'hexagon', label: 'Sechseck' },
  { kind: 'arrow', label: 'Pfeil' },
  { kind: 'heart', label: 'Herz' },
  { kind: 'bubble', label: 'Sprechblase' },
];
