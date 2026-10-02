import {
  COLUMN_LABELS,
  Coord,
  FLEET,
  GRID_SIZE,
  Orientation,
  PlacedShip,
  ShipPlacement,
  ShipSpec,
  ShotRecord,
} from './models/battleship-models';

export const coordKey = (c: Coord): string => `${c.row},${c.col}`;
export const sameCoord = (a: Coord, b: Coord): boolean => a.row === b.row && a.col === b.col;
export const coordLabel = (c: Coord): string => `${COLUMN_LABELS[c.col]}${c.row + 1}`;

export const inBounds = (c: Coord, gridSize = GRID_SIZE): boolean =>
  c.row >= 0 && c.row < gridSize && c.col >= 0 && c.col < gridSize;

export function shipCells(ship: ShipPlacement): Coord[] {
  return Array.from({ length: ship.size }, (_, i) => ({
    row: ship.row + (ship.orientation === 'vertical' ? i : 0),
    col: ship.col + (ship.orientation === 'horizontal' ? i : 0),
  }));
}

/** Schiffe dürfen sich berühren, aber nicht überlappen. */
export function canPlace(
  existing: readonly PlacedShip[],
  candidate: ShipPlacement,
  gridSize = GRID_SIZE,
): boolean {
  const cells = shipCells(candidate);
  if (!cells.every((c) => inBounds(c, gridSize))) {
    return false;
  }
  const occupied = new Set(existing.flatMap((s) => shipCells(s).map(coordKey)));
  return cells.every((c) => !occupied.has(coordKey(c)));
}

/** Schiebt den Ankerpunkt so, dass das Schiff komplett im Feld liegt. */
export function clampToGrid(
  anchor: Coord,
  size: number,
  orientation: Orientation,
  gridSize = GRID_SIZE,
): Coord {
  return {
    row: Math.min(anchor.row, gridSize - (orientation === 'vertical' ? size : 1)),
    col: Math.min(anchor.col, gridSize - (orientation === 'horizontal' ? size : 1)),
  };
}

export function randomFleet(
  fleet: readonly ShipSpec[] = FLEET,
  gridSize = GRID_SIZE,
  rng: () => number = Math.random,
): PlacedShip[] {
  const ships: PlacedShip[] = [];
  for (const spec of fleet) {
    for (;;) {
      const orientation: Orientation = rng() < 0.5 ? 'horizontal' : 'vertical';
      const candidate: PlacedShip = {
        ...spec,
        orientation,
        row: Math.floor(rng() * gridSize),
        col: Math.floor(rng() * gridSize),
      };
      if (canPlace(ships, candidate, gridSize)) {
        ships.push(candidate);
        break;
      }
    }
  }
  return ships;
}

/** Prüft, ob eine (z. B. von einer KI gelieferte) Flotte regelkonform ist. */
export function isValidFleet(
  ships: readonly PlacedShip[],
  fleet: readonly ShipSpec[] = FLEET,
  gridSize = GRID_SIZE,
): boolean {
  if (ships.length !== fleet.length) {
    return false;
  }
  const placed: PlacedShip[] = [];
  for (const spec of fleet) {
    const ship = ships.find((s) => s.id === spec.id && s.size === spec.size);
    if (!ship || !canPlace(placed, ship, gridSize)) {
      return false;
    }
    placed.push(ship);
  }
  return true;
}

export function resolveShot(
  ships: readonly PlacedShip[],
  previousShots: readonly ShotRecord[],
  coord: Coord,
): ShotRecord {
  const target = ships.find((s) => shipCells(s).some((c) => sameCoord(c, coord)));
  if (!target) {
    return { coord, result: 'miss' };
  }
  const shotKeys = new Set(previousShots.map((s) => coordKey(s.coord)));
  shotKeys.add(coordKey(coord));
  const sunk = shipCells(target).every((c) => shotKeys.has(coordKey(c)));
  return sunk ? { coord, result: 'sunk', sunkShip: target } : { coord, result: 'hit' };
}

export function isSunk(ship: PlacedShip, shots: readonly ShotRecord[]): boolean {
  const shotKeys = new Set(shots.map((s) => coordKey(s.coord)));
  return shipCells(ship).every((c) => shotKeys.has(coordKey(c)));
}

export function allSunk(ships: readonly PlacedShip[], shots: readonly ShotRecord[]): boolean {
  return ships.length > 0 && ships.every((s) => isSunk(s, shots));
}
