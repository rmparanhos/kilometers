<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Roadmap-driven workflow

This repo is planned through [docs/roadmap/](docs/roadmap/). On a fresh session, start there — **do not** recommend work from gut feel or training-data priors.

## At the start of a session

1. Read [docs/roadmap/README.md](docs/roadmap/README.md) — the status board is the source of truth.
2. If a milestone is **In Progress**, the default next task is one of its unchecked `[ ]` items. Prefer finishing the active milestone over opening a new one ("close what you open").
3. Only if nothing is in progress, look at the **Backlog** table and propose a candidate — but let the user choose. Explain *why* you'd start there (one of: closes a milestone, high perceived value, reuses existing data/patterns, finite scope). The user may pick differently; accept without pushback.

## While implementing a roadmap item

- Branch off the **current working branch**, not `main`, unless the user says otherwise — features often chain (map-view → histograms → …) and rebasing later is cheap.
- Name branches `feature/<short-kebab>` matching the scope word in the milestone checklist.
- Read the milestone file's **Technical notes** and **Files to modify** before writing code. Re-read referenced source files; don't assume from training data.
- Use [AskUserQuestion] for branching/scope decisions that could go multiple reasonable ways. Don't invent.
- Mirror the **pattern of the last shipped item in the same milestone** — that's the house style the user already accepted.

## When shipping

1. Flip `[ ]` → `[x]` in the milestone file for the item that just landed.
2. If *all* items are checked, update the frontmatter: `status: Shipped` and `shipped: <today>` (absolute date, not relative).
3. Update the status board row in `docs/roadmap/README.md` to match.
4. If a backlog file got promoted into a milestone, delete it (or cross-reference if it has heavy technical notes worth keeping).
5. **Verify before declaring done**: `npx tsc --noEmit` → `npm run build` → dev server smoke (curl the affected pages, grep for the new markup). UI changes get a real browser check when feasible.
6. **Do not commit until the user asks.** When they do, scope commits tightly — one feature per commit; roadmap housekeeping that *belongs* to that feature (milestone flip, backlog cleanup) rides along, unrelated docs do not.

## Environment quirks (Windows)

- `npm` is not on the bash `PATH`; run Node commands via **PowerShell** with the fnm bootstrap:
  `fnm env --use-on-cd | Out-String | Invoke-Expression; fnm use default; npm <cmd>`
- There is a **pre-existing** Turbopack NFT warning on `next.config.ts` during `npm run build` — unrelated to any feature work; do not try to "fix" it unless asked.
- One test (`metrics.test.ts > fillGaps`) has been failing on `main` for a while — not a regression indicator.

## Things *not* to do

- Don't skip reading the roadmap and jump straight to code based on the branch name.
- Don't bundle multiple milestones' worth of changes into one commit.
- Don't edit `git config`, force-push, or bypass hooks. Never. (See the top-level safety rules.)
- Don't keep stale backlog entries after they've been promoted — the status board is the contract.
