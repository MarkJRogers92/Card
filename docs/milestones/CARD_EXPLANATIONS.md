# Card explanations — readability slice

## Scope

This is the first bounded slice of roadmap item **M38** ("full card previews,
intent forecasts, encyclopedia discovery, and three contextual tutorials", see
`docs/DESIGN.md` 10.8). It exists because a new player can currently see a hand
of cards with a name, a cost, and an ingredient but no statement of what any
card actually does, which violates design pillar **P2 — readable causes,
outrageous consequences**.

It delivers two things only:

1. Every playable card gets a machine-derived, plain-English explanation of its
   base effect.
2. The hand surfaces that explanation: one short line on the card face and a
   detail popup on hover, keyboard focus, or click/tap.

It deliberately does **not** include the rest of M38: prospective Reaction
preview, post-modifier cost projection, enemy intent forecasts, encyclopedia
discovery state, contextual tutorials, or reward-option tooltips. See
"Explicitly out of scope" below.

## Engine contract

`src/engine/card-text.ts` (new, `CARD_TEXT_VERSION = 1`) is the single source of
player-facing card text. It is pure: it reads a definition and returns strings,
mutates nothing, and inspects no hidden information (`docs/DESIGN.md` 7.6).

- `describeContentCard(definition, { upgraded })` returns a `CardExplanation`
  for a schema-validated `CardDefinition`: a one-line `summary` plus labelled
  `lines` (Cost, Additional cost, Family, Target, Ingredient, Base effect /
  Also, After play, and per-keyword rules).
- `describeM10StarterCard(definition)` does the same for the hand-authored
  `M10StarterCardDefinition` vocabulary used by the M10/M19 starter deck.
- `describeUnplayableCard(definitionId)` explains why a card in an M19 run deck
  cannot be played in the current checkpoint instead of rendering a bare id.
- `describeEffect(effect, values)` renders one sentence per schema effect
  operation, and `describeM10StarterEffect(effect)` does the same for the four
  M10 starter operations.
- `CARD_KEYWORD_GLOSSARY` and `keywordText(keyword)` carry the exact keyword
  rules from `docs/DESIGN.md` 2.9; `positionText(classification)` carries the
  Lead / Support / Crew rules from `docs/DESIGN.md` 2.4.
- `ingredientPhrase(ingredient)` renders "Needle · Prime 1 (Form)".

Two properties keep the text honest:

- **Exhaustive by construction.** Both effect renderers switch over the full
  operation union and end in an `assertNever`. Adding an effect operation to
  `schemas/effect.schema.json` and the engine breaks the type check here until
  the operation is described, so no card can ship with silent rules text.
- **No card-ID branches.** Text is derived only from schema fields, matching the
  project rule that the engine never special-cases content ids.

Value expressions resolve through the card's own parameters at the requested
base or upgraded level. When a value is genuinely state-dependent (`stat`) or
unknown, the text stays symbolic ("the Imprint's Potency", `X (parameter)`)
rather than guessing a number.

### View surface

`M10CardView` and `M19CardView` gain one additive field:

```ts
readonly explanation: CardExplanation;
```

`CardExplanation` is `{ readonly summary: string; readonly lines: readonly
CardTextLine[] }` and `CardTextLine` is `{ readonly label: string; readonly
text: string }`. No authoritative state, hash, command, or replay surface
changes, so save/replay contracts are untouched.

## UI behavior

- Each hand card renders `explanation.summary` on its face.
- Hover, keyboard focus, and click/tap open a detail popup showing the card name,
  every `explanation.lines` row, and the current position explanation.
- The card button carries an accessible description so screen readers get the
  same rules text with the popup closed.
- The popup is informational only: it never becomes a second way to play a card,
  and clicking the card still plays it exactly as before.

## Explicitly out of scope

These remain open for the rest of M38, and the handoff records them:

1. **Prospective Reaction preview.** `docs/DESIGN.md` 7.5 asks for the
   prospective Reaction, resulting Imprint, exact post-modifier cost, and
   expected HP/Block change. The Reaction and Imprint engine (`resolveReactionRecipe`,
   `boostImprintPotency`) can supply this, but it needs a projection entry point
   and an information-redaction test before the UI may show it.
2. **Reward-option explanations.** The M18 reward panel lists card ids because
   the browser has no runtime registry of schema card definitions. Explaining
   those requires shipping a client-readable content catalog (for example a
   generated registry module) with its own validation.
3. **Enemy intent forecasts, encyclopedia discovery, and contextual tutorials.**

## Verification

- `npx vitest run tests/unit/card-text.test.ts` — one exact sentence per schema
  effect operation, parameter resolution at base and upgraded levels, symbolic
  fallback, popup row composition, every shipped content card described without
  fallback, every M10 starter card, identity independence, keyword coverage, and
  the Lead/Support/Crew rules text.
- `npx playwright test tests/browser/card-explanations.spec.ts` — hover and
  keyboard focus both reveal the explanation, and playing a card still works.
- `npx playwright test tests/browser/m10-combat.spec.ts` — unchanged regression
  guard for the hand markup and the headless replay hash.
- `npm run check` and `npm run test:engine`.
