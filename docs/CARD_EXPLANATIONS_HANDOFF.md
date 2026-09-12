# Card explanations — session handoff

## What this branch adds

Branch `codex/card-explanations`, based on the M19 checkpoint
`cfe9061` (`codex/m16-family-transformations`). It answers the request "make
sure there's a small explanation or a popup box that explains what each card
does", which is the base-effect half of `docs/DESIGN.md` 7.5 and the first
bounded slice of roadmap milestone **M38**.

Published by fast-forwarding `codex/m16-family-transformations` to this tip and
pushing both branches. GitHub Actions run
[`34674163343`](https://github.com/MarkJRogers92/Card/actions/runs/34674163343)
passed the full acceptance job at the exact head
`2c014a4825a1b541ccedefb4f6e980c6d9eae5d2`. `main` remains the M00–M01
foundation (`33be69f`); M02–M19 have never been merged there, so publishing this
slice deliberately did not change that.

Two commits:

1. `feat: derive card explanations from content data` — the engine text layer
   plus `tests/unit/card-text.test.ts`.
2. `feat: show card explanations in the hand` — the shared hand-card component,
   the popup styling, and `tests/browser/card-explanations.spec.ts`.

## Engine

`src/engine/card-text.ts` is new and pure. It is the only place card rules text
is authored.

| Export | Purpose |
|---|---|
| `describeContentCard(definition, { upgraded })` | `CardExplanation` for a schema-validated card |
| `describeM10StarterCard(definition)` | Same for the hand-authored M10 starter vocabulary |
| `describeUnplayableCard(definitionId)` | Explains why an M19 run-deck card cannot be played yet |
| `describeEffect(effect, values)` | One sentence per schema effect operation |
| `describeM10StarterEffect(effect)` | One sentence per M10 starter operation |
| `CARD_KEYWORD_GLOSSARY`, `keywordText(keyword)` | Exact keyword rules (`docs/DESIGN.md` 2.9) |
| `positionText(classification)` | Lead / Support / Crew meaning (`docs/DESIGN.md` 2.4) |
| `ingredientPhrase(ingredient)` | "Needle · Prime 1 (Form)" |

`CardExplanation` is `{ summary, lines }` where each line is `{ label, text }`.
Value expressions resolve through the card's own parameters at base or upgraded
level; genuinely state-dependent or unknown values stay symbolic rather than
guessing.

`M10CardView` and `M19CardView` each gained one additive field:
`readonly explanation: CardExplanation`. `M19CardView`'s non-playable branch now
carries `describeUnplayableCard(definitionId)` instead of rendering a bare id.
No authoritative-state shape, hash, command, or replay contract changed, so
`AUTHORITATIVE_STATE_VERSION` is untouched.

## Client

`src/client/App.tsx` now has one shared `HandCard` component used by both the
M10 checkpoint hand and the M19 test-act hand (the markup was previously
duplicated). It:

- renders `explanation.summary` on the card face,
- renders the full `explanation.lines` plus the position text in a popup on
  mouse hover, keyboard focus, and via `aria-describedby` for assistive tech,
- keeps the card button's existing classes, `data-testid`, `data-card-name`,
  and `data-card-damage` attributes, so clicking still plays the card and the
  existing regression spec keeps passing,
- closes the popup on Escape while focused.

`src/client/App.css` adds `.card-slot`, `.card-effect`, `.card-popup*`, and a
`.sr-only` utility. The popup is `pointer-events: none` so it cannot flicker or
steal clicks.

## Verification actually run on this branch

| Command | Result |
|---|---|
| `npm run check` | pass (generated types up to date, `tsc --noEmit` clean) |
| `npm run test:engine` | 305 passed (20 files), including 10 new card-text tests |
| `npm run test:content` | 29 passed |
| `npx playwright test` | 8 passed (`card-explanations`, `m10-combat`, `morrow-preview`) |

Visual check: hovered screenshots of `/?` and `/?fixture=m19` were inspected and
the popup renders for both routes without clipping the hand.

Note: one full-suite run failed `morrow-preview` on first-run Chromium warm-up;
it passed on the clean HEAD, in isolation with the feature changes, and on the
repeat full-suite run. It is an environment flake, not a regression.

## Known limitations and next steps

1. **The popup is not the whole 7.5 preview.** The design spec also asks for the
   prospective Reaction, resulting Imprint, exact post-modifier cost, and
   expected HP/Block change. Those need a projection entry point over
   `resolveReactionRecipe` / `boostImprintPotency` plus the information-redaction
   test from `docs/DESIGN.md` 7.6 before the UI may show them.
2. **Reward options are still id-only.** The M18 reward panel cannot explain
   card options because the browser has no runtime registry of schema card
   definitions (`content/cards/**/*.json` is validated by Node tooling only).
   Shipping a generated client-readable catalog is the unblocking step, and
   `describeContentCard` is already the right consumer for it.
3. **Disabled cards cannot be focused.** A card with insufficient Energy uses
   `disabled`, so keyboard users get its explanation from the on-face summary
   line rather than the popup. Replacing `disabled` with `aria-disabled` would
   make the popup reachable but changes play gating and existing selectors, so
   it was left alone.
4. **M20/M21 worktrees are unmerged.** Those branches also touch `App.tsx`; when
   they merge, re-run the browser suite here.

## Uncommitted leftovers

The working tree carries untracked `.DS_Store` files at several levels. They are
not part of this change and were deliberately left unstaged.
