# M14 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `claude/m14-first-relics`

Base: accepted M13 head `d2994a5e6c1abbe16f2315c8767aaf9ff470a4e9`

## Current state

M14 is **accepted**.

The substantive M14 implementation is at exact commit
`2221c093c6cca649b62a8d811188e0fba3a2ce2b` on
`claude/m14-first-relics`.

GitHub Actions workflow **M14 Acceptance** run
[`34548620092`](https://github.com/MarkJRogers92/Card/actions/runs/34548620092)
completed successfully for that exact commit.

## Acceptance evidence

The single acceptance job passed every recorded step:

- locked dependency installation
- type and generated-content checks
- engine tests
- content tests
- production content validation
- replay determinism tests
- engine property tests
- focused M03–M14 tests
- production build
- Chromium installation
- unchanged M10 browser/replay regression

This closes the only local environmental gap from the candidate handoff:
GitHub Actions successfully installed Chromium and passed the browser
regression that could not be run locally.

## Accepted M14 scope

M14 adds the first five Section 3.10 relics as validated production
content:

- Shared Warranty
- Wetware Die
- Clot Filter
- Organ Bag
- Parallel Port

The implementation uses the generic relic-content compiler/trigger and
modifier bridge described in `docs/milestones/M14_FIRST_RELICS.md`; it
does not add relic-ID branches or alter the stable M10 browser fixture.

## Continuation rule

M15 — remaining relics — is now eligible, but it has **not** been started
in this acceptance-record commit.

Do not merge `main` as part of this handoff. Continue from the accepted
M14 branch/head only when explicitly asked to begin M15.

## Post-acceptance hardening (unpushed)

A later commit on this branch (`23927b9`, "fix(engine): reject duplicate
relic installation") adds the duplicate-source guard described in
`docs/milestones/M14_FIRST_RELICS.md` plus its focused test. It passed the
complete local stack including the M10 browser regression, but it could not
be pushed from the environment that authored it (read-only GitHub
credential, `403`). Push it and confirm M14 Acceptance is green at the new
head before starting M15.

GitHub Pages remains only a fallback for phone-accessible deployment if a
normal preview path fails; it is not part of, and does not replace, the
CI acceptance record above.
