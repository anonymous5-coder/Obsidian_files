I am continuing the Top_Models project in a new conversation because the previous interface has reached its context limit.

## SHARED CONTEXT

I have attached two resources:
1. codebase_1.md — codebase architecture, file layout, and roadmap.
2. conversations.md — a combined transcript of the last two conversations from the previous interface.

Read both before responding. Treat them as the primary reference. However, codebase_1.md may lag recent decisions and does not cover the mobile workaround setup. Where it conflicts with conversations.md or with the ENVIRONMENT section below, prefer conversations.md and this prompt.

If either resource lacks detail on the items listed in ENVIRONMENT, VERIFICATION, or DESIGN DIRECTION below, ask me before assuming.

## ENVIRONMENT (mobile, Termux-based)

- Everything runs in Termux on an Android phone. No PC is involved.
- Two background processes run during development:
  - python3 -m http.server 8080 (serves the dashboard files)
  - python3 proxy.py (local CORS proxy on port 8081)
- The CORS proxy is REQUIRED for BROWSER access to the NVIDIA, SambaNova, and LLM7 adapters, because their public endpoints do not send proper CORS headers. Without the proxy, those three tabs will show "Failed to fetch" in the browser. In the CLI, no proxy is needed — Node.js has no CORS restriction.
- API keys are user-provided (BYOK). In the browser they live in localStorage; in the CLI they live in config.json.
- The project covers 9 providers: openrouter, groq, gemini, sambanova, mistral, cohere, llm7, modelscope, nvidia.

## VERIFICATION WORKFLOW

- You (the agent) run: node --check on modified files, and CLI tests like models refresh.
- I (the user) run: browser tests at http://localhost:8080 on my phone.
- You do NOT have browser access.
- After each milestone, ask me to run the browser test and report results.
- Do NOT claim a browser-level change works until I confirm it.

## GIT STATE

- Commits are local only. Nothing has been pushed to origin since Phase 0A.
- Do NOT push unless I explicitly ask.
- Create a new commit per milestone. Do not amend prior commits unless instructed.

## WORKING STYLE

- Work in small, verifiable milestones. Stop for verification between steps.
- Plan first for non-trivial changes; execute only after I approve.
- Prefer additive changes with explicit safeguards over rewrites.
- Do NOT modify files outside the current milestone's scope.
- Avoid over-engineering. If you see a simpler approach, propose it.
- When producing audits, plans, or reports, save them to ~/storage/downloads/ so I can review and share them.

## DESIGN DIRECTION (shapes future milestones 0C-6D and 0C-6E)

Two upcoming milestones are already conceptually sketched:

1. 0C-6D — Dynamic Filter UI:
   - Filter controls are driven by a declarative field-groups config.
   - Key group idea from earlier discussion:
     - KG_filter: fields that decide whether a model appears at all (e.g., free, is_chat).
     - KG_column: fields that only affect how a model is ranked (e.g., context_length, benchmarks).
   - Filters must be minimal — starting with a free (true/false/both) toggle and an is_chat toggle.
   - Do NOT hardcode filter fields; derive available options from the provider's normalized data.

2. 0C-6E — Dynamic Column UI:
   - Remove the hardcoded 6-column logic.
   - Column set is derived from the KG_column field group.
   - Users can add/remove/reorder columns.
   - Models never disappear from the table when column config changes — only their ranking position changes.

The full milestone roadmap is:

- 0C-6C: UI foundation (overlay fix + rich model persistence) — COMPLETE
- 0C-6D: Dynamic Filter UI (free/is_chat toggles) — 1-2 prompts (next)
- 0C-6E: Dynamic Column UI (remove hardcoded 6 columns) — 2-3 prompts
- 0C-2:  AA Integration (fetch + fuzzy match + merge) — 3-4 prompts
- 0C-7:  Column Transparency / Tooltips — 1 prompt
- Final:  GitHub push + live site verification + proxy for live CORS + APK rebuild — 2-3 prompts

## WHERE WE ARE

- 0C-6A (schema extension) — verified.
- 0C-6B (pipeline reorder + adapter audit fixes) — verified.
- 0C-6C (overlay fix + filter placeholder + rich model persistence) — verified.
- Next up: 0C-6D (Dynamic Filter UI).

## VERSION STATE (as of 0C-6C completion)

- index.html module import: currently ?v=0F
- sw.js CACHE_NAME: currently matrix-cache-v7
- Next bump will target ?v=0G and matrix-cache-v8 (confirm by grepping the actual files).

## YOUR FIRST TASK

Before implementing anything, confirm:
1. You have read both attached files.
2. The pipeline architecture described in codebase_1.md matches the actual source files (adapters/_pipeline.js, adapters/_normalize.js, core.js).
3. The current index.html version string and sw.js CACHE_NAME (by grepping the files) match what is stated in VERSION STATE above.

Then wait for my next message, which will contain the 0C-6D prompt.