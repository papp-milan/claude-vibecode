import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import {
  Coord,
  FLEET,
  FleetColor,
  GRID_SIZE,
  Orientation,
  PlacedShip,
  ShipSpec,
  ShotRecord
} from '../models/battleship-models';
import {BATTLESHIP_BOT, BotView} from '../battleship-bot';
import {
  allSunk,
  canPlace,
  clampToGrid,
  coordKey, coordLabel, inBounds,
  isSunk,
  isValidFleet,
  randomFleet,
  resolveShot
} from '../battleship-logic';

export type GamePhase = 'setup' | 'placing' | 'playing' | 'over';
export type Side = 'player' | 'bot';

const BOT_THINK_TIME_MS = 800;
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

@Injectable()
export class BattleshipsGameService implements OnDestroy {
  private readonly bot = inject(BATTLESHIP_BOT);
  /** Wird bei Reset/Destroy erhöht, damit hängende async-Züge verworfen werden. */
  private round = 0;

  readonly botName = this.bot.name;

  readonly phase = signal<GamePhase>('setup');
  readonly playerColor = signal<FleetColor>('blue');
  readonly botColor = computed<FleetColor>(() => (this.playerColor() === 'blue' ? 'red' : 'blue'));

  readonly orientation = signal<Orientation>('horizontal');
  readonly playerShips = signal<PlacedShip[]>([]);
  readonly botShips = signal<PlacedShip[]>([]);

  /** Schüsse, die auf das Feld des Spielers abgegeben wurden (vom Bot). */
  readonly shotsAtPlayer = signal<ShotRecord[]>([]);
  /** Schüsse, die auf das Feld des Bots abgegeben wurden (vom Spieler). */
  readonly shotsAtBot = signal<ShotRecord[]>([]);

  readonly turn = signal<Side>('player');
  readonly winner = signal<Side | null>(null);
  readonly botThinking = signal(false);
  readonly lastEvent = signal('');

  readonly nextToPlace = computed<ShipSpec | null>(
    () => FLEET.find((spec) => !this.playerShips().some((s) => s.id === spec.id)) ?? null,
  );

  readonly placementList = computed(() =>
    FLEET.map((spec) => ({
      ...spec,
      placed: this.playerShips().some((s) => s.id === spec.id),
      current: this.nextToPlace()?.id === spec.id,
    })),
  );

  readonly playerFleetStatus = computed(() =>
    this.playerShips().map((s) => ({
      id: s.id,
      name: s.name,
      size: s.size,
      sunk: isSunk(s, this.shotsAtPlayer()),
    })),
  );

  readonly botFleetStatus = computed(() =>
    this.botShips().map((s) => ({
      id: s.id,
      name: s.name,
      size: s.size,
      sunk: isSunk(s, this.shotsAtBot()),
    })),
  );

  readonly canShoot = computed(() => this.phase() === 'playing' && this.turn() === 'player');

  readonly statusText = computed(() => {
    switch (this.phase()) {
      case 'setup':
        return 'Wähle deine Flottenfarbe.';
      case 'placing': {
        const next = this.nextToPlace();
        return next ? `Platziere: ${next.name} (${next.size} Felder)` : 'Flotte komplett …';
      }
      case 'playing':
        return this.turn() === 'player'
          ? 'Du bist am Zug – wähle ein Ziel auf dem gegnerischen Feld.'
          : `${this.botName} zielt …`;
      case 'over':
        return this.winner() === 'player' ? 'Du hast gewonnen!' : `${this.botName} hat gewonnen.`;
    }
  });

  ngOnDestroy(): void {
    this.round++;
  }

  // ---------- Setup & Platzierung ----------

  chooseColor(color: FleetColor): void {
    this.playerColor.set(color);
    this.phase.set('placing');
  }

  toggleOrientation(): void {
    if (this.phase() !== 'placing') return;
    this.orientation.update((o) => (o === 'horizontal' ? 'vertical' : 'horizontal'));
  }

  /** Vorschau des aktuellen Schiffs an der Mausposition (Position wird ins Feld geschoben). */
  previewAt(coord: Coord): { ship: PlacedShip; valid: boolean } | null {
    const spec = this.nextToPlace();
    if (!spec || this.phase() !== 'placing') return null;
    const ship = this.buildShip(spec, coord);
    return { ship, valid: canPlace(this.playerShips(), ship) };
  }

  placeAt(coord: Coord): void {
    const preview = this.previewAt(coord);
    if (!preview?.valid) return;
    this.playerShips.update((ships) => [...ships, preview.ship]);
    if (!this.nextToPlace()) {
      void this.startBattle();
    }
  }

  undoPlacement(): void {
    if (this.phase() !== 'placing') return;
    this.playerShips.update((ships) => ships.slice(0, -1));
  }

  randomizePlacement(): void {
    if (this.phase() !== 'placing') return;
    this.playerShips.set(randomFleet());
    void this.startBattle();
  }

  private buildShip(spec: ShipSpec, anchor: Coord): PlacedShip {
    const orientation = this.orientation();
    const { row, col } = clampToGrid(anchor, spec.size, orientation);
    return { ...spec, row, col, orientation };
  }

  // ---------- Kampf ----------

  private async startBattle(): Promise<void> {
    const round = this.round;
    let ships: PlacedShip[];
    try {
      ships = await this.bot.placeShips(FLEET, GRID_SIZE);
      if (!isValidFleet(ships)) {
        throw new Error('Ungültige Flotte vom Bot');
      }
    } catch {
      ships = randomFleet();
    }
    if (round !== this.round) return;

    this.botShips.set(ships);
    this.shotsAtBot.set([]);
    this.shotsAtPlayer.set([]);
    this.winner.set(null);
    this.turn.set('player');
    this.lastEvent.set('');
    this.phase.set('playing');
  }

  fire(coord: Coord): void {
    if (!this.canShoot()) return;
    if (this.shotsAtBot().some((s) => coordKey(s.coord) === coordKey(coord))) return;

    const record = resolveShot(this.botShips(), this.shotsAtBot(), coord);
    this.shotsAtBot.update((shots) => [...shots, record]);
    this.announce('player', record);

    if (allSunk(this.botShips(), this.shotsAtBot())) {
      this.finish('player');
      return;
    }
    this.turn.set('bot');
    void this.runBotTurn();
  }

  private async runBotTurn(): Promise<void> {
    const round = this.round;
    this.botThinking.set(true);

    const view: BotView = {
      gridSize: GRID_SIZE,
      shots: this.shotsAtPlayer(),
      remainingShipSizes: this.playerShips()
        .filter((s) => !isSunk(s, this.shotsAtPlayer()))
        .map((s) => s.size),
    };

    const [coord] = await Promise.all([this.safeNextShot(view), delay(BOT_THINK_TIME_MS)]);
    if (round !== this.round) return;

    const record = resolveShot(this.playerShips(), this.shotsAtPlayer(), coord);
    this.shotsAtPlayer.update((shots) => [...shots, record]);
    this.announce('bot', record);
    this.botThinking.set(false);

    if (allSunk(this.playerShips(), this.shotsAtPlayer())) {
      this.finish('bot');
      return;
    }
    this.turn.set('player');
  }

  /** Fällt auf einen Zufallsschuss zurück, falls der Bot Unsinn liefert oder einen Fehler wirft. */
  private async safeNextShot(view: BotView): Promise<Coord> {
    try {
      const coord = await this.bot.nextShot(view);
      const taken = view.shots.some((s) => coordKey(s.coord) === coordKey(coord));
      if (inBounds(coord, view.gridSize) && !taken) {
        return coord;
      }
    } catch {
      // Fallback unten
    }
    return this.randomUnshotCell(view);
  }

  private randomUnshotCell(view: BotView): Coord {
    const taken = new Set(view.shots.map((s) => coordKey(s.coord)));
    const free: Coord[] = [];
    for (let row = 0; row < view.gridSize; row++) {
      for (let col = 0; col < view.gridSize; col++) {
        if (!taken.has(coordKey({ row, col }))) free.push({ row, col });
      }
    }
    return free[Math.floor(Math.random() * free.length)];
  }

  private announce(side: Side, record: ShotRecord): void {
    const who = side === 'player' ? 'Du' : this.botName;
    const target = coordLabel(record.coord);
    switch (record.result) {
      case 'miss':
        this.lastEvent.set(`${who} schießt auf ${target} – Wasser.`);
        break;
      case 'hit':
        this.lastEvent.set(`${who} schießt auf ${target} – Treffer!`);
        break;
      case 'sunk':
        this.lastEvent.set(
          `${who} schießt auf ${target} – ${record.sunkShip?.name ?? 'Schiff'} versenkt!`,
        );
        break;
    }
  }

  private finish(winner: Side): void {
    this.botThinking.set(false);
    this.winner.set(winner);
    this.phase.set('over');
  }

  reset(): void {
    this.round++;
    this.phase.set('setup');
    this.orientation.set('horizontal');
    this.playerShips.set([]);
    this.botShips.set([]);
    this.shotsAtPlayer.set([]);
    this.shotsAtBot.set([]);
    this.turn.set('player');
    this.winner.set(null);
    this.botThinking.set(false);
    this.lastEvent.set('');
  }
}
