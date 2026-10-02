import { MIN_ITEM_SIZE } from '../constants/canvas.constants';
import { BoardItem, BoxItem, LineItem } from '../models/board-item.model';
import { Point, Rect } from '../models/geometry.model';
import { ResizeHandle } from '../models/tool.model';
import { penWidth } from './stroke-path';

const round = (n: number) => Math.round(n * 100) / 100;

export function itemBounds(item: BoardItem): Rect {
  switch (item.type) {
    case 'stroke': {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [x, y] of item.points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      if (!Number.isFinite(minX)) {
        return { x: item.x, y: item.y, w: 0, h: 0 };
      }
      const pad = penWidth(item.kind, item.size) / 2;
      return {
        x: item.x + minX - pad,
        y: item.y + minY - pad,
        w: maxX - minX + pad * 2,
        h: maxY - minY + pad * 2,
      };
    }
    case 'line': {
      const pad = Math.max(item.size / 2, item.arrow ? Math.max(14, item.size * 4.5) / 2 : 0);
      const x = Math.min(item.x1, item.x2) - pad;
      const y = Math.min(item.y1, item.y2) - pad;
      return {
        x,
        y,
        w: Math.abs(item.x2 - item.x1) + pad * 2,
        h: Math.abs(item.y2 - item.y1) + pad * 2,
      };
    }
    default:
      return { x: item.x, y: item.y, w: item.w, h: item.h };
  }
}

export function translateItem(item: BoardItem, dx: number, dy: number): BoardItem {
  if (item.type === 'line') {
    return { ...item, x1: item.x1 + dx, y1: item.y1 + dy, x2: item.x2 + dx, y2: item.y2 + dy };
  }
  return { ...item, x: item.x + dx, y: item.y + dy };
}

export function withRect(item: BoxItem, rect: Rect): BoxItem {
  return { ...item, x: rect.x, y: rect.y, w: rect.w, h: rect.h };
}

export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** `tol` ist die zusätzliche Treffertoleranz in Board-Einheiten. */
export function hitTest(item: BoardItem, p: Point, tol: number): boolean {
  switch (item.type) {
    case 'stroke': {
      const half = penWidth(item.kind, item.size) / 2 + tol;
      const lx = p.x - item.x;
      const ly = p.y - item.y;
      const pts = item.points;
      if (pts.length === 1) {
        return Math.hypot(lx - pts[0][0], ly - pts[0][1]) <= half;
      }
      for (let i = 1; i < pts.length; i++) {
        if (distanceToSegment(lx, ly, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= half) {
          return true;
        }
      }
      return false;
    }
    case 'line':
      return distanceToSegment(p.x, p.y, item.x1, item.y1, item.x2, item.y2) <= item.size / 2 + tol;
    default:
      return (
        p.x >= item.x - tol &&
        p.x <= item.x + item.w + tol &&
        p.y >= item.y - tol &&
        p.y <= item.y + item.h + tol
      );
  }
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
}

export function unionRects(rects: readonly Rect[]): Rect | null {
  if (!rects.length) {
    return null;
  }
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function normalizeRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

export function resizeRect(
  orig: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  keepAspect: boolean,
): Rect {
  const west = handle.includes('w');
  const east = handle.includes('e');
  const north = handle.includes('n');
  const south = handle.includes('s');

  let { x, y, w, h } = orig;
  if (east) w = orig.w + dx;
  if (west) w = orig.w - dx;
  if (south) h = orig.h + dy;
  if (north) h = orig.h - dy;

  if (keepAspect && orig.h > 0) {
    const ratio = orig.w / orig.h;
    if (east || west) {
      h = w / ratio;
    } else {
      w = h * ratio;
    }
  }

  w = Math.max(MIN_ITEM_SIZE, w);
  h = Math.max(MIN_ITEM_SIZE, h);
  if (west) x = orig.x + orig.w - w;
  if (north) y = orig.y + orig.h - h;
  return { x, y, w, h };
}

export interface LineGeometry {
  x2: number;
  y2: number;
  /** SVG-Pfad der Pfeilspitze (leer, wenn es keine Pfeillinie ist). */
  head: string;
}

/** Endpunkt der Linie (bei Pfeilen zur Basis der Spitze verkürzt) und Pfad der Spitze. */
export function lineGeometry(line: LineItem): LineGeometry {
  if (!line.arrow) {
    return { x2: line.x2, y2: line.y2, head: '' };
  }
  const length = Math.max(14, line.size * 4.5);
  const angle = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);
  const spread = Math.PI / 7;
  const ax = line.x2 - length * Math.cos(angle - spread);
  const ay = line.y2 - length * Math.sin(angle - spread);
  const bx = line.x2 - length * Math.cos(angle + spread);
  const by = line.y2 - length * Math.sin(angle + spread);
  const base = length * Math.cos(spread) * 0.9;
  return {
    x2: round(line.x2 - Math.cos(angle) * base),
    y2: round(line.y2 - Math.sin(angle) * base),
    head: `M${round(line.x2)} ${round(line.y2)} L${round(ax)} ${round(ay)} L${round(bx)} ${round(by)} Z`,
  };
}
