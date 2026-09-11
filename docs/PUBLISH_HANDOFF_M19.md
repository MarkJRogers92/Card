# Publish handoff — M19 fixed test act

Repository: `MarkJRogers92/Card`

Branch: `codex/m19-fixed-test-act`

Worktree: `/Users/markrogers/Documents/Github Code/Card/.worktrees/m19-fixed-test-act`

This handoff records that M19 fixed test act acceptance is fully committed locally on top of M18 and is not yet pushed due to a read-only GitHub credential on this machine.

## What is on GitHub right now

- `codex/m16-family-transformations` at remote head `be3181e` (`fix: scope M18 reward claims to transactions`), which already includes committed M18 reward changes.
- No pushed head yet for `codex/m19-fixed-test-act`.

## Environment limitations observed while attempting publish

- `gh` CLI is not installed.
- `~/.ssh` has no usable key for GitHub (`agent/` and `known_hosts` only).
- `ssh -T git@github.com` returns `Permission denied (publickey)`.
- GitHub Desktop credential helper at
  `/Applications/GitHub Desktop.app/Contents/Resources/app/git/libexec/git-core/git-credential-desktop`
  returns `ERROR: Missing DESKTOP_PORT environment variable` unless GitHub Desktop is running.
- The only stored keychain entry for `github.com` is account `MarkJRogers92`, which produced the 403 response.
- No GitHub MCP/connector tool is available in this environment.
- Push failed with:
  - `remote: Permission to MarkJRogers92/Card.git denied to MarkJRogers92.`
  - `fatal: unable to access 'https://github.com/MarkJRogers92/Card.git/': The requested URL returned error: 403`
- `git fetch` works, so this is write-credential failure, not read access.

## What is committed locally

- M18 head content is present and complete.
- M19 commits are present on `codex/m19-fixed-test-act` in order:
  `c21c41f`, `583951f`, `9c8e315`, `6cdd597`, `2421a35`, `ed7f9f5`, `5140eb5`.
- Current tip is `5140eb5` with subject `ci: record M19 fixed test act acceptance`.

## How to publish (one copy-paste block)

Run this from a terminal with write access to GitHub:

~~~bash
cd "/Users/markrogers/Documents/Github Code/Card/.worktrees/m19-fixed-test-act"

# Pre-push sanity check

git log --oneline -8
git status --short          # expect no output
git rev-parse HEAD

git push -u origin codex/m19-fixed-test-act
~~~

Expected after push:

- The workflow file `.github/workflows/m17-ci.yml` is now named **M19 Acceptance**.
- It triggers on pushes to `codex/m19-fixed-test-act`.
- It runs:
  - `npm run check`
  - `npm run test:engine`
  - `npm run test:content`
  - `npm run content:validate`
  - `npm run test:replay`
  - `npm run test:properties`
  - each focused `npm run test:m03` through `npm run test:m19`
  - `npm run build`
  - Chromium installation
  - `npm run test:browser`
- Watch runs at https://github.com/MarkJRogers92/Card/actions

## Local verification already recorded (see `docs/milestones/M19_FIXED_TEST_ACT.md`)

- `npm run check` pass
- `npm run test:m19` — 2 files / 30 tests pass
- `npm run test:engine` — 19 files / 310 tests pass
- `npm run test:content` — 29 tests pass
- `npm run content:validate` — VALID (card 30/30, relic 10/10, enemy 0/0, event 0/0)
- `npm run test:replay` — 1 test pass
- `npm run test:properties` — 5 files / 6 tests pass
- `npm run build` pass
- `npm run test:browser` — 4 tests pass including the new M19 route test

## If the push still reports 403

The stored credential is the root cause, not the repository. The attempt failed with:
`remote: Permission to MarkJRogers92/Card.git denied to MarkJRogers92.` and `fatal: unable to access 'https://github.com/MarkJRogers92/Card.git/': The requested URL returned error: 403`.

`git push -u origin codex/m19-fixed-test-act` could not write any ref, while `git fetch` succeeds.

Re-authenticate git for github.com with a credential that includes `contents: write` and workflow scope:

- classic token with `workflow` scope and `contents: write`, or
- fine-grained token scoped to `MarkJRogers92/Card` with `Workflows: write` and `Contents: write`.

Alternative: push from GitHub Desktop.

## Transfer without a network push

A fallback bundle command is:

~~~bash
git bundle create /Users/markrogers/Documents/Github\ Code/Card-m19-fixed-test-act.bundle codex/m19-fixed-test-act
~~~

This bundle was NOT created during this handoff and remains available only as an optional offline path.

From a recipient terminal, recover with:

~~~bash
git clone /Users/markrogers/Documents/Github\ Code/Card-m19-fixed-test-act.bundle Card
git checkout codex/m19-fixed-test-act
~~~

Or in an existing clone:

~~~bash
git fetch /Users/markrogers/Documents/Github\ Code/Card-m19-fixed-test-act.bundle "refs/heads/*:refs/remotes/bundle/*"
~~~

Then inspect and fast-forward/push from that environment.

## What the next chat should do

1. If the branch is still unpushed, publishing is the only remaining step; do not begin new implementation work.
2. Once pushed and green, treat `codex/m19-fixed-test-act` as the accepted head for M18+M19, and do not merge `main` for acceptance flow.
3. Start next milestones in order: `M20 serialization`, `M21 persistent browser storage`, `M22 map/shops/events/treasure/workshop`.

## M19 caveats for reviewers

- Browser proof currently forces combat to deterministic fixture victory using `run-resolve-node`.
- Browser proof applies 20 fixture damage directly to Morrow instead of completing play via UI.
- M19 rewards come from fixed-act fixture catalog `M19_REWARD_CATALOG` and are not derived from authored production content yet.
