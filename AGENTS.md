# Repository Guidelines

## Project Structure & Modules
- `src/main.ts` wires the Pixi.js game loop with the RGS client; treat it as the entry point.
- Core game logic lives in `src/core` (engine, board state), rendering/UI in `src/render` and `src/ui`, network-like game service in `src/net`, configuration in `src/config`, and assets in `src/assets`/`src/audio`.
- Specs live in `specs/` (`green-vs-orange-full-spec.md`, `LittleWars_RGS_Math_Spec.md`); update them whenever behavior or math changes.
- Tests are under `tests/` and mirror production modules (e.g., `GameEngine.test.ts`, `RgsClient.test.ts`, `SymbolSource.test.ts`).

## Build, Test, and Dev Commands
- `npm install` once to pull dependencies.
- `npm run dev` starts Vite locally.
- `npm run build` creates the production bundle.
- `npm run preview` serves the built bundle.
- `npm run test` runs the Vitest suite; `npm run test:watch` for TDD.
- `npm run typecheck` runs `tsc --noEmit`; keep it clean before commits.

## Coding Style & Naming
- TypeScript, ES modules, `type: "module"`; prefer `async/await`.
- Use camelCase for functions/variables, PascalCase for classes/types, SCREAMING_SNAKE_CASE for constants.
- Default to 2-space indentation; keep files ASCII. Add focused comments only when logic is non-obvious.
- Keep rendering/UI changes encapsulated in their own classes (e.g., `TopBarView` owns top-bar DOM), and avoid cross-component DOM mutation.

## Testing Guidelines
- Use Vitest; place specs in `tests/*.test.ts` aligned with module names.
- When adding game-flow logic (RGS, coin/soldier/tank resolution, top-bar updates), add unit tests that cover both nominal flow and edge cases (skips, free-spin absence, payout ordering).
- Prefer deterministic fixtures/config seeds for symbol sources and timing configs.

## Commit & Pull Request Practices
- Write concise, present-tense messages; when in doubt, follow Conventional Commit prefixes (`feat:`, `fix:`, `chore:`).
- PRs should describe behavior changes, include screenshots/gifs for UI tweaks, reference spec sections touched, and note added/updated tests.
- Keep PRs focused (feature or fix per PR); update relevant spec files in `specs/` alongside code.

## Development Tips & Config
- Rendering uses Pixi.js; audio uses Howler—ensure asset paths stay under `src/assets`/`src/audio`.
- Game results flow through `src/net/LocalRgsClient.ts`; treat it like a remote API and mock it in tests.
- Timing and animation behaviors are configured under `src/config`; prefer adding knobs there instead of hard-coding.
- Never commit secrets; GitHub Pages deploys use the built `dist/` output.
