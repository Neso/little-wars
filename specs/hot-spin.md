# Hot Spin Specification

## Overview
- Adds a “Hot Spin” mode that costs more per spin but uses an alternate math configuration.
- Client sends an explicit `action` field with spin requests:
  - `action: "SPIN"` for normal spins (current behaviour).
  - `action: "HOT_SPIN"` for hot spins.
- RTP target for Hot Spin math: 96% (configurable).

## UI
- Add a red “Hot Spin” button positioned to the right/behind the existing Spin button.
- Label: “Hot Spin”.
- Disabled when balance < `hotSpinBetMultiplier * currentBet`.
- Triggering the button sends a spin request with `action: "HOT_SPIN"`.
- Display effective bet for Hot Spin (e.g., tooltip or inline label showing `x{multiplier}`).

## Cost & Config
- `hotSpinBetMultiplier`: default 10× the normal bet; configurable in game config.
- Normal spins use the existing `mathConfig`.
- Hot spins use a separate `hotspinMathConfig` (parallel structure to `mathConfig`, baseRtp default 0.96, with room to tweak coin/feature distributions/multipliers).

## RGS / Client Flow
- Request payload includes `action` (`"SPIN"` or `"HOT_SPIN"`).
- If `action === "HOT_SPIN"`:
  - Deduct bet as `currentBet * hotSpinBetMultiplier`.
  - Resolve math using `hotspinMathConfig`.
  - Payouts, features, and flow otherwise mirror normal spins.
- If `action === "SPIN"`:
  - Use normal bet and `mathConfig`.
- Free-spin triggers and feature resolution remain unchanged; they simply use the active math/bet.

## Math
- Hot Spin math config mirrors default math but can tune:
  - `baseRtp` (default 0.96 for hot).
  - Coin distributions, feature weights, thresholds, caps.
- Payout formulas unchanged; higher stake and hot config drive higher volatility/returns.

## Checklist (implementation)
1. Config:
   - Add `hotSpinBetMultiplier` to game config (default 10).
   - Add `hotspinMathConfig.ts` (or JSON) mirroring `mathConfig` with baseRtp 0.96 and any desired tuning.
2. Payload / types:
   - Add `action` field to spin requests (`"SPIN"` | `"HOT_SPIN"`).
   - Thread `action` through client→RGS call sites.
3. RGS:
   - In `LocalRgsClient`, pick math config and bet based on `action`.
   - Ensure balance checks use the multiplied bet for hot spins.
4. UI:
   - Add red “Hot Spin” button near Spin; show effective bet (x multiplier).
   - Disable when balance insufficient for hot cost.
5. Tests:
   - RGS/client tests: hot spins use hot math config and multiplied bet; normal spins unaffected.
   - UI logic test: button disabled when funds are insufficient.
6. (Optional) Sim:
   - Add sim flag to run Monte Carlo with hot config to verify RTP/hit rate.
