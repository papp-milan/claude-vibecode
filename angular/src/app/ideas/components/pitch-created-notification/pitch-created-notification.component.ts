import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Success notification shown in the Ideas view after a pitch was created.
 *
 * Contract (presentation only — no data fetching, no side effects):
 * - `visible`      controls whether the notification is rendered at all.
 * - `pitchTitle`   optional pitch name rendered next to the fixed headline.
 * - `dismissed`    emits when the user closes the notification.
 *
 * The styling lives in the component stylesheet and is driven by the global
 * theme custom properties, so light and dark themes stay in sync.
 */
@Component({
  selector: 'app-pitch-created-notification',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pitch-created-notification.component.html',
  styleUrl: './pitch-created-notification.component.scss'
})
export class PitchCreatedNotificationComponent {
  readonly visible = input(true);
  readonly pitchTitle = input<string | null>(null);
  readonly dismissed = output<void>();
}