# Little Wars

Pixi.js slot-like prototype with two colours (GREEN/ORANGE), RGS math path, and Monte Carlo sim tooling.

## Scripts
- `npm run dev` – start Vite dev server.
- `npm run build` – build for production.
- `npm run preview` – serve the production build locally.
- `npm run test` / `npm run test:watch` – run Vitest suite (watch for TDD).
- `npm run typecheck` – `tsc --noEmit` (currently flagged by known typing gaps: howler types, BetConfig levels, GameConfig spinResetRules typing, UI fields).
- `npm run sim` – build and run the Monte Carlo simulator (`scripts/sim.ts`) via `scripts/run-sim.js`.

## Monte Carlo Sim (scripts/sim.ts)
Flags (all optional):
- `--spins <number>`: spins to simulate (default 10000).
- `--bet <number>`: bet per spin (default 1).
- `--seed <number>`: RNG seed (default: current timestamp).
- `--json`: emit JSON instead of a text summary.
- `--hot` (or `--mode=hot`): run using Hot Spin math config and `hotSpinBetMultiplier` (default 10× bet).

Examples:
- `npm run sim -- --spins 50000 --bet 1`  
  Text summary for 50k spins at bet 1.
- `npm run sim -- --spins 200000 --bet 2 --seed 42 --json`  
  Deterministic run with JSON output.
- `npm run sim -- --spins 10000 --bet 5`  
  Quick sanity check at higher bet.
- `npm run sim -- --hot --spins 200000 --bet 1 --json`  
  Hot Spin math with 10× wager; payout calc uses base bet but hot math config boosts RTP to compensate (reports base bet and wager).

Notes:
- The sim uses the current `defaultMathConfig` by default; Hot Spin mode uses `hotSpinMathConfig`.
- It starts from a 50/50 board split (15 GREEN, 15 ORANGE).
- Opposite/Match rates in the report reflect the forced opposite-coin placement model.***
