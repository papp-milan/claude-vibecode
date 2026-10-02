import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSliderModule } from '@angular/material/slider';
import {hexToRgb, normalizeHex, rgbToHex} from '../../utils/color';
import {PALETTES} from '../../constants/palettes';

@Component({
  selector: 'app-color-picker',
  imports: [MatButtonToggleModule, MatSliderModule],
  templateUrl: './color-picker.component.html',
  styleUrl: './color-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPickerComponent {
  /** Aktuelle Farbe als #rrggbb, oder null (= keine Füllung). */
  readonly value = input.required<string | null>();
  readonly allowNone = input(false);
  readonly recent = input<readonly string[]>([]);

  readonly valueChange = output<string | null>();

  protected readonly palettes = PALETTES;
  protected readonly paletteId = signal(PALETTES[0].id);
  protected readonly palette = computed(
    () => PALETTES.find((p) => p.id === this.paletteId()) ?? PALETTES[0],
  );

  protected readonly rgb = computed(() => hexToRgb(this.value() ?? '#000000'));
  protected readonly hex = computed(() => this.value() ?? '#000000');
  protected readonly channels = [
    { index: 0, label: 'R' },
    { index: 1, label: 'G' },
    { index: 2, label: 'B' },
  ] as const;

  protected selectPalette(event: MatButtonToggleChange): void {
    this.paletteId.set(event.value as string);
  }

  protected pick(hex: string | null): void {
    this.valueChange.emit(hex);
  }

  protected setChannel(index: number, value: number): void {
    const next: [number, number, number] = [...this.rgb()];
    next[index] = value;
    this.valueChange.emit(rgbToHex(next[0], next[1], next[2]));
  }

  protected onNative(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  protected onHex(event: Event): void {
    const input = event.target as HTMLInputElement;
    const hex = normalizeHex(input.value);
    if (hex) {
      this.valueChange.emit(hex);
    } else {
      input.value = this.hex();
    }
  }
}
