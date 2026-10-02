import { InjectionToken } from '@angular/core';
import {coordKey, inBounds, randomFleet, shipCells} from './battleship-logic';
import {Coord, PlacedShip, ShipSpec, ShotRecord} from './models/battleship-models';

/**
 * Alles, was der Bot über das Spiel wissen darf. Die Schiffspositionen des
 * Spielers sind bewusst NICHT enthalten (nur versenkte Schiffe sind bekannt).
 */
export interface BotView {
  readonly gridSize: number;
  /** Alle bisherigen Schüsse des Bots inkl. Ergebnis (miss / hit / sunk). */
  readonly shots: readonly ShotRecord[];
  /** Größen der gegnerischen Schiffe, die noch schwimmen. */
  readonly remainingShipSizes: readonly number[];
}

/**
 * Schnittstelle für jeden Gegner. Beide Methoden dürfen async sein,
 * damit später z. B. ein API-Aufruf an eine KI möglich ist.
 */
export interface BattleshipBot {
  readonly name: string;
  placeShips(fleet: readonly ShipSpec[], gridSize: number): PlacedShip[] | Promise<PlacedShip[]>;
  nextShot(view: BotView): Coord | Promise<Coord>;
}

/** Heatmap-Bot: zählt alle noch möglichen Schiffspositionen und schießt auf das wahrscheinlichste Feld. */
export class HeuristicBot implements BattleshipBot {
  readonly name = 'Admiral Computer';

  placeShips(fleet: readonly ShipSpec[], gridSize: number): PlacedShip[] {
    return randomFleet(fleet, gridSize);
  }

  nextShot(view: BotView): Coord {
    const n = view.gridSize;
    const shotKeys = new Set(view.shots.map((s) => coordKey(s.coord)));

    // Felder versenkter Schiffe und Fehlschüsse können kein (weiteres) Schiff enthalten.
    const sunkKeys = new Set(
      view.shots.flatMap((s) => (s.sunkShip ? shipCells(s.sunkShip).map(coordKey) : [])),
    );
    const blocked = new Set(sunkKeys);
    view.shots.filter((s) => s.result === 'miss').forEach((s) => blocked.add(coordKey(s.coord)));

    // Treffer, die noch zu keinem versenkten Schiff gehören -> dort weitersuchen.
    const openHits = new Set(
      view.shots
        .filter((s) => s.result !== 'miss' && !sunkKeys.has(coordKey(s.coord)))
        .map((s) => coordKey(s.coord)),
    );

    const heat = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    for (const size of view.remainingShipSizes) {
      for (const orientation of ['horizontal', 'vertical'] as const) {
        for (let row = 0; row < n; row++) {
          for (let col = 0; col < n; col++) {
            const cells = shipCells({ row, col, size, orientation });
            if (!cells.every((c) => inBounds(c, n))) continue;
            if (cells.some((c) => blocked.has(coordKey(c)))) continue;
            const hits = cells.filter((c) => openHits.has(coordKey(c))).length;
            const weight = hits > 0 ? 1 + hits * 50 : 1;
            for (const c of cells) {
              if (!shotKeys.has(coordKey(c))) {
                heat[c.row][c.col] += weight;
              }
            }
          }
        }
      }
    }

    let best = -1;
    let candidates: Coord[] = [];
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (shotKeys.has(coordKey({ row, col }))) continue;
        if (heat[row][col] > best) {
          best = heat[row][col];
          candidates = [{ row, col }];
        } else if (heat[row][col] === best) {
          candidates.push({ row, col });
        }
      }
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}

/** Standard-Gegner. Zum Austauschen einfach einen anderen Provider bereitstellen. */
export const BATTLESHIP_BOT = new InjectionToken<BattleshipBot>('BATTLESHIP_BOT', {
  providedIn: 'root',
  factory: () => new HeuristicBot(),
});
