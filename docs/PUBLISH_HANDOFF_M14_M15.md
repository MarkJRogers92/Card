# Publish handoff — M14 hardening and M15

Repository: `MarkJRogers92/Card`

This file exists because two commits of M14 hardening and the whole of M15 were
implemented in an environment whose GitHub credential is read-only (`git push`
returns `403 Permission ... denied`). Everything is committed locally; nothing
is lost, and no history was rewritten.

## What is on GitHub right now

- `main` — M00–M01 publication only (`33be69f`).
- `claude/m14-first-relics` — accepted M14 (`7ace3d4`, CI run `34548620092`
  passed at `2221c093`; run `34550913883` passed at `7ace3d47`).
- All other `codex/m*` and `claude/m*` milestone branches from earlier
  milestones.

## What is NOT on GitHub yet

Two branches exist only in the local checkout
`/Users/markrogers/Documents/Github Code/Card`:

1. `claude/m14-first-relics` is **two commits ahead** of the pushed head:

   - `23927b9` — `fix(engine): reject duplicate relic installation`
     Shared Warranty is declared both as the M09 initial passive and as M14
     relic content; trigger bindings are keyed `sourceId::triggerId`, so
     installing both silently doubled the relic's printed effect. The guard
     rejects a relic whose source already owns bindings, with a focused test.
   - `82227aa` — `docs: record M14 duplicate-relic hardening`

2. `codex/m15-remaining-relics` — new branch, based on the M14 branch above,
   containing M15 (Refund Capacitor, Arc Welder, Counterfeit Seal, Carbon Copy,
   Blank Badge) plus its tests, CI workflow, and docs. The tip is the commit
   whose subject is `feat: implement M15 remaining relics` plus this handoff's
   documentation commit.

Neither branch has run GitHub Actions, because Actions triggers on push.

## How to publish (one copy-paste block)

Run this from a terminal that has write access to the repository (the normal
macOS login keychain / GitHub Desktop credentials on this machine work):

~~~bash
cd "/Users/markrogers/Documents/Github Code/Card"

# Optional sanity check before publishing
git log --oneline -3 codex/m15-remaining-relics
git status --short          # expect no output

git push origin claude/m14-first-relics
git push origin -u codex/m15-remaining-relics
~~~

Then watch the two workflows:

~~~bash
gh run list --repo MarkJRogers92/Card --limit 5
# or open:
# https://github.com/MarkJRogers92/Card/actions
~~~

Expected: **M14 Acceptance** green on the new `claude/m14-first-relics` head
(it re-runs the checks plus the M10 browser regression), and **M15 Acceptance**
green on `codex/m15-remaining-relics`.

If `git push` still reports `403`, the stored credential is the problem, not
the repository: create a fine-grained personal access token with
`contents: write` for `MarkJRogers92/Card` and use it (or run
`git push` from GitHub Desktop, which manages its own credential).

## Transferring the work without a network push

A git bundle containing both branches was written next to the checkout:

~~~
/Users/markrogers/Documents/Github Code/Card-m14-hardening-m15.bundle
~~~

Anyone with the bundle can recover everything with:

~~~bash
git clone /path/to/Card-m14-hardening-m15.bundle Card
cd Card
git branch -a          # claude/m14-first-relics, codex/m15-remaining-relics
~~~

or, inside an existing clone:

~~~bash
git fetch /path/to/Card-m14-hardening-m15.bundle \
  'refs/heads/*:refs/remotes/bundle/*'
~~~

## What the next chat should do

1. **If the branches are still unpushed**, do not start new work. Publishing is
   the only remaining step for M14 hardening and M15, and the instructions above
   are complete.
2. **Once pushed and green**, treat `codex/m15-remaining-relics` as the accepted
   head. Do not merge `main`; milestone branches stay independent.
3. **Then start M16** — the three family transformations (Spare Parts, Live
   Wire, Double Booked) from `docs/DESIGN.md` Section 3.11, which requires
   counting distinct relics per family without duplicates counting twice, and
   the origin/repeat restrictions recorded in the M16 roadmap row.

## Facts a continuing chat needs

- `docs/STATUS.md` is the authoritative milestone record and is current as of
  the M15 commit in this branch.
- `docs/milestones/M15_REMAINING_RELICS.md` lists the exact M15 contracts, the
  generic primitives added, and the two consumers that intentionally arrive
  later: `cardRewardOptionCount()` for M18 rewards, and the `grafted` card tag
  authored by M24/M25 Grafting.
- M15's local verification (all green) was: `npm run check`,
  `npm run test:engine` (265 tests), `npm run test:content` (29),
  `npm run content:validate` (30 cards, 10 relics), `npm run test:replay`,
  `npm run test:properties`, every focused `test:m03`–`test:m15` command,
  `npm run build`, and `npm run test:browser` (2 passed).
- The browser regression needs a real Chromium launch; in restricted sandboxes
  it fails with `bootstrap_check_in ... Permission denied (1100)`, which is an
  environment limit, not a test failure.
- Two known follow-ups that are **not** defects: M14's
  `combineMultiplierModifiers` silently ignores non-`multiply` operations on
  the damage-multiplier channel (worth a guard before M16+ relics use it), and
  Counterfeit Seal is inert until a card actually carries the `grafted` tag.
