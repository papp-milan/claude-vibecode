import { DEFAULT_PEN_COLOR } from '../constants/canvas.constants';
import {
  BoardItem,
  PEN_KINDS,
  PenKind,
  SHAPE_KINDS,
  ShapeKind,
  StrokePoint,
} from '../models/board-item.model';
import { BoardBackground, BoardFile } from '../models/tool.model';
import { normalizeHex } from './color';
import { newId } from './ids';
import { buildStrokePath } from './stroke-path';

export const BOARD_FILE_VERSION = 1;
const MAX_ITEMS = 5000;
const MAX_POINTS = 50000;
/** Entspricht den Bildtypen, die Angular in URL-Bindings als sicher durchlässt. */
const IMAGE_SRC = /^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/]+=*$/i;

export function serializeBoard(items: readonly BoardItem[], background: BoardBackground): string {
  const file: BoardFile = { version: BOARD_FILE_VERSION, background, items: [...items] };
  return JSON.stringify(file, null, 2);
}

export function parseBoard(text: string): BoardFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  if (!isRecord(raw) || !Array.isArray(raw['items'])) {
    throw new Error('Das ist keine Canvas-Datei.');
  }
  const items = (raw['items'] as unknown[])
    .slice(0, MAX_ITEMS)
    .map(sanitizeItem)
    .filter((item): item is BoardItem => item !== null);
  const background: BoardBackground = raw['background'] === 'light' ? 'light' : 'dark';
  return { version: BOARD_FILE_VERSION, background, items };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const color = (v: unknown, fallback: string): string =>
  typeof v === 'string' ? (normalizeHex(v) ?? fallback) : fallback;

function sanitizeItem(raw: unknown): BoardItem | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = newId();

  switch (raw['type']) {
    case 'stroke': {
      const kind: PenKind = PEN_KINDS.includes(raw['kind'] as PenKind) ? (raw['kind'] as PenKind) : 'pen';
      const size = Math.min(100, Math.max(1, num(raw['size'], 4)));
      const rawPoints: unknown[] = Array.isArray(raw['points']) ? raw['points'].slice(0, MAX_POINTS) : [];
      const points = rawPoints
        .map((p) =>
          Array.isArray(p) ? ([num(p[0]), num(p[1]), num(p[2], 0.5)] as StrokePoint) : null,
        )
        .filter((p): p is StrokePoint => p !== null);
      if (!points.length) {
        return null;
      }
      return {
        type: 'stroke',
        id,
        kind,
        color: color(raw['color'], DEFAULT_PEN_COLOR),
        size,
        x: num(raw['x']),
        y: num(raw['y']),
        points,
        path: buildStrokePath(points, kind, size, true),
      };
    }
    case 'shape': {
      const shape: ShapeKind = SHAPE_KINDS.includes(raw['shape'] as ShapeKind)
        ? (raw['shape'] as ShapeKind)
        : 'rect';
      return {
        type: 'shape',
        id,
        shape,
        x: num(raw['x']),
        y: num(raw['y']),
        w: Math.max(1, num(raw['w'], 100)),
        h: Math.max(1, num(raw['h'], 100)),
        fill: raw['fill'] === null || raw['fill'] === undefined ? null : color(raw['fill'], '#ffffff'),
        stroke: color(raw['stroke'], DEFAULT_PEN_COLOR),
        strokeWidth: Math.min(100, Math.max(0, num(raw['strokeWidth'], 4))),
      };
    }
    case 'line':
      return {
        type: 'line',
        id,
        x1: num(raw['x1']),
        y1: num(raw['y1']),
        x2: num(raw['x2']),
        y2: num(raw['y2']),
        arrow: raw['arrow'] === true,
        color: color(raw['color'], DEFAULT_PEN_COLOR),
        size: Math.min(100, Math.max(1, num(raw['size'], 4))),
      };
    case 'text':
      return {
        type: 'text',
        id,
        variant: raw['variant'] === 'note' ? 'note' : 'text',
        x: num(raw['x']),
        y: num(raw['y']),
        w: Math.max(24, num(raw['w'], 280)),
        h: Math.max(24, num(raw['h'], 120)),
        markdown: typeof raw['markdown'] === 'string' ? raw['markdown'].slice(0, 100000) : '',
        color: color(raw['color'], '#fafafa'),
        background:
          raw['background'] === null || raw['background'] === undefined
            ? null
            : color(raw['background'], '#fff59d'),
      };
    case 'image': {
      const src = raw['src'];
      if (typeof src !== 'string' || !IMAGE_SRC.test(src)) {
        return null;
      }
      return {
        type: 'image',
        id,
        x: num(raw['x']),
        y: num(raw['y']),
        w: Math.max(8, num(raw['w'], 200)),
        h: Math.max(8, num(raw['h'], 200)),
        src,
      };
    }
    default:
      return null;
  }
}
