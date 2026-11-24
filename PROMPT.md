Proceed, with these changes:
1. Keep a mobile-only visibilitychange/pagehide handler that ONLY calls flushActiveEditor() (no commit, no sync). Your measurement shows that flush is what saved the text. Remove the exit commit on mobile.
2. Keep desktop quit as is, and tell me whether it uses Obsidian's quit tasks so the app waits for the commit.
3. In the docs, label the benchmark "measured on RMX3780" and state that the boot engine runs only on cold launch.
4. grep all docs (including ARCHITECTURE_PROPOSAL) for push2, pushChanges and the old 3-step boot, and show the output.
5. Is there a ~60s timeout guard on the awaited sync? Answer from the code.
6. Show me the diff before you deploy.