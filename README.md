# 🏒 Stats PRKL

**Shot tracker for junior and youth hockey games** that don't have official statistics.

Track every shot from the stands or the bench on your phone: tap the spot on the rink, pick the shooter and the
result, and get a box score, shot maps, heatmaps and per-player stats after the game. Share the results to
WhatsApp as text or as an image card in one tap.

Finnish 🇫🇮 and English 🇬🇧 · Works offline · No account needed · Data stays on your device

## Features

- **Team library**: teams with colors and rosters (numbers, names, goalies). Paste a whole roster at once
  (`12 Matti Meikäläinen`, add `MV`/`G` for goalies). Pick the dressed players for each game.
- **Game format**: number of periods, period length, stop time or running time, optional overtime and shootout.
- **Live tracking** (made for a phone in landscape):
  - Full rink with fixed sides: home attacks right, away attacks left
  - Tap the rink → choose shooter number → **Goal / Save / Blocked / Missed** → optional assists for goals
  - Game clock with start/stop, auto-stop at 0:00, adjustable time; every shot is stamped with period and time
  - Tap a shot marker to edit or delete it, undo the last shot
  - Goalie in net per team (selected at start, changeable from the menu, empty net supported)
  - Screen stays awake while tracking
- **Results**
  - Score, goals and shots by period, shot attempts
  - Shot map (dots) and **heatmap**, filterable by team, period, player and result
  - Skater stats: G, A, P, SOG, attempts, blocked, missed, shooting %
  - Goalie stats: shots against, saves, goals against, SV%
  - Shootout attempts
- **Sharing**: copy a WhatsApp-formatted summary, or share a 1080×1350 result card image
- **Backup**: export/import all data as JSON (merge or replace)

## Stat definitions

| Stat | Meaning |
|---|---|
| Attempts | All shots: goal + save + blocked + missed |
| SOG (shots on goal) | Goal + save |
| S% | Goals / SOG |
| Goalie SA | Opponent shots on goal while the goalie is in net (blocked and missed don't count) |
| SV% | Saves / SA |

## Development

Requires Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:5173/stats-prkl/
npm test         # unit tests (stats, clock, roster parsing, share text)
npm run build    # production build to dist/
```

Tech: React 18 + TypeScript + Vite, `vite-plugin-pwa` for offline/installable, IndexedDB (`idb-keyval`) for storage.
Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`.

```
src/
  types.ts            Data model
  lib/stats.ts        Stat calculations (pure)
  lib/clock.ts        Game clock logic (pure)
  lib/rink.ts         Rink drawing, shot markers, heatmap
  lib/share.ts        WhatsApp text + result card image
  lib/store.ts        Persistence (IndexedDB) + backup
  lib/i18n.ts         Finnish / English texts
  views/              Screens (games, teams, new game, live, results, settings)
  components/         Rink, shot popup, shootout panel
```

## Roadmap ideas

- Season / multi-game stats and heatmaps per player
- Penalties and power-play tracking
- Shot zones (slot, point, wings) summary
- Two trackers per game (one per team) with merge
- Plus/minus and faceoffs

## License

[MIT](LICENSE)
