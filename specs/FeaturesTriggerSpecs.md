# Features Trigger Spec (Per Spin)

## Overview
- On every spin, a number of features (soldiers/tanks/bombs) is sampled before symbol effects resolve.
- Counts are sampled from a configurable distribution (defaults below), then placed onto empty tiles after coin placement.
- Feature type (soldier vs tank vs bomb) is sampled per feature from configurable weights.
- Feature colours are configurable per feature type (defaults 50/50 GREEN/ORANGE).

## Default Configuration (math)
- `featureCountWeights` (per-spin feature count):
  - 1 feature: 60%
  - 2 features: 25%
  - 3 features: 10%
  - 4 features: 3%
  - 5 features: 2%
  - (0 features: implicitly 0%; counts cap to available empty tiles)
- `featureWeights` (per-feature type):
  - SOLDIER: 70%
  - TANK: 10%
  - BOMB: 20%
- `featureColourWeights` (per-feature colour weights; default 50/50 for each type).

## Placement Flow (resolveMathSpin)
1) Coins are placed and resolved (paying on matching colours; opposite coins flip tiles).
2) Remaining empty tiles are collected.
3) Sample `featureCount` from `featureCountWeights`; cap to remaining empty tiles.
4) Shuffle remaining empty tiles; place `featureCount` features on the first N positions.
5) For each feature:
   - Sample type from `featureWeights` (SOLDIER/TANK/BOMB).
   - Sample colour via `featureColourWeights[type]` (defaults 50/50).
6) Soldiers/tanks/bombs are included in the `symbols` array; later, `LocalRgsClient` applies their effects.

## Notes / Future Tweaks
- Add a 0-count weight if we want explicit “no features” probability (currently 0%).
- Consider colour biasing based on board state or config instead of flat defaults.
- Consider per-feature caps (e.g., max tanks/bombs per spin) or slot-order priorities if more feature types are added.
