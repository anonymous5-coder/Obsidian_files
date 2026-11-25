You are picking up an unfinished task on an Obsidian plugin, "git-sync-companion", on an Android phone via Termux. Another agent was cut off mid-task and you have no memory of it: read all of this and verify the real state before editing. Today is 2026-11-25; commit times are IST.

## Locations
- Vault (a git repo; the plugin auto-commits and pushes it): /storage/emulated/0/Documents/Obsidian. Plugin file, tracked by vault git: .obsidian/plugins/git-sync-companion/main.js
- Standalone repo, NOT under git: ~/projects/git-sync-companion (src/main.ts, src/settings.ts, src/types.ts, main.js)
- Docs in the vault root: GIT_SYNC_ARCHITECTURE_PROPOSAL.md, GIT_SYNC_COMPANION_PROPOSAL.md, REPORT.md, TECHNICAL_CHANGE_REPORT.md
- Earlier agents hand-edited vault main.js and src/*.ts in parallel. Check whether package.json has a build script and report it, but don't run any build. Vault main.js and repo main.js must end byte-identical; `npx tsc --noEmit` checks the TS only.

## Plugin
A floating button (FAB): tap = local commit, hold = commit + pull + push; orange (dirty) / blue (committed locally) / green (synced) / spinner. A boot sync runs at plugin load. An exit handler flushes the active editor and commits when the app goes to the background.

## History (vault git, 2026-11-24)
- 0ca69da (12:32): last good state. Has visibilitychange + pagehide exit handlers (flush, then commit per exitAction); an unguarded desktop workspace.on("quit") handler; async flushActiveEditor; promiseQueue-awaited sync with hasEditsDuringSync; boot sync via one commitAndSync call.
- 5442bd1 (12:49): REMOVED the mobile exit handlers, made quit desktop-only, reworded settings text, rewrote the 4 docs into a "Two-Pillar" model. A mistake: auto commit on app switch/background worked and I want it back. Its benchmark text is worth reusing.
- Then an agent ran `git checkout 5442bd1^ -- <vault main.js + the 4 docs>` (staged, not committed) and ran out of quota. The repo's src/*.ts and main.js may still contain the removal, and the plugin may have already committed the revert. Check, don't assume.
- Docs: an earlier session fixed COMPANION_PROPOSAL section 3.3 (obsidian-git:push = Commit-and-sync, push2 = Push) and added TECHNICAL_CHANGE_REPORT section 4. It did not touch ARCHITECTURE_PROPOSAL or REPORT.md, so those may have stale boot-sync/push2 text.

## Measured facts (single measurements, one device RMX3780, from an earlier agent)
Swipe-out kills the process ~657ms after hide; a mobile commit takes ~1,884ms; flushActiveEditor save() ~150ms. "30ms" and "~300ms" in old docs/settings text are wrong for mobile. Desktop ~30ms is an estimate.

## Rules
- Don't git commit or push; don't start, restart or reload Obsidian or the plugin; don't create files in the vault; don't touch private/ or PROMPT.md. Use `git --no-optional-locks` for read-only git; the only git command allowed to change files is the step 2 `git restore`.
- Add no new behavior (no new guards, flags or refactors; don't re-apply earlier hardening). Report suspected bugs; don't fix them.
- If anything contradicts this prompt (missing paths/commits, unexpected code), stop and report.
- Docs are long: read in ranges, edit surgically. Don't write "verified", "certified" or "100% parity" in docs for things not checked; say what was checked, and mark UI behavior "not device-tested" ("observed by the owner" is fine for what I saw).
- Paste raw command output. Never claim UI behavior works; I'll test on the phone.
- Quota may run out: after each step append a line to ~/backups/PROGRESS-revert.md (outside the vault): done + next. If it exists, resume from it.

## Target
- Mobile: keep visibilitychange (when hidden: flush active editor, then commit/sync per exitAction). Remove the pagehide handler, its field and its onunload cleanup. A swipe-out also fires visibilitychange first, so the commit may be killed mid-way; accepted.
- Desktop: keep the original unguarded quit handler and the exitAction setting/options.

## Steps (code first, docs last)
0. Inspect (read-only) and report in chat (not in a vault file): tools; build script?; `git cat-file -t 0ca69da 5442bd1 bc06072`; `git log --oneline -6`; `git status -s`; grep -c of visibilitychange, pagehide, promiseQueue, hasEditsDuringSync, "quit" in vault main.js, repo main.js, src/main.ts. Don't edit until reported.
1. Back up the current state to ~/backups/<timestamp>/ (outside the vault, new names, never overwrite): vault main.js, repo main.js, src/main.ts, src/settings.ts, the 4 docs.
2. For each of the 5 vault files still showing the removal: `git restore --source=0ca69da --worktree -- <path>`. Skip files already restored.
3. Vault main.js: remove the pagehide handler, its field and its onunload cleanup; nothing else.
4. Settings UI text: fix every wrong "30ms"/"SIGKILL" claim in vault main.js and src/settings.ts. For the exit action: the local commit on app hide is best-effort; it completes on app switch/background and may be cut short by a swipe-out; the flush saves the text first and the boot sync commits the rest on next launch.
5. Make src/main.ts and src/settings.ts logically identical to vault main.js; repo main.js = copy of vault main.js.
6. Docs (pre-rewrite structure, no Two-Pillar), reusing benchmark text from `git show 5442bd1:<file>`: mobile commit ~1.9s and swipe-out kill 657ms (single measurements, RMX3780); desktop ~30ms is an estimate; the exit commit is best-effort (works on app switch/background, observed by the owner; a swipe-out may cut it mid-commit, but the flush already saved the text and the boot sync commits the leftovers; observed recovery: commit bc06072); mobile commits on visibilitychange only; drop the index.lock/lock-corruption claim unless shown; boot sync = one commitAndSync call per plugin load. TECHNICAL_CHANGE_REPORT: add a short honest entry that the removal was tried and reverted because commit-on-background works. REPORT Idea I5: corrected numbers.
7. Audit all four docs against the final code (and obsidian-git's own main.js for command ids; for its data.json print only autoSaveInterval, autoPullOnBoot, autoBackupAfterFileChange, pullBeforePush, syncMethod, disablePush). Check every factual claim and cross-doc consistency; fix wrong claims; the code wins unless it looks like a bug (then report). Also report whether the desktop quit handler registers its work via the `tasks` argument Obsidian passes to the quit event (so the app waits); mark it "not device-tested" in the docs; don't fix.
8. Verify, short output: node --check main.js; cmp vault vs repo main.js; npx tsc --noEmit; the step 0 grep -c counts (pagehide must be 0); grep the 4 docs for "30ms", "~300ms", natively, Two-Pillar, index.lock, "lock corruption", purged, pagehide and list hits as file:line (current text or marked history).
9. Last edit: append (>>; don't rewrite or re-read the file) a section to REPORT.md titled "## Session report 2026-11-25: revert + docs audit": the state found in step 0; files changed; short raw verification output; a docs drift table (doc, location, old claim, what the code says, fixed/flagged); per doc, the recent commits touching it (git log) with a note on which are stale versus the code; what you couldn't verify and suspected bugs. Then reply in chat in 6 lines or fewer pointing to that section.