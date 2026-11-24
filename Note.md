
- ~/projects/git-sync-companion is NOT a git repo; only the vault is. Read-only git applies to the vault only.
-  read GIT_SYNC_ARCHITECTURE_PROPOSAL.md and GIT_SYNC_COMPANION_PROPOSAL.md in the vault root for context.

# prompt

You are continuing work on an Obsidian plugin, "git-sync-companion" (GitSync Companion), on an Android phone via Termux. A previous agent ran out of quota mid-task, and a second agent produced the plan below, which I approved with amendments. Read everything before touching anything.

## Resume check
Before anything else, look for ~/backups/PROGRESS.md. If it exists, show me what it says and ask whether it belongs to this task. If I confirm, resume from the recorded next step instead of restarting. Never overwrite an existing backup.

## Locations
- Repo: ~/projects/git-sync-companion (src/main.ts, src/types.ts, main.js)
- Deployed plugin: /storage/emulated/0/Documents/Obsidian/.obsidian/plugins/git-sync-companion/main.js
- Docs: REPORT.md (section 8; find it with `find`), plus GIT_SYNC_ARCHITECTURE_PROPOSAL.md and GIT_SYNC_COMPANION_PROPOSAL.md in the vault root (/storage/emulated/0/Documents/Obsidian). If Continuation_concern.md exists, read it too.
- obsidian-git (reportedly v2.43.0; confirm the version) and git-sync-companion are both enabled. obsidian-git settings should already be: autoSaveInterval=0, autoPullOnBoot=false, autoBackupAfterFileChange=false, pullBeforePush=true, syncMethod=merge, disablePush=false. Confirm them, but don't change them.

## What the plugin does
A floating button (FAB) shows git state: orange = uncommitted edits, blue = committed locally but not pushed, green = synced, spinner = syncing. Tap = local commit. Long-press (650ms) = commit + pull + push. An exit sentry commits locally when the app is hidden. A boot sync runs on cold launch. Confirm these colors and the 650ms hold from the code, and tell me if they differ.

## Current state
- Editor-change dirty tracking + flushActiveEditor() should be present in the vault main.js, repo main.js and src/main.ts. Verify.
- The new runBootSync() (delegates to triggerCommitAndSync("boot-sync")) is in the vault main.js and repo main.js, which should be byte-identical and pass node --check. It is NOT in src/main.ts, whose runBootSync() still calls gitPlugin.gitActions.pushChanges() (~line 267). pushChanges does not exist in obsidian-git, which is why the boot push silently failed and the FAB stayed blue.

## Known bugs still open
1. Airplane mode: the FAB spins forever and swallows taps. Cause: commit and sync go through executeCommandById, which returns a boolean immediately and queues the work, so isSyncing is cleared only by refs-changed/head-change events. Offline, no event fires.
2. flushActiveEditor() is not awaited. MarkdownView.save() is async, so the commit can beat the disk write.
3. onGitRefsChanged() can flip the FAB to blue mid-sync.
4. Docs drift: the proposals cite obsidian-git:push2 for push. In v2.43.0, "push" is Commit-and-sync and "push2" is plain Push. The code is right; the docs are wrong.
These causes come from earlier agents' code reading. Confirm each in the code before you rely on it.

Already verified, so don't re-investigate: performCommitAndSync treats "nothing-to-commit" as a pass-through to pull and push; only "skipped" aborts. No data.json, token or key is tracked by git.

## Rules
- First check which tools you actually have (git, adb, node, esbuild, tsc, npm packages) and tell me. If git is available, use it read-only: `git --no-optional-locks status|log|diff` (plain `git status` can rewrite the index while the plugin is committing). Never commit or push: the plugin commits by itself and that would corrupt my tests.
- Before using any obsidian-git internal, grep its main.js to confirm it exists (pushChanges was a guessed name that never existed). Prefer the public wrappers (e.g. commitAndSync) over perform* internals, and mirror the arguments the obsidian-git commands use (mode "all", same commit-message behavior).
- Never read, list, search or modify the private/ folder: exclude it from every find and grep -r, and never print its contents. When reading obsidian-git's data.json, print only the settings keys listed above, not the whole file.
- Never create new temp, backup, diff or log files inside the vault: it auto-commits and pushes. Use ~/backups/ or /tmp. (Only exception: the scratch note in step 9.)
- If a dependency (esbuild, tsc, node_modules, obsidian typings) is missing, tell me what is missing and ask before installing. Do not quietly hand-edit main.js as a substitute for the build. If I approve a hand-port, edit src/main.ts and main.js identically and say so.
- Use the repo's own build script/config (package.json, esbuild config). Don't invent flags. If there is none, tell me.
- Don't change unrelated files, and don't change FAB visuals or behavior except as stated (e.g. a local commit must not gain a spinner).
- Never claim a UI behavior works. Paste raw command output instead of writing "verified". I will do the final swipe-out and airplane-mode tests myself.
- Don't decide the "sync when returning from background" behavior. It is my design decision; leave it unchanged.
- My earlier agents ran out of quota mid-task. Work in small steps. After each step, append one line to ~/backups/PROGRESS.md (outside the vault) saying what is done and what is next, so a new session can resume. Don't cat huge files whole; use grep and line ranges.

## Plan (approved)
0. BACKUP FIRST, before any edit: copy src/, the repo main.js, the vault main.js, (/storage/emulated/0/Documents/Obsidian/TECHNICAL_CHANGE_REPORT.md) and both proposal files into ~/backups/<timestamp>/, using distinct names for the two main.js files (e.g. main.repo.js, main.vault.js). Never overwrite an earlier backup. The diffs in step 6 are against the OLDEST backup in ~/backups/.
1. Port the vault's new runBootSync() into src/main.ts, replacing the old 3-step version.
2. Add a runGitAction() helper that runs a task through obsidian-git's promiseQueue.addTask(task, onFinished) and returns a Promise you can await. addTask probably returns void, so wrap it, put try/finally inside the task, and check in obsidian-git's source whether onFinished runs when the task rejects. Add a ~60s timeout guard. Route triggerLocalCommit and triggerCommitAndSync through it. For sync, the task is gitActions.commitAndSync({fromAutoBackup:false, mode:"all"}). For local commit, use the same method and arguments as the obsidian-git:commit command. The timeout only unblocks the UI: it must not cancel or duplicate the queued git work, and the settle step must be safe to run twice. Also report to me (don't fix): (i) what a tap and the exit-sentry commit do if a sync task is still hanging after the timeout (they queue behind it), and (ii) whether obsidian-git's own offlineMode state blocks later network operations after a failed pull/push, so a hold-sync after reconnecting could silently do nothing. Don't change obsidian-git settings or state.
3. Make flushActiveEditor return the save() promise, and tolerate there being no active markdown view. In the exit path (visibilitychange/pagehide), start save() synchronously inside the handler, enqueue the commit task immediately (no timers and no awaits before the enqueue), and have the queued task await that save promise before committing. Guard against a double commit when both events fire. Keep the existing behavior when a sync is already in flight at exit (tell me what it is). Do not regress the swipe-out fix. For tap and hold, await the flush before the commit/sync.
4. Guard onGitRefsChanged so events cannot reset state while a sync is in flight. In a finally block: clear isSyncing, then recompute the FAB state by reusing the existing state logic (don't duplicate it): uncommitted edits = orange, unpushed commits = blue, else green. DIRTY-FLAG RACE: edits made while a commit or sync is running must still count as dirty afterwards. Since events are ignored mid-sync, make sure isDirty is still cleared after a successful commit, but never clear it blindly: e.g. take a change counter before the commit starts and clear isDirty only if no editor/vault change arrived since (or derive dirtiness from git status). A wrong "clean" state makes the exit sentry skip and loses data.
5. Rebuild main.js with the repo's build script. First check where the script writes its output: it must write to the repo only (~/projects/git-sync-companion/main.js). If it is configured to write into the vault plugin folder, stop and tell me before building. Then run tsc --noEmit on the TypeScript source and node --check on the built main.js. If tsc fails (obsidian typings were previously missing), report why; don't skip it or loosen the config.
6. STOP HERE. Show me (a) a diff -u of src/ against the oldest backup, (b) the diff of the newly built repo main.js against the current vault main.js. A rebuilt bundle may differ in formatting, so also give me (c) a behavior-parity checklist: grep both files for the editor-change handler, flushActiveEditor, visibilitychange/pagehide handlers, the exit sentry, the 650ms hold, the FAB colors and states, the boot sync and its delay, and anything present in the old file but missing from the new build. Wait for my approval. Do not deploy yet.
7. After approval, so read it and update it; don't overwrite it. grep both proposals for push2 and fix every wrong mention (push = Commit-and-sync, push2 = plain Push). Update the boot-sequence description to match the new code, and record that the src/main.ts boot-sync port is done.
8. Then deploy to the vault plugin folder, node --check the deployed copy, and print sha256sum of the repo main.js and the deployed vault main.js (they must match). Reload the plugin. If you can't reload it programmatically, tell me to restart Obsidian. Docs and deploy both modify tracked vault files, so tell me once when both are done, so I can sync and clear the dirty tree before I run my tests. Don't commit anything yourself.
9. Pre-checks, only if adb works (localhost:5555): airplane-mode tap, online hold-sync, swipe-out commit, cold-boot sync. Paste raw outputs. These are pre-checks only, because adb taps and force-stop do not reproduce a real hold or a recents swipe-out. They create real commits in my vault, which pushes to my public repo: use one scratch note (adb-scratch.md in the vault root), put nothing private in it, tell me before you create it, and tell me to delete it at the end (don't delete it yourself). Before cutting the network, tell me and wait for my OK. If `svc wifi disable` / `svc data disable` work over this adb connection, prefer them over airplane mode, and restore both afterwards. If the connection drops, stop and tell me to restore the network manually; don't retry in a loop.
10. Finish with a report: files changed, raw build and check outputs, and anything you could not do or verify.

## Expected behavior after the fix
- Airplane mode + sync with something to commit or push: the spinner stops and the FAB ends blue. With nothing to commit or push, it ends green.
- After airplane mode is turned off: a hold-sync completes, and the FAB does not stay locked.
- Online hold: ends green and origin is updated.
- Typing during a sync leaves the FAB orange afterwards, and those edits get committed later.
- Swipe out right after typing: the last characters are in the commit.
- Cold launch with an unpushed commit: pulled and pushed, ends green.

Start by checking for ~/backups/PROGRESS.md, then confirm which tools you have, then begin at step 0.