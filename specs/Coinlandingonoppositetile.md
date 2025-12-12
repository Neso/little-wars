# Coin Landing On Opposite Tile – Worklog

## Latest Request
- Apply a fixed per-spin distribution for opposite-colour coin landings:
  - 0 coins: 25%
  - 1 coin: 25%
  - 2 coins: 25%
  - 3 coins: 15%
  - 4 coins: 7%
  - 5 coins: 3%
- Keep RTP constant.
- Use coin value distribution from config (onOwn vs onOpposite) when sampling coin multipliers.
- Opposite-landing distribution is applied per spin; no scaling for now (future improvement noted below).

## Notes / Decisions
- Matching (paying) coins now use RTP-driven probability directly; opposite coins are added separately using the fixed count distribution so RTP is unchanged.
- Coin multipliers now come from the `coinValueDistribution` config (onOwn for matching drops, onOpposite for opposite-colour drops).
- Opposite coins are only placed on tiles that did not already receive a matching coin. If not enough tiles are free to satisfy the sampled count, we currently cap to available tiles (future improvement: scale probabilities when counts exceed availability).
- `matchProbability` is effectively bypassed in the math path with this model; paying coins always match their tile colour.
