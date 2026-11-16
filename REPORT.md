# Research & Technical Feasibility Report: Pull Mechanics, Startup Synchronization & 4-Level Architecture

> **Document:** `/storage/emulated/0/Documents/Obsidian/REPORT.md`  
> **Target Environment:** Obsidian Mobile on Android & Termux Native Git  
> **Source Examined:** `Vinzent03/obsidian-git` Release Tag `2.43.0` (`src/main.ts`, `src/gitActions.ts`, `src/gitManager/isomorphicGit.ts`, `src/automaticsManager.ts`, `src/setting/settings.ts`)  
> **Date:** November 16, 2026  
> **Author:** Antigravity (Systems Architect)  

---

## 1. Executive Summary & Direct Answers to User Inquiries

### Question 1: In the scenario where files were modified outside Obsidian while closed, will the debounce trigger 1 minute after boot if not a single word is typed?
* **Verdict:** **NO, IT WILL NOT TRIGGER AUTOMATICALLY UNLESS AN EVENT FIRES.**
* **Source Proof (`src/main.ts:270–293` & `src/automaticsManager.ts:144`):**
  * The plugin wraps its debounce routine in `this.autoCommitDebouncer`.
  * That debouncer is ONLY invoked inside Obsidian's active vault event listeners:
    ```typescript
    this.registerEvent(this.app.vault.on("modify", () => { this.autoCommitDebouncer?.(); }));
    this.registerEvent(this.app.vault.on("delete", () => { this.autoCommitDebouncer?.(); }));
    this.registerEvent(this.app.vault.on("create", () => { this.autoCommitDebouncer?.(); }));
    this.registerEvent(this.app.vault.on("rename", () => { this.autoCommitDebouncer?.(); }));
    ```
  * When Obsidian launches, if files were changed on disk while Obsidian was closed, Obsidian indexes its cache. Obsidian's core API does **not** reliably dispatch `modify` events for pre-existing disk states upon startup.
  * If no single keystroke, edit, or vault file event occurs after booting, `this.autoCommitDebouncer?.()` is **never called**. The timer is never armed, and it will **not** trigger after 1 minute.
  * **Trigger Event:** The moment you type even a single character, delete a space, or create a note in Obsidian, `app.vault.on("modify")` fires $\to$ arms the 1-minute timer $\to$ 60 seconds after you stop, it commits **all** modified files across the vault (including the external edits).

---

### Question 2: Does `autoPullOnBoot = true` cause problems in this external-edit scenario?
* **Verdict:** **IT WILL SAFELY HALT AND REFUSE TO OVERWRITE YOUR EDITS.**
* **Source Proof (`src/gitManager/isomorphicGit.ts:689`):**
  * When `autoPullOnBoot = true` triggers on startup, it calls `ensureCleanPullWorktree()`.
  * If the remote repository has incoming commits that touch the same files you edited externally, the plugin checks your working tree:
    ```typescript
    if (changed.length > 0) {
        throw new Error(`Cannot pull with uncommitted working tree changes: ${changed.join(", ")}`);
    }
    ```
  * **Result:** It halts safely. Your uncommitted external work is **never deleted or overwritten**. Obsidian displays an error notice: *"Cannot pull with uncommitted working tree changes"*.

---

### Question 3: Will you have to write or script anything for the 1-minute debounce sequence?
* **Verdict:** **NO CUSTOM SCRIPTING OR CODE IS REQUIRED AT ALL.**
* **Source Proof (`src/setting/settings.ts:218–227` & `src/automaticsManager.ts:144`):**
  * The 1-minute debounce sequence is **100% natively built into the Obsidian Git plugin**.
  * The debounce delay is controlled directly by the `autoSaveInterval` setting:
    ```typescript
    this.plugin.autoCommitDebouncer ??= debounce(
        () => this.doAutoCommitAndSync(),
        this.plugin.settings.autoSaveInterval * 60000,
        true
    );
    ```
  * **Exact Built-In Settings to Configure in Obsidian:**
    1. **Auto commit-and-sync interval (`autoSaveInterval`):** Set to `1` (1 minute debounce delay).
    2. **Auto commit-and-sync after stopping file edits (`autoBackupAfterFileChange`):** Set to `true` (ON).
    3. **Pull on commit-and-sync (`pullBeforePush`):** Set to `true` (ON; ensures Commit-First $\to$ Pull $\to$ Push).
    4. **Push on commit-and-sync (`pushOnCommitAndSync`):** Set to `true` (ON).
    5. **Pull on startup (`autoPullOnBoot`):** Set to `true` (ON).
* **Consequence for the Plan File:**  
  Because all of this is built directly into the plugin GUI, the execution plan can be radically simplified. We do not need custom JavaScript plugins, background bash daemons, or complex code. It becomes a straight, concise, numbered configuration and execution guide.

---

## 2. Deep-Dive Source Code Verification (`v2.43.0`)

### 2.1 The Pull Check-First Sequence:
In `src/gitManager/isomorphicGit.ts` (lines 531–536), the plugin’s core `pull()` function executes a mandatory pre-check on every single invocation:
```typescript
await this.fetch();
const theirs = await this.resolveRef(branchInfo.tracking);
if (localCommit === theirs) {
    return { status: "up-to-date" };
}
```
If local and remote tips are equal, it exits immediately with `{ status: "up-to-date" }`. It touches zero bytes on disk and runs zero merge logic.

### 2.2 Concurrency & Promise Queue:
In `src/main.ts`, every Git operation (commit, push, pull) is queued in a serial Promise Queue (`this.promiseQueue.addTask`). If an auto-pull on boot or background timer attempts to fire while an auto-backup is running, the tasks are queued sequentially. Overlapping or state corruption is impossible.

---

## 3. Practical Handling of the External-Edits Scenario

If you frequently edit files in Termux while Obsidian is closed, here are the 3 clean ways the system handles it:

1. **The Natural Writing Flow (Zero Action Needed):**
   * You open Obsidian.
   * You open a note and make an edit.
   * The 1-minute debounce timer starts. 60 seconds after you pause, it commits **everything** (both your in-app edits and the previous Termux edits), pulls remote changes, and pushes.
2. **One-Tap Ribbon Commit (Before Pulling):**
   * If you made large edits in Termux and open Obsidian just to read, tap the **Source Control** icon on the left ribbon and tap **Commit All** (or tap the Git icon).
3. **Commit in Termux Before Leaving Termux:**
   * If you are already typing in Termux, simply type `git commit -am "Termux edit"` before switching back to Obsidian.

---

## 4. Next-Pass Plan File Shortening Recommendation

In the next pass, we can shorten `GIT_SYNC_ARCHITECTURE_PROPOSAL.md` from a theoretical debate document into a clean, practical **5-page Operational Runbook**:
1. **Section 1: Architecture Summary (1 page):** Purpose (Human-AI public repo), 1-minute debounce overview, `private/` security boundary.
2. **Section 2: Phase 1 — Security Prep (1 page):** Termux commands to create `private/`, move `Keys.md`, deploy `.gitignore`.
3. **Section 3: Phase 2 — Git Init & Baseline Push (1 page):** Termux commands to `git init`, link remote, and push baseline.
4. **Section 4: Phase 3 — Obsidian Plugin Settings (1 page):** Bullet-list of the 5 exact toggles in the plugin GUI.
5. **Section 5: Phase 4 — Verification Checklist (1 page):** How to verify the live 1-minute sync on GitHub.

Zero code. Zero scripts. Straight execution.

---

## 5. GitSync Companion: Hybrid Architecture & Proposal Summary

### 5.1 Project Identity & Core Concept
* **Full Specification:** See dedicated project blueprint at [GIT_SYNC_COMPANION_PROPOSAL.md](file:///storage/emulated/0/Documents/Obsidian/GIT_SYNC_COMPANION_PROPOSAL.md).
* **Plugin Name:** `GitSync Companion` (ID: `git-sync-companion`)
* **Core Philosophy:** Solves Obsidian Git's 1-minute mobile debounce limit and navigation friction through a dual-engine architecture:
  1. **Lifecycle Engine:** Automatically triggers Git sync on app exit, app switch, or lock screen via `visibilitychange` & `pagehide`.
  2. **Interactive UI Engine:** Adds a 1-tap draggable Floating Action Button (FAB) with live dirty-state visual indicators (Idle $\to$ Dirty $\to$ Syncing $\to$ Success).

### 5.2 Technical Audit of Android System Notifications
* Inspection of `md.obsidian` manifest via ADB confirmed that `POST_NOTIFICATIONS` is **not** declared in the Obsidian Android APK.
* Therefore, a pure JavaScript Obsidian plugin cannot directly post system notifications in Android's notification drawer.
* **Hybrid Resolution:**
  - **In-App:** Draggable Floating Action Button (FAB) and interactive banner.
  - **System-Level:** Complementary Termux notification bridge for users wanting a permanent Android notification tile.

---
*Report updated and certified with GitSync Companion architecture proposal.*
