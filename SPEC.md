# Stats PRKL – Product Spec (v1 draft)

Web app for tracking **shots** in junior/youth hockey games that have no official statistics.
One person tracks a game on a phone in landscape. Works offline at the rink.

## Decisions so far

| Topic | Decision |
|---|---|
| Teams tracked | Both teams, full rosters (numbers, names, goalies) |
| Rosters | Team library, reused across games; easy to edit players before each game (dressed lineup) |
| Clock | In-app game clock; tracker taps Start/Stop (stop time) or lets it run (running time); clock is editable; every shot is stamped with period + game time |
| Game setup | Periods, period length (min), clock mode (stop / running), optional OT (length), optional shootout |
| Goalies | Starting goalie chosen per team at game start; every shot against is charged to that goalie (rare goalie change possible from a menu, incl. empty net) |
| Rink | Full rink, landscape, **fixed sides**: home attacks right, away attacks left the whole game. Tap side ⇒ shooting team |
| Shot entry | Tap location → popup: shooter (number grid) → result **Goal / Save / Blocked / Missed** → if goal: assists (optional, skippable) |
| Penalties | Not in v1 (shots only) |
| Shootout | Tracked separately; not counted in shot stats |
| Results | Heatmap + shot dots (colored by result), filterable by period, team, player, result; player stat table; score and shots by period |
| Sharing | Copy formatted text summary (WhatsApp-friendly); share result card image (PNG via phone share sheet) |
| Language | Finnish (default) + English toggle |
| Data | Local on the device only (IndexedDB); JSON export/import for backup/transfer |
| Tech | PWA: React + TypeScript + Vite, installable, offline; hosted on GitHub Pages |
| Repo | `jvekka2/stats-prkl`, public |

## Stat definitions (proposed)

- **Shot attempt** = any shot (goal + save + blocked + missed)
- **Shot on goal (SOG)** = goal + save
- **Shooting %** = goals / SOG
- **Goalie**: shots against = opponent SOG while in net; saves; goals against; **SV%** = saves / shots against
- Blocked shot location = where the shot was taken

## Game flow

1. **Setup**: pick home & away team, dressed players, starting goalies, game format.
2. **Live**: clock + score + shots bar on top, rink fills the screen. Tap → popup → saved.
   Tap an existing dot to edit/delete; Undo last. Period end → next period (clock resets).
3. **Results**: score, shots per period, heatmap/dots with filters, player table, share buttons.

## Defaults chosen for v1 (open to change)

- Player stat table and period breakdown are included; results are per game (multi-game later, data model supports it)
- Clock counts down like a rink scoreboard and auto-stops at 0:00; period change is a manual tap
- Shot popup has an "Unknown" shooter option
- Only shots on goal (goal + save) count for goalie SV%
- Location is a tap point only (zones later)
- WhatsApp text: score, periods, shots on goal, goal list with times and assists, top 3 shooters per team, goalies
- Team colors are chosen in the team library and used everywhere, including the result card
- Shootout: shooter + goal/no goal per attempt; winner gets +1 in the final score
- One tracker per game; JSON import can merge data from another device
