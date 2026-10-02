import { Injectable, computed, signal } from '@angular/core';
import {
  DEFAULT_PEN_COLOR,
  HISTORY_LIMIT,
  MAX_ZOOM,
  MIN_ZOOM,
  NOTE_DEFAULT_COLOR,
} from '../constants/canvas.constants';
import { BoardItem, ShapeKind, TextItem } from '../models/board-item.model';
import { Point } from '../models/geometry.model';
import {
  BoardBackground,
  BoardFile,
  RulerState,
  Tool,
  Viewport,
  ViewportSize,
} from '../models/tool.model';
import { contrastColor } from '../utils/color';
import { itemBounds, translateItem, unionRects } from '../utils/geometry';
import { newId } from '../utils/ids';
import { loadImageFile } from '../utils/images';
import { buildStrokePath } from '../utils/stroke-path';

type Snapshot = readonly BoardItem[];

/**
 * Zustand des Whiteboards. `providedIn: 'root'`: das Board bleibt beim Tab-Wechsel
 * erhalten, geht aber beim Neuladen der Seite verloren (nur im Speicher).
 */
@Injectable({ providedIn: 'root' })
export class BoardStore {
  readonly items = signal<readonly BoardItem[]>([]);
  readonly selection = signal<ReadonlySet<string>>(new Set<string>());
  readonly editingId = signal<string | null>(null);

  readonly tool = signal<Tool>('select');
  readonly shapeKind = signal<ShapeKind>('rect');
  readonly color = signal(DEFAULT_PEN_COLOR);
  readonly fill = signal<string | null>(null);
  readonly size = signal(4);
  readonly recentColors = signal<readonly string[]>([]);

  readonly view = signal<Viewport>({ x: 0, y: 0, zoom: 1 });
  readonly viewportSize = signal<ViewportSize>({ w: 800, h: 600 });
  readonly background = signal<BoardBackground>('dark');
  readonly ruler = signal<RulerState>({ visible: false, cx: 400, cy: 300, angle: 0 });

  private readonly undoStack = signal<readonly Snapshot[]>([]);
  private readonly redoStack = signal<readonly Snapshot[]>([]);
  private lastStyleCheckpoint = 0;

  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);
  readonly selectedItems = computed(() => {
    const selected = this.selection();
    return this.items().filter((item) => selected.has(item.id));
  });

  // ---------- Verlauf ----------

  /** Merkt den aktuellen Stand für Undo. Vor jeder Änderung einmal aufrufen. */
  checkpoint(): void {
    this.undoStack.update((stack) => [...stack.slice(-(HISTORY_LIMIT - 1)), this.items()]);
    this.redoStack.set([]);
  }

  undo(): void {
    const stack = this.undoStack();
    const previous = stack.at(-1);
    if (!previous) return;
    this.undoStack.set(stack.slice(0, -1));
    this.redoStack.update((redo) => [...redo, this.items()]);
    this.items.set(previous);
    this.editingId.set(null);
    this.pruneSelection();
  }

  redo(): void {
    const stack = this.redoStack();
    const next = stack.at(-1);
    if (!next) return;
    this.redoStack.set(stack.slice(0, -1));
    this.undoStack.update((undo) => [...undo, this.items()]);
    this.items.set(next);
    this.editingId.set(null);
    this.pruneSelection();
  }

  // ---------- Elemente ----------

  /** Ersetzt die Elemente ohne Verlaufseintrag (für laufende Gesten). */
  setItems(items: readonly BoardItem[]): void {
    this.items.set(items);
  }

  addItem(item: BoardItem, options: { select?: boolean } = {}): void {
    this.checkpoint();
    this.items.update((items) => [...items, item]);
    if (options.select) {
      this.selection.set(new Set([item.id]));
    }
  }

  removeItem(id: string): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
    this.pruneSelection();
  }

  removeSelected(): void {
    const selected = this.selection();
    if (!selected.size) return;
    this.checkpoint();
    this.items.update((items) => items.filter((item) => !selected.has(item.id)));
    this.selection.set(new Set());
    this.editingId.set(null);
  }

  duplicateSelected(): void {
    const selected = this.selectedItems();
    if (!selected.length) return;
    this.checkpoint();
    const clones = selected.map((item) => translateItem({ ...item, id: newId() }, 24, 24));
    this.items.update((items) => [...items, ...clones]);
    this.selection.set(new Set(clones.map((c) => c.id)));
  }

  bringToFront(): void {
    this.reorder(true);
  }

  sendToBack(): void {
    this.reorder(false);
  }

  private reorder(toFront: boolean): void {
    const selected = this.selection();
    if (!selected.size) return;
    this.checkpoint();
    this.items.update((items) => {
      const picked = items.filter((i) => selected.has(i.id));
      const rest = items.filter((i) => !selected.has(i.id));
      return toFront ? [...rest, ...picked] : [...picked, ...rest];
    });
  }

  selectAll(): void {
    this.selection.set(new Set(this.items().map((i) => i.id)));
  }

  pruneSelection(): void {
    const existing = new Set(this.items().map((i) => i.id));
    const kept = [...this.selection()].filter((id) => existing.has(id));
    if (kept.length !== this.selection().size) {
      this.selection.set(new Set(kept));
    }
  }

  clear(): void {
    if (!this.items().length) return;
    this.checkpoint();
    this.items.set([]);
    this.selection.set(new Set());
    this.editingId.set(null);
  }

  addText(variant: 'text' | 'note', at: Point, markdown = ''): TextItem {
    const note = variant === 'note';
    const background = note ? (this.fill() ?? NOTE_DEFAULT_COLOR) : null;
    const lines = markdown ? markdown.split('\n').length : 0;
    const item: TextItem = {
      type: 'text',
      id: newId(),
      variant,
      x: at.x,
      y: at.y,
      w: note ? 240 : markdown ? 360 : 280,
      h: note ? 200 : Math.max(96, Math.min(640, 48 + lines * 26)),
      markdown,
      color: background ? contrastColor(background) : this.color(),
      background,
    };
    this.addItem(item, { select: true });
    if (!markdown) {
      this.editingId.set(item.id);
    }
    this.tool.set('select');
    return item;
  }

  /** Fügt Bilddateien ein. Gibt Fehlermeldungen zurück (leer = alles gut). */
  async addImageFiles(files: readonly File[], at?: Point): Promise<string[]> {
    const errors: string[] = [];
    const center = at ?? this.viewportCenterWorld();
    const added: BoardItem[] = [];

    for (const [index, file] of files.entries()) {
      try {
        const image = await loadImageFile(file);
        const scale = Math.min(1, 480 / image.width, 480 / image.height);
        const w = Math.max(32, Math.round(image.width * scale));
        const h = Math.max(32, Math.round(image.height * scale));
        added.push({
          type: 'image',
          id: newId(),
          x: center.x - w / 2 + index * 24,
          y: center.y - h / 2 + index * 24,
          w,
          h,
          src: image.src,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'konnte nicht geladen werden';
        errors.push(`${file.name || 'Bild'}: ${reason}`);
      }
    }

    if (added.length) {
      this.checkpoint();
      this.items.update((items) => [...items, ...added]);
      this.selection.set(new Set(added.map((a) => a.id)));
      this.tool.set('select');
    }
    return errors;
  }

  // ---------- Stil (wirkt auf Auswahl und auf neue Elemente) ----------

  setColor(hex: string): void {
    this.color.set(hex);
    this.remember(hex);
    this.styleSelection((item) => {
      switch (item.type) {
        case 'stroke':
        case 'line':
        case 'text':
          return { ...item, color: hex };
        case 'shape':
          return { ...item, stroke: hex };
        default:
          return item;
      }
    });
  }

  setFill(hex: string | null): void {
    this.fill.set(hex);
    if (hex) this.remember(hex);
    this.styleSelection((item) => {
      if (item.type === 'shape') {
        return { ...item, fill: hex };
      }
      if (item.type === 'text') {
        const background = item.variant === 'note' ? (hex ?? NOTE_DEFAULT_COLOR) : hex;
        return {
          ...item,
          background,
          color: item.variant === 'note' && background ? contrastColor(background) : item.color,
        };
      }
      return item;
    });
  }

  setSize(size: number): void {
    this.size.set(size);
    this.styleSelection((item) => {
      switch (item.type) {
        case 'stroke':
          return { ...item, size, path: buildStrokePath(item.points, item.kind, size, true) };
        case 'shape':
          return { ...item, strokeWidth: size };
        case 'line':
          return { ...item, size };
        default:
          return item;
      }
    });
  }

  private styleSelection(fn: (item: BoardItem) => BoardItem): void {
    const selected = this.selection();
    if (!selected.size) return;
    // Slider/Farbwahl feuern viele Events -> nur ein Verlaufseintrag pro Interaktion.
    const now = Date.now();
    if (now - this.lastStyleCheckpoint > 800) {
      this.checkpoint();
    }
    this.lastStyleCheckpoint = now;
    this.items.update((items) => items.map((item) => (selected.has(item.id) ? fn(item) : item)));
  }

  private remember(hex: string): void {
    this.recentColors.update((list) => [hex, ...list.filter((c) => c !== hex)].slice(0, 8));
  }

  // ---------- Ansicht ----------

  zoomAt(factor: number, focus: Point): void {
    const v = this.view();
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
    const k = zoom / v.zoom;
    this.view.set({ zoom, x: focus.x - (focus.x - v.x) * k, y: focus.y - (focus.y - v.y) * k });
  }

  zoomBy(factor: number): void {
    const size = this.viewportSize();
    this.zoomAt(factor, { x: size.w / 2, y: size.h / 2 });
  }

  resetView(): void {
    this.view.set({ x: 0, y: 0, zoom: 1 });
  }

  fitToContent(): void {
    const bounds = unionRects(this.items().map(itemBounds));
    if (!bounds) {
      this.resetView();
      return;
    }
    const size = this.viewportSize();
    const padding = 64;
    const zoom = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min(
          size.w / (bounds.w + padding * 2),
          size.h / (bounds.h + padding * 2),
          2,
        ),
      ),
    );
    this.view.set({
      zoom,
      x: size.w / 2 - (bounds.x + bounds.w / 2) * zoom,
      y: size.h / 2 - (bounds.y + bounds.h / 2) * zoom,
    });
  }

  viewportCenterWorld(): Point {
    const v = this.view();
    const size = this.viewportSize();
    return { x: (size.w / 2 - v.x) / v.zoom, y: (size.h / 2 - v.y) / v.zoom };
  }

  toggleRuler(): void {
    const ruler = this.ruler();
    if (ruler.visible) {
      this.ruler.set({ ...ruler, visible: false });
      return;
    }
    const size = this.viewportSize();
    this.ruler.set({ visible: true, cx: size.w / 2, cy: size.h / 2, angle: 0 });
  }

  // ---------- Datei ----------

  loadFile(file: BoardFile): void {
    this.checkpoint();
    this.items.set(file.items);
    this.background.set(file.background);
    this.selection.set(new Set());
    this.editingId.set(null);
    this.fitToContent();
  }
}
