Proceed, with these changes:
1. Keep a mobile-only visibilitychange/pagehide handler that ONLY calls flushActiveEditor() (no commit, no sync). Your measurement shows that flush is what saved the text. Remove the exit commit on mobile.
2. Keep desktop quit as is, and tell me whether it uses Obsidian's quit tasks so the app waits for the commit.
3. In the docs, label the benchmark "measured on RMX3780" and state that the boot engine runs only on cold launch.
4. If the awaited sync has no ~60s timeout guard, add one. It must only clear isSyncing and recompute the FAB state, never cancel or duplicate the queued git work.
5. Show me the diff before you deploy.