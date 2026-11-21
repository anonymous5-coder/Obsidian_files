Corrections from an earlier session (these override the prompt where they conflict):
- TECHNICAL_CHANGE_REPORT.md is in the vault root (/storage/emulated/0/Documents/Obsidian/), not the repo. Update that copy; don't create another.
- ~/projects/git-sync-companion is NOT a git repo; only the vault is. Read-only git applies to the vault only.
- A previous session already made backups in ~/backups/ before any edit. Don't redo them. First check that the oldest backup contains everything step 0 lists, and that src/ and the repo main.js still match it (diff -r, sha256sum). If anything is missing, back up that item now, but only if it is unmodified. If src/ differs from the backup, stop and tell me.
- Also read GIT_SYNC_ARCHITECTURE_PROPOSAL.md and GIT_SYNC_COMPANION_PROPOSAL.md in the vault root for context.

# prompt

