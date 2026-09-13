# M16 — Family transformations

M16 adds a serialized, content-derived record of installed relic identity and family to combat state. This lets a transformation activate when three distinct relic IDs from a family have been acquired incrementally; duplicate IDs are rejected and never count twice.

The compiler adds generic transformation bindings for the three completed families:

- Anatomy / Spare Parts: the first primary Gore Reaction each player turn applies 1 Bleed to every living enemy.
- Circuit / Live Wire: the first paid manual swap each player turn refunds exactly the Energy paid; free swaps do not consume it.
- Forgery / Double Booked: the first Grafted card per combat repeats base effects at 50 percent, with integer flooring, without another card lifecycle, Prime, Reaction, or card-play trigger dispatch.

The authoritative state version is 9. M16 coverage is `npm run test:m16`; M14 and M15 remain regression suites.
