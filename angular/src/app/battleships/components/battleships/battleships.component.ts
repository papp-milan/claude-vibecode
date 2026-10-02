import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {ShipGraphicComponent} from '../ship-graphic.component';
import {BattleshipBoardComponent} from '../battleship-board/battleship-board.component';
import {BattleshipsGameService} from '../../services/battleships-game.service';
import {Coord} from '../../models/battleship-models';
import {BattleshipsResultData, BattleshipsResultDialogComponent} from '../battleships-result-dialog.component';

const PREVIEW_CELL_REM = 2.25;

@Component({
  selector: 'app-battleships',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    BattleshipBoardComponent,
    ShipGraphicComponent,
  ],
  // Komponenten-Scope: Beim Verlassen des Tabs wird das Spiel verworfen.
  providers: [BattleshipsGameService],
  templateUrl: './battleships.component.html',
  styleUrl: './battleships.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown.r)': 'rotateWithKey()' },
})
export class BattleshipsComponent {
  protected readonly game = inject(BattleshipsGameService);
  private readonly dialog = inject(MatDialog);

  protected readonly hover = signal<Coord | null>(null);

  protected readonly ghost = computed(() => {
    const coord = this.hover();
    return coord ? this.game.previewAt(coord) : null;
  });

  protected readonly previewBox = computed(() => {
    const next = this.game.nextToPlace();
    if (!next) return { width: PREVIEW_CELL_REM, height: PREVIEW_CELL_REM };
    const length = next.size * PREVIEW_CELL_REM;
    return this.game.orientation() === 'horizontal'
      ? { width: length, height: PREVIEW_CELL_REM }
      : { width: PREVIEW_CELL_REM, height: length };
  });

  constructor() {
    effect(() => {
      const winner = this.game.winner();
      if (winner) {
        untracked(() => this.showResult(winner === 'player'));
      }
    });
  }

  protected onPlace(coord: Coord): void {
    this.game.placeAt(coord);
  }

  protected rotateWithKey(): void {
    this.game.toggleOrientation();
  }

  private showResult(won: boolean): void {
    // Kurz warten, damit die letzte Explosion noch zu sehen ist.
    setTimeout(() => {
      if (!this.game.winner()) return; // inzwischen neu gestartet
      const data: BattleshipsResultData = { won, botName: this.game.botName };
      this.dialog
        .open(BattleshipsResultDialogComponent, { data })
        .afterClosed()
        .subscribe((result) => {
          if (result === 'again') {
            this.game.reset();
          }
        });
    }, 1100);
  }
}
