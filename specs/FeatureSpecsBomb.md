# Bomb Feature Spec

## Behaviour
- Bomb lands on a single tile.
- It sets its own tile and all 8 neighbouring tiles (orthogonal + diagonal) to the bomb’s colour.
- Resolution order: bombs are applied after coins and alongside other features in `LocalRgsClient` (after soldiers/tanks in the current flow).

## Configuration
- Feature weight: default 20% within `featureWeights` (soldier 70%, tank 10%, bomb 20%).
- Colour weights: `featureColourWeights.BOMB` defaults to 50/50 GREEN/ORANGE; configurable to bias bomb colour.

## Placement Flow (math)
1) Coins resolve (pay on matching colour, flip on opposite).
2) Remaining empty tiles are gathered.
3) `featureCount` is sampled from `featureCountWeights` (capped by available empty tiles).
4) Empty tiles are shuffled; first N receive features.
5) For each feature: sample type from `featureWeights`; if type is BOMB, sample colour from `featureColourWeights.BOMB` and place symbol.
6) In `LocalRgsClient`, bombs recolour their landing tile and all 8 neighbours to their colour.

## Notes
- If bombs exceed available empty tiles, placement is capped; no rescaling of weights yet.
- Colour bias per feature type is configurable; defaults are 50/50 across soldier, tank, and bomb.***
