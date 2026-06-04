---
id: R-2026-W21-005
title: Populate SEO Director Obsidian vault + sync mechanism
status: proposed
domain: seo
segment: meta
metric: agent-bootstrap:seo-director
impact_dollars_monthly: null
effort_tier: s
risk_tier: recommend
source: seo-director
created: 2026-05-20
related_workstream: WS5
---

# R-2026-W21-005 — SEO Director memory integration

## Why now

The SEO Director agent bootstraps from an Obsidian vault that was mostly empty. Future invocations had nothing to inherit. Marketing + Operations directors had this pattern working — SEO did not.

## Change

- `scripts/operations/sync-seo.mjs` — one-way sync GitHub → Obsidian vault.
- `package.json` — `sync:seo` + `sync:seo:watch` scripts.
- `.claude/settings.json` — pre-invocation hook fires `npm run sync:seo` when `seo-director` is invoked.
- `docs/seo/{weekly,recommendations,decisions,plans}/` — engineering-archive folders the sync reads from.
- `docs/seo/weekly/2026-W21.md` + `2026-W21-director.md` — this week's briefing.
- `docs/seo/plans/wedding-cluster-strategy-2026.md`, `blog-cluster-model-2026.md`, `partner-landing-strategy.md` — strategy docs.
- `docs/seo/decisions/S0002-wedding-keyword-prioritization.md` — ADR.
- `.claude/agents/seo-director.md` — updated "First action every invocation" to reference `Plans/` folder.

## Verification

- Invoke `seo-director` in a fresh session; pre-invocation hook fires; vault is populated; agent reads Plans/.
- `npm run sync:seo` is idempotent (compares remote SHA via `.sync-state.json`).

## Status updates

- 2026-05-20: shipped in WS5 PR.
