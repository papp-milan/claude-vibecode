import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  DRAFT_ID,
  RULER_LENGTH,
  RULER_LENGTH_CM,
  RULER_SNAP_DISTANCE,
  RULER_THICKNESS,
  TOOLS,
} from '../../constants/canvas.constants';
import {
  BoardItem,
  BoxItem,
  PenKind,
  StrokeItem,
  StrokePoint,
  TextItem,
  isBoxItem,
} from '../../models/board-item.model';
import { Point, Rect } from '../../models/geometry.model';
import { ResizeHandle } from '../../models/tool.model';
import { BoardStore } from '../../services/board-store.service';
import { ShapePathPipe } from '../../pipes/shape-path.pipe';
import {
  hitTest,
  itemBounds,
  lineGeometry,
  normalizeRect,
  rectsIntersect,
  resizeRect,
  translateItem,
  unionRects,
  withRect,
} from '../../utils/geometry';
import { newId } from '../../utils/ids';
import { PEN_STYLES, buildStrokePath } from '../../utils/stroke-path';
import { MarkdownViewComponent } from '../markdown-view/markdown-view.component';
import {TEXT_BOX_CSS} from '../../constants/markdown-styles';

type CreateTool = 'shape' | 'line' | 'arrow';

interface RulerLock {
  side: 1 | -1;
}

interface PanGesture {
  type: 'pan';
  startX: number;
  startY: number;
  viewX: number;
  viewY: number;
}
interface MoveGesture {
  type: 'move';
  start: Point;
  origin: ReadonlyMap<string, BoardItem>;
  moved: boolean;
}
interface ResizeGesture {
  type: 'resize';
  handle: ResizeHandle;
  start: Point;
  origin: BoxItem;
  moved: boolean;
}
interface MarqueeGesture {
  type: 'marquee';
  start: Point;
  base: ReadonlySet<string>;
}
interface DrawGesture {
  type: 'draw';
  penKind: PenKind;
  color: string;
  size: number;
  points: StrokePoint[];
  lock: RulerLock | null;
}
interface CreateGesture {
  type: 'create';
  tool: CreateTool;
  start: Point;
  current: Point;
  lock: RulerLock | null;
}
interface EraseGesture {
  type: 'erase';
  checkpointed: boolean;
}
interface RulerGesture {
  type: 'ruler';
  mode: 'move' | 'rotate';
  offset: Point;
}
type Gesture =
  | PanGesture
  | MoveGesture
  | ResizeGesture
  | MarqueeGesture
  | DrawGesture
  | CreateGesture
  | EraseGesture
  | RulerGesture;

const ALL_HANDLES: readonly ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const CORNER_HANDLES: readonly ResizeHandle[] = ['nw', 'ne', 'se', 'sw'];
const SELECTION_PADDING = 4;

@Component({
  selector: 'app-board-canvas',
  imports: [MatIconModule, MarkdownViewComponent, ShapePathPipe],
  templateUrl: './board-canvas.component.html',
  styleUrl: './board-canvas.component.scss',
  styles: [TEXT_BOX_CSS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onKeyDown($event)',
    '(window:keyup)': 'onKeyUp($event)',
    '(window:paste)': 'onPaste($event)',
    '(window:blur)': 'spaceDown.set(false)',
  },
})
export class BoardCanvasComponent {
  protected readonly store = inject(BoardStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');

  protected readonly spaceDown = signal(false);
  protected readonly dropActive = signal(false);
  protected readonly marquee = signal<Rect | null>(null);
  private readonly draft = signal<BoardItem | null>(null);

  private gesture: Gesture | null = null;
  private lastPointer: Point | null = null;

  protected readonly rulerMarks = Array.from({ length: RULER_LENGTH_CM - 1 }, (_, i) => i + 1);

  /** Gespeicherte Elemente plus das Element, das gerade aufgezogen wird. */
  protected readonly renderItems = computed<readonly BoardItem[]>(() => {
    const draft = this.draft();
    return draft ? [...this.store.items(), draft] : this.store.items();
  });

  protected readonly worldTransform = computed(() => {
    const v = this.store.view();
    return `translate(${v.x} ${v.y}) scale(${v.zoom})`;
  });

  protected readonly gridStep = computed(() => {
    let step = 32 * this.store.view().zoom;
    while (step < 14) step *= 2;
    return step;
  });

  protected readonly gridPosition = computed(() => {
    const v = this.store.view();
    const step = this.gridStep();
    const mod = (n: number) => ((n % step) + step) % step;
    return `${mod(v.x)}px ${mod(v.y)}px`;
  });

  protected readonly selectionBox = computed(() => {
    const selected = this.store.selectedItems();
    if (!selected.length || this.store.editingId()) return null;
    const rect = unionRects(selected.map(itemBounds));
    if (!rect) return null;
    const v = this.store.view();
    const single = selected.length === 1 ? selected[0] : null;
    const handles: readonly ResizeHandle[] =
      single && isBoxItem(single) ? (single.type === 'image' ? CORNER_HANDLES : ALL_HANDLES) : [];
    return {
      left: rect.x * v.zoom + v.x - SELECTION_PADDING,
      top: rect.y * v.zoom + v.y - SELECTION_PADDING,
      width: rect.w * v.zoom + SELECTION_PADDING * 2,
      height: rect.h * v.zoom + SELECTION_PADDING * 2,
      handles,
    };
  });

  protected readonly rulerTransform = computed(() => {
    const r = this.store.ruler();
    return `translate(${r.cx - RULER_LENGTH / 2}px, ${r.cy - RULER_THICKNESS / 2}px) rotate(${r.angle}rad)`;
  });

  constructor() {
    afterNextRender(() => {
      const el = this.host().nativeElement;
      const update = () => this.store.viewportSize.set({ w: el.clientWidth, h: el.clientHeight });
      update();
      const observer = new ResizeObserver(update);
      observer.observe(el);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  // ---------- Template-Helfer ----------

  protected translate(x: number, y: number): string {
    return `translate(${x} ${y})`;
  }

  protected strokeOpacity(kind: PenKind): number {
    return PEN_STYLES[kind].opacity;
  }

  protected lineGeometry = lineGeometry;

  // ---------- Koordinaten ----------

  private local(event: { clientX: number; clientY: number }): Point {
    const rect = this.host().nativeElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private toWorld(p: Point): Point {
    const v = this.store.view();
    return { x: (p.x - v.x) / v.zoom, y: (p.y - v.y) / v.zoom };
  }

  private capture(event: PointerEvent): void {
    this.host().nativeElement.setPointerCapture(event.pointerId);
  }

  private topItemAt(world: Point): BoardItem | null {
    const tolerance = 6 / this.store.view().zoom;
    const items = this.store.items();
    for (let i = items.length - 1; i >= 0; i--) {
      if (hitTest(items[i], world, tolerance)) return items[i];
    }
    return null;
  }

  // ---------- Zeiger ----------

  protected onPointerDown(event: PointerEvent): void {
    const target = event.target as Element | null;
    if (target?.closest('textarea') || event.button === 2) return;

    const tool = this.store.tool();
    // Links in Textfeldern sollen sich normal öffnen lassen.
    if (tool === 'select' && event.button === 0 && target?.closest('a[href]')) return;

    const screen = this.local(event);
    this.lastPointer = screen;
    if (this.store.editingId()) this.stopEditing();

    if (event.button === 1 || tool === 'pan' || this.spaceDown()) {
      event.preventDefault();
      this.capture(event);
      const v = this.store.view();
      this.gesture = { type: 'pan', startX: screen.x, startY: screen.y, viewX: v.x, viewY: v.y };
      return;
    }

    const world = this.toWorld(screen);
    switch (tool) {
      case 'select':
        this.beginSelect(event, world, screen);
        break;
      case 'pen':
      case 'brush':
      case 'marker':
      case 'highlighter':
        this.beginDraw(event, tool, screen);
        break;
      case 'eraser': {
        this.capture(event);
        const gesture: EraseGesture = { type: 'erase', checkpointed: false };
        this.gesture = gesture;
        this.eraseAt(world, gesture);
        break;
      }
      case 'shape':
      case 'line':
      case 'arrow':
        this.beginCreate(event, tool, screen);
        break;
      case 'text':
      case 'note':
        event.preventDefault();
        this.store.addText(tool, world);
        this.focusEditor();
        break;
    }
  }

  private beginSelect(event: PointerEvent, world: Point, screen: Point): void {
    this.capture(event);
    const hit = this.topItemAt(world);
    if (hit) {
      const current = new Set(this.store.selection());
      if (event.shiftKey && current.has(hit.id)) {
        current.delete(hit.id);
        this.store.selection.set(current);
        return;
      }
      if (event.shiftKey) {
        current.add(hit.id);
      } else if (!current.has(hit.id)) {
        current.clear();
        current.add(hit.id);
      }
      this.store.selection.set(current);
      const origin = new Map(
        this.store
          .items()
          .filter((i) => current.has(i.id))
          .map((i) => [i.id, i] as const),
      );
      this.gesture = { type: 'move', start: world, origin, moved: false };
    } else {
      const base = event.shiftKey ? new Set(this.store.selection()) : new Set<string>();
      this.store.selection.set(base);
      this.gesture = { type: 'marquee', start: screen, base };
      this.marquee.set({ x: screen.x, y: screen.y, w: 0, h: 0 });
    }
  }

  private beginDraw(event: PointerEvent, penKind: PenKind, screen: Point): void {
    this.capture(event);
    const snap = this.rulerSnap(screen, null);
    const world = this.toWorld(snap.point);
    const gesture: DrawGesture = {
      type: 'draw',
      penKind,
      color: this.store.color(),
      size: this.store.size(),
      points: [[world.x, world.y, this.pressureOf(event)]],
      lock: snap.lock,
    };
    this.gesture = gesture;
    this.draft.set(this.strokeFrom(gesture, false));
    this.store.selection.set(new Set());
  }

  private beginCreate(event: PointerEvent, tool: CreateTool, screen: Point): void {
    this.capture(event);
    // Nur Linien/Pfeile rasten am Lineal ein.
    const snap = tool === 'shape' ? { point: screen, lock: null } : this.rulerSnap(screen, null);
    const start = this.toWorld(snap.point);
    const gesture: CreateGesture = { type: 'create', tool, start, current: start, lock: snap.lock };
    this.gesture = gesture;
    this.store.selection.set(new Set());
    this.draft.set(this.createDraft(gesture));
  }

  protected onPointerMove(event: PointerEvent): void {
    const screen = this.local(event);
    this.lastPointer = screen;
    const g = this.gesture;
    if (!g) return;
    const zoom = this.store.view().zoom;

    switch (g.type) {
      case 'pan':
        this.store.view.update((v) => ({
          ...v,
          x: g.viewX + screen.x - g.startX,
          y: g.viewY + screen.y - g.startY,
        }));
        break;

      case 'move': {
        const world = this.toWorld(screen);
        const dx = world.x - g.start.x;
        const dy = world.y - g.start.y;
        if (!g.moved) {
          if (Math.hypot(dx, dy) * zoom < 3) break;
          g.moved = true;
          this.store.checkpoint();
        }
        this.store.setItems(
          this.store.items().map((item) => {
            const origin = g.origin.get(item.id);
            return origin ? translateItem(origin, dx, dy) : item;
          }),
        );
        break;
      }

      case 'resize': {
        const world = this.toWorld(screen);
        const dx = world.x - g.start.x;
        const dy = world.y - g.start.y;
        if (!g.moved) {
          if (Math.hypot(dx, dy) * zoom < 2) break;
          g.moved = true;
          this.store.checkpoint();
        }
        const rect = resizeRect(
          itemBounds(g.origin),
          g.handle,
          dx,
          dy,
          g.origin.type === 'image' || event.shiftKey,
        );
        this.store.setItems(
          this.store.items().map((item) => (item.id === g.origin.id ? withRect(g.origin, rect) : item)),
        );
        break;
      }

      case 'marquee': {
        const rect = normalizeRect(g.start, screen);
        this.marquee.set(rect);
        const v = this.store.view();
        const area: Rect = {
          x: (rect.x - v.x) / v.zoom,
          y: (rect.y - v.y) / v.zoom,
          w: rect.w / v.zoom,
          h: rect.h / v.zoom,
        };
        const ids = new Set(g.base);
        for (const item of this.store.items()) {
          if (rectsIntersect(itemBounds(item), area)) ids.add(item.id);
        }
        this.store.selection.set(ids);
        break;
      }

      case 'draw': {
        for (const e of this.eventsOf(event)) {
          const point = g.lock ? this.rulerSnap(this.local(e), g.lock).point : this.local(e);
          const world = this.toWorld(point);
          const last = g.points.at(-1);
          if (last && Math.hypot(world.x - last[0], world.y - last[1]) * zoom < 0.5) continue;
          g.points.push([world.x, world.y, this.pressureOf(e)]);
        }
        this.draft.set(this.strokeFrom(g, false));
        break;
      }

      case 'create': {
        const point = g.lock ? this.rulerSnap(screen, g.lock).point : screen;
        let world = this.toWorld(point);
        if (event.shiftKey) world = this.constrain(g, world);
        g.current = world;
        this.draft.set(this.createDraft(g));
        break;
      }

      case 'erase':
        for (const e of this.eventsOf(event)) {
          this.eraseAt(this.toWorld(this.local(e)), g);
        }
        break;

      case 'ruler': {
        if (g.mode === 'move') {
          this.store.ruler.update((r) => ({ ...r, cx: screen.x - g.offset.x, cy: screen.y - g.offset.y }));
        } else {
          this.store.ruler.update((r) => {
            let angle = Math.atan2(screen.y - r.cy, screen.x - r.cx);
            if (event.shiftKey) {
              const step = Math.PI / 12;
              angle = Math.round(angle / step) * step;
            }
            return { ...r, angle };
          });
        }
        break;
      }
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    const g = this.gesture;
    this.gesture = null;
    try {
      this.host().nativeElement.releasePointerCapture(event.pointerId);
    } catch {
      // Capture war bereits freigegeben.
    }
    if (!g) return;

    switch (g.type) {
      case 'draw': {
        const stroke = this.strokeFrom(g, true);
        this.draft.set(null);
        if (stroke.path) this.store.addItem(stroke);
        break;
      }
      case 'create':
        this.commitCreate(g);
        break;
      case 'marquee':
        this.marquee.set(null);
        break;
      default:
        break;
    }
  }

  private eventsOf(event: PointerEvent): PointerEvent[] {
    const list = event.getCoalescedEvents?.();
    return list && list.length ? list : [event];
  }

  private pressureOf(event: PointerEvent): number {
    return event.pointerType === 'mouse' ? 0.5 : event.pressure || 0.5;
  }

  // ---------- Zeichnen & Erzeugen ----------

  private strokeFrom(g: DrawGesture, complete: boolean): StrokeItem {
    return {
      type: 'stroke',
      id: complete ? newId() : DRAFT_ID,
      kind: g.penKind,
      color: g.color,
      size: g.size,
      x: 0,
      y: 0,
      points: g.points,
      path: buildStrokePath(g.points, g.penKind, g.size, complete),
    };
  }

  private createDraft(g: CreateGesture): BoardItem {
    if (g.tool === 'shape') {
      const rect = normalizeRect(g.start, g.current);
      return {
        type: 'shape',
        id: DRAFT_ID,
        shape: this.store.shapeKind(),
        x: rect.x,
        y: rect.y,
        w: Math.max(rect.w, 2),
        h: Math.max(rect.h, 2),
        fill: this.store.fill(),
        stroke: this.store.color(),
        strokeWidth: this.store.size(),
      };
    }
    return {
      type: 'line',
      id: DRAFT_ID,
      x1: g.start.x,
      y1: g.start.y,
      x2: g.current.x,
      y2: g.current.y,
      arrow: g.tool === 'arrow',
      color: this.store.color(),
      size: this.store.size(),
    };
  }

  /** Shift: Formen werden quadratisch, Linien rasten in 15°-Schritten ein. */
  private constrain(g: CreateGesture, point: Point): Point {
    const dx = point.x - g.start.x;
    const dy = point.y - g.start.y;
    if (g.tool === 'shape') {
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      return { x: g.start.x + (dx < 0 ? -d : d), y: g.start.y + (dy < 0 ? -d : d) };
    }
    const length = Math.hypot(dx, dy);
    const step = Math.PI / 12;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    return { x: g.start.x + Math.cos(angle) * length, y: g.start.y + Math.sin(angle) * length };
  }

  private commitCreate(g: CreateGesture): void {
    this.draft.set(null);
    const zoom = this.store.view().zoom;
    const dragged = Math.hypot(g.current.x - g.start.x, g.current.y - g.start.y) * zoom >= 4;
    const draft = this.createDraft(g);

    let item: BoardItem | null = null;
    if (draft.type === 'shape') {
      // Einfacher Klick ohne Ziehen: Standardgröße um den Klickpunkt.
      item = dragged
        ? { ...draft, id: newId() }
        : { ...draft, id: newId(), x: g.start.x - 80, y: g.start.y - 60, w: 160, h: 120 };
    } else if (dragged) {
      item = { ...draft, id: newId() };
    }
    if (item) {
      this.store.addItem(item, { select: true });
      this.store.tool.set('select');
    }
  }

  private eraseAt(world: Point, g: EraseGesture): void {
    const tolerance = 8 / this.store.view().zoom;
    const items = this.store.items();
    const remaining = items.filter((item) => !hitTest(item, world, tolerance));
    if (remaining.length === items.length) return;
    if (!g.checkpointed) {
      this.store.checkpoint();
      g.checkpointed = true;
    }
    this.store.setItems(remaining);
    this.store.pruneSelection();
  }

  // ---------- Lineal ----------

  /**
   * Rastet einen Punkt an der Lineal-Kante ein. Ohne `lock` wird nur eingerastet, wenn der
   * Punkt nahe an einer langen Kante liegt; mit `lock` bleibt der Strich an dieser Kante.
   */
  private rulerSnap(
    screen: Point,
    lock: RulerLock | null,
  ): { point: Point; lock: RulerLock | null } {
    const r = this.store.ruler();
    if (!r.visible) return { point: screen, lock: null };

    const cos = Math.cos(r.angle);
    const sin = Math.sin(r.angle);
    const dx = screen.x - r.cx;
    const dy = screen.y - r.cy;
    const along = dx * cos + dy * sin;
    const across = -dx * sin + dy * cos;
    const half = RULER_THICKNESS / 2;

    let side: 1 | -1;
    if (lock) {
      side = lock.side;
    } else {
      if (Math.abs(along) > RULER_LENGTH / 2) return { point: screen, lock: null };
      if (Math.abs(Math.abs(across) - half) > RULER_SNAP_DISTANCE) return { point: screen, lock: null };
      side = across < 0 ? -1 : 1;
    }

    const clamped = Math.max(-RULER_LENGTH / 2, Math.min(RULER_LENGTH / 2, along));
    const edge = side * half;
    return {
      point: { x: r.cx + clamped * cos - edge * sin, y: r.cy + clamped * sin + edge * cos },
      lock: { side },
    };
  }

  protected onRulerDown(event: PointerEvent, mode: 'move' | 'rotate'): void {
    event.stopPropagation();
    event.preventDefault();
    this.capture(event);
    const screen = this.local(event);
    const r = this.store.ruler();
    this.gesture = { type: 'ruler', mode, offset: { x: screen.x - r.cx, y: screen.y - r.cy } };
  }

  protected closeRuler(): void {
    this.store.ruler.update((r) => ({ ...r, visible: false }));
  }

  // ---------- Auswahl-Griffe ----------

  protected onHandleDown(event: PointerEvent, handle: ResizeHandle): void {
    event.stopPropagation();
    event.preventDefault();
    const selected = this.store.selectedItems();
    const item = selected[0];
    if (selected.length !== 1 || !item || !isBoxItem(item)) return;
    this.capture(event);
    this.gesture = {
      type: 'resize',
      handle,
      start: this.toWorld(this.local(event)),
      origin: item,
      moved: false,
    };
  }

  // ---------- Zoom ----------

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta =
      event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 100 : event.deltaY;
    const factor = Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.0015));
    this.store.zoomAt(factor, this.local(event));
  }

  // ---------- Text bearbeiten ----------

  protected onDoubleClick(event: MouseEvent): void {
    if (this.store.tool() !== 'select') return;
    if ((event.target as Element).closest('textarea, a[href]')) return;
    const world = this.toWorld(this.local(event));
    const hit = this.topItemAt(world);
    if (hit?.type === 'text') {
      this.startEditing(hit.id);
    } else if (!hit) {
      this.store.addText('text', world);
      this.focusEditor();
    }
  }

  private startEditing(id: string): void {
    this.store.selection.set(new Set([id]));
    this.store.checkpoint();
    this.store.editingId.set(id);
    this.focusEditor();
  }

  private focusEditor(): void {
    afterNextRender(
      () => {
        const area = this.host().nativeElement.querySelector<HTMLTextAreaElement>('textarea');
        if (area) {
          area.focus();
          area.setSelectionRange(area.value.length, area.value.length);
        }
      },
      { injector: this.injector },
    );
  }

  protected stopEditing(): void {
    const id = this.store.editingId();
    if (!id) return;
    this.store.editingId.set(null);
    const item = this.store.items().find((i) => i.id === id);
    if (item?.type === 'text' && !item.markdown.trim()) {
      this.store.removeItem(id);
      return;
    }
    afterNextRender(() => this.fitTextHeight(id), { injector: this.injector });
  }

  protected onEditorInput(item: TextItem, event: Event): void {
    const area = event.target as HTMLTextAreaElement;
    const box = area.closest<HTMLElement>('.text-box');
    const style = box ? getComputedStyle(box) : null;
    const padding = style ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) : 0;
    const needed = Math.ceil(area.scrollHeight + padding);
    this.store.setItems(
      this.store
        .items()
        .map((i) =>
          i.id === item.id && i.type === 'text' ? { ...i, markdown: area.value, h: Math.max(i.h, needed) } : i,
        ),
    );
  }

  protected onEditorKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.stopEditing();
    }
  }

  /** Vergrößert ein Textfeld nach dem Bearbeiten, falls der gerenderte Inhalt höher ist. */
  private fitTextHeight(id: string): void {
    const content = this.host().nativeElement.querySelector<HTMLElement>(`[data-md-id="${id}"] .sbx-md`);
    const box = content?.closest<HTMLElement>('.text-box');
    if (!content || !box) return;
    const style = getComputedStyle(box);
    const needed = Math.ceil(content.offsetHeight + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom));
    this.store.setItems(
      this.store.items().map((i) => (i.id === id && i.type === 'text' && needed > i.h ? { ...i, h: needed } : i)),
    );
  }

  // ---------- Tastatur ----------

  protected onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing =
      !!target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable);

    if (event.key === 'Escape') {
      this.onEscape();
      return;
    }
    if (typing) return;

    if (event.code === 'Space') {
      if (target?.tagName === 'BUTTON') return;
      event.preventDefault();
      this.spaceDown.set(true);
      return;
    }

    const key = event.key.toLowerCase();
    if (event.ctrlKey || event.metaKey) {
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) this.store.redo();
        else this.store.undo();
      } else if (key === 'y') {
        event.preventDefault();
        this.store.redo();
      } else if (key === 'd') {
        event.preventDefault();
        this.store.duplicateSelected();
      } else if (key === 'a') {
        event.preventDefault();
        this.store.selectAll();
      }
      return;
    }

    if (key === 'delete' || key === 'backspace') {
      event.preventDefault();
      this.store.removeSelected();
      return;
    }
    if (key === 'enter') {
      const selected = this.store.selectedItems();
      if (selected.length === 1 && selected[0].type === 'text') {
        event.preventDefault();
        this.startEditing(selected[0].id);
      }
      return;
    }
    if (key === 'r') {
      this.store.toggleRuler();
      return;
    }
    const tool = TOOLS.find((t) => t.key.toLowerCase() === key);
    if (tool) this.store.tool.set(tool.tool);
  }

  protected onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space') this.spaceDown.set(false);
  }

  private onEscape(): void {
    if (this.store.editingId()) {
      this.stopEditing();
      (document.activeElement as HTMLElement | null)?.blur();
      return;
    }
    if (this.store.tool() !== 'select') {
      this.store.tool.set('select');
      return;
    }
    this.store.selection.set(new Set());
  }

  // ---------- Einfügen & Drag-and-drop ----------

  protected onPaste(event: ClipboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable)) {
      return;
    }
    const data = event.clipboardData;
    if (!data) return;

    const at = this.lastPointer ? this.toWorld(this.lastPointer) : undefined;
    const images = Array.from(data.files).filter((f) => f.type.startsWith('image/'));
    if (images.length) {
      event.preventDefault();
      void this.insertImages(images, at);
      return;
    }
    const text = data.getData('text/plain').trim();
    if (text) {
      event.preventDefault();
      this.store.addText('text', at ?? this.store.viewportCenterWorld(), text);
    }
  }

  protected onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.dropActive.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    if (!this.host().nativeElement.contains(event.relatedTarget as Node | null)) {
      this.dropActive.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dropActive.set(false);
    const images = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    void this.insertImages(images, this.toWorld(this.local(event)));
  }

  private async insertImages(files: File[], at?: Point): Promise<void> {
    const errors = await this.store.addImageFiles(files, at);
    if (errors.length) {
      this.snackBar.open(errors.join(' · '), 'OK', { duration: 6000 });
    }
  }
}
