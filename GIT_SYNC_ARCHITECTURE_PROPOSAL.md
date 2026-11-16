# Master Execution Plan: Human-AI Collaborative Obsidian Git Synchronization

> **Target Vault Path (Android):** `/storage/emulated/0/Documents/Obsidian`  
> **Remote Repository:** `https://github.com/anonymous5-coder/Obsidian_files.git`  
> **Repository Visibility:** **PUBLIC** (Required so remote AI agents, agentic IDEs, and cloud tools can inspect and reference plans, prompts, and documentation online)  
> **Security & Privacy Fortress:** **Strict Local-Only `private/` Boundary** (Permanently excluded via `.gitignore`; protects `Keys.md` and credentials from ever reaching GitHub)  
> **Daily Sync Engine:** **Obsidian Git Community Plugin** (v2.43.0; 100% native built-in 1-minute debounce sync; zero custom code or background daemons)  
> **Administrative & Scaffolding Tool:** **Termux Native Git CLI** (v2.56.0; used once for initial setup, `.gitignore` deployment, baseline push, and recovery)  
> **Execution Status:** **FINAL EXECUTION PLAN — READY FOR IMPLEMENTATION**  
> **Date:** November 16, 2026  

---

## 1. System Architecture & Workflow Overview

### 1.1 The Human-AI Co-Working Workflow:
* **Human Operator (Mobile):** Writes notes, documentation, prompts, and project plans locally inside the Obsidian Android application.
* **Autonomous AI Agents (Remote):** Agents across various cloud and desktop platforms (Antigravity, Claude, ChatGPT, Cursor, etc.) lack direct filesystem access to the Android phone. The public GitHub repository serves as their real-time window into the human's active workspace.
* **Continuous Synchronization:**
  * **Human $\to$ AI:** Human edits notes $\to$ 1 minute after typing stops, changes are automatically committed and pushed to GitHub $\to$ AI agents read updated documentation online.
  * **AI $\to$ Human:** AI agent pushes updates or research to GitHub $\to$ automatically pulled into mobile Obsidian on next write cycle or on startup $\to$ human reviews notes on phone.

```text
┌───────────────────────────────────────┐                 ┌───────────────────────────────────────┐
│        HUMAN OPERATOR (MOBILE)        │                 │        REMOTE AI AGENTS / IDEs        │
│      Obsidian App on Android Phone    │                 │      (Antigravity, Claude, etc.)      │
│      /storage/emulated/0/...          │                 │      Cloud & Desktop Environments     │
└──────────────────┬────────────────────┘                 └───────────────────▲───────────────────┘
                   │                                                          │
                   │ Native 1-Min Debounce Sync                               │ Web / API / Git Read
                   │ (Commit-First -> Pull -> Push)                           │ (Public Inspection)
                   ▼                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  PUBLIC GITHUB REPOSITORY                                   │
│                         anonymous5-coder/Obsidian_files (Branch: main)                      │
│                                                                                             │
│  [Tracked Public Documentation]                             [Permanently Excluded on Phone] │
│  - 2_Conversations.md                                       - private/Keys.md               │
│  - AI Workflow System.md                                    - private/*                     │
│  - CONTEXT.md                                               - .obsidian/workspace.json      │
│  - GADGET_WORK_PLAN.md                                      - .obsidian/cache/              │
│  - doc.md, document.md, etc.                                - .trash/                       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Sync Mechanics: 100% Native 1-Minute Debounce

No custom scripting, background bash daemons, or injected plugins are required. The entire workflow is handled natively by the built-in features of the Obsidian Git community plugin.

### 2.1 The 1-Minute Debounce Trigger:
* The plugin monitors vault edit events (`app.vault.on("modify")`).
* When you type, an internal 60-second timer continuously resets.
* Once you stop writing for **60 seconds**, the sync routine executes automatically.
* Zero interruptions while typing; zero battery wasted when idle.

### 2.2 The Gold-Standard Sequence: Commit-First $\to$ Pull-Second $\to$ Push-Third:
1. **Local Commit First:** Stages all modified public notes and commits them locally (`"vault backup: YYYY-MM-DD HH:mm:ss"`). Your writing is permanently secured in local Git history before touching the network.
2. **Checked Pull Second (`pullBeforePush = true`):** Fetches GitHub refs and compares commit IDs. If remote AI agents pushed new commits, it merges them cleanly (3-way merge). Because your local work was committed in Step 1, it can **never** be overwritten.
3. **Push Third (`pushOnCommitAndSync = true`):** Pushes the combined local and merged history to GitHub for remote AI agents to inspect.

### 2.3 Startup Sync (`autoPullOnBoot = true`):
* On launching Obsidian, the plugin automatically checks GitHub for any new notes pushed by AI agents while the app was closed.
* **Built-in Safety Guarantee:** In the event that files were edited externally (e.g. in Termux) while Obsidian was closed, the plugin's native `ensureCleanPullWorktree()` checks the disk and safely halts if an incoming commit conflicts, ensuring your uncommitted external work is never deleted or overwritten.

---

## 3. Security Boundary: The `private/` Fortress

Because the repository is **PUBLIC**, credential isolation is enforced by physical folder separation and `.gitignore`:

1. **Physical Relocation:** `Keys.md` is moved from the vault root into `/storage/emulated/0/Documents/Obsidian/private/Keys.md`.
2. **Root `.gitignore` Deployment:**
   ```gitignore
   # ==============================================================================
   # STRICT PRIVATE SECURITY BOUNDARY (NEVER PUSHED TO PUBLIC GITHUB)
   # ==============================================================================
   private/
   private/**
   Keys.md
   *.key
   *.token
   *.env

   # ==============================================================================
   # OBSIDIAN RUNTIME & MOBILE LAYOUT ARTIFACTS
   # ==============================================================================
   .obsidian/workspace.json
   .obsidian/workspace-mobile.json
   .obsidian/cache/
   .obsidian/plugins/*/data.json.bak
   .trash/
   ```

---

## 4. Step-by-Step Implementation Roadmap

Execution is divided into 4 straightforward, sequential phases:

### Phase 1: Security Preparation & Secret Relocation (Termux)
* **Step 1.1:** Navigate to the vault root:
  ```bash
  cd /storage/emulated/0/Documents/Obsidian
  ```
* **Step 1.2:** Create the private folder:
  ```bash
  mkdir -p private
  ```
* **Step 1.3:** Move `Keys.md` into the private folder:
  ```bash
  mv Keys.md private/
  ```
* **Step 1.4:** Deploy root `.gitignore`:
  ```bash
  cat << 'EOF' > .gitignore
  private/
  private/**
  Keys.md
  *.key
  *.token
  *.env
  .obsidian/workspace.json
  .obsidian/workspace-mobile.json
  .obsidian/cache/
  .obsidian/plugins/*/data.json.bak
  .trash/
  EOF
  ```

---

### Phase 2: Local Git Scaffolding & Initial Baseline Push (Termux)
* **Step 2.1:** Initialize the local repository on branch `main`:
  ```bash
  git init -b main
  git config core.filemode false
  ```
* **Step 2.2:** Connect the public GitHub remote:
  ```bash
  git remote add origin https://github.com/anonymous5-coder/Obsidian_files.git
  ```
* **Step 2.3:** Stage all public documentation:
  ```bash
  git add .
  ```
* **Step 2.4:** Verify staging status (confirm `Keys.md` and `private/` are NOT staged):
  ```bash
  git status
  ```
* **Step 2.5:** Commit and push the clean initial baseline:
  ```bash
  git commit -m "Initialize Obsidian vault synchronization"
  git push -u origin main
  ```

---

### Phase 3: Obsidian Mobile Plugin Configuration (In-App GUI)
1. Open **Obsidian** on Android $\to$ **Settings** $\to$ **Community Plugins** $\to$ Install & Enable **Obsidian Git** (v2.43.0).
2. In Obsidian Git Settings, enter your **GitHub Personal Access Token (PAT)** (with `repo` scope) into Obsidian Secret Storage.
3. Configure the 5 native sync toggles:
   * **Auto commit-and-sync interval (`autoSaveInterval`):** Set to `1` (1-minute debounce delay).
   * **Auto commit-and-sync after stopping file edits (`autoBackupAfterFileChange`):** Set to `true` (ON).
   * **Pull on commit-and-sync (`pullBeforePush`):** Set to `true` (ON; enforces Commit-First $\to$ Pull $\to$ Push).
   * **Push on commit-and-sync (`pushOnCommitAndSync`):** Set to `true` (ON).
   * **Pull on startup (`autoPullOnBoot`):** Set to `true` (ON).
   * **Merge strategy on conflicts:** Set to `None` (shows conflict resolution UI; never deletes content).
   * **Show merge conflict resolution in editor:** Set to `true` (ON).

---

### Phase 4: Live Operational Verification
1. Open Obsidian on your phone, open any note (e.g. `doc.md`), and type a test sentence.
2. Stop typing for 60 seconds.
3. Observe the mobile notification: *"Vault backup: ... pushed to remote"*.
4. Open `https://github.com/anonymous5-coder/Obsidian_files` in a browser:
   * Verify the commit appears online.
   * Verify that `Keys.md` and `private/` are completely absent from GitHub.

---
*Plan approved and ready for execution. Awaiting confirmation to run Phase 1.*
