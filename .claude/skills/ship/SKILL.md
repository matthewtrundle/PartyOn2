---
name: ship
description: The only sanctioned way to get code onto main — branch/worktree setup, rebase on origin/main, quality gates (tsc, lint, vitest), PR creation, security review for high-stakes paths, merge, and MANDATORY post-merge verification that the code actually landed on origin/main and any manual migrations are applied. Use whenever creating a PR, merging, pushing a feature, or when the user says "ship it", "make a PR", "merge this". Also use to verify a past PR really merged. Prevents orphaned-branch merges (PR #125), unapplied migrations breaking prod (PR #130), stale-base branches, and skipped tests.
---

# Ship — branch → gates → PR → merge → PROVE it landed

Getting code onto main has failed here in four distinct ways: a "merged" PR whose code lived on an orphaned commit (#125), code deployed against columns whose migration never ran (#130), branches cut from a stale local main, and red tests squeaking through before CI existed. Every section below exists because one of those happened.

## 1. Pre-flight

- **Verify where you are — never trust memory** (see memory: `shared_checkout_session_collisions.md`; multiple sessions share the main checkout):
  ```bash
  git branch --show-current && git status --short
  ```
- Prefer a worktree for anything non-trivial. If dev-server work is needed in it, `node_modules` must be **copied, not symlinked** (Turbopack can't resolve through symlinks — memory: `worktree_npm_run_dev.md`):
  ```bash
  git worktree add .claude/worktrees/<name> -b <branch> origin/main
  cp -cR node_modules <worktree>/node_modules   # APFS clone, instant
  ```
- **Rebase on origin/main before starting AND again before opening the PR** (memory: `worktree_stale_base_rebase.md` — failing tests on a branch are often already fixed on main):
  ```bash
  git fetch origin && git rebase origin/main
  ```
  If `prisma/schema.prisma` moved in the rebase, run `npx prisma generate`.

## 2. Gates — run locally, paste failures verbatim

| Gate | Command |
|---|---|
| Typecheck | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Tests | `npm run test:run` |

CI ("Test & Lint", a required check on main) runs all three on the PR, but run them locally first — a red gate found locally costs seconds; found in CI it costs a round-trip. A clean diff is not proof; these gates are the minimum bar, not the definition of done (see CLAUDE.md → Working Discipline).

## 3. High-stakes routing

If the diff touches **auth, Stripe/payments, refunds, webhooks, customer PII, or affiliate payouts**: run the `security-reviewer` agent on the diff and `/code-review` before merge. This is mandatory per CLAUDE.md; the security reviewer has caught races, wrong-row bugs, and timing attacks that self-review missed in four separate incidents.

## 4. PR + merge

```bash
git push -u origin <branch>
gh pr create --base main --title "<type>(<scope>): <summary>" --body "..."
```
- Wait for the required "Test & Lint" check to pass. Never merge around a red check.
- Squash-merge is the house style (Changelog entries reference squash SHAs).

## 5. Post-merge verification — non-negotiable

A PR page saying "Merged" is a claim, not a fact (#125's code was reported merged while living on an unreachable commit). Prove it:

```bash
git fetch origin
# 1. The merge commit is reachable from origin/main:
git branch -r --contains <merge-sha> | grep -q "origin/main" && echo REACHABLE
# 2. Spot-check one changed file's content on origin/main:
git show origin/main:<path/to/changed/file> | grep -n "<distinctive line from your diff>"
```

Then, conditionally:

- **Diff touched `prisma/migrations/manual/`** → confirm the migration pipeline sees it and prod schema matches (prevents #130):
  ```bash
  set -a && source .env.local && set +a
  npm run db:migrate:check     # pending-migration count
  npm run db:verify-schema     # declared columns vs information_schema
  ```
- **Diff touched Tailwind arbitrary values** (`[...]` classes, especially with commas/`clamp()`) → after deploy, fetch the served CSS and grep for the class. Tailwind's JIT silently emits nothing for values it can't classify — the page breaks with a clean diff.
- **Diff added/changed a cron** → confirm the schedule is in `vercel.json` on origin/main.

## 6. Report

State: merged SHA, the reachability evidence, gate results, which conditional checks ran, and **anything not verified** (e.g. "deployed CSS not yet checked — Vercel build still running"). A faithful "not yet verified" beats a confident wrong "done".

## Verify-mode

Asked "did PR #N actually land?" — run section 5 against that PR's merge SHA (`gh pr view <N> --json mergeCommit,state`) and report the evidence.
