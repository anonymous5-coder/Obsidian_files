
# CHATGPT  :


Worked for 59s

### GitHub cross-check: Argon’s four reported issues

I verified the key claims against the live `anonymous5-coder/sync` `main` branch and `anonymous5-coder/Top_Models` `backup/0c-6d` branch, including the actual sorting module and the recorded architectural decision report.

Argon has identified real issues that should be resolved before running the preparation prompt. Two clarifications are especially important: `Routing_Rank` must not be conflated with Task Fit, and the app’s independently ranked columns must not be treated as one conventional row-sorted spreadsheet.

### What the live repositories confirm

| Item                                                           | Verification result                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PREPARATION_REPORT_ARGON_4_DECISIONS.md exists in sync/main    | Confirmed. It has SHA 0910e02e05b3c224b7803ba943a1304f987d2c6e. It should be treated as an existing historical report, not as a missing file.                                                                                  |
| MASTER_PLAN.md is the forward-planning authority               | Confirmed. Its live SHA is 66a0f9127bdac9599d3ad896edc4679226b4c2c9.                                                                                                                                                           |
| backup/0c-6d contains the existing fixed-column implementation | Confirmed. index.html has SHA 73b8a0b02a30fbc9ece33d2e9d7a5bf9e40da03d.                                                                                                                                                        |
| The local Termux checkout is currently on main                 | Not independently verified in this session. The historical report records that state at the time of its audit, but a GitHub branch inspection cannot establish the phone’s current local branch, HEAD, or working-tree status. |
| DEC-04 and DEF-01 through DEF-05 must be checked               | Argon’s report identifies the need to retain these checks. The unified prompt should explicitly incorporate them rather than assume a separate audit has already been performed.                                               |

The report’s historical baseline says the app was on `main` at `a31f09d`, with `942bb06` as its preceding milestone baseline. That does not establish the present local checkout state. Likewise, your clarification that `backup/0c-6d` is the updated GitHub branch is consistent with the source branch inspected here.

### 1\. The most important correction: Routing_Rank and Task Fit

Argon is right to flag an interaction ambiguity, but the distinction between the two mechanisms is already clearly established by your clarification.

### Task Fit — prompt-driven attribute selection

The user enters a natural-language task prompt. An LLM selects relevant `KG_column` attributes—including attributes hidden from the Standard layout—and orders them by priority. The temporary matrix displays those selected attributes from highest priority to lowest, left to right.

Changes the table’s attribute selection and column priority.

### Routing_Rank — availability/capacity-aware ranking

The ranking mechanism combines the metric belonging to each individual column with applicable availability and capacity signals, such as latency, TTFT, uptime, RPM, RPD and TPM. It must preserve the independent leaderboard belonging to each column.

Changes the ranking of candidates within each column; it is not a filter.

The revised prompt currently says both that the mechanisms solve separate problems and that switching `Routing_Rank` on activates the temporary Task Fit matrix. That leaves an unresolved trigger and lifecycle question, not an unresolved definition of the two mechanisms.

The preparation audit should retain both mechanisms as separate capabilities and ask agy-termux to recommend the cleanest interface for activating them together. It must not silently decide that toggling Routing_Rank automatically submits the prompt or invokes Task Fit.

### 2\. The independent-column invariant is critical

Argon’s fourth point is technically significant and should be treated as a mandatory architectural constraint.

The current `adapters/_pipeline.js` creates six separate ranked arrays by calling `sortModelsForColumn(filteredModels, c)` for each column. The `index.html` state similarly stores six arrays in `appState.rankedColumns`. The current implementation therefore represents independent rankings—not one global row order. [Inspect the pipeline on backup/0c-6d](https://github.com/anonymous5-coder/Top_Models/blob/backup/0c-6d/adapters/_pipeline.js?utm_source=chatgpt.com).

Routing_Rank must preserve that invariant:

* Standard: Each column follows its existing sort hierarchy.

* Task Fit: The visible columns and their left-to-right priority come from the LLM’s attribute selection.

* Routing_Rank: Each visible column gets its own adjusted candidate ranking using that column’s attribute and defensible capacity/availability signals.

* Restoration: Turning Routing_Rank off restores the previous Standard matrix state and export projection.

A global routing decision may ultimately need to choose one deployment for a particular task. That is a separate concern from reranking every column in the matrix. The preparation report should explain this distinction and avoid implementing a single horizontal row order across all columns.

### Current sort behavior

The source file `adapters/_sorting.js` defines the following hierarchies:

| Column index | Primary ranking            | Further tie-break criteria                                                            |
| ------------ | -------------------------- | ------------------------------------------------------------------------------------- |
| 0            | Context length, descending | Files, context length again, max output, intelligence, agentic, uptime                |
| 1            | Intelligence, descending   | Context length twice, max output, tools, uptime                                       |
| 2            | Coding, descending         | Agentic, tools, max output, context length, intelligence, context length again        |
| 3            | Agentic, descending        | Tools, coding, max output, context length, intelligence, context length again, uptime |
| 4            | Max output, descending     | Context length twice, intelligence, coding, agentic, uptime                           |
| 5            | Refusal rate, ascending    | Coding, agentic, intelligence, context length twice, max output, uptime               |

Missing values generally use `-999999`, while missing refusal rates use `+999999`. The function returns `0` when all hierarchy entries compare equal, so it has no explicit final model-ID tie-breaker. These details are visible in the live [sorting module](https://github.com/anonymous5-coder/Top_Models/blob/backup/0c-6d/adapters/_sorting.js?utm_source=chatgpt.com).

Note that the existing source calls column 4 `max_completion_tokens`; the display label in the plan refers to “Summarizer / Max Output.” The audit should preserve that source-versus-label distinction.

### 3\. Baseline correction: use commit verification, not a branch-name assumption

Argon’s suggested correction is appropriate.

The preparation prompt should require agy-termux to inspect the actual local repository state and establish whether the working tree corresponds to the expected baseline. It should not stop merely because the local branch is named `main` instead of `backup/0c-6d`.

A suitable instruction is:

> Baseline verification: Inspect the local branch, HEAD, remotes, and working-tree status. Verify the expected commit `942bb06`, its relationship to the checked-out HEAD, and the relevant source identifiers `core.js?v=0I` and `matrix-cache-v11`. The local branch may be `main` or `backup/0c-6d`; branch-name equality alone is not a pass or fail criterion. If HEAD is newer than the expected baseline, compare the commit ancestry and working-tree content to determine whether the newer state is intentional. Record declared and observed values and stop only where a material discrepancy prevents reliable analysis. Never switch branches or modify the checkout to make the baseline match.

This does not mean that a newer commit should automatically be accepted. The agent must verify which code is actually present, including uncommitted changes.

### 4\. Include DEC-04 and DEF-01 through DEF-05

The existing report is present in `sync/main`; its SHA matches the historical report referenced in your uploaded conversation. It records all four architectural decisions and includes a defects section. The unified prompt should make the report optional to read only as a fallback for availability—not because it is absent from GitHub.

It should also explicitly carry these checks forward:

| Finding | What the new audit must verify                                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- |
| DEC-04  | Cross-provider refusal-rate fallback when api_key_openrouter is absent, against the current specification and implementation. |
| DEF-01  | Whether applyModelFilters() genuinely evaluates all declared filters, rather than only free and is_chat.                      |
| DEF-02  | Whether expansion state and ranked-column lookup use compatible identities and indices.                                       |
| DEF-03  | Whether the Global Matrix is registered and supported by provider selection and refusal-rate controls.                        |
| DEF-04  | Whether global refresh dispatches through a global pipeline rather than calling the single-provider pipeline with all.        |
| DEF-05  | Whether the build-sync ledger incorrectly requires copying refusal_rates.json when that copy step already exists.             |

These are historical findings to revalidate, not proof that every defect remains unchanged on every branch. The report itself warns that its findings must be checked against current source. The live registry on `backup/0c-6d` confirms nine implemented Group A adapters and four planned Group B entries marked `implemented: false`. See the [provider registry](https://github.com/anonymous5-coder/Top_Models/blob/backup/0c-6d/adapters/_registry.js?utm_source=chatgpt.com).

### 5\. Additional issue worth preserving in the unified audit

There is one further architectural detail the revised prompt should make explicit.

The current implementation contains two different concepts of ranking that need a documented contract:

* The ranked array for each displayed column.

* The ordered attributes selected by Task Fit.

These should not be represented by one ambiguous `rankedColumns` structure. The audit should propose a clear separation among the active column definitions, per-column candidate rankings, the temporary Task Fit column order, and the routing evidence used to compute each adjusted ranking. It should then trace how those structures map to exports.

This is an audit recommendation, not a decision to prescribe particular implementation names or rewrite the source before the report is reviewed.

### Verdict and next step

Do not run the current prompt unchanged. Argon’s findings warrant a unified revision incorporating the baseline correction, optional historical-report handling, DEC-04/DEF checks, and the independent-column ranking invariant.

One important boundary remains: the Task Fit prompt’s activation and the Routing_Rank toggle’s activation are distinct. The audit should analyze their possible combinations and recommend the UX interaction; it must not merge them into a single mechanism without your approval.

No files or GitHub branches were changed in this verification. The next preparation prompt should still be read-only and should stop after creating the report, without producing an execution prompt.

# Argon's response and suggested prompt:

### 1. Intent
Analyze the latest conversation turn in 2_Conversations.md, evaluate ChatGPT's GitHub cross-check against our findings, reconcile the state difference between your GitHub sync repository and your Google Drive sync folder, and assemble the **definitive, unified, copy-paste-ready Stage 1 Preparation Prompt** for agy-termux.
### 2. Evidence & Cross-Check Analysis
From 2_Conversations.md, you shared my four flaw findings and your four direct clarifications with ChatGPT. ChatGPT inspected the live GitHub branches (anonymous5-coder/sync main and anonymous5-coder/Top_Models backup/0c-6d) and confirmed all four points:
 1. **Routing_Rank vs. Task Fit (Flaw 1 — Resolved & Agreed):**
   * Both you and ChatGPT confirmed that **Task Fit (Mode 2)** and **Routing_Rank** are **two distinct mechanisms**:
     * **Task Fit (Prompt-Driven Column Selection & Priority Ordering):** Driven by the user's natural-language prompt at the top of the page (available on both the Global Matrix homepage and individual Provider pages). The LLM selects relevant KG_column attributes from the full registry (including hidden attributes) and orders the visible columns left-to-right by priority (1^{\text{st}} priority = 1^{\text{st}} column, n^{\text{th}} priority = n^{\text{th}} column) in a temporary matrix.
     * **Routing_Rank (Availability/Capacity-Aware Per-Column Leaderboard Reranking):** Controlled by the dedicated top-bar toggle button (Routing_Rank). It adjusts the candidate ranking **inside each visible column** by combining that column's KG_column metric with capacity/availability signals (latency, TTFT, uptime, RPM, RPD, TPM).
   * Because they are distinct mechanisms, agy-termux must analyze their 4 possible state combinations (Standard + Routing_Rank OFF, Standard + Routing_Rank ON, Task Fit + Routing_Rank OFF, Task Fit + Routing_Rank ON) and recommend the cleanest UI trigger/restoration flow without merging them into one mechanism.
 2. **The Independent-Column Leaderboard Invariant (Flaw 4 — Confirmed Mandatory Constraint):**
   * You noted regarding Flaw 4: *"I have no idea about that, you can understand that."*
   * Here is the plain-English explanation of why this protects your app: in Top_Models, **Column 1 (Context)** and **Column 2 (Coding)** are separate vertical leaderboards (appState.rankedColumns[colIndex]). Row 1 of Context is the #1 Context model, while Row 1 of Coding is the #1 Coding model (they are not the same model across a horizontal row).
   * ChatGPT verified this in adapters/_pipeline.js and adapters/_sorting.js on backup/0c-6d and agreed it must be enforced as a **mandatory architectural constraint** so agy-termux computes Routing_Rank per column rather than breaking your matrix layout.
 3. **Why PREPARATION_REPORT_ARGON_4_DECISIONS.md Was on GitHub sync/main vs. Google Drive sync (Flaw 3 — Reconciled):**
   * You clarified that PREPARATION_REPORT_ARGON_4_DECISIONS.md is already present in sync, and ChatGPT verified its existence on GitHub anonymous5-coder/sync (main), noting that it also recorded a local commit a31f09d after 942bb06.
   * **Important Sync Discrepancy Identified:** Your **Google Drive sync folder** currently has only 4 files (MASTER_PLAN.md, PREPARATION_PROMPT_TEMPLATE.md, codebase_1.md, execution_readiness.md)—meaning PREPARATION_REPORT_ARGON_4_DECISIONS.md was pushed to GitHub sync/main from Termux (~/storage/downloads/Sync/), but has not yet been copied/synced into your Google Drive sync folder.
   * Including PREPARATION_REPORT_ARGON_4_DECISIONS.md in the prompt (alongside explicit re-verification of DEC-04 and DEF-01 through DEF-05) ensures agy-termux reads the file locally in ~/storage/downloads/Sync/ and carries all findings forward into the new report.
 4. **Baseline Verification Rule (Flaw 2 — Confirmed):**
   * Both 942bb06 (the 0C-6D baseline on backup/0c-6d) and any newer local commit on main (such as a31f09d referenced in the prior report) will be inspected by commit ancestry and working-tree content rather than failing on branch-name equality alone.
 5. **ChatGPT's Additional Point #5 (State Structure Separation — Included):**
   * ChatGPT rightly pointed out that agy-termux did not Yet have an explicit instruction to keep these four state structures cleanly separated in appState:
     1. Active column definitions (activeColumns)
     2. Per-column candidate rankings (rankedColumns[colIndex])
     3. Temporary Task Fit selected/prioritized column order
     4. Routing_Rank capacity/availability scoring evidence and export projection
### 3. Notice What ChatGPT Did at the End of 2_Conversations.md
In 2_Conversations.md, ChatGPT validated all four fixes and added Point #5, **but stopped after giving its verdict without actually outputting the updated full prompt text** (*"Do not run the current prompt unchanged. Argon's findings warrant a unified revision..."*).
To save you another round-trip, I have integrated **all 5 corrections** directly into ChatGPT's prompt below so you have the **complete, unified, copy-paste-ready prompt** for agy-termux.
### 4. Unified Preparation Prompt for agy-termux (Ready to Copy & Run)
```markdown
## PREPARATION PROMPT — AUDIT KG_COLUMN, GLOBAL MATRIX, TASK FIT & ROUTING_RANK

### 1. Mission

Perform a strictly read-only, evidence-grounded audit of the Top_Models application and its sync planning repository. Reconcile the existing implementation and roadmap with the owner's clarified product requirements for dynamic columns (`KG_column`), the Global Model Matrix, `Task Fit` (Mode 2), the `Routing_Rank` toggle, pre-calculated model-capacity estimation, capability/modality semantics, and JSON exports.

Preparation only. Investigate, explain, propose, and report. Do not implement features or edit canonical planning documents.

### 2. Authoritative Repositories and Baseline Verification

Application repository:
- Local path: `~/Top_Models/`
- Reference GitHub repository/branch: `anonymous5-coder/Top_Models`, branch `backup/0c-6d`
- Expected milestone baseline: commit `942bb06` (with `core.js?v=0I` and `matrix-cache-v11`), or a known descendant commit on local `main` (such as `a31f09d`).

Planning repository:
- Local path: `~/storage/downloads/Sync/`
- GitHub repository/branch: `anonymous5-coder/sync`, branch `main`

Read and cross-reference:
- `MASTER_PLAN.md`
- `codebase_1.md`
- `execution_readiness.md`
- `PREPARATION_PROMPT_TEMPLATE.md`
- `PREPARATION_REPORT_ARGON_4_DECISIONS.md` (present in `sync`; read and carry forward its findings, and explicitly re-verify `DEC-01` through `DEC-04` and `DEF-01` through `DEF-05` against current live source lines)
- The owner clarification file, if present in the local working environment: `Misalignment and clarifications.md`

Baseline verification rule:
Inspect the local branch, HEAD, remotes, and working-tree status independently. Verify the expected baseline commit `942bb06`, its relationship to the checked-out HEAD, and the active identifiers `core.js?v=0I` and `matrix-cache-v11`. The local branch in `~/Top_Models/` may be `main` or `backup/0c-6d`; branch-name equality alone is not a pass or fail criterion. If HEAD is newer than `942bb06`, compare commit ancestry and working-tree content to determine whether the newer state is intentional. Record declared and observed values, and stop only where a material source discrepancy prevents reliable analysis. Never switch branches or modify the checkout to make the baseline match.

### 3. Strict Preparation Boundary and Report Handling

Do not modify, create, delete, rename, or format application source files or canonical planning Markdown documents. Do not install packages, run builds, start servers, call inference APIs, run quota-consuming probes, switch branches, commit, push, or deploy.

Create exactly one report if it does not already exist:

`~/storage/downloads/Sync/PREPARATION_REPORT_GLOBAL_MATRIX_ROUTING.md`

If that report already exists, do not overwrite, rename, or work around the collision. Stop report creation and report the conflict honestly.

Research provider documentation using safe, read-only internet access where available. This research is allowed during preparation; it must not make inference requests or alter the repositories.

### 4. Owner-Confirmed Requirements

Treat all requirements in this section as settled owner intent. Do not reopen them as unapproved proposals.

#### 4.1 Dynamic KG_column System — DEC-01 Option A Selected

Use an ordered active-column list (`activeColumns`), stable string attribute IDs, and a lookup/index resolver compatible with array-aligned per-column ranking (`rankedColumns`).

`KG` means "key group" as the owner's conceptual term for keys/attributes available in JSON data. `KG_column` means an attribute eligible to appear as a matrix column. These are conceptual labels only; do not assume that `KG`, `KG_column`, or a similarly named identifier/function currently exists in source code. Verify this.

Each visible column header must have an action menu with:
1. **Edition (Change Attribute):** Change this column's attribute to another available `KG_column` attribute.
2. **Deletion (Remove/Hide):** Remove/hide this column from the active visible table layout and its export projection.
3. **Addition (Insert Left):** Insert a column immediately to the left using an available `KG_column` attribute.
4. **Addition (Insert Right):** Insert a column immediately to the right using an available `KG_column` attribute.

The same column operations apply to both the Standard matrix and the temporary `Task Fit` matrix, both on individual provider pages and in the homepage's Global Model Matrix.

Removing a column removes it from the current visible table layout and its active JSON export projection, without deleting that attribute's definition from the registry or destroying the underlying model's original normalized data record.

Audit the design for:
- Stable column IDs and replacement semantics.
- Duplicate attributes/columns and insertion behavior.
- Minimum visible-column invariant (at least 1 visible column).
- Persisted Standard column layout vs. temporary layout isolation and restoration.
- Expanded-row/cell behavior after adding, removing, or replacing columns (including `DEF-02` verification).
- Mobile header actions, touch targets, menu dismissal, and accessibility on Android.
- Export projection behavior after add, remove, or replace operations.
- Compatibility with future semantic projections and new provider attributes.

Report genuine unresolved UX/product details with plain-language options and recommendations. Do not silently invent owner decisions.

#### 4.2 Standard Matrix and Global Model Matrix — DEC-02 Confirmed

The table is **attribute-centric, not provider-centric**.
- Columns are `KG_column` attributes (such as Context Length, Thinking/Intelligence, Coding, Agentic, Summarizer/Max Output, Refusal Rate, Uptime, Latency, Modalities, and other available attributes).
- Each column is an independently sorted vertical leaderboard of candidate models (`appState.rankedColumns[colIndex]`).
- For the Global Model Matrix, the candidate catalog is formed from all configured, working providers' returned model deployments. Providers are the sources of model candidates—not separate provider-specific table sections and not a fixed 9-row provider table.
- The same underlying model can appear as multiple distinct candidates if it is available through different provider deployments. Preserve provider/model identity (`_providerId` and composite key `<providerId>:<modelId>`) in the underlying data, UI badges, and exports so deployments can be compared and routed accurately.
- **No Silent Truncation:** The Global Model Matrix must represent the full available catalog returned by configured providers, subject only to explicit user-selected filters. Never silently restrict it to a top-10, top-100, or arbitrary shortlist. UI pagination/virtualization is acceptable only if the full catalog remains accessible to ranking, routing, and export.
- **Global Settings vs. Global Model Matrix:** Global-level operations (refresh, refusal-rate estimation, filter controls, column configuration, `Routing_Rank`, and export) operate across the Global Model Matrix on the homepage, while individual provider pages retain local per-provider operation behavior.

Audit existing Spec 2.2 (and verify `DEF-03` and `DEF-04` in `_registry.js`, `_pipeline.js`, and `index.html`) to identify everything required to implement this cleanly.

#### 4.3 Standard Ordering Logic and the Independent-Column Leaderboard Invariant

Inspect the actual implementation in `adapters/_sorting.js`, `adapters/_pipeline.js`, `core.js`, and `index.html`.
- Document the exact current sort hierarchy for every existing column (primary key, secondary tie-breakers, sort direction, repeated keys such as `context_length`, missing/null value fallbacks `-999999` / `+999999`, and the `max_completion_tokens` source key vs. "Summarizer / Max Output" display label).
- **Mandatory Architectural Invariant:** Preserve the `Top_Models` matrix structure where each visible column `c` represents an independently sorted leaderboard of candidate models (`appState.rankedColumns[c]`), NOT a single horizontal spreadsheet row where every cell across a row belongs to the same model.

#### 4.4 Two Distinct Mechanisms: `Task Fit` (Mode 2) vs. `Routing_Rank` Toggle

The owner has explicitly confirmed that **`Task Fit` (Mode 2)** and **`Routing_Rank`** are **two separate mechanisms** that solve different problems:

1. **`Task Fit` (Mode 2 — Prompt-Driven Column Selection & Priority Ordering):**
   - Available on both individual provider pages (using that provider's models) and the homepage Global Model Matrix (using all providers' models).
   - Triggered when the user enters a natural-language task prompt in the upper portion of the page.
   - An LLM evaluates the prompt against the **entire `KG_column` registry** (including attributes currently hidden in the Standard matrix), selects the task-relevant `KG_column` attributes, and orders those columns left-to-right by priority ($1^{\text{st}}$ priority = $1^{\text{st}}$ column, $2^{\text{nd}}$ priority = $2^{\text{nd}}$ column, ..., $n^{\text{th}}$ priority = $n^{\text{th}}$ column).
   - Transforms the view into a temporary matrix showing only those prioritized columns (with full support for header column operations and its own active JSON export projection), and cleanly reverts to the prior Standard matrix (and Standard JSON projection) when exited/restored.

2. **`Routing_Rank` (Availability & Capacity-Aware Per-Column Reranking Toggle):**
   - A dedicated top-level toggle button beside page-level controls (Refresh, Refresh Refusal Rates, Export)—**not** inside the Filter popover.
   - Available both locally on individual provider pages and globally on the homepage.
   - When `Routing_Rank` is ON, it **does not reorder columns** and **does not filter out models**. Instead, for **each visible column independently**, it re-ranks the candidate models inside that column's leaderboard by computing that column's `KG_column` attribute together with availability and capacity signals (`latency`, `TTFT`, `uptime`, `RPM`, `RPD`, `TPM`).
   - When `Routing_Rank` is toggled OFF, each column's ranking and export projection revert to standard attribute sorting (and if `Routing_Rank` is used as the exit/restore toggle for a temporary routed view, it restores the Standard matrix without mutating the underlying master model records).

**Interaction & State Lifecycle Audit Required:**
Because `Task Fit` (column selection/ordering via prompt) and `Routing_Rank` (per-column availability/capacity reranking via toggle) are distinct mechanisms, analyze how they interact across all valid states:
- What happens when `Routing_Rank` is toggled ON while viewing the Standard matrix (without a task prompt)? Does it apply availability/capacity reranking to the currently visible Standard columns?
- What happens when a user submits a `Task Fit` prompt? Does `Task Fit` reorder the columns first while allowing `Routing_Rank` to toggle availability/capacity reranking on those prioritized columns, or how should their triggers/restoration controls be coordinated so no separate redundant Cancel button is needed?
- Propose a clean separation in `appState` between: (a) Standard active column definitions, (b) temporary `Task Fit` prioritized column definitions, (c) per-column candidate rankings (`rankedColumns`), and (d) `Routing_Rank` scoring/capacity evidence.

### 5. Routing Ranking and Capacity-Aware Decisions

#### 5.1 Per-Column `Routing_Rank` Computation

For each visible column `c` with primary attribute $A_c$, `Routing_Rank` must compute an adjusted ordering of candidate models within column `c` using:
- The column's primary attribute $A_c$ (and applicable tie-breakers).
- Defensible availability, reliability, and capacity signals (`latency`, `TTFT`, `uptime`, `RPM`, `RPD`, `TPM`).
- Explicit handling of missing, stale, static-baseline, or unknown values (do not conflate static capacity limits like RPM/TPM with live remaining quota).

Compare candidate mathematical/algorithmic approaches (e.g., composite normalized utility score per column, staged capacity-tier + attribute ranking, or penalty/boost multipliers) and recommend an explainable, auditable default without declaring unapproved weights as owner-approved.

#### 5.2 Live Provider-Capacity Research

Using safe, read-only internet access (no inference probes or API-key mutations), research official documentation and status/rate-limit references across the registered and planned providers (`openrouter`, `groq`, `gemini`, `sambanova`, `mistral`, `cohere`, `llm7`, `modelscope`, `nvidia`, `huggingface`, `replicate`, `deepinfra`, `together`, `cloudflare`) for:
- RPM, RPD, TPM, concurrent request limits, and reset windows.
- Rate-limit response headers (`x-ratelimit-*`, `Retry-After`) or free-tier usage inspection endpoints.
- Latency, TTFT, and uptime/status indicators.
- Scope distinctions (per-model vs. per-key/account/org, tier variations).

Include source URLs, access dates, metric provenance classification (officially documented limit, live header/endpoint value, locally observed value, curated static baseline, unknown/stale), and limitations.

#### 5.3 Pre-Calculated Model-Capacity / Stubbing Engine

Audit the owner's requirement for a pre-calculation layer that estimates whether a model deployment can accept work without hitting rate-limit errors (`429`) and without sending test inference probes to every model.
- Evaluate a conservative state machine (e.g., `eligible`, `near_limit`, `exhausted`, `unknown/stale`) as a recommendation.
- Explain local pre-dispatch reservation, post-response header reconciliation, and window reset calculation.
- Explicitly note the multi-client limitation (local phone state cannot guarantee account-wide remaining quota if the same API key is used concurrently elsewhere without provider-side remaining-quota headers/endpoints).

### 6. LLM Selection Efficiency for `Task Fit`

Answer the owner's question: *Can `KG_column` attribute selection and prioritization be made more efficient/calculable so the LLM uses minimal context, tokens, and processing?*
- Compare:
  1. Compact `KG_column` schema catalog (sending only column IDs, short semantic tags, and data types—never full model rows—to the LLM).
  2. Deterministic client-side keyword/intent scorer that pre-calculates/shortlists candidate `KG_column` priorities, either resolving clear prompts zero-token locally or passing a compact pre-scored vector to the LLM.
  3. Structured JSON output schema (`{ selectedColumns: [...], rationale: ... }`) validated strictly against `COLUMN_REGISTRY`.
- Compare token cost, latency, offline/no-key fallback behavior, and accuracy.

### 7. JSON Data and Export Projection Semantics

The owner requires column operations (add
