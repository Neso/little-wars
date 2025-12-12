# Features Trigger Spec (Per Spin)

## Overview
- On every spin, a number of features (soldiers/tanks) is sampled before symbol effects resolve.
- Counts are sampled from a configurable distribution (defaults below), then placed onto empty tiles after coin placement.
- Feature type (soldier vs tank) is sampled per feature from configurable weights.
- Feature colours are currently 50/50 GREEN/ORANGE (rng < 0.5 -> GREEN, else ORANGE).

## Default Configuration (math)
- `featureCountWeights` (per-spin feature count):
  - 1 feature: 60%
  - 2 features: 25%
  - 3 features: 10%
  - 4 features: 3%
  - 5 features: 2%
  - (0 features: implicitly 0%; counts cap to available empty tiles)
- `featureWeights` (per-feature type):
  - SOLDIER: 80%
  - TANK: 20%

## Placement Flow (resolveMathSpin)
1) Coins are placed and resolved (paying on matching colours; opposite coins flip tiles).
2) Remaining empty tiles are collected.
3) Sample `featureCount` from `featureCountWeights`; cap to remaining empty tiles.
4) Shuffle remaining empty tiles; place `featureCount` features on the first N positions.
5) For each feature:
   - Sample type from `featureWeights` (SOLDIER/TANK).
   - Sample colour 50/50 (GREEN/ORANGE).
6) Soldiers/tanks are included in the `symbols` array; later, `LocalRgsClient` applies soldier/tank effects as before.

## Notes / Future Tweaks
- Add a 0-count weight if we want explicit “no features” probability (currently 0%).
- Consider colour biasing based on board state or config instead of flat 50/50.
- Consider per-feature caps (e.g., max tanks per spin) or slot-order priorities if more feature types are added.
