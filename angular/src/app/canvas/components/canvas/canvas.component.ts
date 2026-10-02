import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SHAPE_OPTIONS, TOOLS } from '../../constants/canvas.constants';
import { PEN_TOOLS } from '../../models/tool.model';
import { BoardCanvasComponent } from '../board-canvas/board-canvas.component';
import { ColorPickerComponent } from '../color-picker/color-picker.component';
import {ShapeKind} from '../../models/board-item.model';
import {BoardStore} from '../../services/board-store.service';
import {parseBoard, serializeBoard} from '../../utils/board-file';
import {ShapePathPipe} from '../../pipes/shape-path.pipe';
import {buildExportSvg, downloadBlob, svgToPngBlob} from '../../utils/export';

@Component({
  selector: 'app-canvas',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSliderModule,
    MatTooltipModule,
    BoardCanvasComponent,
    ColorPickerComponent,
    ShapePathPipe,
  ],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasComponent {
  protected readonly store = inject(BoardStore);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly tools = TOOLS;
  protected readonly shapes = SHAPE_OPTIONS;

  /** Füllfarbe ist für Formen, Notizen und Textfelder relevant. */
  protected readonly showFill = computed(() => {
    const tool = this.store.tool();
    if (tool === 'shape' || tool === 'note') return true;
    return this.store.selectedItems().some((i) => i.type === 'shape' || i.type === 'text');
  });

  protected readonly showSize = computed(() => {
    const tool = this.store.tool();
    if (PEN_TOOLS.includes(tool) || tool === 'shape' || tool === 'line' || tool === 'arrow') return true;
    return this.store
      .selectedItems()
      .some((i) => i.type === 'stroke' || i.type === 'shape' || i.type === 'line');
  });

  protected readonly zoomLabel = computed(() => `${Math.round(this.store.view().zoom * 100)} %`);

  protected chooseShape(kind: ShapeKind): void {
    this.store.shapeKind.set(kind);
    this.store.tool.set('shape');
  }

  protected onColor(value: string | null): void {
    if (value) this.store.setColor(value);
  }

  protected onFill(value: string | null): void {
    this.store.setFill(value);
  }

  protected toggleBackground(): void {
    this.store.background.update((b) => (b === 'dark' ? 'light' : 'dark'));
  }

  protected clearBoard(): void {
    if (this.store.items().length && confirm('Das gesamte Board leeren? (Rückgängig mit Strg+Z möglich)')) {
      this.store.clear();
    }
  }

  protected async onImagePicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    const errors = await this.store.addImageFiles(files);
    if (errors.length) this.notify(errors.join(' · '));
  }

  protected async onImportPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      this.store.loadFile(parseBoard(await file.text()));
      this.notify('Board importiert.');
    } catch (error) {
      this.notify(error instanceof Error ? error.message : 'Import fehlgeschlagen.');
    }
  }

  protected exportJson(): void {
    const json = serializeBoard(this.store.items(), this.store.background());
    downloadBlob(new Blob([json], { type: 'application/json' }), 'canvas.json');
  }

  protected async exportPng(): Promise<void> {
    const result = buildExportSvg(this.store.items(), this.store.background());
    if (!result) {
      this.notify('Das Board ist leer.');
      return;
    }
    try {
      downloadBlob(await svgToPngBlob(result, 2), 'canvas.png');
    } catch {
      this.notify('PNG-Export fehlgeschlagen.');
    }
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 5000 });
  }
}
