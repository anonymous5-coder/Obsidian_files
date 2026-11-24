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

## Expected behavior after the fix
- Airplane mode + sync with something to commit or push: the spinner stops and the FAB ends blue. With nothing to commit or push, it ends green.
- After airplane mode is turned off: a hold-sync completes, and the FAB does not stay locked.
- Online hold: ends green and origin is updated.
- Typing during a sync leaves the FAB orange afterwards.
- Swipe out right after typing: the last characters are in the commit.
- Cold launch with an unpushed commit: pulled and pushed, ends green.
- Wanted gold standard sync on boot via direct trigger and not custom 3 trigger actions. Hold action of FAB uses native one already. That same action must trigger on boot .