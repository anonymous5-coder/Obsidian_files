  
- Also read GIT_SYNC_ARCHITECTURE_PROPOSAL.md and GIT_SYNC_COMPANION_PROPOSAL.md in the vault root for context.

# prompt
Continue the work.

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

## Plan (approved)
0. Port the vault's new runBootSync() into src/main.ts, replacing the old 3-step version.
1. Add a runGitAction() helper that runs a task through obsidian-git's promiseQueue.addTask(task, onFinished) and returns a Promise you can await. addTask probably returns void, so wrap it, put try/finally inside the task, and check in obsidian-git's source whether onFinished runs when the task rejects. Add a ~60s timeout guard. Route triggerLocalCommit and triggerCommitAndSync through it. For sync, the task is gitActions.commitAndSync({fromAutoBackup:false, mode:"all"}). For local commit, use the same method and arguments as the obsidian-git:commit command. The timeout only unblocks the UI: it must not cancel or duplicate the queued git work, and the settle step must be safe to run twice. Also report to me (don't fix): (i) what a tap and the exit-sentry commit do if a sync task is still hanging after the timeout (they queue behind it), and (ii) whether obsidian-git's own offlineMode state blocks later network operations after a failed pull/push, so a hold-sync after reconnecting could silently do nothing. Don't change obsidian-git settings or state.
2. Make flushActiveEditor return the save() promise, and tolerate there being no active markdown view. In the exit path (visibilitychange/pagehide), start save() synchronously inside the handler, enqueue the commit task immediately (no timers and no awaits before the enqueue), and have the queued task await that save promise before committing. Guard against a double commit when both events fire. Keep the existing behavior when a sync is already in flight at exit (tell me what it is). Do not regress the swipe-out fix. For tap and hold, await the flush before the commit/sync.
3. Guard onGitRefsChanged so events cannot reset state while a sync is in flight. In a finally block: clear isSyncing, then recompute the FAB state by reusing the existing state logic (don't duplicate it): uncommitted edits = orange, unpushed commits = blue, else green. DIRTY-FLAG RACE: edits made while a commit or sync is running must still count as dirty afterwards. Since events are ignored mid-sync, make sure isDirty is still cleared after a successful commit, but never clear it blindly: e.g. take a change counter before the commit starts and clear isDirty only if no editor/vault change arrived since (or derive dirtiness from git status). A wrong "clean" state makes the exit sentry skip and loses data.
4. Rebuild main.js with the repo's build script. First check where the script writes its output: it must write to the repo only (~/projects/git-sync-companion/main.js). If it is configured to write into the vault plugin folder, stop and tell me before building. Then run tsc --noEmit on the TypeScript source and node --check on the built main.js. If tsc fails (obsidian typings were previously missing), report why; don't skip it or loosen the config.
5. STOP HERE. Show me (a) a diff -u of src/ against the oldest backup, (b) the diff of the newly built repo main.js against the current vault main.js. A rebuilt bundle may differ in formatting, so also give me (c) a behavior-parity checklist: grep both files for the editor-change handler, flushActiveEditor, visibilitychange/pagehide handlers, the exit sentry, the 650ms hold, the FAB colors and states, the boot sync and its delay, and anything present in the old file but missing from the new build. Wait for my approval. Do not deploy yet.
6. After approval, so read it and update it; don't overwrite it. grep both proposals for push2 and fix every wrong mention (push = Commit-and-sync, push2 = plain Push). Update the boot-sequence description to match the new code, and record that the src/main.ts boot-sync port is done.
7. Then deploy to the vault plugin folder, node --check the deployed copy, and print sha256sum of the repo main.js and the deployed vault main.js (they must match). Reload the plugin. If you can't reload it programmatically, tell me to restart Obsidian. Docs and deploy both modify tracked vault files, so tell me once when both are done, so I can sync and clear the dirty tree before I run my tests. Don't commit anything yourself.
8. Pre-checks, only if adb works (localhost:5555): airplane-mode tap, online hold-sync, swipe-out commit, cold-boot sync. Paste raw outputs. These are pre-checks only, because adb taps and force-stop do not reproduce a real hold or a recents swipe-out. They create real commits in my vault, which pushes to my public repo: use one scratch note (adb-scratch.md in the vault root), put nothing private in it, tell me before you create it, and tell me to delete it at the end (don't delete it yourself). Before cutting the network, tell me and wait for my OK. If `svc wifi disable` / `svc data disable` work over this adb connection, prefer them over airplane mode, and restore both afterwards. If the connection drops, stop and tell me to restore the network manually; don't retry in a loop.
9. Finish with a report: files changed, raw build and check outputs, and anything you could not do or verify.

## Expected behavior after the fix
- Airplane mode + sync with something to commit or push: the spinner stops and the FAB ends blue. With nothing to commit or push, it ends green.
- After airplane mode is turned off: a hold-sync completes, and the FAB does not stay locked.
- Online hold: ends green and origin is updated.
- Typing during a sync leaves the FAB orange afterwards, and those edits get committed later.
- Swipe out right after typing: the last characters are in the commit.
- Cold launch with an unpushed commit: pulled and pushed, ends green.