import { Component, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { WinnerDialogComponent, WinnerDialogData } from '../winner-dialog/winner-dialog.component';
import {TeamMembers} from '../../../constants/team-members';

@Component({
  selector: 'app-wheel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
  ],
  templateUrl: './wheel.component.html',
  styleUrl: './wheel.component.scss'
})
export class WheelComponent {
  private dialog = inject(MatDialog);

  names = signal<string[]>(TeamMembers);
  wheelNames = signal<string[]>([]);

  private palette = [
    '#0d47a1',
    '#1565c0',
    '#1976d2',
    '#1e88e5',
    '#2196f3',
    '#42a5f5',
    '#64b5f6',
    '#90caf9',
    '#bbdefb',
    '#e3f2fd',
    '#ffffff'
  ];
  segmentColors = signal<string[]>([]);

  newName = signal('');

  rotation = signal(0);
  spinning = signal(false);
  winner = signal<string | null>(null);
  pastWinners = signal<string[]>([]);

  private labelRadius = 18; // rem, Abstand vom Zentrum

  constructor() {
    effect(() => {
      const list = [...this.names()];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      this.wheelNames.set(list);
      this.segmentColors.set(this.generateSegmentColors(list.length));
    });
  }

  private generateSegmentColors(n: number): string[] {
    if (n === 0) return [];
    const colors: string[] = [];

    for (let i = 0; i < n; i++) {
      const prev = i > 0 ? colors[i - 1] : null;
      let choice: string;
      do {
        choice = this.palette[Math.floor(Math.random() * this.palette.length)];
      } while (choice === prev && this.palette.length > 1);
      colors.push(choice);
    }

    if (n > 1 && colors[n - 1] === colors[0]) {
      const alt = this.palette.filter(c => c !== colors[0] && c !== colors[n - 2]);
      colors[n - 1] = alt.length > 0
        ? alt[Math.floor(Math.random() * alt.length)]
        : this.palette.find(c => c !== colors[0])!;
    }

    return colors;
  }

  segmentColor(index: number): string {
    return this.segmentColors()[index] ?? '#ffffff';
  }

  labelFontSize(name: string): string {
    const n = this.wheelNames().length;
    const segmentFactor = Math.min(1, 7 / n);
    const lengthFactor = Math.min(1, 7 / name.length);

    const baseRem = 1.6;
    const size = baseRem * Math.min(segmentFactor, lengthFactor);

    return `${Math.max(0.55, size).toFixed(2)}rem`;
  }

  labelMaxWidth(): string {
    const n = this.wheelNames().length;
    const width = Math.min(10, 60 / n + 3);
    return `${width.toFixed(2)}rem`;
  }

  conicGradient = computed(() => {
    const n = this.wheelNames().length;
    if (n === 0) return 'transparent';
    const seg = 360 / n;
    const stops: string[] = [];
    for (let i = 0; i < n; i++) {
      stops.push(`${this.segmentColor(i)} ${i * seg}deg ${(i + 1) * seg}deg`);
    }
    return `conic-gradient(${stops.join(', ')})`;
  });

  segmentAngle = computed(() => 360 / (this.wheelNames().length || 1));

  labelColor(index: number): string {
    const lightColors = ['#ffffff', '#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6'];
    return lightColors.includes(this.segmentColor(index)) ? '#0d47a1' : '#ffffff';
  }

  labelTransform(index: number): string {
    const theta = index * this.segmentAngle() + this.segmentAngle() / 2;
    const phi = theta - 90;
    return `rotate(${phi}deg) translate(${this.labelRadius}rem) rotate(${-phi - this.rotation()}deg)`;
  }

  addName() {
    const trimmed = this.newName().trim();
    if (!trimmed) return;
    this.names.update(list => [...list, trimmed]);
    this.newName.set('');
  }

  removeName(index: number) {
    this.names.update(list => list.filter((_, i) => i !== index));
  }

  spin() {
    const n = this.wheelNames().length;
    if (n === 0 || this.spinning()) return;

    this.winner.set(null);
    this.spinning.set(true);

    const winnerIndex = Math.floor(Math.random() * n);
    const seg = 360 / n;
    const targetCenter = winnerIndex * seg + seg / 2;

    const currentRotation = this.rotation();
    const currentMod = ((currentRotation % 360) + 360) % 360;
    const targetMod = (360 - targetCenter) % 360;

    let delta = targetMod - currentMod;
    if (delta <= 0) delta += 360;

    const fullSpins = 5 + Math.floor(Math.random() * 3);
    const newRotation = currentRotation + fullSpins * 360 + delta;

    this.rotation.set(newRotation);

    setTimeout(() => {
      this.spinning.set(false);
      const winnerName = this.wheelNames()[winnerIndex];
      this.winner.set(winnerName);
      this.openWinnerDialog(winnerName);
    }, 4000);
  }

  private openWinnerDialog(winnerName: string) {
    const ref = this.dialog.open(WinnerDialogComponent, {
      data: { winner: winnerName } as WinnerDialogData
    });

    ref.afterClosed().subscribe(shouldRemove => {
      if (shouldRemove) {
        this.pastWinners.update(list => [winnerName, ...list]);
        const index = this.names().indexOf(winnerName);
        if (index !== -1) {
          this.removeName(index);
        }
      }
      this.winner.set(null);
    });
  }
}
