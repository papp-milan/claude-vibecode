# Claude Vibecode

> A small toolbox for collaborative work, estimation, sketching and play — built with Angular.

---

## // TOOLS

### 01 — WHEEL OF FORTUNE

A simple randomizer for teams, groups and recurring decisions.

- Add and remove participants
- Randomize the wheel and segment colors
- Animated multi-turn spin
- Winner dialog with optional removal
- Winner history
- Automatic label sizing for different participant counts

### 02 — SCRUM POKER

Lightweight Planning Poker for estimation sessions.

The deck includes:

```text
☕  1  2  5  8  12  20  40
```

- Add and remove participants
- Assign votes to individual participants
- Reveal all votes
- Reset a round
- Automatically move to the next participant who has not voted

### 03 — CANVAS

A browser-based whiteboard for sketching, annotating and exploring ideas.

**Drawing**

- Pen
- Brush
- Marker
- Highlighter
- Eraser
- Lines and arrows
- Multiple shapes and stickers

**Content**

- Markdown text boxes and notes
- GitHub-Flavored Markdown
- Syntax-highlighted code blocks
- Image insertion
- Color and fill controls

**Workspace**

- Selection and panning
- Zoom and fit-to-content
- Optional ruler with snapping
- Undo / redo
- Dark and light board backgrounds
- JSON import / export
- PNG export

Markdown is parsed with `marked`, highlighted with `highlight.js` and sanitized with DOMPurify before rendering.

### 04 — BATTLESHIPS

A single-player Battleships game against a heuristic computer opponent.

- 10 × 10 board
- Standard five-ship fleet
- Custom fleet color
- Manual or random placement
- Horizontal / vertical orientation
- Keyboard rotation during placement
- Hit, miss and sunk feedback
- Turn-based gameplay
- Result dialog and quick restart

The computer player uses a heatmap-based strategy to evaluate possible remaining ship placements.

The bot is exposed through a `BattleshipBot` interface, making alternative strategies possible without changing the game service.

---

## // STACK

| Technology | Role |
| --- | --- |
| Angular 22 | Application framework |
| TypeScript 6 | Application language |
| Angular Material | UI components |
| Angular Router | Navigation |
| Angular Signals | Reactive state |
| RxJS | Reactive utilities |
| Vitest | Unit testing |
| marked | Markdown parsing |
| marked-highlight | Markdown code highlighting |
| highlight.js | Syntax highlighting |
| DOMPurify | Markdown sanitization |
| perfect-freehand | Freehand stroke rendering |

The application uses Angular's standalone architecture and static output configuration.

---

## // QUICKSTART

### Requirements

- Node.js compatible with the Angular 22 toolchain
- npm 11

Check your versions:

```bash
node --version
npm --version
```

### Install

```bash
git clone https://github.com/papp-milan/claude-vibecode.git
cd claude-vibecode/angular
npm install
```

### Run

```bash
npm start
```

Then open:

```text
http://localhost:4200/
```

The development server reloads the application as source files change.

---

## // COMMANDS

Run all commands from `angular/`.

| Command | Description |
| --- | --- |
| `npm start` | Start the development server |
| `npm run build` | Create a production build |
| `npm run watch` | Build and watch for changes |
| `npm test` | Run the unit test suite |

Production output is written to Angular's `dist/` directory.

---

## // ROUTES

| Route | Tool |
| --- | --- |
| `/wheel-of-fortune` | Wheel of Fortune |
| `/scrum-poker` | Scrum Poker |
| `/canvas` | Canvas |
| `/battleships` | Battleships |

The root route redirects to `/wheel-of-fortune`.

Unknown routes also fall back to the Wheel of Fortune page.

---

## // STRUCTURE

```text
angular/
├── public/                         # Static assets
├── src/
│   ├── app/
│   │   ├── battleships/            # Battleships game, rules, bot and UI
│   │   ├── canvas/                 # Whiteboard and drawing tools
│   │   ├── constants/              # Shared constants
│   │   ├── halyard/
│   │   │   ├── scrum-poker/        # Scrum Poker
│   │   │   └── wheel-of-fortune/   # Wheel of Fortune
│   │   ├── layout/                 # Shared shell and theme
│   │   ├── app.component.*         # Root shell and navigation
│   │   ├── app.config.ts           # Application providers
│   │   └── app.routes.ts           # Routing
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── angular.json
├── package.json
└── tsconfig*.json
```

---

## // ARCHITECTURE

### Signals

Interactive features use Angular Signals for local state and derived values.

The Wheel of Fortune maintains participants, rotation, winner and history as signals. The Canvas uses a dedicated `BoardStore` for board items, selection, viewport and history.

### Canvas State

Canvas state is intentionally kept in memory.

Switching routes keeps the board alive while the application is open. A full page reload clears the current board unless it has been exported.

Canvas files use a versioned JSON format. Imported data is validated and sanitized before becoming application state.

### Battleships Bot

The computer opponent follows this interface:

```ts
interface BattleshipBot {
  readonly name: string;
  placeShips(
    fleet: readonly ShipSpec[],
    gridSize: number
  ): PlacedShip[] | Promise<PlacedShip[]>;
  nextShot(
    view: BotView
  ): Coord | Promise<Coord>;
}
```

The default `HeuristicBot`:

1. Tracks previous shots and known sunk ships.
2. Enumerates possible placements for remaining ship sizes.
3. Builds a heatmap of likely ship cells.
4. Gives additional weight to placements consistent with unresolved hits.
5. Fires at one of the highest-scoring available cells.

---

## // STATE

The application is client-side.

Interactive state remains in memory unless you explicitly export a Canvas board.

No backend service is required to run the application locally.

---

## // LICENSE

See the repository for license information.

---

Built with Angular, TypeScript and a healthy amount of vibecoding.

**Claude Vibecode**
