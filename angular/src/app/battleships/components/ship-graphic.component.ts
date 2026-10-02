import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FleetColor, Orientation } from '../models/battleship-models';

export type ShipVariant = 'fleet' | 'wreck' | 'ghost-ok' | 'ghost-bad';

/** Zeichnet ein Schiff über `size` Felder (je 100 SVG-Einheiten lang). Füllt sein Elternelement komplett aus. */
@Component({
  selector: 'app-ship-graphic',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.fleet-blue]': "color() === 'blue'",
    '[class.fleet-red]': "color() === 'red'",
    '[class.wreck]': "variant() === 'wreck'",
    '[class.ghost-ok]': "variant() === 'ghost-ok'",
    '[class.ghost-bad]': "variant() === 'ghost-bad'",
  },
  template: `
    <svg [attr.viewBox]="viewBox()" preserveAspectRatio="none" aria-hidden="true">
      <g [attr.transform]="transform()">
        @if (variant() === 'wreck') {
          <path class="wreck-hull" [attr.d]="hull()" />
          <line class="bone" x1="22" y1="50" [attr.x2]="length() - 30" y2="50" />
          @for (x of ribs(); track x) {
            <line class="bone" [attr.x1]="x" y1="31" [attr.x2]="x" y2="69" />
          }
          <path class="bone" [attr.d]="mast()" />
        } @else {
          <path class="hull" [attr.d]="hull()" />
          <rect class="deck" x="34" y="38" [attr.width]="length() - 100" height="24" rx="6" />
          <rect class="cabin" [attr.x]="length() / 2 - 22" y="40" width="44" height="20" rx="4" />
        }
      </g>
    </svg>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    :host(.fleet-blue) {
      --ship-fill: #1e88e5;
      --ship-stroke: #bbdefb;
      --bone: #cfd8dc;
    }

    :host(.fleet-red) {
      --ship-fill: #e53935;
      --ship-stroke: #ffcdd2;
      --bone: #cfd8dc;
    }

    :host(.ghost-ok) {
      --ship-fill: rgba(102, 187, 106, 0.7);
      --ship-stroke: #c8e6c9;
    }

    :host(.ghost-bad) {
      --ship-fill: rgba(239, 83, 80, 0.55);
      --ship-stroke: #ffcdd2;
    }

    :host(.wreck.fleet-blue) {
      --bone: #90caf9;
    }

    :host(.wreck.fleet-red) {
      --bone: #ef9a9a;
    }

    .hull {
      fill: var(--ship-fill);
      stroke: var(--ship-stroke);
      stroke-width: 3;
    }

    .deck {
      fill: rgba(255, 255, 255, 0.2);
    }

    .cabin {
      fill: rgba(0, 0, 0, 0.3);
    }

    .wreck-hull {
      fill: rgba(0, 0, 0, 0.4);
      stroke: var(--bone);
      stroke-width: 3;
      stroke-dasharray: 20 8;
    }

    .bone {
      fill: none;
      stroke: var(--bone);
      stroke-width: 3.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    :host(.wreck) svg {
      animation: wreck-appear 0.9s ease-out;
    }

    @keyframes wreck-appear {
      from {
        opacity: 0;
        transform: scale(1.08);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host(.wreck) svg {
        animation: none;
      }
    }
  `,
})
export class ShipGraphicComponent {
  readonly size = input.required<number>();
  readonly orientation = input<Orientation>('horizontal');
  readonly variant = input<ShipVariant>('fleet');
  readonly color = input<FleetColor>('blue');

  protected readonly length = computed(() => this.size() * 100);

  protected readonly viewBox = computed(() =>
    this.orientation() === 'horizontal'
      ? `0 0 ${this.length()} 100`
      : `0 0 100 ${this.length()}`,
  );

  /** Vertikal = horizontal gezeichnetes Schiff, um 90° gedreht. */
  protected readonly transform = computed(() =>
    this.orientation() === 'vertical' ? 'translate(100 0) rotate(90)' : null,
  );

  protected readonly hull = computed(() => {
    const w = this.length();
    return (
      `M14 34 L14 66 Q14 74 22 74 L${w - 46} 74 Q${w - 12} 74 ${w - 6} 50 ` +
      `Q${w - 12} 26 ${w - 46} 26 L22 26 Q14 26 14 34 Z`
    );
  });

  protected readonly ribs = computed(() => {
    const result: number[] = [];
    for (let x = 40; x < this.length() - 50; x += 32) {
      result.push(x);
    }
    return result;
  });

  /** Abgeknickter Mast. */
  protected readonly mast = computed(() => {
    const m = this.length() / 2;
    return `M${m} 50 L${m + 16} 6 L${m + 34} 14`;
  });
}
