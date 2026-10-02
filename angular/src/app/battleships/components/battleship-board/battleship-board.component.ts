import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {COLUMN_LABELS, Coord, FleetColor, GRID_SIZE, PlacedShip, ShotRecord} from '../../models/battleship-models';
import {ShipGraphicComponent} from '../ship-graphic.component';
import {coordKey, coordLabel, shipCells} from '../../battleship-logic';

interface CellVm {
  row: number;
  col: number;
  key: string;
  label: string;
  marker: 'none' | 'miss' | 'hit' | 'sunk';
  last: boolean;
}

interface ShipVm {
  ship: PlacedShip;
  sunk: boolean;
}

export interface BoardGhost {
  ship: PlacedShip;
  valid: boolean;
}

@Component({
  selector: 'app-battleship-board',
  standalone: true,
  imports: [ShipGraphicComponent],
  templateUrl: './battleship-board.component.html',
  styleUrl: './battleship-board.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattleshipBoardComponent {
  readonly ships = input<readonly PlacedShip[]>([]);
  readonly shots = input<readonly ShotRecord[]>([]);
  /** true = alle Schiffe zeigen (eigenes Feld). false = nur versenkte Schiffe (gegnerisches Feld). */
  readonly revealShips = input(false);
  readonly interactive = input(false);
  /** Farbe der Flotte, die auf diesem Feld liegt. */
  readonly color = input<FleetColor>('blue');
  readonly ghost = input<BoardGhost | null>(null);

  readonly cellClick = output<Coord>();
  readonly cellRotate = output<Coord>();
  readonly cellHover = output<Coord | null>();

  protected readonly columnLabels = COLUMN_LABELS;
  protected readonly rowLabels = Array.from({ length: GRID_SIZE }, (_, i) => i + 1);

  private readonly shipVms = computed<ShipVm[]>(() => {
    const shotKeys = new Set(this.shots().map((s) => coordKey(s.coord)));
    return this.ships().map((ship) => ({
      ship,
      sunk: shipCells(ship).every((c) => shotKeys.has(coordKey(c))),
    }));
  });

  protected readonly visibleShips = computed(() =>
    this.shipVms().filter((vm) => vm.sunk || this.revealShips()),
  );

  protected readonly cells = computed<CellVm[]>(() => {
    const shotKeys = new Set(this.shots().map((s) => coordKey(s.coord)));
    const lastShot = this.shots().at(-1);
    const lastKey = lastShot ? coordKey(lastShot.coord) : null;

    const occupiedBy = new Map<string, ShipVm>();
    for (const vm of this.shipVms()) {
      for (const cell of shipCells(vm.ship)) {
        occupiedBy.set(coordKey(cell), vm);
      }
    }

    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      const key = coordKey({ row, col });
      const owner = occupiedBy.get(key);

      let marker: CellVm['marker'] = 'none';
      if (shotKeys.has(key)) {
        marker = !owner ? 'miss' : owner.sunk ? 'sunk' : 'hit';
      }
      return { row, col, key, label: coordLabel({ row, col }), marker, last: key === lastKey };
    });
  });

  protected rowArea(ship: PlacedShip): string {
    const span = ship.orientation === 'vertical' ? ship.size : 1;
    return `${ship.row + 1} / span ${span}`;
  }

  protected colArea(ship: PlacedShip): string {
    const span = ship.orientation === 'horizontal' ? ship.size : 1;
    return `${ship.col + 1} / span ${span}`;
  }

  protected onClick(cell: CellVm): void {
    if (this.interactive() && cell.marker === 'none') {
      this.cellClick.emit({ row: cell.row, col: cell.col });
    }
  }

  protected onContextMenu(event: MouseEvent, cell: CellVm): void {
    if (this.interactive()) {
      event.preventDefault();
      this.cellRotate.emit({ row: cell.row, col: cell.col });
    }
  }

  protected onEnter(cell: CellVm): void {
    this.cellHover.emit({ row: cell.row, col: cell.col });
  }
}
