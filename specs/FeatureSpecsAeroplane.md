# Aeroplane Feature Spec

## Behaviour
- Lands on a single tile and converts its column **downwards** (landing tile through bottom row) to the aeroplane’s colour.
- Conceptually “drops bombs” vertically from its position to the bottom of the grid.
- Applied after coins and alongside other features in `LocalRgsClient` (after soldiers/tanks, before bombs in current flow).

## Configuration
- Feature weight: default 20% within `featureWeights` (soldier 50%, tank 20%, aeroplane 20%, bomb 10%).
- Colour weights: `featureColourWeights.AEROPLANE` defaults to 50/50 GREEN/ORANGE; configurable to bias aeroplane colour.

## Placement Flow (math)
1) Coins resolve (pay on matching colour, flip on opposite).
2) Remaining empty tiles are gathered.
3) `featureCount` sampled from `featureCountWeights`; capped by available empty tiles.
4) Empty tiles shuffled; first N receive features sampled from `featureWeights`.
5) If type is AEROPLANE: sample colour from `featureColourWeights.AEROPLANE`, place symbol.
6) In `LocalRgsClient`, aeroplane recolours every tile in its column from its row down to the bottom.

## Notes
- If feature placement exceeds available empty tiles, counts are capped (weights not rescaled yet).
- Colour bias per feature type is configurable; defaults are 50/50 across soldier, tank, aeroplane, bomb.***
