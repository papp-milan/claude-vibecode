import { BOARD_BACKGROUNDS } from '../constants/canvas.constants';
import { MARKDOWN_CSS, TEXT_BOX_CSS } from '../constants/markdown-styles';
import { BoardItem, TextItem } from '../models/board-item.model';
import { BoardBackground } from '../models/tool.model';
import { itemBounds, lineGeometry, unionRects } from './geometry';
import { renderMarkdown } from './markdown';
import { shapePath } from './shape-paths';
import { PEN_STYLES } from './stroke-path';

export interface ExportResult {
  svg: string;
  width: number;
  height: number;
}

const EXPORT_PADDING = 32;

const esc = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** HTML -> wohlgeformtes XHTML (nötig, damit der SVG-Text als Bild geladen werden kann). */
function markdownToXhtml(markdown: string): string {
  const doc = new DOMParser().parseFromString(
    `<div class="sbx-md">${renderMarkdown(markdown)}</div>`,
    'text/html',
  );
  const el = doc.body.firstElementChild;
  return el ? new XMLSerializer().serializeToString(el) : '';
}

function textToSvg(item: TextItem): string {
  const style = `${item.background ? `background:${esc(item.background)};` : ''}color:${esc(item.color)};`;
  return (
    `<foreignObject x="${item.x}" y="${item.y}" width="${item.w}" height="${item.h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" class="text-box${item.variant === 'note' ? ' note' : ''}" style="${style}">` +
    `${markdownToXhtml(item.markdown)}</div></foreignObject>`
  );
}

function itemToSvg(item: BoardItem): string {
  switch (item.type) {
    case 'stroke':
      return (
        `<path d="${item.path}" transform="translate(${item.x} ${item.y})" ` +
        `fill="${esc(item.color)}" opacity="${PEN_STYLES[item.kind].opacity}"/>`
      );
    case 'shape':
      return (
        `<path d="${shapePath(item.shape, item.w, item.h)}" transform="translate(${item.x} ${item.y})" ` +
        `fill="${item.fill ? esc(item.fill) : 'none'}" stroke="${esc(item.stroke)}" ` +
        `stroke-width="${item.strokeWidth}" stroke-linejoin="round"/>`
      );
    case 'line': {
      const g = lineGeometry(item);
      return (
        `<line x1="${item.x1}" y1="${item.y1}" x2="${g.x2}" y2="${g.y2}" stroke="${esc(item.color)}" ` +
        `stroke-width="${item.size}" stroke-linecap="round"/>` +
        (g.head ? `<path d="${g.head}" fill="${esc(item.color)}"/>` : '')
      );
    }
    case 'text':
      return textToSvg(item);
    case 'image':
      return (
        `<image href="${esc(item.src)}" x="${item.x}" y="${item.y}" width="${item.w}" ` +
        `height="${item.h}" preserveAspectRatio="none"/>`
      );
  }
}

/** Baut ein eigenständiges SVG aller Elemente. Liefert null, wenn das Board leer ist. */
export function buildExportSvg(
  items: readonly BoardItem[],
  background: BoardBackground,
): ExportResult | null {
  const bounds = unionRects(items.map(itemBounds));
  if (!bounds) {
    return null;
  }
  const x = Math.floor(bounds.x - EXPORT_PADDING);
  const y = Math.floor(bounds.y - EXPORT_PADDING);
  const width = Math.ceil(bounds.w + EXPORT_PADDING * 2);
  const height = Math.ceil(bounds.h + EXPORT_PADDING * 2);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">` +
    `<style><![CDATA[${MARKDOWN_CSS}${TEXT_BOX_CSS}]]></style>` +
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${BOARD_BACKGROUNDS[background]}"/>` +
    items.map(itemToSvg).join('') +
    `</svg>`;
  return { svg, width, height };
}

export async function svgToPngBlob(result: ExportResult, scale = 2): Promise<Blob> {
  const maxSide = 16384;
  const factor = Math.min(scale, maxSide / Math.max(result.width, result.height));
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(result.svg);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('SVG konnte nicht gerendert werden'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(result.width * factor);
  canvas.height = Math.round(result.height * factor);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas nicht verfügbar');
  }
  ctx.scale(factor, factor);
  ctx.drawImage(img, 0, 0, result.width, result.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG-Erstellung fehlgeschlagen'))), 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
