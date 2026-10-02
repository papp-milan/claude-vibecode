# Claude Vibecode

A small collection of interactive browser tools built with modern Angular and Angular Material.

The app currently brings four utilities into one workspace:

- **Wheel of Fortune** — spin a customizable wheel to select a participant.
- **Scrum Poker** — run lightweight Planning Poker sessions with a built-in Fibonacci-style deck.
- **Canvas** — draw, sketch, annotate, add Markdown content and images, then import/export boards.
- **Battleships** — play a single-player Battleships game against a heuristic computer opponent.

The application is client-side and keeps its interactive state in memory unless you explicitly export a Canvas board.

## Features

### Wheel of Fortune

- Start with a predefined participant list.
- Add and remove participants at runtime.
- Randomize the wheel order and segment colors.
- Spin the wheel with an animated multi-turn rotation.
- Show the selected winner in a dialog.
- Optionally remove a winner from the participant list and keep a history of previous winners.
- Automatically adapts label sizing as the number and length of names change.

### Scrum Poker

- Preloaded participant list.
- Add and remove participants.
- Select a participant and assign a vote.
- Voting deck:

  - ☕ Coffee
  - 1
  - 2
  - 5
  - 8
  - 12
  - 20
  - 40

- Reveal all votes at the end of a round.
- Reset the table for a new round.
- Automatically moves to the next participant who has not voted.

### Canvas

A browser-based whiteboard with:

- Selection and panning.
- Freehand tools:
  - Pen
  - Brush
  - Marker
  - Highlighter
  - Eraser
- Lines and arrows.
- Shapes:
  - Rectangle
  - Rounded rectangle
  - Ellipse
  - Triangle
  - Diamond
  - Star
  - Hexagon
  - Arrow
  - Heart
  - Speech bubble
- Markdown text boxes and notes.
- GitHub-Flavored Markdown rendering.
- Syntax highlighting for code blocks.
- Image insertion.
- Color and fill controls.
- Zooming and fit-to-content.
- Optional ruler with snapping support.
- Undo/redo with a bounded history.
- Dark/light canvas backgrounds.
- JSON board import/export.
- PNG export.

Canvas Markdown is parsed with `marked`, syntax-highlighted with `highlight.js`, and sanitized with DOMPurify before being rendered.

### Battleships

- 10×10 game board.
- Standard five-ship fleet.
- Choose your fleet color.
- Manual ship placement with horizontal/vertical orientation.
- Random fleet placement.
- Placement preview and validation.
- Keyboard shortcut to rotate the ship during placement.
- Turn-based gameplay against the computer.
- Hit, miss, and sunk feedback.
- Game result dialog and quick restart.
- Computer opponent using a heatmap heuristic that evaluates possible remaining ship placements.
- Safe fallback behavior if the bot returns an invalid move or encounters an error.

The computer opponent is implemented behind a `BattleshipBot` interface, so a different strategy can be provided without changing the game service.

## Tech Stack

- [Angular](https://angular.dev/) 22
- [TypeScript](https://www.typescriptlang.org/) 6
- [Angular Material](https://material.angular.dev/)
- Angular Router
- Angular Signals for reactive application state
- [RxJS](https://rxjs.dev/)
- [Vitest](https://vitest.dev/) through the Angular test runner
- [marked](https://marked.js.org/) + `marked-highlight` for Markdown
- [highlight.js](https://highlightjs.org/) for code highlighting
- [DOMPurify](https://github.com/cure53/DOMPurify) for rendered Markdown sanitization
- [perfect-freehand](https://github.com/steveruizok/perfect-freehand) for freehand stroke rendering

The application is configured as a standalone Angular application and uses Angular's static output mode for builds.

## Requirements

- Node.js compatible with the installed Angular 22 toolchain.
- npm 11 (the project declares `npm@11.19.0` as its package manager).

Check your versions:

```bash
node --version
npm --version
```

## Getting Started

Clone the repository and enter the Angular application:

```bash
git clone https://github.com/papp-milan/claude-vibecode.git
cd claude-vibecode/angular
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Then open:

```text
http://localhost:4200/
```

The Angular development server reloads the application as source files change.

## Available Commands

Run these commands from `angular/`:

| Command | Description |
| --- | --- |
| `npm start` | Start the development server |
| `npm run build` | Create a production build |
| `npm run watch` | Build in development mode and watch for changes |
| `npm test` | Run the unit test suite |

The production build is written to Angular's `dist/` output directory.

## Application Routes

| Route | Tool |
| --- | --- |
| `/wheel-of-fortune` | Wheel of Fortune |
| `/scrum-poker` | Scrum Poker |
| `/canvas` | Canvas |
| `/battleships` | Battleships |

The root route redirects to `/wheel-of-fortune`, and unknown routes also fall back to the Wheel of Fortune page.

## Project Structure

The repository contains the Angular application under `angular/`.

```text
angular/
├── public/                         # Static assets
├── src/
│   ├── app/
│   │   ├── battleships/            # Battleships game, rules, bot and UI
│   │   ├── canvas/                 # Whiteboard, drawing tools and file/export logic
│   │   ├── constants/              # Shared application constants
│   │   ├── halyard/
│   │   │   ├── scrum-poker/        # Scrum Poker feature
│   │   │   └── wheel-of-fortune/   # Wheel of Fortune feature
│   │   ├── layout/                 # Shared application layout and theme toggle
│   │   ├── app.component.*         # Root shell and navigation
│   │   ├── app.config.ts           # Angular application providers
│   │   └── app.routes.ts           # Application routing
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── angular.json                    # Angular CLI configuration
├── package.json
└── tsconfig*.json                  # TypeScript configuration
```

## Architecture Notes

### Angular Signals

The interactive features use Angular Signals for local state and derived values. For example, the Wheel of Fortune maintains its participants, rotation, winner and history as signals, while the Canvas keeps board items, selection, viewport and history in a dedicated `BoardStore`.

### Canvas State

Canvas state is intentionally in-memory. Switching between application routes keeps the board alive while the page is open, but a full page reload clears the current board unless it has been exported.

Canvas files use a versioned JSON format. Imported files are validated and sanitized before becoming application state.

### Battleships Bot

The Battleships opponent follows this interface:

```ts
interface BattleshipBot {
  readonly name: string;
  placeShips(fleet: readonly ShipSpec[], gridSize: number):
    PlacedShip[] | Promise<PlacedShip[]>;
  nextShot(view: BotView): Coord | Promise<Coord>;
}
```

The default `HeuristicBot`:

1. Tracks previous shots and known sunk ships.
2. Enumerates possible placements for remaining ship sizes.
3. Builds a heatmap of likely ship cells.
4. Gives extra weight to placements consistent with unresolved hits.
5. Fires at one of the highest-scoring available cells.

The game service validates bot-generated fleets and shots and falls back to randomized behavior when necessary.

### Markdown Safety

Canvas Markdown is rendered as HTML and passed through DOMPurify. External links are configured to open in a new tab with `noopener noreferrer`.

## Testing

Run the unit tests with:

```bash
npm test
```

The project uses Vitest via Angular's unit-test builder.

## Building for Production

Create an optimized production build:

```bash
npm run build
```

The Angular CLI writes the generated application to `dist/`.

Because the Angular configuration uses static output mode, the resulting application can be served by a static web server.

## Deployment

The repository contains a GitHub Actions workflow under:

```text
.github/workflows/
```

The Angular application itself is configured for static production output, so deployment can be handled by a static hosting provider or the repository's CI/CD workflow.

## Development

When adding a new tool:

1. Create the feature under `src/app/`.
2. Add its route in `src/app/app.routes.ts`.
3. Add navigation in `src/app/app.component.html`.
4. Keep feature-specific state and logic inside the feature directory where practical.
5. Add tests for important business logic and edge cases.
6. Run `npm test` and `npm run build` before committing.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
