export const GRID_SIZE = 10;
export const COLUMN_LABELS = 'ABCDEFGHIJ'.split('');

export type Orientation = 'horizontal' | 'vertical';
export type FleetColor = 'blue' | 'red';
export type ShotResult = 'miss' | 'hit' | 'sunk';

export interface Coord {
  row: number;
  col: number;
}

export interface ShipSpec {
  id: string;
  name: string;
  size: number;
}

export interface ShipPlacement {
  row: number;
  col: number;
  size: number;
  orientation: Orientation;
}

export interface PlacedShip extends ShipSpec, ShipPlacement {}

export interface ShotRecord {
  coord: Coord;
  result: ShotResult;
  /** Nur gesetzt, wenn dieser Schuss das Schiff versenkt hat (ist öffentlich bekannt). */
  sunkShip?: PlacedShip;
}

export const FLEET: readonly ShipSpec[] = [
  { id: 'carrier', name: 'Flugzeugträger', size: 5 },
  { id: 'battleship', name: 'Schlachtschiff', size: 4 },
  { id: 'cruiser', name: 'Kreuzer', size: 3 },
  { id: 'submarine', name: 'U-Boot', size: 3 },
  { id: 'destroyer', name: 'Zerstörer', size: 2 },
];
