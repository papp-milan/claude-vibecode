import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface BattleshipsResultData {
  won: boolean;
  botName: string;
}

@Component({
  selector: 'app-battleships-result-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title class="title">
      <mat-icon>{{ data.won ? 'emoji_events' : 'sentiment_very_dissatisfied' }}</mat-icon>
      {{ data.won ? 'Sieg!' : 'Niederlage' }}
    </h2>
    <mat-dialog-content>
      @if (data.won) {
        Du hast die gesamte Flotte von {{ data.botName }} versenkt. Gut gespielt, Admiral!
      } @else {
        {{ data.botName }} hat deine gesamte Flotte versenkt. Beim nächsten Mal klappt's.
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Spielfeld ansehen</button>
      <button mat-flat-button [mat-dialog-close]="'again'">Neues Spiel</button>
    </mat-dialog-actions>
  `,
  styles: `
    .title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
  `,
})
export class BattleshipsResultDialogComponent {
  protected readonly data = inject<BattleshipsResultData>(MAT_DIALOG_DATA);
}
