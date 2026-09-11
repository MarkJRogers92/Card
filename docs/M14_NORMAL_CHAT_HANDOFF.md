# M14 normal-chat handoff

Repository: `MarkJRogers92/Card`

Branch: `claude/m14-first-relics`

Base: accepted M13 head `d2994a5e6c1abbe16f2315c8767aaf9ff470a4e9`

## Current state

M14 is an acceptance candidate. Claude's generic state/modifier/reaction
checkpoint at `5f92e5113784aa9f535c21e94699b0a961d065c1` was completed with the
relic-content compiler, five production definitions, focused tests,
workflow, and milestone documentation.

## Verification

All local type, generated-content, unit, content, validation, replay,
property, focused M03–M14, and production-build commands pass. The
focused M14 file passes 10/10 tests. Local Playwright execution is the
only unresolved environmental check: Chromium was absent and its CDN
timed out. Consult the M14 GitHub Actions run before changing status to
accepted.

## Continuation rule

If the M14 workflow is green, record its run ID and exact commit in
`docs/STATUS.md`, this handoff, and
`docs/milestones/M14_FIRST_RELICS.md`, then commit that documentation-only
acceptance record. Do not begin M15 in the same commit, merge to `main`,
or alter the stable M10 browser fixture.
